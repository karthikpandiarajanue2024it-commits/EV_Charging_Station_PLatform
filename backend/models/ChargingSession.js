const mongoose = require('mongoose');

const chargingSessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Station',
      required: true,
    },
    slotId: {
      type: String, // e.g. "SLOT_01"
      required: true,
    },
    chargerType: {
      type: String,
      enum: ['Type1', 'Type2', 'CCS', 'CHAdeMO', 'GB/T', 'Bharat AC', 'Bharat DC'],
      required: true,
    },
    startTime: {
      type: Date,
      required: true,
      index: true,
    },
    endTime: {
      type: Date,
      default: null,
    },
    duration: {
      type: Number, // in minutes
      default: 0,
    },
    energyConsumed: {
      type: Number, // in kWh
      default: 0,
    },
    cost: {
      type: Number, // in INR
      default: 0,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'interrupted'],
      default: 'active',
      index: true,
    },
    vehicleSOC: {
      start: { type: Number, min: 0, max: 100 }, // State of Charge %
      end: { type: Number, min: 0, max: 100 },
    },
    // Denormalized for analytics performance
    stationCity: String,
    dayOfWeek: Number, // 0=Sunday, 6=Saturday
    hourOfDay: Number, // 0-23
    weatherCondition: {
      type: String,
      enum: ['sunny', 'rainy', 'cloudy', 'foggy', 'extreme_heat'],
      default: 'sunny',
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for time-series analytics queries
chargingSessionSchema.index({ stationId: 1, startTime: -1 });
chargingSessionSchema.index({ stationId: 1, dayOfWeek: 1, hourOfDay: 1 });
chargingSessionSchema.index({ userId: 1, startTime: -1 });
chargingSessionSchema.index({ status: 1, startTime: -1 });

module.exports = mongoose.model('ChargingSession', chargingSessionSchema);
