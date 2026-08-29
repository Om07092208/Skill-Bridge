import { useState } from 'react';
import type { Stage, GDTopic, Stance, PrepNote, Participant, TranscriptMessage, DifficultyLevel, PracticeMode } from './types/gd';
import { SAMPLE_TOPICS, INITIAL_AI_PARTICIPANTS } from './data/mockTopics';

import { Navigation } from './components/Navigation';
import { ArenaHome } from './components/ArenaHome';
import { Matchmaking } from './components/Matchmaking';
import { TopicReveal } from './components/TopicReveal';
import { ThinkingTime } from './components/ThinkingTime';
import { LiveDiscussionRoom } from './components/LiveDiscussionRoom';
import { SessionComplete } from './components/SessionComplete';
import { PerformanceReport } from './components/PerformanceReport';

export function App() {
  const [currentStage, setStage] = useState<Stage>('arena');
  const [selectedTopic, setSelectedTopic] = useState<GDTopic>(SAMPLE_TOPICS[0]);
  const [selectedStance, setSelectedStance] = useState<Stance>('FOR');
  const [prepNote, setPrepNote] = useState<PrepNote>({
    openingStatement: `"Greetings everyone. On the topic '${SAMPLE_TOPICS[0].title}', I firmly stand in support of the motion because generative AI automates repetitive tasks..."`,
    mainPoints: [SAMPLE_TOPICS[0].suggestedPointsFor[0], SAMPLE_TOPICS[0].keyStats[0]],
    concludingThought: 'A human-in-the-loop framework ensures maximum productivity with minimal disruption.'
  });
  const [participants, setParticipants] = useState<Participant[]>(INITIAL_AI_PARTICIPANTS);
  const [sessionTranscript, setSessionTranscript] = useState<TranscriptMessage[]>([]);
  const [audioEnabled, setAudioEnabled] = useState<boolean>(true);

  // Stage Transitions
  const handleStartSession = (topic: GDTopic, _mode: PracticeMode, _difficulty: DifficultyLevel) => {
    setSelectedTopic(topic);
    setStage('matchmaking');
  };

  const handleMatchComplete = (matchedParticipants: Participant[]) => {
    setParticipants(matchedParticipants);
    setStage('topic_reveal');
  };

  const handleProceedToPrep = (stance: Stance) => {
    setSelectedStance(stance);
    setStage('prep');
  };

  const handleProceedToDiscussion = (userPrepNote: PrepNote) => {
    setPrepNote(userPrepNote);
    setStage('discussion');
  };

  const handleFinishDiscussion = (finalTranscript: TranscriptMessage[], finalParticipants: Participant[]) => {
    setSessionTranscript(finalTranscript);
    setParticipants(finalParticipants);
    setStage('session_complete');
  };

  const handleRestart = () => {
    setStage('arena');
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fa] text-[#0f172a]">
      {/* Navigation Header */}
      <Navigation
        currentStage={currentStage}
        setStage={setStage}
        audioEnabled={audioEnabled}
        setAudioEnabled={setAudioEnabled}
      />

      {/* Dynamic Stage Rendering */}
      <main className="flex-grow">
        {currentStage === 'arena' && (
          <ArenaHome
            onStartSession={handleStartSession}
            onViewReport={() => setStage('report')}
          />
        )}

        {currentStage === 'matchmaking' && (
          <Matchmaking
            topic={selectedTopic}
            onMatchComplete={handleMatchComplete}
          />
        )}

        {currentStage === 'topic_reveal' && (
          <TopicReveal
            topic={selectedTopic}
            onProceedToPrep={handleProceedToPrep}
          />
        )}

        {currentStage === 'prep' && (
          <ThinkingTime
            topic={selectedTopic}
            stance={selectedStance}
            onProceedToDiscussion={handleProceedToDiscussion}
          />
        )}

        {currentStage === 'discussion' && (
          <LiveDiscussionRoom
            topic={selectedTopic}
            stance={selectedStance}
            prepNote={prepNote}
            initialParticipants={participants}
            audioEnabled={audioEnabled}
            onFinishDiscussion={handleFinishDiscussion}
          />
        )}

        {currentStage === 'session_complete' && (
          <SessionComplete
            onViewReport={() => setStage('report')}
            onRestart={handleRestart}
          />
        )}

        {currentStage === 'report' && (
          <PerformanceReport
            topic={selectedTopic}
            transcript={sessionTranscript.length > 0 ? sessionTranscript : [
              {
                id: 'demo-1',
                speakerId: 'ai-1',
                speakerName: 'Rohan Sharma',
                speakerAvatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150',
                timestamp: '00:15',
                text: 'I believe Generative AI boosts enterprise productivity by eliminating low-level manual tasks.',
                tag: 'Initiated Topic'
              },
              {
                id: 'demo-2',
                speakerId: 'user-0',
                speakerName: 'You (Candidate)',
                speakerAvatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
                timestamp: '00:45',
                text: `Greetings everyone. On the topic '${selectedTopic.title}', I support the motion because 78% of Fortune 500 companies have deployed generative AI to scale operations.`,
                tag: 'User Entry'
              },
              {
                id: 'demo-3',
                speakerId: 'ai-2',
                speakerName: 'Priya Nair',
                speakerAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=150',
                timestamp: '01:20',
                text: 'While productivity gains are real, Goldman Sachs estimates 300 million jobs could be disrupted. Reskilling must be prioritized.',
                tag: 'Brought Data'
              }
            ]}
            onRestart={handleRestart}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-[#e5e7eb] py-6 text-center text-xs text-[#64748b] print:hidden">
        <div className="max-w-[1440px] mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            © 2026 <span className="font-bold text-[#0f172a]">SkillBridge AI</span>. Group Discussion & Career Intelligence Platform.
          </div>
          <div className="flex items-center gap-4">
            <button onClick={() => setStage('arena')} className="hover:text-[#3525cd]">GD Arena</button>
            <button onClick={() => setStage('report')} className="hover:text-[#3525cd]">Performance Diagnostics</button>
            <span className="text-[#3525cd] bg-[#4f46e5]/10 px-2 py-0.5 rounded font-semibold">Pro License</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;
