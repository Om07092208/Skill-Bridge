import React, { useState } from 'react';
import type { GDTopic, TranscriptMessage } from '../types/gd';
import { 
  Trophy, Download, RotateCcw, Share2, Sparkles, CheckCircle2, 
  TrendingUp, Play, Pause, Filter, ShieldCheck, MessageSquare, ArrowRight 
} from 'lucide-react';

interface PerformanceReportProps {
  topic: GDTopic;
  transcript: TranscriptMessage[];
  onRestart: () => void;
}

export const PerformanceReport: React.FC<PerformanceReportProps> = ({
  topic,
  transcript,
  onRestart
}) => {
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('All');

  const competencies = [
    { name: 'Communication & Clarity', score: 85, benchmark: 'Exceeds Benchmark', color: 'bg-[#3525cd]' },
    { name: 'Logical Reasoning & Content Quality', score: 90, benchmark: 'Top 5%', color: 'bg-[#22c55e]' },
    { name: 'Group Leadership & Facilitation', score: 82, benchmark: 'Solid', color: 'bg-[#0058be]' },
    { name: 'Active Listening & Synthesis', score: 88, benchmark: 'Exceeds Benchmark', color: 'bg-[#571ac0]' },
    { name: 'Speech Pace & Fluency', score: 84, benchmark: 'Solid', color: 'bg-[#3525cd]' },
  ];

  const filteredMessages = transcript.filter(msg => {
    if (selectedFilter === 'All') return true;
    if (selectedFilter === 'User Only') return msg.speakerId === 'user-0' || msg.speakerName.includes('You');
    if (selectedFilter === 'Tagged Events') return msg.tag !== undefined;
    return true;
  });

  const handleDownloadPDF = () => {
    window.print();
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 space-y-10 print:py-0 print:px-0">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#e5e7eb]">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4f46e5]/10 text-[#3525cd] text-xs font-bold border border-[#4f46e5]/20 mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            <span>AI PERFORMANCE INTELLIGENCE REPORT</span>
          </div>
          <h1 className="text-3xl font-extrabold text-[#0f172a] tracking-tight">
            GD DIAGNOSTICS & EVALUATION
          </h1>
          <p className="text-sm text-[#64748b] mt-1 max-w-2xl">
            Topic: <span className="font-semibold text-[#0f172a]">{topic.title}</span> ({topic.category})
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 print:hidden">
          <button
            onClick={handleDownloadPDF}
            className="bg-white hover:bg-[#f8f9fa] text-[#0f172a] font-semibold text-xs px-4 py-2.5 rounded-xl border border-[#e5e7eb] flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Download className="w-4 h-4 text-[#3525cd]" />
            <span>Download PDF</span>
          </button>

          <button
            onClick={() => {
              if (navigator.share) {
                navigator.share({ title: 'My GD Report', url: window.location.href });
              } else {
                alert('Report link copied to clipboard!');
              }
            }}
            className="bg-white hover:bg-[#f8f9fa] text-[#0f172a] font-semibold text-xs px-4 py-2.5 rounded-xl border border-[#e5e7eb] flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <Share2 className="w-4 h-4 text-[#0058be]" />
            <span>Share</span>
          </button>

          <button
            onClick={onRestart}
            className="bg-[#3525cd] hover:bg-[#4f46e5] text-white font-semibold text-xs px-6 py-2.5 rounded-xl transition-all shadow-md shadow-[#4f46e5]/25 flex items-center gap-1.5"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Practice Next GD</span>
          </button>
        </div>
      </div>

      {/* Top Overview Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Score Card */}
        <div className="bg-gradient-to-br from-[#3525cd] to-[#4f46e5] rounded-2xl p-6 text-white shadow-lg space-y-4 relative overflow-hidden">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-[#dad7ff]">Overall Evaluation</span>
              <div className="flex items-baseline gap-2 mt-2">
                <span className="text-5xl font-extrabold tracking-tight">88</span>
                <span className="text-lg font-bold text-[#dad7ff]">/ 100</span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <Trophy className="w-6 h-6 text-yellow-300" />
            </div>
          </div>

          <div className="pt-3 border-t border-white/20 flex items-center justify-between text-xs font-medium">
            <span>Percentile Score</span>
            <span className="bg-white/20 px-2.5 py-1 rounded-full font-bold">92nd Percentile</span>
          </div>
        </div>

        {/* Strengths Snapshot Card */}
        <div className="bg-white rounded-2xl border border-[#e5e7eb] p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#22c55e] uppercase tracking-wider">
            <CheckCircle2 className="w-4 h-4" />
            <span>Key Strength Demonstrated</span>
          </div>
          <h4 className="font-bold text-base text-[#0f172a]">Logical Structure & Stance Consistency</h4>
          <p className="text-xs text-[#64748b] leading-relaxed">
            You maintained a cohesive argument thread throughout the 4-minute discussion without contradicting your opening stance.
          </p>
        </div>

        {/* Priority Area Card */}
        <div className="bg-white rounded-2xl border border-[#e5e7eb] p-6 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-xs font-bold text-[#3525cd] uppercase tracking-wider">
            <TrendingUp className="w-4 h-4" />
            <span>Growth Target Area</span>
          </div>
          <h4 className="font-bold text-base text-[#0f172a]">Consensus Building & Floor Facilitation</h4>
          <p className="text-xs text-[#64748b] leading-relaxed">
            Try asking quieter participants (e.g. Priya) for their opinion in the final 60 seconds to demonstrate group leadership.
          </p>
        </div>

      </div>

      {/* 5 Core Competency Gauges Section */}
      <section className="bg-white rounded-2xl border border-[#e5e7eb] p-6 sm:p-8 space-y-6 shadow-xs">
        <div>
          <h3 className="text-xl font-bold text-[#0f172a]">5-Axis Competency Diagnostics</h3>
          <p className="text-xs text-[#64748b]">Evaluation benchmarked against top B-School & corporate interview standards.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {competencies.map((comp, idx) => (
            <div key={idx} className="bg-[#f8f9fa] rounded-xl p-5 border border-[#e5e7eb] space-y-3">
              <div className="flex justify-between items-start">
                <span className="text-xs font-bold text-[#0f172a]">{comp.name}</span>
                <span className="text-xs font-extrabold text-[#3525cd] font-mono">{comp.score}%</span>
              </div>

              <div className="w-full h-2.5 bg-[#edeeef] rounded-full overflow-hidden">
                <div 
                  className={`h-full ${comp.color} transition-all duration-500 rounded-full`}
                  style={{ width: `${comp.score}%` }}
                ></div>
              </div>

              <div className="flex items-center justify-between text-[11px] font-semibold text-[#64748b]">
                <span>Status</span>
                <span className="text-[#3525cd] bg-[#4f46e5]/10 px-2 py-0.5 rounded-md">{comp.benchmark}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Audio Waveform Replay & Transcript Event Timeline */}
      <section className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Audio Wave Simulator */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-[#e5e7eb] p-6 space-y-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-[#0f172a] uppercase tracking-wider">
              <MessageSquare className="w-4 h-4 text-[#3525cd]" />
              <span>Audio Session Replay</span>
            </div>

            <div className="bg-[#f8f9fa] p-4 rounded-xl border border-[#e5e7eb] text-center space-y-3">
              <div className="flex items-center justify-center gap-1 h-12">
                {[40, 75, 30, 90, 60, 100, 45, 80, 55, 35, 95, 70, 50, 85, 40].map((h, i) => (
                  <div
                    key={i}
                    className={`w-1.5 rounded-full transition-all ${
                      isPlayingAudio ? 'bg-[#3525cd] animate-pulse' : 'bg-[#cbd5e1]'
                    }`}
                    style={{ height: `${h}%` }}
                  ></div>
                ))}
              </div>

              <button
                onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                className="bg-[#3525cd] text-white text-xs font-semibold px-5 py-2.5 rounded-xl hover:bg-[#4f46e5] transition-colors inline-flex items-center gap-2"
              >
                {isPlayingAudio ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                <span>{isPlayingAudio ? 'Pause Audio Replay' : 'Play Audio Session'}</span>
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-[#e5e7eb] text-xs text-[#64748b]">
            <span>Full room audio recording stored securely for 30 days.</span>
          </div>
        </div>

        {/* Right Column: Transcript Event Timeline */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#e5e7eb] p-6 space-y-5 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#e5e7eb]">
            <h3 className="font-bold text-base text-[#0f172a] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#3525cd]" />
              TRANSCRIPT EVENT TIMELINE
            </h3>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <Filter className="w-3.5 h-3.5 text-[#64748b]" />
              {['All', 'User Only', 'Tagged Events'].map(f => (
                <button
                  key={f}
                  onClick={() => setSelectedFilter(f)}
                  className={`text-xs font-medium px-3 py-1 rounded-lg transition-all ${
                    selectedFilter === f 
                      ? 'bg-[#3525cd] text-white' 
                      : 'bg-[#f3f4f5] text-[#64748b] hover:text-[#0f172a]'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Messages Timeline */}
          <div className="space-y-4 max-h-96 overflow-y-auto pr-1">
            {filteredMessages.map(msg => (
              <div key={msg.id} className="bg-[#f8f9fa] p-4 rounded-xl border border-[#e5e7eb] space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <img src={msg.speakerAvatar} alt={msg.speakerName} className="w-5 h-5 rounded-full object-cover" />
                    <span className="font-bold text-[#0f172a]">{msg.speakerName}</span>
                    {msg.tag && (
                      <span className="text-[10px] font-semibold text-[#3525cd] bg-[#4f46e5]/10 px-2 py-0.5 rounded-md">
                        {msg.tag}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-[#64748b] font-mono">{msg.timestamp}</span>
                </div>
                <p className="text-xs text-[#0f172a] leading-relaxed">{msg.text}</p>
              </div>
            ))}
          </div>
        </div>

      </section>

      {/* Actionable AI Practice Roadmap */}
      <section className="bg-white rounded-2xl border border-[#e5e7eb] p-6 sm:p-8 space-y-6 shadow-xs">
        <div>
          <h3 className="text-xl font-bold text-[#0f172a]">Actionable Practice Roadmap</h3>
          <p className="text-xs text-[#64748b]">Recommended focused drills for your next GD session.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-[#f8f9fa] rounded-xl p-5 border border-[#e5e7eb] space-y-2">
            <span className="text-xs font-bold text-[#3525cd] bg-[#4f46e5]/10 px-2.5 py-0.5 rounded-md">DRILL 1</span>
            <h4 className="font-bold text-sm text-[#0f172a]">Data-Backed Interjections</h4>
            <p className="text-xs text-[#64748b]">Practice introducing specific percentages in the first 2 minutes of discussion.</p>
          </div>

          <div className="bg-[#f8f9fa] rounded-xl p-5 border border-[#e5e7eb] space-y-2">
            <span className="text-xs font-bold text-[#0058be] bg-[#d8e2ff] px-2.5 py-0.5 rounded-md">DRILL 2</span>
            <h4 className="font-bold text-sm text-[#0f172a]">Summarizing & Consensus Building</h4>
            <p className="text-xs text-[#64748b]">Practice stepping in during minute 3 to synthesize opposing points into a shared conclusion.</p>
          </div>

          <div className="bg-[#f8f9fa] rounded-xl p-5 border border-[#e5e7eb] space-y-2">
            <span className="text-xs font-bold text-[#571ac0] bg-[#e3d5ff] px-2.5 py-0.5 rounded-md">DRILL 3</span>
            <h4 className="font-bold text-sm text-[#0f172a]">Managing Aggressive Speakers</h4>
            <p className="text-xs text-[#64748b]">Learn polite interjection formulas ("Pardon me Rohan, but if I may add...")</p>
          </div>
        </div>

        <div className="pt-4 text-center print:hidden">
          <button
            onClick={onRestart}
            className="bg-[#3525cd] hover:bg-[#4f46e5] text-white font-semibold text-sm px-8 py-3.5 rounded-xl transition-all shadow-md shadow-[#4f46e5]/25 inline-flex items-center gap-2"
          >
            <span>Launch Another Practice GD Session</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

    </div>
  );
};
