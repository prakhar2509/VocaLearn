import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { config } from './utils/config';
import { getSupportedLanguageCodes } from './utils/languages';


interface Transcription {
  text: string;
  language: string;
}

export const processAudioStream = async (audioChunks: Buffer[], language: string): Promise<Transcription> => {
  if (!audioChunks || audioChunks.length === 0) {
    throw new Error('Invalid or empty audio data');
  }
  if (!language || !getSupportedLanguageCodes().includes(language)) {
    throw new Error(`Unsupported language: ${language}. Supported languages are: ${getSupportedLanguageCodes().join(', ')}`);
  }
  if (!config.deepgramApiKey) {
    throw new Error('Deepgram API key is missing');
  }

  console.log('🔐 Deepgram Key Present:', !!config.deepgramApiKey);

  return new Promise<Transcription>((resolve, reject) => {
    let retries = 2;
    const tryConnect = () => {
      const deepgram = createClient(config.deepgramApiKey);
      const deepgramSocket = deepgram.listen.live({
        language: language.split('-')[0],
        sample_rate: 16000,
        encoding: 'linear16',
        interim_results: true,
        punctuate: true,
        model: 'nova-2',
        endpointing: 3000, // 3 seconds of silence before considering speech ended
        smart_format: true, // Better formatting
        vad_events: true, // Voice activity detection events
        utterance_end_ms: 2000, // Wait 2 seconds after utterance ends
      });

      let accumulatedTranscript = '';
      let latestCompleteTranscript = '';
      let promiseSettled = false;
      let finalTranscriptTimeout: NodeJS.Timeout | null = null;

      const cleanup = () => {
        if (!promiseSettled) {
          promiseSettled = true;
          clearTimeout(timeoutId);
          if (finalTranscriptTimeout) {
            clearTimeout(finalTranscriptTimeout);
          }
          try {
            deepgramSocket.finish();
          } catch (e) {
            console.warn('Error closing Deepgram socket:', e);
          }
        }
      };

      const timeoutId = setTimeout(() => {
        if (!promiseSettled) {
          console.error('Deepgram transcription timed out after 35 seconds');
          cleanup();
          reject(new Error('Deepgram transcription timed out'));
        }
      }, 35000); // Increased from 20s to 35s to match the new audio timeout

      deepgramSocket.on(LiveTranscriptionEvents.Open, () => {
        console.log('Deepgram WebSocket opened. Sending audio chunks...');
        audioChunks.forEach((chunk, index) => {
          if (!Buffer.isBuffer(chunk) || chunk.length === 0) {
            console.warn(`Invalid chunk ${index + 1}:`, chunk);
            return;
          }
          console.log(`Sending chunk ${index + 1}/${audioChunks.length}, size: ${chunk.length} bytes`);
          deepgramSocket.send(chunk);
        });
        setTimeout(() => {
          if (!promiseSettled) {
            deepgramSocket.finish();
            console.log('Deepgram audio chunks sent and finished');
          }
        }, 30000); // Increased from 15s to 30s to allow more time for quiz answers
      });

      deepgramSocket.on(LiveTranscriptionEvents.Transcript, (data) => {
        if (promiseSettled) return;

        const transcription = data?.channel?.alternatives?.[0]?.transcript;
        if (transcription && transcription.trim()) {
          console.log(`Deepgram transcript: ${transcription} (is_final: ${data.is_final}, speech_final: ${data.speech_final}, from_finalize: ${data.from_finalize})`);
          
          // Always keep track of the latest transcript (final or interim)
          if (data.is_final) {
            // This is a final transcript - add it to our accumulated result
            if (accumulatedTranscript) {
              accumulatedTranscript += ' ' + transcription;
            } else {
              accumulatedTranscript = transcription;
            }
            latestCompleteTranscript = accumulatedTranscript;
            console.log(`📝 Final transcript added: "${accumulatedTranscript}"`);
          } else {
            // This is an interim transcript - it might be a continuation
            if (accumulatedTranscript) {
              latestCompleteTranscript = accumulatedTranscript + ' ' + transcription;
            } else {
              latestCompleteTranscript = transcription;
            }
            console.log(`📝 Interim transcript tracked: "${latestCompleteTranscript}"`);
          }
          
          // Clear any existing timeout
          if (finalTranscriptTimeout) {
            clearTimeout(finalTranscriptTimeout);
          }
          
          // Set a timeout to finalize the transcript
          finalTranscriptTimeout = setTimeout(() => {
            if (!promiseSettled && latestCompleteTranscript.trim()) {
              console.log('🕐 Transcript timeout reached. Using latest complete transcript...');
              console.log(`✅ Final Transcription: "${latestCompleteTranscript}"`);
              cleanup();
              resolve({ text: latestCompleteTranscript.trim(), language });
            }
          }, 2500); // Wait 2.5 seconds after last transcript update
        }

        // Immediate resolution for speech_final or from_finalize (preferred method)
        if (transcription && data.is_final && (data.speech_final || data.from_finalize)) {
          console.log('Deepgram received definitive final speech. Resolving immediately...');
          console.log(`✅ Final Transcription (definitive): ${latestCompleteTranscript || accumulatedTranscript}`);
          if (finalTranscriptTimeout) {
            clearTimeout(finalTranscriptTimeout);
          }
          cleanup();
          resolve({ text: (latestCompleteTranscript || accumulatedTranscript).trim(), language });
        }
      });

      // Handle Voice Activity Detection events
      deepgramSocket.on(LiveTranscriptionEvents.SpeechStarted, () => {
        console.log('🎤 Speech started detected by Deepgram');
      });

      deepgramSocket.on(LiveTranscriptionEvents.UtteranceEnd, () => {
        console.log('🛑 Utterance end detected by Deepgram');
        // If we have any transcript (final or latest complete), finalize it
        const finalText = latestCompleteTranscript || accumulatedTranscript;
        if (!promiseSettled && finalText.trim()) {
          console.log('🕐 Utterance end - finalizing transcript...');
          console.log(`✅ Final Transcription (utterance end): "${finalText}"`);
          if (finalTranscriptTimeout) {
            clearTimeout(finalTranscriptTimeout);
          }
          cleanup();
          resolve({ text: finalText.trim(), language });
        }
      });

      deepgramSocket.on(LiveTranscriptionEvents.Error, (error) => {
        if (promiseSettled) return;
        console.error('Deepgram STT failed:', error, {
          readyState: deepgramSocket.getReadyState(),
          url: deepgramSocket.getRequestUrl,
          retriesLeft: retries,
        });
        cleanup();
        if (retries > 0) {
          console.log(`Retrying Deepgram connection (${retries} attempts left)`);
          retries--;
          setTimeout(tryConnect, 1000);
        } else {
          reject(new Error(`Deepgram STT failed: ${error.message}`));
        }
      });

      deepgramSocket.on(LiveTranscriptionEvents.Close, (code, reason) => {
        console.log(`Deepgram WebSocket closed (code: ${code}, reason: ${reason})`);
        if (!promiseSettled) {
          cleanup();
          const finalText = latestCompleteTranscript || accumulatedTranscript;
          if (finalText.trim()) {
            console.log('Deepgram stream closed, using latest complete transcript...');
            console.log(`✅ Final Transcription (close): "${finalText}"`);
            resolve({ text: finalText.trim(), language });
          } else {
            console.error('Deepgram stream closed without transcription');
            reject(new Error('Deepgram stream closed without transcription'));
          }
        }
      });
    };

    tryConnect();
  });
};