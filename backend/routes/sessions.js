const express = require('express');
const router = express.Router();
const {
  startSession,
  endSession,
  getSessionHistory,
  predictWaitTime,
  getActiveSession,
  getAllSessions,
} = require('../controllers/sessionController');
const { protect, authorize } = require('../middleware/auth');

router.get('/predict-wait/:stationId', predictWaitTime);

router.use(protect); // All routes below require auth

router.post('/start', startSession);
router.put('/:id/end', endSession);
router.get('/history', getSessionHistory);
router.get('/active', getActiveSession);

// Admin
router.get('/admin/all', authorize('admin'), getAllSessions);

module.exports = router;
