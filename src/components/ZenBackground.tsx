import React, { useEffect, useState, useMemo } from 'react';
import { sounds } from '../lib/soundEffects';

interface ZenBackgroundProps {
  variant?: 'full' | 'subtle' | 'landing';
  showInteractiveRipples?: boolean;
}

interface FloatingParticle {
  id: number;
  x: number; // percentage
  y: number; // percentage
  size: number; // px
  duration: number; // seconds
  delay: number; // seconds
  type: 'leaf' | 'seed' | 'zen-circle' | 'sparkle';
  opacity: number;
  rotation: number;
}

interface ClickRipple {
  id: number;
  x: number;
  y: number;
}

export const ZenBackground: React.FC<ZenBackgroundProps> = ({
  variant = 'full',
  showInteractiveRipples = true,
}) => {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [ripples, setRipples] = useState<ClickRipple[]>([]);

  // Parallax tracking with low-frequency update
  useEffect(() => {
    let animationFrameId: number;
    const handleMouseMove = (e: MouseEvent) => {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = requestAnimationFrame(() => {
        // Normalized coordinates from -1 to 1
        const nx = (e.clientX / window.innerWidth - 0.5) * 2;
        const ny = (e.clientY / window.innerHeight - 0.5) * 2;
        setMousePos({ x: nx, y: ny });
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  // Handle ambient click ripples
  useEffect(() => {
    if (!showInteractiveRipples) return;

    const handleClick = (e: MouseEvent) => {
      // Don't trigger if clicked inside buttons, inputs or modals
      const target = e.target as HTMLElement;
      if (
        target.closest('button') ||
        target.closest('input') ||
        target.closest('textarea') ||
        target.closest('[role="dialog"]')
      ) {
        return;
      }

      const newRipple = {
        id: Date.now() + Math.random(),
        x: e.clientX,
        y: e.clientY,
      };

      sounds.bubblePop();
      setRipples(prev => [...prev.slice(-4), newRipple]);

      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== newRipple.id));
      }, 2400);
    };

    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [showInteractiveRipples]);

  // Deterministic floating botanical particles
  const particles: FloatingParticle[] = useMemo(() => {
    const count = variant === 'subtle' ? 8 : 14;
    const items: FloatingParticle[] = [];
    const types: FloatingParticle['type'][] = ['leaf', 'seed', 'zen-circle', 'sparkle'];

    for (let i = 0; i < count; i++) {
      items.push({
        id: i,
        x: 5 + ((i * 7 + 13) % 90),
        y: 10 + ((i * 11 + 17) % 80),
        size: 16 + ((i * 5) % 24),
        duration: 16 + ((i * 3) % 14),
        delay: ((i * 2.5) % 8),
        type: types[i % types.length],
        opacity: 0.18 + ((i % 4) * 0.06),
        rotation: (i * 37) % 360,
      });
    }
    return items;
  }, [variant]);

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden select-none z-0"
    >
      {/* 1. Ambient Warm Organic Light Gradients */}
      <div
        className="absolute w-[520px] h-[520px] rounded-full bg-[#ede6d8]/40 blur-3xl -top-24 -left-24 transition-transform duration-1000 ease-out will-change-transform"
        style={{
          transform: `translate3d(${mousePos.x * 24}px, ${mousePos.y * 24}px, 0)`,
        }}
      />
      <div
        className="absolute w-[600px] h-[600px] rounded-full bg-[#e3eae0]/35 blur-3xl -bottom-32 -right-32 transition-transform duration-1000 ease-out will-change-transform"
        style={{
          transform: `translate3d(${mousePos.x * -28}px, ${mousePos.y * -28}px, 0)`,
        }}
      />
      <div
        className="absolute w-[440px] h-[440px] rounded-full bg-[#f0ebd9]/30 blur-2xl top-1/3 right-1/4 transition-transform duration-700 ease-out will-change-transform"
        style={{
          transform: `translate3d(${mousePos.x * 16}px, ${mousePos.y * -16}px, 0)`,
        }}
      />

      {/* 2. Delicate Topographic Zen Contour Lines */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.04] text-[#4a4a35]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <pattern id="zen-grid-pattern" width="80" height="80" patternUnits="userSpaceOnUse">
            <circle cx="40" cy="40" r="1.2" fill="currentColor" />
            <path
              d="M0 40 Q20 30 40 40 T80 40"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.6"
              strokeDasharray="3 4"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#zen-grid-pattern)" />
      </svg>

      {/* 3. Concentric Zen Rings (Calm Pond Ripples) in Corners */}
      <div
        className="absolute -top-16 -right-16 opacity-30 transition-transform duration-1000 ease-out"
        style={{
          transform: `translate3d(${mousePos.x * -12}px, ${mousePos.y * -12}px, 0)`,
        }}
      >
        <div className="relative w-80 h-80 flex items-center justify-center">
          <div className="absolute w-72 h-72 rounded-full border border-[#c8c2b4]/40 animate-[spin_120s_linear_infinite]" />
          <div className="absolute w-56 h-56 rounded-full border border-dashed border-[#b5ae9f]/40 animate-[spin_80s_linear_infinite_reverse]" />
          <div className="absolute w-40 h-40 rounded-full border border-[#c8c2b4]/30" />
          <div className="absolute w-24 h-24 rounded-full border border-dotted border-[#8ba888]/40" />
        </div>
      </div>

      <div
        className="absolute -bottom-20 -left-20 opacity-25 transition-transform duration-1000 ease-out"
        style={{
          transform: `translate3d(${mousePos.x * 15}px, ${mousePos.y * 15}px, 0)`,
        }}
      >
        <div className="relative w-96 h-96 flex items-center justify-center">
          <div className="absolute w-88 h-88 rounded-full border border-[#d2ccc0]/35 animate-[spin_160s_linear_infinite]" />
          <div className="absolute w-64 h-64 rounded-full border border-dashed border-[#c2bba8]/35" />
          <div className="absolute w-44 h-44 rounded-full border border-[#8ba888]/30 animate-[spin_90s_linear_infinite_reverse]" />
        </div>
      </div>

      {/* 4. Floating Botanical & Zen Elements */}
      {particles.map(p => {
        const parallaxFactor = (p.id % 3 + 1) * 8;
        const offsetX = mousePos.x * parallaxFactor;
        const offsetY = mousePos.y * parallaxFactor;

        return (
          <div
            key={p.id}
            className="absolute will-change-transform"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              opacity: p.opacity,
              transform: `translate3d(${offsetX}px, ${offsetY}px, 0)`,
              transition: 'transform 0.4s ease-out',
            }}
          >
            <div
              className="animate-zen-float"
              style={{
                animationDuration: `${p.duration}s`,
                animationDelay: `${p.delay}s`,
              }}
            >
              {p.type === 'leaf' && (
                <svg
                  width={p.size}
                  height={p.size * 1.4}
                  viewBox="0 0 24 34"
                  fill="none"
                  className="text-[#6b7556]"
                  style={{ transform: `rotate(${p.rotation}deg)` }}
                >
                  <path
                    d="M12 2C12 2 21 10 21 21C21 27.5 16 32 12 32C8 32 3 27.5 3 21C3 10 12 2 12 2Z"
                    fill="currentColor"
                    fillOpacity="0.3"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeOpacity="0.6"
                  />
                  <path
                    d="M12 6V29M12 12L17 16M12 18L7 22M12 20L16 23"
                    stroke="currentColor"
                    strokeWidth="0.8"
                    strokeOpacity="0.7"
                    strokeLinecap="round"
                  />
                </svg>
              )}

              {p.type === 'seed' && (
                <svg
                  width={p.size * 0.9}
                  height={p.size * 0.9}
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-[#8c7b64]"
                  style={{ transform: `rotate(${p.rotation}deg)` }}
                >
                  <ellipse
                    cx="12"
                    cy="12"
                    rx="6"
                    ry="9"
                    transform="rotate(30 12 12)"
                    fill="currentColor"
                    fillOpacity="0.25"
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeOpacity="0.5"
                  />
                  <path
                    d="M12 4C12 4 11 8 9 12M12 4C12 4 13 8 15 12"
                    stroke="currentColor"
                    strokeWidth="0.7"
                    strokeOpacity="0.6"
                    strokeLinecap="round"
                  />
                </svg>
              )}

              {p.type === 'zen-circle' && (
                <div
                  className="rounded-full border border-[#8a8670]/40 flex items-center justify-center p-1"
                  style={{
                    width: `${p.size}px`,
                    height: `${p.size}px`,
                  }}
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-[#5a5a40]/40" />
                </div>
              )}

              {p.type === 'sparkle' && (
                <svg
                  width={p.size * 0.7}
                  height={p.size * 0.7}
                  viewBox="0 0 24 24"
                  fill="none"
                  className="text-[#8ba888]"
                  style={{ transform: `rotate(${p.rotation}deg)` }}
                >
                  <path
                    d="M12 2L13.8 8.8L20.6 10.6L13.8 12.4L12 19.2L10.2 12.4L3.4 10.6L10.2 8.8L12 2Z"
                    fill="currentColor"
                    fillOpacity="0.4"
                    stroke="currentColor"
                    strokeWidth="0.8"
                    strokeOpacity="0.6"
                  />
                </svg>
              )}
            </div>
          </div>
        );
      })}

      {/* 5. Interactive Calming Water Click Ripples */}
      {ripples.map(r => (
        <div
          key={r.id}
          className="absolute rounded-full pointer-events-none -translate-x-1/2 -translate-y-1/2 animate-zen-ripple border border-[#5a5a40]/30"
          style={{
            left: `${r.x}px`,
            top: `${r.y}px`,
          }}
        />
      ))}
    </div>
  );
};
