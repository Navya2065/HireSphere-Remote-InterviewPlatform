const mongoose = require('mongoose');

// ── Rubric sub-schemas ────────────────────────────────────────────────────────

const criterionSchema = new mongoose.Schema(
  {
    name:   { type: String, required: true, trim: true },
    rating: { type: Number, min: 0, max: 5, default: 0 }, // 0 = not yet rated
    note:   { type: String, default: '', maxlength: 1000 },
  },
  { _id: false }
);

const rubricSchema = new mongoose.Schema(
  {
    criteria:      { type: [criterionSchema], default: [] },
    overallNotes:  { type: String, default: '', maxlength: 5000 },
    overallRating: { type: Number, min: 0, max: 5, default: 0 },
    submittedAt:   { type: Date, default: null },
  },
  { _id: false }
);

// ── Interview schema ─────────────────────────────────────────────────────────

const InterviewSchema = new mongoose.Schema(
  {
    title:           { type: String, required: true, trim: true },
    interviewerId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    candidateId:     { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    scheduledAt:     { type: Date, required: true },
    durationMinutes: { type: Number, default: 45, min: 5, max: 240 },
    roomId:          { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['scheduled', 'in-progress', 'completed', 'cancelled'],
      default: 'scheduled',
    },
    startedAt: { type: Date, default: null },
    endedAt:   { type: Date, default: null },
    notes:     { type: String, default: '' },

    // Interviewer-only evaluation rubric — never exposed to the candidate
    rubric: { type: rubricSchema, default: null },

    // Interviewer's hiring decision
    hiringDecision: {
      type: String,
      enum: ['pending', 'selected', 'rejected'],
      default: 'pending',
    },

    // AI-generated post-interview summary — interviewer only
    aiSummary: {
      generatedAt:        { type: Date,   default: null },
      performanceSummary: { type: String, default: '' },
      strengths:          { type: [String], default: [] },
      weaknesses:         { type: [String], default: [] },
      codeQuality:        { type: String, default: '' },
      communication:      { type: String, default: '' },
      recommendation:     { type: String, enum: ['Hire', 'Maybe', 'No', ''], default: '' },
      overallScore:       { type: Number, default: 0, min: 0, max: 10 },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Interview', InterviewSchema);
