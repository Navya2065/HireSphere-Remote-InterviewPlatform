const express = require('express');
const {
  createInterview,
  listMyInterviews,
  getInterview,
  getInterviewByRoom,
  updateInterview,
  saveRubric,
  updateHiringDecision,
} = require('../controllers/interviewController');
const { authRequired } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(authRequired);

router.get('/', listMyInterviews);
router.post('/', requireRole('interviewer'), createInterview);
router.get('/room/:roomId', getInterviewByRoom);
router.get('/:id', getInterview);
router.patch('/:id', requireRole('interviewer'), updateInterview);
router.patch('/:id/rubric',    requireRole('interviewer'), saveRubric);
router.patch('/:id/decision',  requireRole('interviewer'), updateHiringDecision);

module.exports = router;
