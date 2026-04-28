const express = require('express');
const { issueVideoToken } = require('../controllers/videoController');
const { authRequired } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/token/:roomId', authRequired, issueVideoToken);

module.exports = router;
