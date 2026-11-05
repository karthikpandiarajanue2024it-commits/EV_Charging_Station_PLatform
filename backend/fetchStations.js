require('dotenv').config();
const mongoose = require('mongoose');
const Station = require('./models/Station');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;
const MONGODB_URI = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/ev_charging_platform';

if (!GOOGLE_MAPS_API_KEY || GOOGLE_MAPS_API_KEY === 'your_key_here') {
  console.error('Error: Please provide a valid GOOGLE_MAPS_API_KEY in your .env file.');
  process.exit(1);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchPlaceDetails(placeId) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,geometry,rating,opening_hours,formatted_phone_number&key=${GOOGLE_MAPS_API_KEY}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.status === 'OK') {
      return data.result;
    } else {
      console.warn(`Failed to fetch details for ${placeId}: ${data.status}`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching details for ${placeId}:`, error.message);
    return null;
  }
}

async function fetchAllStations() {
  let allPlaces = [];
  let nextPageToken = null;
  let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=EV+charging+station+in+Tamil+Nadu,+India&type=electric_vehicle_charging_station&key=${GOOGLE_MAPS_API_KEY}`;

  console.log('Fetching stations from Google Maps API...');

  do {
    const currentUrl = nextPageToken ? `${url}&pagetoken=${nextPageToken}` : url;
    try {
      const response = await fetch(currentUrl);
      const data = await response.json();
      
      if (data.status === 'OK' || data.status === 'ZERO_RESULTS') {
        allPlaces = allPlaces.concat(data.results || []);
        nextPageToken = data.next_page_token;
        if (nextPageToken) {
          // Google API requires a short delay before using the next_page_token
          console.log('Waiting before fetching next page...');
          await sleep(2000); 
        }
      } else {
        console.error(`Error from Google API: ${data.status} - ${data.error_message || ''}`);
        break;
      }
    } catch (error) {
      console.error('Network Error:', error.message);
      break;
    }
  } while (nextPageToken);

  console.log(`Found ${allPlaces.length} stations. Fetching details...`);

  // Parse and save to DB
  let savedCount = 0;
  let updatedCount = 0;

  for (const place of allPlaces) {
    const placeId = place.place_id;
    // Get more details like phone and detailed opening hours
    const details = await fetchPlaceDetails(placeId);
    if (!details) continue;

    const lat = details.geometry?.location?.lat;
    const lng = details.geometry?.location?.lng;

    if (!lat || !lng) continue;

    // Parse address minimally
    const parts = details.formatted_address ? details.formatted_address.split(',') : [];
    const city = parts.length > 2 ? parts[parts.length - 3].trim() : 'Tamil Nadu';

    // Default slots logic
    const defaultSlots = [
      { slot_id: "SLOT_01", status: "free", charger_type: "CCS" },
      { slot_id: "SLOT_02", status: "free", charger_type: "Type2" },
      { slot_id: "SLOT_03", status: "free", charger_type: "CHAdeMO" },
      { slot_id: "SLOT_04", status: "free", charger_type: "CCS" }
    ];

    const chargerTypes = [
      { type: "CCS", powerKW: 50, count: 2, pricePerKWh: 15 },
      { type: "Type2", powerKW: 22, count: 1, pricePerKWh: 12 },
      { type: "CHAdeMO", powerKW: 50, count: 1, pricePerKWh: 15 }
    ];

    const stationData = {
      name: details.name || 'EV Charging Station',
      address: {
        street: details.formatted_address || '',
        city: city,
        state: 'Tamil Nadu'
      },
      location: {
        type: 'Point',
        coordinates: [lng, lat]
      },
      place_id: placeId,
      phone: details.formatted_phone_number || '',
      source: 'google_maps',
      opening_hours: details.opening_hours?.weekday_text || [],
      googleRating: details.rating || 0,
      ratingsSummary: {
        average: details.rating || 0,
        count: 1
      },
      totalSlots: 4,
      availableSlots: 4,
      slots: defaultSlots,
      chargerTypes: chargerTypes,
      status: 'active',
      isVerified: true
    };

    try {
      const existing = await Station.findOne({ place_id: placeId });
      if (existing) {
        // Update existing
        await Station.updateOne({ place_id: placeId }, { $set: stationData });
        updatedCount++;
      } else {
        // Insert new
        await Station.create(stationData);
        savedCount++;
      }
    } catch (err) {
      console.error(`Error saving station ${details.name}:`, err.message);
    }
  }

  console.log(`Finished! Inserted: ${savedCount}, Updated: ${updatedCount}`);
}

async function run() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    
    // Ensure indexes are created
    await Station.syncIndexes();

    await fetchAllStations();
  } catch (err) {
    console.error('Initialization Error:', err);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
    process.exit(0);
  }
}

run();
