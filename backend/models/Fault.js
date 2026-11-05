const mongoose = require('mongoose');

const faultSchema = new mongoose.Schema(
  {
    stationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Station',
      required: true,
      index: true,
    },
    reportedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: [
        'charger_not_working',
        'cable_damaged',
        'payment_issue',
        'display_not_working',
        'app_connectivity',
        'physical_damage',
        'other',
      ],
      required: true,
    },
    severity: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      default: 'medium',
    },
    description: {
      type: String,
      required: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
    },
    chargerType: String, // Which charger type was affected
    status: {
      type: String,
      enum: ['open', 'in_progress', 'resolved', 'rejected'],
      default: 'open',
      index: true,
    },
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    resolvedAt: Date,
    resolutionNote: String,
    upvotes: {
      type: Number,
      default: 0,
    },
    upvotedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

faultSchema.index({ stationId: 1, status: 1 });
faultSchema.index({ createdAt: -1 });
faultSchema.index({ severity: 1, status: 1 });

module.exports = mongoose.model('Fault', faultSchema);
