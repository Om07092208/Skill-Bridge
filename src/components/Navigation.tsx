import React from 'react';
import type { Stage } from '../types/gd';
import { Sparkles, Trophy, Users, LayoutDashboard, Volume2, VolumeX } from 'lucide-react';

interface NavigationProps {
  currentStage: Stage;
  setStage: (stage: Stage) => void;
  audioEnabled: boolean;
  setAudioEnabled: (enabled: boolean) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentStage,
  setStage,
  audioEnabled,
  setAudioEnabled
}) => {
  const getStageStep = (stage: Stage) => {
    switch (stage) {
      case 'matchmaking': return '1. Matchmaking';
      case 'topic_reveal': return '2. Topic & Stance';
      case 'prep': return '3. 2-Min Scratchpad';
      case 'discussion': return '4. Live Discussion Room';
      case 'session_complete': return '5. Session Summary';
      case 'report': return '6. Performance Intelligence';
      default: return null;
    }
  };

  const stepLabel = getStageStep(currentStage);

  return (
    <nav className="bg-white border-b border-[#e5e7eb] sticky top-0 z-50 shadow-xs">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-3 flex items-center justify-between">
        
        {/* Brand Logo */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setStage('arena')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#3525cd] to-[#4f46e5] flex items-center justify-center text-white font-bold shadow-md shadow-[#4f46e5]/20">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight text-[#0f172a]">
                SkillBridge <span className="text-[#3525cd]">AI</span>
              </span>
              <span className="bg-[#4f46e5]/10 text-[#3525cd] font-semibold text-[11px] px-2 py-0.5 rounded-full border border-[#4f46e5]/20">
                PRO
              </span>
            </div>
            <p className="text-[12px] text-[#64748b] font-medium tracking-wide">GD Arena & Career Intelligence</p>
          </div>
        </div>

        {/* Current Session Step Banner if active */}
        {stepLabel && (
          <div className="hidden md:flex items-center gap-2 bg-[#f3f4f5] px-4 py-1.5 rounded-full border border-[#e5e7eb]">
            <span className="w-2 h-2 rounded-full bg-[#4f46e5] animate-pulse"></span>
            <span className="text-xs font-semibold text-[#3525cd]">{stepLabel}</span>
          </div>
        )}

        {/* Navigation Items */}
        <div className="flex items-center gap-3 sm:gap-6">
          <button 
            onClick={() => setStage('arena')}
            className={`flex items-center gap-2 text-sm font-medium transition-colors px-3 py-1.5 rounded-lg ${
              currentStage === 'arena' 
                ? 'text-[#3525cd] bg-[#4f46e5]/10 font-semibold' 
                : 'text-[#64748b] hover:text-[#0f172a] hover:bg-[#f8f9fa]'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="hidden sm:inline">GD Arena</span>
          </button>

          <button 
            onClick={() => setStage('matchmaking')}
            className={`flex items-center gap-2 text-sm font-medium transition-colors px-3 py-1.5 rounded-lg ${
              currentStage === 'discussion' || currentStage === 'matchmaking'
                ? 'text-[#3525cd] bg-[#4f46e5]/10 font-semibold' 
                : 'text-[#64748b] hover:text-[#0f172a] hover:bg-[#f8f9fa]'
            }`}
          >
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Live Room</span>
          </button>

          <button 
            onClick={() => setStage('report')}
            className={`flex items-center gap-2 text-sm font-medium transition-colors px-3 py-1.5 rounded-lg ${
              currentStage === 'report' 
                ? 'text-[#3525cd] bg-[#4f46e5]/10 font-semibold' 
                : 'text-[#64748b] hover:text-[#0f172a] hover:bg-[#f8f9fa]'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Reports</span>
          </button>

          {/* Audio Voice Toggle */}
          <button 
            onClick={() => setAudioEnabled(!audioEnabled)}
            title={audioEnabled ? "AI Voice Synthesis Enabled" : "AI Voice Synthesis Muted"}
            className={`p-2 rounded-lg border transition-all ${
              audioEnabled 
                ? 'bg-[#4f46e5]/10 text-[#3525cd] border-[#4f46e5]/30' 
                : 'bg-[#f8f9fa] text-[#64748b] border-[#e5e7eb]'
            }`}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-red-500" />}
          </button>

          {/* User Profile */}
          <div className="flex items-center gap-2 pl-3 border-l border-[#e5e7eb]">
            <img 
              src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150" 
              alt="User profile" 
              className="w-8 h-8 rounded-full object-cover border-2 border-[#4f46e5]"
            />
            <div className="hidden lg:block text-left">
              <div className="text-xs font-semibold text-[#0f172a]">Alex Morgan</div>
              <div className="text-[10px] text-[#22c55e] font-medium flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]"></span>
                Online & Ready
              </div>
            </div>
          </div>

        </div>

      </div>
    </nav>
  );
};
