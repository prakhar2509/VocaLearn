import { WebSocket } from "ws";
import { generateResponse } from "./llm";
import { generateAndSendTTS } from "./murf";
import { getLanguageName, getSupportedLanguageCodes } from "./languages";

// Quiz-related interfaces
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

// Quiz helper functions
export const generateAndSendQuizQuestion = async (
  ws: WebSocket,
  sessions: Map<WebSocket, ClientSession>
) => {
  const session = sessions.get(ws);
  if (!session || !session.quiz) return;

  // Reset retry count for new question
  session.retryCount = 0;

  try {
    console.log(`🧪 Generating quiz question ${session.quiz.currentQuestion + 1}/${session.quiz.totalQuestions}`);
    
    // Generate question using LLM with special quiz prompt
    const previousQuestions = session.quiz.questionHistory.length > 0 ? 
      `\n\nPrevious questions asked (DO NOT repeat these):\n${session.quiz.questionHistory.join('\n')}` : '';
    
    const questionTypes = [
      "personal introduction questions",
      "daily routine questions", 
      "describing objects or places",
      "expressing opinions or preferences",
      "talking about past experiences",
      "future plans or goals",
      "hypothetical scenarios",
      "comparing things",
      "giving directions or instructions",
      "cultural or traditional topics"
    ];
    
    const randomType = questionTypes[Math.floor(Math.random() * questionTypes.length)];
    
    const questionPrompt = `Generate a unique quiz question for language learners practicing SPOKEN ${session.learningLanguage}.
    Topic: ${session.quiz.topic}
    Question focus: ${randomType}
    
    LANGUAGE REQUIREMENTS:
    - The question MUST be written entirely in ${session.learningLanguage}
    - Do NOT use English or any other language
    - Use natural, conversational ${session.learningLanguage}
    
    Requirements:
    - Must be different from any previous questions
    - Should test vocabulary, grammar, or comprehension through speech
    - Focus on content that doesn't rely on written punctuation or formatting
    - Create a question with a clear, unambiguous spoken answer
    - Make it appropriate for intermediate language learners
    - Add variety and creativity to keep the quiz engaging
    
    IMPORTANT: Return your response as valid JSON in this exact format:
    {
      "question": "your unique question here in ${session.learningLanguage}",
      "correctAnswer": "expected answer here in ${session.learningLanguage}"
    }
    
    Example for Spanish:
    {
      "question": "¿Cuál es tu comida favorita y por qué?",
      "correctAnswer": "Mi comida favorita es [food] porque [reason]"
    }
    
    Example for Hindi:
    {
      "question": "आपका पसंदीदा खाना क्या है और क्यों?",
      "correctAnswer": "मेरा पसंदीदा खाना [food] है क्योंकि [reason]"
    }${previousQuestions}`;

    const questionResponse = await generateResponse(
      questionPrompt,
      session.learningLanguage,
      session.nativeLanguage,
      "quiz"
    );

    // Try to parse the LLM response as JSON first
    let questionText, correctAnswer;
    console.log("🔍 Raw LLM response correction field:", questionResponse.correction);
    try {
      const parsed = JSON.parse(questionResponse.correction);
      questionText = parsed.question;
      correctAnswer = parsed.correctAnswer;
      console.log("✅ Parsed question JSON successfully:");
      console.log("   Question:", questionText);
      console.log("   Answer:", correctAnswer);
    } catch (parseError) {
      // Fallback to using correction/explanation fields
      console.log("⚠️ Could not parse question JSON, using fallback");
      console.log("   Parse error:", parseError instanceof Error ? parseError.message : String(parseError));
      console.log("   Raw correction field:", questionResponse.correction);
      questionText = questionResponse.correction;
      correctAnswer = questionResponse.explanation;
    }

    // Validate that we have a question
    if (!questionText || questionText.trim() === "") {
      questionText = "Sample question: How are you today?";
      correctAnswer = "I am fine, thank you.";
      console.log("⚠️ Empty question detected, using fallback question");
    }

    // Add question to history to avoid repeats
    session.quiz.questionHistory.push(questionText);

    // Store question in session
    session.quiz.questions.push({
      question: questionText,
      correctAnswer: correctAnswer,
    });

    // Generate question audio using Murf
    const questionAudio = await generateAndSendTTS(
      ws,
      questionText,
      session.learningLanguage,
      "correction" // Reusing existing label system
    );

    // Send question to client
    console.log("📤 Sending question to client:", questionText);
    ws.send(JSON.stringify({
      type: "quiz_question",
      question: questionText,
      questionNumber: session.quiz.currentQuestion + 1,
      totalQuestions: session.quiz.totalQuestions,
      questionAudioUrl: questionAudio,
    }));

    session.quiz.isWaitingForAnswer = true;
    
    // Reset retry count for new question
    const fullSession = sessions.get(ws);
    if (fullSession) {
      fullSession.retryCount = 0;
    }
    
    // Clear last transcription when starting a new question
    session.lastTranscription = undefined;
    session.lastTranscriptionTime = undefined;
    
    // Set timeout for question (60 seconds)
    setTimeout(() => {
      const currentSession = sessions.get(ws);
      if (currentSession?.quiz?.isWaitingForAnswer && 
          currentSession.quiz.currentQuestion === session.quiz!.currentQuestion) {
        console.log("⏰ Question timeout - auto-advancing");
        handleQuizAnswer(ws, "", sessions); // Handle as timeout/empty answer
      }
    }, 60000); // 60 second timeout per question
    
  } catch (error) {
    console.error("❌ Error generating quiz question:", error);
    ws.send(JSON.stringify({ error: "Failed to generate quiz question" }));
  }
};

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

      // Check if this was the last question (skipped)
      if (session.quiz.currentQuestion >= session.quiz.totalQuestions) {
        console.log("🎯 Last question skipped, setting auto-end timer");
        // Auto-end the quiz after 5 seconds or when audio finishes
        setTimeout(async () => {
          const currentSession = sessions.get(ws);
          if (currentSession?.quiz && currentSession.quiz.currentQuestion >= currentSession.quiz.totalQuestions) {
            console.log("⏰ Auto-ending quiz after final skipped question");
            await sendQuizSummary(ws, sessions);
          }
        }, 5000); // 5 second delay for skipped final question
      }

      // Don't auto-advance for skipped questions - let client control
      // The client will send "next_question" when ready
      
      return;
    }

    // Evaluate answer using LLM
    const evaluationPrompt = `You are evaluating a SPOKEN answer to a language learning quiz question. 
    The user provided their answer through speech/audio, so focus ONLY on the spoken content, NOT on written punctuation or formatting.
    
    Question: "${currentQ.question}"
    Expected Answer: "${currentQ.correctAnswer}"
    User's Spoken Answer: "${userAnswer}"
    
    IMPORTANT: This is a PERSONAL QUESTION asking about the user's own experience/routine/opinion. Accept any reasonable answer that makes sense grammatically and contextually.
    
    Evaluate based on:
    - Is the grammar correct in ${session.learningLanguage}?
    - Does the answer make logical sense for the question asked?
    - Is the vocabulary appropriate?
    - Ignore missing punctuation marks (cannot be heard in speech)
    
    DO NOT:
    - Speculate about what is "typically" done
    - Judge the content of personal answers (like daily routines, preferences, etc.)
    - Give "nice try" for grammatically correct answers
    - Make assumptions about what the "correct" personal answer should be
    
    If the grammar and vocabulary are correct and the answer addresses the question, mark it as CORRECT.
    
    Respond with brief, direct feedback in ${session.learningLanguage}. If correct, simply praise. If incorrect, focus only on language errors, not content judgments.`;

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

export const sendQuizSummary = async (
  ws: WebSocket,
  sessions: Map<WebSocket, ClientSession>
) => {
  const session = sessions.get(ws);
  if (!session || !session.quiz) return;

  try {
    const { score, totalQuestions } = session.quiz;
    const percentage = Math.round((score / totalQuestions) * 100);
    
    // Get the proper language name instead of language code
    const languageName = getLanguageName(session.learningLanguage);
    
    // Add pauses in the summary text using SSML-like breaks
    const summaryText = `Quiz completed! You scored ${score} out of ${totalQuestions}... ${percentage} percent. Great job practicing your ${languageName}!`;

    console.log(`🎉 Quiz completed - Score: ${score}/${totalQuestions}`);

    // Generate summary audio
    const summaryAudio = await generateAndSendTTS(
      ws,
      summaryText,
      session.nativeLanguage,
      "explanation"
    );

    // Send summary to client
    ws.send(JSON.stringify({
      type: "quiz_summary",
      score,
      totalQuestions,
      percentage,
      summary: summaryText,
      summaryAudioUrl: summaryAudio,
      questions: session.quiz.questions, // Send all questions and answers for review
    }));

    // Reset quiz state
    session.quiz = undefined;

  } catch (error) {
    console.error("❌ Error sending quiz summary:", error);
    ws.send(JSON.stringify({ error: "Failed to generate quiz summary" }));
  }
};

export const endQuizEarly = async (
  ws: WebSocket,
  sessions: Map<WebSocket, ClientSession>,
  reason: string = "Quiz ended by user"
) => {
  const session = sessions.get(ws);
  if (!session || !session.quiz) return;

  console.log(`🛑 Quiz ended early: ${reason}`);
  
  // Send early termination summary
  const { score, currentQuestion, totalQuestions } = session.quiz;
  
  // Get the proper language name and add pauses
  const languageName = getLanguageName(session.learningLanguage);
  const summaryText = `Quiz ended after ${currentQuestion} of ${totalQuestions} questions... You scored ${score} out of ${currentQuestion}. ${reason}`;

  try {
    // Generate summary audio
    const summaryAudio = await generateAndSendTTS(
      ws,
      summaryText,
      session.nativeLanguage,
      "explanation"
    );

    // Send early end summary
    ws.send(JSON.stringify({
      type: "quiz_ended_early",
      reason,
      score,
      questionsAnswered: currentQuestion,
      totalQuestions,
      summary: summaryText,
      summaryAudioUrl: summaryAudio,
      questions: session.quiz.questions.slice(0, currentQuestion), // Only answered questions
    }));

    // Reset quiz state
    session.quiz = undefined;

  } catch (error) {
    console.error("❌ Error ending quiz early:", error);
    ws.send(JSON.stringify({ error: "Failed to end quiz" }));
  }
};

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
    console.log("🎵 Client confirmed final audio completed - showing quiz summary");
    await sendQuizSummary(ws, sessions);
    return true;
  }

  if (message.action === "skip_final_audio" && session.quiz && session.quiz.currentQuestion >= session.quiz.totalQuestions) {
    console.log("⏭️ Client skipped final audio - showing quiz summary");
    await sendQuizSummary(ws, sessions);
    return true;
  }

  return false;
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
