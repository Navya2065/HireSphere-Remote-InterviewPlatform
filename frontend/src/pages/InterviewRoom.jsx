import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { io } from 'socket.io-client';
import {
  MessageSquare,
  Code2,
  PhoneOff,
  Users,
  Send,
  Loader2,
  Timer as TimerIcon,
  CircleStop,
  WifiOff,
  BellRing,
  ClipboardList,
  FileText,
  Sparkles,
  BarChart2,
} from 'lucide-react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { Avatar } from '../components/Navbar';
import CodeEditor from '../components/CodeEditor';
import RubricPanel from '../components/RubricPanel';
import CandidateResumePanel from '../components/CandidateResumePanel';
import AIAssistPanel from '../components/AIAssistPanel';
import InterviewSummaryPanel from '../components/InterviewSummaryPanel';

// Stream Video SDK
import {
  StreamVideo,
  StreamVideoClient,
  StreamCall,
  SpeakerLayout,
  CallControls,
  useCallStateHooks,
} from '@stream-io/video-react-sdk';

export default function InterviewRoom() {
  const { roomId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [interview, setInterview] = useState(null);
  const [client, setClient] = useState(null);
  const [call, setCall] = useState(null);
  const [error, setError] = useState('');

  const [socket, setSocket] = useState(null);
  const [socketConnected, setSocketConnected] = useState(false);

  // Track live code state for the AI co-pilot (interviewer only)
  const [liveCode,     setLiveCode]     = useState('');
  const [liveLanguage, setLiveLanguage] = useState('javascript');

  // Live interview lifecycle state (driven by `interview-update` socket event)
  const [lifecycle, setLifecycle] = useState({
    status: 'scheduled',
    startedAt: null,
    endedAt: null,
    durationMinutes: 45,
  });

  // Lightweight toast stack for peer join/leave events
  const [toasts, setToasts] = useState([]);
  const pushToast = useCallback((toast) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, ...toast }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  const socketURL = useMemo(
    () => import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000',
    []
  );

  // Single shared socket for chat + editor + lifecycle
  useEffect(() => {
    const token = localStorage.getItem('rip_token');
    const s = io(socketURL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionDelay: 800,
    });

    s.on('connect', () => {
      setSocketConnected(true);
      s.emit('join-room', { roomId });
    });
    s.on('disconnect', () => setSocketConnected(false));
    s.on('connect_error', (err) => console.warn('Socket connect_error:', err.message));

    s.on('interview-update', (payload) => {
      setLifecycle((prev) => ({ ...prev, ...payload }));
    });

    // Keep live code state in sync for AI co-pilot
    s.on('code-state',  ({ content, language }) => {
      setLiveCode(content || '');
      setLiveLanguage(language || 'javascript');
    });
    s.on('code-update', ({ content, language }) => {
      if (content !== undefined) setLiveCode(content);
      if (language)              setLiveLanguage(language);
    });

    s.on('system', (msg) => {
      if (msg?.type === 'user-joined' && msg.payload?.name) {
        pushToast({ tone: 'lime', text: `${msg.payload.name} joined the room` });
      } else if (msg?.type === 'user-left' && msg.payload?.name) {
        const reason = msg.payload.reason === 'disconnect' ? ' (disconnected)' : '';
        pushToast({ tone: 'pink', text: `${msg.payload.name} left${reason}` });
      }
    });

    setSocket(s);

    // Clean leave on navigate away / close tab
    const onBeforeUnload = () => {
      try { s.emit('leave-room', { roomId }); } catch {}
    };
    window.addEventListener('beforeunload', onBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', onBeforeUnload);
      try { s.emit('leave-room', { roomId }); } catch {}
      s.disconnect();
    };
  }, [roomId, socketURL, pushToast]);

  // Bootstrap video + fetch interview metadata
  useEffect(() => {
    let cancelled = false;
    async function bootstrap() {
      try {
        const [{ data: ivData }, { data: tokenData }] = await Promise.all([
          api.get(`/interviews/room/${roomId}`),
          api.get(`/video/token/${roomId}`),
        ]);
        if (cancelled) return;
        setInterview(ivData.interview);
        setLifecycle((prev) => ({
          ...prev,
          status: ivData.interview.status,
          startedAt: ivData.interview.startedAt,
          endedAt: ivData.interview.endedAt,
          durationMinutes: ivData.interview.durationMinutes,
        }));

        const videoClient = new StreamVideoClient({
          apiKey: tokenData.apiKey,
          user: { id: tokenData.user.id, name: tokenData.user.name },
          token: tokenData.token,
        });
        const videoCall = videoClient.call(tokenData.callType, tokenData.callId);
        await videoCall.join({ create: true });

        if (cancelled) {
          await videoCall.leave();
          await videoClient.disconnectUser();
          return;
        }
        setClient(videoClient);
        setCall(videoCall);
      } catch (err) {
        setError(
          err?.response?.data?.message || err.message || 'Could not join the interview room'
        );
      }
    }
    bootstrap();
    return () => { cancelled = true; };
  }, [roomId]);

  useEffect(() => {
    return () => {
      if (call) call.leave().catch(() => {});
      if (client) client.disconnectUser().catch(() => {});
    };
  }, [call, client]);

  const leave = async () => {
    try {
      if (socket) socket.emit('leave-room', { roomId });
      if (call) await call.leave();
      if (client) await client.disconnectUser();
    } finally {
      navigate('/interviews');
    }
  };

  const endInterview = () => {
    if (!socket || !socketConnected) return;
    if (!window.confirm('End this interview for both participants?')) return;
    socket.emit('interview-end', { roomId });
  };

  if (error) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="card border-rose-500/30 p-6 text-rose-300">
          <h2 className="font-semibold text-white">Could not join room</h2>
          <p className="mt-1 text-sm">{error}</p>
        </div>
      </main>
    );
  }

  if (!interview || !client || !call) {
    return (
      <main className="flex h-[70vh] flex-col items-center justify-center gap-3 text-zinc-400">
        <Loader2 size={24} className="animate-spin text-neon-cyan" />
        <span>Connecting to interview room…</span>
      </main>
    );
  }

  const otherParty =
    user.role === 'interviewer' ? interview.candidateId : interview.interviewerId;
  const isInterviewer = user.role === 'interviewer';
  const isEnded = lifecycle.status === 'completed' || lifecycle.status === 'cancelled';

  return (
    <main className="mx-auto max-w-7xl px-4 py-6">
      {/* Reconnect banner */}
      {!socketConnected && (
        <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200 animate-fade-in">
          <WifiOff size={14} />
          <span>Reconnecting to the interview room…</span>
        </div>
      )}

      {/* Room header */}
      <header className="mb-4 flex flex-wrap items-center justify-between gap-3 card p-4">
        <div className="flex items-center gap-3">
          <Avatar name={otherParty?.name || '?'} size={40} />
          <div>
            <h1 className="text-lg font-semibold text-white">{interview.title}</h1>
            <p className="text-xs text-zinc-400">
              With <span className="text-zinc-200">{otherParty?.name}</span>
              <span className="mx-1.5 text-zinc-600">·</span>
              Room <span className="font-mono text-zinc-300">{roomId.slice(0, 8)}</span>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={lifecycle.status} />
          <InterviewTimer
            status={lifecycle.status}
            startedAt={lifecycle.startedAt}
            endedAt={lifecycle.endedAt}
            durationMinutes={lifecycle.durationMinutes}
          />
          {isInterviewer && !isEnded && (
            <button
              onClick={endInterview}
              disabled={!socketConnected}
              className="btn-ghost !text-rose-300 hover:!text-rose-200 disabled:opacity-40"
              title="Mark the interview as completed for both participants"
            >
              <CircleStop size={15} /> End interview
            </button>
          )}
          <button onClick={leave} className="btn-danger">
            <PhoneOff size={15} /> Leave
          </button>
        </div>
      </header>

      {isInterviewer ? (
        /* ── Interviewer layout: Code (hero) ← Video + Chat (sidebar) ── */
        <div className="grid gap-4 lg:grid-cols-[380px_1fr]">

          {/* Left sidebar: video (compact) + Chat | Rubric tabs */}
          <div className="flex flex-col gap-3" style={{ height: 'calc(100vh - 220px)' }}>
            {/* Compact video */}
            <section className="card overflow-hidden p-0 str-video str-video__theme-dark shrink-0" style={{ height: 220 }}>
              <StreamVideo client={client}>
                <StreamCall call={call}>
                  <VideoStageCompact />
                </StreamCall>
              </StreamVideo>
            </section>

            {/* Chat / Rubric tab panel */}
            <InterviewerSidePanel
              socket={socket}
              connected={socketConnected}
              roomId={roomId}
              interviewId={interview._id}
              initialRubric={interview.rubric}
              initialSummary={interview.aiSummary}
              candidateId={interview.candidateId._id}
              liveCode={liveCode}
              liveLanguage={liveLanguage}
              isEnded={isEnded}
            />
          </div>

          {/* Right: read-only live code editor (hero) */}
          <section className="card overflow-hidden p-0" style={{ height: 'calc(100vh - 220px)' }}>
            <CodeEditor
              socket={socket}
              connected={socketConnected}
              roomId={roomId}
              readOnly={true}
            />
          </section>
        </div>
      ) : (
        /* ── Candidate layout: Video (hero) ← Chat + Code editor (sidebar) ── */
        <div className="grid gap-4 lg:grid-cols-[1fr_440px]">
          <section className="card overflow-hidden p-0 str-video str-video__theme-dark">
            <StreamVideo client={client}>
              <StreamCall call={call}>
                <VideoStage />
              </StreamCall>
            </StreamVideo>
          </section>

          <CandidateSidePanel socket={socket} connected={socketConnected} roomId={roomId} />
        </div>
      )}

      {/* Toast stack */}
      <div className="pointer-events-none fixed bottom-6 right-6 z-40 flex flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto animate-fade-in rounded-lg border px-3 py-2 text-xs backdrop-blur-md ${
              t.tone === 'lime'
                ? 'border-neon-lime/30 bg-neon-lime/10 text-neon-lime'
                : 'border-neon-pink/30 bg-neon-pink/10 text-neon-pink'
            }`}
          >
            <span className="inline-flex items-center gap-2">
              <BellRing size={12} /> {t.text}
            </span>
          </div>
        ))}
      </div>
    </main>
  );
}

function StatusBadge({ status }) {
  const map = {
    scheduled:     { cls: 'pill-cyan',   dot: 'bg-neon-cyan',   label: 'Scheduled' },
    'in-progress': { cls: 'pill-lime',   dot: 'bg-neon-lime',   label: 'Live' },
    completed:     { cls: 'pill-violet', dot: 'bg-neon-violet', label: 'Ended' },
    cancelled:     { cls: 'pill-muted',  dot: 'bg-zinc-500',    label: 'Cancelled' },
  }[status] || { cls: 'pill-muted', dot: 'bg-zinc-500', label: status };

  return (
    <span className={map.cls}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${map.dot} ${
          status === 'in-progress' ? 'animate-pulse-dot' : ''
        } shadow-[0_0_8px_currentColor]`}
      />
      {map.label}
    </span>
  );
}

function InterviewTimer({ status, startedAt, endedAt, durationMinutes }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (status !== 'in-progress') return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [status]);

  if (!startedAt) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md border border-ink-500 bg-ink-800 px-2 py-1 text-xs text-zinc-400">
        <TimerIcon size={12} /> Not started
      </span>
    );
  }

  const start = new Date(startedAt).getTime();
  const end = endedAt ? new Date(endedAt).getTime() : now;
  const elapsedSec = Math.max(0, Math.floor((end - start) / 1000));
  const limitSec = (durationMinutes || 45) * 60;
  const remainingSec = limitSec - elapsedSec;

  // Color palette:
  //  - cyan when comfortably under the limit
  //  - amber when <= 5 minutes remain
  //  - rose when over the limit
  //  - zinc when the interview has ended
  let tone = 'text-neon-cyan border-neon-cyan/30 bg-neon-cyan/10';
  if (status === 'completed' || status === 'cancelled') {
    tone = 'text-zinc-300 border-ink-500 bg-ink-800';
  } else if (remainingSec < 0) {
    tone = 'text-rose-300 border-rose-500/40 bg-rose-500/10';
  } else if (remainingSec <= 300) {
    tone = 'text-amber-300 border-amber-400/40 bg-amber-400/10';
  }

  const mm = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
  const ss = String(elapsedSec % 60).padStart(2, '0');
  const overBy = remainingSec < 0 ? ` · +${Math.floor(Math.abs(remainingSec) / 60)}m over` : '';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-1 font-mono text-xs ${tone}`}
      title={`Started ${new Date(startedAt).toLocaleTimeString()} · limit ${durationMinutes}m`}
    >
      <TimerIcon size={12} />
      {mm}:{ss}
      <span className="font-sans text-[10px] text-zinc-400">/ {durationMinutes}m{overBy}</span>
    </span>
  );
}

/** Full-height video stage — used by the candidate */
function VideoStage() {
  const { useParticipantCount } = useCallStateHooks();
  const count = useParticipantCount();
  return (
    <div className="flex h-[calc(100vh-220px)] flex-col">
      <div className="flex items-center justify-between border-b border-white/5 bg-ink-900/70 px-4 py-2 text-xs text-zinc-400">
        <span className="inline-flex items-center gap-1.5">
          <Users size={13} className="text-neon-cyan" /> {count} in call
        </span>
        <span className="text-zinc-500">Mute / camera / controls below</span>
      </div>
      <div className="flex-1 min-h-0 bg-black">
        <SpeakerLayout participantsBarPosition="bottom" />
      </div>
      <div className="shrink-0 border-t border-white/5 bg-ink-900/80 px-2 py-3">
        <div className="flex items-center justify-center">
          <CallControls onLeave={() => {}} />
        </div>
      </div>
    </div>
  );
}

/** Compact video — used in the interviewer's left sidebar */
function VideoStageCompact() {
  const { useParticipantCount } = useCallStateHooks();
  const count = useParticipantCount();
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b border-white/5 bg-ink-900/70 px-3 py-1.5 text-xs text-zinc-500">
        <span className="inline-flex items-center gap-1">
          <Users size={12} className="text-neon-cyan" /> {count}
        </span>
      </div>
      <div className="flex-1 min-h-0 bg-black">
        <SpeakerLayout participantsBarPosition="bottom" />
      </div>
      <div className="shrink-0 border-t border-white/5 bg-ink-900/80 px-1 py-1.5">
        <div className="flex items-center justify-center scale-90 origin-center">
          <CallControls onLeave={() => {}} />
        </div>
      </div>
    </div>
  );
}

/** Connected dot badge */
function ConnectedDot({ connected }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-xs ${connected ? 'text-neon-lime' : 'text-zinc-500'}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${connected ? 'bg-neon-lime animate-pulse-dot shadow-[0_0_8px_currentColor]' : 'bg-zinc-600'}`} />
      {connected ? 'live' : 'offline'}
    </span>
  );
}

/**
 * InterviewerSidePanel — Chat | Rubric tabs, only shown to the interviewer.
 * Rubric is NEVER rendered for the candidate.
 */
function InterviewerSidePanel({ socket, connected, roomId, interviewId, initialRubric, initialSummary, candidateId, liveCode, liveLanguage, isEnded }) {
  const [tab, setTab] = useState('chat');

  const TABS = [
    { id: 'chat',    icon: MessageSquare, label: 'Chat'    },
    { id: 'ai',      icon: Sparkles,      label: 'AI'      },
    { id: 'resume',  icon: FileText,      label: 'Resume'  },
    { id: 'rubric',  icon: ClipboardList, label: 'Rubric'  },
    { id: 'summary', icon: BarChart2,     label: 'Summary' },
  ];

  return (
    <aside className="card flex flex-1 min-h-0 flex-col overflow-hidden">
      {/* Tab bar */}
      <div className="flex items-center border-b border-white/5 px-1">
        {TABS.map(({ id, icon: Icon, label }) => {
          const isSummary = id === 'summary';
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              title={label}
              className={`flex flex-1 items-center justify-center gap-1 py-2.5 text-xs font-medium transition relative
                ${tab === id
                  ? 'text-neon-cyan shadow-[inset_0_-2px_0_0_#22d3ee]'
                  : 'text-zinc-400 hover:text-zinc-100'
                }`}
            >
              <Icon size={13} />
              <span>{label}</span>
              {/* Glow dot when interview has ended — nudges interviewer to generate summary */}
              {isSummary && isEnded && !initialSummary?.generatedAt && (
                <span className="absolute top-1.5 right-1 h-1.5 w-1.5 rounded-full bg-neon-violet animate-pulse-dot shadow-[0_0_6px_theme(colors.violet.400)]" />
              )}
            </button>
          );
        })}
        <span className="ml-1 mr-2 shrink-0">
          <ConnectedDot connected={connected} />
        </span>
      </div>

      {/* Chat */}
      <div className={`flex-1 min-h-0 ${tab === 'chat' ? 'flex flex-col' : 'hidden'}`}>
        <ChatPanel socket={socket} connected={connected} roomId={roomId} />
      </div>

      {/* AI Co-pilot */}
      <div className={`flex-1 min-h-0 ${tab === 'ai' ? 'flex flex-col' : 'hidden'}`}>
        <AIAssistPanel code={liveCode} language={liveLanguage} />
      </div>

      {/* Resume */}
      <div className={`flex-1 min-h-0 ${tab === 'resume' ? 'flex flex-col' : 'hidden'}`}>
        <CandidateResumePanel candidateId={candidateId} />
      </div>

      {/* Rubric */}
      <div className={`flex-1 min-h-0 ${tab === 'rubric' ? 'flex flex-col' : 'hidden'}`}>
        <RubricPanel interviewId={interviewId} initialRubric={initialRubric} />
      </div>

      {/* Summary */}
      <div className={`flex-1 min-h-0 ${tab === 'summary' ? 'flex flex-col' : 'hidden'}`}>
        <InterviewSummaryPanel
          interviewId={interviewId}
          isEnded={isEnded}
          initialSummary={initialSummary}
        />
      </div>
    </aside>
  );
}

/** Side panel for the CANDIDATE: Chat tab + Code editor tab */
function CandidateSidePanel({ socket, connected, roomId }) {
  const [tab, setTab] = useState('chat');

  return (
    <aside className="card flex h-[calc(100vh-220px)] flex-col overflow-hidden">
      <div className="flex items-center border-b border-white/5">
        <TabButton active={tab === 'chat'} onClick={() => setTab('chat')} icon={MessageSquare}>
          Chat
        </TabButton>
        <TabButton active={tab === 'code'} onClick={() => setTab('code')} icon={Code2}>
          Code
        </TabButton>
        <span className="ml-auto mr-3">
          <ConnectedDot connected={connected} />
        </span>
      </div>

      {/* Keep both mounted so Monaco doesn't lose state on tab switch */}
      <div className={`flex-1 min-h-0 ${tab === 'chat' ? 'flex flex-col' : 'hidden'}`}>
        <ChatPanel socket={socket} connected={connected} roomId={roomId} />
      </div>
      <div className={`flex-1 min-h-0 ${tab === 'code' ? 'flex flex-col' : 'hidden'}`}>
        <CodeEditor socket={socket} connected={connected} roomId={roomId} readOnly={false} />
      </div>
    </aside>
  );
}

function TabButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-3 text-sm font-medium transition ${
        active
          ? 'text-neon-cyan shadow-[inset_0_-2px_0_0_#22d3ee]'
          : 'text-zinc-400 hover:text-zinc-100'
      }`}
    >
      <Icon size={15} />
      {children}
    </button>
  );
}

function ChatPanel({ socket, connected, roomId }) {
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [peerTyping, setPeerTyping] = useState(null); // { userId, name } | null

  const listRef = useRef(null);
  const typingEmitRef = useRef(0);   // last time we emitted `typing`
  const typingStopTimerRef = useRef(null); // timer to emit `typing-stop`
  const peerTypingTimerRef = useRef(null); // auto-clear peer indicator if no follow-up

  useEffect(() => {
    api.get(`/messages/${roomId}`).then((r) => setMessages(r.data.messages || [])).catch(() => {});
  }, [roomId]);

  useEffect(() => {
    if (!socket) return;

    const onMsg = ({ message }) => {
      setMessages((prev) => [...prev, message]);
      // Message from the peer implicitly clears their typing indicator
      if (String(message.senderId) !== String(user.id)) {
        setPeerTyping(null);
        clearTimeout(peerTypingTimerRef.current);
      }
    };
    const onPeerTyping = ({ userId, name }) => {
      if (String(userId) === String(user.id)) return;
      setPeerTyping({ userId, name });
      clearTimeout(peerTypingTimerRef.current);
      // Fallback: if we stop hearing from them, clear after 3s.
      peerTypingTimerRef.current = setTimeout(() => setPeerTyping(null), 3000);
    };
    const onPeerStopped = ({ userId }) => {
      if (String(userId) === String(user.id)) return;
      setPeerTyping(null);
      clearTimeout(peerTypingTimerRef.current);
    };

    socket.on('chat-message', onMsg);
    socket.on('peer-typing', onPeerTyping);
    socket.on('peer-stopped-typing', onPeerStopped);
    return () => {
      socket.off('chat-message', onMsg);
      socket.off('peer-typing', onPeerTyping);
      socket.off('peer-stopped-typing', onPeerStopped);
      clearTimeout(peerTypingTimerRef.current);
      clearTimeout(typingStopTimerRef.current);
    };
  }, [socket, user.id]);

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, peerTyping]);

  const onTextChange = (e) => {
    const v = e.target.value;
    setText(v);
    if (!socket || !connected) return;

    // Throttle `typing` to once every 1.5s while the user is actively typing.
    const nowTs = Date.now();
    if (v && nowTs - typingEmitRef.current > 1500) {
      socket.emit('typing', { roomId });
      typingEmitRef.current = nowTs;
    }

    // Debounce `typing-stop` — fires 2s after the last keystroke.
    clearTimeout(typingStopTimerRef.current);
    typingStopTimerRef.current = setTimeout(() => {
      socket.emit('typing-stop', { roomId });
    }, 2000);
  };

  const send = (e) => {
    e.preventDefault();
    const clean = text.trim();
    if (!clean || !socket) return;
    socket.emit('send-message', { roomId, text: clean });
    setText('');
    clearTimeout(typingStopTimerRef.current);
    typingEmitRef.current = 0;
    socket.emit('typing-stop', { roomId });
  };

  return (
    <>
      <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <p className="pt-10 text-center text-sm text-zinc-500">
            No messages yet. Say hi
          </p>
        ) : (
          messages.map((m) => {
            const mine = String(m.senderId) === String(user.id);
            return (
              <div key={m._id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-[82%] rounded-2xl px-3 py-2 text-sm ${
                    mine
                      ? 'bg-neon-cyan/90 text-ink-900 shadow-neon-cyan'
                      : 'bg-ink-700/70 text-zinc-100 border border-white/5'
                  }`}
                >
                  {!mine && (
                    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                      {m.senderName}
                    </p>
                  )}
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
              </div>
            );
          })
        )}

        {peerTyping && (
          <div className="flex justify-start animate-fade-in">
            <div className="inline-flex items-center gap-2 rounded-2xl border border-white/5 bg-ink-700/70 px-3 py-2 text-xs text-zinc-300">
              <span className="font-semibold text-zinc-200">{peerTyping.name}</span>
              <span className="inline-flex gap-0.5">
                <TypingDot delay="0ms" />
                <TypingDot delay="150ms" />
                <TypingDot delay="300ms" />
              </span>
              <span className="sr-only">is typing</span>
            </div>
          </div>
        )}
      </div>

      <form onSubmit={send} className="flex gap-2 border-t border-white/5 p-3">
        <input
          value={text}
          onChange={onTextChange}
          onBlur={() => {
            if (socket && connected) socket.emit('typing-stop', { roomId });
            clearTimeout(typingStopTimerRef.current);
          }}
          placeholder="Type a message…"
          className="input flex-1"
        />
        <button
          type="submit"
          disabled={!text.trim() || !connected}
          className="btn-primary !px-3"
          title="Send"
        >
          <Send size={14} />
        </button>
      </form>
    </>
  );
}

function TypingDot({ delay }) {
  return (
    <span
      className="h-1.5 w-1.5 rounded-full bg-neon-cyan animate-pulse-dot shadow-[0_0_6px_currentColor]"
      style={{ animationDelay: delay }}
    />
  );
}
