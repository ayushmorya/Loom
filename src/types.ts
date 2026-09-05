export type SentimentType =
  | 'Reflective'
  | 'Optimistic'
  | 'Stressed'
  | 'Curious'
  | 'Melancholy'
  | 'Grounded'
  | 'Vulnerable'
  | 'Determined'
  | 'Uncertain';

export interface UserProfile {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  createdAt: string;
  lastLoginAt: string;
}

export interface JournalEntry {
  id: string;
  title: string;
  summary?: string;
  sentiment?: SentimentType | string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
}

export interface JournalMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
}

export interface InsightsResult {
  title: string;
  sentiment: SentimentType | string;
  tags: string[];
  summary: string;
}

export interface FutureCapsule {
  id: string;
  userId: string;
  title: string;
  message: string;
  createdAt: string;
  unlockDate: string;
  status: 'sealed' | 'opened';
  openedAt?: string;
  aiReflectionBeforeSeal?: {
    reflection: string;
    mattersNow: string[];
    questionForFuture: string;
  };
  nowReflection?: string;
  aiComparison?: {
    summary: string;
    thenSummary: string;
    nowSummary: string;
    biggestShift: string;
    growthTrajectory?: {
      then: string;
      journey: string;
      now: string;
    };
  };
}

export interface FutureReflectResponse {
  reflection: string;
  mattersNow: string[];
  questionForFuture: string;
}

export interface FutureCompareResponse {
  summary: string;
  thenSummary: string;
  nowSummary: string;
  biggestShift: string;
  growthTrajectory?: {
    then: string;
    journey: string;
    now: string;
  };
}

