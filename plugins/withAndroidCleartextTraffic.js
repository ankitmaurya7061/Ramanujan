const { withAndroidManifest } = require("@expo/config-plugins");

module.exports = function withAndroidCleartextTraffic(config) {
  return withAndroidManifest(config, (config) => {
    const application =
      config.modResults.manifest.application?.[0];

    if (!application) {
      throw new Error(
        "Could not find the Android application manifest entry."
      );
    }

    application.$["android:usesCleartextTraffic"] = "true";
    return config;
  });
};
