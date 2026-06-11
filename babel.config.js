module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // react-native-worklets/plugin MUST be listed before react-native-reanimated/plugin
      'react-native-worklets/plugin',
      'react-native-reanimated/plugin',
    ],
  };
};
