# HireSphere — Remote Technical Interview Platform

A production-grade, full-stack remote interview platform where **interviewers** schedule and conduct live technical sessions with **candidates** — complete with real-time video, collaborative code editing, AI evaluation, and automated hiring workflows.

---

## ✨ Features

### Core Interview Experience
- **Live video calls** via Stream Video SDK (WebRTC)
- **Real-time collaborative code editor** — Monaco Editor synced over Socket.io with language switching, syntax highlighting, and IntelliSense snippets for JS/TS/Python/Java/C++/C#/Go/Rust
- **One-click code execution** — powered by Piston sandbox API, output broadcast to both participants instantly
- **Real-time chat** with typing indicators and persistent message history

### Interviewer Tools
- **AI question generator** — generates role/topic-specific interview questions via Groq LLM
- **AI code reviewer** — instant structured feedback (verdict, strengths, issues, complexity) on candidate's live code
- **Rubric-based evaluation** — customizable criteria with 1–5 ratings and notes, submitted post-interview
- **Candidate resume viewer** — view uploaded PDFs inline during the interview session
- **AI interview summary** — post-interview report with performance summary, strengths, weaknesses, code quality, communication feedback, overall score (1–10), and a Hire / Maybe / No recommendation

### Hiring Pipeline
- **Interview Dashboard** — card-based pipeline view of every candidate with score, status, and notes at a glance
- **Hiring decision system** — mark candidates as Pending / Selected / Rejected with a single click
- **Automated decision emails** — candidates receive a branded HTML email when selected or rejected (powered by Resend, no npm package required)

### UX Polish
- Dark neon-accented UI (custom Tailwind theme — `ink-*`, `neon-*` palette)
- Skeleton loaders on every data-fetching screen
- Global toast notification system (success / error / warning / info)
- Empty states with contextual CTAs
- Role-based navigation — interviewers and candidates see different views

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS + React Router v6 |
| Backend | Node.js + Express.js |
| Database | MongoDB + Mongoose |
| Auth | JWT (7-day expiry, role-based) |
| Real-time | Socket.io (chat + code sync + interview lifecycle) |
| Video | Stream Video React SDK |
| Code Editor | Monaco Editor (`@monaco-editor/react`) |
| Code Execution | Piston API (sandboxed, 8 languages) |
| AI / LLM | Groq API — `llama-3.1-8b-instant` (free tier, raw HTTPS) |
| Email | Resend API (raw HTTPS — no npm package needed) |
| Icons | Lucide React |

---

## 📁 Folder Structure

```
remote-interview-platform/
├── backend/
│   ├── server.js                         # Express + Socket.io bootstrap
│   ├── .env                              # Environment variables (see below)
│   ├── config/
│   │   └── db.js                         # MongoDB connection
│   ├── models/
│   │   ├── User.js                       # name, email, passwordHash, role
│   │   ├── Interview.js                  # rubric + aiSummary + hiringDecision
│   │   ├── Message.js                    # chat messages per room
│   │   └── CodeSession.js               # shared editor state per room
│   ├── middleware/
│   │   ├── authMiddleware.js             # JWT verify → req.user
│   │   └── roleMiddleware.js             # requireRole('interviewer' | 'candidate')
│   ├── controllers/
│   │   ├── authController.js             # signup, login, me, listCandidates
│   │   ├── interviewController.js        # CRUD + rubric + hiring decision
│   │   ├── aiController.js              # question gen, code review, AI summary
│   │   ├── messageController.js          # chat history
│   │   ├── videoController.js            # Stream video token
│   │   ├── codeController.js             # Piston execution proxy
│   │   └── resumeController.js           # PDF upload / serve / delete
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── interviewRoutes.js
│   │   ├── aiRoutes.js
│   │   ├── messageRoutes.js
│   │   ├── videoRoutes.js
│   │   ├── codeRoutes.js
│   │   └── resumeRoutes.js
│   ├── socket/
│   │   └── chatSocket.js                 # all Socket.io room logic
│   └── utils/
│       └── mailer.js                     # Resend HTML email sender
│
└── frontend/
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx                       # route definitions
        ├── index.css                     # Tailwind + custom theme + animations
        ├── api/axios.js                  # pre-authed axios instance
        ├── context/
        │   ├── AuthContext.jsx           # login / signup / logout
        │   └── ToastContext.jsx          # global toast system
        ├── components/
        │   ├── Navbar.jsx                # role-aware nav + Avatar
        │   ├── ProtectedRoute.jsx        # role-gated route wrapper
        │   ├── Skeleton.jsx              # skeleton loader components
        │   ├── CodeEditor.jsx            # Monaco + Socket.io + Piston
        │   ├── RubricPanel.jsx           # evaluation rubric UI
        │   ├── AIAssistPanel.jsx         # AI question gen + code review
        │   ├── CandidateResumePanel.jsx  # PDF viewer for interviewers
        │   └── InterviewSummaryPanel.jsx # AI post-interview report
        └── pages/
            ├── Landing.jsx
            ├── Login.jsx
            ├── Signup.jsx
            ├── Dashboard.jsx
            ├── ScheduleInterview.jsx
            ├── InterviewList.jsx
            ├── InterviewDashboardPage.jsx  # pipeline + hiring decisions
            ├── PreJoinCheck.jsx
            ├── InterviewRoom.jsx           # video + editor + sidebar tabs
            └── ResumeUpload.jsx
```

---

## 🌐 REST API

All protected routes require `Authorization: Bearer <token>`.

### Auth
| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/api/auth/signup` | Public | Create account, returns JWT |
| POST | `/api/auth/login` | Public | Returns JWT |
| GET | `/api/auth/me` | Any | Current user info |
| GET | `/api/auth/candidates` | Interviewer | List all candidates |

### Interviews
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/interviews` | Any | Paginated list of your interviews |
| POST | `/api/interviews` | Interviewer | Schedule new interview |
| GET | `/api/interviews/:id` | Participant | Single interview |
| GET | `/api/interviews/room/:roomId` | Participant | Lookup by room |
| PATCH | `/api/interviews/:id` | Interviewer | Update status / notes |
| PATCH | `/api/interviews/:id/rubric` | Interviewer | Save evaluation rubric |
| PATCH | `/api/interviews/:id/decision` | Interviewer | Set hiring decision + trigger email |

### AI
| Method | Path | Access | Description |
|---|---|---|---|
| POST | `/api/ai/questions` | Interviewer | Generate questions `{ role, topic, count }` |
| POST | `/api/ai/review-code` | Interviewer | Review code `{ code, language }` |
| POST | `/api/ai/summary/:interviewId` | Interviewer | Generate post-interview summary |
| GET | `/api/ai/summary/:interviewId` | Participant | Fetch saved summary |

### Resumes
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/resumes/my` | Candidate | List own resumes |
| POST | `/api/resumes/upload` | Candidate | Upload PDF (base64) |
| GET | `/api/resumes/:id/file` | Any | Stream PDF file |
| DELETE | `/api/resumes/:id` | Owner | Delete resume |

### Other
| Method | Path | Access | Description |
|---|---|---|---|
| GET | `/api/messages/:roomId` | Participant | Chat history |
| GET | `/api/video/token/:roomId` | Participant | Stream video JWT |
| POST | `/api/code/execute` | Participant | Run code via Piston |
| GET | `/api/health` | Public | Health check |

---

## ⚡ Socket.io Events

Client connects with `io(SOCKET_URL, { auth: { token } })`.

**Client → Server**
| Event | Payload | Description |
|---|---|---|
| `join-room` | `{ roomId }` | Join the room |
| `leave-room` | `{ roomId }` | Leave the room |
| `send-message` | `{ roomId, text }` | Send chat message |
| `typing` | `{ roomId }` | Typing indicator start |
| `typing-stop` | `{ roomId }` | Typing indicator stop |
| `code-update` | `{ roomId, content, language }` | Editor change |
| `code-language` | `{ roomId, language }` | Language-only switch |
| `interview-end` | `{ roomId }` | End interview (interviewer only) |

**Server → Client**
| Event | Payload | Description |
|---|---|---|
| `chat-message` | `{ message }` | New chat message |
| `peer-typing` | `{ userId, name }` | Peer started typing |
| `peer-stopped-typing` | `{ userId }` | Peer stopped typing |
| `code-state` | `{ content, language }` | Full editor state on join |
| `code-update` | `{ content, language }` | Live editor update |
| `code-output` | `{ stdout, stderr, exitCode, ranBy }` | Execution result |
| `interview-update` | `{ status, startedAt, endedAt }` | Lifecycle change |
| `system` | `{ type, payload }` | `user-joined` / `user-left` |

---

## ⚙️ Environment Variables

**`backend/.env`**
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/remote_interview_platform
JWT_SECRET=your_long_random_secret_here
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173

# Stream Video SDK — https://getstream.io/video/ (free tier)
STREAM_API_KEY=your_stream_api_key
STREAM_API_SECRET=your_stream_api_secret

# Groq AI — https://console.groq.com/keys (free, no billing required)
GROQ_API_KEY=your_groq_api_key

# Resend Email — https://resend.com/api-keys (free, 3000 emails/month)
RESEND_API_KEY=your_resend_api_key
MAIL_FROM=HireSphere <onboarding@resend.dev>
```

**`frontend/.env`**
```env
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

---

## 🚀 Running Locally

**Prerequisites:** Node.js 18+, MongoDB running locally

```bash
# 1. Backend
cd backend
npm install
npm run dev        # → http://localhost:5000

# 2. Frontend (new terminal)
cd frontend
npm install
npm run dev        # → http://localhost:5173
```

**Quick start flow:**
1. Sign up as **interviewer** in one browser
2. Sign up as **candidate** in another browser / incognito
3. Interviewer → **Schedule** → create interview for the candidate
4. Both → **Interviews** → **Join** the room
5. After interview ends → **Summary** tab → Generate AI report
6. Interviewer → **Pipeline** → mark candidate Selected / Rejected → email auto-sent

---

## 🌍 Deploying to Production

| Service | Used for | Free tier |
|---|---|---|
| [MongoDB Atlas](https://www.mongodb.com/atlas) | Database | 512 MB |
| [Render](https://render.com) | Backend (Node + Socket.io) | 750 hrs/month |
| [Vercel](https://vercel.com) | Frontend (React/Vite) | Unlimited |

**1. MongoDB Atlas**
- Create free cluster → get connection string → set as `MONGO_URI`

**2. Render (Backend)**
- New Web Service → connect repo → root directory: `backend`
- Build: `npm install` | Start: `node server.js`
- Add all backend env vars in Render dashboard
- Set `CLIENT_URL` = your Vercel frontend URL

**3. Vercel (Frontend)**
- New Project → connect repo → root directory: `frontend`
- Build: `npm run build` | Output: `dist`
- Add env vars:
  ```
  VITE_API_URL=https://your-backend.onrender.com
  VITE_SOCKET_URL=https://your-backend.onrender.com
  ```

---

## 🤖 AI Features Detail

All AI calls use Groq's `llama-3.1-8b-instant` via raw HTTPS (no SDK) — same pattern as the Resend email integration. Gracefully returns a `503` with a setup message if `GROQ_API_KEY` is missing.

| Feature | Input | Output |
|---|---|---|
| Question Generator | `role`, `topic`, `count` | JSON array of questions |
| Code Reviewer | `code`, `language` | `verdict`, `strengths`, `issues[]`, `suggestions[]`, `complexity` |
| Interview Summary | chat transcript + code + rubric scores | `performanceSummary`, `strengths[]`, `weaknesses[]`, `codeQuality`, `communication`, `recommendation`, `overallScore` |

---

## 🔐 Role Permissions

| Feature | Interviewer | Candidate |
|---|---|---|
| Schedule interviews | ✅ | ❌ |
| Join interview room | ✅ | ✅ |
| Run code in editor | ✅ | ✅ |
| View Pipeline dashboard | ✅ | ❌ |
| Generate AI summary | ✅ | ❌ |
| Set hiring decision | ✅ | ❌ |
| Upload resume | ❌ | ✅ |

---

## 📄 License

MIT
