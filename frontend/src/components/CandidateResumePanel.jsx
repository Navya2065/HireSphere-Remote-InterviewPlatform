/**
 * CandidateResumePanel — shown in the interviewer's sidebar and resume drawer.
 * Lists the candidate's uploaded resumes with an option to open each PDF.
 */

import { useEffect, useState } from 'react';
import { FileText, Loader2, ExternalLink } from 'lucide-react';
import api from '../api/axios';

const API_BASE = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api`;

export default function CandidateResumePanel({ candidateId }) {
  const [resumes, setResumes] = useState(null); // null = loading

  useEffect(() => {
    if (!candidateId) return;
    api.get(`/resumes/candidate/${candidateId}`)
      .then(({ data }) => setResumes(data.resumes))
      .catch(() => setResumes([]));
  }, [candidateId]);

  const openResume = (id) => {
    const token = localStorage.getItem('rip_token');
    window.open(`${API_BASE}/resumes/${id}/file?token=${token}`, '_blank');
  };

  if (resumes === null) {
    return (
      <div className="flex flex-1 items-center justify-center gap-2 text-zinc-500 text-sm">
        <Loader2 size={16} className="animate-spin" /> Loading…
      </div>
    );
  }

  if (resumes.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center text-zinc-500">
        <FileText size={28} className="text-zinc-600" />
        <p className="text-sm">Candidate hasn't uploaded a resume yet.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 min-h-0 flex-col overflow-hidden">
      <ul className="divide-y divide-white/5">
        {resumes.map((r) => (
          <li key={r._id} className="flex items-center gap-3 px-4 py-4">
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-ink-900 text-neon-cyan">
              <FileText size={16} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-zinc-200">{r.originalName}</p>
              <p className="text-xs text-zinc-500">{new Date(r.createdAt).toLocaleString()}</p>
            </div>
            <button
              onClick={() => openResume(r._id)}
              className="btn-ghost !text-neon-cyan gap-1.5 text-xs shrink-0"
              title="Open PDF"
            >
              <ExternalLink size={14} /> Open
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
