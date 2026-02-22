'use client';
// lib/tts.ts — TTS client for Nigerian languages
// Replicated from aidcare-lang — ElevenLabs (en, ha, ig, pcm) + YarnGPT (yo) via backend proxy
// Calls /triage/tts with voice_id for language-appropriate voices

import { Language } from '../types';
import { LANGUAGES } from './languages';
import { triageTTS } from './api';

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

/**
 * Speak text via backend TTS proxy (ElevenLabs for en/ha/ig/pcm, YarnGPT for Yoruba).
 * Stops any currently-playing audio before starting new playback.
 */
export async function speakText(
  text: string,
  languageCode: Language,
  onStart?: () => void,
  onEnd?: () => void
): Promise<void> {
  if (isFetching) return;
  stopCurrentAudio();

  const voiceId = LANGUAGES[languageCode]?.elevenLabsVoiceId || '';
  isFetching = true;

  try {
    const blob = await triageTTS(text, languageCode, voiceId);
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
      currentObjectUrl = null;
      currentAudio = null;
      onEnd?.();
    };

    audio.onerror = () => {
      isFetching = false;
      URL.revokeObjectURL(objectUrl);
      currentObjectUrl = null;
      currentAudio = null;
      onEnd?.();
    };

    await audio.play();
  } catch (err) {
    isFetching = false;
    console.warn('TTS playback error (graceful fallback to text-only):', err);
    onEnd?.();
  }
}

export function isTTSAvailable(): boolean {
  return typeof window !== 'undefined' && typeof Audio !== 'undefined';
}
