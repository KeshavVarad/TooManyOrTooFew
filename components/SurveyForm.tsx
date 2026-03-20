'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Question, AnswerValue } from '@/lib/types';
import type { User } from '@supabase/supabase-js';

export default function SurveyForm() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Check if this user already submitted
  useEffect(() => {
    if (!user) return;
    supabase
      .from('submissions')
      .select('user_id')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => setAlreadySubmitted(!!data));
  }, [user]);

  if (authLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div className="spinner" />
    </div>
  );

  if (!user) return <SignInGate />;
  if (alreadySubmitted) return <AlreadySubmitted />;
  return <SurveyBody user={user} onSubmitted={() => setAlreadySubmitted(true)} />;
}

// ─── Sign-In Gate ──────────────────────────────────────────────────────────────
function SignInGate() {
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  async function signInWithGoogle() {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });
  }

  return (
    <div className="animate-fade-up" style={{ maxWidth: 560, margin: '80px auto', padding: '0 24px' }}>
      <h1 style={{ fontSize: 42, marginBottom: 6 }}>Research Survey</h1>
      <span className="accent-line" />

      {/* Anonymity Notice */}
      <div style={{
        margin: '28px 0',
        padding: '20px 24px',
        background: 'var(--sage-dim)',
        border: '1px solid rgba(106,143,126,0.3)',
        borderLeft: '3px solid var(--sage)',
        borderRadius: 2,
      }}>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
            <circle cx="9" cy="9" r="8" stroke="var(--sage)" strokeWidth="1.2"/>
            <path d="M9 8v5M9 6h.01" stroke="var(--sage)" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
          <div>
            <p style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, marginBottom: 6 }}>
              Your responses are completely anonymous
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7 }}>
              We ask you to sign in only to ensure one response per person. <strong style={{ color: 'var(--text)' }}>Your identity is never linked to your answers.</strong> We store only the fact that your account has responded — not what you said. You will be signed out automatically after submitting.
            </p>
          </div>
        </div>
      </div>

      <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 28, lineHeight: 1.7 }}>
        Sign in with Google to begin the survey. This takes less than a minute.
      </p>

      <button
        className="btn-primary"
        onClick={signInWithGoogle}
        disabled={loading}
        style={{ gap: 12, padding: '12px 28px' }}
      >
        {loading ? <div className="spinner" style={{ width: 16, height: 16 }} /> : (
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
            <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
            <path d="M3.964 10.706A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.706V4.962H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.038l3.007-2.332z" fill="#FBBC05"/>
            <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.962L3.964 7.294C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
          </svg>
        )}
        {loading ? 'Redirecting…' : 'Continue with Google'}
      </button>

      <p style={{ marginTop: 20, fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.6 }}>
        By continuing you agree that your participation is voluntary and responses are used for academic research only.
      </p>
    </div>
  );
}

// ─── Already Submitted ─────────────────────────────────────────────────────────
function AlreadySubmitted() {
  return (
    <div className="animate-fade-up" style={{ maxWidth: 480, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        background: 'var(--gold-dim)', border: '1px solid var(--gold)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        margin: '0 auto 24px',
      }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M4 11.5L8.5 16L18 6" stroke="var(--gold)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h2 style={{ fontSize: 34, marginBottom: 12 }}>Already submitted</h2>
      <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 32 }}>
        We already have your response. Each participant may submit once to keep the results fair.
      </p>
      <a href="/results" className="btn-ghost" style={{ textDecoration: 'none' }}>
        View Results →
      </a>
    </div>
  );
}

// ─── Survey Body ───────────────────────────────────────────────────────────────
function SurveyBody({ user, onSubmitted }: { user: User; onSubmitted: () => void }) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  useEffect(() => {
    supabase
      .from('questions')
      .select('*')
      .order('order_index')
      .then(({ data }) => {
        setQuestions((data ?? []) as Question[]);
        setLoading(false);
      });
  }, []);

  function setAnswer(questionId: string, value: AnswerValue) {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const missing = questions.filter(q => q.required && !answers[q.id]);
    if (missing.length > 0) {
      setError(`Please answer all required questions (${missing.length} remaining).`);
      return;
    }

    setSubmitting(true);
    try {
      // Insert response
      const { data: response, error: rErr } = await supabase
        .from('responses')
        .insert({ session_id: crypto.randomUUID() })
        .select()
        .single();
      if (rErr || !response) throw rErr;

      // Insert answers
      const answerRows = Object.entries(answers).map(([question_id, value]) => ({
        response_id: response.id,
        question_id,
        value,
        is_featured: false,
      }));
      const { error: aErr } = await supabase.from('answers').insert(answerRows);
      if (aErr) throw aErr;

      // Record submission (dedup marker) — this is NOT linked to answers
      await supabase.from('submissions').insert({ user_id: user.id });

      // Sign out immediately to preserve anonymity in the browser
      await supabase.auth.signOut();

      setSubmitted(true);
      onSubmitted();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div className="spinner" />
    </div>
  );

  if (questions.length === 0) return (
    <div style={{ textAlign: 'center', padding: '80px 24px', color: 'var(--text-muted)' }}>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, marginBottom: 8 }}>No questions yet</div>
      <div style={{ fontSize: 12 }}>Check back soon or contact the administrator.</div>
    </div>
  );

  if (submitted) return (
    <div className="animate-fade-up" style={{ maxWidth: 560, margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
      <div style={{
        width: 52, height: 52, borderRadius: '50%',
        background: 'var(--sage-dim)', border: '1px solid var(--sage)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
      }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M4 11.5L8.5 16L18 6" stroke="var(--sage)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h2 style={{ fontSize: 36, marginBottom: 12 }}>Thank you.</h2>
      <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 8 }}>
        Your response has been recorded anonymously. You have been signed out to protect your privacy.
      </p>
      <p style={{ color: 'var(--text-dim)', fontSize: 12, marginBottom: 32 }}>
        Your identity was never associated with your answers.
      </p>
      <a href="/results" className="btn-ghost" style={{ textDecoration: 'none' }}>
        View Results →
      </a>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 680, margin: '0 auto', padding: '48px 24px' }}>
      <div className="animate-fade-up" style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 42, marginBottom: 8 }}>Research Survey</h1>
        <span className="accent-line" style={{ marginBottom: 16 }} />
        <div style={{
          marginTop: 20,
          padding: '12px 16px',
          background: 'var(--sage-dim)',
          border: '1px solid rgba(106,143,126,0.25)',
          borderRadius: 2,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="7" cy="7" r="6" stroke="var(--sage)" strokeWidth="1.2"/>
            <path d="M7 6v4M7 4.5h.01" stroke="var(--sage)" strokeWidth="1.3" strokeLinecap="round"/>
          </svg>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
            Your responses are anonymous. Your identity is not linked to your answers.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            question={q}
            index={i}
            value={answers[q.id]}
            onChange={(val) => setAnswer(q.id, val)}
          />
        ))}
      </div>

      {error && (
        <div style={{
          marginTop: 24, padding: '12px 16px',
          background: 'rgba(201,64,64,0.1)', border: '1px solid rgba(201,64,64,0.3)',
          borderRadius: 2, color: '#c94040', fontSize: 13,
        }}>
          {error}
        </div>
      )}

      <div style={{ marginTop: 40, display: 'flex', alignItems: 'center', gap: 16 }}>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Submitting…</> : 'Submit Response'}
        </button>
        <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>
          {Object.keys(answers).length} / {questions.length} answered
        </span>
      </div>
    </form>
  );
}

// ─── Question Card ─────────────────────────────────────────────────────────────
function QuestionCard({ question, index, value, onChange }: {
  question: Question; index: number; value: AnswerValue | undefined; onChange: (v: AnswerValue) => void;
}) {
  return (
    <div className="card card-hover animate-fade-up" style={{ padding: 24, animationDelay: `${index * 60}ms` }}>
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-dim)', paddingTop: 4, minWidth: 28 }}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <div style={{ flex: 1 }}>
          <p style={{ color: 'var(--text)', lineHeight: 1.6, marginBottom: 6 }}>
            {question.text}
            {question.required && <span style={{ color: 'var(--accent)', marginLeft: 6 }}>*</span>}
          </p>
          <span className="badge badge-sage" style={{ fontSize: 9 }}>{question.type.replace('_', ' ')}</span>
        </div>
      </div>
      <div style={{ paddingLeft: 44 }}>
        {question.type === 'scale' && (
          <ScaleInput
            value={value?.type === 'scale' ? value.score : undefined}
            onChange={(score) => onChange({ type: 'scale', score })}
          />
        )}
        {question.type === 'multiple_choice' && (
          <RadioInput
            options={question.options ?? []}
            value={value?.type === 'multiple_choice' ? value.choice : undefined}
            onChange={(choice) => onChange({ type: 'multiple_choice', choice })}
          />
        )}
        {question.type === 'multi_select' && (
          <CheckboxInput
            options={question.options ?? []}
            value={value?.type === 'multi_select' ? value.choices : []}
            onChange={(choices) => onChange({ type: 'multi_select', choices })}
          />
        )}
        {question.type === 'open_ended' && (
          <textarea
            rows={4}
            placeholder="Write your response here…"
            value={value?.type === 'open_ended' ? value.text : ''}
            onChange={(e) => onChange({ type: 'open_ended', text: e.target.value })}
            style={{ resize: 'vertical' }}
          />
        )}
      </div>
    </div>
  );
}

function ScaleInput({ value, onChange }: { value?: number; onChange: (v: number) => void }) {
  const current = value ?? 5;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12, color: 'var(--text-muted)', fontSize: 11 }}>
        <span>1 — Strongly Disagree</span>
        <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 22, color: 'var(--accent)', lineHeight: 1 }}>{current}</span>
        <span>10 — Strongly Agree</span>
      </div>
      <input type="range" min={1} max={10} step={1} value={current} onChange={(e) => onChange(Number(e.target.value))} />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, color: 'var(--text-dim)', fontSize: 10 }}>
        {[1,2,3,4,5,6,7,8,9,10].map(n => (
          <span key={n} style={{ color: n === current ? 'var(--accent)' : undefined }}>{n}</span>
        ))}
      </div>
    </div>
  );
}

function RadioInput({ options, value, onChange }: { options: string[]; value?: string; onChange: (v: string) => void }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {options.map((opt) => (
        <label key={opt} style={{
          display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
          padding: '8px 12px', borderRadius: 2,
          border: `1px solid ${value === opt ? 'var(--accent-border)' : 'var(--border)'}`,
          background: value === opt ? 'var(--accent-dim)' : 'transparent',
          transition: 'all 0.15s', color: 'var(--text)', fontSize: 13,
        }}>
          <input type="radio" checked={value === opt} onChange={() => onChange(opt)} />
          {opt}
        </label>
      ))}
    </div>
  );
}

function CheckboxInput({ options, value, onChange }: { options: string[]; value: string[]; onChange: (v: string[]) => void }) {
  function toggle(opt: string) {
    if (value.includes(opt)) onChange(value.filter(v => v !== opt));
    else onChange([...value, opt]);
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {options.map((opt) => (
        <label key={opt} style={{
          display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
          padding: '8px 12px', borderRadius: 2,
          border: `1px solid ${value.includes(opt) ? 'var(--accent-border)' : 'var(--border)'}`,
          background: value.includes(opt) ? 'var(--accent-dim)' : 'transparent',
          transition: 'all 0.15s', color: 'var(--text)', fontSize: 13,
        }}>
          <input type="checkbox" checked={value.includes(opt)} onChange={() => toggle(opt)} />
          {opt}
        </label>
      ))}
    </div>
  );
}
