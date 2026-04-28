# HireSphere

A full-stack interview platform where **interviewers** schedule sessions and
conduct them with **candidates** over real-time video, chat, and a collaborative
code editor with one-click compilation — all in a dark, neon-accented UI.

- **Frontend:** React (Vite) + Tailwind CSS + React Router + Lucide icons
- **Backend:** Node.js + Express + MongoDB (Mongoose) + JWT
- **Real-time chat:** Socket.io
- **Video calling:** [Stream Video React SDK](https://getstream.io/video/docs/react/) (swappable with Agora RTC)
- **Collaborative code editor:** Monaco (`@monaco-editor/react`) synced over the same Socket.io connection, persisted per room in MongoDB
- **Code execution:** [Piston](https://github.com/engineer-man/piston) proxy (`POST /api/code/execute`) runs JS/TS/Python/Java/C++/C#/Go/Rust in a sandbox, broadcasts output to both participants

---

## Folder structure

```
remote-interview-platform/
├── backend/
│   ├── package.json
│   ├── .env.example
│   ├── server.js
│   ├── config/
│   │   └── db.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Interview.js
│   │   ├── Message.js
│   │   └── CodeSession.js           # shared editor state per room
│   ├── middleware/
│   │   ├── authMiddleware.js        # JWT verification -> req.user
│   │   └── roleMiddleware.js        # requireRole('interviewer'|'candidate')
│   ├── controllers/
│   │   ├── authController.js        # signup, login, me, listCandidates
│   │   ├── interviewController.js   # CRUD for interviews
│   │   ├── messageController.js     # chat history fetch
│   │   ├── videoController.js       # issues Stream video token
│   │   └── codeController.js        # Piston proxy for code execution
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── interviewRoutes.js
│   │   ├── messageRoutes.js
│   │   ├── videoRoutes.js
│   │   └── codeRoutes.js            # POST /api/code/execute
│   └── socket/
│       └── chatSocket.js            # Socket.io room + message handlers
│
└── frontend/
    ├── package.json
    ├── .env.example
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── index.html
    └── src/
        ├── main.jsx
        ├── App.jsx                  # router
        ├── index.css                # Tailwind directives
        ├── api/axios.js             # pre-authed axios instance
        ├── context/AuthContext.jsx  # login / signup / me / logout
        ├── components/
        │   ├── Navbar.jsx
        │   ├── ProtectedRoute.jsx
        │   └── CodeEditor.jsx        # Monaco + live sync over Socket.io
        └── pages/
            ├── Landing.jsx
            ├── Login.jsx
            ├── Signup.jsx
            ├── Dashboard.jsx
            ├── ScheduleInterview.jsx
            ├── InterviewList.jsx
            └── InterviewRoom.jsx    # video (Stream) + chat (Socket.io)
```

---

## REST API

All protected routes require `Authorization: Bearer <token>`.

### Auth
| Method | Path                    | Access          | Purpose                          |
| ------ | ----------------------- | --------------- | -------------------------------- |
| POST   | `/api/auth/signup`      | public          | Create account + returns JWT     |
| POST   | `/api/auth/login`       | public          | Returns JWT                      |
| GET    | `/api/auth/me`          | any auth user   | Current user                     |
| GET    | `/api/auth/candidates`  | interviewer     | List candidates for scheduling   |

### Interviews
| Method | Path                          | Access          | Purpose                                      |
| ------ | ----------------------------- | --------------- | -------------------------------------------- |
| GET    | `/api/interviews`             | any auth user   | List interviews relevant to the caller       |
| POST   | `/api/interviews`             | interviewer     | Create a new interview slot (generates roomId) |
| GET    | `/api/interviews/:id`         | participant     | Fetch single interview                       |
| GET    | `/api/interviews/room/:roomId`| participant     | Resolve interview by roomId                  |
| PATCH  | `/api/interviews/:id`         | owning interviewer | Update status / notes                    |

### Chat
| Method | Path                      | Access      | Purpose                  |
| ------ | ------------------------- | ----------- | ------------------------ |
| GET    | `/api/messages/:roomId`   | participant | Load chat history        |

### Video
| Method | Path                      | Access      | Purpose                                                |
| ------ | ------------------------- | ----------- | ------------------------------------------------------ |
| GET    | `/api/video/token/:roomId`| participant | Issue a Stream video JWT + apiKey + callId for joining |

### Code execution
| Method | Path                      | Access      | Purpose                                                       |
| ------ | ------------------------- | ----------- | ------------------------------------------------------------- |
| POST   | `/api/code/execute`       | participant | Run `{ roomId, language, content }` via Piston, return `{ stdout, stderr, exitCode }`, broadcast to room over socket |

---

## Socket.io events

Client connects with `io(SOCKET_URL, { auth: { token } })`.

Client → Server
- `join-room    { roomId }`
- `send-message { roomId, text }`
- `code-update  { roomId, content, language }`  *(collaborative editor)*
- `code-language { roomId, language }`           *(language switch only)*
- `leave-room   { roomId }`

Server → Client
- `chat-message  { message }`                           — broadcast to room
- `code-state    { content, language }`                 — sent once on join
- `code-update   { content, language, fromUserId }`     — broadcast to others
- `code-language { language, fromUserId }`              — broadcast to others
- `code-output   { stdout, stderr, exitCode, ranBy, ranAt }` — broadcast after `/api/code/execute`
- `system        { type, payload }`                     — `user-joined`, `user-left`, `error`

---

## Environment variables

`backend/.env`
```
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/remote_interview_platform
JWT_SECRET=replace_with_a_long_random_secret
JWT_EXPIRES_IN=7d
CLIENT_URL=http://localhost:5173

# Stream Video
STREAM_API_KEY=your_stream_api_key
STREAM_API_SECRET=your_stream_api_secret

# (optional) Agora alternative
AGORA_APP_ID=your_agora_app_id
AGORA_APP_CERTIFICATE=your_agora_app_certificate
```

`frontend/.env`
```
VITE_API_URL=http://localhost:5000
VITE_SOCKET_URL=http://localhost:5000
```

---

## Running locally

Prereqs: Node 18+, a local MongoDB instance, and a Stream account for video credentials (free tier works).

```bash
# 1) Backend
cd backend
cp .env.example .env        # fill in MONGO_URI, JWT_SECRET, STREAM_API_KEY, STREAM_API_SECRET
npm install
npm run dev                 # starts http://localhost:5000

# 2) Frontend (new terminal)
cd frontend
cp .env.example .env
npm install
npm run dev                 # starts http://localhost:5173
```

Then:
1. Sign up one **interviewer** and one **candidate** (separate browsers / incognito).
2. As the interviewer, go to **Schedule** and create a slot assigned to the candidate.
3. Both open **Interviews → Join room** at the scheduled time.
4. The video stage (Stream) and chat sidebar (Socket.io) appear side-by-side.

---

## Swapping Stream for Agora

The boundary is a single endpoint — `GET /api/video/token/:roomId`. To switch to
Agora:

1. In `backend/controllers/videoController.js`, replace the `jwt.sign(...)` call with
   [`RtcTokenBuilder.buildTokenWithUid(...)`](https://docs.agora.io/en/video-calling/get-started/authentication-workflow)
   from the `agora-access-token` npm package, using `AGORA_APP_ID` and
   `AGORA_APP_CERTIFICATE`. Return `{ provider: 'agora', appId, token, channel: roomId, uid }`.
2. In `frontend/src/pages/InterviewRoom.jsx`, swap the `@stream-io/video-react-sdk`
   imports for `agora-rtc-react` (or the raw `agora-rtc-sdk-ng`), and use the
   returned `{ appId, channel, token, uid }` to `client.join(...)`.

The rest of the app (auth, scheduling, chat, routing) is provider-agnostic.

---

## Notes

- Room IDs are generated server-side as UUIDs on interview creation — clients never choose them.
- Chat messages are persisted for up to 500 per room; adjust the limit in `messageController.js`.
- Socket.io authenticates using the same JWT as REST, so there's only one token to manage.
- Role-based access: only interviewers can hit `POST /api/interviews` and `/schedule`; candidates are redirected.
