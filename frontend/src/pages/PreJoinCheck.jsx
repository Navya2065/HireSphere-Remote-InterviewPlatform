/**
 * PreJoinCheck — device check room before entering an interview.
 *
 * Flow:
 *   /prejoin/:roomId  →  user checks camera/mic  →  /room/:roomId
 *
 * Uses only native browser APIs (getUserMedia, enumerateDevices, AudioContext)
 * — no extra dependencies needed.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Video, VideoOff, Mic, MicOff, ArrowRight,
  AlertTriangle, Loader2, CheckCircle2, Settings,
  Calendar, Clock, User,
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/Navbar';

// ─── localStorage helpers ────────────────────────────────────────────────────
const STORAGE = {
  get: (k, fallback = '') => { try { return localStorage.getItem(k) || fallback; } catch { return fallback; } },
  set: (k, v) => { try { localStorage.setItem(k, v); } catch {} },
};
const CAM_KEY = 'hs_pj_camera';
const MIC_KEY = 'hs_pj_mic';

// ─── helpers ─────────────────────────────────────────────────────────────────

/**
 * Returns an object with { video, audio } constraints given device IDs.
 * Passing undefined means "use default".
 */
function buildConstraints(cameraId, micId, camEnabled, micEnabled) {
  return {
    video: camEnabled
      ? (cameraId ? { deviceId: { ideal: cameraId }, width: { ideal: 1280 }, height: { ideal: 720 } } : true)
      : false,
    audio: micEnabled
      ? (micId  ? { deviceId: { ideal: micId  }, echoCancellation: true, noiseSuppression: true } : true)
      : false,
  };
}

/** Stop all tracks on a MediaStream. */
function releaseStream(stream) {
  if (!stream) return;
  stream.getTracks().forEach((t) => t.stop());
}

// ─── main component ───────────────────────────────────────────────────────────

export default function PreJoinCheck() {
  const { roomId }  = useParams();
  const { user }    = useAuth();
  const navigate    = useNavigate();

  // Interview metadata
  const [interview, setInterview] = useState(null);
  const [metaError, setMetaError] = useState('');

  // Device state
  const [cameras,  setCameras]  = useState([]);
  const [mics,     setMics]     = useState([]);
  const [camId,    setCamId]    = useState(() => STORAGE.get(CAM_KEY));
  const [micId,    setMicId]    = useState(() => STORAGE.get(MIC_KEY));
  const [camOn,    setCamOn]    = useState(true);
  const [micOn,    setMicOn]    = useState(true);

  // Stream / preview state
  const [stream,      setStream]      = useState(null);
  const [permError,   setPermError]   = useState(''); // permission denied message
  const [streamLoading, setStreamLoading] = useState(true);

  // Mic level (0–100)
  const [micLevel, setMicLevel] = useState(0);

  // Refs
  const videoRef        = useRef(null);
  const streamRef       = useRef(null);     // always current stream
  const analyserRef     = useRef(null);
  const rafRef          = useRef(null);
  const audioCtxRef     = useRef(null);
  const sourceNodeRef   = useRef(null);

  // ── Fetch interview metadata ────────────────────────────────────────────────
  useEffect(() => {
    api.get(`/interviews/room/${roomId}`)
      .then((r) => setInterview(r.data.interview))
      .catch((e) => setMetaError(e?.response?.data?.message || 'Could not load interview details'));
  }, [roomId]);

  // ── Enumerate devices ───────────────────────────────────────────────────────
  const refreshDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const cams = devices.filter((d) => d.kind === 'videoinput');
      const mics = devices.filter((d) => d.kind === 'audioinput');
      setCameras(cams);
      setMics(mics);

      // If saved device no longer exists, clear it
      if (camId && !cams.find((d) => d.deviceId === camId)) setCamId('');
      if (micId && !mics.find((d) => d.deviceId === micId)) setMicId('');
    } catch {}
  }, [camId, micId]);

  // ── Start / restart the preview stream ─────────────────────────────────────
  const startStream = useCallback(async (newCamId, newMicId, newCamOn, newMicOn) => {
    setStreamLoading(true);
    setPermError('');

    // Clean up existing stream
    releaseStream(streamRef.current);
    stopMicAnalyser();

    // No media requested at all
    if (!newCamOn && !newMicOn) {
      streamRef.current = null;
      setStream(null);
      if (videoRef.current) videoRef.current.srcObject = null;
      setMicLevel(0);
      setStreamLoading(false);
      return;
    }

    try {
      const constraints = buildConstraints(newCamId, newMicId, newCamOn, newMicOn);
      const s = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = s;
      setStream(s);

      // Attach video
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        videoRef.current.play().catch(() => {});
      }

      // Enumerate AFTER permission granted (labels are only available then)
      await refreshDevices();

      // Start mic analyser
      if (newMicOn) startMicAnalyser(s);

      setStreamLoading(false);
    } catch (err) {
      streamRef.current = null;
      setStream(null);
      setStreamLoading(false);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setPermError('Camera/microphone access was denied. Please allow access in your browser and refresh.');
      } else if (err.name === 'NotFoundError') {
        setPermError('No camera or microphone found. Please connect a device and try again.');
      } else if (err.name === 'NotReadableError') {
        setPermError('Your camera or microphone is in use by another app. Close it and try again.');
      } else {
        setPermError(`Could not access devices: ${err.message}`);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshDevices]);

  // ── Mic level analyser ──────────────────────────────────────────────────────
  const stopMicAnalyser = () => {
    cancelAnimationFrame(rafRef.current);
    try { sourceNodeRef.current?.disconnect(); } catch {}
    try { audioCtxRef.current?.close(); } catch {}
    analyserRef.current  = null;
    sourceNodeRef.current = null;
    audioCtxRef.current  = null;
    setMicLevel(0);
  };

  const startMicAnalyser = (s) => {
    try {
      const audioTracks = s.getAudioTracks();
      if (!audioTracks.length) return;

      const ctx      = new (window.AudioContext || window.webkitAudioContext)();
      const source   = ctx.createMediaStreamSource(s);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.7;
      source.connect(analyser);

      audioCtxRef.current  = ctx;
      sourceNodeRef.current = source;
      analyserRef.current  = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const tick = () => {
        analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        setMicLevel(Math.min(100, Math.round((avg / 128) * 100 * 2.5)));
        rafRef.current = requestAnimationFrame(tick);
      };
      rafRef.current = requestAnimationFrame(tick);
    } catch {}
  };

  // ── Initial stream on mount ─────────────────────────────────────────────────
  useEffect(() => {
    startStream(camId, micId, true, true);
    return () => {
      releaseStream(streamRef.current);
      stopMicAnalyser();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Device / toggle changes ─────────────────────────────────────────────────
  const handleCamChange = (newId) => {
    setCamId(newId);
    STORAGE.set(CAM_KEY, newId);
    startStream(newId, micId, camOn, micOn);
  };

  const handleMicChange = (newId) => {
    setMicId(newId);
    STORAGE.set(MIC_KEY, newId);
    startStream(camId, newId, camOn, micOn);
  };

  const handleToggleCam = () => {
    const next = !camOn;
    setCamOn(next);
    if (!next) {
      // Just stop video tracks — keep audio stream alive
      streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = false));
    } else {
      const vt = streamRef.current?.getVideoTracks();
      if (vt?.length) {
        vt.forEach((t) => (t.enabled = true));
      } else {
        startStream(camId, micId, true, micOn);
      }
    }
  };

  const handleToggleMic = () => {
    const next = !micOn;
    setMicOn(next);
    if (!next) {
      stopMicAnalyser();
      streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = false));
    } else {
      streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = true));
      if (streamRef.current) startMicAnalyser(streamRef.current);
    }
  };

  // ── Join ────────────────────────────────────────────────────────────────────
  const joinRoom = (withMedia) => {
    // Save chosen devices for InterviewRoom to pick up (optional use)
    if (withMedia) {
      STORAGE.set(CAM_KEY, camId);
      STORAGE.set(MIC_KEY, micId);
      localStorage.setItem('hs_pj_cam_on', camOn  ? '1' : '0');
      localStorage.setItem('hs_pj_mic_on', micOn  ? '1' : '0');
    } else {
      localStorage.setItem('hs_pj_cam_on', '0');
      localStorage.setItem('hs_pj_mic_on', '0');
    }
    // Stop preview stream before handing control to StreamVideo
    releaseStream(streamRef.current);
    stopMicAnalyser();
    navigate(`/room/${roomId}`);
  };

  // ── Derived ─────────────────────────────────────────────────────────────────
  const otherParty = interview
    ? (user.role === 'interviewer' ? interview.candidateId : interview.interviewerId)
    : null;

  // Mic level bar segments (10 blocks)
  const SEGMENTS = 10;
  const activeSegs = Math.round((micLevel / 100) * SEGMENTS);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 animate-fade-in">

      {/* Page header */}
      <div className="mb-8 flex items-center gap-2 text-xs text-zinc-500">
        <Settings size={13} /> Device check
        <span className="mx-1 text-zinc-700">/</span>
        <span className="text-zinc-300">
          {interview ? interview.title : roomId.slice(0, 8)}
        </span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">

        {/* ── LEFT: camera preview ─────────────────────────────────────── */}
        <div className="flex flex-col gap-3">

          {/* Video box */}
          <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/5 bg-ink-900">
            {/* Live video */}
            <video
              ref={videoRef}
              autoPlay
              muted
              playsInline
              className={`h-full w-full object-cover transition-opacity duration-300 ${
                camOn && stream && !streamLoading ? 'opacity-100' : 'opacity-0'
              }`}
            />

            {/* Placeholder when cam is off or loading */}
            {(!camOn || !stream || streamLoading) && !permError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                {streamLoading ? (
                  <>
                    <Loader2 size={28} className="animate-spin text-neon-cyan" />
                    <p className="text-sm text-zinc-400">Accessing camera…</p>
                  </>
                ) : (
                  <>
                    <div className="grid h-16 w-16 place-items-center rounded-full bg-ink-700">
                      <VideoOff size={24} className="text-zinc-500" />
                    </div>
                    <p className="text-sm text-zinc-500">Camera is off</p>
                  </>
                )}
              </div>
            )}

            {/* Permission error overlay */}
            {permError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                <div className="grid h-14 w-14 place-items-center rounded-full bg-neon-pink/10 text-neon-pink">
                  <AlertTriangle size={22} />
                </div>
                <p className="text-sm text-zinc-300">{permError}</p>
                <button
                  onClick={() => startStream(camId, micId, camOn, micOn)}
                  className="btn-secondary text-xs"
                >
                  Try again
                </button>
              </div>
            )}

            {/* LIVE badge */}
            {camOn && stream && !streamLoading && !permError && (
              <div className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full border border-neon-lime/30 bg-ink-900/70 px-2.5 py-1 text-xs font-semibold text-neon-lime backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-neon-lime animate-pulse-dot shadow-[0_0_6px_currentColor]" />
                LIVE
              </div>
            )}

            {/* Bottom controls */}
            <div className="absolute bottom-0 left-0 right-0 flex items-center justify-center gap-3 bg-gradient-to-t from-ink-900/90 via-ink-900/50 to-transparent px-4 pb-4 pt-10">
              <ToggleButton
                on={camOn}
                onIcon={Video}
                offIcon={VideoOff}
                onLabel="Camera on"
                offLabel="Camera off"
                onColor="bg-ink-700 text-zinc-200 hover:bg-ink-600"
                offColor="bg-neon-pink/20 text-neon-pink border border-neon-pink/30"
                onClick={handleToggleCam}
              />
              <ToggleButton
                on={micOn}
                onIcon={Mic}
                offIcon={MicOff}
                onLabel="Mic on"
                offLabel="Mic off"
                onColor="bg-ink-700 text-zinc-200 hover:bg-ink-600"
                offColor="bg-neon-pink/20 text-neon-pink border border-neon-pink/30"
                onClick={handleToggleMic}
              />
            </div>
          </div>

          {/* Mic level meter */}
          <div className="card flex items-center gap-3 px-4 py-3">
            <Mic size={15} className={micOn && stream ? 'text-neon-cyan' : 'text-zinc-600'} />
            <div className="flex flex-1 items-center gap-[3px]">
              {Array.from({ length: SEGMENTS }, (_, i) => {
                const active  = i < activeSegs;
                const color   =
                  i < SEGMENTS * 0.6 ? 'bg-neon-lime'  :
                  i < SEGMENTS * 0.8 ? 'bg-neon-amber' : 'bg-neon-pink';
                return (
                  <div
                    key={i}
                    className={`h-3 flex-1 rounded-sm transition-all duration-75 ${
                      active ? color : 'bg-ink-500'
                    }`}
                  />
                );
              })}
            </div>
            <span className="w-12 text-right font-mono text-xs text-zinc-500">
              {micOn && stream ? `${micLevel}%` : '—'}
            </span>
          </div>
        </div>

        {/* ── RIGHT: settings + join ───────────────────────────────────── */}
        <div className="flex flex-col gap-4">

          {/* Interview info card */}
          {interview ? (
            <div className="card px-5 py-4">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                Joining interview
              </p>
              <h2 className="text-lg font-bold text-white">{interview.title}</h2>
              {otherParty && (
                <div className="mt-3 flex items-center gap-2.5">
                  <Avatar name={otherParty.name} size={32} />
                  <div>
                    <p className="text-sm font-medium text-zinc-200">{otherParty.name}</p>
                    <p className="text-xs text-zinc-500">
                      {user.role === 'interviewer' ? 'Candidate' : 'Interviewer'}
                    </p>
                  </div>
                </div>
              )}
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-zinc-400">
                <span className="inline-flex items-center gap-1.5">
                  <Calendar size={12} />
                  {new Date(interview.scheduledAt).toLocaleString()}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Clock size={12} />
                  {interview.durationMinutes} min
                </span>
              </div>
            </div>
          ) : metaError ? (
            <div className="rounded-xl border border-neon-pink/20 bg-neon-pink/5 px-4 py-3 text-sm text-neon-pink">
              {metaError}
            </div>
          ) : (
            <div className="card flex items-center gap-2 px-5 py-4 text-zinc-500">
              <Loader2 size={14} className="animate-spin" />
              <span className="text-sm">Loading interview…</span>
            </div>
          )}

          {/* Camera selector */}
          <DeviceSelector
            label="Camera"
            icon={Video}
            devices={cameras}
            selected={camId}
            onChange={handleCamChange}
            disabled={!camOn || !!permError}
            noneLabel="No cameras found"
          />

          {/* Microphone selector */}
          <DeviceSelector
            label="Microphone"
            icon={Mic}
            devices={mics}
            selected={micId}
            onChange={handleMicChange}
            disabled={!micOn || !!permError}
            noneLabel="No microphones found"
          />

          {/* Readiness check */}
          <div className="card px-5 py-4">
            <p className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              Ready?
            </p>
            <div className="flex flex-col gap-1.5">
              <ReadinessRow
                ok={!permError && !!stream && camOn}
                label="Camera active"
                fallback="Camera off or unavailable"
              />
              <ReadinessRow
                ok={!permError && !!stream && micOn}
                label="Microphone active"
                fallback="Microphone off or unavailable"
              />
              <ReadinessRow
                ok={!!interview}
                label="Interview loaded"
                fallback="Could not load interview"
              />
            </div>
          </div>

          {/* Join buttons */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => joinRoom(true)}
              className="btn-primary w-full justify-center py-3 text-base"
            >
              Join Interview <ArrowRight size={17} />
            </button>
            <button
              onClick={() => joinRoom(false)}
              className="btn-ghost w-full justify-center text-sm text-zinc-400 hover:text-zinc-200"
            >
              Join without camera &amp; mic
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}

// ─── sub-components ──────────────────────────────────────────────────────────

function ToggleButton({ on, onIcon: OnIcon, offIcon: OffIcon, onLabel, offLabel, onColor, offColor, onClick }) {
  const Icon  = on  ? OnIcon  : OffIcon;
  const label = on  ? onLabel : offLabel;
  const cls   = on  ? onColor : offColor;
  return (
    <button
      onClick={onClick}
      title={label}
      className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition ${cls}`}
    >
      <Icon size={16} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );
}

function DeviceSelector({ label, icon: Icon, devices, selected, onChange, disabled, noneLabel }) {
  return (
    <div className="card px-5 py-4">
      <label className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-500">
        <Icon size={12} /> {label}
      </label>
      {devices.length === 0 ? (
        <p className="text-sm text-zinc-500">{noneLabel}</p>
      ) : (
        <select
          value={selected}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-full rounded-lg border border-white/10 bg-ink-900 px-3 py-2 text-sm text-zinc-200
            focus:border-neon-cyan/50 focus:outline-none focus:ring-1 focus:ring-neon-cyan/20
            disabled:cursor-not-allowed disabled:opacity-40"
        >
          <option value="">Default {label.toLowerCase()}</option>
          {devices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>
              {d.label || `${label} ${d.deviceId.slice(0, 6)}`}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function ReadinessRow({ ok, label, fallback }) {
  return (
    <div className="flex items-center gap-2.5 text-sm">
      {ok ? (
        <CheckCircle2 size={15} className="shrink-0 text-neon-lime" />
      ) : (
        <AlertTriangle size={15} className="shrink-0 text-zinc-600" />
      )}
      <span className={ok ? 'text-zinc-200' : 'text-zinc-500'}>
        {ok ? label : fallback}
      </span>
    </div>
  );
}
