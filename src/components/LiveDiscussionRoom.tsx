import React, { useState, useEffect, useRef, useCallback } from 'react';
import type { GDTopic, Participant, TranscriptMessage, PrepNote, Stance } from '../types/gd';
import { 
  Mic, MicOff, Hand, MessageSquare, Timer, Sparkles, Send, 
  BookOpen, CheckCircle, Flame, Activity
} from 'lucide-react';

interface LiveDiscussionRoomProps {
  topic: GDTopic;
  stance: Stance;
  prepNote: PrepNote;
  initialParticipants: Participant[];
  audioEnabled: boolean;
  onFinishDiscussion: (transcript: TranscriptMessage[], participants: Participant[]) => void;
}

export const LiveDiscussionRoom: React.FC<LiveDiscussionRoomProps> = ({
  topic,
  prepNote,
  initialParticipants,
  audioEnabled,
  onFinishDiscussion
}) => {
  const [participants, setParticipants] = useState<Participant[]>(initialParticipants);
  const [transcript, setTranscript] = useState<TranscriptMessage[]>([]);
  const [isMicActive, setIsMicActive] = useState<boolean>(false);
  const [userTextInput, setUserTextInput] = useState<string>('');
  const [sessionTimeLeft, setSessionTimeLeft] = useState<number>(240); // 4 min session
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [userHandRaised, setUserHandRaised] = useState<boolean>(false);
  const [showPrepNotes, setShowPrepNotes] = useState<boolean>(false);
  const [coachHint, setCoachHint] = useState<string>(
    'Tip: Initiate the discussion with your opening stance to establish group leadership!'
  );

  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Helper to add speech synthesis
  const speakText = useCallback((text: string, voiceGender?: 'male' | 'female') => {
    if (!audioEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        if (voiceGender === 'female') {
          const femaleVoice = voices.find(v => v.name.includes('Female') || v.name.includes('Google UK English Female') || v.name.includes('Zira'));
          if (femaleVoice) utterance.voice = femaleVoice;
        } else {
          const maleVoice = voices.find(v => v.name.includes('Male') || v.name.includes('Google UK English Male') || v.name.includes('David'));
          if (maleVoice) utterance.voice = maleVoice;
        }
      }
      utterance.rate = 1.05;
      window.speechSynthesis.speak(utterance);
    } catch (e) {
      console.warn('Speech synthesis unavailable', e);
    }
  }, [audioEnabled]);

  // Initial welcome message from AI Moderator
  useEffect(() => {
    const welcomeMsg: TranscriptMessage = {
      id: 'msg-0',
      speakerId: 'mod-0',
      speakerName: 'AI Moderator System',
      speakerAvatar: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=150',
      timestamp: '00:01',
      text: `Welcome participants. The topic for today is "${topic.title}". The floor is now open for opening statements.`,
      tag: 'Initiated Topic'
    };
    setTranscript([welcomeMsg]);
  }, [topic.title]);

  // Auto-scroll transcript
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  // Main session timer
  useEffect(() => {
    if (sessionTimeLeft <= 0) {
      onFinishDiscussion(transcript, participants);
      return;
    }
    const timer = setInterval(() => {
      setSessionTimeLeft(prev => prev - 1);
      
      // Update speaking time for active speaker
      if (activeSpeakerId) {
        setParticipants(prev => prev.map(p => {
          if (p.id === activeSpeakerId) {
            return { ...p, speakingTimeSeconds: p.speakingTimeSeconds + 1 };
          }
          return p;
        }));
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionTimeLeft, activeSpeakerId, transcript, participants, onFinishDiscussion]);

  // Simulated AI turn-taking generator
  useEffect(() => {
    // Every 8-14 seconds, an AI participant speaks if user is not actively holding mic
    if (isMicActive) return;

    const aiSpeechScript = [
      {
        speakerId: 'ai-[#id]',
        aiIndex: 0,
        text: `Building on the moderator's introduction, I believe ${topic.suggestedPointsFor[0]} Furthermore, the data suggests rapid adoption across enterprises.`,
        tag: 'Initiated Topic' as const,
        hint: 'Good point by Rohan! Counter or support him with your custom stats.'
      },
      {
        speakerId: 'ai-[#id]',
        aiIndex: 1,
        text: `While Rohan makes a strong case, we must look at the numbers. ${topic.keyStats[0]} If we ignore structural job displacement, we miss half the problem.`,
        tag: 'Brought Data' as const,
        hint: 'Priya brought concrete data! Interject now to offer a balanced synthesis.'
      },
      {
        speakerId: 'ai-[#id]',
        aiIndex: 2,
        text: `I agree with Priya's emphasis on balance. Instead of viewing this as binary, a hybrid human-in-the-loop framework ensures productivity without mass disruption.`,
        tag: 'Consensus Built' as const,
        hint: 'Alex is building consensus! Now is a great time to present your concluding thought.'
      }
    ];

    let scriptIdx = 0;
    const interval = setInterval(() => {
      if (isMicActive) return;

      const scriptItem = aiSpeechScript[scriptIdx % aiSpeechScript.length];
      const targetAI = participants.find(p => !p.isUser && p.id === `ai-${(scriptIdx % 3) + 1}`);

      if (targetAI) {
        setActiveSpeakerId(targetAI.id);
        
        // Update active speaker visually
        setParticipants(prev => prev.map(p => ({
          ...p,
          isSpeaking: p.id === targetAI.id
        })));

        // Add transcript entry
        const elapsedSecs = 240 - sessionTimeLeft;
        const mins = Math.floor(elapsedSecs / 60);
        const secs = elapsedSecs % 60;
        const timestampStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

        const newMsg: TranscriptMessage = {
          id: `msg-${Date.now()}`,
          speakerId: targetAI.id,
          speakerName: targetAI.name,
          speakerAvatar: targetAI.avatar,
          timestamp: timestampStr,
          text: scriptItem.text,
          tag: scriptItem.tag
        };

        setTranscript(prev => [...prev, newMsg]);
        setCoachHint(scriptItem.hint);
        speakText(scriptItem.text, targetAI.voiceGender);

        // Turn off speaker after 5s
        setTimeout(() => {
          setParticipants(prev => prev.map(p => ({ ...p, isSpeaking: false })));
          setActiveSpeakerId(null);
        }, 5000);
      }

      scriptIdx++;
    }, 11000);

    return () => clearInterval(interval);
  }, [isMicActive, participants, sessionTimeLeft, topic, speakText]);

  // Handle User Speech Submission (via Mic toggle or Text send)
  const handleUserSpeak = (text: string) => {
    if (!text.trim()) return;

    const elapsedSecs = 240 - sessionTimeLeft;
    const mins = Math.floor(elapsedSecs / 60);
    const secs = elapsedSecs % 60;
    const timestampStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;

    const userParticipant = participants.find(p => p.isUser);

    const userMsg: TranscriptMessage = {
      id: `msg-${Date.now()}`,
      speakerId: userParticipant?.id || 'user-0',
      speakerName: 'You (Candidate)',
      speakerAvatar: userParticipant?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=150',
      timestamp: timestampStr,
      text: text.trim(),
      tag: 'User Entry'
    };

    setTranscript(prev => [...prev, userMsg]);
    setUserTextInput('');
    setUserHandRaised(false);
    setCoachHint('Excellent contribution! You displayed strong initiative and clear reasoning.');

    // Pulse speaking indicator for user
    setParticipants(prev => prev.map(p => p.isUser ? { ...p, isSpeaking: true } : p));
    setActiveSpeakerId('user-0');

    setTimeout(() => {
      setParticipants(prev => prev.map(p => p.isUser ? { ...p, isSpeaking: false } : p));
      setActiveSpeakerId(null);
    }, 4000);
  };

  const totalSpeakingSecs = participants.reduce((acc, p) => acc + p.speakingTimeSeconds, 0) || 1;

  const formatSessionTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      
      {/* Top Header Controls Bar */}
      <div className="bg-white rounded-2xl border border-[#e5e7eb] p-4 flex flex-wrap items-center justify-between gap-4 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse"></div>
          <div>
            <h3 className="font-bold text-sm text-[#0f172a] flex items-center gap-2">
              <span>LIVE DISCUSSION ARENA</span>
              <span className="text-[11px] font-semibold text-[#3525cd] bg-[#4f46e5]/10 px-2.5 py-0.5 rounded-full">
                4 Candidates
              </span>
            </h3>
            <p className="text-xs text-[#64748b] truncate max-w-md">{topic.title}</p>
          </div>
        </div>

        {/* Live Timer & Room Balance */}
        <div className="flex items-center gap-4">
          <div className="bg-[#f3f4f5] px-4 py-2 rounded-xl border border-[#e5e7eb] flex items-center gap-2">
            <Timer className="w-4 h-4 text-[#3525cd]" />
            <span className="text-xs text-[#64748b] font-medium">Session Time:</span>
            <span className="text-lg font-bold text-[#3525cd] font-mono">{formatSessionTime(sessionTimeLeft)}</span>
          </div>

          <button
            onClick={() => setShowPrepNotes(!showPrepNotes)}
            className="bg-[#f3f4f5] hover:bg-[#edeeef] text-[#0f172a] text-xs font-semibold px-3.5 py-2 rounded-xl border border-[#e5e7eb] flex items-center gap-1.5 transition-colors"
          >
            <BookOpen className="w-4 h-4 text-[#3525cd]" />
            <span>{showPrepNotes ? 'Hide Scratchpad' : 'View Scratchpad'}</span>
          </button>

          <button
            onClick={() => onFinishDiscussion(transcript, participants)}
            className="bg-[#ba1a1a] hover:bg-red-700 text-white font-semibold text-xs px-5 py-2.5 rounded-xl transition-all shadow-xs flex items-center gap-1.5"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Finish Discussion & Submit</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Speaker Video Tiles vs Live Transcript & Coach */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: 4 Candidate Speaker Cards */}
        <div className="lg:col-span-7 space-y-6">
          
          <div className="grid grid-cols-2 gap-4">
            {participants.map(participant => (
              <div
                key={participant.id}
                className={`bg-white rounded-2xl border p-4 flex flex-col items-center text-center space-y-3 relative transition-all duration-300 ${
                  participant.isSpeaking
                    ? 'border-[#3525cd] ring-4 ring-[#4f46e5]/20 shadow-lg'
                    : 'border-[#e5e7eb]'
                }`}
              >
                {/* Active Speaker Badge */}
                {participant.isSpeaking && (
                  <div className="absolute top-3 left-3 bg-[#3525cd] text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                    <Activity className="w-3 h-3" /> Speaking
                  </div>
                )}

                {/* Hand Raised Badge */}
                {participant.hasRaisedHand && (
                  <div className="absolute top-3 right-3 bg-[#eab308] text-white p-1 rounded-full animate-bounce">
                    <Hand className="w-3.5 h-3.5" />
                  </div>
                )}

                <div className="relative mt-2">
                  <img
                    src={participant.avatar}
                    alt={participant.name}
                    className={`w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 ${
                      participant.isSpeaking ? 'border-[#3525cd] scale-105' : 'border-[#e5e7eb]'
                    }`}
                  />
                  
                  {/* Speech Wave Audio Visualizer Simulation */}
                  {participant.isSpeaking && (
                    <div className="absolute -inset-2 rounded-full border-2 border-[#4f46e5] animate-pulse-ring pointer-events-none"></div>
                  )}
                </div>

                <div>
                  <h4 className="font-bold text-sm sm:text-base text-[#0f172a] flex items-center justify-center gap-1">
                    <span>{participant.name}</span>
                    {participant.isUser && <span className="text-xs font-semibold text-[#3525cd] bg-[#4f46e5]/10 px-1.5 py-0.5 rounded-md">(You)</span>}
                  </h4>
                  <p className="text-xs text-[#3525cd] font-semibold mt-0.5">{participant.role}</p>
                </div>

                {/* Speaking Time Bar */}
                <div className="w-full pt-2 border-t border-[#e5e7eb] flex items-center justify-between text-[11px] font-semibold text-[#64748b]">
                  <span>Speaking Time</span>
                  <span className="font-mono text-[#0f172a]">{participant.speakingTimeSeconds}s</span>
                </div>
              </div>
            ))}
          </div>

          {/* User Prep Notes Drawer Modal if toggled */}
          {showPrepNotes && (
            <div className="bg-[#4f46e5]/5 rounded-2xl border border-[#4f46e5]/20 p-5 space-y-3">
              <div className="flex justify-between items-center text-xs font-bold text-[#3525cd] uppercase tracking-wider">
                <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> Your Prep Scratchpad Notes</span>
                <button onClick={() => setShowPrepNotes(false)} className="text-[#64748b] hover:text-[#0f172a]">Close</button>
              </div>
              <div className="text-xs text-[#0f172a] space-y-2 bg-white p-3 rounded-xl border border-[#e5e7eb]">
                <p><strong>Opening Statement:</strong> {prepNote.openingStatement}</p>
                <div>
                  <strong>Key Points:</strong>
                  <ul className="list-disc pl-4 mt-1 space-y-1">
                    {prepNote.mainPoints.map((pt, i) => <li key={i}>{pt}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* User Live Mic & Speech Controls Box */}
          <div className="bg-white rounded-2xl border border-[#e5e7eb] p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-[#0f172a] uppercase tracking-wider">
                <Flame className="w-4 h-4 text-[#3525cd]" />
                <span>Your Floor Intervention Controls</span>
              </div>
              <span className="text-xs text-[#64748b]">
                {isMicActive ? 'Mic Active — Speaking to Room' : 'Click Mic to Speak'}
              </span>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={() => setIsMicActive(!isMicActive)}
                className={`px-5 py-3 rounded-xl font-bold text-xs flex items-center gap-2 transition-all shadow-xs ${
                  isMicActive 
                    ? 'bg-red-500 text-white animate-pulse' 
                    : 'bg-[#3525cd] text-white hover:bg-[#4f46e5]'
                }`}
              >
                {isMicActive ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                <span>{isMicActive ? 'Mute Mic' : 'Turn On Mic (Push to Speak)'}</span>
              </button>

              <button
                onClick={() => setUserHandRaised(!userHandRaised)}
                className={`px-4 py-3 rounded-xl font-semibold text-xs flex items-center gap-2 transition-all border ${
                  userHandRaised 
                    ? 'bg-[#eab308] text-white border-transparent' 
                    : 'bg-[#f8f9fa] text-[#0f172a] border-[#e5e7eb] hover:bg-[#edeeef]'
                }`}
              >
                <Hand className="w-4 h-4" />
                <span>{userHandRaised ? 'Hand Raised' : 'Raise Hand'}</span>
              </button>

              <button
                onClick={() => handleUserSpeak(prepNote.openingStatement)}
                className="px-4 py-3 rounded-xl font-semibold text-xs bg-[#f3f4f5] hover:bg-[#edeeef] text-[#3525cd] border border-[#e5e7eb] flex items-center gap-1.5 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                <span>Insert Opening Hook</span>
              </button>
            </div>

            {/* Live Text Response Input Fallback */}
            <div className="flex items-center gap-2 pt-2">
              <input
                type="text"
                value={userTextInput}
                onChange={(e) => setUserTextInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleUserSpeak(userTextInput)}
                placeholder="Type your response or contribution into live discussion stream..."
                className="flex-grow text-xs sm:text-sm p-3 rounded-xl border border-[#e5e7eb] focus:border-[#3525cd] outline-none"
              />
              <button
                onClick={() => handleUserSpeak(userTextInput)}
                className="bg-[#3525cd] text-white font-semibold text-xs px-5 py-3 rounded-xl hover:bg-[#4f46e5] transition-colors flex items-center gap-1.5"
              >
                <Send className="w-4 h-4" />
                <span>Speak</span>
              </button>
            </div>

          </div>

        </div>

        {/* Right Column: Live Transcript Stream & AI Coach Hints */}
        <div className="lg:col-span-5 space-y-5">
          
          {/* Live AI Coach Tip Widget */}
          <div className="bg-[#3525cd] text-white rounded-2xl p-4 shadow-md flex items-start gap-3">
            <div className="p-2 rounded-xl bg-white/10 shrink-0">
              <Sparkles className="w-5 h-5 text-yellow-300" />
            </div>
            <div>
              <span className="text-[11px] font-bold tracking-wider uppercase opacity-80">Real-Time AI Coach Hint</span>
              <p className="text-xs leading-relaxed mt-0.5 font-medium">{coachHint}</p>
            </div>
          </div>

          {/* Speaking Airtime Distribution Bar */}
          <div className="bg-white rounded-2xl border border-[#e5e7eb] p-4 space-y-2 shadow-xs">
            <div className="flex justify-between items-center text-xs font-bold text-[#0f172a]">
              <span>Airtime Distribution</span>
              <span className="text-[#3525cd]">Your Airtime: {Math.round((participants.find(p => p.isUser)?.speakingTimeSeconds || 0) / totalSpeakingSecs * 100)}%</span>
            </div>

            <div className="w-full h-3 bg-[#edeeef] rounded-full overflow-hidden flex">
              {participants.map((p, idx) => {
                const pct = Math.round((p.speakingTimeSeconds / totalSpeakingSecs) * 100);
                const colors = ['bg-[#3525cd]', 'bg-[#2170e4]', 'bg-[#6f3dd9]', 'bg-[#22c55e]'];
                return (
                  <div
                    key={p.id}
                    className={`h-full ${colors[idx % colors.length]} transition-all duration-500`}
                    style={{ width: `${pct}%` }}
                    title={`${p.name}: ${pct}%`}
                  ></div>
                );
              })}
            </div>
          </div>

          {/* Live Transcript Stream Card */}
          <div className="bg-[#ffffff] rounded-2xl border border-[#e5e7eb] p-5 shadow-xs space-y-4 flex flex-col justify-between h-[420px]">
            <div className="flex justify-between items-center pb-3 border-b border-[#e5e7eb]">
              <h4 className="font-bold text-sm text-[#0f172a] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-[#3525cd]" />
                LIVE TRANSCRIPT STREAM
              </h4>
              <span className="text-xs text-[#64748b] font-mono">{transcript.length} Messages</span>
            </div>

            {/* Scrollable Transcript List */}
            <div className="flex-grow overflow-y-auto space-y-4 pr-1">
              {transcript.map((msg) => (
                <div key={msg.id} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
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
                  
                  <div className="bg-[#f8f9fa] p-3 rounded-xl text-xs text-[#0f172a] leading-relaxed border border-[#e5e7eb]">
                    {msg.text}
                  </div>
                </div>
              ))}
              <div ref={transcriptEndRef} />
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
