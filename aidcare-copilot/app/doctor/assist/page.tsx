'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  copilotContinueConversation,
  copilotProcessAudio,
  copilotProcessText,
  getCopilotGuidelineSources,
  getErrorMessage,
} from '../../../lib/api';
import { ASSIST_LANGUAGES, ASSIST_LANGUAGE_ORDER } from '../../../lib/languages';
import { speakText, stopCurrentAudio } from '../../../lib/tts';
import {
  AssistLanguageCode,
  AssistMessage,
  AssistPhase,
  AssistRecordingState,
  AssistRiskLevel,
  AssistTriageResult,
} from '../../../types/triage';
import { getSessionDoctor } from '../../../lib/session';

const RISK_STYLES: Record<AssistRiskLevel, string> = {
  high: 'bg-red-50 text-red-700 border-red-200',
  moderate: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

export default function DoctorAssistPage() {
  const router = useRouter();
  const doctor = getSessionDoctor();

  const [phase, setPhase] = useState<AssistPhase>('language_select');
  const [language, setLanguage] = useState<AssistLanguageCode>('en');
  const [messages, setMessages] = useState<AssistMessage[]>([]);
  const [conversationContext, setConversationContext] = useState<string[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoCompleting, setAutoCompleting] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AssistTriageResult | null>(null);
  const [sources, setSources] = useState<{ chw: number; clinical: number; parsed_guidelines: number } | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const [recordingState, setRecordingState] = useState<AssistRecordingState>('idle');
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const lang = ASSIST_LANGUAGES[language];

  useEffect(() => {
    if (!doctor) {
      router.replace('/doctor');
    }
  }, [doctor, router]);

  useEffect(() => {
    getCopilotGuidelineSources().then((data) => setSources(data.sources)).catch(() => null);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      stopCurrentAudio();
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
    };
  }, []);

  if (!doctor) return null;

  function beginConversation() {
    setPhase('conversation');
    setMessages([{ role: 'assistant', content: lang.greeting }]);
    setConversationContext([]);
    setInputText('');
    setResult(null);
    setError('');
  }

  async function handleSendMessage(prefill?: string) {
    const text = (prefill ?? inputText).trim();
    if (!text || loading) return;

    setError('');
    setLoading(true);
    if (!prefill) setInputText('');

    const userMessage: AssistMessage = { role: 'user', content: text };
    const nextMessages = [...messages, userMessage];
    const nextContext = [...conversationContext, text];
    setMessages(nextMessages);
    setConversationContext(nextContext);

    await continueConversation(text, nextMessages, nextContext);
    setLoading(false);
  }

  function buildConversationHistory(msgs: AssistMessage[]): string {
    return msgs
      .filter((m) => m.role !== 'system')
      .map((m) => `${m.role === 'user' ? 'PATIENT' : 'YOU'}: ${m.content}`)
      .join('\n');
  }

  async function continueConversation(userMessage: string, currentMessages: AssistMessage[], contextSnapshot: string[]) {
    try {
      const data = await copilotContinueConversation({
        conversationHistory: buildConversationHistory(currentMessages),
        latestMessage: userMessage,
        language,
      });

      setMessages((prev) => [...prev, { role: 'assistant', content: data.response || lang.greeting }]);

      if (data.should_auto_complete || data.conversation_complete) {
        setAutoCompleting(true);
        setTimeout(() => {
          completeAssessment(contextSnapshot);
        }, 1300);
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Unable to continue conversation.'));
      setMessages((prev) => [...prev, { role: 'system', content: 'I could not process that. Please try again.' }]);
    }
  }

  async function completeAssessment(contextSnapshot?: string[]) {
    setLoading(true);
    setError('');
    try {
      const fullText = (contextSnapshot || conversationContext).join(' ');
      const triage = await copilotProcessText(fullText, language);
      setResult(triage);
      setPhase('results');
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Unable to complete assessment.'));
      setAutoCompleting(false);
    } finally {
      setLoading(false);
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        setRecordingState('recorded');
        stream.getTracks().forEach((track) => track.stop());
      };

      recorder.start();
      setRecordingState('recording');
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => setRecordingTime((prev) => prev + 1), 1000);
    } catch {
      setError('Microphone access failed. Check browser permissions.');
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop();
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    }
  }

  function cancelRecording() {
    if (recordingState === 'recording') stopRecording();
    setRecordingState('idle');
    setAudioBlob(null);
    setRecordingTime(0);
    audioChunksRef.current = [];
  }

  async function sendAudioMessage() {
    if (!audioBlob) return;
    setError('');
    setLoading(true);
    setRecordingState('processing');

    try {
      const triage = await copilotProcessAudio(audioBlob, language);
      if (triage.transcript) {
        setMessages((prev) => [...prev, { role: 'user', content: triage.transcript || '', isAudio: true }]);
      }
      setResult(triage);
      setPhase('results');
      setAudioBlob(null);
      setRecordingTime(0);
      setRecordingState('idle');
      audioChunksRef.current = [];
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Audio processing failed. Try typing instead.'));
      setRecordingState('recorded');
    } finally {
      setLoading(false);
    }
  }

  function resetAssist() {
    stopCurrentAudio();
    setPhase('language_select');
    setMessages([]);
    setConversationContext([]);
    setInputText('');
    setResult(null);
    setError('');
    setAutoCompleting(false);
    cancelRecording();
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] px-4 py-8">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Copilot Assist</h1>
            <p className="text-sm text-gray-600">Multilingual triage assistant for {doctor.name}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => router.push('/doctor/scribe')}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
            >
              Back to Scribe
            </button>
            <button
              onClick={resetAssist}
              className="rounded-lg bg-gray-900 px-3 py-2 text-sm text-white hover:bg-gray-800"
            >
              Reset
            </button>
          </div>
        </div>

        {sources && (
          <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800">
            Sources loaded: CHW {sources.chw} • Clinical {sources.clinical} • Parsed {sources.parsed_guidelines}
          </div>
        )}

        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}

        {phase === 'language_select' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <h2 className="mb-3 text-base font-semibold text-gray-900">Choose Language</h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {ASSIST_LANGUAGE_ORDER.map((code) => {
                const item = ASSIST_LANGUAGES[code];
                const active = code === language;
                return (
                  <button
                    key={code}
                    onClick={() => setLanguage(code)}
                    className={`rounded-xl border px-3 py-3 text-left transition ${
                      active ? 'border-[#0066CC] bg-blue-50' : 'border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <p className="text-sm font-medium text-gray-900">{item.nativeName}</p>
                    <p className="text-xs text-gray-600">{item.name}</p>
                  </button>
                );
              })}
            </div>
            <button
              onClick={beginConversation}
              className="mt-4 w-full rounded-xl bg-[#0066CC] py-3 text-sm font-medium text-white hover:bg-[#0052a3]"
            >
              Start Assist Session
            </button>
          </div>
        )}

        {phase === 'conversation' && (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-sm font-medium text-gray-800">Conversation • {lang.nativeName}</p>
              {autoCompleting && <p className="text-xs text-blue-700">Auto-completing assessment...</p>}
            </div>

            <div className="mb-3 max-h-[420px] space-y-2 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50 p-3">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`rounded-lg px-3 py-2 text-sm ${
                    msg.role === 'user' ? 'ml-auto max-w-[85%] bg-blue-600 text-white' : 'max-w-[92%] bg-white text-gray-800'
                  }`}
                >
                  <p>{msg.content}</p>
                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => speakText(msg.content, language, () => setSpeaking(true), () => setSpeaking(false))}
                      className="mt-2 rounded-md border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-100"
                    >
                      {speaking ? 'Speaking...' : 'Speak'}
                    </button>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="mb-3 flex flex-wrap gap-2">
              <button
                onClick={() => handleSendMessage('Severe chest pain started 30 minutes ago with sweating and shortness of breath.')}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
              >
                Scenario: Chest Pain
              </button>
              <button
                onClick={() => handleSendMessage('Heavy bleeding after delivery with dizziness and weakness.')}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs text-gray-700 hover:bg-gray-50"
              >
                Scenario: Postpartum Emergency
              </button>
            </div>

            <div className="mb-3 flex gap-2">
              <input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={lang.placeholder}
                className="flex-1 rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#0066CC] focus:outline-none"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={loading || !inputText.trim()}
                className="rounded-lg bg-[#0066CC] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
              >
                {loading ? 'Sending...' : lang.sendLabel}
              </button>
            </div>

            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="mb-2 text-xs text-gray-600">Audio input</p>
              {recordingState === 'idle' && (
                <button onClick={startRecording} className="rounded-lg bg-gray-900 px-3 py-2 text-xs font-medium text-white">
                  Start Recording
                </button>
              )}
              {recordingState === 'recording' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600">Recording... {recordingTime}s</span>
                  <button onClick={stopRecording} className="rounded-lg border border-gray-300 px-2 py-1 text-xs">Stop</button>
                  <button onClick={cancelRecording} className="rounded-lg border border-gray-300 px-2 py-1 text-xs">Cancel</button>
                </div>
              )}
              {recordingState === 'recorded' && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-700">Recording captured</span>
                  <button onClick={sendAudioMessage} className="rounded-lg bg-[#0066CC] px-2 py-1 text-xs text-white">Process Audio</button>
                  <button onClick={cancelRecording} className="rounded-lg border border-gray-300 px-2 py-1 text-xs">Discard</button>
                </div>
              )}
              {recordingState === 'processing' && <span className="text-xs text-gray-700">Processing audio...</span>}
            </div>

            <button
              onClick={() => completeAssessment()}
              disabled={loading || conversationContext.length === 0}
              className="mt-3 w-full rounded-lg border border-[#0066CC] px-3 py-2 text-sm font-medium text-[#0066CC] disabled:opacity-50"
            >
              {loading ? 'Processing...' : lang.completeLabel}
            </button>
          </div>
        )}

        {phase === 'results' && result && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Assessment Result</h2>
              <span className={`rounded-full border px-3 py-1 text-xs font-medium ${RISK_STYLES[result.risk_level]}`}>
                {lang.urgencyLabel}: {result.triage_recommendation.urgency_level}
              </span>
            </div>

            <p className="mb-3 text-sm text-gray-700">{result.triage_recommendation.summary_of_findings}</p>
            <button
              onClick={() =>
                speakText(result.triage_recommendation.summary_of_findings, language, () => setSpeaking(true), () => setSpeaking(false))
              }
              className="mb-4 rounded-lg border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50"
            >
              {speaking ? 'Speaking...' : lang.speakSummaryLabel}
            </button>

            {result.extracted_symptoms.length > 0 && (
              <div className="mb-4">
                <p className="mb-1 text-xs font-medium text-gray-600">{lang.symptomsLabel}</p>
                <div className="flex flex-wrap gap-2">
                  {result.extracted_symptoms.map((symptom, idx) => (
                    <span key={idx} className="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-700">
                      {symptom}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-4">
              <p className="mb-2 text-xs font-medium text-gray-600">{lang.actionsLabel}</p>
              <ol className="list-decimal space-y-1 pl-5 text-sm text-gray-700">
                {result.triage_recommendation.recommended_actions_for_chw.map((action, idx) => (
                  <li key={idx}>{action}</li>
                ))}
              </ol>
            </div>

            <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <p className="mb-2 text-xs font-medium text-gray-600">Evidence</p>
              {result.evidence.length === 0 && <p className="text-xs text-gray-500">No evidence entries available.</p>}
              <div className="space-y-2">
                {result.evidence.map((item, idx) => (
                  <div key={idx} className="rounded-lg border border-gray-200 bg-white p-2">
                    <p className="text-xs font-medium text-gray-800">
                      {item.source_type} • {item.guideline_section}
                    </p>
                    <p className="text-xs text-gray-600">{item.source_excerpt}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                onClick={() => window.open('https://www.google.com/maps/search/hospital+near+me', '_blank')}
                className="rounded-lg bg-[#0066CC] px-3 py-2 text-sm font-medium text-white hover:bg-[#0052a3]"
              >
                Find Nearest Hospital
              </button>
              <button
                onClick={resetAssist}
                className="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
              >
                {lang.restartLabel}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
