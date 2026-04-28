const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    strengths:    [String],
    weaknesses:   [String],
    improvements: [String],
    roleScore:    { type: Number, min: 1, max: 10 },
    roleName:     { type: String, default: '' },
    summary:      { type: String, default: '' },
    analyzedAt:   { type: Date },
  },
  { _id: false }
);

const resumeSchema = new mongoose.Schema(
  {
    candidateId:   { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    originalName:  { type: String, required: true },
    storedPath:    { type: String, required: true },
    extractedText: { type: String, default: '' },
    feedback:      { type: feedbackSchema, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Resume', resumeSchema);
