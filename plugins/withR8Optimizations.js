const {
  withAppBuildGradle,
  withGradleProperties,
  AndroidConfig,
} = require('@expo/config-plugins');

let patchScript;
try {
  patchScript = require('../scripts/patch-bitmap-downsampling');
} catch {}

/**
 * Expo Config Plugin to enable full R8 code optimization and optimized resource shrinking.
 *
 * 1. Replaces default `proguard-android.txt` (which has `-dontoptimize`) with `proguard-android-optimize.txt`.
 * 2. Adds `android.r8.optimizedResourceShrinking=true` to `gradle.properties`.
 * 3. Ensures BitmapFactory calls in native dependencies use BitmapFactory.Options and downsampling.
 */
function withR8Optimizations(config) {
  // Ensure bitmap downsampling patch is applied before build
  if (patchScript?.run) {
    try {
      patchScript.run();
    } catch {}
  }

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
