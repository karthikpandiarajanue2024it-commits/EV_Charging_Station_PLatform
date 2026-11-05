const mongoose = require('mongoose');

const chargerTypeSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: ['Type1', 'Type2', 'CCS', 'CHAdeMO', 'GB/T', 'Bharat AC', 'Bharat DC'],
      required: true,
    },
    powerKW: {
      type: Number,
      required: true, // e.g. 7.2, 22, 50, 150
    },
    count: {
      type: Number,
      required: true,
      min: 1,
    },
    available: {
      type: Number,
      default: function () {
        return this.count;
      },
    },
    pricePerKWh: {
      type: Number,
      required: true, // in INR
    },
  },
  { _id: false }
);

const slotSchema = new mongoose.Schema(
  {
    slot_id: { type: String, required: true },
    status: { type: String, enum: ['free', 'occupied'], default: 'free' },
    charger_type: { type: String, required: true },
    current_session_id: { type: mongoose.Schema.Types.ObjectId, ref: 'ChargingSession', default: null }
  },
  { _id: true }
);

const ratingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    score: {
      type: Number,
      min: 1,
      max: 5,
      required: true,
    },
    comment: String,
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const stationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Station name is required'],
      trim: true,
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: true,
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        required: true,
      },
    },
    address: {
      street: String,
      city: {
        type: String,
        required: true,
        index: true,
      },
      state: String,
      pincode: String,
      landmark: String,
    },
    chargerTypes: [chargerTypeSchema], // Embedded for fast reads
    slots: [slotSchema], // Unique slots for QR code scanning
    totalSlots: {
      type: Number,
      required: true,
      min: 1,
    },
    availableSlots: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ['active', 'maintenance', 'offline', 'coming_soon'],
      default: 'active',
      index: true,
    },
    operator: {
      name: String,
      contactPhone: String,
      email: String,
    },
    amenities: {
      type: [String],
      enum: ['parking', 'restroom', 'cafe', 'wifi', 'cctv', 'mall', 'petrol_station'],
    },
    operatingHours: {
      open: { type: String, default: '00:00' },
      close: { type: String, default: '23:59' },
      is24x7: { type: Boolean, default: true },
    },
    ratings: [ratingSchema], // Embedded ratings for locality
    ratingsSummary: {
      average: { type: Number, default: 0 },
      count: { type: Number, default: 0 },
    },
    currentOccupancyRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    predictedWaitTime: {
      type: Number,
      default: 0, // in minutes
    },
    images: [String], // URLs
    isVerified: {
      type: Boolean,
      default: false,
    },
    activeFaults: {
      type: Number,
      default: 0,
    },
    place_id: {
      type: String,
      unique: true,
      sparse: true,
    },
    phone: String,
    source: {
      type: String,
      default: 'system',
    },
    opening_hours: [String],
    googleRating: Number,
  },
  {
    timestamps: true,
  }
);

// Critical: 2dsphere index for geospatial queries
stationSchema.index({ location: '2dsphere' });
stationSchema.index({ status: 1, 'address.city': 1 });
stationSchema.index({ availableSlots: 1 });
stationSchema.index({ 'ratingsSummary.average': -1 });

// Update occupancy rate before save and generate slots if empty
stationSchema.pre('save', function () {
  if (this.isNew || (this.slots && this.slots.length === 0)) {
    const generatedSlots = [];
    let counter = 1;
    this.chargerTypes?.forEach(ct => {
      for(let i=0; i<ct.count; i++) {
        generatedSlots.push({
          slot_id: `SLOT_${String(counter).padStart(2, '0')}`,
          status: 'free',
          charger_type: ct.type,
          current_session_id: null
        });
        counter++;
      }
    });
    this.slots = generatedSlots;
  }

  if (this.totalSlots > 0) {
    const occupied = this.totalSlots - this.availableSlots;
    this.currentOccupancyRate = Math.round((occupied / this.totalSlots) * 100);
  }
});

module.exports = mongoose.model('Station', stationSchema);
