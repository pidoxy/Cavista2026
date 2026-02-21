export type AssistLanguageCode = 'en' | 'ha' | 'yo' | 'ig' | 'pcm';

export type AssistRiskLevel = 'high' | 'moderate' | 'low';

export interface AssistMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  isAudio?: boolean;
}

export interface AssistEvidence {
  source_type: 'local_guideline' | 'parsed_guideline' | string;
  guideline_section: string;
  source_excerpt: string;
  source_document?: string;
  cadre?: string;
  condition?: string;
  referral_required?: boolean;
  score?: number;
}

export interface AssistTriageRecommendation {
  summary_of_findings: string;
  recommended_actions_for_chw: string[];
  urgency_level: string;
  important_notes_for_chw?: string[];
  evidence_based_notes?: string;
}

export interface AssistTriageResult {
  mode: string;
  language: AssistLanguageCode;
  input_transcript: string;
  extracted_symptoms: string[];
  triage_recommendation: AssistTriageRecommendation;
  evidence: AssistEvidence[];
  risk_level: AssistRiskLevel;
  transcript?: string;
}

export type AssistPhase = 'language_select' | 'conversation' | 'results';

export type AssistRecordingState = 'idle' | 'recording' | 'processing' | 'recorded';
