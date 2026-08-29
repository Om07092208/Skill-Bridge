import React, { useState, useEffect } from 'react';
import type { GDTopic, Stance } from '../types/gd';
import { Timer, Check, ArrowRight, Lightbulb, Compass } from 'lucide-react';

interface TopicRevealProps {
  topic: GDTopic;
  onProceedToPrep: (selectedStance: Stance) => void;
}

export const TopicReveal: React.FC<TopicRevealProps> = ({ topic, onProceedToPrep }) => {
  const [selectedStance, setSelectedStance] = useState<Stance>('FOR');
  const [timeLeft, setTimeLeft] = useState<number>(15);

  useEffect(() => {
    if (timeLeft <= 0) {
      onProceedToPrep(selectedStance);
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, selectedStance, onProceedToPrep]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      
      {/* Timer Bar */}
      <div className="bg-white rounded-2xl border border-[#e5e7eb] p-4 flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#4f46e5]/10 text-[#3525cd] flex items-center justify-center font-bold">
            <Timer className="w-5 h-5 animate-spin" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-[#0f172a]">Reviewing Topic & Stance</h4>
            <p className="text-xs text-[#64748b]">Select your preliminary stance before prep begins.</p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-[#f3f4f5] px-4 py-2 rounded-xl border border-[#e5e7eb]">
          <span className="text-xs text-[#64748b] font-medium">Auto Proceeding:</span>
          <span className="text-base font-extrabold text-[#3525cd] font-mono">{timeLeft}s</span>
        </div>
      </div>

      {/* Topic Hero Card */}
      <div className="bg-white rounded-2xl border border-[#e5e7eb] p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs font-bold text-[#3525cd] bg-[#4f46e5]/10 px-3 py-1.5 rounded-lg border border-[#4f46e5]/20">
            {topic.category}
          </span>
          <span className="text-xs font-bold text-[#0f172a] bg-[#f3f4f5] px-3 py-1.5 rounded-lg border border-[#e5e7eb]">
            Difficulty: {topic.difficulty}
          </span>
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] leading-tight">
            {topic.title}
          </h2>
          <p className="text-sm sm:text-base text-[#64748b] leading-relaxed">
            {topic.context}
          </p>
        </div>

        {/* Dimensions */}
        <div className="bg-[#f8f9fa] rounded-xl p-5 border border-[#e5e7eb] space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#3525cd] uppercase tracking-wider">
            <Compass className="w-4 h-4" />
            <span>Key Discussion Dimensions</span>
          </div>
          <ul className="space-y-2">
            {topic.keyDimensions.map((dim, idx) => (
              <li key={idx} className="text-xs sm:text-sm text-[#0f172a] flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3525cd] mt-2 shrink-0"></span>
                <span>{dim}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Stance Picker */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-base font-bold text-[#0f172a]">
          <Lightbulb className="w-5 h-5 text-[#3525cd]" />
          <span>Choose Your Opening Stance</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* FOR */}
          <div
            onClick={() => setSelectedStance('FOR')}
            className={`bg-white rounded-2xl p-5 border-2 cursor-pointer transition-all space-y-2 relative ${
              selectedStance === 'FOR'
                ? 'border-[#22c55e] bg-[#22c55e]/5 shadow-md'
                : 'border-[#e5e7eb] hover:border-[#22c55e]/50'
            }`}
          >
            {selectedStance === 'FOR' && (
              <span className="absolute top-4 right-4 bg-[#22c55e] text-white p-1 rounded-full">
                <Check className="w-3.5 h-3.5" />
              </span>
            )}
            <span className="text-xs font-bold text-[#22c55e] bg-[#22c55e]/10 px-2.5 py-1 rounded-md inline-block">
              IN FAVOR (FOR)
            </span>
            <h4 className="font-bold text-sm text-[#0f172a]">Support the Proposition</h4>
            <p className="text-xs text-[#64748b] leading-relaxed">
              Argue that the net positive impact outweighs risks through technological progress and innovation.
            </p>
          </div>

          {/* AGAINST */}
          <div
            onClick={() => setSelectedStance('AGAINST')}
            className={`bg-white rounded-2xl p-5 border-2 cursor-pointer transition-all space-y-2 relative ${
              selectedStance === 'AGAINST'
                ? 'border-[#ef4444] bg-[#ef4444]/5 shadow-md'
                : 'border-[#e5e7eb] hover:border-[#ef4444]/50'
            }`}
          >
            {selectedStance === 'AGAINST' && (
              <span className="absolute top-4 right-4 bg-[#ef4444] text-white p-1 rounded-full">
                <Check className="w-3.5 h-3.5" />
              </span>
            )}
            <span className="text-xs font-bold text-[#ef4444] bg-[#ef4444]/10 px-2.5 py-1 rounded-md inline-block">
              OPPOSED (AGAINST)
            </span>
            <h4 className="font-bold text-sm text-[#0f172a]">Challenge the Proposition</h4>
            <p className="text-xs text-[#64748b] leading-relaxed">
              Highlight structural risks, job displacement, ethical concerns, and regulatory gaps.
            </p>
          </div>

          {/* NEUTRAL */}
          <div
            onClick={() => setSelectedStance('NEUTRAL')}
            className={`bg-white rounded-2xl p-5 border-2 cursor-pointer transition-all space-y-2 relative ${
              selectedStance === 'NEUTRAL'
                ? 'border-[#3525cd] bg-[#4f46e5]/5 shadow-md'
                : 'border-[#e5e7eb] hover:border-[#3525cd]/50'
            }`}
          >
            {selectedStance === 'NEUTRAL' && (
              <span className="absolute top-4 right-4 bg-[#3525cd] text-white p-1 rounded-full">
                <Check className="w-3.5 h-3.5" />
              </span>
            )}
            <span className="text-xs font-bold text-[#3525cd] bg-[#4f46e5]/10 px-2.5 py-1 rounded-md inline-block">
              BALANCED (SYNTHESIS)
            </span>
            <h4 className="font-bold text-sm text-[#0f172a]">Balanced Facilitator</h4>
            <p className="text-xs text-[#64748b] leading-relaxed">
              Acknowledge dual perspectives and synthesize a regulated, human-in-the-loop framework.
            </p>
          </div>

        </div>
      </div>

      {/* CTA Button */}
      <div className="pt-4 flex justify-end">
        <button
          onClick={() => onProceedToPrep(selectedStance)}
          className="bg-[#3525cd] text-white font-semibold text-sm px-8 py-3.5 rounded-xl hover:bg-[#4f46e5] transition-all shadow-md shadow-[#4f46e5]/25 flex items-center gap-2"
        >
          <span>Enter 2-Min Prep Scratchpad</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

    </div>
  );
};
