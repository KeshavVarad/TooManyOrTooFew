'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Question, AnswerValue } from '@/lib/types';
import type { User } from '@supabase/supabase-js';

export default function SurveyForm() {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  // null = not yet checked, string = existing response id, '' = never submitted
  const [existingResponseId, setExistingResponseId] = useState<string | null | undefined>(undefined);
  const [initialAnswers, setInitialAnswers] = useState<Record<string, AnswerValue>>({});

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

  // When user is known, load their submission + existing answers
  useEffect(() => {
    if (!user) { setExistingResponseId(undefined); return; }

    async function loadExisting() {
      const { data: sub } = await supabase
        .from('submissions')
        .select('response_id')
        .eq('user_id', user!.id)
        .maybeSingle();

      if (!sub?.response_id) {
        setExistingResponseId(''); // never submitted
        return;
      }

      setExistingResponseId(sub.response_id);

      // Load their previous answers to pre-fill
      const { data: ans } = await supabase
        .from('answers')
        .select('question_id, value')
        .eq('response_id', sub.response_id);

      if (ans) {
        const map: Record<string, AnswerValue> = {};
        ans.forEach(a => { if (a.question_id) map[a.question_id] = a.value as AnswerValue; });
        setInitialAnswers(map);
      }
    }
    loadExisting();
  }, [user]);

  if (authLoading || (user && existingResponseId === undefined)) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div className="spinner" />
    </div>
  );

  if (!user) return <SignInGate />;

  return (
    <SurveyBody
      user={user}
      existingResponseId={existingResponseId || null}
      initialAnswers={initialAnswers}
    />
  );
}

// ─── Sign-In Gate ──────────────────────────────────────────────────────────────
function SignInGate() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const supabase = createClient();

  async function sendLink(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: window.location.origin,
      },
    });
    if (error) setError(error.message);
    else setSent(true);
    setLoading(false);
  }

  return (
    <div className="animate-fade-up" style={{ maxWidth: 480, margin: '80px auto', padding: '0 24px' }}>
      <h1 style={{ fontSize: 42, marginBottom: 6 }}>Research Survey</h1>
      <span className="accent-line" />

      <div style={{
        margin: '28px 0', padding: '20px 24px',
        background: 'var(--sage-dim)', border: '1px solid rgba(106,143,126,0.3)',
        borderLeft: '3px solid var(--sage)', borderRadius: 2,
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
              We ask for your email only to ensure one response per person.{' '}
              <strong style={{ color: 'var(--text)' }}>Your email is never linked to your answers.</strong>{' '}
              We store only the fact that you have responded — not what you said.
              You will be signed out automatically after submitting.
            </p>
          </div>
        </div>
      </div>

      {sent ? (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            background: 'var(--sage-dim)', border: '1px solid var(--sage)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M2 5l8 6 8-6M2 5h16v12H2V5z" stroke="var(--sage)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <p style={{ color: 'var(--text)', fontSize: 15, marginBottom: 8 }}>Check your inbox</p>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.7, marginBottom: 20 }}>
            A sign-in link was sent to <strong style={{ color: 'var(--text)' }}>{email}</strong>.<br/>
            Click the link in the email to access the survey.
          </p>
          <button className="btn-ghost" onClick={() => { setSent(false); setEmail(''); }} style={{ fontSize: 11 }}>
            ← Use a different email
          </button>
        </div>
      ) : (
        <form onSubmit={sendLink} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.7 }}>
            Enter your email and we'll send you a one-click sign-in link.
          </p>
          <input
            type="email" value={email} onChange={e => setEmail(e.target.value)}
            placeholder="you@example.com" required autoFocus
          />
          {error && <p style={{ color: '#c94040', fontSize: 12 }}>{error}</p>}
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Sending…</> : 'Send Sign-In Link'}
          </button>
        </form>
      )}

      <p style={{ marginTop: 20, fontSize: 11, color: 'var(--text-dim)', lineHeight: 1.6 }}>
        By continuing you agree that your participation is voluntary and responses are used for academic research only.
      </p>
    </div>
  );
}

// ─── Survey Body ───────────────────────────────────────────────────────────────
function SurveyBody({
  user,
  existingResponseId,
  initialAnswers,
}: {
  user: User;
  existingResponseId: string | null;
  initialAnswers: Record<string, AnswerValue>;
}) {
  const isEditing = !!existingResponseId;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, AnswerValue>>(initialAnswers);
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

  // Sync initialAnswers into state once loaded (handles async load order)
  useEffect(() => {
    setAnswers(initialAnswers);
  }, [initialAnswers]);

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
      let responseId = existingResponseId;

      if (!responseId) {
        // First-time submission: create a new response
        const { data: response, error: rErr } = await supabase
          .from('responses')
          .insert({ session_id: crypto.randomUUID() })
          .select()
          .single();
        if (rErr || !response) throw rErr;
        responseId = response.id;
      } else {
        // Returning: delete old answers so we can replace cleanly
        await supabase.from('answers').delete().eq('response_id', responseId);
      }

      // Insert current answers
      const answerRows = Object.entries(answers).map(([question_id, value]) => ({
        response_id: responseId!,
        question_id,
        value,
        is_featured: false,
      }));
      if (answerRows.length > 0) {
        const { error: aErr } = await supabase.from('answers').insert(answerRows);
        if (aErr) throw aErr;
      }

      // Upsert submission with the response_id
      const { error: sErr } = await supabase.from('submissions').upsert({
        user_id: user.id,
        response_id: responseId,
        submitted_at: new Date().toISOString(),
      });
      if (sErr) throw sErr;

      // Sign out to preserve anonymity
      await supabase.auth.signOut();
      setSubmitted(true);
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
      <h2 style={{ fontSize: 36, marginBottom: 12 }}>
        {isEditing ? 'Response updated.' : 'Thank you.'}
      </h2>
      <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 8 }}>
        Your response has been {isEditing ? 'updated' : 'recorded'} anonymously.
        You have been signed out to protect your privacy.
      </p>
      <p style={{ color: 'var(--text-dim)', fontSize: 12, marginBottom: 32 }}>
        Your identity was never associated with your answers.
      </p>
      <a href="/results" className="btn-ghost" style={{ textDecoration: 'none' }}>View Results →</a>
    </div>
  );

  const answeredCount = questions.filter(q => answers[q.id]).length;
  const newQuestions = questions.filter(q => isEditing && !initialAnswers[q.id]);

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 680, margin: '0 auto', padding: '48px 24px' }}>
      <div className="animate-fade-up" style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 42, marginBottom: 8 }}>Research Survey</h1>
        <span className="accent-line" style={{ marginBottom: 16 }} />

        {/* Returning user banner */}
        {isEditing && (
          <div style={{
            marginTop: 20, padding: '14px 18px',
            background: 'var(--gold-dim)', border: '1px solid rgba(201,168,76,0.25)',
            borderLeft: '3px solid var(--gold)', borderRadius: 2,
            display: 'flex', alignItems: 'flex-start', gap: 10,
          }}>
            <svg width="15" height="15" viewBox="0 0 15 15" fill="none" style={{ flexShrink: 0, marginTop: 1 }}>
              <path d="M7.5 1v4M7.5 10v.5M3 3l2.5 2.5M12 3l-2.5 2.5M1 7.5h4M10 7.5h4" stroke="var(--gold)" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <div>
              <p style={{ fontSize: 12, color: 'var(--text)', marginBottom: 2 }}>
                Your previous answers are pre-filled. Make any changes and resubmit.
              </p>
              {newQuestions.length > 0 && (
                <p style={{ fontSize: 11, color: 'var(--gold)' }}>
                  {newQuestions.length} new question{newQuestions.length > 1 ? 's have' : ' has'} been added since your last response.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Anonymity reminder */}
        {!isEditing && (
          <div style={{
            marginTop: 20, padding: '12px 16px',
            background: 'var(--sage-dim)', border: '1px solid rgba(106,143,126,0.25)',
            borderLeft: '3px solid var(--sage)', borderRadius: 2,
            display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="7" cy="7" r="6" stroke="var(--sage)" strokeWidth="1.2"/>
              <path d="M7 6v4M7 4.5h.01" stroke="var(--sage)" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              Your responses are anonymous. Your identity is not linked to your answers.
            </p>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {questions.map((q, i) => (
          <QuestionCard
            key={q.id}
            question={q}
            index={i}
            value={answers[q.id]}
            isNew={isEditing && !initialAnswers[q.id]}
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
          {submitting
            ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Submitting…</>
            : isEditing ? 'Update Response' : 'Submit Response'}
        </button>
        <span style={{ color: 'var(--text-dim)', fontSize: 11 }}>
          {answeredCount} / {questions.length} answered
        </span>
      </div>
    </form>
  );
}

// ─── Question Card ─────────────────────────────────────────────────────────────
function QuestionCard({ question, index, value, isNew, onChange }: {
  question: Question; index: number; value: AnswerValue | undefined;
  isNew: boolean; onChange: (v: AnswerValue) => void;
}) {
  return (
    <div
      className="card card-hover animate-fade-up"
      style={{
        padding: 24,
        animationDelay: `${index * 60}ms`,
        borderLeft: isNew ? '2px solid var(--gold)' : '2px solid transparent',
      }}
    >
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: 'var(--text-dim)', paddingTop: 4, minWidth: 28 }}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <div style={{ flex: 1 }}>
          <p style={{ color: 'var(--text)', lineHeight: 1.6, marginBottom: 6 }}>
            {question.text}
            {question.required && <span style={{ color: 'var(--accent)', marginLeft: 6 }}>*</span>}
          </p>
          <div style={{ display: 'flex', gap: 6 }}>
            <span className="badge badge-sage" style={{ fontSize: 9 }}>{question.type.replace('_', ' ')}</span>
            {isNew && <span className="badge badge-gold" style={{ fontSize: 9 }}>New</span>}
          </div>
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
