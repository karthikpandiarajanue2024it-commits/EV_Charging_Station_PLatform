const ChargingSession = require('../models/ChargingSession');
const Station = require('../models/Station');

/**
 * AGGREGATION PIPELINE: Peak Hours
 * Groups sessions by hour, calculates session count and avg duration
 */
const getPeakHours = async (req, res, next) => {
  try {
    const { stationId, days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const matchStage = {
      startTime: { $gte: startDate },
      status: 'completed',
    };
    if (stationId) matchStage.stationId = require('mongoose').Types.ObjectId.createFromHexString(stationId);

    const peakHoursData = await ChargingSession.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { $hour: { date: '$startTime', timezone: 'Asia/Kolkata' } },
          sessionCount: { $sum: 1 },
          avgDuration: { $avg: '$duration' },
          totalEnergy: { $sum: '$energyConsumed' },
        },
      },
      { $sort: { '_id': 1 } },
      {
        $project: {
          hour: '$_id',
          sessionCount: 1,
          avgDuration: { $round: ['$avgDuration', 1] },
          totalEnergy: { $round: ['$totalEnergy', 2] },
          _id: 0,
        },
      },
    ]);

    // Fill in missing hours with 0
    const fullDayData = Array.from({ length: 24 }, (_, hour) => {
      const found = peakHoursData.find((d) => d.hour === hour);
      return found || { hour, sessionCount: 0, avgDuration: 0, totalEnergy: 0 };
    });

    res.json({ success: true, data: fullDayData, period: `Last ${days} days` });
  } catch (error) {
    next(error);
  }
};

/**
 * AGGREGATION PIPELINE: Day-wise Usage Trends
 */
const getUsageTrends = async (req, res, next) => {
  try {
    const { stationId, days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const matchStage = {
      startTime: { $gte: startDate },
      status: 'completed',
    };
    if (stationId) {
      const mongoose = require('mongoose');
      matchStage.stationId = mongoose.Types.ObjectId.createFromHexString(stationId);
    }

    const trends = await ChargingSession.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: {
            $dateToString: {
              format: '%Y-%m-%d',
              date: '$startTime',
              timezone: 'Asia/Kolkata',
            },
          },
          totalSessions: { $sum: 1 },
          totalEnergy: { $sum: '$energyConsumed' },
          totalRevenue: { $sum: '$cost' },
          avgDuration: { $avg: '$duration' },
          uniqueUsers: { $addToSet: '$userId' },
        },
      },
      { $sort: { '_id': 1 } },
      {
        $project: {
          date: '$_id',
          totalSessions: 1,
          totalEnergy: { $round: ['$totalEnergy', 2] },
          totalRevenue: { $round: ['$totalRevenue', 2] },
          avgDuration: { $round: ['$avgDuration', 1] },
          uniqueUsers: { $size: '$uniqueUsers' },
          _id: 0,
        },
      },
    ]);

    res.json({ success: true, data: trends });
  } catch (error) {
    next(error);
  }
};

/**
 * AGGREGATION PIPELINE: Occupancy Rate per Station
 */
const getOccupancyRate = async (req, res, next) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const occupancyData = await ChargingSession.aggregate([
      {
        $match: {
          startTime: { $gte: startDate },
          status: 'completed',
        },
      },
      {
        $lookup: {
          from: 'stations',
          localField: 'stationId',
          foreignField: '_id',
          as: 'station',
        },
      },
      { $unwind: '$station' },
      {
        $group: {
          _id: '$stationId',
          stationName: { $first: '$station.name' },
          city: { $first: '$station.address.city' },
          totalSlots: { $first: '$station.totalSlots' },
          totalSessions: { $sum: 1 },
          avgDuration: { $avg: '$duration' },
        },
      },
      {
        $addFields: {
          occupancyRate: {
            $round: [
              {
                $multiply: [
                  { $divide: ['$avgDuration', 1440] }, // 1440 mins per day
                  100,
                ],
              },
              1,
            ],
          },
        },
      },
      { $sort: { occupancyRate: -1 } },
    ]);

    res.json({ success: true, data: occupancyData });
  } catch (error) {
    next(error);
  }
};

/**
 * AGGREGATION PIPELINE: Weather Impact Analysis
 */
const getWeatherImpact = async (req, res, next) => {
  try {
    const weatherData = await ChargingSession.aggregate([
      { $match: { status: 'completed' } },
      {
        $group: {
          _id: '$weatherCondition',
          totalSessions: { $sum: 1 },
          avgDuration: { $avg: '$duration' },
          avgEnergy: { $avg: '$energyConsumed' },
        },
      },
      {
        $project: {
          weather: '$_id',
          totalSessions: 1,
          avgDuration: { $round: ['$avgDuration', 1] },
          avgEnergy: { $round: ['$avgEnergy', 2] },
          _id: 0,
        },
      },
      { $sort: { totalSessions: -1 } },
    ]);

    res.json({ success: true, data: weatherData });
  } catch (error) {
    next(error);
  }
};

/**
 * AGGREGATION PIPELINE: Global Dashboard Stats
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const [sessionStats, stationStats] = await Promise.all([
      ChargingSession.aggregate([
        {
          $facet: {
            total: [{ $count: 'count' }],
            active: [{ $match: { status: 'active' } }, { $count: 'count' }],
            today: [
              {
                $match: {
                  startTime: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
                },
              },
              { $count: 'count' },
            ],
            totals: [
              { $match: { status: 'completed' } },
              {
                $group: {
                  _id: null,
                  totalEnergy: { $sum: '$energyConsumed' },
                  totalRevenue: { $sum: '$cost' },
                  avgDuration: { $avg: '$duration' },
                },
              },
            ],
          },
        },
      ]),
      Station.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalSlots: { $sum: '$totalSlots' },
            availableSlots: { $sum: '$availableSlots' },
          },
        },
      ]),
    ]);

    const sessions = sessionStats[0];
    res.json({
      success: true,
      data: {
        totalSessions: sessions.total[0]?.count || 0,
        activeSessions: sessions.active[0]?.count || 0,
        todaySessions: sessions.today[0]?.count || 0,
        totalEnergy: Math.round(sessions.totals[0]?.totalEnergy || 0),
        totalRevenue: Math.round(sessions.totals[0]?.totalRevenue || 0),
        avgSessionDuration: Math.round(sessions.totals[0]?.avgDuration || 0),
        stationStats,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * AGGREGATION: Average Wait Time per station
 */
const getAvgWaitTime = async (req, res, next) => {
  try {
    const { stationId } = req.params;
    const mongoose = require('mongoose');

    const result = await ChargingSession.aggregate([
      {
        $match: {
          stationId: mongoose.Types.ObjectId.createFromHexString(stationId),
          status: 'completed',
          duration: { $gt: 0 },
        },
      },
      {
        $group: {
          _id: '$hourOfDay',
          avgWaitTime: { $avg: '$duration' },
          sessionCount: { $sum: 1 },
        },
      },
      { $sort: { '_id': 1 } },
      {
        $project: {
          hour: '$_id',
          avgWaitTime: { $round: ['$avgWaitTime', 1] },
          sessionCount: 1,
          _id: 0,
        },
      },
    ]);

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getPeakHours,
  getUsageTrends,
  getOccupancyRate,
  getWeatherImpact,
  getDashboardStats,
  getAvgWaitTime,
};
