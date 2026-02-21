import { AssistLanguageCode } from '../types/triage';

export interface AssistLanguage {
  code: AssistLanguageCode;
  name: string;
  nativeName: string;
  greeting: string;
  placeholder: string;
  sendLabel: string;
  completeLabel: string;
  restartLabel: string;
  urgencyLabel: string;
  actionsLabel: string;
  symptomsLabel: string;
  speakSummaryLabel: string;
  accentColor: string;
  elevenLabsVoiceId: string;
}

export const ASSIST_LANGUAGES: Record<AssistLanguageCode, AssistLanguage> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    greeting: "Hello. I can help assess symptoms. Tell me what you're experiencing.",
    placeholder: 'Describe your symptoms...',
    sendLabel: 'Send',
    completeLabel: 'Complete Assessment',
    restartLabel: 'Start New Assessment',
    urgencyLabel: 'Urgency',
    actionsLabel: 'Recommended Actions',
    symptomsLabel: 'Extracted Symptoms',
    speakSummaryLabel: 'Listen Summary',
    accentColor: '#2563eb',
    elevenLabsVoiceId: process.env.NEXT_PUBLIC_VOICE_EN || 'EXAVITQu4vr4xnSDxMaL',
  },
  ha: {
    code: 'ha',
    name: 'Hausa',
    nativeName: 'Hausa',
    greeting: 'Sannu. Zan taimaka maka tantance alamun rashin lafiya. Ka fada min yadda kake ji.',
    placeholder: 'Rubuta alamun rashin lafiya...',
    sendLabel: 'Aika',
    completeLabel: 'Kammala',
    restartLabel: 'Sake Farawa',
    urgencyLabel: 'Gaggawa',
    actionsLabel: 'Matakan da ake so',
    symptomsLabel: 'Alamun da aka gano',
    speakSummaryLabel: 'Saurari Takaitawa',
    accentColor: '#059669',
    elevenLabsVoiceId: process.env.NEXT_PUBLIC_VOICE_HA || 'TBvIh5TNCMX6pQNIcWV8',
  },
  yo: {
    code: 'yo',
    name: 'Yoruba',
    nativeName: 'Yoruba',
    greeting: 'E kaabo. Emi yoo ran e lowo lati se ayewo aami aisan. So fun mi bi ara se n ri.',
    placeholder: 'Ko awon aami aisan re...',
    sendLabel: 'Fi ranse',
    completeLabel: 'Pari Ayewo',
    restartLabel: 'Bere Tuntun',
    urgencyLabel: 'Ipele Pajawiri',
    actionsLabel: 'Igbese ti a daba',
    symptomsLabel: 'Aami ti a ri',
    speakSummaryLabel: 'Gbo Akotan',
    accentColor: '#7c3aed',
    elevenLabsVoiceId: process.env.NEXT_PUBLIC_VOICE_YO || '9Dbo4hEvXQ5l7MXGZFQA',
  },
  ig: {
    code: 'ig',
    name: 'Igbo',
    nativeName: 'Igbo',
    greeting: 'Nnoo. Aga m enyere gi nyochaa mgbaama ahuike. Gwa m ihe na-eme gi.',
    placeholder: 'Dee mgbaama ahuike gi...',
    sendLabel: 'Zipu',
    completeLabel: 'Mechaa Nyocha',
    restartLabel: 'Malite Ozo',
    urgencyLabel: 'Ihe Mberede',
    actionsLabel: 'Nduzi A Turu Aro',
    symptomsLabel: 'Mgbaama Achoputara',
    speakSummaryLabel: 'Nu Nchikota',
    accentColor: '#dc2626',
    elevenLabsVoiceId: process.env.NEXT_PUBLIC_VOICE_IG || 'kMy0Co9mV2JmuSM9VcRQ',
  },
  pcm: {
    code: 'pcm',
    name: 'Naija Pidgin',
    nativeName: 'Naija Pidgin',
    greeting: 'How you dey. I fit help check your symptom. Tell me wetin dey do you.',
    placeholder: 'Tell me wetin dey do you...',
    sendLabel: 'Send am',
    completeLabel: 'Complete Check',
    restartLabel: 'Start New Check',
    urgencyLabel: 'How serious',
    actionsLabel: 'Wetin you fit do',
    symptomsLabel: 'Symptoms wey show',
    speakSummaryLabel: 'Hear Summary',
    accentColor: '#d97706',
    elevenLabsVoiceId: process.env.NEXT_PUBLIC_VOICE_PCM || '8P18CIVcRlwP98FOjZDm',
  },
};

export const ASSIST_LANGUAGE_ORDER: AssistLanguageCode[] = ['ha', 'yo', 'ig', 'pcm', 'en'];
