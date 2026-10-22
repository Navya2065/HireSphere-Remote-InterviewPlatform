require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');

const connectDB = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const interviewRoutes = require('./routes/interviewRoutes');
const messageRoutes = require('./routes/messageRoutes');
const videoRoutes = require('./routes/videoRoutes');
const codeRoutes = require('./routes/codeRoutes');
const resumeRoutes = require('./routes/resumeRoutes');
const aiRoutes = require('./routes/aiRoutes');
const registerChatSocket = require('./socket/chatSocket');

const app = express();
const server = http.createServer(app);

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Core middleware
const allowedOrigins = [
  "http://localhost:5173",
  "https://hire-sphere-remote-interview-platform-exqhc1yq8.vercel.app"
];

app.use(cors({
  origin: allowedOrigins,
  credentials: true
}));
app.use(express.json({ limit: '20mb' })); // raised for base64 PDF uploads

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'remote-interview-platform', time: new Date().toISOString() });
});

// REST routes
app.use('/api/auth', authRoutes);
app.use('/api/interviews', interviewRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/video', videoRoutes);
app.use('/api/code', codeRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/ai', aiRoutes);

// Socket.io
const io = new Server(server, {
  cors: { origin: CLIENT_URL, credentials: true },
});
// Expose io so REST controllers (e.g. codeController) can broadcast to rooms.
app.set('io', io);
registerChatSocket(io);

// Error handler
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Server error' });
});

const PORT = process.env.PORT || 5000;

connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`API + Socket.io running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to MongoDB:', err.message);
    process.exit(1);
  });
