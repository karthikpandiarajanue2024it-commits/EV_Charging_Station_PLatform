const Station = require('../models/Station');
const ChargingSession = require('../models/ChargingSession');

// @desc    Get nearby stations using geospatial query
// @route   GET /api/stations/nearby
// @access  Public
const getNearbyStations = async (req, res, next) => {
  try {
    const { longitude, latitude, radius = 5000, chargerType, minSlots } = req.query;

    if (!longitude || !latitude) {
      return res.status(400).json({ success: false, message: 'Longitude and latitude are required' });
    }

    const query = {
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          $maxDistance: parseInt(radius), // in meters
        },
      },
      status: { $ne: 'offline' },
    };

    if (chargerType) {
      query['chargerTypes.type'] = chargerType;
    }

    if (minSlots) {
      query.availableSlots = { $gte: parseInt(minSlots) };
    }

    const stations = await Station.find(query)
      .select('-ratings')
      .limit(50)
      .lean();

    // Calculate distance for each station
    const stationsWithDistance = stations.map((station) => {
      const [lng, lat] = station.location.coordinates;
      const R = 6371e3; // Earth radius in meters
      const φ1 = (parseFloat(latitude) * Math.PI) / 180;
      const φ2 = (lat * Math.PI) / 180;
      const Δφ = ((lat - parseFloat(latitude)) * Math.PI) / 180;
      const Δλ = ((lng - parseFloat(longitude)) * Math.PI) / 180;
      const a =
        Math.sin(Δφ / 2) ** 2 +
        Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
      const distance = Math.round(2 * R * Math.asin(Math.sqrt(a)));

      return { ...station, distanceMeters: distance };
    });

    res.json({ success: true, count: stations.length, data: stationsWithDistance });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all stations (admin / map view)
// @route   GET /api/stations
// @access  Public
const getAllStations = async (req, res, next) => {
  try {
    const { city, status, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (city) filter['address.city'] = new RegExp(city, 'i');
    if (status) filter.status = status;

    const stations = await Station.find(filter)
      .select('-ratings')
      .skip((page - 1) * limit)
      .limit(parseInt(limit))
      .lean();

    const total = await Station.countDocuments(filter);

    res.json({
      success: true,
      count: stations.length,
      total,
      pages: Math.ceil(total / limit),
      data: stations,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single station with details
// @route   GET /api/stations/:id
// @access  Public
const getStation = async (req, res, next) => {
  try {
    const station = await Station.findById(req.params.id).lean();
    if (!station) {
      return res.status(404).json({ success: false, message: 'Station not found' });
    }

    // Get active sessions count for real-time slot data
    const activeSessions = await ChargingSession.countDocuments({
      stationId: req.params.id,
      status: 'active',
    });

    res.json({ success: true, data: { ...station, activeSessions } });
  } catch (error) {
    next(error);
  }
};

// @desc    Create station
// @route   POST /api/stations
// @access  Admin
const createStation = async (req, res, next) => {
  try {
    const station = await Station.create(req.body);
    res.status(201).json({ success: true, data: station });
  } catch (error) {
    next(error);
  }
};

// @desc    Update station
// @route   PUT /api/stations/:id
// @access  Admin
const updateStation = async (req, res, next) => {
  try {
    const station = await Station.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!station) {
      return res.status(404).json({ success: false, message: 'Station not found' });
    }
    res.json({ success: true, data: station });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete station
// @route   DELETE /api/stations/:id
// @access  Admin
const deleteStation = async (req, res, next) => {
  try {
    const station = await Station.findByIdAndDelete(req.params.id);
    if (!station) {
      return res.status(404).json({ success: false, message: 'Station not found' });
    }
    res.json({ success: true, message: 'Station deleted successfully' });
  } catch (error) {
    next(error);
  }
};

// @desc    Rate a station
// @route   POST /api/stations/:id/rate
// @access  Private
const rateStation = async (req, res, next) => {
  try {
    const { score, comment } = req.body;
    const station = await Station.findById(req.params.id);
    if (!station) {
      return res.status(404).json({ success: false, message: 'Station not found' });
    }

    // Remove existing rating from this user (embedded approach)
    station.ratings = station.ratings.filter(
      (r) => r.userId.toString() !== req.user._id.toString()
    );

    station.ratings.push({ userId: req.user._id, score, comment });

    // Recalculate summary
    const avg = station.ratings.reduce((sum, r) => sum + r.score, 0) / station.ratings.length;
    station.ratingsSummary = {
      average: Math.round(avg * 10) / 10,
      count: station.ratings.length,
    };

    await station.save();
    res.json({ success: true, data: station.ratingsSummary });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNearbyStations,
  getAllStations,
  getStation,
  createStation,
  updateStation,
  deleteStation,
  rateStation,
};
