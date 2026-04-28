/**
 * RubricPanel — interviewer-only evaluation panel.
 *
 * Props:
 *   interviewId  – MongoDB _id of the interview
 *   initialRubric – rubric object already loaded with the interview (may be null)
 *
 * Renders inside the interviewer's sidebar.
 * The candidate never sees this panel — it is only mounted when user.role === 'interviewer'.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Star, ChevronDown, ChevronUp, CheckCircle2,
  CloudUpload, Check, AlertTriangle, Lock, ClipboardList,
} from 'lucide-react';
import api from '../api/axios';

// ─── Default rubric criteria ─────────────────────────────────────────────────

const DEFAULT_CRITERIA = [
  { name: 'Problem Solving',      rating: 0, note: '' },
  { name: 'Technical Knowledge',  rating: 0, note: '' },
  { name: 'Code Quality',         rating: 0, note: '' },
  { name: 'Communication',        rating: 0, note: '' },
  { name: 'System Design',        rating: 0, note: '' },
  { name: 'Culture Fit',          rating: 0, note: '' },
];

const RATING_LABELS = ['', 'Poor', 'Below avg', 'Average', 'Good', 'Excellent'];
const RATING_COLORS = [
  '',
  'text-rose-400',
  'text-neon-amber',
  'text-yellow-300',
  'text-neon-cyan',
  'text-neon-lime',
];

// ─── helpers ─────────────────────────────────────────────────────────────────

function avgRating(criteria) {
  const rated = criteria.filter((c) => c.rating > 0);
  if (!rated.length) return 0;
  return rated.reduce((s, c) => s + c.rating, 0) / rated.length;
}

function initCriteria(existing) {
  if (!existing || !existing.length) return DEFAULT_CRITERIA.map((c) => ({ ...c }));
  // Merge saved criteria with defaults so new criteria always appear
  const saved = new Map(existing.map((c) => [c.name, c]));
  return DEFAULT_CRITERIA.map((d) =>
    saved.has(d.name) ? { ...d, ...saved.get(d.name) } : { ...d }
  );
}

// ─── sub-components ──────────────────────────────────────────────────────────

function StarRating({ value, onChange, disabled, size = 18 }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          disabled={disabled}
          onClick={() => onChange(star === value ? 0 : star)}
          onMouseEnter={() => !disabled && setHovered(star)}
          onMouseLeave={() => setHovered(0)}
          className="rounded transition-transform focus:outline-none disabled:cursor-not-allowed
            enabled:hover:scale-110 enabled:active:scale-95"
          title={RATING_LABELS[star]}
        >
          <Star
            size={size}
            className={`transition-colors ${
              star <= display
                ? display >= 4
                  ? 'fill-neon-lime text-neon-lime'
                  : display === 3
                  ? 'fill-yellow-300 text-yellow-300'
                  : display === 2
                  ? 'fill-neon-amber text-neon-amber'
                  : 'fill-rose-400 text-rose-400'
                : 'fill-transparent text-zinc-700'
            }`}
          />
        </button>
      ))}
      {value > 0 && (
        <span className={`ml-1.5 text-[11px] font-medium ${RATING_COLORS[value]}`}>
          {RATING_LABELS[value]}
        </span>
      )}
    </div>
  );
}

function ScoreBadge({ score }) {
  if (!score) return null;
  const pct  = (score / 5) * 100;
  const r    = 20;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  const color = score >= 4 ? '#a3e635' : score >= 3 ? '#22d3ee' : score >= 2 ? '#fbbf24' : '#f472b6';

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={52} height={52} className="-rotate-90">
        <circle cx={26} cy={26} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={5} />
        <circle
          cx={26} cy={26} r={r} fill="none"
          stroke={color} strokeWidth={5}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 4px ${color})`, transition: 'stroke-dasharray .5s ease' }}
        />
      </svg>
      <span className="absolute text-xs font-bold text-white">{score.toFixed(1)}</span>
    </div>
  );
}

// ─── main component ───────────────────────────────────────────────────────────

export default function RubricPanel({ interviewId, initialRubric }) {
  const [criteria,      setCriteria]      = useState(() => initCriteria(initialRubric?.criteria));
  const [overallNotes,  setOverallNotes]  = useState(initialRubric?.overallNotes || '');
  const [overallRating, setOverallRating] = useState(initialRubric?.overallRating || 0);
  const [submittedAt,   setSubmittedAt]   = useState(initialRubric?.submittedAt || null);
  const [expanded,      setExpanded]      = useState({}); // { [criterionName]: bool }
  const [saveState,     setSaveState]     = useState('idle'); // 'idle'|'saving'|'saved'|'error'
  const [finalizing,    setFinalizing]    = useState(false);

  const debounceRef = useRef(null);
  const isLocked    = !!submittedAt;

  // ── Auto-save on any change ─────────────────────────────────────────────────
  const scheduleSave = useCallback(
    (nextCriteria, nextNotes, nextRating) => {
      if (isLocked) return;
      setSaveState('saving');
      clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(async () => {
        try {
          await api.patch(`/interviews/${interviewId}/rubric`, {
            criteria:      nextCriteria,
            overallNotes:  nextNotes,
            overallRating: nextRating,
          });
          setSaveState('saved');
          setTimeout(() => setSaveState('idle'), 2000);
        } catch {
          setSaveState('error');
        }
      }, 800);
    },
    [interviewId, isLocked]
  );

  // Cleanup on unmount
  useEffect(() => () => clearTimeout(debounceRef.current), []);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const updateRating = (idx, rating) => {
    const next = criteria.map((c, i) => (i === idx ? { ...c, rating } : c));
    setCriteria(next);
    scheduleSave(next, overallNotes, overallRating);
  };

  const updateNote = (idx, note) => {
    const next = criteria.map((c, i) => (i === idx ? { ...c, note } : c));
    setCriteria(next);
    scheduleSave(next, overallNotes, overallRating);
  };

  const updateOverallNotes = (val) => {
    setOverallNotes(val);
    scheduleSave(criteria, val, overallRating);
  };

  const updateOverallRating = (rating) => {
    setOverallRating(rating);
    scheduleSave(criteria, overallNotes, rating);
  };

  const toggleExpand = (name) =>
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));

  const handleFinalize = async () => {
    if (isLocked || finalizing) return;
    if (!window.confirm('Finalize this evaluation? You won\'t be able to edit it after submission.')) return;
    setFinalizing(true);
    try {
      const { data } = await api.patch(`/interviews/${interviewId}/rubric`, {
        criteria,
        overallNotes,
        overallRating,
        submit: true,
      });
      setSubmittedAt(data.rubric.submittedAt);
      setSaveState('saved');
    } catch {
      setSaveState('error');
    } finally {
      setFinalizing(false);
    }
  };

  // ── Computed ─────────────────────────────────────────────────────────────────
  const avg           = avgRating(criteria);
  const ratedCount    = criteria.filter((c) => c.rating > 0).length;
  const totalCriteria = criteria.length;

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between border-b border-white/5 bg-ink-800/40 px-4 py-2.5">
        <div className="flex items-center gap-2">
          <ClipboardList size={14} className="text-neon-violet" />
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Evaluation Rubric
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isLocked ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-neon-lime">
              <Lock size={10} /> Submitted
            </span>
          ) : (
            <SaveIndicator state={saveState} />
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {/* ── Score overview ────────────────────────────────────────────── */}
        <div className="flex items-center gap-4 border-b border-white/5 px-4 py-3">
          <ScoreBadge score={avg || null} />
          <div>
            <p className="text-sm font-semibold text-white">
              {avg ? `${avg.toFixed(1)} / 5` : 'Not rated yet'}
            </p>
            <p className="text-xs text-zinc-500">
              {ratedCount} of {totalCriteria} criteria rated
            </p>
          </div>
          {isLocked && (
            <div className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-neon-lime/30 bg-neon-lime/5 px-2.5 py-1 text-xs text-neon-lime">
              <CheckCircle2 size={11} />
              Submitted {new Date(submittedAt).toLocaleString()}
            </div>
          )}
        </div>

        {/* ── Criteria list ─────────────────────────────────────────────── */}
        <ul className="divide-y divide-white/5">
          {criteria.map((c, idx) => (
            <li key={c.name} className="px-4 py-3">
              {/* Row: name + stars */}
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-zinc-200 min-w-0 truncate">
                  {c.name}
                </span>
                <button
                  onClick={() => !isLocked && toggleExpand(c.name)}
                  className="ml-1 shrink-0 text-zinc-600 hover:text-zinc-400 transition"
                  title="Add note"
                >
                  {expanded[c.name]
                    ? <ChevronUp size={13} />
                    : <ChevronDown size={13} />}
                </button>
              </div>

              <div className="mt-1.5">
                <StarRating
                  value={c.rating}
                  onChange={(r) => updateRating(idx, r)}
                  disabled={isLocked}
                />
              </div>

              {/* Expandable note */}
              {expanded[c.name] && (
                <textarea
                  value={c.note}
                  onChange={(e) => updateNote(idx, e.target.value)}
                  disabled={isLocked}
                  placeholder={`Notes for ${c.name}…`}
                  rows={2}
                  className="mt-2 w-full resize-none rounded-lg border border-white/10 bg-ink-900
                    px-3 py-2 text-xs text-zinc-300 placeholder:text-zinc-600
                    focus:border-neon-violet/50 focus:outline-none focus:ring-1 focus:ring-neon-violet/20
                    disabled:opacity-40 disabled:cursor-not-allowed"
                />
              )}
            </li>
          ))}
        </ul>

        {/* ── Overall rating ────────────────────────────────────────────── */}
        <div className="border-t border-white/5 px-4 py-4">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Overall Impression
          </p>
          <StarRating
            value={overallRating}
            onChange={updateOverallRating}
            disabled={isLocked}
            size={20}
          />
        </div>

        {/* ── Overall notes ─────────────────────────────────────────────── */}
        <div className="border-t border-white/5 px-4 pb-4">
          <p className="mb-2 pt-4 text-xs font-semibold uppercase tracking-wider text-zinc-500">
            Overall Notes
          </p>
          <textarea
            value={overallNotes}
            onChange={(e) => updateOverallNotes(e.target.value)}
            disabled={isLocked}
            placeholder="Summarise the candidate's performance, key strengths, concerns, and hiring recommendation…"
            rows={5}
            className="w-full resize-none rounded-lg border border-white/10 bg-ink-900
              px-3 py-2.5 text-sm text-zinc-300 placeholder:text-zinc-600 leading-relaxed
              focus:border-neon-violet/50 focus:outline-none focus:ring-1 focus:ring-neon-violet/20
              disabled:opacity-40 disabled:cursor-not-allowed"
          />
          <p className="mt-1 text-right text-[11px] text-zinc-600">
            {overallNotes.length} / 5000
          </p>
        </div>
      </div>

      {/* ── Footer: finalize ─────────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-white/5 bg-ink-800/40 px-4 py-3">
        {isLocked ? (
          <div className="flex items-center gap-2 rounded-lg border border-neon-lime/20 bg-neon-lime/5 px-3 py-2.5 text-sm text-neon-lime">
            <CheckCircle2 size={15} />
            Evaluation submitted — locked.
          </div>
        ) : (
          <>
            {saveState === 'error' && (
              <p className="mb-2 flex items-center gap-1.5 text-xs text-neon-pink">
                <AlertTriangle size={12} /> Auto-save failed. Check connection.
              </p>
            )}
            <button
              onClick={handleFinalize}
              disabled={finalizing || ratedCount === 0}
              className="w-full justify-center btn-primary disabled:opacity-40 disabled:cursor-not-allowed py-2.5"
            >
              {finalizing
                ? 'Submitting…'
                : `Submit Evaluation${ratedCount > 0 ? ` (${ratedCount}/${totalCriteria} rated)` : ''}`}
            </button>
            <p className="mt-1.5 text-center text-[11px] text-zinc-600">
              Auto-saved · cannot edit after submission
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// ─── save indicator ──────────────────────────────────────────────────────────

function SaveIndicator({ state }) {
  if (state === 'saving') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
        <CloudUpload size={11} className="animate-pulse" /> Saving…
      </span>
    );
  }
  if (state === 'saved') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-neon-lime">
        <Check size={11} /> Saved
      </span>
    );
  }
  if (state === 'error') {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] text-neon-pink">
        <AlertTriangle size={11} /> Error
      </span>
    );
  }
  return null;
}
