import { Camera } from '@capacitor/camera';
import { Geolocation } from '@capacitor/geolocation';
import { Capacitor } from '@capacitor/core';

// Check if running in Capacitor (mobile app)
export const isMobile = () => {
  return Capacitor.isNativePlatform();
};

// Get current location using native GPS
export const getCurrentLocation = async () => {
  if (!isMobile()) {
    // Fallback to browser geolocation
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => reject(error)
      );
    });
  }

  try {
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  } catch (error) {
    throw new Error('Unable to get your location. Please enable location permissions.');
  }
};

// Take a photo using native camera
export const takePhoto = async () => {
  if (!isMobile()) {
    // Fallback: trigger file input
    return null;
  }

  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: 'base64',
      source: 'camera',
    });

    // Convert base64 to File object
    const response = await fetch(`data:image/${image.format};base64,${image.base64String}`);
    const blob = await response.blob();
    const file = new File([blob], `photo.${image.format}`, { type: `image/${image.format}` });
    return file;
  } catch (error) {
    if (error.message === 'User cancelled') {
      return null;
    }
    throw new Error('Unable to take photo. Please enable camera permissions.');
  }
};

// Pick a photo from gallery
export const pickPhoto = async () => {
  if (!isMobile()) {
    // Fallback: trigger file input
    return null;
  }

  try {
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: 'base64',
      source: 'photos',
    });

    // Convert base64 to File object
    const response = await fetch(`data:image/${image.format};base64,${image.base64String}`);
    const blob = await response.blob();
    const file = new File([blob], `photo.${image.format}`, { type: `image/${image.format}` });
    return file;
  } catch (error) {
    if (error.message === 'User cancelled') {
      return null;
    }
    throw new Error('Unable to pick photo. Please enable photo library permissions.');
  }
};
