/**
 * H3 Engine Service
 * Uber H3 kutubxonasi asosida geospatial operatsiyalar
 * Bu modul Territory va Running Session modullari uchun asosiy engine
 */

const h3 = require('h3-js');
const logger = require('../../../shared/utils/logger');

// H3 resolution (9 = taxminan 100m² cell)
const H3_RESOLUTION = parseInt(process.env.H3_RESOLUTION) || 9;

/**
 * GPS koordinatadan H3 cell indeksini olish
 * @param {number} lat - Kenglik
 * @param {number} lng - Uzunlik
 * @returns {string} H3 cell indeksi
 */
function getH3Index(lat, lng) {
  return h3.latLngToCell(lat, lng, H3_RESOLUTION);
}

/**
 * H3 cell markazining koordinatalarini olish
 * @param {string} h3Index - H3 cell indeksi
 * @returns {{ lat: number, lng: number }}
 */
function getCellCenter(h3Index) {
  const [lat, lng] = h3.cellToLatLng(h3Index);
  return { lat, lng };
}

/**
 * H3 cell chegaralarini polygon sifatida olish (PostGIS uchun)
 * @param {string} h3Index - H3 cell indeksi
 * @returns {Array} Koordinatalar massivi [[lng, lat], ...]
 */
function getCellBoundary(h3Index) {
  const boundary = h3.cellToBoundary(h3Index);
  // H3 [lat, lng] qaytaradi, PostGIS [lng, lat] kerak
  return boundary.map(([lat, lng]) => [lng, lat]);
}

/**
 * Polygon (WKT format) yaratish PostGIS uchun
 * @param {string} h3Index - H3 cell indeksi
 * @returns {string} WKT Polygon string
 */
function getCellPolygonWKT(h3Index) {
  const boundary = getCellBoundary(h3Index);
  // Polygonni yopish uchun birinchi nuqtani oxiriga qo'shish
  const closedBoundary = [...boundary, boundary[0]];
  const coords = closedBoundary.map(([lng, lat]) => `${lng} ${lat}`).join(', ');
  return `POLYGON((${coords}))`;
}

/**
 * Yo'nalishdagi barcha H3 celllarni aniqlash
 * GPS nuqtalar massividan o'tgan barcha H3 indexlarni qaytaradi
 * @param {Array} gpsPoints - [{ lat, lng }] massivi
 * @returns {Set<string>} Unikal H3 index to'plami
 */
function getH3IndexesFromPath(gpsPoints) {
  const h3Set = new Set();
  
  gpsPoints.forEach(({ lat, lng }) => {
    const h3Index = getH3Index(lat, lng);
    h3Set.add(h3Index);
  });

  // GPS nuqtalar orasidagi bo'shliqlarni to'ldirish
  for (let i = 0; i < gpsPoints.length - 1; i++) {
    const startIndex = getH3Index(gpsPoints[i].lat, gpsPoints[i].lng);
    const endIndex = getH3Index(gpsPoints[i + 1].lat, gpsPoints[i + 1].lng);
    
    // Ikki cell orasidagi liniyani to'ldirish
    const line = h3.gridPathCells(startIndex, endIndex);
    line.forEach((idx) => h3Set.add(idx));
  }

  return h3Set;
}

/**
 * Ikki GPS nuqta orasidagi masofani hisoblash (Haversine formula)
 * @param {number} lat1 - 1-nuqta kenglik
 * @param {number} lng1 - 1-nuqta uzunlik
 * @param {number} lat2 - 2-nuqta kenglik
 * @param {number} lng2 - 2-nuqta uzunlik
 * @returns {number} Masofa (metr)
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Yer radiusi (metr)
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lng2 - lng1) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * GPS nuqtalar massividan umumiy masofani hisoblash
 * @param {Array} points - [{ lat, lng }] massivi
 * @returns {number} Umumiy masofa (metr)
 */
function calculateTotalDistance(points) {
  if (points.length < 2) return 0;
  
  let totalDistance = 0;
  for (let i = 0; i < points.length - 1; i++) {
    totalDistance += calculateDistance(
      points[i].lat,
      points[i].lng,
      points[i + 1].lat,
      points[i + 1].lng
    );
  }
  return totalDistance;
}

/**
 * Tezlikni km/h da hisoblash
 * @param {number} distanceMeters - Masofa (metr)
 * @param {number} durationSeconds - Vaqt (soniya)
 * @returns {number} Tezlik (km/h)
 */
function calculateSpeed(distanceMeters, durationSeconds) {
  if (durationSeconds <= 0) return 0;
  return (distanceMeters / durationSeconds) * 3.6;
}

/**
 * Kaloriya hisoblash (MET formula asosida)
 * @param {number} weightKg - Vazn (kg), default 70
 * @param {number} distanceMeters - Masofa (metr)
 * @param {number} durationMinutes - Vaqt (daqiqa)
 * @returns {number} Yoqilgan kaloriya
 */
function calculateCalories(distanceMeters, durationMinutes, weightKg = 70) {
  // Yugurish uchun MET qiymati (o'rtacha 8 km/h uchun ~8 MET)
  const speedKmh = (distanceMeters / 1000) / (durationMinutes / 60);
  const MET = Math.max(3, Math.min(18, speedKmh * 1.1)); // MET ni 3-18 oralig'ida ushlab turish
  
  return (MET * weightKg * (durationMinutes / 60)).toFixed(1);
}

/**
 * O'rtacha pace hisoblash (daqiqa/km)
 * @param {number} durationSeconds - Vaqt (soniya)
 * @param {number} distanceMeters - Masofa (metr)
 * @returns {number} Pace (daqiqa/km)
 */
function calculatePace(durationSeconds, distanceMeters) {
  if (distanceMeters <= 0) return 0;
  const distanceKm = distanceMeters / 1000;
  const durationMinutes = durationSeconds / 60;
  return durationMinutes / distanceKm;
}

/**
 * GPS koordinatalarning O'zbekiston hududida ekanligini tekshirish
 * @param {number} lat - Kenglik
 * @param {number} lng - Uzunlik
 * @returns {boolean}
 */
function isInUzbekistan(lat, lng) {
  // O'zbekiston taxminiy chegaralari
  const UZ_BOUNDS = {
    minLat: 37.0,
    maxLat: 45.6,
    minLng: 56.0,
    maxLng: 73.2,
  };
  
  return (
    lat >= UZ_BOUNDS.minLat &&
    lat <= UZ_BOUNDS.maxLat &&
    lng >= UZ_BOUNDS.minLng &&
    lng <= UZ_BOUNDS.maxLng
  );
}

/**
 * H3 cell markazidan viloyatni aniqlash
 * Taxminiy bounding box asosida
 * @param {number} lat - Kenglik
 * @param {number} lng - Uzunlik
 * @returns {string} Viloyat nomi
 */
function getRegionByCoordinates(lat, lng) {
  // O'zbekiston viloyatlari taxminiy koordinatalari
  const regions = [
    { name: 'toshkent_shahar', minLat: 41.1, maxLat: 41.4, minLng: 69.1, maxLng: 69.5 },
    { name: 'toshkent_viloyat', minLat: 40.5, maxLat: 41.6, minLng: 68.5, maxLng: 70.8 },
    { name: 'andijon', minLat: 40.5, maxLat: 41.2, minLng: 71.8, maxLng: 73.2 },
    { name: 'fargona', minLat: 40.0, maxLat: 41.0, minLng: 70.6, maxLng: 72.0 },
    { name: 'namangan', minLat: 40.7, maxLat: 41.5, minLng: 70.5, maxLng: 72.0 },
    { name: 'samarqand', minLat: 38.8, maxLat: 40.2, minLng: 66.0, maxLng: 68.5 },
    { name: 'buxoro', minLat: 38.0, maxLat: 40.5, minLng: 62.5, maxLng: 65.5 },
    { name: 'navoiy', minLat: 39.5, maxLat: 43.5, minLng: 62.0, maxLng: 66.5 },
    { name: 'qashqadaryo', minLat: 37.5, maxLat: 40.0, minLng: 65.5, maxLng: 68.5 },
    { name: 'surxondaryo', minLat: 37.0, maxLat: 38.8, minLng: 66.5, maxLng: 68.5 },
    { name: 'jizzax', minLat: 39.8, maxLat: 41.2, minLng: 67.0, maxLng: 70.0 },
    { name: 'sirdaryo', minLat: 40.0, maxLat: 41.0, minLng: 68.0, maxLng: 69.8 },
    { name: 'xorazm', minLat: 40.5, maxLat: 42.0, minLng: 59.5, maxLng: 62.0 },
    { name: 'qoraqalpogiston', minLat: 41.5, maxLat: 45.6, minLng: 56.0, maxLng: 62.5 },
  ];

  const region = regions.find(
    (r) => lat >= r.minLat && lat <= r.maxLat && lng >= r.minLng && lng <= r.maxLng
  );

  return region ? region.name : 'unknown';
}

/**
 * Shubhali GPS harakatni aniqlash
 * @param {Object} prevPoint - Oldingi GPS nuqta { lat, lng, recordedAt }
 * @param {Object} currPoint - Joriy GPS nuqta { lat, lng, recordedAt }
 * @returns {{ isSuspicious: boolean, reason: string | null, speedKmh: number }}
 */
function detectSuspiciousMovement(prevPoint, currPoint) {
  const MAX_SPEED = parseFloat(process.env.MAX_ALLOWED_SPEED_KMH) || 50;
  const MAX_JUMP = parseFloat(process.env.MAX_GPS_JUMP_METERS) || 500;

  const distance = calculateDistance(
    prevPoint.lat,
    prevPoint.lng,
    currPoint.lat,
    currPoint.lng
  );

  const timeDiffSeconds =
    (new Date(currPoint.recordedAt) - new Date(prevPoint.recordedAt)) / 1000;

  // GPS jump tekshiruvi
  if (distance > MAX_JUMP && timeDiffSeconds < 5) {
    return {
      isSuspicious: true,
      reason: `GPS jump aniqlandi: ${distance.toFixed(0)}m ${timeDiffSeconds.toFixed(1)}s ichida`,
      speedKmh: 0,
    };
  }

  // Tezlik tekshiruvi
  const speedKmh = timeDiffSeconds > 0 ? calculateSpeed(distance, timeDiffSeconds) : 0;
  if (speedKmh > MAX_SPEED) {
    return {
      isSuspicious: true,
      reason: `Juda yuqori tezlik: ${speedKmh.toFixed(1)} km/h`,
      speedKmh,
    };
  }

  return { isSuspicious: false, reason: null, speedKmh };
}

module.exports = {
  H3_RESOLUTION,
  getH3Index,
  getCellCenter,
  getCellBoundary,
  getCellPolygonWKT,
  getH3IndexesFromPath,
  calculateDistance,
  calculateTotalDistance,
  calculateSpeed,
  calculateCalories,
  calculatePace,
  isInUzbekistan,
  getRegionByCoordinates,
  detectSuspiciousMovement,
};
