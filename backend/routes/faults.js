const express = require('express');
const router = express.Router();
const {
  reportFault,
  getStationFaults,
  resolveFault,
  upvoteFault,
  getAllFaults,
} = require('../controllers/faultController');
const { protect, authorize } = require('../middleware/auth');

router.get('/:stationId', getStationFaults);

router.use(protect);
router.post('/report', reportFault);
router.post('/:id/upvote', upvoteFault);

// Admin
router.get('/admin/all', authorize('admin'), getAllFaults);
router.put('/:id/resolve', authorize('admin'), resolveFault);

module.exports = router;
