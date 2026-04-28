const Message = require('../models/Message');
const Interview = require('../models/Interview');

async function assertParticipant(user, roomId) {
  const interview = await Interview.findOne({ roomId });
  if (!interview) return { ok: false, code: 404, message: 'Room not found' };
  const isParticipant =
    interview.interviewerId.equals(user._id) || interview.candidateId.equals(user._id);
  if (!isParticipant) return { ok: false, code: 403, message: 'Not a participant' };
  return { ok: true, interview };
}

exports.listMessages = async (req, res) => {
  const { roomId } = req.params;
  const check = await assertParticipant(req.user, roomId);
  if (!check.ok) return res.status(check.code).json({ message: check.message });

  const messages = await Message.find({ roomId }).sort({ createdAt: 1 }).limit(500);
  res.json({ messages });
};
