'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Question, AnswerValue } from '@/lib/types';

export default function SurveyForm() {
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

    // Validate required
    const missing = questions.filter(q => q.required && !answers[q.id]);
    if (missing.length > 0) {
      setError(`Please answer all required questions (${missing.length} remaining).`);
      return;
    }

    setSubmitting(true);
    try {
      const { data: response, error: rErr } = await supabase
        .from('responses')
        .insert({ session_id: crypto.randomUUID() })
        .select()
        .single();

      if (rErr || !response) throw rErr;

      const answerRows = Object.entries(answers).map(([question_id, value]) => ({
        response_id: response.id,
        question_id,
        value,
        is_featured: false,
      }));

      const { error: aErr } = await supabase.from('answers').insert(answerRows);
      if (aErr) throw aErr;

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
    <div style={{
      textAlign: 'center',
      padding: '80px 24px',
      color: 'var(--text-muted)',
    }}>
      <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, marginBottom: 8 }}>
        No questions yet
      </div>
      <div style={{ fontSize: 12 }}>Check back soon or contact the administrator.</div>
    </div>
  );

  if (submitted) return (
    <div className="animate-fade-up" style={{
      maxWidth: 560,
      margin: '0 auto',
      padding: '80px 24px',
      textAlign: 'center',
    }}>
      <div style={{
        width: 52,
        height: 52,
        borderRadius: '50%',
        background: 'var(--sage-dim)',
        border: '1px solid var(--sage)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        margin: '0 auto 24px',
      }}>
        <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
          <path d="M4 11.5L8.5 16L18 6" stroke="var(--sage)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      <h2 style={{ fontSize: 36, marginBottom: 12 }}>Thank you.</h2>
      <p style={{ color: 'var(--text-muted)', lineHeight: 1.7, marginBottom: 32 }}>
        Your response has been recorded. You can view aggregated results on the results page.
      </p>
      <a href="/results" className="btn-ghost" style={{ textDecoration: 'none' }}>
        View Results →
      </a>
    </div>
  );

  return (
    <form onSubmit={handleSubmit} style={{ maxWidth: 680, margin: '0 auto', padding: '48px 24px' }}>
      <div className="animate-fade-up" style={{ marginBottom: 48 }}>
        <h1 style={{ fontSize: 42, marginBottom: 8 }}>Research Survey</h1>
        <span className="accent-line" style={{ marginBottom: 16 }} />
        <p style={{ color: 'var(--text-muted)', marginTop: 16, lineHeight: 1.8 }}>
          Your responses are anonymous and will be used for academic research purposes only.
        </p>
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
          marginTop: 24,
          padding: '12px 16px',
          background: 'rgba(201,64,64,0.1)',
          border: '1px solid rgba(201,64,64,0.3)',
          borderRadius: 2,
          color: '#c94040',
          fontSize: 13,
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

function QuestionCard({
  question,
  index,
  value,
  onChange,
}: {
  question: Question;
  index: number;
  value: AnswerValue | undefined;
  onChange: (v: AnswerValue) => void;
}) {
  const delay = `${index * 60}ms`;

  return (
    <div
      className="card card-hover animate-fade-up"
      style={{ padding: 24, animationDelay: delay }}
    >
      <div style={{ display: 'flex', gap: 16, marginBottom: 20 }}>
        <span style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 10,
          color: 'var(--text-dim)',
          paddingTop: 4,
          minWidth: 28,
        }}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <div style={{ flex: 1 }}>
          <p style={{ color: 'var(--text)', lineHeight: 1.6, marginBottom: 6 }}>
            {question.text}
            {question.required && (
              <span style={{ color: 'var(--accent)', marginLeft: 6 }}>*</span>
            )}
          </p>
          <span className="badge badge-sage" style={{ fontSize: 9 }}>
            {question.type.replace('_', ' ')}
          </span>
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
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginBottom: 12,
        color: 'var(--text-muted)',
        fontSize: 11,
      }}>
        <span>1 — Strongly Disagree</span>
        <span style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontSize: 22,
          color: 'var(--accent)',
          lineHeight: 1,
        }}>{current}</span>
        <span>10 — Strongly Agree</span>
      </div>
      <input
        type="range"
        min={1} max={10} step={1}
        value={current}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        marginTop: 8,
        color: 'var(--text-dim)',
        fontSize: 10,
      }}>
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
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
          padding: '8px 12px',
          borderRadius: 2,
          border: `1px solid ${value === opt ? 'var(--accent-border)' : 'var(--border)'}`,
          background: value === opt ? 'var(--accent-dim)' : 'transparent',
          transition: 'all 0.15s',
          color: 'var(--text)',
          fontSize: 13,
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
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'pointer',
          padding: '8px 12px',
          borderRadius: 2,
          border: `1px solid ${value.includes(opt) ? 'var(--accent-border)' : 'var(--border)'}`,
          background: value.includes(opt) ? 'var(--accent-dim)' : 'transparent',
          transition: 'all 0.15s',
          color: 'var(--text)',
          fontSize: 13,
        }}>
          <input type="checkbox" checked={value.includes(opt)} onChange={() => toggle(opt)} />
          {opt}
        </label>
      ))}
    </div>
  );
}
