import React, { useEffect, useState } from 'react';
import type { GDTopic, Participant } from '../types/gd';
import { INITIAL_AI_PARTICIPANTS } from '../data/mockTopics';
import { Loader2, CheckCircle2, Users, ShieldCheck, Sparkles, ArrowRight } from 'lucide-react';

interface MatchmakingProps {
  topic: GDTopic;
  onMatchComplete: (participants: Participant[]) => void;
}

export const Matchmaking: React.FC<MatchmakingProps> = ({ topic, onMatchComplete }) => {
  const [matchedSlots, setMatchedSlots] = useState<number>(1);
  const [progressPercent, setProgressPercent] = useState<number>(25);

  useEffect(() => {
    // Simulate candidate matching step by step over 3.5 seconds
    const timer1 = setTimeout(() => { setMatchedSlots(2); setProgressPercent(50); }, 900);
    const timer2 = setTimeout(() => { setMatchedSlots(3); setProgressPercent(75); }, 1800);
    const timer3 = setTimeout(() => { setMatchedSlots(4); setProgressPercent(100); }, 2700);

    const timerComplete = setTimeout(() => {
      onMatchComplete(INITIAL_AI_PARTICIPANTS);
    }, 3800);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
      clearTimeout(timerComplete);
    };
  }, [onMatchComplete]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-12 space-y-10">
      
      {/* Header & Status */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4f46e5]/10 text-[#3525cd] text-xs font-bold border border-[#4f46e5]/20">
          <Sparkles className="w-3.5 h-3.5" />
          <span>MATCHMAKING ENGINE</span>
        </div>
        
        <h2 className="text-3xl font-extrabold text-[#0f172a] tracking-tight">
          {matchedSlots < 4 ? 'FINDING BALANCED PARTICIPANTS...' : 'ROOM READY! ALL CANDIDATES MATCHED'}
        </h2>
        
        <p className="text-sm text-[#64748b] max-w-lg mx-auto leading-relaxed">
          Pairing candidate profiles with complementary discussion styles (Aggressive Analyst, Data Synthesizer, Diplomatic Facilitator) to simulate real corporate group discussions.
        </p>

        {/* Progress Bar */}
        <div className="max-w-md mx-auto pt-2 space-y-1.5">
          <div className="flex justify-between text-xs font-semibold text-[#64748b]">
            <span>Matching Progress</span>
            <span>{progressPercent}%</span>
          </div>
          <div className="w-full h-2.5 bg-[#edeeef] rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#3525cd] to-[#4f46e5] transition-all duration-500 rounded-full"
              style={{ width: `${progressPercent}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Candidate Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {INITIAL_AI_PARTICIPANTS.map((participant, index) => {
          const isMatched = index < matchedSlots;

          return (
            <div
              key={participant.id}
              className={`bg-white rounded-2xl border p-5 flex flex-col items-center text-center space-y-3 transition-all duration-300 ${
                isMatched 
                  ? 'border-[#4f46e5] shadow-md shadow-[#4f46e5]/10 scale-100' 
                  : 'border-[#e5e7eb] opacity-60 scale-95'
              }`}
            >
              <div className="relative">
                <img
                  src={participant.avatar}
                  alt={participant.name}
                  className={`w-20 h-20 rounded-full object-cover border-4 ${
                    isMatched ? 'border-[#3525cd]' : 'border-[#e5e7eb]'
                  }`}
                />
                {isMatched ? (
                  <span className="absolute bottom-0 right-0 bg-[#22c55e] text-white p-1 rounded-full border-2 border-white">
                    <CheckCircle2 className="w-4 h-4" />
                  </span>
                ) : (
                  <span className="absolute bottom-0 right-0 bg-[#3525cd] text-white p-1 rounded-full border-2 border-white animate-spin">
                    <Loader2 className="w-4 h-4" />
                  </span>
                )}
              </div>

              <div>
                <h4 className="font-bold text-sm text-[#0f172a]">
                  {isMatched ? participant.name : 'Searching...'}
                </h4>
                <p className="text-xs text-[#3525cd] font-semibold mt-0.5">
                  {isMatched ? participant.role : 'Scanning queue'}
                </p>
              </div>

              <div className="w-full pt-3 border-t border-[#e5e7eb]">
                {isMatched ? (
                  <span className="text-[11px] font-semibold text-[#22c55e] bg-[#22c55e]/10 px-2.5 py-1 rounded-full inline-block">
                    ✓ Matched & Connected
                  </span>
                ) : (
                  <span className="text-[11px] font-semibold text-[#64748b] bg-[#f3f4f5] px-2.5 py-1 rounded-full inline-block">
                    Connecting...
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Match Context Card */}
      <div className="bg-white rounded-2xl border border-[#e5e7eb] p-6 space-y-4 max-w-2xl mx-auto shadow-xs">
        <div className="flex items-center justify-between border-b border-[#e5e7eb] pb-3">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-[#3525cd]" />
            <span className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">Session Details</span>
          </div>
          <span className="text-xs font-semibold text-[#3525cd] bg-[#4f46e5]/10 px-2.5 py-1 rounded-md flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            {topic.difficulty} Difficulty
          </span>
        </div>

        <div>
          <h3 className="font-bold text-base text-[#0f172a]">{topic.title}</h3>
          <p className="text-xs text-[#64748b] mt-1 line-clamp-2">{topic.context}</p>
        </div>
      </div>

      {/* Skip/Manual Continue Button */}
      <div className="text-center pt-2">
        <button
          onClick={() => onMatchComplete(INITIAL_AI_PARTICIPANTS)}
          className="bg-[#3525cd] text-white font-semibold text-sm px-8 py-3.5 rounded-xl hover:bg-[#4f46e5] transition-all shadow-md shadow-[#4f46e5]/25 inline-flex items-center gap-2"
        >
          <span>Skip Wait & Start Session Immediately</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
