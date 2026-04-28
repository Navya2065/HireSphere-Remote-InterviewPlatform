import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex h-[70vh] items-center justify-center gap-2 text-zinc-500">
        <span className="h-2 w-2 animate-pulse-dot rounded-full bg-neon-cyan shadow-[0_0_10px_currentColor]" />
        <span className="h-2 w-2 animate-pulse-dot rounded-full bg-neon-violet shadow-[0_0_10px_currentColor]" style={{ animationDelay: '.2s' }} />
        <span className="h-2 w-2 animate-pulse-dot rounded-full bg-neon-pink shadow-[0_0_10px_currentColor]" style={{ animationDelay: '.4s' }} />
      </div>
    );
  }
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
}
