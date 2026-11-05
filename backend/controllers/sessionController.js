const ChargingSession = require('../models/ChargingSession');
const Station = require('../models/Station');
const User = require('../models/User');
const predictionService = require('../services/predictionService');

// @desc    Start a charging session
// @route   POST /api/sessions/start
// @access  Private
const startSession = async (req, res, next) => {
  try {
    const { stationId, slotId, chargerType, vehicleSOCStart } = req.body;

    const station = await Station.findById(stationId);
    if (!station) {
      return res.status(404).json({ success: false, message: 'Station not found' });
    }

    let targetSlot = null;
    let actualChargerType = chargerType;

    if (slotId) {
      targetSlot = station.slots.find(s => s.slot_id === slotId);
      if (!targetSlot) {
         return res.status(404).json({ success: false, message: 'Slot not found' });
      }
      if (targetSlot.status === 'occupied') {
         return res.status(400).json({ success: false, message: 'Slot is currently occupied' });
      }
      actualChargerType = targetSlot.charger_type;
    } else {
      // Legacy support: finding a free slot
      targetSlot = station.slots.find(s => s.status === 'free' && (!chargerType || s.charger_type === chargerType));
      if (!targetSlot) {
        targetSlot = station.slots.find(s => s.status === 'free');
      }
    }

    if (!targetSlot || station.availableSlots <= 0) {
      return res.status(400).json({ success: false, message: 'No slots available at this station' });
    }

    // Check if user already has an active session
    const existingSession = await ChargingSession.findOne({
      userId: req.user._id,
      status: 'active',
    });

    if (existingSession) {
      return res.status(400).json({
        success: false,
        message: 'You already have an active charging session',
      });
    }

    const now = new Date();
    const session = await ChargingSession.create({
      userId: req.user._id,
      stationId,
      slotId: targetSlot.slot_id,
      chargerType: actualChargerType,
      startTime: now,
      status: 'active',
      vehicleSOC: { start: vehicleSOCStart || 0 },
      stationCity: station.address.city,
      dayOfWeek: now.getDay(),
      hourOfDay: now.getHours(),
    });

    // Update the specific slot and station available count
    targetSlot.status = 'occupied';
    targetSlot.current_session_id = session._id;
    station.availableSlots -= 1;
    await station.save(); // pre-save hook handles currentOccupancyRate calculation

    await session.populate('stationId', 'name address');
    res.status(201).json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};

// @desc    End a charging session
// @route   PUT /api/sessions/:id/end
// @access  Private
const endSession = async (req, res, next) => {
  try {
    const { vehicleSOCEnd } = req.body;
    const session = await ChargingSession.findById(req.params.id);

    if (!session) {
      return res.status(404).json({ success: false, message: 'Session not found' });
    }

    if (session.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' });
    }

    if (session.status !== 'active') {
      return res.status(400).json({ success: false, message: 'Session is not active' });
    }

    const endTime = new Date();
    const duration = Math.round((endTime - session.startTime) / 60000); // minutes

    // Get charger power to calculate energy
    const station = await Station.findById(session.stationId);
    const charger = station?.chargerTypes?.find((c) => c.type === session.chargerType);
    const powerKW = charger?.powerKW || 7.2;
    const pricePerKWh = charger?.pricePerKWh || 12;

    const energyConsumed = parseFloat(((powerKW * duration) / 60).toFixed(2));
    const cost = parseFloat((energyConsumed * pricePerKWh).toFixed(2));

    session.endTime = endTime;
    session.duration = duration;
    session.energyConsumed = energyConsumed;
    session.cost = cost;
    session.status = 'completed';
    if (vehicleSOCEnd) session.vehicleSOC.end = vehicleSOCEnd;

    await session.save();

    // Restore slot and update station stats
    if (station) {
      if (session.slotId) {
        const targetSlot = station.slots.find(s => s.slot_id === session.slotId);
        if (targetSlot) {
          targetSlot.status = 'free';
          targetSlot.current_session_id = null;
        }
      }
      station.availableSlots += 1;
      await station.save();
    }

    await User.findByIdAndUpdate(req.user._id, {
      $inc: { totalSessions: 1, totalEnergyConsumed: energyConsumed },
    });

    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};

// @desc    Get session history for logged-in user
// @route   GET /api/sessions/history
// @access  Private
const getSessionHistory = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const filter = { userId: req.user._id };
    if (status) filter.status = status;

    const sessions = await ChargingSession.find(filter)
      .populate('stationId', 'name address')
      .sort({ startTime: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await ChargingSession.countDocuments(filter);

    res.json({
      success: true,
      count: sessions.length,
      total,
      pages: Math.ceil(total / limit),
      data: sessions,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Predict wait time for a station
// @route   GET /api/sessions/predict-wait/:stationId
// @access  Public
const predictWaitTime = async (req, res, next) => {
  try {
    const { stationId } = req.params;
    const prediction = await predictionService.predictWaitTime(stationId);
    const bestTime = await predictionService.getBestChargingTime(stationId);

    res.json({
      success: true,
      data: {
        stationId,
        predictedWaitMinutes: prediction.waitMinutes,
        confidence: prediction.confidence,
        currentOccupancy: prediction.currentOccupancy,
        bestChargingHours: bestTime,
      },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get active session for logged-in user
// @route   GET /api/sessions/active
// @access  Private
const getActiveSession = async (req, res, next) => {
  try {
    const session = await ChargingSession.findOne({
      userId: req.user._id,
      status: 'active',
    }).populate('stationId', 'name address chargerTypes');

    res.json({ success: true, data: session });
  } catch (error) {
    next(error);
  }
};

// @desc    Admin: Get all sessions
// @route   GET /api/sessions/admin/all
// @access  Admin
const getAllSessions = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, stationId } = req.query;
    const filter = {};
    if (stationId) filter.stationId = stationId;

    const sessions = await ChargingSession.find(filter)
      .populate('userId', 'name email')
      .populate('stationId', 'name address')
      .sort({ startTime: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await ChargingSession.countDocuments(filter);
    res.json({ success: true, count: sessions.length, total, data: sessions });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  startSession,
  endSession,
  getSessionHistory,
  predictWaitTime,
  getActiveSession,
  getAllSessions,
};
