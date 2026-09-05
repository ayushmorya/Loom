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
