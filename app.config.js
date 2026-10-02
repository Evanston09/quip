const { AndroidConfig, withAndroidManifest } = require('expo/config-plugins');

module.exports = ({ config }) =>
  withAndroidManifest(config, (androidConfig) => {
    // Opt in only for test APKs that call the local HTTP API.
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(
      androidConfig.modResults
    );
    application.$['android:usesCleartextTraffic'] =
      process.env.LOCAL_ANDROID_APK === '1' ? 'true' : 'false';
    return androidConfig;
  });
