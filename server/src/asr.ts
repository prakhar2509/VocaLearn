import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { config } from './config';
import { getSupportedLanguageCodes } from './languages';


interface Transcription {
  text: string;
  language: string;
}

export const supportedLanguages = ['en-US', 'es-ES', 'fr-FR', 'hi-IN'];

export const processAudioStream = async (audioChunks: Buffer[], language: string): Promise<Transcription> => {
  if (!audioChunks || audioChunks.length === 0) {
    throw new Error('Invalid or empty audio data');
  }
  if (!language || !getSupportedLanguageCodes().includes(language)) {
    throw new Error(`Unsupported language: ${language}. Supported languages are: ${supportedLanguages.join(', ')}`);
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
        model: 'nova-2', // Fixed to nova-2
        endpointing: 150,
      });

      let accumulatedTranscript = '';
      let promiseSettled = false;

      const cleanup = () => {
        if (!promiseSettled) {
          promiseSettled = true;
          clearTimeout(timeoutId);
          try {
            deepgramSocket.finish();
          } catch (e) {
            console.warn('Error closing Deepgram socket:', e);
          }
        }
      };

      const timeoutId = setTimeout(() => {
        if (!promiseSettled) {
          console.error('Deepgram transcription timed out after 20 seconds');
          cleanup();
          reject(new Error('Deepgram transcription timed out'));
        }
      }, 20000);

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
        }, 15000);
      });

      deepgramSocket.on(LiveTranscriptionEvents.Transcript, (data) => {
        if (promiseSettled) return;

        const transcription = data?.channel?.alternatives?.[0]?.transcript;
        if (transcription) {
          accumulatedTranscript += transcription + ' ';
          console.log(`Deepgram transcript: ${transcription} (is_final: ${data.is_final}, speech_final: ${data.speech_final}, from_finalize: ${data.from_finalize})`);
        }

        if (transcription && data.is_final && (data.speech_final || data.from_finalize)) {
          console.log('Deepgram received final speech/transcript. Resolving...');
          cleanup();
          resolve({ text: accumulatedTranscript.trim(), language });
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
          if (accumulatedTranscript.trim()) {
            console.log('Deepgram stream closed, but accumulated transcript. Resolving...');
            resolve({ text: accumulatedTranscript.trim(), language });
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