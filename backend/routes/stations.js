const express = require('express');
const router = express.Router();
const {
  getNearbyStations,
  getAllStations,
  getStation,
  createStation,
  updateStation,
  deleteStation,
  rateStation,
} = require('../controllers/stationController');
const { protect, authorize } = require('../middleware/auth');

// Public
router.get('/nearby', getNearbyStations);
router.get('/', getAllStations);
router.get('/:id', getStation);

// Private
router.post('/:id/rate', protect, rateStation);

// Admin only
router.post('/', protect, authorize('admin'), createStation);
router.put('/:id', protect, authorize('admin'), updateStation);
router.delete('/:id', protect, authorize('admin'), deleteStation);

module.exports = router;
