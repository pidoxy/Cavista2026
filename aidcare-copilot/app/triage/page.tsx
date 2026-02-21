'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  copilotContinueConversation,
  copilotProcessAudio,
  copilotProcessText,
  getCopilotGuidelineSources,
  getErrorMessage,
} from '../../lib/api';
import { ASSIST_LANGUAGES, ASSIST_LANGUAGE_ORDER } from '../../lib/languages';
import { speakText, stopCurrentAudio } from '../../lib/tts';
import {
  AssistLanguageCode,
  AssistMessage,
  AssistPhase,
  AssistRecordingState,
  AssistRiskLevel,
  AssistTriageResult,
} from '../../types/triage';

const RISK_STYLES: Record<AssistRiskLevel, string> = {
  high: 'hospital-risk-high',
  moderate: 'hospital-risk-moderate',
  low: 'hospital-risk-low',
};

export default function TriagePage() {
  const router = useRouter();
  const [agreed, setAgreed] = useState(false);
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
    const hasAgreed = localStorage.getItem('aidcare_disclaimer_agreed') === 'true';
    setAgreed(hasAgreed);
  }, []);

  useEffect(() => {
    getCopilotGuidelineSources().then((data) => setSources(data.sources)).catch(() => null);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    return () => {
      stopCurrentAudio();
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  function acceptDisclaimer() {
    localStorage.setItem('aidcare_disclaimer_agreed', 'true');
    setAgreed(true);
  }

  function beginConversation() {
    setPhase('conversation');
    setMessages([{ role: 'assistant', content: lang.greeting }]);
    setConversationContext([]);
    setInputText('');
    setResult(null);
    setError('');
  }

  function buildConversationHistory(msgs: AssistMessage[]): string {
    return msgs
      .filter((m) => m.role !== 'system')
      .map((m) => `${m.role === 'user' ? 'PATIENT' : 'YOU'}: ${m.content}`)
      .join('\n');
  }

  async function handleSendMessage(prefill?: string) {
    const text = (prefill ?? inputText).trim();
    if (!text || loading) return;

    setLoading(true);
    setError('');
    if (!prefill) setInputText('');

    const userMessage: AssistMessage = { role: 'user', content: text };
    const nextMessages = [...messages, userMessage];
    const nextContext = [...conversationContext, text];
    setMessages(nextMessages);
    setConversationContext(nextContext);

    try {
      const data = await copilotContinueConversation({
        conversationHistory: buildConversationHistory(nextMessages),
        latestMessage: text,
        language,
      });

      setMessages((prev) => [...prev, { role: 'assistant', content: data.response || lang.greeting }]);

      if (data.should_auto_complete || data.conversation_complete) {
        setAutoCompleting(true);
        setTimeout(() => {
          completeAssessment(nextContext);
        }, 1300);
      }
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Unable to continue conversation.'));
      setMessages((prev) => [...prev, { role: 'system', content: 'Please try again.' }]);
    } finally {
      setLoading(false);
    }
  }

  async function completeAssessment(contextSnapshot?: string[]) {
    setLoading(true);
    setError('');
    try {
      const text = (contextSnapshot || conversationContext).join(' ');
      const triage = await copilotProcessText(text, language);
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
      recordingTimerRef.current = setInterval(() => setRecordingTime((v) => v + 1), 1000);
    } catch {
      setError('Microphone access failed.');
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
    setRecordingState('processing');
    setLoading(true);
    setError('');
    try {
      const triage = await copilotProcessAudio(audioBlob, language);
      if (triage.transcript) {
        setMessages((prev) => [...prev, { role: 'user', content: triage.transcript || '', isAudio: true }]);
      }
      setResult(triage);
      setPhase('results');
      setAudioBlob(null);
      setRecordingState('idle');
      setRecordingTime(0);
      audioChunksRef.current = [];
    } catch (e: unknown) {
      setError(getErrorMessage(e, 'Audio processing failed.'));
      setRecordingState('recorded');
    } finally {
      setLoading(false);
    }
  }

  function resetAll() {
    setPhase('language_select');
    setMessages([]);
    setConversationContext([]);
    setInputText('');
    setResult(null);
    setError('');
    setAutoCompleting(false);
    cancelRecording();
    stopCurrentAudio();
  }

  if (!agreed) {
    return (
      <div className="hospital-shell py-10">
        <div className="mx-auto max-w-3xl hospital-card">
          <p className="hospital-chip hospital-chip-warning">Safety Disclaimer</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900">AidCare Public Triage Intake</h1>
          <p className="mt-3 text-sm leading-relaxed text-slate-700">
            This assistant provides initial guidance only. It does not replace licensed clinical diagnosis. For severe
            symptoms, proceed to emergency care immediately.
          </p>
          <div className="hospital-separator" />
          <div className="flex flex-wrap gap-2">
            <button onClick={acceptDisclaimer} className="hospital-btn hospital-btn-primary">
              I Understand, Continue
            </button>
            <button onClick={() => router.push('/doctor')} className="hospital-btn hospital-btn-secondary">
              Doctor Console
            </button>
            <button onClick={() => router.push('/opener')} className="hospital-btn hospital-btn-quiet">
              OpenER Routing
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="hospital-shell py-6 md:py-8">
      <header className="hospital-topbar mb-4">
        <div className="hospital-brand">
          <span className="hospital-brand-mark">A</span>
          <div>
            <p className="hospital-brand-title">AidCare Triage Front Desk</p>
            <p className="hospital-brand-subtitle">Community Symptom Intake</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => router.push('/doctor')} className="hospital-btn hospital-btn-secondary">
            Doctor Console
          </button>
          <button onClick={() => router.push('/opener')} className="hospital-btn hospital-btn-secondary">
            OpenER
          </button>
          <button onClick={resetAll} className="hospital-btn hospital-btn-quiet">
            Reset
          </button>
        </div>
      </header>

      {sources && (
        <p className="hospital-alert hospital-alert-info mb-3">
          Sources: CHW {sources.chw} • Clinical {sources.clinical} • Parsed {sources.parsed_guidelines}
        </p>
      )}
      {error && <p className="hospital-alert hospital-alert-danger mb-3">{error}</p>}

      {phase === 'language_select' && (
        <div className="grid gap-4 lg:grid-cols-[1.12fr_0.88fr]">
          <section className="hospital-card">
            <p className="hospital-panel-title">Step 1</p>
            <h1 className="text-2xl font-semibold text-slate-900">Choose Language</h1>
            <p className="mt-1 text-sm text-slate-600">Select preferred language for symptom conversation.</p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {ASSIST_LANGUAGE_ORDER.map((code) => {
                const item = ASSIST_LANGUAGES[code];
                return (
                  <button
                    key={code}
                    onClick={() => setLanguage(code)}
                    className={`hospital-list-item ${language === code ? 'active' : ''}`}
                  >
                    <p className="text-sm font-semibold text-slate-900">{item.nativeName}</p>
                    <p className="text-xs text-slate-600">{item.name}</p>
                  </button>
                );
              })}
            </div>
            <button onClick={beginConversation} className="hospital-btn hospital-btn-primary mt-4">
              Start Assessment
            </button>
          </section>

          <aside className="hospital-card space-y-3">
            <div className="hospital-panel-muted">
              <p className="hospital-panel-title">How It Works</p>
              <ol className="list-decimal pl-5 text-sm text-slate-700 space-y-1">
                <li>Describe symptoms in your language.</li>
                <li>Use voice recording if typing is difficult.</li>
                <li>Review urgency and recommended next steps.</li>
              </ol>
            </div>
            <div className="hospital-panel">
              <p className="hospital-panel-title">Emergency Escalation</p>
              <p className="text-sm text-slate-700">For critical findings, route immediately to OpenER and alert a prepared facility.</p>
            </div>
          </aside>
        </div>
      )}

      {phase === 'conversation' && (
        <div className="grid gap-4 xl:grid-cols-[1.32fr_0.82fr]">
          <section className="hospital-card">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="hospital-panel-title">Step 2</p>
                <h2 className="text-xl font-semibold text-slate-900">Symptom Conversation</h2>
              </div>
              <div className="flex items-center gap-2">
                <span className="hospital-chip hospital-chip-primary">{lang.nativeName}</span>
                {autoCompleting && <span className="hospital-chip hospital-chip-warning">Auto-completing</span>}
              </div>
            </div>

            <div className="hospital-chat">
              {messages.map((msg, idx) => (
                <div key={idx} className={`hospital-chat-row ${msg.role}`}>
                  {msg.content}
                  {msg.role === 'assistant' && (
                    <button
                      onClick={() => speakText(msg.content, language, () => setSpeaking(true), () => setSpeaking(false))}
                      className="hospital-btn hospital-btn-secondary mt-2 !py-1 !px-2 !text-xs"
                    >
                      {speaking ? 'Speaking...' : 'Speak'}
                    </button>
                  )}
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            <div className="mt-3 flex gap-2">
              <input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder={lang.placeholder}
                className="hospital-input"
              />
              <button
                onClick={() => handleSendMessage()}
                disabled={loading || !inputText.trim()}
                className="hospital-btn hospital-btn-primary"
              >
                {loading ? 'Sending...' : lang.sendLabel}
              </button>
            </div>

            <button
              onClick={() => completeAssessment()}
              disabled={loading || conversationContext.length === 0}
              className="hospital-btn hospital-btn-secondary mt-3"
            >
              {loading ? 'Processing...' : lang.completeLabel}
            </button>
          </section>

          <aside className="hospital-card space-y-3">
            <div className="hospital-panel">
              <p className="hospital-panel-title">Scenario Presets</p>
              <div className="space-y-2">
                <button
                  onClick={() => handleSendMessage('I have severe chest pain with sweating and shortness of breath for 30 minutes.')}
                  className="hospital-btn hospital-btn-secondary w-full text-left"
                >
                  Chest Pain Emergency
                </button>
                <button
                  onClick={() => handleSendMessage('Heavy bleeding after delivery and dizziness started 20 minutes ago.')}
                  className="hospital-btn hospital-btn-secondary w-full text-left"
                >
                  Postpartum Bleeding
                </button>
              </div>
            </div>

            <div className="hospital-panel-muted">
              <p className="hospital-panel-title">Voice Input</p>
              {recordingState === 'idle' && (
                <button onClick={startRecording} className="hospital-btn hospital-btn-primary">
                  Start Recording
                </button>
              )}
              {recordingState === 'recording' && (
                <div className="space-y-2">
                  <p className="text-sm text-red-700">Recording... {recordingTime}s</p>
                  <div className="flex gap-2">
                    <button onClick={stopRecording} className="hospital-btn hospital-btn-secondary">Stop</button>
                    <button onClick={cancelRecording} className="hospital-btn hospital-btn-secondary">Cancel</button>
                  </div>
                </div>
              )}
              {recordingState === 'recorded' && (
                <div className="space-y-2">
                  <p className="text-sm text-slate-700">Recording captured.</p>
                  <div className="flex gap-2">
                    <button onClick={sendAudioMessage} className="hospital-btn hospital-btn-primary">Process Audio</button>
                    <button onClick={cancelRecording} className="hospital-btn hospital-btn-secondary">Discard</button>
                  </div>
                </div>
              )}
              {recordingState === 'processing' && <p className="text-sm text-slate-700">Processing audio...</p>}
            </div>

            <div className="hospital-panel">
              <p className="hospital-panel-title">Context Status</p>
              <p className="text-sm text-slate-700">Captured statements: {conversationContext.length}</p>
            </div>
          </aside>
        </div>
      )}

      {phase === 'results' && result && (
        <div className="grid gap-4 xl:grid-cols-[1.24fr_0.86fr]">
          <section className="hospital-card">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="hospital-panel-title">Step 3</p>
                <h2 className="text-xl font-semibold text-slate-900">Assessment Result</h2>
              </div>
              <span className={`hospital-chip ${RISK_STYLES[result.risk_level]}`}>
                {lang.urgencyLabel}: {result.triage_recommendation.urgency_level}
              </span>
            </div>

            <div className="hospital-panel-muted mb-3">
              <p className="text-sm text-slate-800">{result.triage_recommendation.summary_of_findings}</p>
              <button
                onClick={() => speakText(result.triage_recommendation.summary_of_findings, language, () => setSpeaking(true), () => setSpeaking(false))}
                className="hospital-btn hospital-btn-secondary mt-2"
              >
                {speaking ? 'Speaking...' : lang.speakSummaryLabel}
              </button>
            </div>

            <div className="mb-3">
              <p className="hospital-panel-title">Actions</p>
              <ol className="list-decimal pl-5 text-sm text-slate-700 space-y-1">
                {result.triage_recommendation.recommended_actions_for_chw.map((action, idx) => (
                  <li key={idx}>{action}</li>
                ))}
              </ol>
            </div>

            <div className="hospital-panel">
              <p className="hospital-panel-title">Evidence</p>
              <div className="space-y-2">
                {result.evidence.map((e, i) => (
                  <div key={i} className="hospital-panel-muted">
                    <p className="text-xs font-semibold text-slate-800">{e.source_type} • {e.guideline_section}</p>
                    <p className="mt-1 text-xs text-slate-600">{e.source_excerpt}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <aside className="hospital-card space-y-3">
            <div className={`hospital-panel ${RISK_STYLES[result.risk_level]}`}>
              <p className="hospital-panel-title">Risk Band</p>
              <p className="hospital-panel-value">{result.risk_level.toUpperCase()}</p>
            </div>
            <div className="hospital-panel">
              <p className="hospital-panel-title">Next Step</p>
              <div className="space-y-2">
                <button onClick={() => router.push('/opener')} className="hospital-btn hospital-btn-primary w-full">
                  Escalate via OpenER
                </button>
                <button onClick={resetAll} className="hospital-btn hospital-btn-secondary w-full">
                  {lang.restartLabel}
                </button>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
