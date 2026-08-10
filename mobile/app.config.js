// app.config.js — Expo Dynamic Config
// Configures MapLibre React Native plugin for native build setup.

const mapLibrePlugin = require('@maplibre/maplibre-react-native/app.plugin.js');
const withMapLibre = typeof mapLibrePlugin === 'function' ? mapLibrePlugin : mapLibrePlugin.default;

module.exports = ({ config }) => {
    return withMapLibre(config);
};
