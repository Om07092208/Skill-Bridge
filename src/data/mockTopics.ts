import type { GDTopic, Participant } from '../types/gd';

export const SAMPLE_TOPICS: GDTopic[] = [
  {
    id: 'topic-1',
    title: 'Is Generative AI a Threat or a Catalyst for Future Job Markets?',
    category: 'Business & Tech',
    difficulty: 'Advanced',
    context: 'Rapid advancements in Large Language Models (LLMs) and generative media are reshaping knowledge work, software development, creative industries, and customer operations worldwide.',
    keyDimensions: [
      'Economic Impact & Job Displacement vs Creation',
      'Upskilling Requirements & Education Readiness',
      'Ethical AI Deployment & Corporate Productivity Gains'
    ],
    suggestedPointsFor: [
      'Generative AI automates repetitive tasks, allowing professionals to focus on high-value strategy and creative problem solving.',
      'Historically, technological shifts (steam engine, internet) created more net jobs than they eliminated by spawning new industries.',
      'SMEs can compete with enterprise giants by leveraging AI to scale operations without massive capital expenditure.'
    ],
    suggestedPointsAgainst: [
      'The speed of AI adoption outpaces traditional workforce retraining capabilities, risking structural unemployment for mid-tier workers.',
      'Entry-level roles (coding, copywriting, data entry) are disappearing, severing the traditional apprenticeship bridge for fresh graduates.',
      'Wealth and productivity gains concentrate heavily in tech monopolies, worsening socio-economic inequality.'
    ],
    suggestedPointsNeutral: [
      'AI is neither purely a threat nor a savior; its net impact depends on proactive government regulation and corporate reskilling investments.',
      'A human-in-the-loop paradigm will become standard—replacing individuals who do not use AI with those who effectively leverage AI tools.'
    ],
    keyStats: [
      '78% of Fortune 500 companies have deployed generative AI in at least one business unit.',
      'Goldman Sachs estimates 300 million full-time jobs could be exposed to automation, while boosting global GDP by 7%.',
      'Demand for AI literacy skills has surged by 450% in job postings over the last 18 months.'
    ]
  },
  {
    id: 'topic-2',
    title: 'CBDCs vs Cryptocurrencies: Defining the Future of Monetary Governance',
    category: 'Economics & Finance',
    difficulty: 'Advanced',
    context: 'Central Banks globally are piloting Central Bank Digital Currencies (CBDCs) as sovereign digital money, positioning them against decentralized cryptocurrencies like Bitcoin.',
    keyDimensions: [
      'Financial Stability & Centralized Monetary Control',
      'Privacy vs Anti-Money Laundering (AML) Compliance',
      'Cross-Border Settlement Speed & Transaction Costs'
    ],
    suggestedPointsFor: [
      'CBDCs guarantee sovereign backing and zero credit risk, facilitating instant, low-cost cross-border payments.',
      'Decentralized crypto assets suffer from extreme volatility and lack regulatory protections for retail investors.'
    ],
    suggestedPointsAgainst: [
      'CBDCs give governments unprecedented financial surveillance and programmable control over citizens\' spending.',
      'Cryptocurrencies enable financial inclusion and permissionless censorship-resistant economic participation.'
    ],
    suggestedPointsNeutral: [
      'A hybrid ecosystem is likely: CBDCs for mainstream commerce and taxation, alongside regulated decentralized protocols for decentralized finance.'
    ],
    keyStats: [
      '130+ countries representing 98% of global GDP are currently exploring or testing CBDCs.',
      'Cross-border remittance fees average 6.2%, which digital currencies could reduce to under 1%.'
    ]
  },
  {
    id: 'topic-3',
    title: 'Work From Home vs Return to Office: Optimizing Organizational Performance',
    category: 'Case Studies',
    difficulty: 'Intermediate',
    context: 'Post-pandemic corporate policy is divided: tech giants demand mandatory 3-day office returns while employees push for permanent flexibility.',
    keyDimensions: [
      'Collaboration & Mentorship for Early Career Professionals',
      'Employee Burnout, Commute Costs, & Work-Life Integration',
      'Real Estate Overhead vs Talent Acquisition Reach'
    ],
    suggestedPointsFor: [
      'In-person collaboration fosters spontaneous innovation, informal trust, and crucial tacit learning for junior staff.',
      'Physical office boundaries prevent constant work-life blur and digital fatigue.'
    ],
    suggestedPointsAgainst: [
      'Remote work eliminates long commutes, increasing employee satisfaction and expanding talent access beyond major metro hubs.',
      'Companies save up to $11,000 per employee annually in reduced real estate and facility overhead.'
    ],
    suggestedPointsNeutral: [
      'Structured hybrid models—with designated collaborative anchor days—provide the ideal balance of team cohesion and individual focus time.'
    ],
    keyStats: [
      '68% of knowledge workers prefer hybrid models over full 5-day office presence.',
      'Companies offering remote flexibility experience 33% lower voluntary turnover rates.'
    ]
  }
];

export const INITIAL_AI_PARTICIPANTS: Participant[] = [
  {
    id: 'ai-1',
    name: 'Rohan Sharma',
    role: 'Strategic Thinker',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250',
    personaType: 'aggressive',
    isUser: false,
    isSpeaking: false,
    hasRaisedHand: false,
    speakingTimeSeconds: 42,
    voiceGender: 'male'
  },
  {
    id: 'ai-2',
    name: 'Priya Nair',
    role: 'Data Synthesizer',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=250',
    personaType: 'data',
    isUser: false,
    isSpeaking: false,
    hasRaisedHand: false,
    speakingTimeSeconds: 58,
    voiceGender: 'female'
  },
  {
    id: 'ai-3',
    name: 'Alex Chen',
    role: 'Diplomatic Facilitator',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=250',
    personaType: 'diplomatic',
    isUser: false,
    isSpeaking: false,
    hasRaisedHand: false,
    speakingTimeSeconds: 35,
    voiceGender: 'male'
  },
  {
    id: 'user-0',
    name: 'You (Candidate)',
    role: 'Active Participant',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&q=80&w=250',
    personaType: 'user',
    isUser: true,
    isSpeaking: false,
    hasRaisedHand: false,
    speakingTimeSeconds: 48
  }
];
