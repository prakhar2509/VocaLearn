import { WebSocket } from "ws";
import { ClientSession } from "./types";
import { generateAndSendQuizQuestion } from "./question-generator";
import { handleQuizAnswer } from "./answer-handler";
import { sendQuizSummary, endQuizEarly } from "./summary-handler";

// Session management and initialization
export const initializeQuiz = (
  session: ClientSession,
  params: URLSearchParams
): void => {
  // Parse quiz parameters from URL (with defaults)
  const totalQuestions = parseInt(params.get("questions") || "5");
  const topic = params.get("topic") || "general";
  
  session.quiz = {
    currentQuestion: 0,
    totalQuestions: Math.min(totalQuestions, 20), // Cap at 20 questions max
    score: 0,
    topic,
    questions: [],
    isWaitingForAnswer: false,
    questionHistory: [], // Initialize empty question history
  };
  
  console.log(`🧪 Starting quiz: ${session.quiz.totalQuestions} questions on topic "${topic}"`);
};

// Handle various quiz control messages from the client
export const handleQuizControlMessage = async (
  ws: WebSocket,
  sessions: Map<WebSocket, ClientSession>,
  message: any
): Promise<boolean> => {
  const session = sessions.get(ws);
  if (!session || session.mode !== "quiz" || !message.action) {
    return false;
  }

  if (message.action === "end_quiz") {
    await endQuizEarly(ws, sessions, "Quiz ended by user request");
    return true;
  }
  
  if (message.action === "skip_question" && session.quiz?.isWaitingForAnswer) {
    console.log("⏭️ Skipping current question");
    await handleQuizAnswer(ws, "", sessions); // Handle as empty answer
    return true;
  }

  if (message.action === "next_question" && session.quiz && !session.quiz.isWaitingForAnswer) {
    console.log("⏭️ Client requesting next question");
    if (session.quiz.currentQuestion < session.quiz.totalQuestions) {
      await generateAndSendQuizQuestion(ws, sessions);
    } else {
      await sendQuizSummary(ws, sessions);
    }
    return true;
  }

  if (message.action === "final_audio_completed" && session.quiz && session.quiz.currentQuestion >= session.quiz.totalQuestions) {
    // Check if summary already generated to prevent duplicates
    if (session.quiz.summaryGenerated) {
      console.log("🔄 Quiz summary already generated, skipping duplicate");
      return true;
    }
    console.log("🎵 Client confirmed final audio completed - showing quiz summary");
    session.quiz.summaryGenerated = true; // Set flag before generating
    await sendQuizSummary(ws, sessions);
    return true;
  }

  if (message.action === "skip_final_audio" && session.quiz && session.quiz.currentQuestion >= session.quiz.totalQuestions) {
    // Check if summary already generated to prevent duplicates
    if (session.quiz.summaryGenerated) {
      console.log("🔄 Quiz summary already generated, skipping duplicate");
      return true;
    }
    console.log("⏭️ Client skipped final audio - showing quiz summary");
    session.quiz.summaryGenerated = true; // Set flag before generating
    await sendQuizSummary(ws, sessions);
    return true;
  }

  return false;
};
