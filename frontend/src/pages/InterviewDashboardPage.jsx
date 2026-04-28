/**
 * InterviewDashboardPage
 * Interviewer-only page. Shows every interview as a rich card with:
 *  - Candidate avatar + name
 *  - AI score (overallScore / 10) or rubric rating (overallRating / 5)
 *  - Hiring decision badge (Pending / Selected / Rejected) + inline dropdown to change it
 *  - Quick notes preview (rubric.overallNotes)
 *  - "View Full Report" button → opens AI summary drawer
 */

import { useEffect, useRef, useState } from 'react';
import {
  BarChart2, Sparkles, X, ChevronDown,
  CheckCircle2, XCircle, Clock, Star,
  CalendarDays, Users, TrendingUp, Filter,
  FileText,
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar } from '../components/Navbar';
import InterviewSummaryPanel from '../components/InterviewSummaryPanel';

// ── Decision config ────────────────────────────────────────────────────────────

const DECISION = {
  pending: {
    label:  'Pending',
    icon:   Clock,
    pill:   'bg-amber-400/10 text-amber-300 border border-amber-400/25',
    dot:    'bg-amber-400',
    glow:   'shadow-[0_0_8px_rgba(251,191,36,0.3)]',
  },
  selected: {
    label:  'Selected',
    icon:   CheckCircle2,
    pill:   'bg-neon-lime/10 text-neon-lime border border-neon-lime/25',
    dot:    'bg-neon-lime',
    glow:   'shadow-[0_0_8px_rgba(163,230,53,0.3)]',
  },
  rejected: {
    label:  'Rejected',
    icon:   XCircle,
    pill:   'bg-rose-500/10 text-rose-400 border border-rose-500/25',
    dot:    'bg-rose-500',
    glow:   'shadow-[0_0_8px_rgba(244,63,94,0.3)]',
  },
};

// ── Score ring (small) ─────────────────────────────────────────────────────────

function MiniScoreRing({ score, max = 10 }) {
  const pct   = (score / max) * 100;
  const r     = 16;
  const circ  = 2 * Math.PI * r;
  const dash  = (pct / 100) * circ;
  const color =
    score / max >= 0.7 ? '#a3e635'
    : score / max >= 0.5 ? '#22d3ee'
    : score / max >= 0.3 ? '#fbbf24'
    : '#f472b6';

  return (
    <div className="relative inline-flex items-center justify-center shrink-0" title={`Score: ${score}/${max}`}>
      <svg width={40} height={40} className="-rotate-90">
        <circle cx={20} cy={20} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
        <circle
          cx={20} cy={20} r={r} fill="none"
          stroke={color} strokeWidth={4}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${color})`, transition: 'stroke-dasharray .5s ease' }}
        />
      </svg>
      <span className="absolute text-[10px] font-extrabold text-white leading-none">{score}</span>
    </div>
  );
}

// ── Decision dropdown ──────────────────────────────────────────────────────────

function DecisionDropdown({ interviewId, current, candidateName, onUpdate }) {
  const [open,    setOpen]    = useState(false);
  const [saving,  setSaving]  = useState(false);
  const { toast } = useToast();
  const ref = useRef(null);
  const cfg = DECISION[current] || DECISION.pending;
  const Icon = cfg.icon;

  // Close on outside click
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const pick = async (decision) => {
    if (decision === current) { setOpen(false); return; }
    setOpen(false);
    setSaving(true);
    try {
      const { data } = await api.patch(`/interviews/${interviewId}/decision`, { decision });
      onUpdate(decision);
      // Confirm email was sent
      if (data.emailSent) {
        const name = candidateName || 'Candidate';
        if (decision === 'selected') {
          toast.success(`✅ ${name} marked as Selected — congratulations email sent!`);
        } else if (decision === 'rejected') {
          toast.info(`${name} marked as Rejected — notification email sent.`);
        }
      } else if (decision !== 'pending') {
        toast.success(`Decision updated to ${DECISION[decision]?.label}`);
      }
    } catch (e) {
      toast.error(e?.response?.data?.message || 'Failed to update decision.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={saving}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold transition-all ${cfg.pill} ${cfg.glow} disabled:opacity-60`}
      >
        <Icon size={11} />
        {cfg.label}
        <ChevronDown size={10} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-20 mt-1.5 w-36 overflow-hidden rounded-xl border border-white/8 bg-ink-800 shadow-xl animate-fade-in">
          {Object.entries(DECISION).map(([key, val]) => {
            const DIcon = val.icon;
            return (
              <button
                key={key}
                onClick={() => pick(key)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-xs font-medium transition hover:bg-ink-700 ${
                  key === current ? 'text-white bg-ink-700/60' : 'text-zinc-400'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${val.dot}`} />
                <DIcon size={12} />
                {val.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Interview card ─────────────────────────────────────────────────────────────

function InterviewCard({ interview, onDecisionUpdate, onViewReport }) {
  const candidate = interview.candidateId;
  const hasAI     = !!interview.aiSummary?.generatedAt;
  const hasRubric = (interview.rubric?.overallRating || 0) > 0;

  // Score: prefer AI (0-10), fall back to rubric (0-5, display /5)
  const scoreNode = hasAI ? (
    <div className="flex items-center gap-2">
      <MiniScoreRing score={interview.aiSummary.overallScore} max={10} />
      <div>
        <p className="text-[9px] text-zinc-600 uppercase tracking-wider">AI Score</p>
        <p className="text-sm font-bold text-white leading-none">{interview.aiSummary.overallScore}<span className="text-zinc-500 text-[10px] font-normal">/10</span></p>
      </div>
    </div>
  ) : hasRubric ? (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={13}
          className={s <= interview.rubric.overallRating ? 'text-amber-400 fill-amber-400' : 'text-zinc-700'}
        />
      ))}
      <span className="text-xs text-zinc-400 ml-0.5">{interview.rubric.overallRating}/5</span>
    </div>
  ) : (
    <p className="text-xs text-zinc-600 italic">No score yet</p>
  );

  // Notes preview
  const notes = interview.rubric?.overallNotes?.trim() || '';

  const statusIs = interview.status;
  const isEnded  = statusIs === 'completed' || statusIs === 'cancelled';

  return (
    <div className="card flex flex-col gap-0 overflow-hidden hover:border-white/12 transition-all duration-200 hover:shadow-lg hover:shadow-black/30">

      {/* Top accent bar — color by hiring decision */}
      <div className={`h-0.5 w-full ${
        interview.hiringDecision === 'selected' ? 'bg-gradient-to-r from-neon-lime/60 to-neon-cyan/30'
        : interview.hiringDecision === 'rejected' ? 'bg-gradient-to-r from-rose-500/60 to-rose-400/20'
        : 'bg-gradient-to-r from-amber-400/40 to-amber-300/10'
      }`} />

      <div className="p-4 flex flex-col gap-3">
        {/* ── Candidate row ── */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar name={candidate?.name || '?'} size={36} />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{candidate?.name}</p>
              <p className="text-[11px] text-zinc-500 truncate">{candidate?.email}</p>
            </div>
          </div>
          <DecisionDropdown
            interviewId={interview._id}
            current={interview.hiringDecision || 'pending'}
            candidateName={candidate?.name}
            onUpdate={(d) => onDecisionUpdate(interview._id, d)}
          />
        </div>

        {/* ── Interview title + date ── */}
        <div className="rounded-lg bg-ink-900/50 px-3 py-2 border border-white/4">
          <p className="text-xs font-medium text-zinc-300 truncate">{interview.title}</p>
          <p className="text-[10px] text-zinc-600 mt-0.5">
            {new Date(interview.scheduledAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            {' · '}{interview.durationMinutes}m
          </p>
        </div>

        {/* ── Score ── */}
        <div className="flex items-center justify-between">
          <div>{scoreNode}</div>
          {/* Interview status badge */}
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
            statusIs === 'completed'    ? 'bg-neon-violet/10 text-neon-violet border border-neon-violet/20'
            : statusIs === 'in-progress' ? 'bg-neon-lime/10 text-neon-lime border border-neon-lime/20'
            : statusIs === 'cancelled'   ? 'bg-zinc-700/50 text-zinc-500 border border-white/5'
            : 'bg-neon-cyan/10 text-neon-cyan border border-neon-cyan/20'
          }`}>
            {statusIs === 'in-progress' ? 'In Progress' : statusIs.charAt(0).toUpperCase() + statusIs.slice(1)}
          </span>
        </div>

        {/* ── Quick notes ── */}
        <div className="min-h-[44px]">
          {notes ? (
            <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">{notes}</p>
          ) : (
            <p className="text-xs text-zinc-700 italic">No notes recorded yet.</p>
          )}
        </div>

        {/* ── Actions ── */}
        <div className="flex items-center gap-2 pt-1 border-t border-white/5">
          <button
            onClick={() => onViewReport(interview)}
            className="flex-1 btn-ghost !text-neon-violet hover:!text-white gap-1.5 text-xs justify-center"
            title={isEnded ? 'View AI summary' : 'Summary available after interview ends'}
          >
            <BarChart2 size={13} />
            {hasAI ? 'View Full Report' : isEnded ? 'Generate Report' : 'Report (after interview)'}
          </button>
          {hasAI && (
            <span className="shrink-0 flex items-center gap-1 text-[10px] text-neon-violet/60">
              <Sparkles size={10} /> AI
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Summary drawer ─────────────────────────────────────────────────────────────

function SummaryDrawer({ interview, onClose }) {
  const overlayRef = useRef(null);
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const isEnded = interview.status === 'completed' || interview.status === 'cancelled';

  return (
    <>
      <div
        ref={overlayRef}
        onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in"
      />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-ink-800 shadow-2xl border-l border-white/5 animate-fade-in">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between border-b border-white/5 px-5 py-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-neon-violet/10 text-neon-violet border border-neon-violet/25">
              <Sparkles size={15} />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate">{interview.candidateId?.name}</p>
              <p className="text-[11px] text-zinc-500 truncate">{interview.title}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="shrink-0 rounded-lg p-1.5 text-zinc-500 hover:bg-ink-700 hover:text-white transition"
          >
            <X size={16} />
          </button>
        </div>

        {/* Panel */}
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
          <InterviewSummaryPanel
            interviewId={interview._id}
            isEnded={isEnded}
            initialSummary={interview.aiSummary}
          />
        </div>
      </aside>
    </>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon: Icon, accentCls, iconCls }) {
  return (
    <div className={`card p-4 flex items-center gap-3 border-l-2 ${accentCls}`}>
      <div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-ink-900/60 ${iconCls}`}>
        <Icon size={18} />
      </div>
      <div>
        <p className="text-2xl font-extrabold text-white leading-none">{value}</p>
        <p className="text-xs text-zinc-500 mt-0.5">{label}</p>
      </div>
    </div>
  );
}

// ── Skeleton card ──────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="card p-4 animate-pulse space-y-3">
      <div className="flex items-center gap-2.5">
        <div className="skeleton h-9 w-9 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="skeleton h-3 w-32 rounded" />
          <div className="skeleton h-2.5 w-24 rounded" />
        </div>
      </div>
      <div className="skeleton h-12 w-full rounded-lg" />
      <div className="skeleton h-3 w-20 rounded" />
      <div className="skeleton h-8 w-full rounded" />
      <div className="skeleton h-7 w-full rounded" />
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

const FILTER_OPTIONS = [
  { id: 'all',       label: 'All'        },
  { id: 'pending',   label: 'Pending'    },
  { id: 'selected',  label: 'Selected'   },
  { id: 'rejected',  label: 'Rejected'   },
  { id: 'completed', label: 'Completed'  },
  { id: 'scheduled', label: 'Scheduled'  },
];

export default function InterviewDashboardPage() {
  const { user }  = useAuth();
  const { toast } = useToast();

  const [interviews,   setInterviews]   = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [filter,       setFilter]       = useState('all');
  const [summaryTarget, setSummaryTarget] = useState(null); // interview object | null

  // Load all interviews (up to 100 — dashboard context)
  useEffect(() => {
    setLoading(true);
    api
      .get('/interviews', { params: { limit: 100 } })
      .then((r) => setInterviews(r.data.interviews || []))
      .catch(() => toast.error('Could not load interviews.'))
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line

  // Inline decision update — mutate the list without re-fetching
  const handleDecisionUpdate = (interviewId, decision) => {
    setInterviews((prev) =>
      prev.map((iv) => iv._id === interviewId ? { ...iv, hiringDecision: decision } : iv)
    );
  };

  // Filter
  const visible = interviews.filter((iv) => {
    if (filter === 'all')      return true;
    if (filter === 'pending')  return (iv.hiringDecision || 'pending') === 'pending';
    if (filter === 'selected') return iv.hiringDecision === 'selected';
    if (filter === 'rejected') return iv.hiringDecision === 'rejected';
    return iv.status === filter;
  });

  // Stats
  const total    = interviews.length;
  const selected = interviews.filter((iv) => iv.hiringDecision === 'selected').length;
  const rejected = interviews.filter((iv) => iv.hiringDecision === 'rejected').length;
  const pending  = interviews.filter((iv) => !iv.hiringDecision || iv.hiringDecision === 'pending').length;

  if (user?.role !== 'interviewer') {
    return (
      <main className="mx-auto max-w-3xl px-4 py-20 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-ink-700 text-neon-violet">
          <BarChart2 size={22} />
        </div>
        <h1 className="text-2xl font-bold text-white">Interview Dashboard</h1>
        <p className="mt-2 text-zinc-400">This page is for interviewers only.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-7xl px-4 py-10 animate-fade-in">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <header className="mb-8">
        <p className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1">
          <BarChart2 size={12} /> Interview Dashboard
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          Candidate <span className="neon-text-violet">Pipeline</span>
        </h1>
        <p className="text-sm text-zinc-500 mt-1">
          Track every candidate — score, notes, and hiring decision in one place.
        </p>
      </header>

      {/* ── Stats row ───────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 mb-8">
        <StatCard label="Total Interviews" value={total}    icon={Users}        accentCls="border-neon-cyan/40"   iconCls="text-neon-cyan"   />
        <StatCard label="Selected"         value={selected} icon={CheckCircle2} accentCls="border-neon-lime/40"   iconCls="text-neon-lime"   />
        <StatCard label="Rejected"         value={rejected} icon={XCircle}      accentCls="border-rose-500/40"    iconCls="text-rose-400"    />
        <StatCard label="Pending Review"   value={pending}  icon={Clock}        accentCls="border-amber-400/40"   iconCls="text-amber-300"   />
      </div>

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <div className="mb-6 flex items-center gap-2 flex-wrap">
        <Filter size={13} className="text-zinc-600 shrink-0" />
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            onClick={() => setFilter(opt.id)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-all ${
              filter === opt.id
                ? 'bg-neon-violet/15 text-neon-violet shadow-[inset_0_0_0_1px_rgba(139,92,246,0.4)]'
                : 'bg-ink-800 text-zinc-400 hover:bg-ink-700 hover:text-zinc-100 border border-white/5'
            }`}
          >
            {opt.label}
          </button>
        ))}
        <span className="ml-auto text-xs text-zinc-600">
          {visible.length} {visible.length === 1 ? 'interview' : 'interviews'}
        </span>
      </div>

      {/* ── Card grid ───────────────────────────────────────────────────── */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {[1, 2, 3, 4, 5, 6].map((n) => <SkeletonCard key={n} />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/5 bg-ink-800/40 py-20 text-center">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-ink-700/60 border border-white/5 text-zinc-600">
            <CalendarDays size={22} />
          </div>
          <p className="text-base font-semibold text-zinc-300">
            {filter === 'all' ? 'No interviews yet' : `No "${filter}" interviews`}
          </p>
          <p className="text-sm text-zinc-500 max-w-xs">
            {filter === 'all'
              ? 'Schedule your first interview to get started.'
              : 'Try a different filter above.'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((iv) => (
            <InterviewCard
              key={iv._id}
              interview={iv}
              onDecisionUpdate={handleDecisionUpdate}
              onViewReport={(iv) => setSummaryTarget(iv)}
            />
          ))}
        </div>
      )}

      {/* ── Summary drawer ───────────────────────────────────────────────── */}
      {summaryTarget && (
        <SummaryDrawer
          interview={summaryTarget}
          onClose={() => setSummaryTarget(null)}
        />
      )}
    </main>
  );
}
