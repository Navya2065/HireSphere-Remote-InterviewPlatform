/**
 * AIAssistPanel — AI Co-pilot for the interviewer.
 * Two modes:
 *   1. Questions  — generate interview questions for a role / topic
 *   2. Code Review — review the candidate's live code
 */

import { useState } from 'react';
import {
  Sparkles, Loader2, AlertTriangle, Copy, Check,
  Code2, HelpCircle, ChevronDown, ChevronUp,
  Zap, TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import api from '../api/axios';

// ─── tiny helpers ─────────────────────────────────────────────────────────────

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button onClick={copy} className="btn-ghost !px-1.5 !py-0.5 text-xs" title="Copy">
      {copied ? <Check size={12} className="text-neon-lime" /> : <Copy size={12} />}
    </button>
  );
}

function SeverityIcon({ severity }) {
  if (severity === 'high')   return <TrendingDown size={12} className="text-rose-400 shrink-0" />;
  if (severity === 'medium') return <Minus        size={12} className="text-amber-400 shrink-0" />;
  return                            <TrendingUp   size={12} className="text-neon-lime shrink-0" />;
}

const VERDICT_STYLE = {
  'Good':       'border-neon-lime/30  bg-neon-lime/10  text-neon-lime',
  'Needs Work': 'border-amber-400/30  bg-amber-400/10  text-amber-300',
  'Poor':       'border-rose-500/30   bg-rose-500/10   text-rose-300',
};

// ─── Questions mode ───────────────────────────────────────────────────────────

function QuestionsTab() {
  const [role,      setRole]      = useState('');
  const [topic,     setTopic]     = useState('');
  const [count,     setCount]     = useState(7);
  const [questions, setQuestions] = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState('');

  const generate = async () => {
    if (!role.trim() && !topic.trim()) {
      setError('Enter a role or topic first.'); return;
    }
    setError(''); setLoading(true);
    try {
      const { data } = await api.post('/ai/questions', { role, topic, count });
      setQuestions(data.questions);
    } catch (e) {
      setError(e?.response?.data?.message || 'Generation failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      {/* Inputs */}
      <div className="shrink-0 flex flex-col gap-2 border-b border-white/5 px-4 py-3">
        <input
          value={role}
          onChange={(e) => setRole(e.target.value)}
          placeholder="Role — e.g. Backend Engineer"
          className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-xs text-zinc-200
            placeholder:text-zinc-600 focus:border-neon-violet/50 focus:outline-none"
        />
        <input
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
          placeholder="Topic — e.g. System Design, Arrays"
          className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-xs text-zinc-200
            placeholder:text-zinc-600 focus:border-neon-violet/50 focus:outline-none"
        />
        <div className="flex items-center gap-2">
          <select
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="rounded-lg border border-white/10 bg-ink-900 px-2 py-1.5 text-xs text-zinc-300 focus:outline-none"
          >
            {[5, 7, 10, 15].map((n) => <option key={n} value={n}>{n} questions</option>)}
          </select>
          <button
            onClick={generate}
            disabled={loading}
            className="flex-1 btn-primary py-1.5 text-xs justify-center gap-1.5 disabled:opacity-40"
          >
            {loading
              ? <><Loader2 size={12} className="animate-spin" /> Generating…</>
              : <><Sparkles size={12} /> Generate</>}
          </button>
        </div>
        {error && (
          <p className="flex items-center gap-1 text-[11px] text-rose-400">
            <AlertTriangle size={11} /> {error}
          </p>
        )}
      </div>

      {/* Questions list */}
      {questions.length > 0 && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="flex items-center justify-between px-4 py-2 border-b border-white/5">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
              {questions.length} Questions
            </span>
            <CopyButton text={questions.map((q, i) => `${i + 1}. ${q}`).join('\n')} />
          </div>
          <ol className="divide-y divide-white/5">
            {questions.map((q, i) => (
              <li key={i} className="group flex items-start gap-3 px-4 py-3">
                <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ink-900 text-[10px] font-bold text-neon-violet">
                  {i + 1}
                </span>
                <p className="flex-1 text-xs text-zinc-300 leading-relaxed">{q}</p>
                <CopyButton text={q} />
              </li>
            ))}
          </ol>
        </div>
      )}

      {questions.length === 0 && !loading && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-zinc-600">
          <HelpCircle size={28} />
          <p className="text-xs">Enter a role or topic above</p>
        </div>
      )}
    </div>
  );
}

// ─── Code Review mode ─────────────────────────────────────────────────────────

function CodeReviewTab({ code, language }) {
  const [review,  setReview]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [open,    setOpen]    = useState({ strengths: true, issues: true, suggestions: true });

  const toggle = (key) => setOpen((o) => ({ ...o, [key]: !o[key] }));

  const runReview = async () => {
    if (!code?.trim()) { setError('No code to review yet.'); return; }
    setError(''); setLoading(true); setReview(null);
    try {
      const { data } = await api.post('/ai/review-code', { code, language });
      setReview(data.review);
    } catch (e) {
      setError(e?.response?.data?.message || 'Review failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      {/* Action bar */}
      <div className="shrink-0 border-b border-white/5 px-4 py-3 flex items-center gap-2">
        <div className="flex-1">
          <p className="text-xs text-zinc-400">
            Language: <span className="font-mono text-zinc-200">{language || '—'}</span>
          </p>
          <p className="text-[11px] text-zinc-600 mt-0.5">
            {code?.trim() ? `${code.split('\n').length} lines` : 'No code yet'}
          </p>
        </div>
        <button
          onClick={runReview}
          disabled={loading || !code?.trim()}
          className="btn-primary py-1.5 text-xs gap-1.5 disabled:opacity-40"
        >
          {loading
            ? <><Loader2 size={12} className="animate-spin" /> Reviewing…</>
            : <><Zap size={12} /> Review Code</>}
        </button>
      </div>

      {error && (
        <p className="shrink-0 flex items-center gap-1.5 px-4 py-2 text-[11px] text-rose-400">
          <AlertTriangle size={11} /> {error}
        </p>
      )}

      {/* Review result */}
      {review && (
        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 flex flex-col gap-3">

          {/* Verdict + summary */}
          <div className={`rounded-xl border px-4 py-3 ${VERDICT_STYLE[review.verdict] || VERDICT_STYLE['Needs Work']}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-bold uppercase tracking-wider">{review.verdict}</span>
              {review.complexity && (
                <span className="font-mono text-[11px] opacity-70">{review.complexity}</span>
              )}
            </div>
            <p className="text-xs leading-relaxed opacity-90">{review.summary}</p>
          </div>

          {/* Strengths */}
          {review.strengths?.length > 0 && (
            <div className="rounded-lg border border-neon-lime/20 bg-ink-900 overflow-hidden">
              <button onClick={() => toggle('strengths')} className="flex w-full items-center justify-between px-3 py-2 hover:bg-ink-800/50">
                <span className="text-[11px] font-semibold text-neon-lime uppercase tracking-wider">Strengths</span>
                {open.strengths ? <ChevronUp size={12} className="text-zinc-500" /> : <ChevronDown size={12} className="text-zinc-500" />}
              </button>
              {open.strengths && (
                <ul className="border-t border-white/5 px-3 py-2 space-y-1">
                  {review.strengths.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-neon-lime" />
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Issues */}
          {review.issues?.length > 0 && (
            <div className="rounded-lg border border-rose-500/20 bg-ink-900 overflow-hidden">
              <button onClick={() => toggle('issues')} className="flex w-full items-center justify-between px-3 py-2 hover:bg-ink-800/50">
                <span className="text-[11px] font-semibold text-rose-400 uppercase tracking-wider">Issues</span>
                {open.issues ? <ChevronUp size={12} className="text-zinc-500" /> : <ChevronDown size={12} className="text-zinc-500" />}
              </button>
              {open.issues && (
                <ul className="border-t border-white/5 px-3 py-2 space-y-2">
                  {review.issues.map((issue, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                      <SeverityIcon severity={issue.severity} />
                      {issue.description}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Suggestions */}
          {review.suggestions?.length > 0 && (
            <div className="rounded-lg border border-neon-cyan/20 bg-ink-900 overflow-hidden">
              <button onClick={() => toggle('suggestions')} className="flex w-full items-center justify-between px-3 py-2 hover:bg-ink-800/50">
                <span className="text-[11px] font-semibold text-neon-cyan uppercase tracking-wider">Suggestions</span>
                {open.suggestions ? <ChevronUp size={12} className="text-zinc-500" /> : <ChevronDown size={12} className="text-zinc-500" />}
              </button>
              {open.suggestions && (
                <ul className="border-t border-white/5 px-3 py-2 space-y-1">
                  {review.suggestions.map((s, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-zinc-300">
                      <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-neon-cyan" />
                      {s}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {!review && !loading && !error && (
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-zinc-600">
          <Code2 size={28} />
          <p className="text-xs">Click Review Code to analyse</p>
        </div>
      )}
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function AIAssistPanel({ code, language }) {
  const [mode, setMode] = useState('questions');

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      {/* Mode toggle */}
      <div className="shrink-0 flex border-b border-white/5">
        <button
          onClick={() => setMode('questions')}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium transition
            ${mode === 'questions' ? 'text-neon-violet shadow-[inset_0_-2px_0_0_#8b5cf6]' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <HelpCircle size={13} /> Questions
        </button>
        <button
          onClick={() => setMode('review')}
          className={`flex flex-1 items-center justify-center gap-1.5 py-2 text-xs font-medium transition
            ${mode === 'review' ? 'text-neon-violet shadow-[inset_0_-2px_0_0_#8b5cf6]' : 'text-zinc-500 hover:text-zinc-300'}`}
        >
          <Code2 size={13} /> Code Review
        </button>
      </div>

      {mode === 'questions' && <QuestionsTab />}
      {mode === 'review'    && <CodeReviewTab code={code} language={language} />}
    </div>
  );
}
