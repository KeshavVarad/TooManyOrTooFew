'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Question, Answer, Response, QuestionType } from '@/lib/types';

// ─── Main Admin Panel ──────────────────────────────────────────────────────────
export default function AdminPanel() {
  const [authed, setAuthed] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    setAuthed(sessionStorage.getItem('admin_authed') === 'true');
    setChecked(true);
  }, []);

  if (!checked) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div className="spinner" />
    </div>
  );

  if (!authed) return <LoginForm onSuccess={() => { sessionStorage.setItem('admin_authed', 'true'); setAuthed(true); }} />;
  return <Dashboard onSignOut={() => { sessionStorage.removeItem('admin_authed'); setAuthed(false); }} />;
}

// ─── Login ─────────────────────────────────────────────────────────────────────
function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (password === process.env.NEXT_PUBLIC_ADMIN_PASSWORD) {
      onSuccess();
    } else {
      setError('Incorrect password.');
      setPassword('');
    }
  }

  return (
    <div className="animate-fade-up" style={{ maxWidth: 380, margin: '80px auto', padding: '0 24px' }}>
      <div style={{ marginBottom: 40 }}>
        <h1 style={{ fontSize: 38, marginBottom: 6 }}>Admin Access</h1>
        <span className="accent-line" />
        <p style={{ color: 'var(--text-muted)', marginTop: 14, fontSize: 13 }}>
          Enter the admin password to continue.
        </p>
      </div>

      <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div>
          <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            autoFocus
            autoComplete="current-password"
          />
        </div>

        {error && (
          <div style={{ padding: '10px 14px', background: 'rgba(201,64,64,0.1)', border: '1px solid rgba(201,64,64,0.3)', borderRadius: 2, color: '#c94040', fontSize: 12 }}>
            {error}
          </div>
        )}

        <button type="submit" className="btn-primary" style={{ marginTop: 8 }}>
          Enter
        </button>
      </form>
    </div>
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ onSignOut }: { onSignOut: () => void }) {
  const [tab, setTab] = useState<'questions' | 'responses'>('questions');

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: '40px 24px' }}>
      <div className="animate-fade-up" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36, flexWrap: 'wrap', gap: 16 }}>
        <div>
          <h1 style={{ fontSize: 38, marginBottom: 6 }}>Admin Dashboard</h1>
          <span className="accent-line" />
        </div>
        <button className="btn-ghost" onClick={onSignOut}>Sign Out</button>
      </div>

      <div className="tab-nav" style={{ marginBottom: 32 }}>
        <button className={`tab-btn${tab === 'questions' ? ' active' : ''}`} onClick={() => setTab('questions')}>
          Question Builder
        </button>
        <button className={`tab-btn${tab === 'responses' ? ' active' : ''}`} onClick={() => setTab('responses')}>
          Response Manager
        </button>
      </div>

      {tab === 'questions' ? <QuestionBuilder /> : <ResponseManager />}
    </div>
  );
}

// ─── Question Builder ──────────────────────────────────────────────────────────
function QuestionBuilder() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const supabase = createClient();

  const load = useCallback(async () => {
    const { data } = await supabase.from('questions').select('*').order('order_index');
    setQuestions((data ?? []) as Question[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function deleteQuestion(id: string) {
    if (!confirm('Delete this question and all its responses?')) return;
    await supabase.from('questions').delete().eq('id', id);
    load();
  }

  async function moveQuestion(id: string, dir: 'up' | 'down') {
    const idx = questions.findIndex(q => q.id === id);
    const swapIdx = dir === 'up' ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= questions.length) return;
    const a = questions[idx];
    const b = questions[swapIdx];
    await Promise.all([
      supabase.from('questions').update({ order_index: b.order_index }).eq('id', a.id),
      supabase.from('questions').update({ order_index: a.order_index }).eq('id', b.id),
    ]);
    load();
  }

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>
          {questions.length} question{questions.length !== 1 ? 's' : ''}
        </span>
        <button className="btn-primary" onClick={() => setShowForm(true)}>+ Add Question</button>
      </div>

      {showForm && (
        <QuestionForm
          nextOrder={questions.length}
          onSave={() => { setShowForm(false); load(); }}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading ? (
        <div className="spinner" style={{ margin: '40px auto', display: 'block' }} />
      ) : questions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>
          No questions yet. Add your first question above.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {questions.map((q, i) => (
            <QuestionRow
              key={q.id}
              question={q}
              index={i}
              total={questions.length}
              onDelete={() => deleteQuestion(q.id)}
              onMove={(dir) => moveQuestion(q.id, dir)}
              onRefresh={load}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionRow({ question, index, total, onDelete, onMove, onRefresh }: {
  question: Question; index: number; total: number;
  onDelete: () => void; onMove: (d: 'up' | 'down') => void; onRefresh: () => void;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) return (
    <QuestionForm
      question={question}
      nextOrder={question.order_index}
      onSave={() => { setEditing(false); onRefresh(); }}
      onCancel={() => setEditing(false)}
    />
  );

  return (
    <div className="card" style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
      <span style={{ fontSize: 10, color: 'var(--text-dim)', minWidth: 24 }}>
        {String(index + 1).padStart(2, '0')}
      </span>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: 13, color: 'var(--text)', marginBottom: 6 }}>{question.text}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <span className="badge badge-sage">{question.type.replace('_', ' ')}</span>
          {question.required && <span className="badge badge-accent">required</span>}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <IconBtn title="Move up" disabled={index === 0} onClick={() => onMove('up')}>↑</IconBtn>
        <IconBtn title="Move down" disabled={index === total - 1} onClick={() => onMove('down')}>↓</IconBtn>
        <IconBtn title="Edit" onClick={() => setEditing(true)}>✎</IconBtn>
        <button className="btn-danger" onClick={onDelete} style={{ padding: '6px 10px' }}>✕</button>
      </div>
    </div>
  );
}

function IconBtn({ children, onClick, disabled, title }: { children: React.ReactNode; onClick?: () => void; disabled?: boolean; title?: string }) {
  return (
    <button
      title={title}
      onClick={onClick}
      disabled={disabled}
      style={{
        background: 'transparent',
        border: '1px solid var(--border)',
        color: disabled ? 'var(--text-dim)' : 'var(--text-muted)',
        padding: '6px 10px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        borderRadius: 2,
        fontSize: 14,
        transition: 'color 0.15s, border-color 0.15s',
      }}
    >
      {children}
    </button>
  );
}

function QuestionForm({ question, nextOrder, onSave, onCancel }: {
  question?: Question; nextOrder: number; onSave: () => void; onCancel: () => void;
}) {
  const [text, setText] = useState(question?.text ?? '');
  const [type, setType] = useState<QuestionType>(question?.type ?? 'scale');
  const [required, setRequired] = useState(question?.required ?? false);
  const [optionsStr, setOptionsStr] = useState((question?.options ?? []).join('\n'));
  const [saving, setSaving] = useState(false);
  const supabase = createClient();

  async function save() {
    if (!text.trim()) return;
    setSaving(true);
    const options = ['multiple_choice', 'multi_select'].includes(type)
      ? optionsStr.split('\n').map(s => s.trim()).filter(Boolean)
      : null;
    if (question) {
      await supabase.from('questions').update({ text, type, required, options, order_index: question.order_index }).eq('id', question.id);
    } else {
      await supabase.from('questions').insert({ text, type, required, options, order_index: nextOrder });
    }
    setSaving(false);
    onSave();
  }

  return (
    <div className="card animate-fade-in" style={{ padding: 24, borderColor: 'var(--accent-border)', marginBottom: 4 }}>
      <h3 style={{ fontSize: 20, marginBottom: 20 }}>{question ? 'Edit Question' : 'New Question'}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        <Field label="Question Text">
          <textarea rows={3} value={text} onChange={e => setText(e.target.value)} placeholder="Enter your question…" style={{ resize: 'vertical' }} />
        </Field>
        <Field label="Type">
          <select value={type} onChange={e => setType(e.target.value as QuestionType)}>
            <option value="scale">Scale (1–10)</option>
            <option value="multiple_choice">Multiple Choice</option>
            <option value="multi_select">Multi-Select</option>
            <option value="open_ended">Open Ended</option>
          </select>
        </Field>
        {(type === 'multiple_choice' || type === 'multi_select') && (
          <Field label="Options (one per line)">
            <textarea rows={4} value={optionsStr} onChange={e => setOptionsStr(e.target.value)} placeholder={"Option A\nOption B\nOption C"} style={{ resize: 'vertical' }} />
          </Field>
        )}
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
          <input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} />
          <span style={{ fontSize: 13, color: 'var(--text)' }}>Required</span>
        </label>
      </div>
      <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
        <button className="btn-primary" onClick={save} disabled={saving || !text.trim()}>
          {saving ? <><div className="spinner" style={{ width: 14, height: 14 }} /> Saving…</> : (question ? 'Save Changes' : 'Add Question')}
        </button>
        <button className="btn-ghost" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 8 }}>
        {label}
      </label>
      {children}
    </div>
  );
}

// ─── Response Manager ──────────────────────────────────────────────────────────
function ResponseManager() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [responses, setResponses] = useState<Response[]>([]);
  const [filterQ, setFilterQ] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const load = useCallback(async () => {
    const [{ data: qs }, { data: ans }, { data: res }] = await Promise.all([
      supabase.from('questions').select('*').order('order_index'),
      supabase.from('answers').select('*').order('created_at', { ascending: false }),
      supabase.from('responses').select('*').order('submitted_at', { ascending: false }),
    ]);
    setQuestions((qs ?? []) as Question[]);
    setAnswers((ans ?? []) as Answer[]);
    setResponses((res ?? []) as Response[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function toggleFeatured(answer: Answer) {
    await supabase.from('answers').update({ is_featured: !answer.is_featured }).eq('id', answer.id);
    load();
  }

  async function clearAll() {
    if (!confirm('Delete ALL responses and answers? This cannot be undone.')) return;
    await supabase.from('responses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    load();
  }

  const filteredAnswers = filterQ === 'all' ? answers : answers.filter(a => a.question_id === filterQ);
  const openEndedAnswers = filteredAnswers.filter(a => questions.find(q => q.id === a.question_id)?.type === 'open_ended');
  const nonOpenAnswers = filteredAnswers.filter(a => questions.find(q => q.id === a.question_id)?.type !== 'open_ended');

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', gap: 20, marginBottom: 28, flexWrap: 'wrap' }}>
        {[
          { label: 'Total Responses', value: responses.length },
          { label: 'Answers Collected', value: answers.length },
          { label: 'Featured', value: answers.filter(a => a.is_featured).length },
        ].map(({ label, value }) => (
          <div key={label} className="card" style={{ padding: '16px 24px', flex: '1 1 160px' }}>
            <div style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, color: 'var(--accent)' }}>{value}</div>
            <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 4 }}>{label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 24, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={filterQ} onChange={e => setFilterQ(e.target.value)} style={{ maxWidth: 320 }}>
          <option value="all">All Questions</option>
          {questions.map(q => (
            <option key={q.id} value={q.id}>{q.text.slice(0, 60)}{q.text.length > 60 ? '…' : ''}</option>
          ))}
        </select>
        <button className="btn-danger" onClick={clearAll}>Clear All Data</button>
      </div>

      {loading ? (
        <div className="spinner" style={{ margin: '40px auto', display: 'block' }} />
      ) : answers.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-muted)' }}>No responses yet.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {openEndedAnswers.length > 0 && (
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12 }}>
                Open-ended — click ★ to feature on results page
              </div>
              {openEndedAnswers.map(a => {
                const q = questions.find(q => q.id === a.question_id);
                const text = (a.value as { type: 'open_ended'; text: string }).text;
                return (
                  <div key={a.id} className="card" style={{
                    padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 14,
                    borderLeft: a.is_featured ? '2px solid var(--accent)' : '2px solid transparent',
                    transition: 'border-color 0.2s',
                  }}>
                    <button onClick={() => toggleFeatured(a)} title={a.is_featured ? 'Unfeature' : 'Feature'} style={{
                      background: 'none', border: 'none', cursor: 'pointer', fontSize: 18,
                      color: a.is_featured ? 'var(--gold)' : 'var(--text-dim)',
                      transition: 'color 0.2s', flexShrink: 0, padding: '2px 0',
                    }}>★</button>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6, marginBottom: 6 }}>{text}</p>
                      <p style={{ fontSize: 10, color: 'var(--text-dim)' }}>{q?.text}</p>
                    </div>
                    {a.is_featured && <span className="badge badge-gold">Featured</span>}
                  </div>
                );
              })}
            </div>
          )}

          {nonOpenAnswers.length > 0 && (
            <div>
              <div style={{ fontSize: 10, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: 12, marginTop: openEndedAnswers.length > 0 ? 20 : 0 }}>
                Scale & Choice Responses
              </div>
              {nonOpenAnswers.slice(0, 50).map(a => {
                const q = questions.find(q => q.id === a.question_id);
                return (
                  <div key={a.id} className="card" style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <span className="badge badge-sage" style={{ flexShrink: 0 }}>{q?.type.replace('_', ' ')}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {q?.text.slice(0, 60)}
                    </span>
                    <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: '16px', color: 'var(--text)' }}>
                      {formatValue(a.value)}
                    </span>
                  </div>
                );
              })}
              {nonOpenAnswers.length > 50 && (
                <p style={{ textAlign: 'center', fontSize: 11, color: 'var(--text-dim)', marginTop: 12 }}>
                  Showing 50 of {nonOpenAnswers.length} answers
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function formatValue(value: unknown): string {
  if (!value || typeof value !== 'object') return String(value ?? '');
  const v = value as Record<string, unknown>;
  if (v.type === 'scale') return `${v.score} / 10`;
  if (v.type === 'multiple_choice') return String(v.choice);
  if (v.type === 'multi_select') return (v.choices as string[]).join(', ');
  if (v.type === 'open_ended') return String(v.text).slice(0, 80);
  return JSON.stringify(value);
}
