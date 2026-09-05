import React from 'react';
import { Sparkles, ShieldCheck, Tag, ArrowRight, BrainCircuit, Lock, FileDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ZenBackground } from './ZenBackground';
import { sounds } from '../lib/soundEffects';

interface LandingPageProps {
  onExploreDemo?: () => void;
}

export const LandingPage: React.FC<LandingPageProps> = ({ onExploreDemo }) => {
  const { loginWithGoogle, loginAsGuest, error, clearError } = useAuth();

  const handleDemoAccess = async () => {
    sounds.bubblePop();
    try {
      await loginAsGuest();
    } catch {
      if (onExploreDemo) onExploreDemo();
    }
  };

  return (
    <div className="min-h-screen bg-[#fdfcf8] text-[#333322] flex flex-col justify-between selection:bg-[#5a5a40]/20 selection:text-[#333322] relative overflow-hidden">
      {/* Ambient Floating Elements & Zen Background */}
      <ZenBackground variant="landing" />
      {/* Top Navigation */}
      <header className="w-full border-b border-[#e5e1d8] bg-[#f5f2ed]/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-6 h-18 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-[#687250] to-[#b3c79e] flex items-center justify-center text-white text-lg shadow-sm">
              🧶
            </div>
            <div>
              <span className="font-serif text-2xl font-semibold tracking-tight text-[#4a4a35]">
                Loom
              </span>
              <span className="ml-2 text-xs font-medium px-2.5 py-0.5 rounded-full bg-[#e8e4d9] text-[#5a5a40]">
                Gemini 3.8 Flash
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              id="landing-demo-top-btn"
              type="button"
              onClick={handleDemoAccess}
              className="text-xs sm:text-sm font-medium text-[#7a7a65] hover:text-[#333322] px-3.5 py-2 rounded-xl transition-colors cursor-pointer"
            >
              Continue as Guest
            </button>
            <button
              id="landing-signin-top-btn"
              type="button"
              onClick={() => {
                sounds.bubblePop();
                loginWithGoogle();
              }}
              className="flex items-center gap-2 px-5 py-2.5 rounded-2xl text-sm font-medium bg-[#5a5a40] hover:bg-[#4a4a35] text-white shadow-md shadow-[#5a5a40]/10 transition-all active:scale-[0.98] cursor-pointer"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.344-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" />
              </svg>
              <span>Sign in with Google</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-12 sm:py-20 flex flex-col items-center justify-center text-center">
        {/* Error Alert if any */}
        {error && (
          <div
            id="auth-error-banner"
            className="w-full max-w-xl mb-8 p-4 rounded-2xl bg-[#f4e6e4] border border-[#e5b8b5] text-[#8c524e] text-sm flex items-center justify-between"
          >
            <span>{error}</span>
            <button
              onClick={clearError}
              className="ml-4 font-semibold text-xs hover:underline uppercase"
            >
              Dismiss
            </button>
          </div>
        )}

        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#e8e4d9] border border-[#e5e1d8] text-[#5a5a40] text-xs font-medium mb-6">
          <Sparkles className="w-3.5 h-3.5 text-[#5a5a40]" />
          <span>Empathetic, Grounded Socratic Dialogue</span>
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif tracking-tight text-[#3a3a2a] max-w-3xl leading-tight">
          Unpack your thoughts, find quiet clarity.
        </h1>

        <p className="mt-6 text-lg sm:text-xl text-[#6a6a55] max-w-2xl font-normal leading-relaxed font-serif italic">
          Not generic self-help or empty cheerleading. A quiet conversational sanctuary designed to help you synthesize clarity from emotional complexity.
        </p>

        {/* Primary CTA Buttons */}
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto">
          <button
            id="hero-signin-google-btn"
            type="button"
            onClick={() => loginWithGoogle()}
            className="w-full sm:w-auto flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-base font-medium bg-[#5a5a40] text-white hover:bg-[#4a4a35] transition-all shadow-lg shadow-[#5a5a40]/15 active:scale-[0.98]"
          >
            <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
              <path d="M12.24 10.285V14.4h6.806c-.275 1.765-2.056 5.174-6.806 5.174-4.095 0-7.439-3.389-7.439-7.574s3.344-7.574 7.439-7.574c2.33 0 3.891.989 4.785 1.849l3.254-3.138C18.189 1.186 15.479 0 12.24 0c-6.635 0-12 5.365-12 12s5.365 12 12 12c6.926 0 11.52-4.869 11.52-11.726 0-.788-.085-1.39-.189-1.989H12.24z" />
            </svg>
            <span>Sign in with Google to Begin</span>
            <ArrowRight className="w-4 h-4 text-white/80" />
          </button>

          <button
            id="hero-demo-vault-btn"
            type="button"
            onClick={handleDemoAccess}
            className="w-full sm:w-auto px-7 py-4 rounded-2xl text-sm font-medium text-[#5a5a40] bg-white border border-[#e5e1d8] hover:bg-[#f5f2ed] transition-colors shadow-xs"
          >
            Continue as Guest (Instant Access)
          </button>
        </div>

        {/* Natural Tones Feature Cards */}
        <div className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-6 w-full text-left">
          <div className="p-7 rounded-2xl bg-white/70 border border-[#e5e1d8] shadow-xs hover:bg-white transition-all">
            <div className="w-10 h-10 rounded-full bg-[#e8e4d9] text-[#5a5a40] flex items-center justify-center mb-4">
              <BrainCircuit className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-medium text-[#3a3a2a]">
              Socratic Reflection
            </h3>
            <p className="text-sm text-[#6a6a55] mt-2 leading-relaxed">
              Powered by Gemini 3.8 Flash. Gently questions cognitive blind spots, uncovers repeated themes, and provides grounded synthesis.
            </p>
          </div>

          <div className="p-7 rounded-2xl bg-white/70 border border-[#e5e1d8] shadow-xs hover:bg-white transition-all">
            <div className="w-10 h-10 rounded-full bg-[#e3eae2] text-[#4a6347] flex items-center justify-center mb-4">
              <Tag className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-medium text-[#3a3a2a]">
              Automated Insights & Moods
            </h3>
            <p className="text-sm text-[#6a6a55] mt-2 leading-relaxed">
              After each reflection turn, structured AI extracts meaningful titles, emotional sentiment, and multi-category tags automatically.
            </p>
          </div>

          <div className="p-7 rounded-2xl bg-white/70 border border-[#e5e1d8] shadow-xs hover:bg-white transition-all">
            <div className="w-10 h-10 rounded-full bg-[#e8e4d9] text-[#5a5a40] flex items-center justify-center mb-4">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-serif text-lg font-medium text-[#3a3a2a]">
              Zero-Tenant Data Leakage
            </h3>
            <p className="text-sm text-[#6a6a55] mt-2 leading-relaxed">
              Enforced by recursive user-bound Cloud Firestore security rules. Your innermost thoughts belong strictly to your identity.
            </p>
          </div>
        </div>

        {/* Security & Export Footnote */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-6 text-xs text-[#7a7a65]">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-[#5a5a40]" />
            <span>End-to-end user isolation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FileDown className="w-3.5 h-3.5 text-[#5a5a40]" />
            <span>Export anytime as Markdown or JSON</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#5a5a40]" />
            <span>Real-time streaming reflection engine</span>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-[#e5e1d8] py-6 text-center text-xs text-[#9a9a85]">
        <p>Loom · Built with Firebase Auth, Cloud Firestore & Google GenAI (gemini-3.8-flash)</p>
      </footer>
    </div>
  );
};
