const mongoose = require('mongoose');

// Pre-computed analytics cache to avoid heavy real-time aggregations
const analyticsCacheSchema = new mongoose.Schema(
  {
    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Station',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    // Hourly occupancy [0..23]
    hourlyOccupancy: {
      type: [Number],
      default: new Array(24).fill(0),
    },
    // Hourly session count [0..23]
    hourlySessionCount: {
      type: [Number],
      default: new Array(24).fill(0),
    },
    // Hourly avg wait time [0..23] in minutes
    hourlyAvgWaitTime: {
      type: [Number],
      default: new Array(24).fill(0),
    },
    peakHour: {
      type: Number,
      default: 0,
    },
    avgWaitTime: {
      type: Number,
      default: 0,
    },
    avgSessionDuration: {
      type: Number,
      default: 0,
    },
    totalSessions: {
      type: Number,
      default: 0,
    },
    totalEnergyDispensed: {
      type: Number,
      default: 0,
    },
    weatherCondition: {
      type: String,
      default: 'sunny',
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

analyticsCacheSchema.index({ stationId: 1, date: -1 }, { unique: true });
analyticsCacheSchema.index({ date: -1 });

module.exports = mongoose.model('AnalyticsCache', analyticsCacheSchema);
