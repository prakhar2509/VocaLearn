import { WebSocket } from "ws";
import { generateAndSendTTS } from "../murf";
import { getLanguageName } from "../utils/languages";
import { ClientSession } from "./types";

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
