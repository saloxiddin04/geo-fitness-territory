// Asosiy navigatsiya tuzilmasi
import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useDispatch, useSelector } from 'react-redux';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

import { restoreUser } from '../store/slices/authSlice';

// Ekranlar
import SplashScreen from '../screens/Auth/SplashScreen';
import LoginScreen from '../screens/Auth/LoginScreen';
import RegisterScreen from '../screens/Auth/RegisterScreen';
import HomeScreen from '../screens/Home/HomeScreen';
import MapScreen from '../screens/Map/MapScreen';
import RunningScreen from '../screens/Running/RunningScreen';
import RunningResultScreen from '../screens/Running/RunningResultScreen';
import ProfileScreen from '../screens/Profile/ProfileScreen';
import FitnessScreen from '../screens/Fitness/FitnessScreen';
import LeaderboardScreen from '../screens/Leaderboard/LeaderboardScreen';
import NotificationsScreen from '../screens/Notifications/NotificationsScreen';
import SettingsScreen from '../screens/Settings/SettingsScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Tab bar ikonasi
const TabBarIcon = ({ name, color, size }) => (
  <Icon name={name} color={color} size={size} />
);

// Pastki tab navigatsiya
const MainTabNavigator = () => {
  const unreadCount = useSelector(state => state.notification.unreadCount);

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0D1117',
          borderTopColor: '#21262D',
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: '#4CAF50',
        tabBarInactiveTintColor: '#6B7280',
      }}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Bosh sahifa',
          tabBarIcon: props => <TabBarIcon name="home" {...props} />,
        }}
      />
      <Tab.Screen
        name="Map"
        component={MapScreen}
        options={{
          tabBarLabel: 'Xarita',
          tabBarIcon: props => <TabBarIcon name="map" {...props} />,
        }}
      />
      <Tab.Screen
        name="Running"
        component={RunningScreen}
        options={{
          tabBarLabel: 'Yugurish',
          tabBarIcon: props => <TabBarIcon name="run" {...props} />,
        }}
      />
      <Tab.Screen
        name="Leaderboard"
        component={LeaderboardScreen}
        options={{
          tabBarLabel: 'Reyting',
          tabBarIcon: props => <TabBarIcon name="trophy" {...props} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarLabel: 'Profil',
          tabBarIcon: props => <TabBarIcon name="account" {...props} />,
        }}
      />
    </Tab.Navigator>
  );
};

// Auth navigatsiya
const AuthNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
  </Stack.Navigator>
);

// Asosiy navigatsiya - auth holatiga qarab yo'naltirish
const AppNavigator = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, isRestoring } = useSelector(state => state.auth);

  // App yuklanayotganda tokenni tekshirish
  useEffect(() => {
    dispatch(restoreUser());
  }, [dispatch]);

  // Tiklash jarayonida loading ko'rsatish
  if (isRestoring) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen
              name="RunningResult"
              component={RunningResultScreen}
              options={{ presentation: 'modal' }}
            />
            <Stack.Screen name="Fitness" component={FitnessScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#0D1117',
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default AppNavigator;
