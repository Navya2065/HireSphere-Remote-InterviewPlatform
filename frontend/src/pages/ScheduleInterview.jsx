import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CalendarPlus, AlertCircle, Users, Loader2 } from 'lucide-react';
import api from '../api/axios';
import { useToast } from '../context/ToastContext';
import { SkeletonSelect } from '../components/Skeleton';

export default function ScheduleInterview() {
  const navigate     = useNavigate();
  const { toast }    = useToast();

  const [candidates,      setCandidates]      = useState([]);
  const [candidatesLoading, setCandidatesLoading] = useState(true);
  const [form,            setForm]            = useState({
    title: '',
    candidateId: '',
    scheduledAt: '',
    durationMinutes: 45,
  });
  const [error,      setError]      = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get('/auth/candidates')
      .then((r) => setCandidates(r.data.candidates))
      .catch(() => toast.error('Could not load candidates list.'))
      .finally(() => setCandidatesLoading(false));
  }, []); // eslint-disable-line

  const onChange = (e) =>
    setForm({
      ...form,
      [e.target.name]: e.target.type === 'number' ? Number(e.target.value) : e.target.value,
    });

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (!form.title.trim()) {
      setError('Please enter an interview title.');
      return;
    }
    if (!form.candidateId) {
      setError('Please select a candidate.');
      return;
    }
    if (!form.scheduledAt) {
      setError('Please pick a date and time.');
      return;
    }
    if (new Date(form.scheduledAt) < new Date()) {
      setError('Scheduled time must be in the future.');
      return;
    }

    setSubmitting(true);
    try {
      await api.post('/interviews', form);
      toast.success('Interview scheduled successfully!');
      navigate('/interviews');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to schedule. Please try again.';
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <header>
        <p className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1">
          <CalendarPlus size={12} /> Scheduling
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Schedule an interview</h1>
        <p className="text-sm text-zinc-500 mt-1">Pick a candidate and a time slot.</p>
      </header>

      <form onSubmit={onSubmit} className="mt-6 card p-6 space-y-5 animate-fade-in">

        {/* Title */}
        <div>
          <label className="label">Interview title</label>
          <input
            name="title"
            value={form.title}
            onChange={onChange}
            required
            disabled={submitting}
            placeholder="e.g., Frontend Engineer — Round 1"
            className="input disabled:opacity-50 disabled:cursor-not-allowed"
          />
        </div>

        {/* Candidate select */}
        <div>
          <label className="label flex items-center gap-1.5">
            <Users size={12} /> Candidate
          </label>
          {candidatesLoading ? (
            <SkeletonSelect />
          ) : candidates.length === 0 ? (
            <div className="flex items-start gap-2 rounded-lg border border-amber-400/25 bg-amber-400/8 px-3 py-2.5 text-sm text-amber-300">
              <AlertCircle size={15} className="mt-0.5 shrink-0" />
              <span>No candidates registered yet. Ask them to sign up first.</span>
            </div>
          ) : (
            <select
              name="candidateId"
              value={form.candidateId}
              onChange={onChange}
              required
              disabled={submitting}
              className="input disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <option value="" disabled>Select a candidate…</option>
              {candidates.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.name} ({c.email})
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Date/time + duration */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Date &amp; time</label>
            <input
              type="datetime-local"
              name="scheduledAt"
              value={form.scheduledAt}
              onChange={onChange}
              required
              disabled={submitting}
              className="input disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
          <div>
            <label className="label">Duration (minutes)</label>
            <input
              type="number"
              name="durationMinutes"
              value={form.durationMinutes}
              onChange={onChange}
              min={5}
              max={240}
              disabled={submitting}
              className="input disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Inline error */}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/8 px-3 py-2.5 text-sm text-rose-300">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={submitting || candidatesLoading || candidates.length === 0}
          className="btn-primary w-full py-2.5 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? (
            <>
              <Loader2 size={15} className="animate-spin" />
              Scheduling…
            </>
          ) : (
            <>
              <CalendarPlus size={15} /> Schedule interview
            </>
          )}
        </button>
      </form>
    </main>
  );
}
