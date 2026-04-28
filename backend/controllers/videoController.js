const jwt = require('jsonwebtoken');
const Interview = require('../models/Interview');

// Returns a short-lived token + room info the frontend needs to join the video call.
// The Stream Video JS client uses a JWT signed with the app's API secret and a
// payload of { user_id, exp, iat }. If you prefer Agora, swap this out for an
// RtcTokenBuilder call — see https://docs.agora.io/en/video-calling/get-started/authentication-workflow
exports.issueVideoToken = async (req, res) => {
  const { roomId } = req.params;
  const interview = await Interview.findOne({ roomId });
  if (!interview) return res.status(404).json({ message: 'Room not found' });

  const isParticipant =
    interview.interviewerId.equals(req.user._id) || interview.candidateId.equals(req.user._id);
  if (!isParticipant) return res.status(403).json({ message: 'Not a participant' });

  const apiKey = process.env.STREAM_API_KEY;
  const apiSecret = process.env.STREAM_API_SECRET;
  if (!apiKey || !apiSecret) {
    return res
      .status(500)
      .json({ message: 'Video provider not configured. Set STREAM_API_KEY/STREAM_API_SECRET.' });
  }

  const now = Math.floor(Date.now() / 1000);
  const streamToken = jwt.sign(
    {
      user_id: req.user._id.toString(),
      iat: now,
      exp: now + 60 * 60, // 1h
    },
    apiSecret,
    { algorithm: 'HS256' }
  );

  res.json({
    provider: 'stream',
    apiKey,
    token: streamToken,
    callType: 'default',
    callId: roomId,
    user: {
      id: req.user._id.toString(),
      name: req.user.name,
      role: req.user.role,
    },
  });
};
