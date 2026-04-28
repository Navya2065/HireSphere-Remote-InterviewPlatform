const express = require('express');
const { listMessages } = require('../controllers/messageController');
const { authRequired } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/:roomId', authRequired, listMessages);

module.exports = router;
