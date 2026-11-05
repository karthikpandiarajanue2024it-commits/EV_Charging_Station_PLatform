const Fault = require('../models/Fault');
const Station = require('../models/Station');

// @desc    Report a fault
// @route   POST /api/faults/report
// @access  Private
const reportFault = async (req, res, next) => {
  try {
    const { stationId, type, severity, description, chargerType } = req.body;

    const station = await Station.findById(stationId);
    if (!station) {
      return res.status(404).json({ success: false, message: 'Station not found' });
    }

    const fault = await Fault.create({
      stationId,
      reportedBy: req.user._id,
      type,
      severity: severity || 'medium',
      description,
      chargerType,
    });

    // Increment active faults on station
    await Station.findByIdAndUpdate(stationId, { $inc: { activeFaults: 1 } });

    await fault.populate('stationId', 'name address');
    await fault.populate('reportedBy', 'name');

    res.status(201).json({ success: true, data: fault });
  } catch (error) {
    next(error);
  }
};

// @desc    Get faults for a station
// @route   GET /api/faults/:stationId
// @access  Public
const getStationFaults = async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = { stationId: req.params.stationId };
    if (status) filter.status = status;

    const faults = await Fault.find(filter)
      .populate('reportedBy', 'name')
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ success: true, count: faults.length, data: faults });
  } catch (error) {
    next(error);
  }
};

// @desc    Resolve a fault (admin)
// @route   PUT /api/faults/:id/resolve
// @access  Admin
const resolveFault = async (req, res, next) => {
  try {
    const { resolutionNote } = req.body;
    const fault = await Fault.findById(req.params.id);
    if (!fault) {
      return res.status(404).json({ success: false, message: 'Fault not found' });
    }

    fault.status = 'resolved';
    fault.resolvedBy = req.user._id;
    fault.resolvedAt = new Date();
    fault.resolutionNote = resolutionNote;
    await fault.save();

    // Decrement active faults
    await Station.findByIdAndUpdate(fault.stationId, {
      $inc: { activeFaults: -1 },
    });

    res.json({ success: true, data: fault });
  } catch (error) {
    next(error);
  }
};

// @desc    Upvote a fault report
// @route   POST /api/faults/:id/upvote
// @access  Private
const upvoteFault = async (req, res, next) => {
  try {
    const fault = await Fault.findById(req.params.id);
    if (!fault) {
      return res.status(404).json({ success: false, message: 'Fault not found' });
    }

    const alreadyUpvoted = fault.upvotedBy.includes(req.user._id);
    if (alreadyUpvoted) {
      fault.upvotedBy.pull(req.user._id);
      fault.upvotes = Math.max(0, fault.upvotes - 1);
    } else {
      fault.upvotedBy.push(req.user._id);
      fault.upvotes += 1;
    }
    await fault.save();

    res.json({
      success: true,
      data: { upvotes: fault.upvotes, upvoted: !alreadyUpvoted },
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all faults (admin)
// @route   GET /api/faults/admin/all
// @access  Admin
const getAllFaults = async (req, res, next) => {
  try {
    const { status, severity, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (severity) filter.severity = severity;

    const faults = await Fault.find(filter)
      .populate('stationId', 'name address')
      .populate('reportedBy', 'name email')
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));

    const total = await Fault.countDocuments(filter);
    res.json({ success: true, count: faults.length, total, data: faults });
  } catch (error) {
    next(error);
  }
};

module.exports = { reportFault, getStationFaults, resolveFault, upvoteFault, getAllFaults };
