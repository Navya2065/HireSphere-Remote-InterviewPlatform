import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, AlertCircle, Users, UserCog, Sparkles, CalendarCheck, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'candidate' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signup(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || 'Signup failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-57px)]">
      {/* ── Left brand panel ─────────────────────────────────────────────── */}
      <div className="hidden lg:flex w-[45%] flex-col justify-between relative overflow-hidden border-r border-white/5 bg-ink-850/60 p-10">
        <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-neon-violet/10 blur-[90px]" />
        <div className="pointer-events-none absolute right-0 bottom-16 h-64 w-64 rounded-full bg-neon-pink/10 blur-[70px]" />

        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-2.5">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-neon-cyan via-neon-violet to-neon-pink text-ink-900 shadow-neon-violet">
              <Sparkles size={17} strokeWidth={2.5} />
            </span>
            <span className="text-xl font-bold text-white tracking-tight">
              Hire<span className="neon-text-cyan">Sphere</span>
            </span>
          </Link>
        </div>

        <div className="relative space-y-7">
          <h2 className="text-3xl font-extrabold text-white leading-snug">
            Join thousands of teams<br />
            <span className="gradient-text">hiring with confidence.</span>
          </h2>

          <ul className="space-y-5">
            {[
              {
                icon: CalendarCheck,
                title: 'Schedule in seconds',
                desc: 'Create interview slots and assign candidates instantly.',
              },
              {
                icon: UserCog,
                title: 'Interviewer tools',
                desc: 'Rubric scoring, AI co-pilot, and live code review.',
              },
              {
                icon: ShieldCheck,
                title: 'Free to get started',
                desc: 'No credit card required. Upgrade anytime.',
              },
            ].map(({ icon: Icon, title, desc }) => (
              <li key={title} className="flex items-start gap-3">
                <span className="grid h-8 w-8 place-items-center rounded-lg bg-neon-violet/10 border border-neon-violet/25 text-neon-violet shrink-0 mt-0.5">
                  <Icon size={14} />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">{title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs text-zinc-600">© 2025 HireSphere · All rights reserved</p>
      </div>

      {/* ── Right form panel ─────────────────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-slide-up">
          {/* Mobile logo */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-neon-cyan via-neon-violet to-neon-pink text-ink-900">
              <Sparkles size={15} />
            </span>
            <span className="text-lg font-bold text-white">Hire<span className="neon-text-cyan">Sphere</span></span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-extrabold tracking-tight text-white">Create your account</h1>
            <p className="mt-1.5 text-sm text-zinc-400">
              Pick your role to get started in seconds.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label className="label">Full name</label>
              <input
                name="name"
                value={form.name}
                onChange={onChange}
                required
                className="input"
                autoComplete="name"
                placeholder="Ada Lovelace"
              />
            </div>

            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={onChange}
                required
                className="input"
                autoComplete="email"
                placeholder="you@company.com"
              />
            </div>

            <div>
              <label className="label">Password</label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={onChange}
                required
                minLength={6}
                className="input"
                autoComplete="new-password"
                placeholder="At least 6 characters"
              />
            </div>

            <div>
              <label className="label">I am a</label>
              <div className="grid grid-cols-2 gap-3">
                <RoleCard
                  active={form.role === 'candidate'}
                  onClick={() => setForm({ ...form, role: 'candidate' })}
                  icon={Users}
                  label="Candidate"
                  desc="Looking for a role"
                  tone="cyan"
                />
                <RoleCard
                  active={form.role === 'interviewer'}
                  onClick={() => setForm({ ...form, role: 'interviewer' })}
                  icon={UserCog}
                  label="Interviewer"
                  desc="Hiring for a team"
                  tone="violet"
                />
              </div>
            </div>

            {error && (
              <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/8 px-3 py-2.5 text-sm text-rose-300">
                <AlertCircle size={15} className="mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              disabled={submitting}
              className="btn-primary w-full py-2.5 text-sm font-semibold"
            >
              {submitting
                ? <><span className="h-4 w-4 rounded-full border-2 border-ink-900/40 border-t-ink-900 animate-spin" /> Creating account…</>
                : <><UserPlus size={15} /> Create account</>
              }
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-zinc-400">
            Already have an account?{' '}
            <Link to="/login" className="font-semibold text-neon-cyan hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function RoleCard({ active, onClick, icon: Icon, label, desc, tone }) {
  const activeStyles = tone === 'cyan'
    ? 'border-neon-cyan bg-neon-cyan/8 text-neon-cyan shadow-[0_0_0_1px_rgba(34,211,238,0.3)]'
    : 'border-neon-violet bg-neon-violet/8 text-neon-violet shadow-[0_0_0_1px_rgba(167,139,250,0.3)]';
  const iconActive = tone === 'cyan' ? 'text-neon-cyan' : 'text-neon-violet';

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-1.5 rounded-xl border p-3.5 text-left transition-all duration-150 ${
        active
          ? activeStyles
          : 'border-ink-500 bg-ink-800/50 text-zinc-300 hover:border-ink-400 hover:bg-ink-700/50'
      }`}
    >
      <Icon size={17} className={active ? iconActive : 'text-zinc-400'} />
      <div>
        <p className="text-sm font-semibold leading-none">{label}</p>
        <p className={`text-[11px] mt-1 ${active ? 'opacity-70' : 'text-zinc-500'}`}>{desc}</p>
      </div>
    </button>
  );
}
