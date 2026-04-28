const express = require('express');
const { executeCode } = require('../controllers/codeController');
const { authRequired } = require('../middleware/authMiddleware');

const router = express.Router();

router.post('/execute', authRequired, executeCode);

module.exports = router;
