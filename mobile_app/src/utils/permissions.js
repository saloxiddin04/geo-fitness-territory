import { Platform, Alert } from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

export const checkLocationPermission = async () => {
  const permission = Platform.OS === 'ios'
    ? PERMISSIONS.IOS.LOCATION_WHEN_IN_USE
    : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;
  const result = await check(permission);
  return result === RESULTS.GRANTED;
};

export const requestLocationPermission = async () => {
  const permission = Platform.OS === 'ios'
    ? PERMISSIONS.IOS.LOCATION_ALWAYS
    : PERMISSIONS.ANDROID.ACCESS_FINE_LOCATION;

  const current = await check(permission);
  if (current === RESULTS.GRANTED) return true;

  const result = await request(permission);
  return result === RESULTS.GRANTED;
};

// Login yoki register dan keyin chaqiriladi
// forceRequest=true: har doim so'ra (register uchun)
// forceRequest=false: faqat berilmagan bo'lsa so'ra (login uchun)
export const handleLocationPermissionAfterAuth = async (forceRequest = false) => {
  try {
    const alreadyGranted = await checkLocationPermission();
    if (alreadyGranted && !forceRequest) return;
    await requestLocationPermission();
  } catch (e) {
    // Ruxsat so'rash xatosi ilovani to'xtatmasin
  }
};
