// Audio processing logic for different modes

import { WebSocket } from "ws";
import { processAudioStream } from "../asr";
import { generateResponse } from "../services/llm";
import { calculateAccuracy } from "./llm/accuracy";
import { generateAndSendTTS } from "../murf";
import { handleQuizAnswer } from "../quiz";
import { ClientSession, sessions, clearAudioChunks, addToConversationHistory, getConversationContext } from "../managers/session-manager";

// Process quiz answer
export const processQuizAnswer = async (ws: WebSocket, session: ClientSession): Promise<void> => {
  const transcription = await processAudioStream(
    session.audioChunks,
    session.learningLanguage
  );
  console.log("✅ Quiz answer transcription:", transcription.text);
  
  await handleQuizAnswer(ws, transcription.text, sessions);
  clearAudioChunks(session);
};

// Process dialogue/echo mode
export const processDialogueEcho = async (ws: WebSocket, session: ClientSession): Promise<void> => {
  // Get transcription
  const transcription = await processAudioStream(
    session.audioChunks,
    session.learningLanguage
  );
  console.log("✅ Transcription:", transcription.text);
  
  // Generate LLM response
  const response = await generateResponse(
    transcription.text,
    session.learningLanguage,
    session.nativeLanguage,
    session.mode,
    session.scenarioId,
    session.conversationHistory
  );
  console.log("✅ Response:", response);
  
  // Add user message to conversation history
  if (session.mode === "dialogue") {
    addToConversationHistory(session, 'user', transcription.text);
    // Add AI response to conversation history
    addToConversationHistory(session, 'assistant', response.correction);
  }
  
  // Calculate accuracy for the user's speech
  let accuracyResult;
  if (session.mode === "echo") {
    // In echo mode, compare against the correction to see how well they matched the expected output
    accuracyResult = await calculateAccuracy(
      transcription.text,
      response.correction, // Compare against the corrected version
      session.nativeLanguage,
      "echo"
    );
  } else {
    // In dialogue mode, evaluate speech quality without comparing to a specific expected text
    accuracyResult = await calculateAccuracy(
      transcription.text,
      transcription.text, // Self-evaluation for dialogue mode
      session.nativeLanguage,
      "dialogue"
    );
  }
  console.log("📊 Accuracy:", accuracyResult);
  
  // Send transcription and accuracy to client
  const transcriptionData: any = {
    transcription: transcription.text,
    language: session.learningLanguage,
    // Accuracy data
    accuracy: accuracyResult.accuracy,
    pronunciationScore: accuracyResult.pronunciationScore,
    grammarScore: accuracyResult.grammarScore,
    fluencyScore: accuracyResult.fluencyScore,
    accuracyFeedback: accuracyResult.feedback
  };

  // Add detailed feedback from LLM if available (for echo mode)
  if (response.detailedFeedback && session.mode === "echo") {
    transcriptionData.llmDetailedFeedback = response.detailedFeedback;
  }

  ws.send(JSON.stringify(transcriptionData));
  
  // Send text response with detailed feedback for echo mode
  const textResponse: any = {
    correction: response.correction,
    explanation: session.mode === "dialogue" ? "" : response.explanation, // No explanations in dialogue mode unless there's an error
    correctionLanguage: session.learningLanguage,
    explanationLanguage: session.nativeLanguage,
  };

  // Add detailed feedback to text response for echo mode
  if (response.detailedFeedback && session.mode === "echo") {
    textResponse.detailedFeedback = response.detailedFeedback;
  }

  ws.send(JSON.stringify(textResponse));

  // Generate audio responses - ONLY for correction and explanation
  const correctionAudio = await generateAndSendTTS(
    ws,
    response.correction,
    session.learningLanguage,
    "correction"
  );
  
  // Generate explanation audio (refined explanations for all modes)
  let explanationAudio = "";
  if (response.explanation && response.explanation.trim()) {
    // Generate audio for explanation in all modes (echo, dialogue, quiz)
    // The explanation content is now more refined based on the updated prompts
    explanationAudio = await generateAndSendTTS(
      ws,
      response.explanation,
      session.nativeLanguage,
      "explanation"
    );
  }

  // Send completion message with audio URLs
  ws.send(JSON.stringify({
    type: "done",
    done: true,
    audioCorrectionUrl: correctionAudio,
    audioExplanationUrl: explanationAudio,
  }));

  clearAudioChunks(session);
};
