// Yugurish ekrani - background GPS tracking
import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity,
  Alert, Platform, Vibration, StatusBar,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import BackgroundGeolocation from 'react-native-background-geolocation';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  startSession, sendGpsPoints, endSession,
  updateLocation, updateDuration, updateMetrics, resetSession,
} from '../../store/slices/runningSlice';
import { GPS_CONFIG } from '../../constants';

// Masofa formatlash (m -> km)
const formatDistance = meters => {
  if (meters < 1000) return `${meters.toFixed(0)} m`;
  return `${(meters / 1000).toFixed(2)} km`;
};

// Vaqt formatlash (sekund -> MM:SS yoki HH:MM:SS)
const formatDuration = seconds => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
};

// Pace formatlash (min/km)
const formatPace = paceSecondsPerKm => {
  if (!paceSecondsPerKm || paceSecondsPerKm === Infinity) return "--:--";
  const m = Math.floor(paceSecondsPerKm / 60);
  const s = Math.round(paceSecondsPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

const RunningScreen = ({ navigation }) => {
  const dispatch = useDispatch();
  const {
    isRunning, activeSession, distance, duration,
    avgSpeed, currentSpeed, calories, pace, isLoading,
  } = useSelector(state => state.running);

  const timerRef = useRef(null);
  const gpsBufferRef = useRef([]);          // GPS nuqtalar buferi
  const sendIntervalRef = useRef(null);     // Serverga yuborish intervali
  const distanceRef = useRef(0);
  const lastLocationRef = useRef(null);

  // GPS ruxsatini so'rash
  const requestLocationPermission = async () => {
    const permission = Platform.OS === 'ios'
      ? PERMISSIONS.IOS.LOCATION_ALWAYS
      : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

    const result = await request(permission);
    return result === RESULTS.GRANTED;
  };

  // Background geolocation'ni sozlash
  const setupBackgroundGeolocation = useCallback(() => {
    BackgroundGeolocation.ready({
      // GPS sozlamalari
      desiredAccuracy: BackgroundGeolocation.DESIRED_ACCURACY_HIGH,
      distanceFilter: GPS_CONFIG.DISTANCE_FILTER,
      // Activity sozlamalari
      activityType: 'fitness',
      stopTimeout: GPS_CONFIG.STOP_TIMEOUT,
      // Ilova fonda ishlayotganda
      enableHeadless: true,
      foregroundService: true,
      notification: {
        title: '🏃 Geo Fitness',
        text: 'Yugurish davom etmoqda...',
        color: '#4CAF50',
      },
      // Battery optimizatsiyasi
      preventSuspend: true,
      heartbeatInterval: GPS_CONFIG.HEARTBEAT_INTERVAL,
    });

    // GPS event'ini tinglash
    BackgroundGeolocation.onLocation(
      location => {
        const { latitude, longitude, speed, timestamp } = location.coords;

        dispatch(updateLocation({ latitude, longitude, speed: speed || 0, timestamp }));

        // GPS bufferiga qo'shish
        gpsBufferRef.current.push({
          latitude,
          longitude,
          accuracy: location.coords.accuracy,
          speed: speed || 0,
          altitude: location.coords.altitude || 0,
          timestamp,
        });

        // Masofa hisoblash
        if (lastLocationRef.current) {
          const d = calculateDistance(
            lastLocationRef.current.latitude,
            lastLocationRef.current.longitude,
            latitude,
            longitude
          );
          distanceRef.current += d;

          // Metrikalarni yangilash
          const durationSec = Math.floor((Date.now() - new Date(activeSession?.startedAt || Date.now())) / 1000);
          const speedKmh = speed > 0 ? speed * 3.6 : 0;
          const avgSpeedKmh = durationSec > 0 ? (distanceRef.current / 1000) / (durationSec / 3600) : 0;
          const paceSecPerKm = avgSpeedKmh > 0 ? 3600 / avgSpeedKmh : 0;
          const caloriesKcal = distanceRef.current * 0.07; // taxminiy

          dispatch(updateMetrics({
            distance: distanceRef.current,
            avgSpeed: avgSpeedKmh,
            calories: caloriesKcal,
            pace: paceSecPerKm,
          }));
        }
        lastLocationRef.current = { latitude, longitude };
      },
      error => console.error('GPS xatosi:', error)
    );
  }, [dispatch, activeSession]);

  // Haversine formulasi - 2 nuqta orasidagi masofa (metrda)
  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // GPS nuqtalarini serverga yuborish
  const flushGpsPoints = useCallback(async () => {
    if (gpsBufferRef.current.length === 0 || !activeSession?.id) return;

    const pointsToSend = [...gpsBufferRef.current];
    gpsBufferRef.current = [];

    dispatch(sendGpsPoints({ sessionId: activeSession.id, points: pointsToSend }));
  }, [activeSession, dispatch]);

  // Yugurish boshlash
  const handleStart = async () => {
    const hasPermission = await requestLocationPermission();
    if (!hasPermission) {
      Alert.alert(
        'GPS Ruxsati Kerak',
        'Yugurish uchun GPS ruxsati berish kerak. Sozlamalarga boring.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Joriy lokatsiyani olish
    const location = await BackgroundGeolocation.getCurrentPosition({
      timeout: 30,
      maximumAge: 5000,
      desiredAccuracy: 10,
    });

    const { latitude, longitude } = location.coords;

    const resultAction = await dispatch(startSession({ latitude, longitude }));
    if (startSession.fulfilled.match(resultAction)) {
      // GPS tracking boshlash
      setupBackgroundGeolocation();
      await BackgroundGeolocation.start();

      // Timer boshlash
      timerRef.current = setInterval(() => {
        dispatch(updateDuration());
      }, 1000);

      // GPS nuqtalarini har 10 sekundda yuborish
      sendIntervalRef.current = setInterval(flushGpsPoints, 10000);

      Vibration.vibrate(100);
    }
  };

  // Yugurish to'xtatish
  const handleStop = () => {
    Alert.alert(
      'Yugurish tugsinmi?',
      `Masofa: ${formatDistance(distance)}\nVaqt: ${formatDuration(duration)}`,
      [
        { text: 'Davom ettirish', style: 'cancel' },
        {
          text: 'Tugatish',
          style: 'destructive',
          onPress: async () => {
            // Timer va intervallarni to'xtatish
            clearInterval(timerRef.current);
            clearInterval(sendIntervalRef.current);

            // Qolgan GPS nuqtalarini yuborish
            await flushGpsPoints();

            // Background geolocation to'xtatish
            await BackgroundGeolocation.stop();

            // Sessiyani tugatish
            const resultAction = await dispatch(endSession({ sessionId: activeSession.id }));
            if (endSession.fulfilled.match(resultAction)) {
              distanceRef.current = 0;
              lastLocationRef.current = null;
              navigation.navigate('RunningResult');
            }
          },
        },
      ]
    );
  };

  // Component unmount da tozalash
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      clearInterval(sendIntervalRef.current);
      BackgroundGeolocation.removeListeners();
    };
  }, []);

  return (
    <LinearGradient colors={['#0D1117', '#161B22']} style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#0D1117" />

      {/* Sarlavha */}
      <View style={styles.header}>
        <Text style={styles.title}>
          {isRunning ? '🏃 Yugurish davom etmoqda' : 'Yugurish'}
        </Text>
        {isRunning && (
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        )}
      </View>

      {/* Asosiy metrikalar */}
      <View style={styles.metricsContainer}>
        {/* Masofa - eng katta ko'rsatkich */}
        <View style={styles.mainMetric}>
          <Text style={styles.mainMetricValue}>{formatDistance(distance)}</Text>
          <Text style={styles.mainMetricLabel}>Masofa</Text>
        </View>

        {/* Qo'shimcha metrikalar */}
        <View style={styles.metricsGrid}>
          <MetricCard
            icon="clock-outline"
            value={formatDuration(duration)}
            label="Vaqt"
          />
          <MetricCard
            icon="speedometer"
            value={`${currentSpeed} km/h`}
            label="Joriy tezlik"
          />
          <MetricCard
            icon="run"
            value={`${formatPace(pace)} min/km`}
            label="Pace"
          />
          <MetricCard
            icon="fire"
            value={`${Math.round(calories)} kcal`}
            label="Kaloriya"
          />
        </View>
      </View>

      {/* Boshqarish tugmalari */}
      <View style={styles.controls}>
        {!isRunning ? (
          <TouchableOpacity
            style={styles.startButton}
            onPress={handleStart}
            disabled={isLoading}>
            <LinearGradient colors={['#4CAF50', '#388E3C']} style={styles.bigButton}>
              {isLoading ? (
                <Text style={styles.bigButtonText}>Tayyorlanmoqda...</Text>
              ) : (
                <>
                  <Icon name="play" size={32} color="#fff" />
                  <Text style={styles.bigButtonText}>Boshlash</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.stopButton} onPress={handleStop} disabled={isLoading}>
            <LinearGradient colors={['#F44336', '#C62828']} style={styles.bigButton}>
              <Icon name="stop" size={32} color="#fff" />
              <Text style={styles.bigButtonText}>Tugatish</Text>
            </LinearGradient>
          </TouchableOpacity>
        )}
      </View>
    </LinearGradient>
  );
};

const MetricCard = ({ icon, value, label }) => (
  <View style={styles.metricCard}>
    <Icon name={icon} size={20} color="#4CAF50" />
    <Text style={styles.metricValue}>{value}</Text>
    <Text style={styles.metricLabel}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 60 },
  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, marginBottom: 32,
  },
  title: { color: '#F9FAFB', fontSize: 20, fontWeight: 'bold', flex: 1 },
  liveBadge: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#1a3a1a', borderRadius: 12,
    paddingHorizontal: 10, paddingVertical: 4, gap: 4,
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4CAF50' },
  liveText: { color: '#4CAF50', fontSize: 11, fontWeight: 'bold' },
  metricsContainer: { flex: 1, paddingHorizontal: 20 },
  mainMetric: { alignItems: 'center', marginBottom: 32 },
  mainMetricValue: { color: '#4CAF50', fontSize: 64, fontWeight: 'bold' },
  mainMetricLabel: { color: '#6B7280', fontSize: 16, marginTop: 4 },
  metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metricCard: {
    flex: 1, minWidth: '45%', backgroundColor: '#161B22',
    borderRadius: 12, padding: 16, alignItems: 'center',
    borderWidth: 1, borderColor: '#21262D',
  },
  metricValue: { color: '#F9FAFB', fontSize: 18, fontWeight: '600', marginTop: 8 },
  metricLabel: { color: '#6B7280', fontSize: 12, marginTop: 4 },
  controls: { padding: 24 },
  startButton: { borderRadius: 20, overflow: 'hidden' },
  stopButton: { borderRadius: 20, overflow: 'hidden' },
  bigButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 20, gap: 12,
  },
  bigButtonText: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
});

export default RunningScreen;
