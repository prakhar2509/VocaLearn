

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
  questionHistory: string[]; 
  summaryGenerated?: boolean; 
}

export interface ClientSession {
  audioChunks: Buffer[];
  learningLanguage: string;
  nativeLanguage: string;
  mode: string;
  quiz?: QuizSession;
  isProcessing?: boolean; 
  lastTranscription?: string; 
  lastTranscriptionTime?: number; 
  retryCount?: number; 
}

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  reason?: string;
}
