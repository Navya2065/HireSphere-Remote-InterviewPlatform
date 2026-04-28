import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarPlus, CalendarClock, CheckCircle2, ArrowRight,
  LayoutDashboard, TrendingUp, Clock,
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Avatar } from '../components/Navbar';
import { SkeletonStatCard, SkeletonInterviewRow } from '../components/Skeleton';

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [interviews, setInterviews] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get('/interviews')
      .then((r) => setInterviews(r.data.interviews))
      .catch(() => toast.error('Could not load your interviews. Please refresh.'))
      .finally(() => setLoading(false));
  }, []);  // eslint-disable-line

  const now = new Date();
  const upcoming = interviews
    .filter((i) => new Date(i.scheduledAt) >= now && i.status !== 'cancelled')
    .slice(0, 5);
  const total          = interviews.length;
  const upcomingCount  = interviews.filter((i) => new Date(i.scheduledAt) >= now && i.status !== 'cancelled').length;
  const completedCount = interviews.filter((i) => i.status === 'completed').length;

  return (
    <main className="mx-auto max-w-7xl px-4 py-10">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <header className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <p className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1">
            <LayoutDashboard size={12} /> Dashboard
          </p>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Welcome back,{' '}
            <span className="gradient-text">{user.name.split(' ')[0]}</span>
          </h1>
          <p className="text-sm text-zinc-500 mt-1">
            Signed in as{' '}
            <span className={`font-semibold ${user.role === 'interviewer' ? 'text-neon-violet' : 'text-neon-cyan'}`}>
              {user.role}
            </span>
          </p>
        </div>
        {user.role === 'interviewer' && (
          <Link to="/schedule" className="btn-primary">
            <CalendarPlus size={15} /> Schedule interview
          </Link>
        )}
      </header>

      {/* ── Stat cards ──────────────────────────────────────────────────── */}
      <section className="grid gap-4 sm:grid-cols-3 mb-8">
        {loading ? (
          <>
            <SkeletonStatCard />
            <SkeletonStatCard />
            <SkeletonStatCard />
          </>
        ) : (
          <>
            <StatCard icon={TrendingUp}    label="Total interviews" value={total}          tone="cyan"   sub={`${total} session${total !== 1 ? 's' : ''} total`} />
            <StatCard icon={CalendarClock} label="Upcoming"         value={upcomingCount}  tone="violet" sub={upcomingCount === 0 ? 'Nothing scheduled' : 'Ahead of you'} />
            <StatCard icon={CheckCircle2}  label="Completed"        value={completedCount} tone="lime"   sub={completedCount === 0 ? 'None finished yet' : 'Sessions done'} />
          </>
        )}
      </section>

      {/* ── Upcoming interviews ─────────────────────────────────────────── */}
      <section className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
          <div>
            <h2 className="font-semibold text-white">Upcoming interviews</h2>
            <p className="text-xs text-zinc-500 mt-0.5">Your next scheduled sessions</p>
          </div>
          <Link to="/interviews" className="inline-flex items-center gap-1 text-xs font-medium text-neon-cyan hover:underline">
            View all <ArrowRight size={13} />
          </Link>
        </div>

        {loading ? (
          <ul>
            {[1, 2, 3].map((n) => <SkeletonInterviewRow key={n} />)}
          </ul>
        ) : upcoming.length === 0 ? (
          <EmptyState role={user.role} />
        ) : (
          <ul className="divide-y divide-white/5">
            {upcoming.map((iv) => {
              const other     = user.role === 'interviewer' ? iv.candidateId : iv.interviewerId;
              const scheduled = new Date(iv.scheduledAt);
              const isToday   = scheduled.toDateString() === now.toDateString();
              return (
                <li key={iv._id} className="group flex items-center justify-between gap-4 px-6 py-4 hover:bg-ink-700/25 transition-colors">
                  <div className="flex min-w-0 items-center gap-3">
                    <Avatar name={other?.name || '?'} size={38} />
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-white text-sm">{iv.title}</p>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                        <span className="flex items-center gap-1 text-xs text-zinc-400">
                          <Clock size={10} />
                          {isToday
                            ? `Today, ${scheduled.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                            : scheduled.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ', ' +
                              scheduled.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                          }
                        </span>
                        <span className="text-zinc-600">·</span>
                        <span className="text-xs text-zinc-500">{iv.durationMinutes} min</span>
                        <span className="text-zinc-600">·</span>
                        <span className="text-xs text-zinc-400">with {other?.name}</span>
                      </div>
                    </div>
                  </div>
                  <Link to={`/prejoin/${iv.roomId}`} className="btn-secondary shrink-0 text-xs gap-1.5 opacity-80 group-hover:opacity-100">
                    Join <ArrowRight size={12} />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}

/* ── Stat card ──────────────────────────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, tone, sub }) {
  const cfg = {
    cyan:   { text: 'text-neon-cyan',   bar: 'bg-neon-cyan',   icon: 'text-neon-cyan bg-neon-cyan/10 border-neon-cyan/20' },
    violet: { text: 'text-neon-violet', bar: 'bg-neon-violet', icon: 'text-neon-violet bg-neon-violet/10 border-neon-violet/20' },
    lime:   { text: 'text-neon-lime',   bar: 'bg-neon-lime',   icon: 'text-neon-lime bg-neon-lime/10 border-neon-lime/20' },
  }[tone];

  return (
    <div className="card relative overflow-hidden p-5 hover:bg-ink-700/50 transition-colors">
      <div className={`absolute inset-y-0 left-0 w-[3px] ${cfg.bar} rounded-l-2xl`} />
      <div className="flex items-start justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">{label}</p>
        <span className={`grid h-9 w-9 place-items-center rounded-lg border ${cfg.icon}`}>
          <Icon size={16} />
        </span>
      </div>
      <p className={`mt-3 text-4xl font-extrabold tracking-tight ${cfg.text}`}>{value}</p>
      <p className="mt-1 text-xs text-zinc-600">{sub}</p>
    </div>
  );
}

/* ── Empty state ────────────────────────────────────────────────────────── */
function EmptyState({ role }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-ink-700/60 border border-white/5 text-zinc-600">
        <CalendarClock size={20} />
      </div>
      <p className="text-sm font-medium text-zinc-300">No upcoming interviews</p>
      {role === 'interviewer' ? (
        <>
          <p className="text-xs text-zinc-500 max-w-xs">Schedule your first interview to get started.</p>
          <Link to="/schedule" className="btn-primary mt-1">
            <CalendarPlus size={14} /> Schedule now
          </Link>
        </>
      ) : (
        <p className="text-xs text-zinc-500 max-w-xs">
          Once an interviewer schedules a session with you, it will appear here.
        </p>
      )}
    </div>
  );
}
