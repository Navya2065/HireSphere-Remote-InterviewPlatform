const express = require('express');
const { signup, login, me, listCandidates } = require('../controllers/authController');
const { authRequired } = require('../middleware/authMiddleware');
const { requireRole } = require('../middleware/roleMiddleware');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);
router.get('/me', authRequired, me);
router.get('/candidates', authRequired, requireRole('interviewer'), listCandidates);

module.exports = router;
