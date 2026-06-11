// Xarita ekrani - Mapbox, H3 Grid overlay va Fog of War
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { View, StyleSheet, TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import MapboxGL from '@rnmapbox/maps';
import { useDispatch, useSelector } from 'react-redux';
import { cellToBoundary, cellToLatLng } from 'h3-js';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { fetchNearbyTerritories, fetchExploredCells } from '../../store/slices/territorySlice';
import { TERRITORY_COLORS, MAP_CONFIG, MAPBOX_PUBLIC_TOKEN } from '../../constants';

MapboxGL.setAccessToken(MAPBOX_PUBLIC_TOKEN);

const MapScreen = () => {
  const dispatch = useDispatch();
  const cameraRef = useRef(null);

  const { nearbyTerritories, exploredCells, isLoading } = useSelector(state => state.territory);
  const { currentLocation } = useSelector(state => state.running);

  const [userLocation, setUserLocation] = useState(null);
  const [mapReady, setMapReady] = useState(false);
  const [showFog, setShowFog] = useState(true);

  // Birinchi marta ochilganda hududlarni yuklash
  useEffect(() => {
    dispatch(fetchExploredCells());
  }, [dispatch]);

  // Lokatsiya yangilanganda yaqin hududlarni yuklash
  const handleLocationUpdate = useCallback(
    event => {
      const { latitude, longitude } = event.coords;
      setUserLocation({ latitude, longitude });

      // Har 30 sekundda yaqin hududlarni yangilash
      dispatch(fetchNearbyTerritories({ lat: latitude, lng: longitude, radius: 2 }));
    },
    [dispatch]
  );

  // H3 hududlarni GeoJSON formatiga o'tkazish
  const buildTerritoriesGeoJSON = useCallback(() => {
    const features = nearbyTerritories.map(territory => {
      const boundary = cellToBoundary(territory.h3Index);
      const coordinates = [...boundary.map(([lat, lng]) => [lng, lat])];
      // GeoJSON polygon yopiq bo'lishi kerak
      coordinates.push(coordinates[0]);

      return {
        type: 'Feature',
        id: territory.h3Index,
        properties: {
          h3Index: territory.h3Index,
          isOwn: territory.isOwn,
          ownerId: territory.ownerId,
          ownerUsername: territory.ownerUsername,
          defenseLevel: territory.defenseLevel,
          fillColor: territory.isOwn
            ? TERRITORY_COLORS.OWN
            : TERRITORY_COLORS.ENEMY,
          borderColor: territory.isOwn
            ? TERRITORY_COLORS.OWN_BORDER
            : TERRITORY_COLORS.ENEMY_BORDER,
        },
        geometry: {
          type: 'Polygon',
          coordinates: [coordinates],
        },
      };
    });

    return { type: 'FeatureCollection', features };
  }, [nearbyTerritories]);

  // Ochilgan hududlar - Fog of War dan chiqarilgan joylar
  const buildExploredGeoJSON = useCallback(() => {
    const features = exploredCells.map(h3Index => {
      const boundary = cellToBoundary(h3Index);
      const coordinates = [...boundary.map(([lat, lng]) => [lng, lat])];
      coordinates.push(coordinates[0]);

      return {
        type: 'Feature',
        id: h3Index,
        properties: { h3Index, explored: true },
        geometry: {
          type: 'Polygon',
          coordinates: [coordinates],
        },
      };
    });

    return { type: 'FeatureCollection', features };
  }, [exploredCells]);

  const territoriesGeoJSON = buildTerritoriesGeoJSON();
  const exploredGeoJSON = buildExploredGeoJSON();

  const flyToUserLocation = () => {
    if (userLocation && cameraRef.current) {
      cameraRef.current.flyTo(
        [userLocation.longitude, userLocation.latitude],
        1000
      );
    }
  };

  return (
    <View style={styles.container}>
      <MapboxGL.MapView
        style={styles.map}
        styleURL="mapbox://styles/mapbox/dark-v11"
        onDidFinishLoadingMap={() => setMapReady(true)}
        compassEnabled={false}
        logoEnabled={false}
        attributionEnabled={false}>

        {/* Kamera */}
        <MapboxGL.Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [MAP_CONFIG.CENTER_LONGITUDE, MAP_CONFIG.CENTER_LATITUDE],
            zoomLevel: MAP_CONFIG.DEFAULT_ZOOM,
          }}
          minZoomLevel={MAP_CONFIG.MIN_ZOOM}
          maxZoomLevel={MAP_CONFIG.MAX_ZOOM}
        />

        {/* Foydalanuvchi lokatsiyasi */}
        <MapboxGL.UserLocation
          visible
          onUpdate={handleLocationUpdate}
          renderMode="native"
        />

        {/* Fog of War overlay - ochilmagan joylar qoraytirilgan */}
        {showFog && mapReady && (
          <MapboxGL.ShapeSource id="fog-source" shape={exploredGeoJSON}>
            {/* Ochilgan hududlar - fog'dan chiqarilgan */}
            <MapboxGL.FillLayer
              id="explored-fill"
              style={{
                fillColor: 'rgba(0, 0, 0, 0)',
                fillOpacity: 0,
              }}
            />
          </MapboxGL.ShapeSource>
        )}

        {/* Fog of War qoplamasi - butun xarita */}
        {showFog && mapReady && (
          <MapboxGL.BackgroundLayer
            id="fog-background"
            style={{
              backgroundColor: TERRITORY_COLORS.FOG,
              backgroundOpacity: MAP_CONFIG.FOG_OPACITY,
            }}
            layerIndex={1}
          />
        )}

        {/* Egallangan hududlar */}
        {mapReady && nearbyTerritories.length > 0 && (
          <MapboxGL.ShapeSource
            id="territories-source"
            shape={territoriesGeoJSON}
            onPress={event => {
              const feature = event.features[0];
              if (feature) {
                console.log('Hudud bosildi:', feature.properties);
              }
            }}>

            {/* Hudud rangi */}
            <MapboxGL.FillLayer
              id="territories-fill"
              style={{
                fillColor: ['get', 'fillColor'],
                fillOpacity: 0.4,
              }}
            />

            {/* Hudud chegarasi */}
            <MapboxGL.LineLayer
              id="territories-border"
              style={{
                lineColor: ['get', 'borderColor'],
                lineWidth: 1.5,
                lineOpacity: 0.8,
              }}
            />
          </MapboxGL.ShapeSource>
        )}
      </MapboxGL.MapView>

      {/* Yuklash indikatori */}
      {isLoading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="small" color="#4CAF50" />
        </View>
      )}

      {/* Boshqaruv tugmalari */}
      <View style={styles.controls}>
        {/* Fog of War toggle */}
        <TouchableOpacity
          style={[styles.controlButton, showFog && styles.controlButtonActive]}
          onPress={() => setShowFog(!showFog)}>
          <Icon name={showFog ? 'weather-fog' : 'eye'} size={20} color={showFog ? '#4CAF50' : '#9CA3AF'} />
        </TouchableOpacity>

        {/* Mening lokatsiyamga borish */}
        <TouchableOpacity style={styles.controlButton} onPress={flyToUserLocation}>
          <Icon name="crosshairs-gps" size={20} color="#4CAF50" />
        </TouchableOpacity>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <LegendItem color={TERRITORY_COLORS.OWN} label="Mening hududim" />
        <LegendItem color={TERRITORY_COLORS.ENEMY} label="Boshqa o'yinchi" />
      </View>
    </View>
  );
};

const LegendItem = ({ color, label }) => (
  <View style={styles.legendItem}>
    <View style={[styles.legendColor, { backgroundColor: color }]} />
    <Text style={styles.legendText}>{label}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
  loadingOverlay: {
    position: 'absolute', top: 60, right: 20,
    backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 8, padding: 8,
  },
  controls: {
    position: 'absolute', right: 16, bottom: 120,
    gap: 8,
  },
  controlButton: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(22, 27, 34, 0.9)',
    borderWidth: 1, borderColor: '#21262D',
    justifyContent: 'center', alignItems: 'center',
  },
  controlButtonActive: { borderColor: '#4CAF50' },
  legend: {
    position: 'absolute', bottom: 20, left: 16,
    backgroundColor: 'rgba(22, 27, 34, 0.9)',
    borderRadius: 8, padding: 12, gap: 6,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  legendColor: { width: 12, height: 12, borderRadius: 3 },
  legendText: { color: '#9CA3AF', fontSize: 12 },
});

export default MapScreen;
