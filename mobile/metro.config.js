const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Add .mjs support for lucide-react-native
config.resolver.sourceExts.push('mjs');

module.exports = config;
