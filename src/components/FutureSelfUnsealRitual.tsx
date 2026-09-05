import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Clock, Calendar, Check, ArrowRight } from 'lucide-react';
import { FutureCapsule } from '../types';
import { sounds } from '../lib/soundEffects';

interface FutureSelfUnsealRitualProps {
  capsule: FutureCapsule;
  onComplete: () => void;
  onSkip?: () => void;
}

type RitualStage = 'sealed' | 'unsealing' | 'flap-opening' | 'letter-sliding' | 'unfolding' | 'revealed';

export const FutureSelfUnsealRitual: React.FC<FutureSelfUnsealRitualProps> = ({
  capsule,
  onComplete,
  onSkip,
}) => {
  const [stage, setStage] = useState<RitualStage>('sealed');

  // Format dates
  const formattedCreatedAt = new Date(capsule.createdAt).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const formattedUnlockDate = new Date(capsule.unlockDate).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Calculate time elapsed
  const daysElapsed = Math.max(
    1,
    Math.round(
      (new Date(capsule.unlockDate).getTime() - new Date(capsule.createdAt).getTime()) /
        (1000 * 60 * 60 * 24)
    )
  );

  // Split message into readable paragraphs for staggered reveal
  const paragraphs = capsule.message.split('\n').filter(p => p.trim().length > 0);

  // Orchestrate the cinematic unseal timeline (~2.2 seconds total)
  useEffect(() => {
    // 0.0s: Envelope begins in sealed state, gentle ambient warmth
    // 0.35s: Wax seal begins cracking / releasing
    const timer1 = setTimeout(() => {
      setStage('unsealing');
      sounds.unsealWax();
    }, 400);

    // 0.85s: Top flap swings open with 3D perspective
    const timer2 = setTimeout(() => {
      setStage('flap-opening');
      sounds.foldSwoosh();
    }, 850);

    // 1.3s: Letter slides out of pocket
    const timer3 = setTimeout(() => {
      setStage('letter-sliding');
    }, 1250);

    // 1.65s: Letter unfolds outwards and flattens
    const timer4 = setTimeout(() => {
      setStage('unfolding');
      sounds.unfoldPaper();
      sounds.sparkle();
    }, 1650);

    // 2.3s: Settle into fully revealed stable state
    const timer5 = setTimeout(() => {
      setStage('revealed');
      sounds.chime();
      onComplete();
    }, 2350);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timer4);
      clearTimeout(timer5);
    };
  }, [onComplete]);

  const handleSkip = () => {
    sounds.bubblePop();
    setStage('revealed');
    if (onSkip) onSkip();
    else onComplete();
  };

  return (
    <div className="relative w-full min-h-[540px] flex flex-col items-center justify-center p-4 sm:p-8 overflow-hidden select-none">
      {/* Soft Vignette & Radiant Golden Ambient Glow */}
      <div className="absolute inset-0 bg-radial from-[#fbf8f2]/90 via-[#f5ede0]/80 to-[#ece2d0]/90 pointer-events-none rounded-3xl" />
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-tr from-[#d4a359]/15 via-[#8ba888]/15 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Floating Starlight Motes */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            initial={{
              x: `${(i * 19 + 7) % 100}%`,
              y: '105%',
              opacity: 0,
              scale: 0.4,
            }}
            animate={{
              y: '-10%',
              opacity: [0, 0.7, 0.8, 0],
              scale: [0.4, 1, 0.8, 0.4],
            }}
            transition={{
              duration: 3 + (i % 3) * 1.2,
              repeat: Infinity,
              delay: (i * 0.25) % 2,
              ease: 'easeInOut',
            }}
            className="absolute w-1.5 h-1.5 rounded-full bg-[#d4a359]/40 blur-[0.5px]"
          />
        ))}
      </div>

      {/* Top Header Navigation & Status Bar */}
      <div className="relative z-30 w-full max-w-xl flex items-center justify-between mb-6 px-2">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[#8ba888] animate-ping" />
          <span className="font-serif italic text-xs sm:text-sm text-[#736856] tracking-wide">
            {stage === 'sealed' && 'Preparing to open your capsule...'}
            {stage === 'unsealing' && 'Breaking the seal of time...'}
            {stage === 'flap-opening' && 'Opening envelope...'}
            {stage === 'letter-sliding' && 'Drawing out your words...'}
            {(stage === 'unfolding' || stage === 'revealed') && `Unfolded from ${formattedCreatedAt}`}
          </span>
        </div>

        <button
          type="button"
          onClick={handleSkip}
          className="text-xs font-serif text-[#8c8270] hover:text-[#3a3528] px-2.5 py-1 rounded-lg hover:bg-white/60 transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span>Skip to letter</span>
          <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Main 3D Stage with Perspective */}
      <div
        className="relative z-20 w-full max-w-lg min-h-[420px] flex items-center justify-center"
        style={{ perspective: '1200px' }}
      >
        {/* ENVELOPE CONTAINER */}
        <motion.div
          className="relative w-full max-w-[420px] h-[260px]"
          animate={{
            scale: stage === 'unfolding' || stage === 'revealed' ? 0.96 : 1,
            y: stage === 'unfolding' || stage === 'revealed' ? 40 : 0,
            opacity: stage === 'unfolding' || stage === 'revealed' ? 0.18 : 1,
          }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        >
          {/* Envelope Back Plate (Base Paper) */}
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#f8f4ec] via-[#f2ece0] to-[#e6dccb] border border-[#d8ccb8] shadow-2xl overflow-hidden">
            {/* Vintage Postmark Stamp (Top Right) */}
            <div className="absolute top-3 right-4 select-none pointer-events-none opacity-65 flex items-center gap-2">
              <div className="w-14 h-14 rounded-full border-2 border-dashed border-[#8ba888]/60 flex flex-col items-center justify-center text-[8px] font-mono uppercase text-[#5a6a57] rotate-12 leading-tight">
                <span className="font-bold">LOOM</span>
                <span>TIME VAULT</span>
                <span className="text-[7px] text-[#71826f]">{capsule.createdAt.split('T')[0]}</span>
              </div>
            </div>

            {/* Subtle Postal Airmail Accent Marks on Edge */}
            <div className="absolute top-0 left-0 right-0 h-1.5 bg-repeating-linear-gradient-45 from-[#8ba888]/40 via-[#8ba888]/40 8px, transparent 8px, transparent 16px, from-[#c27d72]/40 via-[#c27d72]/40 24px" />

            {/* Pocket Interior Depth (Behind the letter) */}
            <div className="absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-[#ded0bd] via-[#e8dcce] to-[#f4ebe0] rounded-b-2xl shadow-inner" />
          </div>

          {/* THE LETTER (Tucked inside pocket, then slides up and expands) */}
          <motion.div
            className="absolute left-4 right-4 bg-white border border-[#ebdcd0] rounded-xl shadow-xl overflow-hidden"
            initial={{
              top: '40px',
              height: '190px',
              y: 0,
              scale: 0.94,
              opacity: 0.95,
            }}
            animate={{
              y:
                stage === 'letter-sliding'
                  ? -100
                  : stage === 'unfolding' || stage === 'revealed'
                  ? -140
                  : 0,
              scale: stage === 'unfolding' || stage === 'revealed' ? 1.05 : 0.94,
              opacity: 1,
            }}
            transition={{ duration: 0.75, ease: [0.16, 1, 0.3, 1] }}
            style={{ zIndex: 15 }}
          >
            {/* Paper Header Preview */}
            <div className="p-4 bg-[#faf7f0] border-b border-[#eee3d5] flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11px] font-serif text-[#786f5f]">
                <Calendar className="w-3 h-3 text-[#8ba888]" />
                <span>Written on {formattedCreatedAt}</span>
              </div>
              <span className="text-[10px] font-sans font-medium px-2 py-0.5 rounded-full bg-[#8ba888]/20 text-[#3f543d]">
                {daysElapsed} days vaulted
              </span>
            </div>

            {/* Fold Crease Shadow Lines (mimicking physical trifold paper) */}
            <div className="p-5 font-serif space-y-2 text-[#3a3528] relative">
              <h4 className="font-semibold text-sm text-[#2b271e] truncate">{capsule.title}</h4>
              <p className="text-xs italic text-[#635b4c] line-clamp-3 leading-relaxed">
                &ldquo;{capsule.message}&rdquo;
              </p>

              {/* Dynamic fold crease overlay */}
              <motion.div
                className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-4 bg-gradient-to-b from-black/5 via-transparent to-black/5 pointer-events-none"
                animate={{
                  opacity: stage === 'unfolding' || stage === 'revealed' ? 0 : 0.35,
                }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </motion.div>

          {/* FRONT ENVELOPE POCKET FLAPS (SVG Layer sitting in front of letter) */}
          <div className="absolute inset-x-0 bottom-0 h-44 pointer-events-none" style={{ zIndex: 20 }}>
            <svg
              className="w-full h-full drop-shadow-sm"
              viewBox="0 0 420 176"
              preserveAspectRatio="none"
              fill="none"
            >
              {/* Left Triangular Flap */}
              <path
                d="M0,0 L180,120 L0,176 Z"
                fill="url(#leftFlapGradient)"
                stroke="#ded2bf"
                strokeWidth="1"
              />
              {/* Right Triangular Flap */}
              <path
                d="M420,0 L240,120 L420,176 Z"
                fill="url(#rightFlapGradient)"
                stroke="#ded2bf"
                strokeWidth="1"
              />
              {/* Bottom Triangular Flap */}
              <path
                d="M0,176 L210,76 L420,176 Z"
                fill="url(#bottomFlapGradient)"
                stroke="#ded2bf"
                strokeWidth="1"
              />

              <defs>
                <linearGradient id="leftFlapGradient" x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="#f5efe4" />
                  <stop offset="100%" stopColor="#ebe1d1" />
                </linearGradient>
                <linearGradient id="rightFlapGradient" x1="1" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f3ecdf" />
                  <stop offset="100%" stopColor="#e9dfce" />
                </linearGradient>
                <linearGradient id="bottomFlapGradient" x1="0.5" y1="0" x2="0.5" y2="1">
                  <stop offset="0%" stopColor="#faf5eb" />
                  <stop offset="100%" stopColor="#ede3d3" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* TOP ENVELOPE FLAP (Triangular Fold that swings open in 3D) */}
          <motion.div
            className="absolute inset-x-0 top-0 h-[140px]"
            style={{
              transformOrigin: 'top center',
              zIndex: 25,
            }}
            initial={{ rotateX: 0 }}
            animate={{
              rotateX:
                stage === 'flap-opening' ||
                stage === 'letter-sliding' ||
                stage === 'unfolding' ||
                stage === 'revealed'
                  ? 180
                  : 0,
            }}
            transition={{
              duration: 0.65,
              ease: [0.25, 1, 0.5, 1],
            }}
          >
            <svg
              className="w-full h-full drop-shadow-md"
              viewBox="0 0 420 140"
              preserveAspectRatio="none"
              fill="none"
            >
              <path
                d="M0,0 L210,138 L420,0 Z"
                fill="url(#topFlapGradient)"
                stroke="#ded2bf"
                strokeWidth="1"
              />
              <defs>
                <linearGradient id="topFlapGradient" x1="0.5" y1="0" x2="0.5" y2="1">
                  <stop offset="0%" stopColor="#f8f3ea" />
                  <stop offset="100%" stopColor="#eae0cf" />
                </linearGradient>
              </defs>
            </svg>
          </motion.div>

          {/* CRIMSON WAX SEAL & GOLDEN EMBLEM */}
          <AnimatePresence>
            {stage === 'sealed' || stage === 'unsealing' ? (
              <motion.div
                className="absolute top-[116px] left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                style={{ zIndex: 30 }}
                initial={{ scale: 1, opacity: 1 }}
                animate={{
                  scale: stage === 'unsealing' ? [1, 1.15, 1.25] : 1,
                  opacity: stage === 'unsealing' ? [1, 0.9, 0] : 1,
                }}
                exit={{ scale: 1.3, opacity: 0 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
              >
                {/* Radiant Golden Glow */}
                <div className="absolute inset-0 rounded-full bg-amber-400/35 blur-md animate-pulse" />

                {/* Wax Seal Body */}
                <div className="relative w-14 h-14 rounded-full bg-gradient-to-tr from-[#701c15] via-[#94271e] to-[#b33a2f] border-2 border-[#59140f] shadow-xl flex items-center justify-center">
                  {/* Organic uneven wax rim */}
                  <div className="absolute inset-1 rounded-full border border-red-300/30" />
                  {/* Stamped Knot Monogram */}
                  <span className="text-xl select-none filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]">
                    🧶
                  </span>
                </div>

                {/* Wax crack line sparkles upon unsealing */}
                {stage === 'unsealing' && (
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [0, 1.4, 2], opacity: [0, 1, 0] }}
                    transition={{ duration: 0.4 }}
                    className="absolute inset-0 flex items-center justify-center pointer-events-none"
                  >
                    <Sparkles className="w-10 h-10 text-amber-300 animate-spin" />
                  </motion.div>
                )}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>

        {/* FULL UNFOLDED LETTER (Settles into clean, high-clarity focal view) */}
        <AnimatePresence>
          {(stage === 'unfolding' || stage === 'revealed') && (
            <motion.div
              className="absolute inset-0 w-full max-w-xl mx-auto rounded-3xl bg-white border border-[#ebdcd0] shadow-2xl p-6 sm:p-9 flex flex-col justify-between overflow-hidden"
              style={{ zIndex: 40 }}
              initial={{
                opacity: 0,
                scale: 0.9,
                y: 50,
                filter: 'blur(6px)',
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
                filter: 'blur(0px)',
              }}
              transition={{
                duration: 0.7,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              {/* Paper Watermark */}
              <div className="absolute top-4 right-6 text-7xl font-serif text-[#fbf8f2] select-none pointer-events-none -z-0">
                ✉️
              </div>

              {/* Letter Header */}
              <motion.div
                className="space-y-1.5 relative z-10 border-b border-[#f0e7dc] pb-4"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15, duration: 0.4 }}
              >
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-semibold uppercase tracking-widest text-[#8ba888] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>A message from {formattedCreatedAt}</span>
                  </span>
                  <span className="text-[11px] font-serif italic text-[#8c8270]">
                    Sealed for {daysElapsed} days
                  </span>
                </div>

                <h3 className="font-serif text-2xl sm:text-3xl text-[#3a3528] pt-1">
                  {capsule.title}
                </h3>
              </motion.div>

              {/* Staggered Paragraph Reveal */}
              <div className="relative z-10 py-5 font-serif text-sm sm:text-base leading-relaxed text-[#3a3528] space-y-3 overflow-y-auto max-h-[220px] scrollbar-thin">
                {paragraphs.map((para, idx) => (
                  <motion.p
                    key={idx}
                    initial={{ opacity: 0, y: 8, filter: 'blur(3px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{
                      delay: 0.25 + idx * 0.1,
                      duration: 0.5,
                      ease: 'easeOut',
                    }}
                    className="whitespace-pre-wrap"
                  >
                    {para}
                  </motion.p>
                ))}
              </div>

              {/* Bottom Insight or Ready Indicator */}
              <motion.div
                className="relative z-10 pt-4 border-t border-[#f0e7dc] flex items-center justify-between"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.4 }}
              >
                <div className="flex items-center gap-2 text-xs font-serif text-[#6d8a6a]">
                  <Check className="w-4 h-4 text-[#8ba888]" />
                  <span>Unsealed and preserved in your timeline</span>
                </div>

                <div className="text-[11px] font-sans text-[#8f8877]">
                  Unlocked on {formattedUnlockDate}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Reassuring Footer Note */}
      <div className="relative z-20 text-center mt-6 text-xs text-[#8c8270] font-serif italic max-w-sm mx-auto">
        &ldquo;Reading past footsteps shows not just how much has changed, but how much you have grown.&rdquo;
      </div>
    </div>
  );
};
