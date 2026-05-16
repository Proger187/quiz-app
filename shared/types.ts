export interface Test {
  id: number;
  name: string;
  description: string;
  questionCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Question {
  id: number;
  testId: number;
  text: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  orderIndex: number;
}

export interface SessionSettings {
  questionCount: number;
  shuffle: boolean;
  shuffleOptions: boolean;
  immediatelyFeedback: boolean;
  showExplanation: boolean;
  showProgressBar: boolean;
}

export interface SessionAnswer {
  questionId: number;
  selectedIndex: number;
  isCorrect: boolean;
  timeSpentMs: number;
}

export interface SessionQuestion {
  id: number;
  text: string;
  options: string[];
  correctIndex: number;
  explanation?: string;
  originalId: number;
}

export interface Session {
  id: number;
  testId: number;
  settings: SessionSettings;
  questions: SessionQuestion[];
  answers: SessionAnswer[];
  startedAt: string;
  completedAt?: string;
  score?: number;
}
