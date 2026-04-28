import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight, CalendarPlus, ListChecks, CalendarX,
  FileText, X, ChevronLeft, ChevronRight, BarChart2, Sparkles,
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar } from '../components/Navbar';
import { SkeletonTableRow } from '../components/Skeleton';
import CandidateResumePanel from '../components/CandidateResumePanel';
import InterviewSummaryPanel from '../components/InterviewSummaryPanel';

const PAGE_SIZE = 8;

export default function InterviewList() {
  const { user }   = useAuth();
  const { toast }  = useToast();

  const [interviews,     setInterviews]     = useState([]);
  const [pagination,     setPagination]     = useState({ total: 0, page: 1, pages: 1 });
  const [loading,        setLoading]        = useState(true);
  const [page,           setPage]           = useState(1);
  const [drawer,         setDrawer]         = useState(null); // { candidateId, candidateName } | null
  const [summaryDrawer,  setSummaryDrawer]  = useState(null); // { interviewId, title, aiSummary } | null

  useEffect(() => {
    setLoading(true);
    api
      .get('/interviews', { params: { page, limit: PAGE_SIZE } })
      .then((r) => {
        setInterviews(r.data.interviews);
        setPagination(r.data.pagination);
      })
      .catch(() => toast.error('Failed to load interviews. Please refresh.'))
      .finally(() => setLoading(false));
  }, [page]); // eslint-disable-line

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1">
            <ListChecks size={12} /> Interviews
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            {user.role === 'interviewer' ? 'Scheduled interviews' : 'Your interviews'}
          </h1>
          <p className="text-sm text-zinc-500 mt-1">Join when the scheduled time arrives.</p>
        </div>
        {user.role === 'interviewer' && (
          <Link to="/schedule" className="btn-primary">
            <CalendarPlus size={15} /> Schedule new
          </Link>
        )}
      </header>

      <div className="mt-6 card overflow-hidden">
        {loading ? (
          /* ── Skeleton table ─────────────────────────────────────────── */
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="bg-ink-900/60 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                  <th className="px-6 py-3">Title</th>
                  <th className="px-6 py-3">When</th>
                  <th className="px-6 py-3">{user.role === 'interviewer' ? 'Candidate' : 'Interviewer'}</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {[1, 2, 3, 4, 5].map((n) => <SkeletonTableRow key={n} />)}
              </tbody>
            </table>
          </div>
        ) : interviews.length === 0 && page === 1 ? (
          <Empty role={user.role} />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr className="bg-ink-900/60 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    <th className="px-6 py-3">Title</th>
                    <th className="px-6 py-3">When</th>
                    <th className="px-6 py-3">{user.role === 'interviewer' ? 'Candidate' : 'Interviewer'}</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {interviews.map((iv) => {
                    const other = user.role === 'interviewer' ? iv.candidateId : iv.interviewerId;
                    return (
                      <tr key={iv._id} className="hover:bg-ink-700/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-white">{iv.title}</td>
                        <td className="px-6 py-4 text-zinc-300">
                          {new Date(iv.scheduledAt).toLocaleString()}
                          <div className="text-xs text-zinc-500 mt-0.5">{iv.durationMinutes} min</div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <Avatar name={other?.name || '?'} size={28} />
                            <div>
                              <div className="text-zinc-200 text-sm">{other?.name}</div>
                              <div className="text-xs text-zinc-500">{other?.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <StatusPill status={iv.status} />
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-2 flex-wrap">
                            {user.role === 'interviewer' && (
                              <button
                                onClick={() => setDrawer({ candidateId: iv.candidateId._id, candidateName: iv.candidateId.name })}
                                className="btn-ghost !text-neon-cyan hover:!text-white gap-1.5 text-xs"
                                title="View candidate's resume"
                              >
                                <FileText size={14} /> Resume
                              </button>
                            )}
                            {user.role === 'interviewer' && (iv.status === 'completed' || iv.status === 'cancelled') && (
                              <button
                                onClick={() => setSummaryDrawer({ interviewId: iv._id, title: iv.title, aiSummary: iv.aiSummary })}
                                className="btn-ghost !text-neon-violet hover:!text-white gap-1.5 text-xs relative"
                                title="View AI interview summary"
                              >
                                <BarChart2 size={14} /> Summary
                                {/* Dot if no summary yet */}
                                {!iv.aiSummary?.generatedAt && (
                                  <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-neon-violet animate-pulse-dot shadow-[0_0_6px_theme(colors.violet.400)]" />
                                )}
                              </button>
                            )}
                            <Link to={`/prejoin/${iv.roomId}`} className="btn-secondary text-xs">
                              {iv.status === 'completed' || iv.status === 'cancelled' ? 'View room' : 'Join'} <ArrowRight size={13} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.pages > 1 && (
              <div className="flex items-center justify-between border-t border-white/5 px-6 py-3">
                <p className="text-xs text-zinc-500">
                  Showing{' '}
                  <span className="text-zinc-300">
                    {(pagination.page - 1) * PAGE_SIZE + 1}–{Math.min(pagination.page * PAGE_SIZE, pagination.total)}
                  </span>{' '}
                  of <span className="text-zinc-300">{pagination.total}</span>
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="btn-ghost !px-2 !py-1 text-xs disabled:opacity-30"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`min-w-[28px] rounded-md px-2 py-1 text-xs font-medium transition ${
                        p === page
                          ? 'bg-neon-cyan/15 text-neon-cyan shadow-[inset_0_0_0_1px_#22d3ee55]'
                          : 'text-zinc-400 hover:bg-ink-700 hover:text-white'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
                    disabled={page >= pagination.pages}
                    className="btn-ghost !px-2 !py-1 text-xs disabled:opacity-30"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Resume drawer */}
      {drawer && (
        <ResumeDrawer
          candidateId={drawer.candidateId}
          candidateName={drawer.candidateName}
          onClose={() => setDrawer(null)}
        />
      )}

      {/* Summary drawer */}
      {summaryDrawer && (
        <SummaryDrawer
          interviewId={summaryDrawer.interviewId}
          title={summaryDrawer.title}
          aiSummary={summaryDrawer.aiSummary}
          onClose={() => setSummaryDrawer(null)}
        />
      )}
    </main>
  );
}

/* ── Summary drawer ─────────────────────────────────────────────────────── */
function SummaryDrawer({ interviewId, title, aiSummary, onClose }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div
        ref={overlayRef}
        onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in"
      />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-ink-800 shadow-2xl border-l border-white/5 animate-fade-in">
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-neon-violet/10 text-neon-violet border border-neon-violet/25">
              <Sparkles size={15} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{title}</p>
              <p className="text-[11px] text-zinc-500">AI Interview Summary</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 hover:bg-ink-700 hover:text-white transition">
            <X size={16} />
          </button>
        </div>
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
          <InterviewSummaryPanel
            interviewId={interviewId}
            isEnded={true}
            initialSummary={aiSummary}
          />
        </div>
      </aside>
    </>
  );
}

/* ── Resume drawer ──────────────────────────────────────────────────────── */
function ResumeDrawer({ candidateId, candidateName, onClose }) {
  const overlayRef = useRef(null);

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div
        ref={overlayRef}
        onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm animate-fade-in"
      />
      <aside className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col bg-ink-800 shadow-2xl border-l border-white/5 animate-fade-in">
        <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-lg bg-ink-900 text-neon-cyan shadow-neon-cyan">
              <FileText size={15} />
            </div>
            <div>
              <p className="text-sm font-semibold text-white">{candidateName}'s Resume</p>
              <p className="text-[11px] text-zinc-500">AI-powered analysis</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-zinc-500 hover:bg-ink-700 hover:text-white transition">
            <X size={16} />
          </button>
        </div>
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
          <CandidateResumePanel candidateId={candidateId} />
        </div>
      </aside>
    </>
  );
}

/* ── Helpers ────────────────────────────────────────────────────────────── */
function StatusPill({ status }) {
  const map = {
    scheduled:     { cls: 'pill-cyan',   dot: 'bg-neon-cyan',   label: 'Scheduled' },
    'in-progress': { cls: 'pill-lime',   dot: 'bg-neon-lime',   label: 'In progress' },
    completed:     { cls: 'pill-violet', dot: 'bg-neon-violet', label: 'Completed' },
    cancelled:     { cls: 'pill-muted',  dot: 'bg-zinc-500',    label: 'Cancelled' },
  }[status] || { cls: 'pill-muted', dot: 'bg-zinc-500', label: status };

  return (
    <span className={map.cls}>
      <span className={`h-1.5 w-1.5 rounded-full ${map.dot} shadow-[0_0_8px_currentColor]`} />
      {map.label}
    </span>
  );
}

function Empty({ role }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-ink-700/60 border border-white/5 text-zinc-600">
        <CalendarX size={22} />
      </div>
      <p className="text-base font-semibold text-zinc-300">No interviews yet</p>
      {role === 'interviewer' ? (
        <>
          <p className="text-sm text-zinc-500 max-w-xs">
            Get started by scheduling your first interview session.
          </p>
          <Link to="/schedule" className="btn-primary mt-2">
            <CalendarPlus size={15} /> Schedule your first
          </Link>
        </>
      ) : (
        <p className="text-sm text-zinc-500 max-w-xs">
          Once an interviewer schedules a session with you, it will show up here.
        </p>
      )}
    </div>
  );
}
