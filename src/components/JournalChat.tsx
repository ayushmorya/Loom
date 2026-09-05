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
  Lightbulb,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { JournalEntry, JournalMessage } from '../types';
import { addMessageToJournal, updateJournalEntry } from '../lib/firestoreUtils';
import { useAuth } from '../context/AuthContext';

interface JournalChatProps {
  journal: JournalEntry;
  messages: JournalMessage[];
  onOpenSidebar: () => void;
  onOpenExport: () => void;
  onDeleteCurrent: () => void;
  onReloadJournal?: () => void;
}

const REFLECTION_PROMPTS = [
  'What gave you unexpected energy or drained you today?',
  'Unpack a recurring frustration without judging yourself.',
  'A decision I am second-guessing and what is holding me back.',
  'What is a belief I held strongly that might be incomplete?',
];

export const JournalChat: React.FC<JournalChatProps> = ({
  journal,
  messages,
  onOpenSidebar,
  onOpenExport,
  onDeleteCurrent,
}) => {
  const { user, refreshIdToken } = useAuth();
  const [inputText, setInputText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedText, setStreamedText] = useState('');
  const [streamError, setStreamError] = useState<string | null>(null);
  const [lastFailedPrompt, setLastFailedPrompt] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Title editing state
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState(journal.title);

  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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
      await updateJournalEntry(uid, journal.id, { title: editedTitle.trim() });
      setIsEditingTitle(false);
    } catch (err) {
      console.error('Failed to update title:', err);
    }
  };

  // Automated Insights extraction
  const triggerAnalyzeInsights = async (customContent?: string) => {
    const uid = user?.uid || 'demo-user-vault';
    setIsAnalyzing(true);
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

    setInputText('');
    setStreamError(null);
    setLastFailedPrompt(null);

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
      {/* Natural Tones Top Header */}
      <header className="h-20 sm:h-24 px-6 sm:px-10 border-b border-[#e5e1d8] flex items-center justify-between bg-white/40 backdrop-blur-sm shrink-0 z-10">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <button
            id="chat-open-sidebar-btn"
            onClick={onOpenSidebar}
            title="Open Reflections"
            className="md:hidden p-2 rounded-xl border border-[#e5e1d8] text-[#5a5a40] hover:bg-[#f5f2ed] transition-colors"
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
                  className="w-full font-serif text-xl sm:text-2xl px-2.5 py-1 rounded-xl bg-white border border-[#5a5a40]/30 text-[#3a3a2a] focus:outline-none"
                />
                <button
                  id="chat-title-save-btn"
                  onClick={handleTitleSave}
                  className="p-2 text-[#5a5a40] hover:bg-[#e8e4d9] rounded-xl transition-colors"
                >
                  <Check className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div
                className="flex items-center gap-2 group cursor-pointer"
                onClick={() => setIsEditingTitle(true)}
              >
                <h1 className="font-serif text-xl sm:text-2xl text-[#3a3a2a] truncate font-normal">
                  {journal.title}
                </h1>
                <Edit2 className="w-3.5 h-3.5 text-[#9a9a85] opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            )}

            {/* Natural Metadata Subtitle Row */}
            <div className="flex items-center gap-3 sm:gap-4 mt-1 flex-wrap">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-[#8ba888]" />
                <span className="text-xs text-[#7a7a65] font-medium">
                  Sentiment: {journal.sentiment || 'Reflective'}
                </span>
              </div>

              <div className="h-3 w-px bg-[#e5e1d8]" />

              <div className="text-xs text-[#9a9a85]">
                {wordCount > 0 ? `${wordCount} words` : 'Beginning reflection'}
                {journal.tags && journal.tags.length > 0 && ` • ${journal.tags.join(', ')}`}
              </div>

              <div className="h-3 w-px bg-[#e5e1d8] hidden sm:block" />

              <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#7a7a65] font-serif italic">
                <span className="w-1.5 h-1.5 rounded-full bg-[#8ba888] animate-pulse" />
                <span>Zen floating ambiance</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons in Natural Tones */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            id="chat-reanalyze-btn"
            onClick={() => triggerAnalyzeInsights()}
            disabled={isAnalyzing || messages.length === 0}
            title="Synthesize insights & themes"
            className="p-2.5 rounded-xl border border-[#e5e1d8] text-[#5a5a40] hover:bg-[#f5f2ed] transition-colors disabled:opacity-40 flex items-center gap-1.5 text-xs font-medium"
          >
            <Sparkles className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">{isAnalyzing ? 'Analyzing...' : 'Synthesize'}</span>
          </button>

          <button
            id="chat-export-btn"
            onClick={onOpenExport}
            title="Export as Markdown or JSON"
            className="p-2.5 rounded-xl border border-[#e5e1d8] text-[#5a5a40] hover:bg-[#f5f2ed] transition-colors"
          >
            <FileDown className="w-4 h-4" />
          </button>

          <button
            id="chat-delete-btn"
            onClick={onDeleteCurrent}
            title="Delete this reflection"
            className="p-2.5 rounded-xl border border-[#e5e1d8] text-[#9a9a85] hover:text-[#8c524e] hover:bg-[#f4e6e4]/50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
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
              className="flex items-center gap-1 px-3 py-1.5 bg-[#8c524e] text-white font-medium rounded-xl hover:bg-[#73403d] transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Retry
            </button>
          )}
        </div>
      )}

      {/* Natural Tones Conversation Stream */}
      <section className="flex-1 overflow-y-auto p-6 sm:p-10 space-y-8">
        {messages.length === 0 && !isStreaming ? (
          <div className="max-w-2xl mx-auto py-10 text-center">
            <div className="w-12 h-12 rounded-full bg-[#e8e4d9] text-[#5a5a40] flex items-center justify-center mx-auto mb-4 font-serif text-lg font-medium italic">
              R
            </div>
            <h2 className="text-2xl font-serif text-[#3a3a2a]">
              What thoughts are unfolding for you today?
            </h2>
            <p className="text-sm text-[#7a7a65] mt-2 max-w-md mx-auto leading-relaxed font-serif italic">
              A quiet, grounded space to unpack feelings, explore blind spots, and clarify your inner narrative.
            </p>

            {/* Prompt Starters */}
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
              {REFLECTION_PROMPTS.map((prompt, idx) => (
                <button
                  key={idx}
                  id={`prompt-starter-${idx}`}
                  type="button"
                  onClick={() => handleSendMessage(prompt)}
                  className="p-4 rounded-2xl bg-white/70 border border-[#e5e1d8] hover:border-[#5a5a40]/50 text-xs text-[#4a4a35] transition-all hover:bg-white shadow-2xs group"
                >
                  <span className="font-serif italic text-sm group-hover:text-[#333322]">
                    "{prompt}"
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map(message => {
            const isUser = message.role === 'user';
            const formattedTime = new Date(message.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            });

            return isUser ? (
              <div
                key={message.id}
                id={`message-bubble-${message.id}`}
                className="flex justify-end ml-12 sm:ml-24"
              >
                <div className="flex flex-col items-end">
                  <div className="bg-[#5a5a40] text-white p-5 sm:p-6 rounded-[32px] rounded-tr-none shadow-sm text-sm leading-relaxed max-w-2xl whitespace-pre-wrap">
                    {message.content}
                  </div>
                  <span className="text-[11px] text-[#9a9a85] mt-1.5 px-2 font-serif italic">
                    You • {formattedTime}
                  </span>
                </div>
              </div>
            ) : (
              <div
                key={message.id}
                id={`message-bubble-${message.id}`}
                className="flex justify-start mr-12 sm:mr-24 gap-4"
              >
                <div className="w-10 h-10 rounded-full bg-[#e8e4d9] flex items-center justify-center shrink-0 text-[#5a5a40] mt-1.5 font-serif italic text-base font-semibold shadow-xs">
                  R
                </div>
                <div className="flex flex-col items-start max-w-2xl">
                  <div className="bg-white border border-[#e5e1d8] p-5 sm:p-6 rounded-[32px] rounded-tl-none shadow-xs text-sm sm:text-base leading-relaxed text-[#4a4a35] font-serif">
                    <div className="prose prose-stone max-w-none prose-p:leading-relaxed prose-headings:font-serif prose-headings:text-[#3a3a2a]">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  </div>
                  <span className="text-[11px] text-[#9a9a85] mt-1.5 px-2 font-serif italic">
                    Reflective Partner • {formattedTime}
                  </span>
                </div>
              </div>
            );
          })
        )}

        {/* Live Streaming Partner Bubble */}
        {isStreaming && (
          <div className="flex justify-start mr-12 sm:mr-24 gap-4">
            <div className="w-10 h-10 rounded-full bg-[#e8e4d9] flex items-center justify-center shrink-0 text-[#5a5a40] mt-1.5 font-serif italic text-base font-semibold shadow-xs">
              R
            </div>
            <div className="flex flex-col items-start max-w-2xl">
              <div className="bg-white border border-[#e5e1d8] p-5 sm:p-6 rounded-[32px] rounded-tl-none shadow-xs text-sm sm:text-base leading-relaxed text-[#4a4a35] font-serif">
                {streamedText ? (
                  <div className="prose prose-stone max-w-none prose-p:leading-relaxed">
                    <ReactMarkdown>{streamedText}</ReactMarkdown>
                    <span className="inline-block w-2 h-4 ml-1 bg-[#5a5a40] animate-pulse align-middle" />
                  </div>
                ) : (
                  <div className="flex items-center gap-2 py-1 text-[#7a7a65] text-xs font-serif italic">
                    <span className="w-2 h-2 rounded-full bg-[#5a5a40] animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-[#5a5a40] animate-bounce [animation-delay:0.2s]" />
                    <span className="w-2 h-2 rounded-full bg-[#5a5a40] animate-bounce [animation-delay:0.4s]" />
                    <span className="ml-1">Synthesizing clarity with Gemini...</span>
                  </div>
                )}
              </div>
              <span className="text-[11px] text-[#9a9a85] mt-1.5 px-2 font-serif italic">
                Reflective Partner • Streaming thoughts...
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </section>

      {/* Natural Tones Input Footer */}
      <footer className="p-6 sm:p-10 pt-0 shrink-0">
        <div className="relative group">
          <textarea
            ref={textareaRef}
            id="reflection-input-textarea"
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isStreaming}
            placeholder="Type your thoughts here..."
            className="w-full p-5 sm:p-6 bg-white border border-[#e5e1d8] rounded-[32px] text-sm text-[#333322] placeholder:text-[#9a9a85] focus:outline-none focus:ring-2 focus:ring-[#5a5a40]/20 resize-none shadow-sm min-h-[84px] max-h-48 leading-relaxed"
          />

          <div className="absolute right-4 bottom-4 flex items-center gap-3">
            <span className="text-[10px] text-[#9a9a85] font-medium tracking-widest uppercase hidden sm:inline">
              Gemini 3.6 Flash Active
            </span>

            {isStreaming ? (
              <button
                id="stop-streaming-btn"
                type="button"
                onClick={handleStopStreaming}
                className="bg-[#8c524e] hover:bg-[#73403d] text-white px-5 py-2.5 rounded-full text-xs font-semibold shadow-md flex items-center gap-1.5 transition-all"
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
                className="bg-[#5a5a40] hover:bg-[#4a4a35] disabled:opacity-30 text-white px-6 py-2.5 rounded-full text-xs font-semibold shadow-lg shadow-[#5a5a40]/20 flex items-center gap-2 transition-all active:scale-95"
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
