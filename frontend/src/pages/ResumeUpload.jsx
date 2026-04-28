import { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, UploadCloud, AlertTriangle, Loader2, FileUp, ExternalLink, Trash2, CheckCircle2 } from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Skeleton } from '../components/Skeleton';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ResumeUpload() {
  const { user }   = useAuth();
  const { toast }  = useToast();
  const isCandidate = user?.role === 'candidate';

  const [resumes,      setResumes]      = useState([]);
  const [listLoading,  setListLoading]  = useState(true);
  const [dragging,     setDragging]     = useState(false);
  const [uploading,    setUploading]    = useState(false);
  const [deleting,     setDeleting]     = useState(null); // id being deleted
  const [inlineError,  setInlineError]  = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!isCandidate) return;
    api
      .get('/resumes/my')
      .then((r) => setResumes(r.data.resumes))
      .catch(() => toast.error('Could not load your resumes.'))
      .finally(() => setListLoading(false));
  }, [isCandidate]); // eslint-disable-line

  const handleFile = useCallback(async (file) => {
    if (!file) return;

    // Validate
    if (file.type !== 'application/pdf') {
      const msg = 'Only PDF files are accepted.';
      setInlineError(msg);
      toast.error(msg);
      return;
    }
    if (file.size > 15 * 1024 * 1024) {
      const msg = 'File is too large — maximum size is 15 MB.';
      setInlineError(msg);
      toast.error(msg);
      return;
    }

    setInlineError('');
    setUploading(true);
    try {
      const base64     = await fileToBase64(file);
      const { data }   = await api.post('/resumes/upload', { name: file.name, base64 });
      setResumes((prev) => [data.resume, ...prev]);
      toast.success(`"${file.name}" uploaded successfully.`);
    } catch (e) {
      const msg = e?.response?.data?.message || 'Upload failed. Please try again.';
      setInlineError(msg);
      toast.error(msg);
    } finally {
      setUploading(false);
      // Reset file input so the same file can be re-uploaded if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, [toast]);

  const openResume = (id) => {
    const token = localStorage.getItem('rip_token');
    window.open(`${API_BASE}/resumes/${id}/file?token=${token}`, '_blank');
  };

  const deleteResume = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setDeleting(id);
    try {
      await api.delete(`/resumes/${id}`);
      setResumes((prev) => prev.filter((r) => r._id !== id));
      toast.success('Resume deleted.');
    } catch (e) {
      const msg = e?.response?.data?.message || 'Delete failed. Please try again.';
      toast.error(msg);
    } finally {
      setDeleting(null);
    }
  };

  /* ── Not a candidate ──────────────────────────────────────────────────── */
  if (!isCandidate) {
    return (
      <main className="mx-auto max-w-4xl px-4 py-20 text-center">
        <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-ink-700 text-neon-violet shadow-neon-violet">
          <FileText size={24} />
        </div>
        <h1 className="text-2xl font-bold text-white">Resume Viewer</h1>
        <p className="mt-2 text-zinc-400">Open a candidate's profile from the interviews page to view their resume.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-10 animate-fade-in">
      <header className="mb-8">
        <p className="flex items-center gap-1.5 text-xs text-zinc-500 mb-1">
          <FileUp size={12} /> Resume
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight text-white">
          My <span className="neon-text-cyan">Resume</span>
        </h1>
        <p className="text-sm text-zinc-500 mt-1">Upload your PDF so interviewers can review it during sessions.</p>
      </header>

      {/* ── Drop zone ────────────────────────────────────────────────────── */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files?.[0]); }}
        onClick={() => !uploading && fileInputRef.current?.click()}
        className={[
          'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl',
          'border-2 border-dashed px-6 py-14 text-center transition-all duration-200',
          uploading ? 'pointer-events-none opacity-70' : '',
          dragging
            ? 'border-neon-cyan bg-neon-cyan/6 shadow-neon-cyan scale-[1.01]'
            : 'border-white/10 bg-ink-800 hover:border-neon-cyan/40 hover:bg-ink-700/50',
        ].join(' ')}
      >
        {uploading ? (
          <>
            <Loader2 size={32} className="animate-spin text-neon-cyan" />
            <p className="text-sm text-zinc-300 font-medium">Uploading your resume…</p>
            <p className="text-xs text-zinc-500">Please wait</p>
          </>
        ) : (
          <>
            <div className={`grid h-14 w-14 place-items-center rounded-2xl transition-colors ${
              dragging ? 'bg-neon-cyan/20 text-neon-cyan' : 'bg-ink-900 text-neon-cyan shadow-neon-cyan'
            }`}>
              <UploadCloud size={24} />
            </div>
            <div>
              <p className="font-semibold text-zinc-200">
                {dragging ? 'Drop it here!' : 'Drop your PDF here'}
              </p>
              <p className="mt-0.5 text-xs text-zinc-500">or click to browse · PDF only · max 15 MB</p>
            </div>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="sr-only"
          onChange={(e) => handleFile(e.target.files?.[0])}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* Inline error */}
      {inlineError && (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/6 px-4 py-3 text-sm text-rose-300">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" />
          <span>{inlineError}</span>
        </div>
      )}

      {/* ── Uploaded resumes ─────────────────────────────────────────────── */}
      <div className="mt-6">
        {listLoading ? (
          <div className="card overflow-hidden">
            <div className="border-b border-white/5 px-5 py-3">
              <div className="skeleton h-3 w-32 rounded" />
            </div>
            {[1, 2].map((n) => (
              <div key={n} className="flex items-center gap-3 px-5 py-4 border-b border-white/5 last:border-0">
                <div className="skeleton h-9 w-9 rounded-xl shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="skeleton h-4 w-48 rounded" />
                  <div className="skeleton h-3 w-32 rounded" />
                </div>
                <div className="skeleton h-7 w-14 rounded-lg" />
              </div>
            ))}
          </div>
        ) : resumes.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-white/5 bg-ink-800/40 py-10 text-center">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-ink-700 text-zinc-600">
              <FileText size={18} />
            </div>
            <p className="text-sm font-medium text-zinc-400">No resumes uploaded yet</p>
            <p className="text-xs text-zinc-600">Your uploaded PDFs will appear here</p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/5 px-5 py-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Uploaded resumes
              </p>
              <span className="pill-cyan text-[10px]">{resumes.length}</span>
            </div>
            <ul className="divide-y divide-white/5">
              {resumes.map((r) => (
                <li key={r._id} className="flex items-center gap-3 px-5 py-4 hover:bg-ink-700/20 transition-colors">
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
                    title="Open PDF in new tab"
                  >
                    <ExternalLink size={14} /> Open
                  </button>
                  <button
                    onClick={() => deleteResume(r._id, r.originalName)}
                    disabled={deleting === r._id}
                    className="btn-ghost !text-rose-400 hover:!text-rose-300 gap-1.5 text-xs shrink-0 disabled:opacity-40"
                    title="Delete resume"
                  >
                    {deleting === r._id
                      ? <Loader2 size={14} className="animate-spin" />
                      : <Trash2 size={14} />
                    }
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </main>
  );
}
