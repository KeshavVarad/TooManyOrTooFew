'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Question, Answer, AnswerValue } from '@/lib/types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';

const COLORS = ['#d4622a', '#6a8f7e', '#c9a84c', '#8b7fc0', '#c06080', '#5090b0'];

export default function ResultsView() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [responseCount, setResponseCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    async function load() {
      const [{ data: qs }, { data: ans }, { count }] = await Promise.all([
        supabase.from('questions').select('*').order('order_index'),
        supabase.from('answers').select('*'),
        supabase.from('responses').select('*', { count: 'exact', head: true }),
      ]);
      setQuestions((qs ?? []) as Question[]);
      setAnswers((ans ?? []) as Answer[]);
      setResponseCount(count ?? 0);
      setLoading(false);
    }
    load();
    // Subscribe to realtime
    const channel = supabase
      .channel('results')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'answers' }, load)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'responses' }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
      <div className="spinner" />
    </div>
  );

  const featuredAnswers = answers.filter(a => a.is_featured);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '48px 24px' }}>
      {/* Header */}
      <div className="animate-fade-up" style={{ marginBottom: 48 }}>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: 42, marginBottom: 6 }}>Survey Results</h1>
            <span className="accent-line" />
          </div>
          <div style={{ display: 'flex', gap: 24 }}>
            <Stat label="Total Responses" value={responseCount} />
            <Stat label="Questions" value={questions.length} />
            <Stat label="Answers Collected" value={answers.length} />
          </div>
        </div>
      </div>

      {/* Featured spotlight */}
      {featuredAnswers.length > 0 && (
        <section style={{ marginBottom: 56 }}>
          <SectionHeader label="Featured Responses" />
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))' }}>
            {featuredAnswers.map((a, i) => {
              const q = questions.find(q => q.id === a.question_id);
              const text = a.value?.type === 'open_ended' ? a.value.text : JSON.stringify(a.value);
              return (
                <FeaturedCard key={a.id} index={i} text={text} question={q?.text ?? ''} />
              );
            })}
          </div>
        </section>
      )}

      {/* Per-question charts */}
      {questions.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: 'var(--text-muted)' }}>
          No questions have been created yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
          <SectionHeader label="Question Breakdown" />
          {questions.map((q, i) => {
            const qAnswers = answers.filter(a => a.question_id === q.id);
            return (
              <QuestionResult
                key={q.id}
                question={q}
                index={i}
                answers={qAnswers}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div style={{ textAlign: 'right' }}>
      <div style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 36,
        fontWeight: 400,
        color: 'var(--accent)',
        lineHeight: 1,
      }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase', marginTop: 4 }}>
        {label}
      </div>
    </div>
  );
}

function SectionHeader({ label }: { label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
      <span className="accent-line" />
      <span style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
        {label}
      </span>
      <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
    </div>
  );
}

function FeaturedCard({ text, question, index }: { text: string; question: string; index: number }) {
  return (
    <div
      className="card animate-fade-up"
      style={{
        padding: 24,
        borderLeft: '2px solid var(--accent)',
        animationDelay: `${index * 80}ms`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div style={{
        position: 'absolute', top: -10, right: -10,
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 80, color: 'var(--accent)', opacity: 0.06,
        lineHeight: 1, userSelect: 'none',
      }}>❝</div>
      <p style={{
        fontFamily: "'Cormorant Garamond', serif",
        fontSize: 17,
        fontStyle: 'italic',
        lineHeight: 1.7,
        color: 'var(--text)',
        marginBottom: 16,
      }}>{text}</p>
      <p style={{ fontSize: 10, color: 'var(--text-dim)', letterSpacing: '0.06em' }}>
        re: {question}
      </p>
    </div>
  );
}

function QuestionResult({ question, index, answers }: { question: Question; index: number; answers: Answer[] }) {
  const n = answers.length;

  let content = null;

  if (question.type === 'scale') {
    const scores = answers.map(a => (a.value as { type: 'scale'; score: number }).score).filter(Boolean);
    const avg = scores.length ? (scores.reduce((s, v) => s + v, 0) / scores.length).toFixed(2) : '—';
    const dist: Record<number, number> = {};
    scores.forEach(s => { dist[s] = (dist[s] ?? 0) + 1; });
    const data = Array.from({ length: 10 }, (_, i) => ({ label: String(i + 1), count: dist[i + 1] ?? 0 }));

    content = (
      <div>
        <div style={{ marginBottom: 16, display: 'flex', gap: 24, alignItems: 'center' }}>
          <div>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 38, color: 'var(--accent)' }}>{avg}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 8 }}>average / 10</span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--text-dim)' }}>{n} response{n !== 1 ? 's' : ''}</span>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="label" tick={{ fill: 'var(--text-dim)', fontSize: 11, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: 'var(--text-dim)', fontSize: 11, fontFamily: 'DM Mono' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 2, fontFamily: 'DM Mono', fontSize: 12 }}
              labelStyle={{ color: 'var(--text-muted)' }}
              cursor={{ fill: 'var(--accent-dim)' }}
            />
            <Bar dataKey="count" fill="var(--accent)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  if (question.type === 'multiple_choice') {
    const counts: Record<string, number> = {};
    answers.forEach(a => {
      const v = a.value as { type: 'multiple_choice'; choice: string };
      if (v.choice) counts[v.choice] = (counts[v.choice] ?? 0) + 1;
    });
    const data = Object.entries(counts).map(([name, value]) => ({ name, value }));

    content = (
      <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 200px', minWidth: 200 }}>
          {data.map(({ name, value }, i) => (
            <div key={name} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 12, color: 'var(--text)' }}>{name}</span>
                <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{n > 0 ? Math.round(value / n * 100) : 0}%</span>
              </div>
              <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
                <div style={{
                  height: '100%',
                  width: `${n > 0 ? (value / n * 100) : 0}%`,
                  background: COLORS[i % COLORS.length],
                  borderRadius: 2,
                  transition: 'width 0.8s ease',
                }} />
              </div>
            </div>
          ))}
        </div>
        {data.length > 0 && (
          <ResponsiveContainer width={200} height={200}>
            <PieChart>
              <Pie data={data} dataKey="value" cx="50%" cy="50%" outerRadius={80} strokeWidth={0}>
                {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 2, fontFamily: 'DM Mono', fontSize: 11 }}
              />
            </PieChart>
          </ResponsiveContainer>
        )}
        {data.length === 0 && <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>No responses yet.</span>}
      </div>
    );
  }

  if (question.type === 'multi_select') {
    const counts: Record<string, number> = {};
    answers.forEach(a => {
      const v = a.value as { type: 'multi_select'; choices: string[] };
      (v.choices ?? []).forEach(c => { counts[c] = (counts[c] ?? 0) + 1; });
    });
    const data = Object.entries(counts).sort((a, b) => b[1] - a[1]);
    const max = data[0]?.[1] ?? 1;

    content = (
      <div>
        {data.length === 0 && <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>No responses yet.</span>}
        {data.map(([name, count], i) => (
          <div key={name} style={{ marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text)' }}>{name}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{count} selected</span>
            </div>
            <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
              <div style={{
                height: '100%',
                width: `${max > 0 ? (count / max * 100) : 0}%`,
                background: COLORS[i % COLORS.length],
                borderRadius: 2,
                transition: 'width 0.8s ease',
              }} />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (question.type === 'open_ended') {
    const texts = answers
      .map(a => (a.value as { type: 'open_ended'; text: string }).text)
      .filter(Boolean);

    content = (
      <div>
        <p style={{ color: 'var(--text-muted)', fontSize: 12, marginBottom: 16 }}>
          {n} open-ended response{n !== 1 ? 's' : ''}. Featured responses appear in the spotlight above.
        </p>
        {texts.slice(0, 5).map((t, i) => (
          <div key={i} style={{
            borderLeft: '2px solid var(--border-light)',
            paddingLeft: 16,
            marginBottom: 14,
            color: 'var(--text)',
            fontSize: 13,
            fontStyle: 'italic',
          }}>{t}</div>
        ))}
        {texts.length > 5 && (
          <p style={{ color: 'var(--text-dim)', fontSize: 11 }}>
            + {texts.length - 5} more (view all in admin panel)
          </p>
        )}
      </div>
    );
  }

  return (
    <div
      className="card animate-fade-up"
      style={{ padding: 28, animationDelay: `${index * 60}ms` }}
    >
      <div style={{ display: 'flex', gap: 16, marginBottom: 24 }}>
        <span style={{ fontSize: 10, color: 'var(--text-dim)', paddingTop: 6, minWidth: 28 }}>
          {String(index + 1).padStart(2, '0')}
        </span>
        <div>
          <p style={{ fontSize: 15, color: 'var(--text)', marginBottom: 6 }}>{question.text}</p>
          <div style={{ display: 'flex', gap: 8 }}>
            <span className="badge badge-sage">{question.type.replace('_', ' ')}</span>
            <span className="badge badge-gold">{n} response{n !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>
      <div style={{ paddingLeft: 44 }}>{content}</div>
    </div>
  );
}
