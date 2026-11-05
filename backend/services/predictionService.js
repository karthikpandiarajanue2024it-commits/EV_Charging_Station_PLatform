const ChargingSession = require('../models/ChargingSession');
const Station = require('../models/Station');

/**
 * Predict wait time for a station using historical aggregation.
 * Logic: Find avg session duration for same station + same day-of-week + same hour (±2hrs)
 * then factor in current occupancy.
 */
const predictWaitTime = async (stationId) => {
  const mongoose = require('mongoose');
  const now = new Date();
  const currentHour = now.getHours();
  const currentDay = now.getDay();

  // Look at sessions in ±2 hour window for the same day of week
  const hourRange = [
    (currentHour - 2 + 24) % 24,
    (currentHour - 1 + 24) % 24,
    currentHour,
    (currentHour + 1) % 24,
    (currentHour + 2) % 24,
  ];

  const historicalData = await ChargingSession.aggregate([
    {
      $match: {
        stationId: mongoose.Types.ObjectId.createFromHexString(stationId.toString()),
        status: 'completed',
        dayOfWeek: currentDay,
        hourOfDay: { $in: hourRange },
        duration: { $gt: 0 },
      },
    },
    {
      $group: {
        _id: null,
        avgDuration: { $avg: '$duration' },
        sessionCount: { $sum: 1 },
        maxDuration: { $max: '$duration' },
      },
    },
  ]);

  const station = await Station.findById(stationId).select(
    'totalSlots availableSlots currentOccupancyRate'
  );

  if (!station) return { waitMinutes: 0, confidence: 'low', currentOccupancy: 0 };

  const occupancyRate = station.currentOccupancyRate || 0;
  const availableSlots = station.availableSlots || 0;

  // If slots are available, no wait
  if (availableSlots > 0) {
    return {
      waitMinutes: 0,
      confidence: 'high',
      currentOccupancy: occupancyRate,
    };
  }

  // No historical data → use a formula-based estimate
  if (!historicalData.length) {
    const estimatedWait = Math.round(occupancyRate * 0.5); // rough estimate
    return {
      waitMinutes: estimatedWait,
      confidence: 'low',
      currentOccupancy: occupancyRate,
    };
  }

  const { avgDuration, sessionCount } = historicalData[0];

  // More sessions = higher confidence
  const confidence =
    sessionCount > 50 ? 'high' : sessionCount > 10 ? 'medium' : 'low';

  // Wait time = average session duration remaining (approx half of remaining session)
  const waitMinutes = Math.round(avgDuration * (occupancyRate / 100) * 0.6);

  return { waitMinutes, confidence, currentOccupancy: occupancyRate };
};

/**
 * Suggest best charging hours (occupancy < 30% threshold)
 * Returns top 3 "green" hours sorted by lowest predicted occupancy
 */
const getBestChargingTime = async (stationId) => {
  const mongoose = require('mongoose');

  const hourlyStats = await ChargingSession.aggregate([
    {
      $match: {
        stationId: mongoose.Types.ObjectId.createFromHexString(stationId.toString()),
        status: 'completed',
      },
    },
    {
      $group: {
        _id: '$hourOfDay',
        sessionCount: { $sum: 1 },
        avgDuration: { $avg: '$duration' },
      },
    },
    { $sort: { sessionCount: 1 } },
  ]);

  // Hours with no sessions = best times
  const allHours = Array.from({ length: 24 }, (_, h) => h);
  const sessionHours = hourlyStats.map((s) => s._id);
  const quietHours = allHours.filter((h) => !sessionHours.includes(h));

  if (quietHours.length > 0) {
    return quietHours.slice(0, 5).map((h) => ({
      hour: h,
      label: `${h.toString().padStart(2, '0')}:00`,
      busyness: 'low',
    }));
  }

  // All hours have some sessions — pick the 5 quietest
  return hourlyStats.slice(0, 5).map((s) => ({
    hour: s._id,
    label: `${s._id.toString().padStart(2, '0')}:00`,
    sessionCount: s.sessionCount,
    busyness: s.sessionCount < 5 ? 'low' : s.sessionCount < 15 ? 'medium' : 'high',
  }));
};

module.exports = { predictWaitTime, getBestChargingTime };
