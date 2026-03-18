module.exports = function (api) {
  api.cache(true);
  // Ensure NODE_ENV is set for tools that might be called during babel processing
  process.env.NODE_ENV = process.env.NODE_ENV || 'development';
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      'react-native-reanimated/plugin',
    ],
  };
};
