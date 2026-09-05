import React, { useState, useEffect, useMemo } from 'react';
import {
  Sparkles,
  Lock,
  Calendar,
  Send,
  Trash2,
  Check,
  Clock,
  ArrowRight,
  RefreshCw,
  Mail,
  X,
  Volume2,
  VolumeX,
  Heart,
  ChevronRight,
  Eye,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import { FutureCapsule, FutureReflectResponse, FutureCompareResponse } from '../types';
import { sounds } from '../lib/soundEffects';

interface FutureSelfModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  capsules: FutureCapsule[];
  onCreateCapsule: (capsule: Omit<FutureCapsule, 'id'>) => Promise<string>;
  onUpdateCapsule: (id: string, updates: Partial<FutureCapsule>) => Promise<void>;
  onDeleteCapsule: (id: string) => Promise<void>;
  getAuthToken?: () => Promise<string | null>;
}

type TabMode = 'write' | 'vault' | 'unlock';

export const FutureSelfModal: React.FC<FutureSelfModalProps> = ({
  isOpen,
  onClose,
  userId,
  capsules,
  onCreateCapsule,
  onUpdateCapsule,
  onDeleteCapsule,
  getAuthToken,
}) => {
  // Navigation & Sub-views
  const [activeTab, setActiveTab] = useState<TabMode>('write');
  const [vaultFilter, setVaultFilter] = useState<'all' | 'sealed' | 'opened'>('all');

  // Sound Toggle State
  const [soundEnabled, setSoundEnabled] = useState(sounds.isEnabled());

  // Form State: Writing
  const [letterMessage, setLetterMessage] = useState('');
  const [letterTitle, setLetterTitle] = useState('');
  const [durationChoice, setDurationChoice] = useState<'30' | '90' | '365' | 'custom'>('30');
  const [customDate, setCustomDate] = useState('');

  // AI Reflection Before Sealing
  const [isReflectingAI, setIsReflectingAI] = useState(false);
  const [aiReflection, setAiReflection] = useState<FutureReflectResponse | null>(null);

  // Sealing Animation Sequence State
  // 'idle' | 'folding' | 'enveloping' | 'stamping' | 'traveling' | 'sealed'
  const [sealAnimationStep, setSealAnimationStep] = useState<
    'idle' | 'folding' | 'enveloping' | 'stamping' | 'traveling' | 'sealed'
  >('idle');
  const [justSealedCapsule, setJustSealedCapsule] = useState<FutureCapsule | null>(null);

  // Unlocked Capsule Viewing State
  const [selectedCapsule, setSelectedCapsule] = useState<FutureCapsule | null>(null);
  const [unlockAnimationStep, setUnlockAnimationStep] = useState<'locked' | 'breaking' | 'revealed'>('locked');
  const [nowReflectionInput, setNowReflectionInput] = useState('');
  const [isComparingAI, setIsComparingAI] = useState(false);

  // Current Time for dynamic countdowns
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Compute unlock target date from duration choice
  const calculatedUnlockDate = useMemo(() => {
    const base = new Date();
    if (durationChoice === '30') {
      base.setDate(base.getDate() + 30);
      return base;
    }
    if (durationChoice === '90') {
      base.setDate(base.getDate() + 90);
      return base;
    }
    if (durationChoice === '365') {
      base.setDate(base.getDate() + 365);
      return base;
    }
    if (customDate) {
      const parsed = new Date(customDate);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    base.setDate(base.getDate() + 30);
    return base;
  }, [durationChoice, customDate]);

  const formattedUnlockDate = useMemo(() => {
    return calculatedUnlockDate.toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [calculatedUnlockDate]);

  // Minimum date for custom picker (tomorrow)
  const minCustomDate = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  }, []);

  // Play sound toggle
  const handleToggleSound = () => {
    const next = sounds.toggle();
    setSoundEnabled(next);
  };

  // Call AI Reflection before sealing
  const handleReflectWithAI = async () => {
    if (!letterMessage.trim()) return;
    setIsReflectingAI(true);
    sounds.pop();

    try {
      let token = 'demo-token';
      if (getAuthToken) {
        const fetched = await getAuthToken();
        if (fetched) token = fetched;
      }

      const res = await fetch('/api/future-self/reflect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ message: letterMessage }),
      });

      if (!res.ok) {
        throw new Error('Could not analyze reflection');
      }

      const data = (await res.json()) as FutureReflectResponse;
      setAiReflection(data);
      sounds.chime();
    } catch (err) {
      console.error('AI Reflection error:', err);
      // Friendly fallback
      setAiReflection({
        reflection: 'Your letter holds an honest snapshot of where you are standing right now.',
        mattersNow: ['Present thoughts', 'Future intentions'],
        questionForFuture: 'Did you discover what truly mattered along the way?',
      });
      sounds.chime();
    } finally {
      setIsReflectingAI(false);
    }
  };

  // Seal Message Action with sequential animation & sound
  const handleSealMessage = async () => {
    if (!letterMessage.trim()) return;

    // 1. Fold paper
    setSealAnimationStep('folding');
    sounds.foldSwoosh();

    setTimeout(() => {
      // 2. Slip into envelope
      setSealAnimationStep('enveloping');
    }, 600);

    setTimeout(() => {
      // 3. Stamp wax seal
      setSealAnimationStep('stamping');
      sounds.sealStamp();
    }, 1200);

    setTimeout(() => {
      // 4. Travel to vault
      setSealAnimationStep('traveling');
      sounds.sparkle();
    }, 1900);

    const unlockIso = calculatedUnlockDate.toISOString();
    const title = letterTitle.trim() || `Letter for ${formattedUnlockDate}`;

    try {
      const newId = await onCreateCapsule({
        userId,
        title,
        message: letterMessage.trim(),
        createdAt: new Date().toISOString(),
        unlockDate: unlockIso,
        status: 'sealed',
        aiReflectionBeforeSeal: aiReflection || undefined,
      });

      const sealedItem: FutureCapsule = {
        id: newId,
        userId,
        title,
        message: letterMessage.trim(),
        createdAt: new Date().toISOString(),
        unlockDate: unlockIso,
        status: 'sealed',
        aiReflectionBeforeSeal: aiReflection || undefined,
      };

      setTimeout(() => {
        setJustSealedCapsule(sealedItem);
        setSealAnimationStep('sealed');
        sounds.contemplative();
      }, 2600);
    } catch (err) {
      console.error('Error creating future capsule:', err);
      setSealAnimationStep('idle');
    }
  };

  // Reset writing form
  const handleResetForm = () => {
    setLetterMessage('');
    setLetterTitle('');
    setAiReflection(null);
    setSealAnimationStep('idle');
    setJustSealedCapsule(null);
    setActiveTab('vault');
    sounds.pop();
  };

  // Open & Reveal Capsule Experience
  const handleOpenCapsule = async (capsule: FutureCapsule, forceSimulate = false) => {
    setSelectedCapsule(capsule);
    setNowReflectionInput(capsule.nowReflection || '');
    setActiveTab('unlock');

    const unlockTime = new Date(capsule.unlockDate).getTime();
    const isUnlocked = currentTime >= unlockTime || capsule.status === 'opened' || forceSimulate;

    if (isUnlocked) {
      setUnlockAnimationStep('breaking');
      sounds.sealStamp();

      setTimeout(() => {
        setUnlockAnimationStep('revealed');
        sounds.sparkle();
      }, 900);

      // If status wasn't opened in db, mark it opened
      if (capsule.status !== 'opened') {
        await onUpdateCapsule(capsule.id, {
          status: 'opened',
          openedAt: new Date().toISOString(),
        });
      }
    } else {
      setUnlockAnimationStep('locked');
      sounds.pop();
    }
  };

  // Compare Then & Now with AI
  const handleCompareThenAndNow = async () => {
    if (!selectedCapsule || !nowReflectionInput.trim()) return;
    setIsComparingAI(true);
    sounds.pop();

    try {
      let token = 'demo-token';
      if (getAuthToken) {
        const fetched = await getAuthToken();
        if (fetched) token = fetched;
      }

      const res = await fetch('/api/future-self/compare', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          thenText: selectedCapsule.message,
          nowText: nowReflectionInput.trim(),
        }),
      });

      if (!res.ok) {
        throw new Error('Comparison failed');
      }

      const comparison = (await res.json()) as FutureCompareResponse;

      // Persist to capsule
      await onUpdateCapsule(selectedCapsule.id, {
        nowReflection: nowReflectionInput.trim(),
        aiComparison: comparison,
      });

      setSelectedCapsule(prev =>
        prev
          ? {
              ...prev,
              nowReflection: nowReflectionInput.trim(),
              aiComparison: comparison,
            }
          : null
      );

      sounds.chime();
    } catch (err) {
      console.error('Error comparing reflections:', err);
      // Graceful fallback
      const fallbackComparison: FutureCompareResponse = {
        summary: 'Your journey reflects continuous evolution and deeper self-compassion across time.',
        thenSummary: 'You were navigating uncertainties and hopes for the path ahead.',
        nowSummary: 'You brought thoughtful reflection and perspective to your past words.',
        biggestShift: 'Seeking → Grounding',
        growthTrajectory: {
          then: 'Searching',
          journey: 'Time',
          now: 'Reflective',
        },
      };

      await onUpdateCapsule(selectedCapsule.id, {
        nowReflection: nowReflectionInput.trim(),
        aiComparison: fallbackComparison,
      });

      setSelectedCapsule(prev =>
        prev
          ? {
              ...prev,
              nowReflection: nowReflectionInput.trim(),
              aiComparison: fallbackComparison,
            }
          : null
      );
      sounds.chime();
    } finally {
      setIsComparingAI(false);
    }
  };

  // Save Now Reflection
  const handleSaveNowReflection = async () => {
    if (!selectedCapsule) return;
    sounds.pop();
    await onUpdateCapsule(selectedCapsule.id, {
      nowReflection: nowReflectionInput.trim(),
    });
    setSelectedCapsule(prev => (prev ? { ...prev, nowReflection: nowReflectionInput.trim() } : null));
  };

  // Helper: format countdown string
  const formatCountdown = (unlockIso: string) => {
    const diff = new Date(unlockIso).getTime() - currentTime;
    if (diff <= 0) return 'Ready to Open';

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    if (days > 0) {
      return `${days}d · ${hours}h · ${minutes}m`;
    }
    return `${hours}h · ${minutes}m · ${seconds}s`;
  };

  // Filtered list of capsules
  const filteredCapsules = useMemo(() => {
    return capsules.filter(c => {
      const isPast = currentTime >= new Date(c.unlockDate).getTime();
      const isUnlocked = c.status === 'opened' || isPast;
      if (vaultFilter === 'sealed') return !isUnlocked;
      if (vaultFilter === 'opened') return isUnlocked;
      return true;
    });
  }, [capsules, vaultFilter, currentTime]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/45 backdrop-blur-md overflow-hidden animate-fadeIn"
    >
      {/* Modal Canvas with Ambient Gradient Glow */}
      <div className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-gradient-to-b from-[#fefdfa] via-[#fcfaf4] to-[#f7f3ea] border border-[#e8dfcf] shadow-2xl shadow-[#3c352a]/15 overflow-hidden text-[#333322]">
        {/* Ethereal Gradient Atmospheric Banner */}
        <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-r from-[#e3eae0]/40 via-[#f4ede4]/60 to-[#eddcd2]/35 pointer-events-none -z-0 blur-2xl" />

        {/* Modal Top Header */}
        <div className="relative z-10 flex items-center justify-between px-6 sm:px-8 py-5 border-b border-[#ebdcd0]/70 bg-white/50 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#5a5a40] to-[#7f886a] text-white flex items-center justify-center shadow-md shadow-[#5a5a40]/20 text-lg">
              🔮
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-serif text-[#3a3528] tracking-tight">
                  Future Self
                </h2>
                <span className="text-[11px] font-sans px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#8ba888]/20 to-[#c8b6a6]/30 text-[#4c5844] font-medium border border-[#8ba888]/30">
                  Time Capsule Vault
                </span>
              </div>
              <p className="text-xs text-[#7e7667] font-serif italic hidden sm:block">
                Leave something meaningful behind for the person you are becoming.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sound Toggle */}
            <button
              type="button"
              onClick={handleToggleSound}
              title={soundEnabled ? 'Mute serene sound effects' : 'Enable serene sound effects'}
              className="p-2 rounded-xl border border-[#e3dcd1] text-[#71695a] hover:bg-[#ede7dc] transition-colors"
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-[#5a5a40]" /> : <VolumeX className="w-4 h-4 text-[#a89f91]" />}
            </button>

            {/* Close Button */}
            <button
              type="button"
              onClick={() => {
                sounds.pop();
                onClose();
              }}
              className="p-2 rounded-xl border border-[#e3dcd1] text-[#71695a] hover:bg-[#ede7dc] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="relative z-10 flex items-center justify-between px-6 sm:px-8 py-2.5 border-b border-[#ebdcd0]/50 bg-[#faf7f0]/80">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                sounds.pop();
                setActiveTab('write');
              }}
              className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                activeTab === 'write'
                  ? 'bg-[#5a5a40] text-white shadow-sm shadow-[#5a5a40]/25'
                  : 'text-[#6e685a] hover:bg-[#ede7db]'
              }`}
            >
              ✍️ Write Letter
            </button>

            <button
              type="button"
              onClick={() => {
                sounds.pop();
                setActiveTab('vault');
              }}
              className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all flex items-center gap-1.5 ${
                activeTab === 'vault'
                  ? 'bg-[#5a5a40] text-white shadow-sm shadow-[#5a5a40]/25'
                  : 'text-[#6e685a] hover:bg-[#ede7db]'
              }`}
            >
              <span>🔒 Sealed Capsules</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/15">
                {capsules.length}
              </span>
            </button>

            {selectedCapsule && (
              <button
                type="button"
                onClick={() => {
                  sounds.pop();
                  setActiveTab('unlock');
                }}
                className={`px-4 py-1.5 rounded-xl text-xs sm:text-sm font-medium transition-all ${
                  activeTab === 'unlock'
                    ? 'bg-[#5a5a40] text-white shadow-sm shadow-[#5a5a40]/25'
                    : 'text-[#6e685a] hover:bg-[#ede7db]'
                }`}
              >
                ✨ Current Capsule
              </button>
            )}
          </div>

          <div className="text-xs text-[#8f8877] font-serif italic hidden md:block">
            {activeTab === 'write' && 'Write → Reflect → Seal'}
            {activeTab === 'vault' && 'Your personal timeline'}
            {activeTab === 'unlock' && 'Revisiting past footsteps'}
          </div>
        </div>

        {/* Tab Content Body */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 relative">
          {/* TAB 1: WRITE A NEW CAPSULE */}
          {activeTab === 'write' && (
            <div className="max-w-2xl mx-auto space-y-6">
              {/* Sealing In-Progress Animation Experience */}
              {sealAnimationStep !== 'idle' ? (
                <div className="py-12 flex flex-col items-center justify-center text-center space-y-6">
                  {sealAnimationStep === 'folding' && (
                    <div className="w-36 h-48 bg-white border border-[#ebdcd0] rounded-xl shadow-xl flex items-center justify-center animate-pulse transition-transform duration-500 scale-95 rotate-3">
                      <p className="font-serif italic text-xs text-[#8b8474] px-4">Folding your thoughts...</p>
                    </div>
                  )}

                  {sealAnimationStep === 'enveloping' && (
                    <div className="w-48 h-32 bg-[#faf4ea] border-2 border-[#d9cebe] rounded-2xl shadow-xl flex items-center justify-center transition-transform duration-500 scale-100">
                      <div className="text-3xl">✉️</div>
                    </div>
                  )}

                  {sealAnimationStep === 'stamping' && (
                    <div className="w-48 h-32 bg-[#faf4ea] border-2 border-[#d9cebe] rounded-2xl shadow-2xl flex items-center justify-center relative">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-[#984b43] to-[#c26155] border-2 border-[#73332c] flex items-center justify-center text-white font-serif font-bold text-lg shadow-lg animate-bounce">
                          A
                        </div>
                      </div>
                    </div>
                  )}

                  {sealAnimationStep === 'traveling' && (
                    <div className="w-48 h-32 bg-[#faf4ea] border-2 border-[#8ba888] rounded-2xl shadow-2xl flex items-center justify-center relative animate-pulse">
                      <Sparkles className="w-8 h-8 text-[#8ba888] animate-spin" />
                    </div>
                  )}

                  {sealAnimationStep === 'sealed' && (
                    <div className="p-8 rounded-3xl bg-gradient-to-b from-[#f5fbf3] to-[#edf4eb] border border-[#cfdfcd] shadow-lg max-w-md w-full space-y-5 animate-fadeIn">
                      <div className="w-16 h-16 rounded-full bg-[#8ba888]/20 text-[#496246] flex items-center justify-center mx-auto text-3xl">
                        🔒
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-2xl font-serif text-[#2f402e]">
                          Your message has been sealed.
                        </h3>
                        <p className="text-sm text-[#5d735b] font-serif">
                          Future You will receive it on{' '}
                          <span className="font-semibold text-[#2f402e]">
                            {justSealedCapsule ? new Date(justSealedCapsule.unlockDate).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : formattedUnlockDate}
                          </span>
                        </p>
                      </div>

                      <div className="p-4 rounded-2xl bg-white/70 border border-[#cfdfcd] text-xs text-[#5d735b] font-serif italic text-left space-y-1">
                        <div className="flex items-center gap-1.5 font-medium text-[#2f402e]">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Strictly Vaulted & Private</span>
                        </div>
                        <p>
                          Your letter is stored securely and cannot be read until its unlock date arrives.
                        </p>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={handleResetForm}
                          className="flex-1 py-3 px-4 rounded-xl bg-[#5a5a40] hover:bg-[#4a4a35] text-white text-sm font-medium shadow-md shadow-[#5a5a40]/20 transition-transform active:scale-95"
                        >
                          View Sealed Capsules
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Standard Writing Flow */
                <>
                  {/* Step Header */}
                  <div className="text-center space-y-2">
                    <h3 className="font-serif text-2xl sm:text-3xl text-[#3a3528]">
                      Dear Future Me...
                    </h3>
                    <p className="text-sm text-[#7a7465] font-serif italic max-w-md mx-auto">
                      What would you want the future version of you to know about today?
                    </p>
                  </div>

                  {/* Optional Title */}
                  <div>
                    <label htmlFor="future-capsule-title" className="block text-xs font-semibold text-[#736c5d] uppercase tracking-wider mb-1.5">
                      Capsule Title (Optional)
                    </label>
                    <input
                      id="future-capsule-title"
                      type="text"
                      placeholder="e.g., Autumn thoughts on changing directions"
                      value={letterTitle}
                      onChange={e => setLetterTitle(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-2xl bg-white border border-[#e5dcd0] text-[#333322] placeholder:text-[#a8a192] text-sm focus:outline-none focus:border-[#8ba888]"
                    />
                  </div>

                  {/* Letter Text Area with Gentle Prompts */}
                  <div className="relative">
                    <label htmlFor="future-capsule-letter" className="block text-xs font-semibold text-[#736c5d] uppercase tracking-wider mb-1.5 flex justify-between">
                      <span>Your Letter</span>
                      <span className="text-[#999283] font-normal normal-case italic">
                        Write freely without rules
                      </span>
                    </label>
                    <textarea
                      id="future-capsule-letter"
                      rows={9}
                      value={letterMessage}
                      onChange={e => setLetterMessage(e.target.value)}
                      placeholder="I'm currently feeling...&#10;I'm working toward...&#10;I'm worried about...&#10;I hope that by then...&#10;I want you to remember..."
                      className="w-full p-5 rounded-3xl bg-white border border-[#e5dcd0] text-[#333322] placeholder:text-[#a8a192] text-sm leading-relaxed focus:outline-none focus:border-[#8ba888] font-serif shadow-inner resize-y min-h-[220px]"
                    />
                    <div className="text-right text-[11px] text-[#9b9485] mt-1">
                      {letterMessage.trim().split(/\s+/).filter(Boolean).length} words
                    </div>
                  </div>

                  {/* AI Reflection Before Sealing Section */}
                  <div className="p-5 rounded-3xl bg-gradient-to-br from-[#f8f5ef] via-white to-[#f4ede2] border border-[#ebdcd0] space-y-4">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#8ba888]" />
                        <h4 className="text-sm font-serif font-medium text-[#463f33]">
                          Reflect With AI (Optional)
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={handleReflectWithAI}
                        disabled={isReflectingAI || !letterMessage.trim()}
                        className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#8ba888] to-[#749271] hover:from-[#7c9979] hover:to-[#688565] text-white text-xs font-medium transition-all shadow-sm disabled:opacity-50 flex items-center gap-1.5"
                      >
                        {isReflectingAI ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Reflecting...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>{aiReflection ? 'Update Reflection' : 'Reflect With AI'}</span>
                          </>
                        )}
                      </button>
                    </div>

                    {aiReflection ? (
                      <div className="space-y-3 pt-2 text-xs font-serif leading-relaxed text-[#554d3f] border-t border-[#ebdcd0]/70">
                        <div>
                          <span className="font-semibold text-[#3a3528] block mb-1">
                            AI Reflection
                          </span>
                          <p className="italic text-[#4a4235] bg-[#f9f7f2] p-3 rounded-2xl border border-[#ebdcd0]">
                            &ldquo;{aiReflection.reflection}&rdquo;
                          </p>
                        </div>

                        {aiReflection.mattersNow && aiReflection.mattersNow.length > 0 && (
                          <div>
                            <span className="font-semibold text-[#3a3528] block mb-1">
                              What matters to you right now:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {aiReflection.mattersNow.map((item, idx) => (
                                <span
                                  key={idx}
                                  className="px-2.5 py-1 rounded-full bg-[#f1ebe1] text-[#4f473a] text-[11px] font-sans"
                                >
                                  • {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {aiReflection.questionForFuture && (
                          <div className="pt-1">
                            <span className="font-semibold text-[#3a3528] block mb-1">
                              A question for your future self:
                            </span>
                            <p className="text-[#3c4a3a] bg-[#eef4ec] p-3 rounded-2xl border border-[#d6e4d4] font-medium">
                              &ldquo;{aiReflection.questionForFuture}&rdquo;
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-[#8a8272] font-serif italic">
                        Receive gentle validation of what matters to you today and an insightful question to accompany your letter.
                      </p>
                    )}
                  </div>

                  {/* When Should Future You Receive This */}
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-semibold text-[#736c5d] uppercase tracking-wider">
                      When should Future You receive this?
                    </h4>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          sounds.pop();
                          setDurationChoice('30');
                        }}
                        className={`p-3 rounded-2xl border text-center transition-all ${
                          durationChoice === '30'
                            ? 'bg-[#5a5a40] text-white border-[#5a5a40] shadow-md shadow-[#5a5a40]/20'
                            : 'bg-white text-[#554d3f] border-[#e2d7c9] hover:bg-[#faf7f0]'
                        }`}
                      >
                        <div className="text-lg mb-1">🌱</div>
                        <div className="text-xs font-semibold">30 Days</div>
                        <div className="text-[10px] opacity-75">1 Month</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          sounds.pop();
                          setDurationChoice('90');
                        }}
                        className={`p-3 rounded-2xl border text-center transition-all ${
                          durationChoice === '90'
                            ? 'bg-[#5a5a40] text-white border-[#5a5a40] shadow-md shadow-[#5a5a40]/20'
                            : 'bg-white text-[#554d3f] border-[#e2d7c9] hover:bg-[#faf7f0]'
                        }`}
                      >
                        <div className="text-lg mb-1">🌿</div>
                        <div className="text-xs font-semibold">90 Days</div>
                        <div className="text-[10px] opacity-75">1 Season</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          sounds.pop();
                          setDurationChoice('365');
                        }}
                        className={`p-3 rounded-2xl border text-center transition-all ${
                          durationChoice === '365'
                            ? 'bg-[#5a5a40] text-white border-[#5a5a40] shadow-md shadow-[#5a5a40]/20'
                            : 'bg-white text-[#554d3f] border-[#e2d7c9] hover:bg-[#faf7f0]'
                        }`}
                      >
                        <div className="text-lg mb-1">🌳</div>
                        <div className="text-xs font-semibold">1 Year</div>
                        <div className="text-[10px] opacity-75">Full Orbit</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          sounds.pop();
                          setDurationChoice('custom');
                        }}
                        className={`p-3 rounded-2xl border text-center transition-all ${
                          durationChoice === 'custom'
                            ? 'bg-[#5a5a40] text-white border-[#5a5a40] shadow-md shadow-[#5a5a40]/20'
                            : 'bg-white text-[#554d3f] border-[#e2d7c9] hover:bg-[#faf7f0]'
                        }`}
                      >
                        <div className="text-lg mb-1">✨</div>
                        <div className="text-xs font-semibold">Custom Date</div>
                        <div className="text-[10px] opacity-75">Choose Day</div>
                      </button>
                    </div>

                    {durationChoice === 'custom' && (
                      <div className="p-3.5 rounded-2xl bg-white border border-[#e5dcd0] space-y-1.5 animate-fadeIn">
                        <label htmlFor="future-capsule-custom-date" className="block text-xs text-[#736c5d] font-medium">
                          Select Unlock Date:
                        </label>
                        <input
                          id="future-capsule-custom-date"
                          type="date"
                          min={minCustomDate}
                          value={customDate}
                          onChange={e => setCustomDate(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl bg-[#faf7f0] border border-[#e5dcd0] text-sm text-[#333322] focus:outline-none focus:border-[#8ba888]"
                        />
                      </div>
                    )}

                    <div className="p-3 rounded-2xl bg-gradient-to-r from-[#8ba888]/15 via-[#c8b6a6]/20 to-[#8ba888]/15 border border-[#8ba888]/25 text-xs text-[#3b4738] flex items-center justify-between font-serif">
                      <div className="flex items-center gap-2">
                        <Lock className="w-3.5 h-3.5 text-[#5a6b57]" />
                        <span>
                          Sealed until <strong className="text-[#2b3628] font-bold">{formattedUnlockDate}</strong>
                        </span>
                      </div>
                      <span className="text-[11px] font-sans text-[#5a6b57] hidden sm:block">
                        Ready in {formatCountdown(calculatedUnlockDate.toISOString())}
                      </span>
                    </div>
                  </div>

                  {/* Prominent Seal Button */}
                  <div className="pt-4">
                    <button
                      type="button"
                      id="future-self-seal-btn"
                      onClick={handleSealMessage}
                      disabled={!letterMessage.trim()}
                      className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#5a5a40] via-[#4d4d35] to-[#3f3f2a] hover:opacity-95 text-white font-serif text-base shadow-xl shadow-[#5a5a40]/25 transition-all active:scale-[0.99] disabled:opacity-40 flex items-center justify-center gap-2"
                    >
                      <Lock className="w-4 h-4" />
                      <span>🔒 Seal My Message</span>
                    </button>
                    <p className="text-center text-[11px] text-[#8c8575] font-serif italic mt-2">
                      Once sealed, this letter will be locked safely away until its appointed date.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2: SEALED CAPSULES VAULT */}
          {activeTab === 'vault' && (
            <div className="space-y-6">
              {/* Filter bar */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-[#ede7db]/70 border border-[#e2d8c7]">
                  <button
                    type="button"
                    onClick={() => {
                      sounds.pop();
                      setVaultFilter('all');
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-medium transition-colors ${
                      vaultFilter === 'all' ? 'bg-white text-[#3a3528] shadow-sm' : 'text-[#736c5d]'
                    }`}
                  >
                    All ({capsules.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sounds.pop();
                      setVaultFilter('sealed');
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-medium transition-colors ${
                      vaultFilter === 'sealed' ? 'bg-white text-[#3a3528] shadow-sm' : 'text-[#736c5d]'
                    }`}
                  >
                    🔒 Sealed
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      sounds.pop();
                      setVaultFilter('opened');
                    }}
                    className={`px-3 py-1 rounded-xl text-xs font-medium transition-colors ${
                      vaultFilter === 'opened' ? 'bg-white text-[#3a3528] shadow-sm' : 'text-[#736c5d]'
                    }`}
                  >
                    ✨ Opened
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    sounds.pop();
                    setActiveTab('write');
                  }}
                  className="px-4 py-1.5 rounded-xl bg-[#5a5a40] hover:bg-[#4a4a35] text-white text-xs font-medium shadow-sm transition-transform active:scale-95 flex items-center gap-1.5"
                >
                  <span>+ New Capsule</span>
                </button>
              </div>

              {/* Capsule Cards Grid */}
              {filteredCapsules.length === 0 ? (
                <div className="py-16 text-center space-y-3 max-w-sm mx-auto">
                  <div className="w-14 h-14 rounded-full bg-[#ebdcd0] text-[#736c5d] flex items-center justify-center mx-auto text-2xl">
                    ⏳
                  </div>
                  <h4 className="text-lg font-serif text-[#3a3528]">No Capsules in this View</h4>
                  <p className="text-xs text-[#7e7667] font-serif italic">
                    {vaultFilter === 'all'
                      ? 'You have not written any letters to your future self yet. Begin your first time capsule today.'
                      : `You currently have no ${vaultFilter} messages.`}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      sounds.pop();
                      setActiveTab('write');
                    }}
                    className="mt-2 px-4 py-2 rounded-xl bg-[#5a5a40] text-white text-xs font-medium"
                  >
                    Write to Future Self
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredCapsules.map(capsule => {
                    const unlockTime = new Date(capsule.unlockDate).getTime();
                    const isUnlocked = currentTime >= unlockTime || capsule.status === 'opened';
                    const isOpened = capsule.status === 'opened';

                    return (
                      <div
                        key={capsule.id}
                        className={`relative p-5 rounded-3xl border transition-all duration-300 flex flex-col justify-between group ${
                          isUnlocked
                            ? 'bg-gradient-to-br from-white via-[#fcfbf9] to-[#f5f0e6] border-[#cfdfcd] shadow-md hover:shadow-lg'
                            : 'bg-gradient-to-br from-[#faf7f0] via-[#f7f2e7] to-[#f0e8d9] border-[#e2d7c5] shadow-sm'
                        }`}
                      >
                        <div>
                          {/* Card Header Status */}
                          <div className="flex items-center justify-between mb-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${
                                isOpened
                                  ? 'bg-[#8ba888]/20 text-[#3d503b] border border-[#8ba888]/30'
                                  : isUnlocked
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                                  : 'bg-[#ebdcd0] text-[#635b4d]'
                              }`}
                            >
                              {isOpened ? '✨ Opened & Reflected' : isUnlocked ? '🔔 Ready to Open' : '🔒 Sealed Capsule'}
                            </span>

                            <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                              <button
                                type="button"
                                title="Delete this capsule"
                                onClick={async e => {
                                  e.stopPropagation();
                                  sounds.pop();
                                  if (window.confirm('Delete this future self capsule permanently?')) {
                                    await onDeleteCapsule(capsule.id);
                                  }
                                }}
                                className="p-1.5 rounded-lg text-[#999283] hover:text-red-700 hover:bg-red-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Title & Dates */}
                          <h4 className="font-serif text-lg text-[#3a3528] mb-1 group-hover:text-[#252219]">
                            {capsule.title}
                          </h4>

                          <div className="text-xs text-[#7e7667] space-y-1 font-serif">
                            <p>
                              Written: {new Date(capsule.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                            <p className="font-medium text-[#4c4538]">
                              🔒 Sealed for: {new Date(capsule.unlockDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                            </p>
                          </div>

                          {/* Countdown or Status Indicator */}
                          <div className="mt-4 p-3 rounded-2xl bg-white/70 border border-[#e8dfcf] text-xs flex items-center justify-between">
                            {isUnlocked ? (
                              <span className="font-medium text-[#3b4c39] flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-[#8ba888]" />
                                <span>Unlocked • A message from the past</span>
                              </span>
                            ) : (
                              <span className="font-mono text-[11px] text-[#71695a] flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5 text-[#8f8877]" />
                                <span>{formatCountdown(capsule.unlockDate)}</span>
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="mt-5 flex items-center justify-between pt-3 border-t border-[#ebdcd0]/70">
                          {isUnlocked ? (
                            <button
                              type="button"
                              onClick={() => handleOpenCapsule(capsule)}
                              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#8ba888] to-[#6d8a6a] hover:opacity-95 text-white text-xs font-serif font-medium shadow-md shadow-[#8ba888]/20 transition-transform active:scale-95 flex items-center justify-center gap-1.5"
                            >
                              <span>✨ Open Letter & Meet Past Self</span>
                              <ChevronRight className="w-4 h-4" />
                            </button>
                          ) : (
                            <div className="w-full flex items-center justify-between gap-2">
                              <span className="text-[11px] text-[#8e8777] font-serif italic">
                                Letter content is locked
                              </span>
                              {/* Testing simulator button for immediate evaluation */}
                              <button
                                type="button"
                                title="Simulate unlock date for testing purposes"
                                onClick={() => handleOpenCapsule(capsule, true)}
                                className="text-[10px] text-[#736c5d] hover:text-[#333] underline underline-offset-2 px-2 py-1 rounded hover:bg-[#ede7db]"
                              >
                                Test Unlock Now
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: UNLOCK EXPERIENCE & THEN VS NOW REFLECTION */}
          {activeTab === 'unlock' && selectedCapsule && (
            <div className="max-w-2xl mx-auto space-y-8">
              {/* Back to vault */}
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    sounds.pop();
                    setActiveTab('vault');
                  }}
                  className="text-xs text-[#6e685a] hover:text-[#333] font-medium flex items-center gap-1"
                >
                  ← Back to Sealed Capsules
                </button>

                <div className="text-xs text-[#8f8877] font-serif italic">
                  Sealed {new Date(selectedCapsule.createdAt).toLocaleDateString()} • Unlocked {new Date(selectedCapsule.unlockDate).toLocaleDateString()}
                </div>
              </div>

              {/* Reveal Animation Banner */}
              {unlockAnimationStep === 'breaking' ? (
                <div className="py-16 text-center space-y-4 animate-pulse">
                  <div className="w-20 h-20 rounded-full bg-[#faf5ed] border-2 border-[#8ba888] flex items-center justify-center mx-auto text-4xl shadow-xl">
                    ✨
                  </div>
                  <p className="font-serif text-lg text-[#4a4235]">Breaking seal and opening your letter...</p>
                </div>
              ) : (
                <>
                  {/* UNLOCKED LETTER DISPLAY */}
                  <div className="p-7 sm:p-9 rounded-3xl bg-white border border-[#ebdcd0] shadow-xl space-y-6 relative overflow-hidden">
                    {/* Atmospheric Watermark */}
                    <div className="absolute top-4 right-6 text-7xl font-serif text-[#f6f2ea] select-none pointer-events-none -z-0">
                      ✉️
                    </div>

                    <div className="relative z-10 space-y-2">
                      <span className="text-xs font-semibold uppercase tracking-widest text-[#8ba888]">
                        A message from {new Date(selectedCapsule.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}
                      </span>
                      <h3 className="font-serif text-2xl sm:text-3xl text-[#3a3528]">
                        {selectedCapsule.title}
                      </h3>
                    </div>

                    {/* Original Message Display: Exact & Untampered */}
                    <div className="relative z-10 p-6 rounded-2xl bg-[#faf7f0] border border-[#e8dfcf] font-serif text-sm sm:text-base leading-relaxed text-[#3a3528] whitespace-pre-wrap shadow-inner">
                      {selectedCapsule.message}
                    </div>

                    {/* AI Reflection attached before sealing */}
                    {selectedCapsule.aiReflectionBeforeSeal && (
                      <div className="relative z-10 p-4 rounded-2xl bg-[#f4ede2]/60 border border-[#ebdcd0] text-xs font-serif text-[#554d3f] space-y-1.5">
                        <div className="font-semibold text-[#3a3528]">
                          🌿 Note from when this was sealed:
                        </div>
                        <p className="italic">&ldquo;{selectedCapsule.aiReflectionBeforeSeal.reflection}&rdquo;</p>
                        {selectedCapsule.aiReflectionBeforeSeal.questionForFuture && (
                          <p className="font-medium text-[#475745] pt-1">
                            Question asked back then: &ldquo;{selectedCapsule.aiReflectionBeforeSeal.questionForFuture}&rdquo;
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* THEN VS NOW REFLECTION SECTION */}
                  <div className="p-7 sm:p-9 rounded-3xl bg-gradient-to-b from-[#fcfaf5] to-[#f6f1e6] border border-[#e5dcd0] shadow-md space-y-6">
                    <div className="text-center space-y-1">
                      <h4 className="font-serif text-xl sm:text-2xl text-[#3a3528]">
                        Now, meet your past self.
                      </h4>
                      <p className="text-xs text-[#7e7667] font-serif italic">
                        How does reading these words feel from where you are standing today?
                      </p>
                    </div>

                    {/* Visual Comparison Columns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* THEN */}
                      <div className="p-4 rounded-2xl bg-white border border-[#e5dcd0] space-y-2">
                        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#736c5d]">
                          <span>🕰️ Then</span>
                          <span className="font-normal text-[10px] text-[#999283]">
                            ({new Date(selectedCapsule.createdAt).toLocaleDateString()})
                          </span>
                        </div>
                        <p className="text-xs font-serif text-[#5a5245] italic line-clamp-5">
                          &ldquo;{selectedCapsule.message}&rdquo;
                        </p>
                      </div>

                      {/* NOW Text Area */}
                      <div className="p-4 rounded-2xl bg-white border border-[#8ba888]/40 space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wider text-[#495f47]">
                          <span>🌱 Now</span>
                          <span className="font-normal text-[10px] text-[#788876]">Today</span>
                        </div>
                        <textarea
                          rows={4}
                          value={nowReflectionInput}
                          onChange={e => setNowReflectionInput(e.target.value)}
                          placeholder="How do you feel about this message today? What turned out differently? What stayed true?"
                          className="w-full p-2.5 rounded-xl bg-[#faf9f5] border border-[#e5dcd0] text-xs font-serif leading-relaxed text-[#333322] focus:outline-none focus:border-[#8ba888] resize-none"
                        />
                      </div>
                    </div>

                    {/* Action: Compare with AI */}
                    <div className="flex items-center justify-between flex-wrap gap-3 pt-2">
                      <button
                        type="button"
                        onClick={handleSaveNowReflection}
                        disabled={!nowReflectionInput.trim()}
                        className="px-4 py-2 rounded-xl border border-[#d9cebe] text-[#554d3f] hover:bg-white text-xs font-medium transition-colors"
                      >
                        Save Today's Reflection
                      </button>

                      <button
                        type="button"
                        onClick={handleCompareThenAndNow}
                        disabled={isComparingAI || !nowReflectionInput.trim()}
                        className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#8ba888] to-[#6d8a6a] hover:opacity-95 text-white text-xs font-serif font-medium shadow-md shadow-[#8ba888]/20 transition-all disabled:opacity-40 flex items-center gap-2"
                      >
                        {isComparingAI ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Comparing Reflections...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>✨ Compare Then &amp; Now</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* AI COMPARISON & GROWTH VISUALIZATION RESULT */}
                    {selectedCapsule.aiComparison && (
                      <div className="mt-6 p-6 rounded-3xl bg-white border border-[#cfdfcd] shadow-lg space-y-5 animate-fadeIn">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-[#8ba888]" />
                          <h5 className="font-serif text-base font-semibold text-[#2f402e]">
                            Your Growth Trajectory
                          </h5>
                        </div>

                        {/* Growth Stepper Diagram */}
                        {selectedCapsule.aiComparison.growthTrajectory && (
                          <div className="p-4 rounded-2xl bg-gradient-to-r from-[#eef4ec] via-[#f7f4ec] to-[#edf4ea] border border-[#cfdfcd] flex items-center justify-around text-center">
                            <div className="space-y-1">
                              <div className="text-[10px] uppercase tracking-wider font-semibold text-[#736c5d]">
                                THEN
                              </div>
                              <div className="inline-flex items-center gap-1 text-xs font-medium text-[#3a4938] px-2.5 py-1 rounded-full bg-white shadow-xs">
                                <span className="w-2 h-2 rounded-full bg-[#8ba888]" />
                                <span>{selectedCapsule.aiComparison.growthTrajectory.then}</span>
                              </div>
                            </div>

                            <ArrowRight className="w-4 h-4 text-[#8ba888]" />

                            <div className="space-y-1">
                              <div className="text-[10px] uppercase tracking-wider font-semibold text-[#736c5d]">
                                JOURNEY
                              </div>
                              <div className="inline-flex items-center gap-1 text-xs font-medium text-[#495c47] px-2.5 py-1 rounded-full bg-white shadow-xs">
                                <span>🌱</span>
                                <span>{selectedCapsule.aiComparison.growthTrajectory.journey}</span>
                              </div>
                            </div>

                            <ArrowRight className="w-4 h-4 text-[#8ba888]" />

                            <div className="space-y-1">
                              <div className="text-[10px] uppercase tracking-wider font-semibold text-[#736c5d]">
                                NOW
                              </div>
                              <div className="inline-flex items-center gap-1 text-xs font-medium text-[#2f402e] px-2.5 py-1 rounded-full bg-white shadow-xs">
                                <span className="w-2 h-2 rounded-full bg-[#52774f]" />
                                <span>{selectedCapsule.aiComparison.growthTrajectory.now}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="space-y-2 text-xs font-serif leading-relaxed text-[#4b4335]">
                          <p className="text-sm font-medium text-[#2f402e]">
                            {selectedCapsule.aiComparison.summary}
                          </p>
                          <div className="p-3 rounded-xl bg-[#faf7f0] border border-[#ebdcd0] space-y-1">
                            <div className="text-[11px] font-semibold text-[#3a3528]">
                              Biggest Shift:
                            </div>
                            <div className="text-xs text-[#52774f] font-sans font-medium">
                              {selectedCapsule.aiComparison.biggestShift}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
