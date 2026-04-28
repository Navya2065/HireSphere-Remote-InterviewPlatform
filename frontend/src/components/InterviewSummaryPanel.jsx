/**
 * InterviewSummaryPanel
 * Shown in the interviewer's sidebar (Summary tab) after an interview ends.
 * Lets the interviewer generate — or view a previously saved — AI summary.
 *
 * Props:
 *   interviewId  – MongoDB _id of the interview
 *   isEnded      – boolean: whether the interview is completed / cancelled
 *   initialSummary – aiSummary object already on the interview doc (may be null)
 */

import { useState } from 'react';
import {
  Sparkles, Loader2, AlertTriangle, RefreshCw,
  ThumbsUp, ThumbsDown, Minus, Star,
  TrendingUp, TrendingDown, MessageSquare, Code2,
  CheckCircle2, XCircle, HelpCircle,
} from 'lucide-react';
import api from '../api/axios';

// ── Recommendation config ────────────────────────────────────────────────────

const REC = {
  Hire: {
    label:   'Hire',
    icon:    ThumbsUp,
    border:  'border-neon-lime/40',
    bg:      'bg-neon-lime/8',
    text:    'text-neon-lime',
    glow:    'shadow-[0_0_24px_-4px_rgba(163,230,53,0.4)]',
    dot:     'bg-neon-lime',
    badge:   CheckCircle2,
  },
  Maybe: {
    label:   'Maybe',
    icon:    HelpCircle,
    border:  'border-amber-400/40',
    bg:      'bg-amber-400/8',
    text:    'text-amber-300',
    glow:    'shadow-[0_0_24px_-4px_rgba(251,191,36,0.35)]',
    dot:     'bg-amber-400',
    badge:   Minus,
  },
  No: {
    label:   'No Hire',
    icon:    ThumbsDown,
    border:  'border-rose-500/40',
    bg:      'bg-rose-500/8',
    text:    'text-rose-400',
    glow:    'shadow-[0_0_24px_-4px_rgba(244,63,94,0.35)]',
    dot:     'bg-rose-500',
    badge:   XCircle,
  },
};

// ── Score ring ────────────────────────────────────────────────────────────────

function ScoreRing({ score }) {
  const pct   = (score / 10) * 100;
  const r     = 22;
  const circ  = 2 * Math.PI * r;
  const dash  = (pct / 100) * circ;
  const color = score >= 7 ? '#a3e635' : score >= 5 ? '#22d3ee' : score >= 3 ? '#fbbf24' : '#f472b6';

  return (
    <div className="relative inline-flex items-center justify-center shrink-0">
      <svg width={56} height={56} className="-rotate-90">
        <circle cx={28} cy={28} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
        <circle
          cx={28} cy={28} r={r} fill="none"
          stroke={color} strokeWidth={5}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 5px ${color})`, transition: 'stroke-dasharray .6s ease' }}
        />
      </svg>
      <span className="absolute text-sm font-extrabold text-white">{score}</span>
    </div>
  );
}

// ── Section block ─────────────────────────────────────────────────────────────

function Section({ icon: Icon, title, iconCls, children }) {
  return (
    <div className="rounded-xl border border-white/6 bg-ink-900/60 overflow-hidden">
      <div className="flex items-center gap-2 border-b border-white/5 px-3 py-2">
        <Icon size={13} className={iconCls} />
        <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">{title}</span>
      </div>
      <div className="px-3 py-2.5">{children}</div>
    </div>
  );
}

// ── Bullet list ───────────────────────────────────────────────────────────────

function BulletList({ items, dotCls }) {
  if (!items?.length) return <p className="text-xs text-zinc-600 italic">None recorded.</p>;
  return (
    <ul className="space-y-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex items-start gap-2 text-xs text-zinc-300 leading-relaxed">
          <span className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${dotCls}`} />
          {item}
        </li>
      ))}
    </ul>
  );
}

// ── Loading skeleton ──────────────────────────────────────────────────────────

function SummarySkeleton() {
  return (
    <div className="flex flex-1 flex-col gap-3 px-4 py-3 animate-pulse">
      {/* Recommendation block */}
      <div className="skeleton h-20 w-full rounded-xl" />
      {/* Sections */}
      {[60, 80, 48, 48].map((w, i) => (
        <div key={i} className="rounded-xl border border-white/5 bg-ink-900/40 p-3 space-y-2">
          <div className="skeleton h-3 w-24 rounded" />
          <div className={`skeleton h-3 rounded`} style={{ width: `${w}%` }} />
          <div className="skeleton h-3 w-3/4 rounded" />
        </div>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function InterviewSummaryPanel({ interviewId, isEnded, initialSummary }) {
  const [summary,    setSummary]    = useState(initialSummary?.generatedAt ? initialSummary : null);
  const [generating, setGenerating] = useState(false);
  const [error,      setError]      = useState('');

  const generate = async () => {
    setError('');
    setGenerating(true);
    try {
      const { data } = await api.post(`/ai/summary/${interviewId}`);
      setSummary(data.summary);
    } catch (e) {
      setError(e?.response?.data?.message || 'Failed to generate summary. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  // ── Idle: not yet generated ────────────────────────────────────────────────
  if (!summary && !generating) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-5 py-8 text-center">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-neon-violet/20 to-neon-pink/20 border border-neon-violet/25 text-neon-violet">
          <Sparkles size={22} />
        </div>
        <div>
          <p className="text-sm font-semibold text-white">AI Interview Summary</p>
          <p className="mt-1 text-xs text-zinc-500 max-w-[200px]">
            {isEnded
              ? 'Generate a full performance report with strengths, weaknesses, and a hire recommendation.'
              : 'Available once the interview has ended.'}
          </p>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/8 px-3 py-2 text-xs text-rose-300 text-left">
            <AlertTriangle size={13} className="shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <button
          onClick={generate}
          disabled={!isEnded}
          className="btn-primary gap-2 px-5 py-2 text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Sparkles size={13} />
          {isEnded ? 'Generate Summary' : 'Interview Still Active'}
        </button>
      </div>
    );
  }

  // ── Generating ─────────────────────────────────────────────────────────────
  if (generating) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="shrink-0 flex items-center gap-2 border-b border-white/5 bg-ink-900/40 px-4 py-2.5">
          <Loader2 size={13} className="animate-spin text-neon-violet" />
          <span className="text-xs text-zinc-400">Analysing interview data…</span>
        </div>
        <SummarySkeleton />
      </div>
    );
  }

  // ── Summary view ──────────────────────────────────────────────────────────
  const rec = REC[summary.recommendation] || REC.Maybe;
  const RecIcon   = rec.icon;
  const BadgeIcon = rec.badge;

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center justify-between border-b border-white/5 bg-ink-900/40 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <Sparkles size={13} className="text-neon-violet" />
          <span className="text-xs font-semibold text-zinc-300">AI Summary</span>
          {summary.generatedAt && (
            <span className="text-[10px] text-zinc-600 ml-1">
              · {new Date(summary.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
        </div>
        <button
          onClick={generate}
          disabled={generating}
          className="btn-ghost !px-2 !py-1 text-[11px] gap-1 text-zinc-500 hover:text-zinc-200"
          title="Regenerate summary"
        >
          <RefreshCw size={11} className={generating ? 'animate-spin' : ''} />
          Regenerate
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-3">

        {/* ── Recommendation hero ────────────────────────────────────────── */}
        <div className={`rounded-xl border p-4 ${rec.border} ${rec.bg} ${rec.glow}`}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <span className={`grid h-9 w-9 place-items-center rounded-xl border ${rec.border} ${rec.text}`}>
                <RecIcon size={18} />
              </span>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Recommendation</p>
                <p className={`text-xl font-extrabold leading-none mt-0.5 ${rec.text}`}>{rec.label}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <ScoreRing score={summary.overallScore || 0} />
              <div>
                <p className="text-[9px] text-zinc-600 uppercase tracking-wide">Score</p>
                <p className="text-xs font-bold text-white">{summary.overallScore}/10</p>
              </div>
            </div>
          </div>
          <p className="text-xs text-zinc-300 leading-relaxed">{summary.performanceSummary}</p>
        </div>

        {/* ── Strengths ─────────────────────────────────────────────────── */}
        <Section icon={TrendingUp} title="Strengths" iconCls="text-neon-lime">
          <BulletList items={summary.strengths} dotCls="bg-neon-lime" />
        </Section>

        {/* ── Weaknesses ────────────────────────────────────────────────── */}
        <Section icon={TrendingDown} title="Areas to Improve" iconCls="text-rose-400">
          <BulletList items={summary.weaknesses} dotCls="bg-rose-400" />
        </Section>

        {/* ── Code Quality ──────────────────────────────────────────────── */}
        <Section icon={Code2} title="Code Quality" iconCls="text-neon-cyan">
          <p className="text-xs text-zinc-300 leading-relaxed">
            {summary.codeQuality || <span className="italic text-zinc-600">No code was evaluated.</span>}
          </p>
        </Section>

        {/* ── Communication ─────────────────────────────────────────────── */}
        <Section icon={MessageSquare} title="Communication" iconCls="text-neon-violet">
          <p className="text-xs text-zinc-300 leading-relaxed">
            {summary.communication || <span className="italic text-zinc-600">No data recorded.</span>}
          </p>
        </Section>

        {/* Bottom padding */}
        <div className="h-2" />
      </div>
    </div>
  );
}
