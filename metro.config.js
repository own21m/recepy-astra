const { getDefaultConfig } = require('expo/metro-config');
const config = getDefaultConfig(__dirname);
// Keep local development comfortable while the browser and Expo Go are open.
config.maxWorkers = 2;
module.exports = config;
