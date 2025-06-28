import { WebSocket } from "ws";
import { generateResponse } from "../llm";
import { generateAndSendTTS } from "../murf";
import { ClientSession } from "./types";

// Answer evaluation and handling logic
export const handleQuizAnswer = async (
  ws: WebSocket,
  userAnswer: string,
  sessions: Map<WebSocket, ClientSession>
) => {
  const session = sessions.get(ws);
  if (!session || !session.quiz) return;

  try {
    const currentQ = session.quiz.questions[session.quiz.currentQuestion];
    currentQ.userAnswer = userAnswer;

    console.log(`🎯 Evaluating quiz answer: "${userAnswer}"`);

    // Handle empty/skipped answers
    if (!userAnswer || userAnswer.trim() === "") {
      console.log("⏭️ Question was skipped or no answer provided");
      
      // Generate skipped question feedback
      const skippedFeedback = `Question skipped. The correct answer was: ${currentQ.correctAnswer}`;
      const skippedExplanation = `This question was skipped. Try to answer the next one!`;

      // Generate feedback audio
      const feedbackAudio = await generateAndSendTTS(
        ws,
        skippedFeedback,
        session.learningLanguage,
        "correction"
      );

      const explanationAudio = await generateAndSendTTS(
        ws,
        skippedExplanation,
        session.nativeLanguage,
        "explanation"
      );

      // Send feedback to client
      ws.send(JSON.stringify({
        type: "quiz_feedback",
        isCorrect: false,
        feedback: skippedFeedback,
        explanation: skippedExplanation,
        feedbackAudioUrl: feedbackAudio,
        explanationAudioUrl: explanationAudio,
        score: session.quiz.score,
        currentQuestion: session.quiz.currentQuestion + 1,
        totalQuestions: session.quiz.totalQuestions,
        hasMoreQuestions: (session.quiz.currentQuestion + 1) < session.quiz.totalQuestions,
      }));

      // Move to next question or end quiz
      session.quiz.currentQuestion++;
      session.quiz.isWaitingForAnswer = false;

      // Check if this was the last question
      if (session.quiz.currentQuestion >= session.quiz.totalQuestions) {
        console.log("🎯 Last question skipped - waiting for client to confirm audio completion");
        // Don't auto-end - wait for client to send "final_audio_completed" message
      }

      return;
    }

    // Evaluate answer using LLM
    const evaluationPrompt = `You are evaluating a SPOKEN answer to a language learning quiz question. 
    The user provided their answer through speech/audio, so focus ONLY on the spoken content, NOT on written punctuation or formatting.
    
    Question: "${currentQ.question}"
    Expected Answer: "${currentQ.correctAnswer}"
    User's Spoken Answer: "${userAnswer}"
    
    Be precise and direct in your evaluation. If the user answered the specific question asked, mark it as correct even if the phrasing is different.
    Do NOT be overly speculative or make assumptions about what the user "should" have said.
    Focus ONLY on whether they answered the actual question asked.
    
    Evaluate if the spoken content answers the question correctly:
    - Correct vocabulary and word choice for the question asked
    - Proper grammar and sentence structure 
    - Accurate meaning and context that addresses the question
    - Reasonable pronunciation (based on transcription)
    
    Do NOT penalize for:
    - Missing punctuation marks (these cannot be heard in speech)
    - Alternative but correct ways of expressing the same idea
    - Personal preferences when the question asks for personal information
    
    Respond with encouraging feedback in ${session.learningLanguage}. If the answer is correct, praise the user briefly. If incorrect, explain what was wrong and provide the correct answer.`;

    const evaluation = await generateResponse(
      evaluationPrompt,
      session.learningLanguage,
      session.nativeLanguage,
      "quiz"
    );

    // Improved scoring logic - look for positive indicators in multiple languages
    const feedbackLower = evaluation.correction.toLowerCase();
    const isCorrect = feedbackLower.includes("correct") || 
                     feedbackLower.includes("correcto") ||
                     feedbackLower.includes("सही") || // Hindi: correct
                     feedbackLower.includes("bien") ||
                     feedbackLower.includes("good") ||
                     feedbackLower.includes("excellent") ||
                     feedbackLower.includes("perfect") ||
                     feedbackLower.includes("right") ||
                     feedbackLower.includes("great") ||
                     // Look for negative indicators and invert
                     !(feedbackLower.includes("incorrect") || 
                       feedbackLower.includes("wrong") ||
                       feedbackLower.includes("गलत") || // Hindi: wrong
                       feedbackLower.includes("no") && feedbackLower.includes("not"));

    if (isCorrect) {
      session.quiz.score++;
    }

    // Generate feedback audio
    const feedbackAudio = await generateAndSendTTS(
      ws,
      evaluation.correction,
      session.learningLanguage,
      "correction"
    );

    // Generate explanation audio if needed
    let explanationAudio = "";
    if (evaluation.explanation && evaluation.explanation.trim()) {
      explanationAudio = await generateAndSendTTS(
        ws,
        evaluation.explanation,
        session.nativeLanguage,
        "explanation"
      );
    }

    // Send feedback to client
    ws.send(JSON.stringify({
      type: "quiz_feedback",
      isCorrect,
      feedback: evaluation.correction,
      explanation: evaluation.explanation,
      feedbackAudioUrl: feedbackAudio,
      explanationAudioUrl: explanationAudio,
      score: session.quiz.score,
      currentQuestion: session.quiz.currentQuestion + 1,
      totalQuestions: session.quiz.totalQuestions,
      hasMoreQuestions: (session.quiz.currentQuestion + 1) < session.quiz.totalQuestions,
    }));

    // Move to next question or end quiz
    session.quiz.currentQuestion++;
    session.quiz.isWaitingForAnswer = false;

    // Check if this was the last question
    if (session.quiz.currentQuestion >= session.quiz.totalQuestions) {
      console.log("🎯 Last question completed - waiting for client to confirm audio completion");
      // Don't auto-end - wait for client to send "final_audio_completed" message
      // This allows the client to control when the final score is shown
    }

    // Don't auto-advance - let the client control when to proceed (for non-final questions)
    // The client will send a "next_question" action when ready

  } catch (error) {
    console.error("❌ Error handling quiz answer:", error);
    ws.send(JSON.stringify({ error: "Failed to evaluate quiz answer" }));
  }
};

// Helper function to detect potential duplicate transcriptions (for logging/debugging)
export const checkForDuplicateTranscription = (
  session: ClientSession, 
  newTranscription: string
): { isDuplicate: boolean; reason?: string } => {
  if (!session.lastTranscription || !newTranscription) {
    return { isDuplicate: false };
  }
  
  // Check if enough time has passed (10 seconds) - shorter window for technical duplicates
  const now = Date.now();
  if (session.lastTranscriptionTime && (now - session.lastTranscriptionTime) > 10000) {
    return { isDuplicate: false, reason: "Time window passed" };
  }
  
  // Normalize both transcriptions for comparison (trim, lowercase, remove extra spaces)
  const normalize = (text: string) => 
    text.trim().toLowerCase().replace(/\s+/g, ' ');
  
  const normalizedLast = normalize(session.lastTranscription);
  const normalizedNew = normalize(newTranscription);
  
  // Check for exact match within short time window (likely technical duplicate)
  if (normalizedLast === normalizedNew && session.lastTranscriptionTime && (now - session.lastTranscriptionTime) < 3000) {
    return { isDuplicate: true, reason: "Exact match within 3 seconds (likely technical duplicate)" };
  }
  
  return { isDuplicate: false };
};
