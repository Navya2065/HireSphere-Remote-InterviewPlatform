import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import ScheduleInterview from './pages/ScheduleInterview';
import InterviewList from './pages/InterviewList';
import InterviewRoom from './pages/InterviewRoom';
import ResumeUpload from './pages/ResumeUpload';
import PreJoinCheck from './pages/PreJoinCheck';
import InterviewDashboardPage from './pages/InterviewDashboardPage';

export default function App() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/schedule"
          element={
            <ProtectedRoute roles={['interviewer']}>
              <ScheduleInterview />
            </ProtectedRoute>
          }
        />
        <Route
          path="/interviews"
          element={
            <ProtectedRoute>
              <InterviewList />
            </ProtectedRoute>
          }
        />
        {/* Pre-join device check — gateway before entering the room */}
        <Route
          path="/prejoin/:roomId"
          element={
            <ProtectedRoute>
              <PreJoinCheck />
            </ProtectedRoute>
          }
        />
        <Route
          path="/room/:roomId"
          element={
            <ProtectedRoute>
              <InterviewRoom />
            </ProtectedRoute>
          }
        />
        <Route
          path="/resume"
          element={
            <ProtectedRoute>
              <ResumeUpload />
            </ProtectedRoute>
          }
        />
        <Route
          path="/pipeline"
          element={
            <ProtectedRoute roles={['interviewer']}>
              <InterviewDashboardPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}
