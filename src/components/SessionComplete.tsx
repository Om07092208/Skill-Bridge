import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, ArrowRight, RotateCcw, CheckCircle2, Award, Zap } from 'lucide-react';

interface SessionCompleteProps {
  onViewReport: () => void;
  onRestart: () => void;
}

export const SessionComplete: React.FC<SessionCompleteProps> = ({ onViewReport, onRestart }) => {
  useEffect(() => {
    // Launch celebratory confetti burst
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-8">
      
      {/* Icon Trophy */}
      <div className="relative inline-block">
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-[#3525cd] to-[#4f46e5] flex items-center justify-center text-white mx-auto shadow-xl shadow-[#4f46e5]/30">
          <Trophy className="w-12 h-12 text-yellow-300" />
        </div>
        <span className="absolute -top-2 -right-2 bg-[#22c55e] text-white p-2 rounded-full border-4 border-[#f8f9fa] shadow-md">
          <CheckCircle2 className="w-5 h-5" />
        </span>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <span className="text-xs font-bold text-[#3525cd] bg-[#4f46e5]/10 px-3 py-1 rounded-full border border-[#4f46e5]/20">
          SESSION SUBMITTED SUCCESSFULLY
        </span>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-[#0f172a] tracking-tight">
          GD PRACTICE SESSION COMPLETE!
        </h2>
        <p className="text-sm sm:text-base text-[#64748b] max-w-lg mx-auto leading-relaxed">
          Your transcript, speech metrics, and group interactions have been evaluated by our GD Intelligence Engine.
        </p>
      </div>

      {/* Quick Score Snapshot Card */}
      <div className="bg-white rounded-2xl border border-[#e5e7eb] p-6 shadow-xs space-y-6 text-left">
        <div className="flex justify-between items-center pb-4 border-b border-[#e5e7eb]">
          <div>
            <span className="text-xs text-[#64748b] font-medium">Overall Session Evaluation</span>
            <h3 className="text-xl font-extrabold text-[#0f172a]">Grade: A (Outstanding)</h3>
          </div>
          <div className="text-right">
            <span className="text-3xl font-extrabold text-[#3525cd]">88</span>
            <span className="text-xs text-[#64748b] font-bold">/100</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#f8f9fa] p-4 rounded-xl border border-[#e5e7eb] space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-[#64748b] font-medium">
              <Award className="w-4 h-4 text-[#3525cd]" />
              <span>Top Competency</span>
            </div>
            <p className="text-sm font-bold text-[#0f172a]">Logical Reasoning & Structure</p>
          </div>

          <div className="bg-[#f8f9fa] p-4 rounded-xl border border-[#e5e7eb] space-y-1">
            <div className="flex items-center gap-1.5 text-xs text-[#64748b] font-medium">
              <Zap className="w-4 h-4 text-[#0058be]" />
              <span>Airtime Share</span>
            </div>
            <p className="text-sm font-bold text-[#0f172a]">24% (Optimal Group Ratio)</p>
          </div>
        </div>
      </div>

      {/* CTA Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
        <button
          onClick={onViewReport}
          className="w-full sm:w-auto bg-[#3525cd] text-white font-semibold text-sm px-8 py-3.5 rounded-xl hover:bg-[#4f46e5] transition-all shadow-md shadow-[#4f46e5]/25 flex items-center justify-center gap-2"
        >
          <span>View Full Performance Intelligence Report</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <button
          onClick={onRestart}
          className="w-full sm:w-auto bg-white hover:bg-[#f8f9fa] text-[#0f172a] font-semibold text-sm px-6 py-3.5 rounded-xl border border-[#e5e7eb] transition-colors flex items-center justify-center gap-2"
        >
          <RotateCcw className="w-4 h-4 text-[#64748b]" />
          <span>Practice Another Topic</span>
        </button>
      </div>

    </div>
  );
};
