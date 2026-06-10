// Splash Screen - ilova yuklanayotganda
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const SplashScreen = () => {
  return (
    <LinearGradient
      colors={['#0D1117', '#161B22', '#0D1117']}
      style={styles.container}>
      <View style={styles.content}>
        <View style={styles.logoContainer}>
          <Icon name="run-fast" size={80} color="#4CAF50" />
        </View>
        <Text style={styles.title}>Geo Fitness</Text>
        <Text style={styles.subtitle}>Territory Game</Text>
        <Text style={styles.tagline}>O'zbekiston xaritasini egallang!</Text>
        <ActivityIndicator
          size="large"
          color="#4CAF50"
          style={styles.loader}
        />
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  logoContainer: {
    width: 120, height: 120, borderRadius: 60,
    backgroundColor: '#161B22', justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#4CAF50', marginBottom: 20,
  },
  title: { color: '#F9FAFB', fontSize: 36, fontWeight: 'bold', letterSpacing: 2 },
  subtitle: { color: '#4CAF50', fontSize: 18, marginTop: 4 },
  tagline: { color: '#6B7280', fontSize: 14, marginTop: 8 },
  loader: { marginTop: 40 },
});

export default SplashScreen;
