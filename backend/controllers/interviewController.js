const { v4: uuidv4 } = require('uuid');
const Interview = require('../models/Interview');
const User = require('../models/User');
const { sendDecisionEmail } = require('../utils/mailer');

// Interviewer only — schedule a new interview
exports.createInterview = async (req, res) => {
  const { title, candidateId, scheduledAt, durationMinutes } = req.body;
  if (!title || !candidateId || !scheduledAt) {
    return res.status(400).json({ message: 'title, candidateId, scheduledAt are required' });
  }

  const candidate = await User.findById(candidateId);
  if (!candidate || candidate.role !== 'candidate') {
    return res.status(400).json({ message: 'Invalid candidate' });
  }

  const interview = await Interview.create({
    title,
    interviewerId: req.user._id,
    candidateId,
    scheduledAt: new Date(scheduledAt),
    durationMinutes: durationMinutes || 45,
    roomId: uuidv4(),
    status: 'scheduled',
  });

  res.status(201).json({ interview });
};

// Either party — list your own interviews (paginated)
exports.listMyInterviews = async (req, res) => {
  const filter =
    req.user.role === 'interviewer'
      ? { interviewerId: req.user._id }
      : { candidateId: req.user._id };

  const page  = Math.max(1, parseInt(req.query.page)  || 1);
  const limit = Math.min(20, Math.max(1, parseInt(req.query.limit) || 10));
  const skip  = (page - 1) * limit;

  const [interviews, total] = await Promise.all([
    Interview.find(filter)
      .populate('interviewerId', 'name email role')
      .populate('candidateId',  'name email role')
      .sort({ scheduledAt: -1 })
      .skip(skip)
      .limit(limit),
    Interview.countDocuments(filter),
  ]);

  res.json({
    interviews,
    pagination: {
      total,
      page,
      limit,
      pages: Math.ceil(total / limit),
    },
  });
};

// Fetch a single interview — only participants can read it
exports.getInterview = async (req, res) => {
  const { id } = req.params;
  const interview = await Interview.findById(id)
    .populate('interviewerId', 'name email role')
    .populate('candidateId', 'name email role');

  if (!interview) return res.status(404).json({ message: 'Interview not found' });

  const isParticipant =
    interview.interviewerId._id.equals(req.user._id) ||
    interview.candidateId._id.equals(req.user._id);
  if (!isParticipant) return res.status(403).json({ message: 'Not a participant' });

  res.json({ interview });
};

// Look up the interview tied to a roomId — used when joining the room page
exports.getInterviewByRoom = async (req, res) => {
  const { roomId } = req.params;
  const interview = await Interview.findOne({ roomId })
    .populate('interviewerId', 'name email role')
    .populate('candidateId', 'name email role');

  if (!interview) return res.status(404).json({ message: 'Room not found' });

  const isParticipant =
    interview.interviewerId._id.equals(req.user._id) ||
    interview.candidateId._id.equals(req.user._id);
  if (!isParticipant) return res.status(403).json({ message: 'Not a participant' });

  res.json({ interview });
};

// Interviewer only — update status (start / complete / cancel) or notes
exports.updateInterview = async (req, res) => {
  const { id } = req.params;
  const { status, notes } = req.body;

  const interview = await Interview.findById(id);
  if (!interview) return res.status(404).json({ message: 'Interview not found' });
  if (!interview.interviewerId.equals(req.user._id)) {
    return res.status(403).json({ message: 'Only the interviewer can update' });
  }

  if (status) interview.status = status;
  if (typeof notes === 'string') interview.notes = notes;
  await interview.save();

  res.json({ interview });
};

// Interviewer only — set hiring decision (pending / selected / rejected)
// Automatically sends a notification email to the candidate when selected or rejected.
exports.updateHiringDecision = async (req, res) => {
  try {
    const { id } = req.params;
    const { decision } = req.body;

    if (!['pending', 'selected', 'rejected'].includes(decision)) {
      return res.status(400).json({ message: 'decision must be pending, selected, or rejected' });
    }

    const interview = await Interview.findById(id)
      .populate('candidateId',  'name email')
      .populate('interviewerId', 'name email');

    if (!interview) return res.status(404).json({ message: 'Interview not found' });
    if (!interview.interviewerId._id.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only the interviewer can set the hiring decision' });
    }

    const prevDecision = interview.hiringDecision;
    interview.hiringDecision = decision;
    await interview.save();

    // Send email when transitioning to selected or rejected (not on every save, not on "pending")
    const shouldEmail = (decision === 'selected' || decision === 'rejected') && decision !== prevDecision;
    if (shouldEmail && interview.candidateId?.email) {
      // Fire-and-forget — don't block the API response
      sendDecisionEmail(decision, {
        candidateName:  interview.candidateId.name,
        candidateEmail: interview.candidateId.email,
        interviewTitle: interview.title,
        interviewerName: interview.interviewerId?.name || 'HireSphere Team',
      }).catch(() => {}); // already logged inside mailer
    }

    res.json({
      hiringDecision: interview.hiringDecision,
      emailSent: shouldEmail && !!interview.candidateId?.email,
    });
  } catch (err) {
    console.error('updateHiringDecision error:', err);
    res.status(500).json({ message: 'Failed to update decision: ' + err.message });
  }
};

// Interviewer only — save/update the evaluation rubric
exports.saveRubric = async (req, res) => {
  try {
    const { id } = req.params;
    const { criteria, overallNotes, overallRating, submit } = req.body;

    const interview = await Interview.findById(id);
    if (!interview) return res.status(404).json({ message: 'Interview not found' });
    if (!interview.interviewerId.equals(req.user._id)) {
      return res.status(403).json({ message: 'Only the interviewer can save the rubric' });
    }

    // Sanitise criteria — only store name, rating, note
    const safeCriteria = Array.isArray(criteria)
      ? criteria.map((c) => ({
          name:   String(c.name  || '').slice(0, 100),
          rating: Math.min(5, Math.max(0, Number(c.rating) || 0)),
          note:   String(c.note  || '').slice(0, 1000),
        }))
      : (interview.rubric?.criteria || []);

    interview.rubric = {
      criteria:      safeCriteria,
      overallNotes:  String(overallNotes || '').slice(0, 5000),
      overallRating: Math.min(5, Math.max(0, Number(overallRating) || 0)),
      // Once submitted, the timestamp is locked in — subsequent saves don't re-set it
      submittedAt:   submit
        ? (interview.rubric?.submittedAt || new Date())
        : (interview.rubric?.submittedAt || null),
    };

    await interview.save();
    res.json({ rubric: interview.rubric });
  } catch (err) {
    console.error('saveRubric error:', err);
    res.status(500).json({ message: 'Failed to save rubric: ' + err.message });
  }
};
