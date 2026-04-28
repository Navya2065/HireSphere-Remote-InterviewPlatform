const express = require('express');
const router  = express.Router();

const { authRequired }  = require('../middleware/authMiddleware');
const { requireRole }   = require('../middleware/roleMiddleware');
const resumeController  = require('../controllers/resumeController');

// Candidate: upload their own resume
router.post('/upload', authRequired, requireRole('candidate'), resumeController.uploadResume);

// Candidate: list their own resumes
router.get('/my', authRequired, requireRole('candidate'), resumeController.getMyResumes);

// Interviewer: list all resumes for a specific candidate
router.get('/candidate/:candidateId', authRequired, requireRole('interviewer'), resumeController.getCandidateResumes);

// Stream the actual PDF file
router.get('/:id/file', authRequired, resumeController.getResumeFile);

// Delete a resume (candidate, own only)
router.delete('/:id', authRequired, requireRole('candidate'), resumeController.deleteResume);

// Get single resume metadata
router.get('/:id', authRequired, resumeController.getResume);

module.exports = router;
