// Quiz-related interfaces and types

export interface QuizSession {
  currentQuestion: number;
  totalQuestions: number;
  score: number;
  topic: string;
  questions: Array<{
    question: string;
    correctAnswer: string;
    userAnswer?: string;
  }>;
  isWaitingForAnswer: boolean;
  questionHistory: string[]; // Track generated questions to avoid repeats
}

export interface ClientSession {
  audioChunks: Buffer[];
  learningLanguage: string;
  nativeLanguage: string;
  mode: string;
  quiz?: QuizSession;
  isProcessing?: boolean; // Add flag to prevent duplicate processing
  lastTranscription?: string; // Track last transcription to prevent duplicates
  lastTranscriptionTime?: number; // Track when last transcription was made
  retryCount?: number; // Track number of retries for current question/interaction
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  reason?: string;
}
