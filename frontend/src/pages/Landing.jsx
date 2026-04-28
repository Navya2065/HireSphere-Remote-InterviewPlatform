import { Link } from 'react-router-dom';
import {
  ArrowRight, Video, MessageSquareCode, Code2, CalendarCheck,
  ShieldCheck, Zap, Check, Globe, Users2, Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Landing() {
  const { user } = useAuth();

  return (
    <main>
      {/* ── Hero ──────────────────────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-7xl px-4 pt-20 pb-16 sm:pt-28 sm:pb-20 overflow-hidden">
        {/* Ambient blobs */}
        <div className="pointer-events-none absolute -left-60 -top-40 h-[700px] w-[700px] rounded-full bg-neon-cyan/6 blur-[130px]" />
        <div className="pointer-events-none absolute -right-60 top-10 h-[600px] w-[600px] rounded-full bg-neon-violet/6 blur-[130px]" />

        <div className="relative grid items-center gap-14 lg:grid-cols-[1fr_480px]">
          {/* Left — copy */}
          <div className="animate-slide-up">
            <div className="inline-flex items-center gap-2 rounded-full border border-neon-cyan/25 bg-neon-cyan/8 px-4 py-1.5 text-xs font-semibold text-neon-cyan mb-7 tracking-wide">
              <span className="h-1.5 w-1.5 rounded-full bg-neon-cyan animate-pulse-dot shadow-[0_0_8px_#22d3ee]" />
              Now in public beta · Free to use
            </div>

            <h1 className="text-5xl font-extrabold tracking-tight text-white leading-[1.08] sm:text-6xl lg:text-[62px]">
              Interview smarter,
              <br />
              <span className="gradient-text">hire the best.</span>
            </h1>

            <p className="mt-6 text-lg text-zinc-400 leading-relaxed max-w-lg">
              HireSphere gives your team a fully-featured interview room — HD video, live chat, real-time code collaboration, and AI assistance. All in one browser tab.
            </p>

            <div className="mt-9 flex flex-wrap gap-3">
              {user ? (
                <Link to="/dashboard" className="btn-primary px-6 py-2.5 text-sm">
                  Open Dashboard <ArrowRight size={16} />
                </Link>
              ) : (
                <>
                  <Link to="/signup" className="btn-primary px-7 py-2.5 text-sm font-semibold">
                    Get started free <ArrowRight size={16} />
                  </Link>
                  <Link to="/login" className="btn-secondary px-6 py-2.5 text-sm">
                    Sign in
                  </Link>
                </>
              )}
            </div>

            {/* Trust line */}
            <div className="mt-10 flex flex-wrap items-center gap-6 text-xs text-zinc-500">
              <span className="flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-neon-lime" /> No credit card required
              </span>
              <span className="flex items-center gap-1.5">
                <Globe size={13} className="text-neon-cyan" /> Works in any browser
              </span>
              <span className="flex items-center gap-1.5">
                <Users2 size={13} className="text-neon-violet" /> Candidate &amp; Interviewer roles
              </span>
            </div>
          </div>

          {/* Right — product visual */}
          <div className="hidden lg:block animate-slide-up" style={{ animationDelay: '0.15s' }}>
            <ProductMockup />
          </div>
        </div>
      </section>

      {/* ── Stats bar ─────────────────────────────────────────────────────── */}
      <div className="border-y border-white/5 bg-ink-850/50">
        <div className="mx-auto max-w-7xl px-4 py-7 grid grid-cols-2 gap-y-5 sm:grid-cols-4">
          {[
            { value: '8+',        label: 'Languages supported' },
            { value: 'Real-time', label: 'Code sync' },
            { value: 'AI',        label: 'Co-pilot built-in' },
            { value: '1-click',   label: 'Room join' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-2xl font-bold text-white tracking-tight">{s.value}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── Features ──────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 py-20">
        <div className="text-center mb-14">
          <p className="text-xs font-bold uppercase tracking-widest text-neon-cyan mb-3">Everything you need</p>
          <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
            Built for real technical interviews
          </h2>
          <p className="mt-3 text-zinc-400 max-w-xl mx-auto text-base">
            From scheduling to evaluation — every tool your team needs in one seamless workflow.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              icon: CalendarCheck, tone: 'cyan', num: '01',
              title: 'Smart Scheduling',
              body: 'Interviewers create slots and assign candidates instantly. A unique room is auto-generated for every session.',
            },
            {
              icon: Video, tone: 'violet', num: '02',
              title: 'HD Video Calling',
              body: 'Crystal-clear video powered by Stream SDK. Mute, camera toggle, and leave controls always at hand.',
            },
            {
              icon: MessageSquareCode, tone: 'pink', num: '03',
              title: 'Live Chat',
              body: 'In-room messaging with typing indicators and full history on rejoin. Never lose context mid-session.',
            },
            {
              icon: Code2, tone: 'lime', num: '04',
              title: 'Collaborative Editor',
              body: 'Monaco editor with real-time sync across 8 languages and one-click compilation. Zero setup.',
            },
            {
              icon: ShieldCheck, tone: 'cyan', num: '05',
              title: 'Role-aware Auth',
              body: 'JWT-based auth with candidate and interviewer roles enforced at the route level. Secure by default.',
            },
            {
              icon: Zap, tone: 'violet', num: '06',
              title: 'AI Co-pilot',
              body: 'Generate tailored questions and get live code reviews powered by Groq — visible only to the interviewer.',
            },
          ].map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </section>

      {/* ── How it works ──────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 pb-20">
        <div className="card p-8 sm:p-12 relative overflow-hidden">
          <div className="pointer-events-none absolute -right-20 -top-20 h-80 w-80 rounded-full bg-neon-violet/8 blur-[80px]" />
          <div className="pointer-events-none absolute -left-20 bottom-0 h-60 w-60 rounded-full bg-neon-cyan/8 blur-[60px]" />

          <div className="relative">
            <p className="text-xs font-bold uppercase tracking-widest text-neon-violet mb-3">How it works</p>
            <h2 className="text-3xl font-extrabold text-white mb-12">Up and running in 3 steps</h2>

            <div className="grid gap-8 sm:grid-cols-3">
              {[
                {
                  n: '01', tone: 'cyan',
                  t: 'Sign up',
                  d: 'Choose your role — candidate or interviewer. Takes under 30 seconds.',
                },
                {
                  n: '02', tone: 'violet',
                  t: 'Schedule',
                  d: 'Interviewers create a session and assign a candidate. A room link is generated automatically.',
                },
                {
                  n: '03', tone: 'pink',
                  t: 'Join & run',
                  d: 'Both parties hit Join. Talk over video, message in real time, and code together — all at once.',
                },
              ].map((s) => {
                const colors = {
                  cyan:   'bg-neon-cyan/10 text-neon-cyan border-neon-cyan/30',
                  violet: 'bg-neon-violet/10 text-neon-violet border-neon-violet/30',
                  pink:   'bg-neon-pink/10 text-neon-pink border-neon-pink/30',
                }[s.tone];
                return (
                  <div key={s.n} className="flex gap-4">
                    <div className={`shrink-0 grid h-11 w-11 place-items-center rounded-xl font-mono text-sm font-bold border ${colors}`}>
                      {s.n}
                    </div>
                    <div>
                      <h3 className="font-semibold text-white text-base">{s.t}</h3>
                      <p className="mt-1.5 text-sm text-zinc-400 leading-relaxed">{s.d}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ── Bottom CTA ────────────────────────────────────────────────────── */}
      {!user && (
        <section className="mx-auto max-w-7xl px-4 pb-24">
          <div className="relative overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-br from-neon-cyan/8 via-ink-800/60 to-neon-violet/8 p-10 sm:p-16 text-center">
            <div className="pointer-events-none absolute inset-0 opacity-20"
              style={{
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
                backgroundSize: '44px 44px',
              }}
            />
            <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 h-px w-3/4 bg-gradient-to-r from-transparent via-neon-cyan/50 to-transparent" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-zinc-300 mb-5">
                <Sparkles size={11} className="text-neon-cyan" /> Free forever for small teams
              </div>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white">
                Ready to run better interviews?
              </h2>
              <p className="mt-3 text-zinc-400 max-w-md mx-auto">
                No credit card. No setup fees. Up and running in minutes.
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                <Link to="/signup" className="btn-primary px-8 py-3 text-sm font-semibold">
                  Create free account <ArrowRight size={16} />
                </Link>
                <Link to="/login" className="btn-secondary px-7 py-3 text-sm">
                  Sign in instead
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}

/* ── Product mockup (CSS-only) ────────────────────────────────────────────── */
function ProductMockup() {
  return (
    <div className="relative">
      {/* Glow behind */}
      <div className="absolute inset-0 translate-y-4 scale-95 bg-gradient-to-br from-neon-cyan/20 via-neon-violet/15 to-neon-pink/20 blur-3xl rounded-3xl" />

      {/* App window */}
      <div className="relative rounded-2xl border border-white/10 bg-ink-800/95 shadow-[0_32px_64px_-12px_rgba(0,0,0,0.85)] overflow-hidden">
        {/* Window chrome */}
        <div className="flex items-center gap-2 border-b border-white/5 bg-ink-900/90 px-4 py-3">
          <span className="h-3 w-3 rounded-full bg-rose-500/70" />
          <span className="h-3 w-3 rounded-full bg-amber-400/70" />
          <span className="h-3 w-3 rounded-full bg-neon-lime/70" />
          <span className="ml-3 flex-1 rounded-md bg-ink-700/60 px-3 py-0.5 text-[11px] text-zinc-500 font-mono">
            hiresphere.io/room/abc-4f2e
          </span>
        </div>

        {/* Room header mock */}
        <div className="flex items-center justify-between border-b border-white/5 bg-ink-850/60 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-gradient-to-br from-neon-cyan to-neon-violet flex items-center justify-center text-[10px] font-bold text-ink-900">AK</div>
            <div>
              <p className="text-[11px] font-semibold text-white">Frontend Engineer Round</p>
              <p className="text-[9px] text-zinc-500">With Aryan Kumar · Room abc-4f2e</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-neon-lime/10 border border-neon-lime/30 px-2 py-0.5 text-[9px] font-medium text-neon-lime">
              <span className="h-1 w-1 rounded-full bg-neon-lime animate-pulse" />Live
            </span>
            <span className="rounded-md border border-white/10 bg-ink-800 px-2 py-0.5 font-mono text-[10px] text-neon-cyan">12:34</span>
          </div>
        </div>

        {/* Main area */}
        <div className="grid grid-cols-[1fr_148px]" style={{ height: 240 }}>
          {/* Code editor mock */}
          <div className="border-r border-white/5 p-3 overflow-hidden">
            <div className="font-mono text-[10px] space-y-1.5">
              <div className="flex items-center gap-2 mb-2">
                <span className="rounded bg-ink-700/60 px-2 py-0.5 text-[9px] text-neon-lime border border-neon-lime/20">JavaScript</span>
                <span className="text-zinc-600">fibonacci.js</span>
              </div>
              <div><span className="text-neon-violet">function</span> <span className="text-neon-cyan">fib</span><span className="text-zinc-300">(n) {'{'}</span></div>
              <div className="pl-3"><span className="text-neon-violet">if</span> <span className="text-zinc-300">(n &lt;= 1)</span></div>
              <div className="pl-6"><span className="text-neon-violet">return</span> <span className="text-neon-amber">n</span><span className="text-zinc-300">;</span></div>
              <div className="pl-3"><span className="text-neon-violet">return</span> <span className="text-neon-cyan">fib</span><span className="text-zinc-300">(n‑1)</span></div>
              <div className="pl-5"><span className="text-zinc-300">+ </span><span className="text-neon-cyan">fib</span><span className="text-zinc-300">(n‑2);</span></div>
              <div className="text-zinc-300">{'}'}</div>
              <div className="mt-2 rounded bg-ink-900/80 px-2 py-1.5 border border-neon-lime/20">
                <span className="text-zinc-500 text-[9px]">Output</span>
                <p className="text-neon-lime">→ 55</p>
              </div>
            </div>
          </div>

          {/* Chat mock */}
          <div className="flex flex-col p-2.5 gap-2 overflow-hidden">
            <p className="text-[9px] font-semibold uppercase tracking-wider text-zinc-500">Chat</p>
            <div className="rounded-xl bg-ink-700/60 px-2.5 py-2 text-[10px] text-zinc-300 border border-white/5">
              <p className="text-[8px] text-zinc-500 mb-0.5">Interviewer</p>
              Walk me through your approach.
            </div>
            <div className="rounded-xl bg-neon-cyan/85 px-2.5 py-2 text-[10px] text-ink-900 ml-2">
              Sure! Recursive with base cases...
            </div>
            <div className="rounded-xl bg-ink-700/60 px-2.5 py-2 text-[10px] text-zinc-300 border border-white/5">
              <p className="text-[8px] text-zinc-500 mb-0.5">Interviewer</p>
              Time complexity?
            </div>
          </div>
        </div>

        {/* AI badge overlay */}
        <div className="absolute bottom-3 left-3 flex items-center gap-1.5 rounded-full border border-neon-violet/35 bg-ink-900/90 px-2.5 py-1 text-[9px] font-semibold text-neon-violet backdrop-blur-sm">
          <Sparkles size={9} />
          AI Co-pilot active
        </div>
      </div>
    </div>
  );
}

/* ── Feature card ─────────────────────────────────────────────────────────── */
function FeatureCard({ icon: Icon, tone, num, title, body }) {
  const toneMap = {
    cyan:   { icon: 'text-neon-cyan bg-neon-cyan/10 border-neon-cyan/25',   num: 'text-neon-cyan/30' },
    violet: { icon: 'text-neon-violet bg-neon-violet/10 border-neon-violet/25', num: 'text-neon-violet/30' },
    pink:   { icon: 'text-neon-pink bg-neon-pink/10 border-neon-pink/25',   num: 'text-neon-pink/30' },
    lime:   { icon: 'text-neon-lime bg-neon-lime/10 border-neon-lime/25',   num: 'text-neon-lime/30' },
  }[tone];

  return (
    <div className="card group p-6 transition-all duration-200 hover:-translate-y-1 hover:bg-ink-700/70 hover:border-white/10 cursor-default">
      <div className="flex items-start justify-between mb-4">
        <div className={`grid h-11 w-11 place-items-center rounded-xl border ${toneMap.icon}`}>
          <Icon size={19} />
        </div>
        <span className={`font-mono text-3xl font-extrabold ${toneMap.num} select-none leading-none`}>{num}</span>
      </div>
      <h3 className="text-base font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-zinc-400">{body}</p>
    </div>
  );
}
