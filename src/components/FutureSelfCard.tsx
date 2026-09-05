import React from 'react';
import { Sparkles, Lock, ArrowRight } from 'lucide-react';
import { sounds } from '../lib/soundEffects';

interface FutureSelfCardProps {
  onOpen: () => void;
  sealedCount?: number;
  readyToOpenCount?: number;
  variant?: 'banner' | 'compact' | 'sidebar';
}

export const FutureSelfCard: React.FC<FutureSelfCardProps> = ({
  onOpen,
  sealedCount = 0,
  readyToOpenCount = 0,
  variant = 'banner',
}) => {
  const handleClick = () => {
    sounds.bubblePop();
    onOpen();
  };

  if (variant === 'sidebar') {
    return (
      <button
        type="button"
        id="sidebar-future-self-btn"
        onClick={handleClick}
        className="w-full text-left p-3 rounded-2xl bg-gradient-to-br from-[#f8f5ee] via-[#f4eee2] to-[#eee4d4] border border-[#e2d6c5] hover:border-[#8ba888]/60 transition-all duration-300 shadow-sm hover:shadow-md group relative overflow-hidden"
      >
        {/* Ambient Glow */}
        <div className="absolute -top-6 -right-6 w-16 h-16 bg-gradient-to-br from-[#8ba888]/20 to-[#d4bca4]/30 rounded-full blur-xl pointer-events-none group-hover:scale-125 transition-transform" />

        <div className="flex items-center gap-3 relative z-10">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#5a5a40] to-[#788464] text-white flex items-center justify-center text-base shadow-sm shadow-[#5a5a40]/20 group-hover:scale-105 transition-transform">
            🔮
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between">
              <span className="font-serif text-xs font-semibold text-[#3a3528] truncate">
                Future Self Vault
              </span>
              {readyToOpenCount > 0 ? (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-200 text-amber-900 text-[10px] font-bold animate-pulse">
                  {readyToOpenCount} ready
                </span>
              ) : sealedCount > 0 ? (
                <span className="px-1.5 py-0.5 rounded-full bg-[#e5dbcc] text-[#635b4c] text-[10px] font-medium">
                  {sealedCount} sealed
                </span>
              ) : null}
            </div>
            <p className="text-[11px] text-[#7d7566] font-serif italic truncate">
              Write a letter to future you
            </p>
          </div>
        </div>
      </button>
    );
  }

  // Full Banner Variant (for top of Dashboard / Chat / Empty State)
  return (
    <div
      onClick={handleClick}
      className="cursor-pointer relative p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-[#fbf8f2] via-[#f7f2e7] to-[#ede3d3] border border-[#e5dcd0] shadow-sm hover:shadow-lg transition-all duration-300 group overflow-hidden"
    >
      {/* Soft Ethereal Gradient Aura Behind Card */}
      <div className="absolute -top-12 -right-12 w-44 h-44 bg-gradient-to-bl from-[#8ba888]/25 via-[#e2c7b3]/20 to-transparent rounded-full blur-2xl pointer-events-none group-hover:scale-110 transition-transform duration-500" />
      <div className="absolute -bottom-8 -left-8 w-36 h-36 bg-gradient-to-tr from-[#ebd5c1]/20 to-transparent rounded-full blur-xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#5a5a40] via-[#6e775a] to-[#8ba888] text-white flex items-center justify-center text-2xl shadow-md shadow-[#5a5a40]/20 shrink-0 group-hover:rotate-6 transition-transform duration-300">
            🔮
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-serif text-lg sm:text-xl text-[#3a3528] tracking-tight group-hover:text-[#252219]">
                Message to My Future Self
              </h3>
              <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/80 border border-[#e2d7c7] text-[11px] text-[#554d3f] font-sans font-medium">
                <Lock className="w-3 h-3 text-[#7b7465]" />
                <span>Time Capsule</span>
              </span>
            </div>
            <p className="text-xs sm:text-sm text-[#706859] font-serif italic">
              &ldquo;Write something today that your future self should remember.&rdquo;
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
          {readyToOpenCount > 0 ? (
            <span className="px-3 py-1.5 rounded-xl bg-amber-100 border border-amber-300 text-amber-900 text-xs font-serif font-medium animate-pulse flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-700" />
              <span>{readyToOpenCount} Ready to Open</span>
            </span>
          ) : sealedCount > 0 ? (
            <span className="text-xs text-[#756d5e] font-serif italic hidden md:inline">
              {sealedCount} sealed {sealedCount === 1 ? 'letter' : 'letters'}
            </span>
          ) : null}

          <div className="px-4 py-2 rounded-xl bg-[#5a5a40] group-hover:bg-[#4a4a35] text-white text-xs font-medium shadow-sm transition-transform group-hover:translate-x-1 flex items-center gap-1.5">
            <span>Open Vault</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </div>
    </div>
  );
};
