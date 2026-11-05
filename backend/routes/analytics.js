const express = require('express');
const router = express.Router();
const {
  getPeakHours,
  getUsageTrends,
  getOccupancyRate,
  getWeatherImpact,
  getDashboardStats,
  getAvgWaitTime,
} = require('../controllers/analyticsController');
const { protect, authorize } = require('../middleware/auth');

// Public analytics (general)
router.get('/peak-hours', getPeakHours);
router.get('/usage-trends', getUsageTrends);
router.get('/occupancy-rate', getOccupancyRate);
router.get('/weather-impact', getWeatherImpact);
router.get('/avg-wait-time/:stationId', getAvgWaitTime);

// Admin dashboard
router.get('/dashboard-stats', protect, authorize('admin'), getDashboardStats);

module.exports = router;
