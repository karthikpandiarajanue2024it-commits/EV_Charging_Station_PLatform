require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const path = require('path');
const Station = require(path.join(__dirname, '..', 'models', 'Station'));
const User = require(path.join(__dirname, '..', 'models', 'User'));
const ChargingSession = require(path.join(__dirname, '..', 'models', 'ChargingSession'));
const Fault = require(path.join(__dirname, '..', 'models', 'Fault'));

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/ev_charging_platform';

// Indian cities with realistic coordinates [lng, lat]
const locations = [
  { city: 'Chennai', coords: [[80.2707, 13.0827], [80.2300, 13.0500], [80.2500, 13.1100], [80.2900, 13.0600]] },
  { city: 'Bangalore', coords: [[77.5946, 12.9716], [77.6100, 12.9500], [77.5700, 12.9900], [77.6300, 12.9800]] },
  { city: 'Mumbai', coords: [[72.8777, 19.0760], [72.8500, 19.1000], [72.9000, 19.0500], [72.8300, 19.1200]] },
  { city: 'Delhi', coords: [[77.1025, 28.7041], [77.0900, 28.6900], [77.1200, 28.7200], [77.0800, 28.7100]] },
  { city: 'Hyderabad', coords: [[78.4867, 17.3850], [78.4700, 17.4000], [78.5000, 17.3700], [78.5200, 17.3600]] },
];

const chargerOptions = [
  [
    { type: 'Type2', powerKW: 7.2, count: 4, available: 4, pricePerKWh: 10 },
    { type: 'CCS', powerKW: 50, count: 2, available: 2, pricePerKWh: 15 },
  ],
  [
    { type: 'Bharat AC', powerKW: 3.3, count: 6, available: 6, pricePerKWh: 8 },
    { type: 'Bharat DC', powerKW: 15, count: 2, available: 2, pricePerKWh: 12 },
  ],
  [
    { type: 'CCS', powerKW: 150, count: 3, available: 3, pricePerKWh: 20 },
    { type: 'CHAdeMO', powerKW: 50, count: 2, available: 2, pricePerKWh: 16 },
    { type: 'Type2', powerKW: 22, count: 4, available: 4, pricePerKWh: 11 },
  ],
];

const operators = [
  { name: 'Tata Power EV', contactPhone: '1800123456', email: 'support@tatapower.in' },
  { name: 'ChargeZone', contactPhone: '1800654321', email: 'hello@chargezone.in' },
  { name: 'Ather Grid', contactPhone: '1800789012', email: 'grid@ather.in' },
  { name: 'BESCOM EV', contactPhone: '1800345678', email: 'ev@bescom.org' },
];

const amenitiesList = ['parking', 'restroom', 'cafe', 'wifi', 'cctv'];
const stationNames = [
  'Phoenix Mall EV Hub', 'Smart City Charging Point', 'Highway Super Charger',
  'Tech Park EV Station', 'Metro Station Charger', 'Airport EV Hub',
  'Hospital Charging Bay', 'IT Corridor Station', 'Green Hub Express',
  'City Center Charge', 'Eco Point Station', 'Solar EV Park',
  'Railway Station EV', 'University Charger', 'Commercial Street Hub',
  'Industrial Zone Charger', 'Residential Complex EV', 'Shopping Complex Hub',
  'Tourist Point Charger', 'Government Complex EV',
];

const weatherConditions = ['sunny', 'rainy', 'cloudy', 'foggy', 'extreme_heat'];

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

async function seedDatabase() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Promise.all([
      Station.deleteMany({}),
      User.deleteMany({}),
      ChargingSession.deleteMany({}),
      Fault.deleteMany({}),
    ]);
    console.log('🗑️ Cleared existing data');

    // Create admin user
    const admin = await User.create({
      name: 'EV Admin',
      email: 'admin@evcharging.in',
      password: 'Admin@123',
      role: 'admin',
      phone: '9876543210',
    });
    console.log('👤 Admin created:', admin.email);

    // Create test users
    const users = await User.insertMany([
      {
        name: 'Arjun Sharma',
        email: 'arjun@test.in',
        password: await bcrypt.hash('User@123', 12),
        phone: '9876543211',
        vehicleInfo: { model: 'Tata Nexon EV', batteryCapacity: 40.5, chargerType: 'CCS' },
        location: { type: 'Point', coordinates: [80.2707, 13.0827] },
      },
      {
        name: 'Priya Krishnan',
        email: 'priya@test.in',
        password: await bcrypt.hash('User@123', 12),
        phone: '9876543212',
        vehicleInfo: { model: 'MG ZS EV', batteryCapacity: 50.3, chargerType: 'Type2' },
        location: { type: 'Point', coordinates: [77.5946, 12.9716] },
      },
      {
        name: 'Ravi Patel',
        email: 'ravi@test.in',
        password: await bcrypt.hash('User@123', 12),
        phone: '9876543213',
        vehicleInfo: { model: 'Ather 450X', batteryCapacity: 2.9, chargerType: 'Bharat AC' },
        location: { type: 'Point', coordinates: [72.8777, 19.0760] },
      },
    ]);
    console.log('👥 Test users created');

    // Create 20 stations
    const stations = [];
    let nameIdx = 0;
    for (const locGroup of locations) {
      for (const coords of locGroup.coords) {
        const chargerConfig = randomFrom(chargerOptions);
        const totalSlots = chargerConfig.reduce((s, c) => s + c.count, 0);
        const availableSlots = randomBetween(0, totalSlots);

        stations.push({
          name: stationNames[nameIdx++ % stationNames.length],
          location: { type: 'Point', coordinates: coords },
          address: {
            city: locGroup.city,
            state: getState(locGroup.city),
            pincode: randomBetween(100000, 999999).toString(),
            street: `${randomBetween(1, 200)} Main Road`,
          },
          chargerTypes: chargerConfig,
          totalSlots,
          availableSlots,
          status: randomFrom(['active', 'active', 'active', 'maintenance']),
          operator: randomFrom(operators),
          amenities: amenitiesList.filter(() => Math.random() > 0.4),
          isVerified: Math.random() > 0.2,
          ratingsSummary: {
            average: parseFloat((3 + Math.random() * 2).toFixed(1)),
            count: randomBetween(5, 200),
          },
          currentOccupancyRate: Math.round(((totalSlots - availableSlots) / totalSlots) * 100),
        });
      }
    }

    const createdStations = await Station.insertMany(stations);
    console.log(`🏗️ Created ${createdStations.length} stations`);

    // Create 500+ charging sessions (historical data for analytics)
    const sessions = [];
    const allUsers = [admin, ...users];
    const now = new Date();

    for (let i = 0; i < 600; i++) {
      const station = randomFrom(createdStations);
      const user = randomFrom(allUsers);
      const daysAgo = randomBetween(0, 60);
      const hour = randomBetween(0, 23);
      const startTime = new Date(now);
      startTime.setDate(startTime.getDate() - daysAgo);
      startTime.setHours(hour, randomBetween(0, 59), 0, 0);

      const duration = randomBetween(15, 180); // 15 to 180 minutes
      const endTime = new Date(startTime.getTime() + duration * 60000);

      const charger = randomFrom(station.chargerTypes);
      const energyConsumed = parseFloat(((charger.powerKW * duration) / 60).toFixed(2));
      const cost = parseFloat((energyConsumed * charger.pricePerKWh).toFixed(2));

      sessions.push({
        userId: user._id,
        stationId: station._id,
        chargerType: charger.type,
        startTime,
        endTime,
        duration,
        energyConsumed,
        cost,
        status: 'completed',
        stationCity: station.address.city,
        dayOfWeek: startTime.getDay(),
        hourOfDay: hour,
        weatherCondition: randomFrom(weatherConditions),
        vehicleSOC: { start: randomBetween(10, 40), end: randomBetween(70, 100) },
      });
    }

    await ChargingSession.insertMany(sessions);
    console.log(`⚡ Created ${sessions.length} charging sessions`);

    // Create some faults
    const faultTypes = ['charger_not_working', 'cable_damaged', 'payment_issue', 'display_not_working'];
    const faults = createdStations.slice(0, 8).map((station, i) => ({
      stationId: station._id,
      reportedBy: randomFrom(allUsers)._id,
      type: randomFrom(faultTypes),
      severity: randomFrom(['low', 'medium', 'high']),
      description: 'Charger is not responding when plugged in. Screen shows error code E04.',
      status: i < 4 ? 'open' : 'resolved',
      upvotes: randomBetween(0, 20),
      resolvedAt: i >= 4 ? new Date() : undefined,
      resolutionNote: i >= 4 ? 'Hardware reset performed. Charger is operational now.' : undefined,
    }));

    await Fault.insertMany(faults);
    console.log(`⚠️ Created ${faults.length} fault reports`);

    console.log('\n✅ Database seeded successfully!');
    console.log('\n👤 Test Credentials:');
    console.log('   Admin:  admin@evcharging.in / Admin@123');
    console.log('   User 1: arjun@test.in / User@123');
    console.log('   User 2: priya@test.in / User@123');
    console.log('   User 3: ravi@test.in / User@123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
}

function getState(city) {
  const map = {
    Chennai: 'Tamil Nadu',
    Bangalore: 'Karnataka',
    Mumbai: 'Maharashtra',
    Delhi: 'Delhi',
    Hyderabad: 'Telangana',
  };
  return map[city] || 'Unknown';
}

seedDatabase();
