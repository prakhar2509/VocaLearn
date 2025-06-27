import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { config } from './config';
import { getSupportedLanguageCodes } from './languages';

interface Transcription {
  text: string;
  language: string;
}

export const processAudioStream = async (audioChunks: Buffer[], language: string): Promise<Transcription> => {
  // ...validation...
  if (!audioChunks || audioChunks.length === 0) {
    throw new Error('Invalid or empty audio data');
  }

  if (!language || !getSupportedLanguageCodes().includes(language)) {
  throw new Error(`Unsupported language: ${language}`);
}

  return new Promise<Transcription>((resolve, reject) => {
    const deepgram = createClient(config.deepgramApiKey);
    const deepgramSocket = deepgram.listen.live({
      language: language, // Use full BCP-47 code
      encoding: 'linear16',
      sample_rate: 16000,
      interim_results: true,
      punctuate: true,
      model: 'nova-3',
      endpointing: 500,
    });

    let accumulatedTranscript = '';
    let promiseSettled = false;

    const cleanup = () => {
      if (!promiseSettled) {
        promiseSettled = true;
        clearTimeout(timeoutId);
        try {
          deepgramSocket.finish(); // Use finish() to close
        } catch (e) {
          console.warn('Error closing Deepgram socket:', e);
        }
      }
    };

    const timeoutId = setTimeout(() => {
      if (!promiseSettled) {
        console.error('Deepgram transcription timed out');
        cleanup();
        reject(new Error('Deepgram transcription timed out'));
      }
    }, 20000);

    deepgramSocket.on(LiveTranscriptionEvents.Open, () => {
      audioChunks.forEach((chunk) => deepgramSocket.send(chunk));
      setTimeout(() => {
        deepgramSocket.finish();
      }, 500)
    });

    deepgramSocket.on(LiveTranscriptionEvents.Transcript, (data) => {
      if (promiseSettled) return;
      const transcription = data?.channel?.alternatives?.[0]?.transcript;
      if (transcription) {
        accumulatedTranscript += transcription + ' ';
      }
      if (transcription && data.is_final && (data.speech_final || data.from_finalize)) {
        cleanup();
        resolve({ text: accumulatedTranscript.trim(), language });
      }
    });

    deepgramSocket.on(LiveTranscriptionEvents.Error, (error) => {
      if (promiseSettled) return;
      cleanup();
      reject(new Error(`Deepgram STT failed: ${error.message}`));
    });

    deepgramSocket.on(LiveTranscriptionEvents.Close, () => {
      if (!promiseSettled) {
        cleanup();
        if (accumulatedTranscript.trim()) {
          resolve({ text: accumulatedTranscript.trim(), language });
        } else {
          reject(new Error('Deepgram stream closed without transcription'));
        }
      }
    });
  });
};

export const supportedLanguages : string[] = ['en-US', 'es-ES', 'fr-FR']