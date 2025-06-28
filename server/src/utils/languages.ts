export const supportedLanguages = [
  { code: 'es-ES', name: 'Spanish (Spain)', voiceId: 'es-ES-enrique' },
  { code: 'fr-FR', name: 'French (France)', voiceId: 'fr-FR-maxime' },
  { code: 'en-US', name: 'English (US)', voiceId: 'en-US-paul' },
  { code: 'hi-IN', name: 'Hindi (India)', voiceId: 'hi-IN-rahul' },
  { code: 'ja-JP', name: 'Japanese (Japan)', voiceId: 'jp-JP-kenji'},
  { code: 'it-IT', name: 'Italian (Italy)', voiceId: 'it-IT-vincenzo'},
  { code: 'de-DE', name: 'German (Germany)', voiceId: 'de-DE-lia' },
];

export function getVoiceId(language: string): string {
  const lang = supportedLanguages.find((l) => l.code === language);
  return lang?.voiceId || 'en-US-paul';
}

export function getSupportedLanguageCodes(): string[] {
  return supportedLanguages.map((l) => l.code);
}

export function getLanguageName(languageCode: string): string {
  const lang = supportedLanguages.find((l) => l.code === languageCode);
  if (lang?.name) {
    // Extract just the language name without the country part
    return lang.name.split(' (')[0]; // "Hindi (India)" becomes "Hindi"
  }
  return languageCode; // fallback to code if name not found
}
