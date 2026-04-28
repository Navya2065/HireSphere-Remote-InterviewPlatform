import { createContext, useCallback, useContext, useState } from 'react';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';

const ToastContext = createContext(null);

let _nextId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    // Mark as leaving first (triggers exit animation), then remove
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, leaving: true } : t)));
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 320);
  }, []);

  const push = useCallback(
    (type, message, duration = 4500) => {
      const id = ++_nextId;
      setToasts((prev) => [...prev.slice(-4), { id, type, message, leaving: false }]);
      if (duration > 0) setTimeout(() => dismiss(id), duration);
      return id;
    },
    [dismiss]
  );

  const toast = {
    success: (msg, dur)       => push('success', msg, dur),
    error:   (msg, dur)       => push('error',   msg, dur ?? 6000),
    warning: (msg, dur)       => push('warning', msg, dur),
    info:    (msg, dur)       => push('info',    msg, dur),
  };

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

// ── Visuals ──────────────────────────────────────────────────────────────────

const CONFIG = {
  success: {
    icon:    CheckCircle2,
    border:  'border-neon-lime/35',
    iconCls: 'text-neon-lime',
    bar:     'bg-neon-lime',
  },
  error: {
    icon:    AlertCircle,
    border:  'border-rose-500/40',
    iconCls: 'text-rose-400',
    bar:     'bg-rose-500',
  },
  warning: {
    icon:    AlertTriangle,
    border:  'border-amber-400/35',
    iconCls: 'text-amber-400',
    bar:     'bg-amber-400',
  },
  info: {
    icon:    Info,
    border:  'border-neon-cyan/35',
    iconCls: 'text-neon-cyan',
    bar:     'bg-neon-cyan',
  },
};

function ToastContainer({ toasts, dismiss }) {
  if (!toasts.length) return null;

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed top-4 right-4 z-[9999] flex flex-col gap-2"
      style={{ maxWidth: 360 }}
    >
      {toasts.map((t) => {
        const cfg  = CONFIG[t.type] || CONFIG.info;
        const Icon = cfg.icon;

        return (
          <div
            key={t.id}
            role="alert"
            className={[
              'pointer-events-auto relative overflow-hidden',
              'flex items-start gap-3',
              'rounded-xl border bg-ink-800/95 backdrop-blur-md',
              'px-4 py-3 shadow-[0_8px_32px_-4px_rgba(0,0,0,0.6)]',
              cfg.border,
              'transition-all duration-300 ease-out',
              t.leaving
                ? 'opacity-0 translate-x-3 scale-95'
                : 'opacity-100 translate-x-0 scale-100',
            ].join(' ')}
          >
            {/* Left colour bar */}
            <div className={`absolute left-0 top-0 bottom-0 w-[3px] ${cfg.bar}`} />

            <Icon size={16} className={`shrink-0 mt-0.5 ml-1 ${cfg.iconCls}`} />

            <p className="flex-1 text-sm text-zinc-100 leading-snug pr-1">{t.message}</p>

            <button
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded p-0.5 text-zinc-500 hover:text-zinc-200 transition-colors"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
