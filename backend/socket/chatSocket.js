const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Interview = require('../models/Interview');
const Message = require('../models/Message');
const CodeSession = require('../models/CodeSession');

/**
 * Socket.io namespace for the interview room.
 *
 * Auth: client passes { auth: { token } } on io() — same JWT as REST.
 *
 * Chat events:
 *   c->s join-room      { roomId }
 *   c->s send-message   { roomId, text }
 *   c->s typing         { roomId }
 *   c->s typing-stop    { roomId }
 *   c->s leave-room     { roomId }
 *   s->c chat-message   { message }
 *   s->c peer-typing    { userId, name }
 *   s->c peer-stopped-typing { userId }
 *   s->c system         { type, payload }
 *
 * Code editor events:
 *   s->c code-state     { content, language }      // sent on join
 *   c->s code-update    { roomId, content, language }
 *   s->c code-update    { content, language, fromUserId }
 *   c->s code-language  { roomId, language }
 *   s->c code-language  { language, fromUserId }
 *   s->c code-output    { stdout, stderr, exitCode, ranBy, ranAt }
 *
 * Interview lifecycle:
 *   On first participant join, interview.status -> 'in-progress', startedAt = now.
 *   Interviewer can emit 'interview-end' to mark completed.
 *   s->c interview-update { status, startedAt, endedAt }
 */
module.exports = function registerChatSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Missing auth token'));
      const payload = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(payload.sub);
      if (!user) return next(new Error('User not found'));
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Unauthorized'));
    }
  });

  async function assertParticipant(socket, roomId) {
    const interview = await Interview.findOne({ roomId });
    if (!interview) return null;
    const isParticipant =
      interview.interviewerId.equals(socket.user._id) ||
      interview.candidateId.equals(socket.user._id);
    return isParticipant ? interview : null;
  }

  io.on('connection', (socket) => {
    socket.on('join-room', async ({ roomId }) => {
      try {
        const interview = await assertParticipant(socket, roomId);
        if (!interview)
          return socket.emit('system', { type: 'error', payload: 'Not a participant' });

        socket.join(roomId);
        socket.to(roomId).emit('system', {
          type: 'user-joined',
          payload: { userId: socket.user._id, name: socket.user.name, role: socket.user.role },
        });

        // First participant to land in the room flips status to in-progress.
        if (interview.status === 'scheduled') {
          interview.status = 'in-progress';
          interview.startedAt = new Date();
          await interview.save();
        }

        // Send current code state
        const session = await CodeSession.findOne({ roomId });
        socket.emit('code-state', {
          content: session?.content || '',
          language: session?.language || 'javascript',
        });

        // Send current interview lifecycle state to the joiner
        socket.emit('interview-update', {
          status: interview.status,
          startedAt: interview.startedAt,
          endedAt: interview.endedAt,
          durationMinutes: interview.durationMinutes,
        });

        // Notify others of the updated status (in case the status flipped above)
        socket.to(roomId).emit('interview-update', {
          status: interview.status,
          startedAt: interview.startedAt,
          endedAt: interview.endedAt,
          durationMinutes: interview.durationMinutes,
        });
      } catch (err) {
        socket.emit('system', { type: 'error', payload: err.message });
      }
    });

    // Interviewer-only: end the interview
    socket.on('interview-end', async ({ roomId }) => {
      try {
        const interview = await assertParticipant(socket, roomId);
        if (!interview) return;
        if (!interview.interviewerId.equals(socket.user._id)) {
          return socket.emit('system', { type: 'error', payload: 'Only the interviewer can end' });
        }
        interview.status = 'completed';
        interview.endedAt = new Date();
        await interview.save();

        io.to(roomId).emit('interview-update', {
          status: interview.status,
          startedAt: interview.startedAt,
          endedAt: interview.endedAt,
          durationMinutes: interview.durationMinutes,
        });
      } catch (err) {
        socket.emit('system', { type: 'error', payload: err.message });
      }
    });

    socket.on('send-message', async ({ roomId, text }) => {
      try {
        if (!text || !text.trim()) return;
        const interview = await assertParticipant(socket, roomId);
        if (!interview) return;

        const saved = await Message.create({
          roomId,
          senderId: socket.user._id,
          senderName: socket.user.name,
          text: text.trim().slice(0, 2000),
        });

        io.to(roomId).emit('chat-message', {
          message: {
            _id: saved._id,
            roomId,
            senderId: socket.user._id,
            senderName: socket.user.name,
            text: saved.text,
            createdAt: saved.createdAt,
          },
        });

        // A message implicitly ends typing
        socket.to(roomId).emit('peer-stopped-typing', { userId: socket.user._id.toString() });
      } catch (err) {
        socket.emit('system', { type: 'error', payload: err.message });
      }
    });

    // Typing indicators — broadcast to the other participants only, throttled client-side
    socket.on('typing', async ({ roomId }) => {
      const interview = await assertParticipant(socket, roomId);
      if (!interview) return;
      socket.to(roomId).emit('peer-typing', {
        userId: socket.user._id.toString(),
        name: socket.user.name,
      });
    });

    socket.on('typing-stop', async ({ roomId }) => {
      const interview = await assertParticipant(socket, roomId);
      if (!interview) return;
      socket.to(roomId).emit('peer-stopped-typing', {
        userId: socket.user._id.toString(),
      });
    });

    // Collaborative editor
    socket.on('code-update', async ({ roomId, content, language }) => {
      try {
        const interview = await assertParticipant(socket, roomId);
        if (!interview) return;

        const safeContent = typeof content === 'string' ? content.slice(0, 200_000) : '';
        const safeLanguage = typeof language === 'string' ? language.slice(0, 40) : 'javascript';

        await CodeSession.findOneAndUpdate(
          { roomId },
          { roomId, content: safeContent, language: safeLanguage, updatedBy: socket.user._id },
          { upsert: true, new: true }
        );

        socket.to(roomId).emit('code-update', {
          content: safeContent,
          language: safeLanguage,
          fromUserId: socket.user._id.toString(),
        });
      } catch (err) {
        socket.emit('system', { type: 'error', payload: err.message });
      }
    });

    socket.on('code-language', async ({ roomId, language }) => {
      try {
        const interview = await assertParticipant(socket, roomId);
        if (!interview) return;
        const safeLanguage = typeof language === 'string' ? language.slice(0, 40) : 'javascript';

        await CodeSession.findOneAndUpdate(
          { roomId },
          { $set: { language: safeLanguage, updatedBy: socket.user._id }, $setOnInsert: { roomId } },
          { upsert: true, new: true }
        );

        socket.to(roomId).emit('code-language', {
          language: safeLanguage,
          fromUserId: socket.user._id.toString(),
        });
      } catch (err) {
        socket.emit('system', { type: 'error', payload: err.message });
      }
    });

    socket.on('leave-room', ({ roomId }) => {
      socket.leave(roomId);
      socket.to(roomId).emit('system', {
        type: 'user-left',
        payload: { userId: socket.user._id, name: socket.user.name },
      });
      socket.to(roomId).emit('peer-stopped-typing', { userId: socket.user._id.toString() });
    });

    // Any abrupt disconnect — notify peers so their UI can react
    socket.on('disconnect', () => {
      for (const roomId of socket.rooms) {
        if (roomId === socket.id) continue;
        socket.to(roomId).emit('system', {
          type: 'user-left',
          payload: { userId: socket.user?._id, name: socket.user?.name, reason: 'disconnect' },
        });
        socket.to(roomId).emit('peer-stopped-typing', { userId: socket.user?._id?.toString() });
      }
    });
  });
};
