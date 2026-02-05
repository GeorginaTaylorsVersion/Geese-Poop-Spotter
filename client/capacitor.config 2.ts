import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.waterloo.geesepoopspotter',
  appName: 'Geese Poop Spotter',
  webDir: 'build',
  server: {
    androidScheme: 'https',
    iosScheme: 'https'
  },
  plugins: {
    Camera: {
      permissions: {
        camera: 'This app needs access to your camera to take photos of geese poop.',
        photos: 'This app needs access to your photos to select images.'
      }
    },
    Geolocation: {
      permissions: {
        location: 'This app needs access to your location to report geese poop locations on campus.'
      }
    }
  }
};

export default config;
