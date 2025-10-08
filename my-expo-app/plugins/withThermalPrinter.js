const { withAndroidManifest } = require('@expo/config-plugins');

/**
 * Config plugin to add Bluetooth permissions for thermal printer
 */
const withThermalPrinter = (config) => {
  return withAndroidManifest(config, async (config) => {
    const androidManifest = config.modResults.manifest;

    // Ensure uses-permission array exists
    if (!androidManifest['uses-permission']) {
      androidManifest['uses-permission'] = [];
    }

    // Add Bluetooth permissions
    const permissions = [
      'android.permission.BLUETOOTH',
      'android.permission.BLUETOOTH_ADMIN',
      'android.permission.BLUETOOTH_SCAN',
      'android.permission.BLUETOOTH_CONNECT',
      'android.permission.BLUETOOTH_ADVERTISE',
      'android.permission.ACCESS_FINE_LOCATION',
      'android.permission.ACCESS_COARSE_LOCATION',
    ];

    permissions.forEach((permission) => {
      if (
        !androidManifest['uses-permission'].find(
          (item) => item.$['android:name'] === permission
        )
      ) {
        androidManifest['uses-permission'].push({
          $: { 'android:name': permission },
        });
      }
    });

    // Add uses-feature for Bluetooth
    if (!androidManifest['uses-feature']) {
      androidManifest['uses-feature'] = [];
    }

    const features = [
      { name: 'android.hardware.bluetooth', required: false },
      { name: 'android.hardware.bluetooth_le', required: false },
    ];

    features.forEach((feature) => {
      if (
        !androidManifest['uses-feature'].find(
          (item) => item.$['android:name'] === feature.name
        )
      ) {
        androidManifest['uses-feature'].push({
          $: {
            'android:name': feature.name,
            'android:required': feature.required.toString(),
          },
        });
      }
    });

    return config;
  });
};

module.exports = withThermalPrinter;
