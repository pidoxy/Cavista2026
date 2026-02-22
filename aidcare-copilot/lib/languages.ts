// lib/languages.ts — Single source of truth for all language configuration
// Replicated from aidcare-lang — ElevenLabs, YarnGPT (Yoruba), OpenAI Whisper
// UNDP Nigeria IC × Timbuktu Initiative — International Mother Language Day

import { Language } from '../types';

export interface LanguageConfig {
  code: Language;
  name: string;
  nativeName: string;
  nativeScript: string;
  greeting: string;
  placeholder: string;
  sendLabel: string;
  completeLabel: string;
  thinkingLabel: string;
  speakingLabel: string;
  listeningLabel: string;
  assessmentLabel: string;
  restartLabel: string;
  whisperCode: string; // BCP-47 for Whisper — ha/yo/ig may not be supported, use 'en' or omit
  elevenLabsVoiceId: string; // ElevenLabs voice ID (Yoruba uses YarnGPT via backend)
  accentColor: string;
}

export const LANGUAGES: Record<Language, LanguageConfig> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    nativeScript: 'English',
    greeting: "Hello! How are you feeling today?",
    placeholder: "Describe your symptoms...",
    sendLabel: 'Send',
    completeLabel: 'Complete Assessment',
    thinkingLabel: 'Analysing your symptoms...',
    speakingLabel: 'Speaking...',
    listeningLabel: 'Recording',
    assessmentLabel: 'Health Assessment',
    restartLabel: 'New Triage',
    whisperCode: 'en',
    elevenLabsVoiceId: process.env.NEXT_PUBLIC_VOICE_EN || 'EXAVITQu4vr4xnSDxMaL',
    accentColor: '#2563eb',
  },
  ha: {
    code: 'ha',
    name: 'Hausa',
    nativeName: 'Hausa',
    nativeScript: 'هَوُسَ',
    greeting: "Sannu! Ina nan don taimaka maka da lafiyarka. Zaka iya rubuta ko amfani da microphone. Ka faɗa mini — yaya kake ji?",
    placeholder: 'Faɗa alamun rashin lafiyar ka...',
    sendLabel: 'Aika',
    completeLabel: 'Kammala Gwajin',
    thinkingLabel: 'Ina nazarin alamunka...',
    speakingLabel: 'Ana magana...',
    listeningLabel: 'Ana yin rikodin',
    assessmentLabel: 'Gwajin Lafiya',
    restartLabel: 'Fara Gwajin Sabon',
    whisperCode: 'en', // Whisper may not support; fallback to auto-detect
    elevenLabsVoiceId: process.env.NEXT_PUBLIC_VOICE_HA || 'TBvIh5TNCMX6pQNIcWV8',
    accentColor: '#059669',
  },
  yo: {
    code: 'yo',
    name: 'Yorùbá',
    nativeName: 'Yorùbá',
    nativeScript: 'Yorùbá',
    greeting: "Ẹ káàárọ̀! Mo wà nibi lati ràn ọ́ lọ́wọ́ pẹ̀lú àwọn àmì àìsàn rẹ. O lè tẹ̀ àbọ̀ tàbí lo microphone. Jọ̀wọ́ sọ fún mi — bí o ṣe ń ní?",
    placeholder: 'Sọ àwọn àmì àìsàn rẹ...',
    sendLabel: 'Fi Ránṣẹ́',
    completeLabel: 'Parí Ìdánwò',
    thinkingLabel: 'Mo ń ṣe àyẹ̀wò àwọn àmì rẹ...',
    speakingLabel: 'Ń sọ̀rọ̀...',
    listeningLabel: 'Ń gbọ́',
    assessmentLabel: 'Ìdánwò Ìlera',
    restartLabel: 'Bẹ̀rẹ̀ Ìdánwò Tuntun',
    whisperCode: 'en', // Yoruba uses YarnGPT for TTS; Whisper fallback
    elevenLabsVoiceId: process.env.NEXT_PUBLIC_VOICE_YO || '9Dbo4hEvXQ5l7MXGZFQA', // Backend ignores for yo, uses YarnGPT
    accentColor: '#7c3aed',
  },
  ig: {
    code: 'ig',
    name: 'Igbo',
    nativeName: 'Igbo',
    nativeScript: 'Igbo',
    greeting: "Nnọọ! Anọ m ebe a iji nyere gị aka na ihe ọ bụ na-eme gị. I nwere ike ịdeere ma ọ bụ iji microphone. Biko gwa m — gị dị etu a?",
    placeholder: 'Kọọ ihe ọ bụ na-eme gị...',
    sendLabel: 'Ziga',
    completeLabel: 'Mechaa Nyocha',
    thinkingLabel: 'Ana m enyocha ihe ọ bụ na-eme gị...',
    speakingLabel: 'Na-asụ okwu...',
    listeningLabel: 'Na-edebanye ụda',
    assessmentLabel: 'Nyocha Ahụike',
    restartLabel: 'Malite Nyocha Ọhụrụ',
    whisperCode: 'en',
    elevenLabsVoiceId: process.env.NEXT_PUBLIC_VOICE_IG || 'kMy0Co9mV2JmuSM9VcRQ',
    accentColor: '#dc2626',
  },
  pcm: {
    code: 'pcm',
    name: 'Naija Pidgin',
    nativeName: 'Naija Pidgin',
    nativeScript: 'Naija',
    greeting: "How you dey! I dey here to help you check your body. You fit type or use microphone. Tell me — wetin dey do you?",
    placeholder: 'Tell me wetin dey do you...',
    sendLabel: 'Send Am',
    completeLabel: 'Complete Check',
    thinkingLabel: 'I dey check wetin you tell me...',
    speakingLabel: 'I dey talk...',
    listeningLabel: 'I dey hear you',
    assessmentLabel: 'Body Check',
    restartLabel: 'Start New Check',
    whisperCode: 'en', // No dedicated Pidgin model
    elevenLabsVoiceId: process.env.NEXT_PUBLIC_VOICE_PCM || '8P18CIVcRlwP98FOjZDm',
    accentColor: '#d97706',
  },
};

export const LANGUAGE_ORDER: Language[] = ['en', 'ha', 'yo', 'ig', 'pcm'];

export function getLanguage(code: Language): LanguageConfig {
  return LANGUAGES[code] || LANGUAGES['en'];
}
