export type Stage = 
  | 'arena'
  | 'matchmaking'
  | 'topic_reveal'
  | 'prep'
  | 'discussion'
  | 'session_complete'
  | 'report';

export type TopicCategory = 
  | 'Business & Tech'
  | 'Case Studies'
  | 'Social & Ethics'
  | 'Geopolitics'
  | 'Economics & Finance';

export type DifficultyLevel = 'Beginner' | 'Intermediate' | 'Advanced';

export type PracticeMode = 'random_live' | 'friends' | 'ai_simulation';

export type Stance = 'FOR' | 'AGAINST' | 'NEUTRAL';

export interface GDTopic {
  id: string;
  title: string;
  category: TopicCategory;
  difficulty: DifficultyLevel;
  context: string;
  keyDimensions: string[];
  suggestedPointsFor: string[];
  suggestedPointsAgainst: string[];
  suggestedPointsNeutral: string[];
  keyStats: string[];
}

export interface Participant {
  id: string;
  name: string;
  role: string;
  avatar: string;
  personaType: 'aggressive' | 'diplomatic' | 'data' | 'user';
  isUser: boolean;
  isSpeaking: boolean;
  hasRaisedHand: boolean;
  speakingTimeSeconds: number;
  voiceGender?: 'male' | 'female';
}

export interface TranscriptMessage {
  id: string;
  speakerId: string;
  speakerName: string;
  speakerAvatar: string;
  timestamp: string;
  text: string;
  tag?: 'Initiated Topic' | 'Brought Data' | 'Interrupted' | 'Consensus Built' | 'Counter Argument' | 'User Entry' | 'Missed Opportunity';
}

export interface PrepNote {
  openingStatement: string;
  mainPoints: string[];
  concludingThought: string;
}

export interface GDReport {
  overallScore: number;
  percentile: number;
  grade: string;
  competencies: {
    communication: number;
    logic: number;
    leadership: number;
    listening: number;
    fluency: number;
  };
  keyHighlights: {
    type: 'strength' | 'improvement';
    title: string;
    desc: string;
  }[];
  aiRoadmap: {
    title: string;
    description: string;
    actionItem: string;
  }[];
}
