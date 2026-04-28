import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle, Check, Video, Code2, Zap, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err?.response?.data?.message || 'Login failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-57px)]">
      {/* ── Left brand panel ─────────────────────────────────────────────── */}
      <div className="hidden lg:flex w-[45%] flex-col justify-between relative overflow-hidden border-r border-white/5 bg-ink-850/60 p-10">
        {/* Ambient blobs */}
        <div className="pointer-events-none absolute -left-24 -top-24 h-80 w-80 rounded-full bg-neon-cyan/10 blur-[90px]" />
        <div className="pointer-events-none absolute right-0 bottom-16 h-64 w-64 rounded-full bg-neon-violet/10 blur-[70px]" />

        {/* Top: logo mark */}
        <div className="relative">
          <Link to="/" className="inline-flex items-center gap-2.5 group">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-neon-cyan via-neon-violet to-neon-pink text-ink-900 shadow-neon-cyan">
              <Sparkles size={17} strokeWidth={2.5} />
            </span>
            <span className="text-xl font-bold text-white tracking-tight">
              Hire<span className="neon-text-cyan">Sphere</span>
            </span>
          </Link>
        </div>

        {/* Middle: headline + features */}
        <div className="relative space-y-7">
          <h2 className="text-3xl font-extrabold text-white leading-snug">
            The modern way to run<br />
            <span className="gradient-text">technical interviews.</span>
          </h2>

          <ul className="space-y-4">
            {[
              { icon: Video,  label: 'HD video calling, built in' },
              { icon: Code2,  label: 'Real-time collaborative code editor' },
              { icon: Zap,    label: 'AI question generator &amp; code reviewer' },
              { icon: Check,  label: 'Role-aware auth — candidate &amp; interviewer' },
            ].map(({ icon: Icon, label }) => (
              <li key={label} className="flex items-center gap-3 text-sm text-zinc-300">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-neon-cyan/10 border border-neon-cyan/25 text-neon-cyan shrink-0">
                  <Icon size={13} />
                </span>
                <span dangerouslySetInnerHTML={{ __html: label }} />
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom: footer */}
        <p className="relative text-xs text-zinc-600">© 2025 HireSphere · All rights reserved</p>
      </div>

      {/* ── Right form panel ─────────────────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm animate-slide-up">
          {/* Small logo on mobile */}
          <div className="flex items-center gap-2 mb-8 lg:hidden">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-neon-cyan via-neon-violet to-neon-pink text-ink-900">
              <Sparkles size={15} />
            </span>
            <span className="text-lg font-bold text-white">Hire<span className="neon-text-cyan">Sphere</span></span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl font-extrabold tracking-tight text-white">Welcome back</h1>
            <p className="mt-1.5 text-sm text-zinc-400">
              Sign in to your account to continue.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
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
              <div className="flex items-center justify-between mb-1">
                <label className="label !mb-0">Password</label>
              </div>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={onChange}
                required
                className="input"
                autoComplete="current-password"
                placeholder="••••••••"
              />
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
                ? <><span className="h-4 w-4 rounded-full border-2 border-ink-900/40 border-t-ink-900 animate-spin" /> Signing in…</>
                : <><LogIn size={15} /> Sign in</>
              }
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-zinc-400">
            Don't have an account?{' '}
            <Link to="/signup" className="font-semibold text-neon-cyan hover:underline">
              Create one free
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
