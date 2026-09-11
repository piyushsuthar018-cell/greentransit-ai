/**
 * GreenTransit AI - Real-World Geocoding, Map Routing & Dynamic Pricing Service
 */

const https = require('https');

// Known operational Metro stations & corridors in Ahmedabad (and major hubs)
const METRO_ZONES = [
  'thaltej', 'gurukul', 'gujarat university', 'commerce', 'stadium', 'old high court',
  'sabarmati', 'aec', 'ranip', 'vadaj', 'usmanpura', 'paldi', 'shreyas', 'apmc',
  'kalupur', 'kankaria', 'apparel park', 'amraiwadi', 'rabari colony', 'vastral',
  'motera', 'gandhigram', 'jivraj park', 'silver oak' // Silver Oak connects via AEC / Sabarmati
];

// Areas known to NOT have direct metro stations nearby
const NON_METRO_ZONES = [
  'science city', 'bopal', 'shela', 'ghuma', 'shilaj', 'bhadaj', 'sarkhej', 'sanand',
  'changodar', 'gota crossroads', 'sg highway cross', 'vaishnodevi', 'iscon'
];

/**
 * Geocode place to get latitude and longitude via OpenStreetMap Nominatim
 */
function geocodePlace(query) {
  return new Promise((resolve) => {
    // Add Ahmedabad as default context if no city is specified to avoid foreign results
    let searchQuery = query.trim();
    if (!searchQuery.toLowerCase().includes('ahmedabad') && 
        !searchQuery.toLowerCase().includes('delhi') && 
        !searchQuery.toLowerCase().includes('mumbai') && 
        !searchQuery.toLowerCase().includes('bangalore') && 
        !searchQuery.toLowerCase().includes('india')) {
      searchQuery += ', Ahmedabad, Gujarat, India';
    }

    const url = 'https://nominatim.openstreetmap.org/search?format=json&limit=1&q=' + encodeURIComponent(searchQuery);
    const req = https.get(url, { headers: { 'User-Agent': 'GreenTransitAI-RouteEngine/2.0' } }, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json && json.length > 0) {
            resolve({
              lat: parseFloat(json[0].lat),
              lon: parseFloat(json[0].lon),
              displayName: json[0].display_name
            });
          } else {
            resolve(null);
          }
        } catch (e) {
          resolve(null);
        }
      });
    });

    req.on('error', () => resolve(null));
    req.setTimeout(3000, () => {
      req.destroy();
      resolve(null);
    });
  });
}

/**
 * Calculate driving distance between two coordinate pairs using Haversine with road curvature factor
 */
function calculateRoadDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const straightDistance = R * c;
  
  // Real road factor: urban streets are ~1.32x to 1.38x longer than straight-line flight
  return Number((straightDistance * 1.35).toFixed(1));
}

/**
 * Determine if Metro is geographically feasible between origin and destination
 */
function checkMetroFeasibility(origin, destination) {
  const origLower = origin.toLowerCase();
  const destLower = destination.toLowerCase();

  // If either place is an explicit non-metro zone
  for (const nonMetro of NON_METRO_ZONES) {
    if (origLower.includes(nonMetro) || destLower.includes(nonMetro)) {
      return {
        feasible: false,
        reason: `Neither location is adjacent to an operational metro station; direct Municipal Bus (BRTS/AMTS) or Auto-Rickshaw is faster and avoids transfers.`
      };
    }
  }

  // Check if both places connect to known metro zones
  const origMetro = METRO_ZONES.some(z => origLower.includes(z));
  const destMetro = METRO_ZONES.some(z => destLower.includes(z));

  if (origMetro && destMetro) {
    return {
      feasible: true,
      reason: `Direct or feeder connectivity to Ahmedabad Metro Corridor (East-West / North-South Line).`
    };
  }

  // Default heuristic: If distance is under 6 km, metro is rarely worth the transfer time
  return {
    feasible: false,
    reason: `Metro line is not directly accessible without a long feeder detour; direct road transit is recommended.`
  };
}

/**
 * Calculate real dynamic transport prices and carbon emissions for any distance and passengers
 */
function calculateDynamicFares(distanceKm, passengers = 1, metroFeasible = true) {
  const dist = Math.max(1.0, Number(distanceKm) || 10.0);
  const p = Math.max(1, Number(passengers) || 1);

  // 1. Auto Rickshaw (Real Gujarat RTO / Uber Auto formula)
  // Base ₹30 for first 1.5 km, ₹15 per subsequent km
  const autoBase = 30;
  const autoFare = Math.round(autoBase + Math.max(0, dist - 1.5) * 15);
  const autosNeeded = Math.ceil(p / 3);
  const autoTotal = autoFare * autosNeeded;
  const autoPerPerson = Math.round(autoTotal / p);

  // 2. Cab (Uber Go / Ola Mini)
  // Base ₹65 + ₹16.5/km + ₹1.5/min time charge + ₹35 platform/GST fee
  const travelTimeMins = Math.max(10, Math.round(dist * 2.2));
  const cabFare = Math.round(65 + (dist * 16.5) + (travelTimeMins * 1.5) + 35);
  const cabsNeeded = Math.ceil(p / 4);
  const cabTotal = cabFare * cabsNeeded;
  const cabPerPerson = Math.round(cabTotal / p);

  // 3. Bike Taxi (Rapido Bike / Uber Moto)
  // Base ₹25 for first 1.5 km, ₹8.5/km
  const bikeFare = Math.round(25 + Math.max(0, dist - 1.5) * 8.5);

  // 4. Public Transit (Metro if feasible, otherwise City Bus BRTS/AMTS)
  let transitName = "Hybrid Metro + Feeder";
  let transitPerPerson = 40;
  let transitTime = Math.max(15, Math.round(dist * 1.8)) + " mins";
  let transitTag = "🌱 Eco Winner";
  let transitCo2Factor = 0.028; // Metro ~28g/km

  if (metroFeasible) {
    const metroTicket = dist > 20 ? 30 : (dist > 15 ? 25 : (dist > 10 ? 20 : (dist > 5 ? 15 : 10)));
    const feederAuto = 15; // shared e-rickshaw
    transitPerPerson = metroTicket + feederAuto;
    transitName = "Hybrid Metro + Feeder Auto";
    transitTag = "🌱 Eco Winner";
  } else {
    // City Bus (AMTS / BRTS)
    transitPerPerson = dist > 15 ? 25 : (dist > 8 ? 20 : 15);
    transitName = "Municipal City Bus (BRTS/AMTS)";
    transitTime = Math.max(20, Math.round(dist * 2.6)) + " mins";
    transitTag = "🌱 Public Bus (Eco)";
    transitCo2Factor = 0.082; // Bus ~82g/km
  }

  const transitTotal = transitPerPerson * p;

  // Carbon emissions in kg
  const carCo2 = Number(((dist * 0.192)).toFixed(2));
  const autoCo2 = Number(((dist * 0.095)).toFixed(2));
  const transitCo2 = Number(((dist * transitCo2Factor)).toFixed(2));
  const co2Saved = Number((carCo2 - transitCo2).toFixed(2));

  return {
    distanceKm: dist,
    passengers: p,
    metroFeasible,
    carCo2,
    co2Saved,
    options: [
      {
        name: transitName,
        perPerson: transitPerPerson,
        total: transitTotal,
        time: transitTime,
        co2: transitCo2,
        tag: transitTag
      },
      {
        name: "Auto Rickshaw (CNG / App)",
        perPerson: autoPerPerson,
        total: autoTotal,
        time: Math.max(12, Math.round(dist * 2.3)) + " mins",
        co2: autoCo2,
        tag: p > 3 ? `🛺 ${autosNeeded} Autos (Group)` : "🛺 Shared Value"
      },
      {
        name: "Uber Go / Ola Mini",
        perPerson: cabPerPerson,
        total: cabTotal,
        time: Math.max(10, Math.round(dist * 2.0)) + " mins",
        co2: carCo2,
        tag: p > 4 ? `🚗 ${cabsNeeded} Cabs (Group)` : "🚗 AC Comfort"
      },
      {
        name: "Rapido Bike Taxi",
        perPerson: p === 1 ? bikeFare : null,
        total: p === 1 ? bikeFare : null,
        time: Math.max(8, Math.round(dist * 1.6)) + " mins",
        co2: Number(((dist * 0.055)).toFixed(2)),
        tag: p === 1 ? "🏍️ Solo Quick" : "Unavailable (1 rider only)"
      }
    ]
  };
}

/**
 * Generate Google Maps live route URL for user exploration
 */
function getGoogleMapsUrl(origin, destination) {
  return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}&travelmode=transit`;
}

module.exports = {
  geocodePlace,
  calculateRoadDistance,
  checkMetroFeasibility,
  calculateDynamicFares,
  getGoogleMapsUrl
};
