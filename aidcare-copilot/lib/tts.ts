'use client';

import { AssistLanguageCode } from '../types/triage';
import { ASSIST_LANGUAGES } from './languages';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:8000';

let currentAudio: HTMLAudioElement | null = null;
let currentObjectUrl: string | null = null;
let isFetching = false;

export function stopCurrentAudio() {
  isFetching = false;
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = '';
    currentAudio = null;
  }
  if (currentObjectUrl) {
    URL.revokeObjectURL(currentObjectUrl);
    currentObjectUrl = null;
  }
}

export async function speakText(
  text: string,
  languageCode: AssistLanguageCode,
  onStart?: () => void,
  onEnd?: () => void
): Promise<void> {
  if (isFetching || !text.trim()) return;

  stopCurrentAudio();
  const voiceId = ASSIST_LANGUAGES[languageCode]?.elevenLabsVoiceId || '';
  isFetching = true;

  try {
    const res = await fetch(`${API_BASE}/copilot/tts/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice_id: voiceId, language: languageCode }),
    });

    if (!res.ok) {
      isFetching = false;
      onEnd?.();
      return;
    }

    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    currentObjectUrl = objectUrl;

    const audio = new Audio(objectUrl);
    currentAudio = audio;
    audio.onplay = () => {
      isFetching = false;
      onStart?.();
    };
    audio.onended = () => {
      isFetching = false;
      URL.revokeObjectURL(objectUrl);
      currentAudio = null;
      currentObjectUrl = null;
      onEnd?.();
    };
    audio.onerror = () => {
      isFetching = false;
      URL.revokeObjectURL(objectUrl);
      currentAudio = null;
      currentObjectUrl = null;
      onEnd?.();
    };

    await audio.play();
  } catch {
    isFetching = false;
    onEnd?.();
  }
}
