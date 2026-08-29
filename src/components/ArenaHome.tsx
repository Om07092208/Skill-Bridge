import React, { useState } from 'react';
import type { GDTopic, DifficultyLevel, PracticeMode } from '../types/gd';
import { SAMPLE_TOPICS } from '../data/mockTopics';
import { 
  Users, Shuffle, Timer, RotateCw, Hourglass, Bot, ArrowRight, 
  TrendingUp, Sparkles, UserPlus, PlayCircle, Globe2, ShieldCheck, 
  BookOpen, CheckCircle2, SlidersHorizontal
} from 'lucide-react';

interface ArenaHomeProps {
  onStartSession: (topic: GDTopic, mode: PracticeMode, difficulty: DifficultyLevel) => void;
  onViewReport: () => void;
}

export const ArenaHome: React.FC<ArenaHomeProps> = ({ onStartSession, onViewReport }) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedDifficulty, setSelectedDifficulty] = useState<DifficultyLevel>('Advanced');
  const [selectedMode, setSelectedMode] = useState<PracticeMode>('random_live');

  const categories = ['All', 'Business & Tech', 'Case Studies', 'Social & Ethics', 'Economics & Finance'];

  const filteredTopics = SAMPLE_TOPICS.filter(t => {
    const matchesCategory = selectedCategory === 'All' || t.category === selectedCategory;
    return matchesCategory;
  });

  const activeTopic = filteredTopics[0] || SAMPLE_TOPICS[0];

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-8 py-8 space-y-10">
      
      {/* Header Banner */}
      <header className="max-w-3xl space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#4f46e5]/10 border border-[#4f46e5]/20 text-[#3525cd] text-xs font-semibold">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Placement & B-School Prep Mode</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-[#0f172a] tracking-tight">
          GROUP DISCUSSION ARENA
        </h1>
        <p className="text-base sm:text-lg text-[#64748b] leading-relaxed">
          Practice real placement-style discussions with AI candidate personas or live peers. Build instant confidence and get actionable communication diagnostics.
        </p>
      </header>

      {/* Bento Grid Top Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Main Hero Card */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#e5e7eb] p-6 sm:p-8 shadow-xs relative overflow-hidden flex flex-col justify-between group">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#3525cd]/10 via-[#4f46e5]/5 to-transparent rounded-full blur-2xl -mr-20 -mt-20 pointer-events-none"></div>
          
          <div className="space-y-6 relative z-10">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-xs font-bold text-[#3525cd] tracking-wider uppercase bg-[#4f46e5]/10 px-3 py-1 rounded-md">
                  FEATURED ARENA SESSION
                </span>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0f172a] mt-3">
                  READY FOR YOUR NEXT DISCUSSION?
                </h2>
                <p className="text-sm sm:text-base text-[#64748b] mt-1 max-w-xl">
                  Join a live simulated room with 3 AI participants, 2 minutes prep scratchpad, and real-time speaking time diagnostic.
                </p>
              </div>
            </div>

            {/* Session Specs Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-2">
              <div className="flex items-center gap-2.5 bg-[#f8f9fa] p-3 rounded-xl border border-[#e5e7eb]">
                <Users className="w-4 h-4 text-[#3525cd]" />
                <span className="text-xs sm:text-sm font-semibold text-[#0f172a]">4 Participants</span>
              </div>
              <div className="flex items-center gap-2.5 bg-[#f8f9fa] p-3 rounded-xl border border-[#e5e7eb]">
                <Shuffle className="w-4 h-4 text-[#3525cd]" />
                <span className="text-xs sm:text-sm font-semibold text-[#0f172a]">Randomized Topic</span>
              </div>
              <div className="flex items-center gap-2.5 bg-[#f8f9fa] p-3 rounded-xl border border-[#e5e7eb]">
                <Timer className="w-4 h-4 text-[#3525cd]" />
                <span className="text-xs sm:text-sm font-semibold text-[#0f172a]">2 Min Prep Scratchpad</span>
              </div>
              <div className="flex items-center gap-2.5 bg-[#f8f9fa] p-3 rounded-xl border border-[#e5e7eb]">
                <RotateCw className="w-4 h-4 text-[#3525cd]" />
                <span className="text-xs sm:text-sm font-semibold text-[#0f172a]">2 Debate Rounds</span>
              </div>
              <div className="flex items-center gap-2.5 bg-[#f8f9fa] p-3 rounded-xl border border-[#e5e7eb]">
                <Hourglass className="w-4 h-4 text-[#3525cd]" />
                <span className="text-xs sm:text-sm font-semibold text-[#0f172a]">1 Min Per Turn</span>
              </div>
              <div className="flex items-center gap-2.5 bg-[#f8f9fa] p-3 rounded-xl border border-[#e5e7eb]">
                <Bot className="w-4 h-4 text-[#3525cd]" />
                <span className="text-xs sm:text-sm font-semibold text-[#0f172a]">AI Live Diagnostics</span>
              </div>
            </div>
          </div>

          <div className="relative z-10 mt-8 pt-6 border-t border-[#e5e7eb] flex flex-wrap items-center justify-between gap-4">
            <button 
              onClick={() => onStartSession(activeTopic, selectedMode, selectedDifficulty)}
              className="bg-[#4f46e5] text-white font-semibold text-sm px-7 py-3.5 rounded-xl hover:bg-[#3525cd] transition-all shadow-md shadow-[#4f46e5]/25 flex items-center gap-3 group"
            >
              <span>Enter Practice Arena Now</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>

            <div className="flex items-center gap-3">
              <div className="flex -space-x-3">
                <img className="w-9 h-9 rounded-full border-2 border-white object-cover" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=100" alt="Avatar 1" />
                <img className="w-9 h-9 rounded-full border-2 border-white object-cover" src="https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=100" alt="Avatar 2" />
                <img className="w-9 h-9 rounded-full border-2 border-white object-cover" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=100" alt="Avatar 3" />
                <div className="w-9 h-9 rounded-full border-2 border-white bg-[#edeeef] flex items-center justify-center text-xs font-bold text-[#64748b]">
                  +18
                </div>
              </div>
              <span className="text-xs text-[#64748b] font-medium">18 Candidates active in matchmaking</span>
            </div>
          </div>
        </div>

        {/* Stats Column */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-[#e5e7eb] p-6 shadow-xs flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex justify-between items-center pb-4 border-b border-[#e5e7eb]">
              <h3 className="font-bold text-[#0f172a] text-lg flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-[#3525cd]" />
                YOUR GD PERFORMANCE
              </h3>
              <span className="text-xs font-semibold text-[#22c55e] bg-[#22c55e]/10 px-2 py-0.5 rounded-full">Top 15%</span>
            </div>

            <div className="space-y-3.5">
              <div className="flex justify-between items-center p-3.5 rounded-xl bg-[#f8f9fa] border border-[#e5e7eb]">
                <span className="text-xs sm:text-sm text-[#64748b] font-medium">Total Discussions</span>
                <span className="text-base sm:text-lg font-bold text-[#0f172a]">12</span>
              </div>

              <div className="flex justify-between items-center p-3.5 rounded-xl bg-[#f8f9fa] border border-[#e5e7eb]">
                <span className="text-xs sm:text-sm text-[#64748b] font-medium">Avg Evaluation Score</span>
                <div className="flex items-center gap-3">
                  <div className="w-20 h-2 bg-[#edeeef] rounded-full overflow-hidden">
                    <div className="h-full bg-[#3525cd] w-[78%]"></div>
                  </div>
                  <span className="text-base sm:text-lg font-bold text-[#3525cd]">78%</span>
                </div>
              </div>

              <div className="flex justify-between items-center p-3.5 rounded-xl bg-[#f8f9fa] border border-[#e5e7eb]">
                <span className="text-xs sm:text-sm text-[#64748b] font-medium">Best Competency</span>
                <span className="text-xs font-bold text-[#0058be] bg-[#d8e2ff] px-2.5 py-1 rounded-lg">
                  Logical Structure
                </span>
              </div>
            </div>
          </div>

          <button 
            onClick={onViewReport}
            className="w-full mt-6 bg-[#f3f4f5] hover:bg-[#edeeef] text-[#0f172a] font-semibold text-xs py-3 rounded-xl border border-[#e5e7eb] transition-colors flex items-center justify-center gap-2"
          >
            <BookOpen className="w-4 h-4 text-[#3525cd]" />
            <span>View Complete Intelligence Report</span>
          </button>
        </div>

      </div>

      {/* Practice Modes Section */}
      <section className="space-y-4">
        <h3 className="text-xl font-bold text-[#0f172a]">Select Practice Mode</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Mode 1 */}
          <div 
            onClick={() => setSelectedMode('random_live')}
            className={`bg-white rounded-2xl p-6 relative flex flex-col gap-4 cursor-pointer transition-all border-2 ${
              selectedMode === 'random_live' 
                ? 'border-[#3525cd] shadow-md shadow-[#4f46e5]/10' 
                : 'border-[#e5e7eb] hover:border-[#777587]'
            }`}
          >
            {selectedMode === 'random_live' && (
              <div className="absolute top-0 right-0 bg-[#3525cd] text-white text-[11px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Selected
              </div>
            )}
            <Globe2 className="w-8 h-8 text-[#3525cd]" />
            <div>
              <h4 className="font-bold text-lg text-[#0f172a]">Random Live GD</h4>
              <p className="text-xs text-[#64748b] mt-1 leading-relaxed">
                Connect with candidate personas simulating realistic placement room dynamics (Aggressive, Data-driven, Diplomatic).
              </p>
            </div>
            <div className="mt-auto pt-4 flex items-center justify-between border-t border-[#e5e7eb] text-xs font-semibold text-[#64748b]">
              <span>2-4 Mins Wait</span>
              <ArrowRight className="w-4 h-4 text-[#3525cd]" />
            </div>
          </div>

          {/* Mode 2 */}
          <div 
            onClick={() => setSelectedMode('friends')}
            className={`bg-white rounded-2xl p-6 relative flex flex-col gap-4 cursor-pointer transition-all border-2 ${
              selectedMode === 'friends' 
                ? 'border-[#3525cd] shadow-md shadow-[#4f46e5]/10' 
                : 'border-[#e5e7eb] hover:border-[#777587]'
            }`}
          >
            {selectedMode === 'friends' && (
              <div className="absolute top-0 right-0 bg-[#3525cd] text-white text-[11px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Selected
              </div>
            )}
            <UserPlus className="w-8 h-8 text-[#0058be]" />
            <div>
              <h4 className="font-bold text-lg text-[#0f172a]">Practice with Friends</h4>
              <p className="text-xs text-[#64748b] mt-1 leading-relaxed">
                Create a private room, share your room link, and practice with your batchmates with instant AI moderator scoring.
              </p>
            </div>
            <div className="mt-auto pt-4 flex items-center justify-between border-t border-[#e5e7eb] text-xs font-semibold text-[#64748b]">
              <span>Private Room Code</span>
              <ArrowRight className="w-4 h-4 text-[#0058be]" />
            </div>
          </div>

          {/* Mode 3 */}
          <div 
            onClick={() => setSelectedMode('ai_simulation')}
            className={`bg-white rounded-2xl p-6 relative flex flex-col gap-4 cursor-pointer transition-all border-2 ${
              selectedMode === 'ai_simulation' 
                ? 'border-[#3525cd] shadow-md shadow-[#4f46e5]/10' 
                : 'border-[#e5e7eb] hover:border-[#777587]'
            }`}
          >
            {selectedMode === 'ai_simulation' && (
              <div className="absolute top-0 right-0 bg-[#3525cd] text-white text-[11px] font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Selected
              </div>
            )}
            <PlayCircle className="w-8 h-8 text-[#571ac0]" />
            <div>
              <h4 className="font-bold text-lg text-[#0f172a]">Solo AI Drill Simulation</h4>
              <p className="text-xs text-[#64748b] mt-1 leading-relaxed">
                Practice 1-on-1 or multi-bot drills focused on specific skills: handling interruptions, concluding discussions, or presenting data.
              </p>
            </div>
            <div className="mt-auto pt-4 flex items-center justify-between border-t border-[#e5e7eb] text-xs font-semibold text-[#64748b]">
              <span>Instant Launch</span>
              <ArrowRight className="w-4 h-4 text-[#571ac0]" />
            </div>
          </div>

        </div>
      </section>

      {/* Topic Selection & Filter Section */}
      <section className="space-y-6 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#e5e7eb]">
          <div>
            <h3 className="text-xl font-bold text-[#0f172a]">Browse GD Topics & Scenarios</h3>
            <p className="text-xs text-[#64748b]">Select a topic or launch with the recommended placement topic.</p>
          </div>

          {/* Difficulty Filter */}
          <div className="flex items-center gap-2 bg-[#f3f4f5] p-1 rounded-xl border border-[#e5e7eb]">
            <SlidersHorizontal className="w-4 h-4 text-[#64748b] ml-2" />
            {(['Beginner', 'Intermediate', 'Advanced'] as DifficultyLevel[]).map(diff => (
              <button
                key={diff}
                onClick={() => setSelectedDifficulty(diff)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  selectedDifficulty === diff 
                    ? 'bg-white text-[#3525cd] shadow-xs' 
                    : 'text-[#64748b] hover:text-[#0f172a]'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`text-xs font-medium px-4 py-2 rounded-full whitespace-nowrap transition-all ${
                selectedCategory === cat 
                  ? 'bg-[#3525cd] text-white shadow-xs' 
                  : 'bg-white text-[#64748b] hover:bg-[#f3f4f5] border border-[#e5e7eb]'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Topic Cards List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTopics.map((topic) => (
            <div 
              key={topic.id}
              className="bg-white rounded-2xl border border-[#e5e7eb] p-6 space-y-4 hover:border-[#4f46e5] transition-all hover:shadow-md flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#3525cd] bg-[#4f46e5]/10 px-2.5 py-1 rounded-md">
                    {topic.category}
                  </span>
                  <span className="text-xs font-semibold text-[#64748b] bg-[#f3f4f5] px-2.5 py-1 rounded-md flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#22c55e]" />
                    {topic.difficulty}
                  </span>
                </div>
                
                <h4 className="text-lg font-bold text-[#0f172a] leading-snug">
                  {topic.title}
                </h4>
                
                <p className="text-xs text-[#64748b] leading-relaxed line-clamp-2">
                  {topic.context}
                </p>
              </div>

              <div className="pt-4 border-t border-[#e5e7eb] flex items-center justify-between">
                <span className="text-xs text-[#64748b]">
                  {topic.keyStats.length} Key Facts • {topic.keyDimensions.length} Perspectives
                </span>
                <button
                  onClick={() => onStartSession(topic, selectedMode, selectedDifficulty)}
                  className="bg-[#3525cd] text-white text-xs font-semibold px-4 py-2.5 rounded-xl hover:bg-[#4f46e5] transition-colors flex items-center gap-1.5"
                >
                  <span>Select & Launch</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

    </div>
  );
};
