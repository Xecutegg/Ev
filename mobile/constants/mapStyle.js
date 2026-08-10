// MapLibre MapTiler Style Configuration
// MapTiler key is loaded from process.env.EXPO_PUBLIC_MAPTILER_KEY

const MAPTILER_KEY = process.env.EXPO_PUBLIC_MAPTILER_KEY || 'qy8NKpz2Rwhggyjgyk55';

export const MAPTILER_STYLE_URL = `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`;

// Default export for backward compatibility
export const CLEAN_MAP_STYLE = MAPTILER_STYLE_URL;

export default CLEAN_MAP_STYLE;
