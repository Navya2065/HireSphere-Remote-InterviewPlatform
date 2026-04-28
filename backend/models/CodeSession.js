const mongoose = require('mongoose');

// One record per interview room — holds the shared editor state.
// Upserted on every code-update so a late-joining or refreshing participant
// can resume exactly where the other person left off.
const CodeSessionSchema = new mongoose.Schema(
  {
    roomId: { type: String, required: true, unique: true, index: true },
    language: { type: String, default: 'javascript' },
    content: { type: String, default: '' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CodeSession', CodeSessionSchema);
