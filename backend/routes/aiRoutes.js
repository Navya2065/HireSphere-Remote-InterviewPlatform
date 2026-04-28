const express    = require('express');
const router     = express.Router();
const { authRequired } = require('../middleware/authMiddleware');
const { requireRole }  = require('../middleware/roleMiddleware');
const {
  generateQuestions,
  reviewCode,
  generateInterviewSummary,
  getInterviewSummary,
} = require('../controllers/aiController');

// Interviewer-only generation endpoints
router.post('/questions',           authRequired, requireRole('interviewer'), generateQuestions);
router.post('/review-code',         authRequired, requireRole('interviewer'), reviewCode);
router.post('/summary/:interviewId', authRequired, requireRole('interviewer'), generateInterviewSummary);

// Both parties can read the saved summary
router.get('/summary/:interviewId', authRequired, getInterviewSummary);

module.exports = router;
