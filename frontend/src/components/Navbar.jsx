import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, CalendarPlus, LayoutDashboard, ListChecks, Sparkles, FileText, BarChart2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const onLogout = () => {
    logout();
    navigate('/login');
  };

  const linkClass = ({ isActive }) =>
    `inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-all duration-150 ${
      isActive
        ? 'bg-neon-cyan/10 text-neon-cyan shadow-[inset_0_0_0_1px_rgba(34,211,238,0.3)]'
        : 'text-zinc-400 hover:bg-ink-700/60 hover:text-zinc-100'
    }`;

  return (
    <nav className="sticky top-0 z-40 border-b border-white/5 bg-ink-900/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 h-14">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group shrink-0">
          <span className="relative grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-neon-cyan via-neon-violet to-neon-pink text-ink-900 shadow-[0_0_14px_-3px_rgba(34,211,238,0.5)] transition-shadow group-hover:shadow-neon-cyan">
            <Sparkles size={15} strokeWidth={2.75} />
          </span>
          <span className="text-base font-bold tracking-tight text-white">
            Hire<span className="neon-text-cyan">Sphere</span>
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-0.5">
          {user ? (
            <>
              <NavLink to="/dashboard" className={linkClass}>
                <LayoutDashboard size={14} /> Dashboard
              </NavLink>
              {user.role === 'interviewer' && (
                <>
                  <NavLink to="/schedule" className={linkClass}>
                    <CalendarPlus size={14} /> Schedule
                  </NavLink>
                  <NavLink to="/pipeline" className={linkClass}>
                    <BarChart2 size={14} /> Pipeline
                  </NavLink>
                </>
              )}
              <NavLink to="/interviews" className={linkClass}>
                <ListChecks size={14} /> Interviews
              </NavLink>
              {user.role === 'candidate' && (
                <NavLink to="/resume" className={linkClass}>
                  <FileText size={14} /> Resume
                </NavLink>
              )}

              {/* Divider */}
              <div className="mx-2 h-5 w-px bg-white/8" />

              {/* User chip */}
              <div className="flex items-center gap-2 rounded-full border border-white/8 bg-ink-700/50 py-1 pl-1 pr-3">
                <Avatar name={user.name} size={24} />
                <span className="text-xs font-medium text-zinc-200 max-w-[90px] truncate">{user.name}</span>
                <span className="pill-violet text-[10px]">{user.role}</span>
              </div>

              <button
                onClick={onLogout}
                className="ml-1 btn-ghost !p-2 text-zinc-500 hover:text-rose-300"
                title="Log out"
              >
                <LogOut size={15} />
                <span className="sr-only">Log out</span>
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn-ghost text-sm">
                Sign in
              </Link>
              <Link to="/signup" className="btn-primary text-sm ml-1">
                Get started
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

/* Initial-circle avatar with deterministic neon gradient */
export function Avatar({ name = '?', size = 32 }) {
  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');

  const palette = [
    'from-neon-cyan to-neon-violet',
    'from-neon-violet to-neon-pink',
    'from-neon-lime to-neon-cyan',
    'from-neon-pink to-neon-amber',
    'from-neon-cyan to-neon-pink',
  ];
  const idx = [...name].reduce((a, c) => a + c.charCodeAt(0), 0) % palette.length;

  return (
    <span
      className={`grid place-items-center rounded-full bg-gradient-to-br ${palette[idx]} font-bold text-ink-900 shrink-0`}
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials || '?'}
    </span>
  );
}
