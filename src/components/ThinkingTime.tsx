import React, { useState, useEffect } from 'react';
import type { GDTopic, Stance, PrepNote } from '../types/gd';
import { Timer, Play, Pause, Plus, Trash2, Sparkles, ArrowRight, Check } from 'lucide-react';

interface ThinkingTimeProps {
  topic: GDTopic;
  stance: Stance;
  onProceedToDiscussion: (prepNote: PrepNote) => void;
}

export const ThinkingTime: React.FC<ThinkingTimeProps> = ({
  topic,
  stance,
  onProceedToDiscussion
}) => {
  const [timeLeft, setTimeLeft] = useState<number>(120);
  const [isRunning, setIsRunning] = useState<boolean>(true);

  // Scratchpad state
  const [openingStatement, setOpeningStatement] = useState<string>(
    `"Greetings everyone. On the topic '${topic.title}', I firmly stand ${stance.toLowerCase() === 'for' ? 'in support of' : stance.toLowerCase() === 'against' ? 'against' : 'with a balanced perspective on'} the motion because..."`
  );
  const [mainPoints, setMainPoints] = useState<string[]>([
    stance === 'FOR' ? topic.suggestedPointsFor[0] : stance === 'AGAINST' ? topic.suggestedPointsAgainst[0] : topic.suggestedPointsNeutral[0],
    topic.keyStats[0]
  ]);
  const [newPointInput, setNewPointInput] = useState<string>('');
  const [concludingThought, setConcludingThought] = useState<string>(
    'To conclude, while acknowledging potential risks, a structured regulatory framework ensures optimal outcomes for all stakeholders.'
  );

  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!isRunning) return;
    if (timeLeft <= 0) {
      onProceedToDiscussion({ openingStatement, mainPoints, concludingThought });
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, isRunning, openingStatement, mainPoints, concludingThought, onProceedToDiscussion]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleAddPoint = () => {
    if (newPointInput.trim()) {
      setMainPoints([...mainPoints, newPointInput.trim()]);
      setNewPointInput('');
    }
  };

  const handleRemovePoint = (index: number) => {
    setMainPoints(mainPoints.filter((_, i) => i !== index));
  };

  const handleAddSuggestedPoint = (pointText: string, index: number) => {
    if (!mainPoints.includes(pointText)) {
      setMainPoints([...mainPoints, pointText]);
      setCopiedIdx(index);
      setTimeout(() => setCopiedIdx(null), 1500);
    }
  };

  const suggestedPoints = stance === 'FOR' 
    ? topic.suggestedPointsFor 
    : stance === 'AGAINST' 
      ? topic.suggestedPointsAgainst 
      : topic.suggestedPointsNeutral;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      
      {/* Top Countdown Header */}
      <div className="bg-white rounded-2xl border border-[#e5e7eb] p-4 sm:p-5 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-[#3525cd] to-[#4f46e5] text-white flex items-center justify-center font-bold shadow-md shadow-[#4f46e5]/20">
            <Timer className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-[#0f172a] text-lg">PREPARATION SCRATCHPAD</h3>
              <span className="text-xs font-bold text-[#3525cd] bg-[#4f46e5]/10 px-2.5 py-0.5 rounded-full border border-[#4f46e5]/20">
                Stance: {stance}
              </span>
            </div>
            <p className="text-xs text-[#64748b]">Draft your 3 core arguments and opening statement before room enters live mode.</p>
          </div>
        </div>

        {/* Timer Control */}
        <div className="flex items-center gap-3">
          <div className="bg-[#f3f4f5] px-5 py-2.5 rounded-xl border border-[#e5e7eb] flex items-center gap-2">
            <span className="text-xs text-[#64748b] font-medium">Time Left:</span>
            <span className="text-2xl font-extrabold text-[#3525cd] font-mono tracking-tight">{formatTime(timeLeft)}</span>
          </div>

          <button
            onClick={() => setIsRunning(!isRunning)}
            className="p-2.5 rounded-xl border border-[#e5e7eb] bg-white hover:bg-[#f8f9fa] text-[#0f172a] transition-colors"
            title={isRunning ? "Pause Timer" : "Resume Timer"}
          >
            {isRunning ? <Pause className="w-4 h-4 text-[#3525cd]" /> : <Play className="w-4 h-4 text-[#22c55e]" />}
          </button>
        </div>
      </div>

      {/* Main Grid: AI Assistant vs Scratchpad */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: AI Assistant Context & Suggestions */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* AI Helper Banner */}
          <div className="bg-[#4f46e5]/5 rounded-2xl p-5 border border-[#4f46e5]/20 space-y-4">
            <div className="flex items-center gap-2 text-sm font-bold text-[#3525cd]">
              <Sparkles className="w-4 h-4" />
              <span>AI Discussion Assistant Suggestions</span>
            </div>
            
            <p className="text-xs text-[#64748b]">
              Click any argument or data point below to instantly append it to your active preparation notes.
            </p>

            {/* Suggested Arguments */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">Suggested Argument Bullets</span>
              {suggestedPoints.map((pt, idx) => (
                <div 
                  key={idx} 
                  className="bg-white rounded-xl p-3 border border-[#e5e7eb] flex items-start justify-between gap-2 hover:border-[#4f46e5] transition-all text-xs text-[#0f172a]"
                >
                  <span>{pt}</span>
                  <button
                    onClick={() => handleAddSuggestedPoint(pt, idx)}
                    className="shrink-0 text-xs font-semibold text-[#3525cd] bg-[#4f46e5]/10 px-2 py-1 rounded-md hover:bg-[#3525cd] hover:text-white transition-colors flex items-center gap-1"
                  >
                    {copiedIdx === idx ? <Check className="w-3 h-3 text-[#22c55e]" /> : <Plus className="w-3 h-3" />}
                    <span>Add</span>
                  </button>
                </div>
              ))}
            </div>

            {/* Key Data Stats */}
            <div className="space-y-2 pt-2">
              <span className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">Key Statistics & Evidence</span>
              {topic.keyStats.map((stat, idx) => (
                <div 
                  key={idx}
                  className="bg-white rounded-xl p-3 border border-[#e5e7eb] flex items-start justify-between gap-2 text-xs text-[#0f172a]"
                >
                  <span className="font-medium text-[#3525cd]">{stat}</span>
                  <button
                    onClick={() => handleAddSuggestedPoint(stat, idx + 100)}
                    className="shrink-0 text-xs font-semibold text-[#3525cd] bg-[#4f46e5]/10 px-2 py-1 rounded-md hover:bg-[#3525cd] hover:text-white transition-colors flex items-center gap-1"
                  >
                    {copiedIdx === idx + 100 ? <Check className="w-3 h-3 text-[#22c55e]" /> : <Plus className="w-3 h-3" />}
                    <span>Add</span>
                  </button>
                </div>
              ))}
            </div>

          </div>

        </div>

        {/* Right Column: User Interactive Scratchpad */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-[#e5e7eb] p-6 space-y-6 shadow-xs flex flex-col justify-between">
          
          <div className="space-y-5">
            
            {/* Opening Hook Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#0f172a] uppercase tracking-wider flex items-center justify-between">
                <span>1. Opening Hook & Stance Declaration</span>
                <span className="text-[10px] text-[#64748b] font-normal">First 30 Seconds</span>
              </label>
              <textarea
                value={openingStatement}
                onChange={(e) => setOpeningStatement(e.target.value)}
                rows={2}
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-[#e5e7eb] focus:border-[#3525cd] focus:ring-2 focus:ring-[#3525cd]/20 outline-none transition-all"
                placeholder="Write your opening introduction..."
              />
            </div>

            {/* Main Arguments List */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-[#0f172a] uppercase tracking-wider flex items-center justify-between">
                <span>2. Core Discussion Arguments</span>
                <span className="text-[10px] text-[#64748b] font-normal">{mainPoints.length} points added</span>
              </label>

              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {mainPoints.map((pt, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-[#f8f9fa] p-2.5 rounded-xl border border-[#e5e7eb]">
                    <span className="w-5 h-5 rounded-full bg-[#3525cd] text-white text-[11px] font-bold flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <input
                      type="text"
                      value={pt}
                      onChange={(e) => {
                        const updated = [...mainPoints];
                        updated[idx] = e.target.value;
                        setMainPoints(updated);
                      }}
                      className="w-full text-xs sm:text-sm bg-transparent border-none outline-none font-medium text-[#0f172a]"
                    />
                    <button 
                      onClick={() => handleRemovePoint(idx)}
                      className="text-[#64748b] hover:text-red-500 p-1 rounded-md"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Add Custom Point Input */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={newPointInput}
                  onChange={(e) => setNewPointInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddPoint()}
                  placeholder="Type a custom argument and press Enter..."
                  className="flex-grow text-xs p-2.5 rounded-xl border border-[#e5e7eb] focus:border-[#3525cd] outline-none"
                />
                <button
                  onClick={handleAddPoint}
                  className="bg-[#f3f4f5] hover:bg-[#edeeef] text-[#0f172a] text-xs font-semibold px-4 py-2.5 rounded-xl border border-[#e5e7eb] flex items-center gap-1 shrink-0"
                >
                  <Plus className="w-4 h-4 text-[#3525cd]" />
                  <span>Add</span>
                </button>
              </div>
            </div>

            {/* Concluding Thought Input */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-[#0f172a] uppercase tracking-wider">
                3. Concluding & Consensus Synthesis
              </label>
              <textarea
                value={concludingThought}
                onChange={(e) => setConcludingThought(e.target.value)}
                rows={2}
                className="w-full text-xs sm:text-sm p-3 rounded-xl border border-[#e5e7eb] focus:border-[#3525cd] focus:ring-2 focus:ring-[#3525cd]/20 outline-none transition-all"
                placeholder="Draft your closing summary..."
              />
            </div>

          </div>

          {/* CTA Footer */}
          <div className="pt-4 border-t border-[#e5e7eb] flex items-center justify-between">
            <span className="text-xs text-[#64748b] font-medium">Notes auto-saved to live room widget</span>
            <button
              onClick={() => onProceedToDiscussion({ openingStatement, mainPoints, concludingThought })}
              className="bg-[#3525cd] text-white font-semibold text-sm px-7 py-3 rounded-xl hover:bg-[#4f46e5] transition-all shadow-md shadow-[#4f46e5]/25 flex items-center gap-2"
            >
              <span>Enter Live Discussion Room</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
};
