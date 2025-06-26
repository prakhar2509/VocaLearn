export const supportedLanguages = [
  { code: 'es-ES', name: 'Spanish (Spain)', voiceId: 'juan-es-ES' },
  { code: 'fr-FR', name: 'French (France)', voiceId: 'marie-fr-FR' },
  { code: 'en-US', name: 'English (US)', voiceId: 'ryan-en-US' },
  { code: 'hi-IN', name: 'Hindi (India)', voiceId: 'arjun-hi-IN' },
];

export function getVoiceId(language: string): string {
  const lang = supportedLanguages.find((l) => l.code === language);
  return lang?.voiceId || 'ryan-en-US';
}
