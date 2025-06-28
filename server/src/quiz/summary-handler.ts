import { WebSocket } from "ws";
import { generateAndSendTTS } from "../murf";
import { getLanguageName } from "../utils/languages";
import { ClientSession } from "./types";
import { callLLM } from "../services/llm/base";

// Interface for detailed quiz feedback
interface QuizDetailedFeedback {
  pronunciationScore: number;
  grammarScore: number;
  vocabularyScore: number;
  comprehensionScore: number;
  overallScore: number;
  feedback: string;
  strengthsAndWeaknesses: {
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  };
}

// Generate detailed quiz feedback using LLM
const generateDetailedQuizFeedback = async (
  questions: any[],
  learningLanguage: string,
  nativeLanguage: string
): Promise<QuizDetailedFeedback> => {
  const answeredQuestions = questions.filter(q => q.userAnswer);
  const correctAnswers = answeredQuestions.filter(q => q.isCorrect).length;
  const totalAnswered = answeredQuestions.length;

  const prompt = `You are an expert language teacher analyzing a student's quiz performance. Provide concise, actionable feedback.

QUIZ RESULTS:
- Total questions answered: ${totalAnswered}
- Correct answers: ${correctAnswers}
- Learning language: ${learningLanguage}
- Questions and answers:
${answeredQuestions.map((q, i) => `
${i + 1}. Q: ${q.question}
   Expected: ${q.correctAnswer}
   Student: ${q.userAnswer || 'Not answered'}
   Result: ${q.isCorrect ? 'Correct' : 'Incorrect'}
`).join('')}

Provide scores (0-100) for:
1. PRONUNCIATION: How well transcribed answers suggest good pronunciation
2. GRAMMAR: Sentence structure, verb forms, word order correctness  
3. VOCABULARY: Word choice and meaning understanding
4. COMPREHENSION: Question understanding and context awareness
5. OVERALL: Combined performance

Give brief, encouraging feedback in ${nativeLanguage === 'en-US' ? 'English' : nativeLanguage}:
- Focus on 1-2 key strengths observed
- Identify 1-2 main areas for improvement  
- Suggest 1-2 specific practice recommendations

Keep all feedback concise and actionable.

Respond in JSON format:
{
  "pronunciationScore": <0-100>,
  "grammarScore": <0-100>, 
  "vocabularyScore": <0-100>,
  "comprehensionScore": <0-100>,
  "overallScore": <0-100>,
  "feedback": "<brief encouraging summary in ${nativeLanguage === 'en-US' ? 'English' : nativeLanguage}>",
  "strengthsAndWeaknesses": {
    "strengths": ["<key strength 1>", "<key strength 2>"],
    "weaknesses": ["<main weakness 1>", "<main weakness 2>"], 
    "recommendations": ["<specific tip 1>", "<specific tip 2>"]
  }
}`;

  try {
    const response = await callLLM(prompt);
    console.log("📊 LLM Quiz Feedback Response:", response);
    
    const parsed = JSON.parse(response);
    
    return {
      pronunciationScore: Math.max(0, Math.min(100, parsed.pronunciationScore || 0)),
      grammarScore: Math.max(0, Math.min(100, parsed.grammarScore || 0)),
      vocabularyScore: Math.max(0, Math.min(100, parsed.vocabularyScore || 0)),
      comprehensionScore: Math.max(0, Math.min(100, parsed.comprehensionScore || 0)),
      overallScore: Math.max(0, Math.min(100, parsed.overallScore || 0)),
      feedback: parsed.feedback || "Great effort on completing the quiz!",
      strengthsAndWeaknesses: parsed.strengthsAndWeaknesses || {
        strengths: ["You completed the quiz"],
        weaknesses: ["Continue practicing"],
        recommendations: ["Keep learning regularly"]
      }
    };
  } catch (error) {
    console.error("❌ Error generating detailed quiz feedback:", error);
    return {
      pronunciationScore: 50,
      grammarScore: 50,
      vocabularyScore: 50,
      comprehensionScore: 50,
      overallScore: 50,
      feedback: "Great effort on completing the quiz! Keep practicing to improve your skills.",
      strengthsAndWeaknesses: {
        strengths: ["You completed the quiz", "You're actively learning"],
        weaknesses: ["Continue practicing regularly"],
        recommendations: ["Review vocabulary", "Practice speaking more", "Take more quizzes"]
      }
    };
  }
};

// Generate quiz summary text in the native language
const generateSummaryText = (
  score: number, 
  totalQuestions: number, 
  learningLanguageName: string, 
  nativeLanguage: string
): string => {
  const percentage = Math.round((score / totalQuestions) * 100);
  
  // Generate summary based on native language
  switch (nativeLanguage) {
    case 'es-ES':
      return `¡Cuestionario completado! ... Obtuviste ${score} de ${totalQuestions} ... ¡Eso es ${percentage} por ciento! ... ¡Excelente trabajo practicando tu ${learningLanguageName}!`;
    
    case 'fr-FR':
      return `Quiz terminé! ... Vous avez obtenu ${score} sur ${totalQuestions} ... C'est ${percentage} pour cent! ... Excellent travail en pratiquant votre ${learningLanguageName}!`;
    
    case 'hi-IN':
      return `प्रश्नोत्तरी पूर्ण! ... आपने ${score} में से ${totalQuestions} अंक प्राप्त किए ... यह ${percentage} प्रतिशत है! ... ${learningLanguageName} का अभ्यास करने के लिए बहुत बढ़िया काम!`;
    
    case 'de-DE':
      return `Quiz abgeschlossen! ... Sie haben ${score} von ${totalQuestions} erreicht ... Das sind ${percentage} Prozent! ... Großartige Arbeit beim Üben Ihres ${learningLanguageName}!`;
    
    case 'it-IT':
      return `Quiz completato! ... Hai ottenuto ${score} su ${totalQuestions} ... È il ${percentage} percento! ... Ottimo lavoro nel praticare il tuo ${learningLanguageName}!`;
    
    case 'jp-JP':
      return `クイズ完了！ ... ${totalQuestions}問中${score}問正解 ... ${percentage}パーセントです！ ... ${learningLanguageName}の練習、素晴らしい仕事です！`;
    
    case 'en-US':
    default:
      return `Quiz completed! ... You scored ${score} out of ${totalQuestions} ... That's ${percentage} percent! ... Great job practicing your ${learningLanguageName}!`;
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
    
    // Get language names instead of codes
    const learningLanguageName = getLanguageName(session.learningLanguage);
    
    // Generate summary text in the native language with pauses
    const summaryText = generateSummaryText(score, totalQuestions, learningLanguageName, session.nativeLanguage);

    console.log(`🎉 Quiz completed - Score: ${score}/${totalQuestions}`);

    // Generate detailed feedback analysis
    const detailedFeedback = await generateDetailedQuizFeedback(
      session.quiz.questions,
      session.learningLanguage,
      session.nativeLanguage
    );

    // Create shortened comprehensive feedback text for audio (more concise)
    const comprehensiveFeedback = `
${summaryText} ... 
Performance Analysis: ${detailedFeedback.overallScore} out of 100. ...
${detailedFeedback.feedback} ...
Top strength: ${detailedFeedback.strengthsAndWeaknesses.strengths[0] || 'Good effort'} ...
Focus on: ${detailedFeedback.strengthsAndWeaknesses.weaknesses[0] || 'Continue practicing'} ...
Next step: ${detailedFeedback.strengthsAndWeaknesses.recommendations[0] || 'Keep learning'}
    `.trim();

    // Generate summary audio with shortened detailed feedback
    const summaryAudio = await generateAndSendTTS(
      ws,
      comprehensiveFeedback,
      session.nativeLanguage,
      "explanation"
    );

    // Send comprehensive summary to client with both basic and detailed data
    ws.send(JSON.stringify({
      type: "quiz_summary",
      score,
      totalQuestions,
      percentage,
      summary: summaryText,
      summaryAudioUrl: summaryAudio,
      questions: session.quiz.questions, // Send all questions and answers for review
      // Include detailed feedback in main response
      detailedFeedback: {
        pronunciationScore: detailedFeedback.pronunciationScore,
        grammarScore: detailedFeedback.grammarScore,
        vocabularyScore: detailedFeedback.vocabularyScore,
        comprehensionScore: detailedFeedback.comprehensionScore,
        overallScore: detailedFeedback.overallScore,
        feedback: detailedFeedback.feedback,
        strengths: detailedFeedback.strengthsAndWeaknesses.strengths,
        weaknesses: detailedFeedback.strengthsAndWeaknesses.weaknesses,
        recommendations: detailedFeedback.strengthsAndWeaknesses.recommendations
      }
    }));

    // Reset quiz state
    session.quiz = undefined;

  } catch (error) {
    console.error("❌ Error sending quiz summary:", error);
    ws.send(JSON.stringify({ error: "Failed to generate quiz summary" }));
  }
};

// Generate early quiz ending text in the native language
const generateEarlyEndText = (
  score: number,
  currentQuestion: number,
  totalQuestions: number,
  reason: string,
  learningLanguageName: string,
  nativeLanguage: string
): string => {
  switch (nativeLanguage) {
    case 'es-ES':
      return `Cuestionario terminado después de ${currentQuestion} de ${totalQuestions} preguntas. ... Obtuviste ${score} de ${currentQuestion}. ... ${reason}`;
    
    case 'fr-FR':
      return `Quiz terminé après ${currentQuestion} sur ${totalQuestions} questions. ... Vous avez obtenu ${score} sur ${currentQuestion}. ... ${reason}`;
    
    case 'hi-IN':
      return `${totalQuestions} में से ${currentQuestion} प्रश्नों के बाद प्रश्नोत्तरी समाप्त। ... आपने ${currentQuestion} में से ${score} अंक प्राप्त किए। ... ${reason}`;
    
    case 'de-DE':
      return `Quiz nach ${currentQuestion} von ${totalQuestions} Fragen beendet. ... Sie haben ${score} von ${currentQuestion} erreicht. ... ${reason}`;
    
    case 'it-IT':
      return `Quiz terminato dopo ${currentQuestion} di ${totalQuestions} domande. ... Hai ottenuto ${score} su ${currentQuestion}. ... ${reason}`;
    
    case 'jp-JP':
      return `${totalQuestions}問中${currentQuestion}問でクイズ終了。 ... ${currentQuestion}問中${score}問正解。 ... ${reason}`;
    
    case 'en-US':
    default:
      return `Quiz ended after ${currentQuestion} of ${totalQuestions} questions. ... You scored ${score} out of ${currentQuestion}. ... ${reason}`;
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
  
  // Get language name and generate summary text in native language
  const learningLanguageName = getLanguageName(session.learningLanguage);
  const summaryText = generateEarlyEndText(score, currentQuestion, totalQuestions, reason, learningLanguageName, session.nativeLanguage);

  try {
    // Generate detailed feedback for answered questions only
    const answeredQuestions = session.quiz.questions.slice(0, currentQuestion);
    const detailedFeedback = await generateDetailedQuizFeedback(
      answeredQuestions,
      session.learningLanguage,
      session.nativeLanguage
    );

    // Create shortened feedback for early end
    const comprehensiveFeedback = `
${summaryText} ...
Quick Analysis: ${detailedFeedback.overallScore} out of 100 based on answered questions. ...
${detailedFeedback.feedback} ...
Keep working on: ${detailedFeedback.strengthsAndWeaknesses.weaknesses[0] || 'Continue practicing'}
    `.trim();

    // Generate summary audio
    const summaryAudio = await generateAndSendTTS(
      ws,
      comprehensiveFeedback,
      session.nativeLanguage,
      "explanation"
    );

    // Send early end summary with detailed feedback
    ws.send(JSON.stringify({
      type: "quiz_ended_early",
      reason,
      score,
      questionsAnswered: currentQuestion,
      totalQuestions,
      summary: summaryText,
      summaryAudioUrl: summaryAudio,
      questions: answeredQuestions, // Only answered questions
      // Include detailed feedback for answered questions
      detailedFeedback: {
        pronunciationScore: detailedFeedback.pronunciationScore,
        grammarScore: detailedFeedback.grammarScore,
        vocabularyScore: detailedFeedback.vocabularyScore,
        comprehensionScore: detailedFeedback.comprehensionScore,
        overallScore: detailedFeedback.overallScore,
        feedback: detailedFeedback.feedback,
        strengths: detailedFeedback.strengthsAndWeaknesses.strengths,
        weaknesses: detailedFeedback.strengthsAndWeaknesses.weaknesses,
        recommendations: detailedFeedback.strengthsAndWeaknesses.recommendations
      }
    }));

    // Reset quiz state
    session.quiz = undefined;

  } catch (error) {
    console.error("❌ Error ending quiz early:", error);
    ws.send(JSON.stringify({ error: "Failed to end quiz" }));
  }
};
