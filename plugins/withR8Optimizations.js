const {
  withAppBuildGradle,
  withGradleProperties,
  AndroidConfig,
} = require('@expo/config-plugins');

/**
 * Expo Config Plugin to enable full R8 code optimization and optimized resource shrinking.
 *
 * 1. Replaces default `proguard-android.txt` (which has `-dontoptimize`) with `proguard-android-optimize.txt`.
 * 2. Adds `android.r8.optimizedResourceShrinking=true` to `gradle.properties`.
 */
function withR8Optimizations(config) {
  // 1. In app/build.gradle: use proguard-android-optimize.txt
  config = withAppBuildGradle(config, (modConfig) => {
    if (modConfig.modResults.language === 'groovy') {
      modConfig.modResults.contents = modConfig.modResults.contents.replace(
        /getDefaultProguardFile\(['"]proguard-android\.txt['"]\)/g,
        'getDefaultProguardFile("proguard-android-optimize.txt")'
      );
    }
    return modConfig;
  });

  // 2. In gradle.properties: enable R8 optimized resource shrinking
  config = withGradleProperties(config, (modConfig) => {
    AndroidConfig.BuildProperties.updateAndroidBuildProperty(
      modConfig.modResults,
      'android.r8.optimizedResourceShrinking',
      'true'
    );
    return modConfig;
  });

  return config;
}

module.exports = withR8Optimizations;
