import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import {
  Send,
  Sparkles,
  Menu,
  Square,
  RefreshCw,
  FileDown,
  Trash2,
  Edit2,
  Check,
  AlertCircle,
  Copy,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactMarkdown from 'react-markdown';
import { JournalEntry, JournalMessage } from '../types';
import { addMessageToJournal, updateJournalEntry } from '../lib/firestoreUtils';
import { useAuth } from '../context/AuthContext';
import { sounds } from '../lib/soundEffects';

interface JournalChatProps {
  journal: JournalEntry;
  messages: JournalMessage[];
  onOpenSidebar: () => void;
  onOpenExport: () => void;
  onDeleteCurrent: () => void;
  onReloadJournal?: () => void;
  onOpenFutureSelf?: () => void;
}

interface PromptCategory {
  label: string;
  emoji: string;
  prompts: string[];
}

const PROMPT_CATEGORIES: PromptCategory[] = [
  {
    label: 'Daily Calm',
    emoji: '🍵',
    prompts: [
      'What was a gentle moment of joy or peace you noticed today?',
      'What is something you can kindly give yourself permission to let go of?',
      'How does your body feel right now, and what does it need most?',
    ],
  },
  {
    label: 'Gratitude',
    emoji: '💖',
    prompts: [
      'Who or what unexpectedly warmed your heart recently?',
      'Name three simple comforts around you that you often overlook.',
      'What is a quiet victory you haven’t given yourself credit for?',
    ],
  },
  {
    label: 'Deep Self',
    emoji: '💭',
    prompts: [
      'What gave you unexpected energy or drained you today?',
      'Unpack a recurring frustration without judging yourself.',
      'A decision I am second-guessing and what is holding me back.',
    ],
  },
  {
    label: 'Future Dreams',
    emoji: '🔮',
    prompts: [
      'What is one hope you want to whisper to your future self?',
      'If fear stepped aside for an hour, what would you choose to create?',
      'What small seed can you plant today that will blossom in six months?',
    ],
  },
];

const QUICK_MOODS = [
  { label: 'Peaceful', emoji: '🌸', color: 'hover:bg-rose-50 border-rose-200 text-rose-800' },
  { label: 'Grounded', emoji: '🍵', color: 'hover:bg-emerald-50 border-emerald-200 text-emerald-800' },
  { label: 'Inspired', emoji: '✨', color: 'hover:bg-amber-50 border-amber-200 text-amber-800' },
  { label: 'Pensive', emoji: '☁️', color: 'hover:bg-slate-50 border-slate-200 text-slate-800' },
  { label: 'Grateful', emoji: '💖', color: 'hover:bg-pink-50 border-pink-200 text-pink-800' },
  { label: 'Curious', emoji: '🌱', color: 'hover:bg-lime-50 border-lime-200 text-lime-800' },
];

const REACTION_EMOJIS = ['💖', '🌱', '✨', '🫧', '🍵'];

export const JournalChat: React.FC<JournalChatProps> = ({
  journal,
  messages,
  onOpenSidebar,
  onOpenExport,
  onDeleteCurrent,
  onOpenFutureSelf,
}) => {
  const { user, refreshIdToken } = useAuth();
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [streamError, setStreamError] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeCategoryIdx, setActiveCategoryIdx] = useState(0);
  const [soundActive, setSoundActive] = useState(sounds.isEnabled());
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [messageReactions, setMessageReactions] = useState<Record<string, string[]>>({});

  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(journal.title);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const firstChunkReceivedRef = useRef(false);

  // Calculate total word count across reflection
  const wordCount = useMemo(() => {
    return messages.reduce((acc, m) => {
      return acc + (m.content ? m.content.trim().split(/\s+/).length : 0);
    }, 0);
  }, [messages]);

  // Auto-scroll on new messages or stream chunks
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [messages.length, scrollToBottom]);

  useEffect(() => {
    if (isStreaming) {
      scrollToBottom(true);
    }
  }, [streamedText, isStreaming, scrollToBottom]);

  // Sync title when journal prop changes
  useEffect(() => {
    setEditedTitle(journal.title);
    setIsEditingTitle(false);
  }, [journal.id, journal.title]);

  const handleTitleSave = async () => {
    const uid = user?.uid || 'demo-user-vault';
    if (!editedTitle.trim() || editedTitle.trim() === journal.title) {
      setIsEditingTitle(false);
      return;
    }
    try {
      sounds.bubblePop();
      await updateJournalEntry(uid, journal.id, { title: editedTitle.trim() });
      setIsEditingTitle(false);
    } catch (err) {
      console.error('Failed to update title:', err);
    }
  };

  // Quick Mood setter
  const handleSetMood = async (mood: string) => {
    sounds.reactionPop();
    const uid = user?.uid || 'demo-user-vault';
    try {
      await updateJournalEntry(uid, journal.id, { sentiment: mood });
    } catch (err) {
      console.error('Failed to update mood:', err);
    }
  };

  // Toggle emoji reaction on message
  const handleToggleReaction = (messageId: string, emoji: string) => {
    sounds.reactionPop();
    setMessageReactions(prev => {
      const current = prev[messageId] || [];
      const hasIt = current.includes(emoji);
      const next = hasIt ? current.filter(e => e !== emoji) : [...current, emoji];
      return { ...prev, [messageId]: next };
    });
  };

  // Copy message content
  const handleCopyMessage = (id: string, text: string) => {
    sounds.bubblePop();
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => {
      setCopiedMessageId(null);
    }, 1800);
  };

  // Automated Insights extraction
  const triggerAnalyzeInsights = async (customContent?: string) => {
    const uid = user?.uid || 'demo-user-vault';
    setIsAnalyzing(true);
    sounds.bubblePop();
    try {
      const token = user ? ((await refreshIdToken()) || (await user.getIdToken())) : 'demo-token';
      const contextText =
        customContent ||
        messages.map(m => `${m.role === 'user' ? 'User' : 'Partner'}: ${m.content}`).join('\n\n');

      if (!contextText.trim()) {
        setIsAnalyzing(false);
        return;
      }

      const res = await fetch('/api/insights', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: contextText }),
      });

      if (!res.ok) {
        throw new Error(`Failed to generate insights (${res.status})`);
      }

      const data = await res.json();
      if (data.title || data.sentiment || data.tags) {
        sounds.chime();
        await updateJournalEntry(uid, journal.id, {
          title: data.title || journal.title,
          sentiment: data.sentiment || journal.sentiment,
          tags: Array.isArray(data.tags) ? data.tags : journal.tags,
          summary: data.summary || journal.summary,
        });
      }
    } catch (err) {
      console.error('Auto insights error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Submit thought / message
  const handleSendMessage = async (promptToSend?: string) => {
    const text = (promptToSend || inputText).trim();
    if (!text || isStreaming) return;
    const uid = user?.uid || 'demo-user-vault';

    // Play cute bubble send sound!
    sounds.bubbleSend();

    setInputText('');
    setStreamError(null);
    setLastFailedPrompt(null);
    firstChunkReceivedRef.current = false;

    // 1. Persist user message to Firestore with zero-crash undefined-stripping
    try {
      await addMessageToJournal(uid, journal.id, {
        role: 'user',
        content: text,
      });
    } catch (err: unknown) {
      console.error('Failed to persist user message to Firestore:', err);
      setStreamError('Failed to save message to your journal vault. Please retry.');
      setLastFailedPrompt(text);
      return;
    }

    // Prepare message history including the new user message
    const updatedMessagesHistory = [
      ...messages,
      {
        id: 'temp-user',
        role: 'user' as const,
        content: text,
        timestamp: new Date().toISOString(),
      },
    ];

    // 2. Stream AI response from server
    setIsStreaming(true);
    setStreamedText('');
    abortControllerRef.current = new AbortController();

    let fullAccumulated = '';

    try {
      const token = user ? ((await refreshIdToken()) || (await user.getIdToken())) : 'demo-token';

      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: updatedMessagesHistory.map(m => ({ role: m.role, content: m.content })),
          userPrompt: text,
        }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Server returned HTTP ${response.status}`);
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported on this response.');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            try {
              const data = JSON.parse(dataStr);
              if (data.text) {
                fullAccumulated += data.text;
                setStreamedText(prev => prev + data.text);

                // Play cute bubble receive sound as soon as first text packet arrives!
                if (!firstChunkReceivedRef.current) {
                  firstChunkReceivedRef.current = true;
                  sounds.bubbleReceive();
                }
              }
              if (data.error) {
                throw new Error(data.error);
              }
            } catch (pErr) {
              if ((pErr as Error).message && (pErr as Error).message !== 'Unexpected end of JSON input') {
                console.warn('SSE Parse notice:', pErr);
              }
            }
          }
        }
      }

      // 3. Persist model response to Firestore
      if (fullAccumulated.trim()) {
        await addMessageToJournal(uid, journal.id, {
          role: 'model',
          content: fullAccumulated.trim(),
        });

        // If this was the first turn of a new session, auto-trigger automated insights & tagging!
        const isFirstTurn = messages.length === 0;
        const isDefaultTitle =
          journal.title === 'New Reflection' ||
          journal.title === 'Untitled Reflection' ||
          journal.title.startsWith('Reflection ');

        if (isFirstTurn || isDefaultTitle) {
          const combinedFirstTurn = `User reflection:\n${text}\n\nReflective partner feedback:\n${fullAccumulated}`;
          triggerAnalyzeInsights(combinedFirstTurn);
        }
      }
    } catch (err: unknown) {
      if ((err as Error).name === 'AbortError') {
        console.log('Stream generation aborted by user.');
        if (fullAccumulated.trim()) {
          await addMessageToJournal(uid, journal.id, {
            role: 'model',
            content: fullAccumulated.trim() + ' *(stopped)*',
          }).catch(console.error);
        }
      } else {
        console.error('Error during reflective streaming:', err);
        setStreamError((err as Error).message || 'Generation interrupted. You can retry.');
        setLastFailedPrompt(text);
      }
    } finally {
      setIsStreaming(false);
      setStreamedText('');
      abortControllerRef.current = null;
    }
  };

  const handleStopStreaming = () => {
    sounds.bubblePop();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <main className="flex-1 flex flex-col h-full bg-[#fdfcf8]/85 backdrop-blur-[1px] overflow-hidden text-[#333322] z-10 relative">
      {/* Top Header */}
      <header className="px-5 sm:px-8 py-3.5 border-b border-[#e5e1d8] flex flex-col gap-2.5 bg-white/50 backdrop-blur-md shrink-0 z-10">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              id="chat-open-sidebar-btn"
              onClick={() => {
                sounds.bubblePop();
                onOpenSidebar();
              }}
              title="Open Reflections"
              className="md:hidden p-2 rounded-2xl border border-[#e5e1d8] text-[#5a5a40] hover:bg-[#f5f2ed] transition-colors active:scale-95"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="min-w-0 flex-1">
              {isEditingTitle ? (
                <div className="flex items-center gap-2 max-w-md">
                  <input
                    id="chat-title-edit-input"
                    type="text"
                    value={editedTitle}
                    onChange={e => setEditedTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') handleTitleSave();
                      if (e.key === 'Escape') setIsEditingTitle(false);
                    }}
                    autoFocus
                    className="w-full font-serif text-lg sm:text-2xl px-3 py-1 rounded-2xl bg-white border border-[#5a5a40]/30 text-[#3a3a2a] focus:outline-none"
                  />
                  <button
                    id="chat-title-save-btn"
                    onClick={handleTitleSave}
                    className="p-2 text-[#5a5a40] hover:bg-[#e8e4d9] rounded-xl transition-colors cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div
                  className="flex items-center gap-2 group cursor-pointer"
                  onClick={() => setIsEditingTitle(true)}
                >
                  <h1 className="font-serif text-lg sm:text-2xl text-[#3a3a2a] truncate font-medium">
                    {journal.title}
                  </h1>
                  <Edit2 className="w-3.5 h-3.5 text-[#9a9a85] opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
              )}

              {/* Subtitle Row */}
              <div className="flex items-center gap-3 mt-0.5 flex-wrap text-xs text-[#7a7a65]">
                <span className="font-medium inline-flex items-center gap-1.5 text-[#5a5a40]">
                  <span className="w-2 h-2 rounded-full bg-[#8ba888] animate-pulse" />
                  {journal.sentiment || 'Reflective'}
                </span>
                <span className="text-[#c8c2b4]">•</span>
                <span className="text-[#9a9a85]">
                  {wordCount > 0 ? `${wordCount} words` : 'Empty reflection'}
                </span>
                {journal.tags && journal.tags.length > 0 && (
                  <>
                    <span className="text-[#c8c2b4]">•</span>
                    <span className="text-[#7a7a65] truncate max-w-[200px]">
                      {journal.tags.join(', ')}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons with Cute Sound Toggle */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Cute Sound Toggle */}
            <button
              id="chat-sound-toggle-btn"
              type="button"
              onClick={() => {
                const next = sounds.toggle();
                setSoundActive(next);
              }}
              title={soundActive ? 'Mute cute bubble sounds' : 'Enable cute bubble sounds'}
              className="p-2.5 rounded-2xl border border-[#ebdcd0] bg-white/80 text-[#5a5a40] hover:bg-white transition-all active:scale-95 shadow-2xs relative cursor-pointer"
            >
              {soundActive ? (
                <Volume2 className="w-4 h-4 text-[#5a5a40]" />
              ) : (
                <VolumeX className="w-4 h-4 text-[#9a9a85]" />
              )}
              {soundActive && (
                <span className="absolute -top-1 -right-1 flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#8ba888] opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#6b8568]"></span>
                </span>
              )}
            </button>

            {onOpenFutureSelf && (
              <button
                id="chat-future-self-btn"
                onClick={() => {
                  sounds.bubblePop();
                  onOpenFutureSelf();
                }}
                title="Message to My Future Self"
                className="p-2.5 rounded-2xl border border-[#ebdcd0] bg-gradient-to-tr from-[#fbf8f2] to-[#f4ede2] text-[#5a5a40] hover:bg-[#ede7db] transition-all flex items-center gap-1.5 text-xs font-medium shadow-2xs cursor-pointer active:scale-95"
              >
                <span>🔮</span>
                <span className="hidden lg:inline font-serif font-semibold">Future Self</span>
              </button>
            )}

            <button
              id="chat-reanalyze-btn"
              onClick={() => triggerAnalyzeInsights()}
              disabled={isAnalyzing || messages.length === 0}
              title="Synthesize insights & themes"
              className="p-2.5 rounded-2xl border border-[#e5e1d8] text-[#5a5a40] bg-white/70 hover:bg-white transition-all disabled:opacity-40 flex items-center gap-1.5 text-xs font-medium cursor-pointer active:scale-95"
            >
              <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin text-[#8ba888]' : ''}`} />
              <span className="hidden md:inline">{isAnalyzing ? 'Synthesizing...' : 'Synthesize'}</span>
            </button>

            <button
              id="chat-export-btn"
              onClick={() => {
                sounds.bubblePop();
                onOpenExport();
              }}
              title="Export as Markdown or JSON"
              className="p-2.5 rounded-2xl border border-[#e5e1d8] text-[#5a5a40] bg-white/70 hover:bg-white transition-all cursor-pointer active:scale-95"
            >
              <FileDown className="w-4 h-4" />
            </button>

            <button
              id="chat-delete-btn"
              onClick={() => {
                sounds.bubblePop();
                onDeleteCurrent();
              }}
              title="Delete this reflection"
              className="p-2.5 rounded-2xl border border-[#e5e1d8] text-[#9a9a85] hover:text-[#8c524e] hover:bg-[#f4e6e4]/50 transition-all cursor-pointer active:scale-95"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quick Mood Bar (Interactive Vibe Picker) */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
          <span className="text-[11px] font-serif italic text-[#9a9a85] shrink-0 mr-1">
            Current vibe:
          </span>
          {QUICK_MOODS.map(mood => {
            const isSelected = journal.sentiment === mood.label;
            return (
              <button
                key={mood.label}
                type="button"
                onClick={() => handleSetMood(mood.label)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs transition-all active:scale-95 cursor-pointer border ${
                  isSelected
                    ? 'bg-[#5a5a40] text-white border-[#5a5a40] shadow-2xs'
                    : `bg-white/60 text-[#5a5a40] border-[#e5e1d8]/70 ${mood.color}`
                }`}
              >
                <span>{mood.emoji}</span>
                <span className="font-medium text-[11px]">{mood.label}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* Error Banner with Retry */}
      {streamError && (
        <div
          id="chat-error-banner"
          className="mx-6 sm:mx-10 mt-4 p-4 rounded-2xl bg-[#f4e6e4] border border-[#e5b8b5] text-[#8c524e] text-xs flex items-center justify-between"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{streamError}</span>
          </div>
          {lastFailedPrompt && (
            <button
              id="chat-retry-btn"
              onClick={() => handleSendMessage(lastFailedPrompt)}
              className="flex items-center gap-1 px-3 py-1.5 bg-[#8c524e] text-white font-medium rounded-xl hover:bg-[#73403d] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          )}
        </div>
      )}

      {/* Conversation Stream */}
      <section className="flex-1 overflow-y-auto p-5 sm:p-8 space-y-6">
        {messages.length === 0 && !isStreaming ? (
          <div className="max-w-2xl mx-auto py-8 text-center">
            <div className="w-14 h-14 rounded-3xl bg-gradient-to-tr from-[#eef2e6] to-[#dfe8d7] border border-[#d2dec8] flex items-center justify-center mx-auto mb-4 text-2xl shadow-sm select-none">
              🧶
            </div>
            <h2 className="text-2xl font-serif text-[#3a3a2a]">
              What thoughts are weaving through your mind?
            </h2>
            <p className="text-sm text-[#7a7a65] mt-2 max-w-md mx-auto leading-relaxed font-serif italic">
              A cozy, grounded space to untangle emotions, celebrate quiet joys, and hear your inner voice clearly.
            </p>

            {/* Interactive Prompt Tabs */}
            <div className="mt-8 space-y-3">
              <div className="flex items-center justify-center gap-2 flex-wrap">
                {PROMPT_CATEGORIES.map((cat, idx) => (
                  <button
                    key={cat.label}
                    type="button"
                    onClick={() => {
                      sounds.bubblePop();
                      setActiveCategoryIdx(idx);
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 active:scale-95 ${
                      activeCategoryIdx === idx
                        ? 'bg-[#5a5a40] text-white shadow-xs'
                        : 'bg-white/80 border border-[#e5e1d8] text-[#6a6a50] hover:bg-white'
                    }`}
                  >
                    <span>{cat.emoji}</span>
                    <span>{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* Prompt Options for selected category */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2">
                {PROMPT_CATEGORIES[activeCategoryIdx].prompts.map((prompt, pIdx) => (
                  <button
                    key={pIdx}
                    id={`prompt-starter-${pIdx}`}
                    type="button"
                    onClick={() => handleSendMessage(prompt)}
                    className="p-4 rounded-2xl bg-white/85 border border-[#e5e1d8] hover:border-[#8ba888] hover:bg-white text-xs text-[#4a4a35] transition-all shadow-2xs hover:shadow-sm group cursor-pointer active:scale-95 text-left"
                  >
                    <span className="font-serif italic text-sm group-hover:text-[#2d2d1f] block leading-relaxed">
                      "{prompt}"
                    </span>
                    <span className="text-[10px] text-[#8ba888] font-medium mt-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <span>Reflect on this</span>
                      <span>→</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <AnimatePresence initial={false}>
            {messages.map(message => {
              const isUser = message.role === 'user';
              const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              });
              const reactions = messageReactions[message.id] || [];

              return isUser ? (
                <motion.div
                  key={message.id}
                  id={`message-bubble-${message.id}`}
                  initial={{ opacity: 0, scale: 0.94, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 25 }}
                  className="flex justify-end ml-10 sm:ml-24 group relative"
                >
                  <div className="flex flex-col items-end max-w-2xl">
                    <div className="relative bg-[#5a5a40] text-white p-5 sm:p-6 rounded-[28px] rounded-tr-sm shadow-sm text-sm leading-relaxed whitespace-pre-wrap selection:bg-[#8ba888]">
                      {message.content}
                    </div>

                    {/* Cute Footer Row with Reactions and Copy */}
                    <div className="flex items-center gap-2 mt-1.5 px-2">
                      <span className="text-[11px] text-[#9a9a85] font-serif italic">
                        You • {formattedTime}
                      </span>

                      {/* Floating reaction badges */}
                      {reactions.length > 0 && (
                        <div className="flex items-center gap-1">
                          {reactions.map(emoji => (
                            <span
                              key={emoji}
                              className="px-1.5 py-0.5 rounded-full bg-white/90 border border-[#e5e1d8] text-xs shadow-2xs animate-in zoom-in-50"
                            >
                              {emoji}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Hover Emoji Reaction Drawer */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-white/90 border border-[#e5e1d8] px-1 py-0.5 rounded-full shadow-2xs">
                        {REACTION_EMOJIS.map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleToggleReaction(message.id, emoji)}
                            className="p-1 hover:scale-125 transition-transform text-xs cursor-pointer"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key={message.id}
                  id={`message-bubble-${message.id}`}
                  initial={{ opacity: 0, scale: 0.94, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 25 }}
                  className="flex justify-start mr-10 sm:mr-24 gap-3 sm:gap-4 group relative"
                >
                  {/* Cute Loom Partner Avatar */}
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#eef2e6] to-[#dfe8d7] border border-[#d2dec8] flex items-center justify-center shrink-0 text-lg shadow-2xs mt-1 select-none">
                    🧶
                  </div>

                  <div className="flex flex-col items-start max-w-2xl">
                    <div className="bg-white/95 border border-[#e5e1d8] p-5 sm:p-6 rounded-[28px] rounded-tl-sm shadow-xs text-sm sm:text-base leading-relaxed text-[#3a3a2a] font-serif relative">
                      <div className="prose prose-stone max-w-none prose-p:leading-relaxed prose-headings:font-serif prose-headings:text-[#3a3a2a]">
                        <ReactMarkdown>{message.content}</ReactMarkdown>
                      </div>

                      {/* Copy Message Button */}
                      <button
                        type="button"
                        onClick={() => handleCopyMessage(message.id, message.content)}
                        title="Copy reflection"
                        className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 p-1.5 rounded-xl bg-white/80 border border-[#e5e1d8] text-[#7a7a65] hover:text-[#333322] transition-all cursor-pointer shadow-2xs"
                      >
                        {copiedMessageId === message.id ? (
                          <span className="text-[10px] text-[#6b8568] font-medium flex items-center gap-1">
                            <Check className="w-3 h-3" />
                            <span>Copied! 🫧</span>
                          </span>
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Cute Footer Row */}
                    <div className="flex items-center gap-2 mt-1.5 px-2">
                      <span className="text-[11px] text-[#9a9a85] font-serif italic">
                        Loom Partner • {formattedTime}
                      </span>

                      {/* Active reactions */}
                      {reactions.length > 0 && (
                        <div className="flex items-center gap-1">
                          {reactions.map(emoji => (
                            <span
                              key={emoji}
                              className="px-1.5 py-0.5 rounded-full bg-white/90 border border-[#e5e1d8] text-xs shadow-2xs animate-in zoom-in-50"
                            >
                              {emoji}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Emoji reaction picker on hover */}
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5 bg-white/90 border border-[#e5e1d8] px-1 py-0.5 rounded-full shadow-2xs">
                        {REACTION_EMOJIS.map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleToggleReaction(message.id, emoji)}
                            className="p-1 hover:scale-125 transition-transform text-xs cursor-pointer"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {/* Live Streaming Partner Bubble */}
        {isStreaming && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-start mr-10 sm:mr-24 gap-3 sm:gap-4"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#eef2e6] to-[#dfe8d7] border border-[#d2dec8] flex items-center justify-center shrink-0 text-lg shadow-2xs mt-1 select-none animate-bounce">
              🧶
            </div>
            <div className="flex flex-col items-start max-w-2xl">
              <div className="bg-white/95 border border-[#e5e1d8] p-5 sm:p-6 rounded-[28px] rounded-tl-sm shadow-xs text-sm sm:text-base leading-relaxed text-[#3a3a2a] font-serif">
                {streamedText ? (
                  <div className="prose prose-stone max-w-none prose-p:leading-relaxed">
                    <ReactMarkdown>{streamedText}</ReactMarkdown>
                    <span className="inline-block w-2 h-4 ml-1 bg-[#8ba888] animate-pulse align-middle rounded-full" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-1.5 text-[#6b6b55] text-xs font-serif italic">
                    <motion.span
                      animate={{ y: [0, -6, 0] }}
                      transition={{ repeat: Infinity, duration: 0.8, delay: 0 }}
                      className="w-2.5 h-2.5 rounded-full bg-[#8ba888]"
                    />
                    <motion.span
                      animate={{ y: [0, -6, 0] }}
                      transition={{ repeat: Infinity, duration: 0.8, delay: 0.2 }}
                      className="w-2.5 h-2.5 rounded-full bg-[#a3b899]"
                    />
                    <motion.span
                      animate={{ y: [0, -6, 0] }}
                      transition={{ repeat: Infinity, duration: 0.8, delay: 0.4 }}
                      className="w-2.5 h-2.5 rounded-full bg-[#c2d1b8]"
                    />
                    <span className="ml-1 font-medium">Loom is weaving your reflection... 🫧</span>
                  </div>
                )}
              </div>
              <span className="text-[11px] text-[#9a9a85] mt-1.5 px-2 font-serif italic flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8ba888] animate-ping" />
                Loom Partner • Streaming thoughts...
              </span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </section>

      {/* Input Footer */}
      <footer className="p-4 sm:p-6 pt-0 shrink-0">
        <div className="relative group">
          <textarea
            ref={textareaRef}
            id="reflection-input-textarea"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            placeholder="Weave your thoughts here... (Press Enter to send)"
            className="w-full p-4 sm:p-5 pr-28 sm:pr-36 bg-white border border-[#e5e1d8] rounded-[28px] text-sm text-[#333322] placeholder:text-[#9a9a85] focus:outline-none focus:ring-2 focus:ring-[#8ba888]/30 resize-none shadow-sm min-h-[76px] max-h-44 leading-relaxed transition-all"
          />

          <div className="absolute right-3.5 bottom-3.5 flex items-center gap-2">
            {isStreaming ? (
              <button
                id="stop-streaming-btn"
                type="button"
                onClick={handleStopStreaming}
                className="bg-[#8c524e] hover:bg-[#73403d] text-white px-4 py-2 rounded-full text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all cursor-pointer active:scale-95"
              >
                <Square className="w-3.5 h-3.5 fill-current" />
                <span>Pause</span>
              </button>
            ) : (
              <button
                id="submit-reflection-btn"
                type="button"
                onClick={() => handleSendMessage()}
                disabled={!inputText.trim()}
                className="bg-[#5a5a40] hover:bg-[#4a4a35] disabled:opacity-35 text-white px-5 py-2.5 rounded-full text-xs font-semibold shadow-md shadow-[#5a5a40]/20 flex items-center gap-2 transition-all active:scale-95 cursor-pointer"
              >
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </footer>
    </main>
  );
};

