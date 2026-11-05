const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [50, 'Name cannot exceed 50 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false,
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    phone: {
      type: String,
      match: [/^[6-9]\d{9}$/, 'Please provide a valid Indian mobile number'],
    },
    vehicleInfo: {
      model: String,
      batteryCapacity: Number, // in kWh
      chargerType: {
        type: String,
        enum: ['Type1', 'Type2', 'CCS', 'CHAdeMO', 'GB/T', 'Bharat AC', 'Bharat DC'],
      },
    },
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point',
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
        default: [80.2707, 13.0827], // Default: Chennai
      },
    },
    savedStations: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Station',
      },
    ],
    totalSessions: {
      type: Number,
      default: 0,
    },
    totalEnergyConsumed: {
      type: Number,
      default: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// 2dsphere index for geospatial queries
userSchema.index({ location: '2dsphere' });
// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
