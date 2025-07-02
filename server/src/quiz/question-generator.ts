import { WebSocket } from "ws";
import { generateResponse } from "../services/llm";
import { generateAndSendTTS } from "../murf";
import { ClientSession } from "./types";

// Question generation logic
export const generateAndSendQuizQuestion = async (
  ws: WebSocket,
  sessions: Map<WebSocket, ClientSession>
) => {
  const session = sessions.get(ws);
  if (!session || !session.quiz) return;

  // Reset retry count for new question
  session.retryCount = 0;

  try {
    console.log(` Generating quiz question ${session.quiz.currentQuestion + 1}/${session.quiz.totalQuestions}`);
    
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
    console.log("Raw LLM response correction field:", questionResponse.correction);
    try {
      const parsed = JSON.parse(questionResponse.correction);
      questionText = parsed.question;
      correctAnswer = parsed.correctAnswer;
      console.log(" Parsed question JSON successfully:");
      console.log("   Question:", questionText);
      console.log("   Answer:", correctAnswer);
    } catch (parseError) {
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
      "correction" 
    );

    // Send question to client
    console.log(" Sending question to client:", questionText);
    ws.send(JSON.stringify({
      type: "quiz_question",
      question: questionText,
      questionNumber: session.quiz.currentQuestion + 1,
      totalQuestions: session.quiz.totalQuestions,
      questionAudioUrl: questionAudio,
    }));

    session.quiz.isWaitingForAnswer = true;
    
    
    const fullSession = sessions.get(ws);
    if (fullSession) {
      fullSession.retryCount = 0;
    }
    
    // Clear last transcription when starting a new question
    session.lastTranscription = undefined;
    session.lastTranscriptionTime = undefined;
    setTimeout(() => {
      const currentSession = sessions.get(ws);
      if (currentSession?.quiz?.isWaitingForAnswer && 
          currentSession.quiz.currentQuestion === session.quiz!.currentQuestion) {
        console.log(" Question timeout - auto-advancing");
        const { handleQuizAnswer } = require('./answer-handler');
        handleQuizAnswer(ws, "", sessions); 
      }
    }, 60000); 
    
  } catch (error) {
    console.error("Error generating quiz question:", error);
    ws.send(JSON.stringify({ error: "Failed to generate quiz question" }));
  }
};
