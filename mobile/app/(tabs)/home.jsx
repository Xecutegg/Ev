import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    StatusBar,
    Animated,
    Dimensions,
    SafeAreaView,
    Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext.jsx';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import stationService from '../../services/station.service.js';
import bookingService from '../../services/booking.service.js';

// Native Map & WebView components
let MapView, Marker, PROVIDER_GOOGLE, WebView;
try {
    const Maps = require('react-native-maps');
    MapView = Maps.default || Maps;
    Marker = Maps.Marker;
    PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
} catch (_e) { }

try {
    const Web = require('react-native-webview');
    WebView = Web.WebView || Web.default || Web;
} catch (_e) { }

const { width, height } = Dimensions.get('window');
const GOOGLE_MAPS_API_KEY = 'AIzaSyCv95QW0IJO_m718bSrFlgkvMM5QmgXWGA';

const DEFAULT_LOCATION = {
    latitude: 28.6139,
    longitude: 77.209,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
};

const CLEAN_MAP_STYLE = [
    {
        featureType: 'all',
        elementType: 'labels.icon',
        stylers: [{ visibility: 'off' }],
    },
    {
        featureType: 'poi',
        elementType: 'all',
        stylers: [{ visibility: 'off' }],
    },
    {
        featureType: 'poi',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }],
    },
    {
        featureType: 'poi',
        elementType: 'labels.icon',
        stylers: [{ visibility: 'off' }],
    },
    {
        featureType: 'poi',
        elementType: 'labels.text',
        stylers: [{ visibility: 'off' }],
    },
    {
        featureType: 'poi.school',
        elementType: 'all',
        stylers: [{ visibility: 'off' }],
    },
    {
        featureType: 'poi.school',
        elementType: 'labels',
        stylers: [{ visibility: 'off' }],
    },
    {
        featureType: 'poi.school',
        elementType: 'labels.icon',
        stylers: [{ visibility: 'off' }],
    },
    {
        featureType: 'poi.government',
        elementType: 'all',
        stylers: [{ visibility: 'off' }],
    },
    {
        featureType: 'poi.medical',
        elementType: 'all',
        stylers: [{ visibility: 'off' }],
    },
    {
        featureType: 'poi.park',
        elementType: 'all',
        stylers: [{ visibility: 'off' }],
    },
    {
        featureType: 'poi.place_of_worship',
        elementType: 'all',
        stylers: [{ visibility: 'off' }],
    },
    {
        featureType: 'poi.attraction',
        elementType: 'all',
        stylers: [{ visibility: 'off' }],
    },
    {
        featureType: 'poi.business',
        elementType: 'all',
        stylers: [{ visibility: 'off' }],
    },
    {
        featureType: 'transit',
        elementType: 'all',
        stylers: [{ visibility: 'off' }],
    },
    {
        featureType: 'administrative',
        elementType: 'labels',
        stylers: [{ visibility: 'on' }],
    },
    {
        featureType: 'road',
        elementType: 'labels',
        stylers: [{ visibility: 'on' }],
    },
];

const RED_PIN_SVG = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="36" height="44" viewBox="0 0 36 44"><path d="M18 0 C8 0 0 8 0 18 C0 28 15 42 18 44 C21 42 36 28 36 18 C36 8 28 0 18 0 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="1"/><circle cx="18" cy="17" r="12.5" fill="#ef4444"/><path d="M19 8 L11 20 L17 20 L16 27 L25 15 L19 15 Z" fill="#ffffff"/></svg>');

function HomeScreen() {
    const { user, logout } = useAuth();
    const router = useRouter();
    const insets = useSafeAreaInsets();

    const [location, setLocation] = useState(null);
    const [address, setAddress] = useState('Fetching location...');
    const [isLoadingLocation, setIsLoadingLocation] = useState(true);
    const [showProfileModal, setShowProfileModal] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [stations, setStations] = useState([]);
    const [isLoadingStations, setIsLoadingStations] = useState(true);

    // Slot Booking State
    const [selectedStation, setSelectedStation] = useState(null);
    const [showBookingModal, setShowBookingModal] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [selectedSlot, setSelectedSlot] = useState('10:00 AM - 11:00 AM');
    const [durationHours, setDurationHours] = useState(1);
    const [selectedConnector, setSelectedConnector] = useState('CCS2');
    const [isBookingSubmitting, setIsBookingSubmitting] = useState(false);
    const [razorpayOrder, setRazorpayOrder] = useState(null);
    const [showRazorpayModal, setShowRazorpayModal] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [confirmedBookingDetails, setConfirmedBookingDetails] = useState(null);

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;
    const modalSlideAnim = useRef(new Animated.Value(height)).current;
    const bookingSlideAnim = useRef(new Animated.Value(height)).current;
    const pulseAnim = useRef(new Animated.Value(1)).current;

    const mapRef = useRef(null);
    const webViewRef = useRef(null);

    const generateTimeSlots = (st) => {
        const slots = [];
        let startH = 6;
        let endH = 22;

        if (st?.operatingDays?.includes('24/7')) {
            startH = 0;
            endH = 24;
        }

        for (let h = startH; h < endH; h++) {
            const nextH = h + 1;
            const fmt = (hour) => {
                const period = hour >= 12 && hour < 24 ? 'PM' : 'AM';
                let displayH = hour % 12;
                if (displayH === 0) displayH = 12;
                return `${displayH.toString().padStart(2, '0')}:00 ${period}`;
            };
            slots.push(`${fmt(h)} - ${fmt(nextH)}`);
        }
        return slots.length > 0 ? slots : ['08:00 AM - 09:00 AM', '09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM', '11:00 AM - 12:00 PM', '12:00 PM - 01:00 PM', '01:00 PM - 02:00 PM', '02:00 PM - 03:00 PM'];
    };

    const openSlotBookingModal = (st) => {
        setSelectedStation(st);
        const slots = generateTimeSlots(st);
        if (slots.length > 0) setSelectedSlot(slots[0]);
        if (st.connectors && st.connectors.length > 0) setSelectedConnector(st.connectors[0]);
        setShowBookingModal(true);
        Animated.spring(bookingSlideAnim, {
            toValue: 0,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
        }).start();
    };

    const hideSlotBookingModal = () => {
        Animated.timing(bookingSlideAnim, {
            toValue: height,
            duration: 250,
            useNativeDriver: true,
        }).start(() => {
            setShowBookingModal(false);
            setSelectedStation(null);
        });
    };

    const handleInitiateRazorpayPayment = async () => {
        if (!selectedStation) return;
        setIsBookingSubmitting(true);
        try {
            const res = await bookingService.createOrder({
                stationId: selectedStation._id,
                slotDate: selectedDate,
                slotTime: selectedSlot,
                durationHours,
                connectorType: selectedConnector,
            });

            if (res.success && res.orderId) {
                setRazorpayOrder(res);
                setShowRazorpayModal(true);
            } else {
                Alert.alert('Booking Error', res.message || 'Could not initiate payment order');
            }
        } catch (err) {
            Alert.alert('Payment Error', err.response?.data?.message || err.message || 'Razorpay order creation failed');
        } finally {
            setIsBookingSubmitting(false);
        }
    };

    const handleRazorpayWebMessage = async (event) => {
        try {
            const data = typeof event.nativeEvent?.data === 'string' ? JSON.parse(event.nativeEvent.data) : event.data;
            if (data.type === 'RAZORPAY_SUCCESS') {
                setShowRazorpayModal(false);
                hideSlotBookingModal();

                const verifyRes = await bookingService.verifyPayment({
                    razorpayOrderId: data.razorpay_order_id,
                    razorpayPaymentId: data.razorpay_payment_id,
                    razorpaySignature: data.razorpay_signature,
                    bookingId: data.bookingId,
                });

                if (verifyRes.success) {
                    setConfirmedBookingDetails({
                        stationName: selectedStation?.stationName || 'EV Station',
                        brand: selectedStation?.operatorBrand || 'Cutiepie',
                        slotTime: selectedSlot,
                        date: selectedDate,
                        duration: durationHours,
                        amount: (selectedStation?.priceRate || 15) * durationHours,
                        bookingId: data.razorpay_order_id ? data.razorpay_order_id.slice(-8) : 'CONFIRMED',
                    });
                    setShowSuccessModal(true);
                } else {
                    Alert.alert('Payment Verification Failed', verifyRes.message || 'Invalid signature');
                }
            } else if (data.type === 'RAZORPAY_CANCEL') {
                setShowRazorpayModal(false);
            }
        } catch (_err) {}
    };

    useEffect(() => {
        getCurrentLocation();
        fetchStations();
        animateEntrance();
        startPulseAnimation();
    }, []);

    const fetchStations = async () => {
        setIsLoadingStations(true);
        try {
            const res = await stationService.getAllStations();
            if (res.success && Array.isArray(res.data)) {
                const validStations = res.data.filter(st => {
                    const lat = st.location?.coordinates?.[1];
                    const lng = st.location?.coordinates?.[0];
                    return lat && lng && !isNaN(lat) && !isNaN(lng);
                });
                setStations(validStations);
            }
        } catch (_err) {
            console.warn('Failed to load stations for map:', _err);
        } finally {
            setIsLoadingStations(false);
        }
    };

    useEffect(() => {
        if (location && location.latitude && location.longitude) {
            animateMapTo(location);
        }
    }, [location]);

    const animateEntrance = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 800,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                friction: 8,
                tension: 40,
                useNativeDriver: true,
            }),
        ]).start();
    };

    const startPulseAnimation = () => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1.15,
                    duration: 1500,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1500,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    };

    const animateMapTo = (coords) => {
        if (!coords || !coords.latitude || !coords.longitude) return;

        if (mapRef.current) {
            if (mapRef.current.animateToRegion) {
                mapRef.current.animateToRegion(coords, 800);
            } else if (mapRef.current.animateCamera) {
                mapRef.current.animateCamera({ center: coords, zoom: 16 }, { duration: 800 });
            }
        }

        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            try {
                const iframe = document.querySelector('iframe[title="Live Location Map"]');
                if (iframe && iframe.contentWindow && iframe.contentWindow.gMap) {
                    iframe.contentWindow.gMap.panTo({ lat: coords.latitude, lng: coords.longitude });
                    iframe.contentWindow.gMap.setZoom(16);
                }
            } catch (_e) { }
        }

        if (webViewRef.current && webViewRef.current.injectJavaScript) {
            webViewRef.current.injectJavaScript(`
                if (window.gMap) {
                    window.gMap.panTo({ lat: ${coords.latitude}, lng: ${coords.longitude} });
                    window.gMap.setZoom(16);
                }
                true;
            `);
        }
    };

    const fetchAddressAsync = (lat, lng) => {
        if (Location && typeof Location.reverseGeocodeAsync === 'function') {
            Location.reverseGeocodeAsync({ latitude: lat, longitude: lng })
                .then(([place]) => {
                    if (place) {
                        const formattedAddress = [
                            place.name || place.street,
                            place.city || place.subregion || place.district,
                            place.region,
                        ]
                            .filter(Boolean)
                            .join(', ');
                        setAddress(formattedAddress || 'Your Location');
                    }
                })
                .catch(() => {});
        }
    };

    const getCurrentLocation = async () => {
        setIsLoadingLocation(true);
        try {
            if (Location && typeof Location.requestForegroundPermissionsAsync === 'function') {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    try {
                        if (typeof Location.getLastKnownPositionAsync === 'function') {
                            const lastKnown = await Location.getLastKnownPositionAsync({ maxAge: 120000 });
                            if (lastKnown && lastKnown.coords) {
                                const coords = {
                                    latitude: lastKnown.coords.latitude,
                                    longitude: lastKnown.coords.longitude,
                                    latitudeDelta: 0.015,
                                    longitudeDelta: 0.015,
                                };
                                setLocation(coords);
                                animateMapTo(coords);
                                setIsLoadingLocation(false);
                                fetchAddressAsync(coords.latitude, coords.longitude);
                                return coords;
                            }
                        }
                    } catch (_lkErr) {}

                    try {
                        const currentPos = await Promise.race([
                            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low }),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 2500))
                        ]);
                        if (currentPos && currentPos.coords) {
                            const coords = {
                                latitude: currentPos.coords.latitude,
                                longitude: currentPos.coords.longitude,
                                latitudeDelta: 0.015,
                                longitudeDelta: 0.015,
                            };
                            setLocation(coords);
                            animateMapTo(coords);
                            setIsLoadingLocation(false);
                            fetchAddressAsync(coords.latitude, coords.longitude);
                            return coords;
                        }
                    } catch (_curErr) {}
                }
            }

            if (typeof navigator !== 'undefined' && navigator?.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => {
                        const coords = {
                            latitude: pos.coords.latitude,
                            longitude: pos.coords.longitude,
                            latitudeDelta: 0.015,
                            longitudeDelta: 0.015,
                        };
                        setLocation(coords);
                        setIsLoadingLocation(false);
                        animateMapTo(coords);
                        fetchAddressAsync(coords.latitude, coords.longitude);
                    },
                    () => {
                        if (!location) setLocation(DEFAULT_LOCATION);
                        setIsLoadingLocation(false);
                    },
                    { timeout: 3000, enableHighAccuracy: false }
                );
                return;
            }

            if (!location) setLocation(DEFAULT_LOCATION);
        } catch (err) {
            if (!location) setLocation(DEFAULT_LOCATION);
        } finally {
            setIsLoadingLocation(false);
        }
        return location || DEFAULT_LOCATION;
    };

    const handleCenterOnUser = async () => {
        setIsRefreshing(true);

        if (location) {
            animateMapTo(location);
        }

        try {
            if (Location && typeof Location.requestForegroundPermissionsAsync === 'function') {
                const lastKnown = await Location.getLastKnownPositionAsync({});
                if (lastKnown && lastKnown.coords) {
                    const freshCoords = {
                        latitude: lastKnown.coords.latitude,
                        longitude: lastKnown.coords.longitude,
                        latitudeDelta: 0.015,
                        longitudeDelta: 0.015,
                    };
                    setLocation(freshCoords);
                    animateMapTo(freshCoords);
                    fetchAddressAsync(freshCoords.latitude, freshCoords.longitude);
                }
            }
        } catch (_err) {
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleLogout = async () => {
        setShowProfileModal(false);
        Alert.alert(
            'Logout',
            'Are you sure you want to log out?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                    },
                },
            ]
        );
    };

    const showModal = () => {
        setShowProfileModal(true);
        Animated.spring(modalSlideAnim, {
            toValue: 0,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
        }).start();
    };

    const hideModal = () => {
        Animated.timing(modalSlideAnim, {
            toValue: height,
            duration: 300,
            useNativeDriver: true,
        }).start(() => setShowProfileModal(false));
    };

    const currentCoords = location || DEFAULT_LOCATION;
    const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';

    // Prepare station data for web
    const stationsDataForWeb = stations.map((st) => ({
        id: st._id,
        name: st.stationName || 'EV Station',
        lat: st.location?.coordinates?.[1],
        lng: st.location?.coordinates?.[0],
        power: st.powerOutput || '7.2 kW',
        price: st.priceRate || 15,
        pricingType: st.pricingType || 'per_kwh',
    })).filter(st => st.lat && st.lng && !isNaN(st.lat) && !isNaN(st.lng));

    const lightThemeGoogleMapsHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <style>
        html, body, #map { height: 100%; margin: 0; padding: 0; background: #f0fdf4; }
        .gmnoprint, .gm-style-cc, a[href^="https://maps.google.com/maps"], a[aria-label^="Google"] {
          display: none !important;
        }
      </style>
      <script src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}"></script>
      <script>
        var gMap, userPos;
        function initMap() {
          userPos = { lat: ${currentCoords.latitude}, lng: ${currentCoords.longitude} };
          gMap = new google.maps.Map(document.getElementById('map'), {
            zoom: 16,
            center: userPos,
            mapTypeId: 'roadmap',
            disableDefaultUI: true,
            zoomControl: false,
            mapTypeControl: false,
            scaleControl: false,
            streetViewControl: false,
            rotateControl: false,
            fullscreenControl: false,
            styles: ${JSON.stringify(CLEAN_MAP_STYLE)}
          });

          window.gMap = gMap;

          // User location marker
          new google.maps.Marker({
            position: userPos,
            map: gMap,
            title: "${user?.name || 'User Location'}",
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: '#10b981',
              fillOpacity: 1,
              strokeColor: '#ffffff',
              strokeWeight: 4,
              scale: 12,
              anchor: new google.maps.Point(0, 0)
            },
            zIndex: 2
          });

          new google.maps.Marker({
            position: userPos,
            map: gMap,
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: '#10b981',
              fillOpacity: 0.15,
              strokeColor: '#10b981',
              strokeWeight: 1.5,
              scale: 22,
              anchor: new google.maps.Point(0, 0)
            },
            zIndex: 1
          });

          // Render EV Charging Stations using Red Lightning Teardrop Pin
          var stationsData = ${JSON.stringify(stationsDataForWeb)};

          stationsData.forEach(function(st) {
              if (!st.lat || !st.lng) return;
              var stPos = { lat: parseFloat(st.lat), lng: parseFloat(st.lng) };

              var stMarker = new google.maps.Marker({
                  position: stPos,
                  map: gMap,
                  title: "⚡ " + st.name + " (" + st.power + ")",
                  icon: {
                      url: "${RED_PIN_SVG}",
                      size: new google.maps.Size(36, 44),
                      scaledSize: new google.maps.Size(36, 44),
                      anchor: new google.maps.Point(18, 44)
                  },
                  zIndex: 100
              });

              var infoWindow = new google.maps.InfoWindow({
                  content: '<div style="padding:6px;font-family:sans-serif;"><b>⚡ ' + st.name + '</b><br><span style="color:#ef4444;font-weight:bold;">₹' + st.price + ' / ' + (st.pricingType === 'per_kwh' ? 'kWh' : 'hr') + '</span> • ' + st.power + '</div>'
              });

              stMarker.addListener('click', function() {
                  if (window.ReactNativeWebView) {
                      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SELECT_STATION', id: st.id }));
                  } else {
                      infoWindow.open(gMap, stMarker);
                  }
              });
          });
        }
        window.onload = initMap;
      </script>
    </head>
    <body>
      <div id="map"></div>
    </body>
    </html>
`;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

            {/* Map Container */}
            <View style={styles.mapContainer}>
                {Platform.OS === 'web' ? (
                    <View style={styles.webMapFallback}>
                        <iframe
                            title="Live Location Map"
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            srcDoc={lightThemeGoogleMapsHtml}
                        />
                    </View>
                ) : MapView ? (
                    <MapView
                        ref={mapRef}
                        style={styles.map}
                        provider={PROVIDER_GOOGLE}
                        mapType="hybrid"
                        customMapStyle={CLEAN_MAP_STYLE}
                        initialRegion={currentCoords}
                        showsUserLocation={false}
                        showsMyLocationButton={false}
                        showsCompass={false}
                    >
                        {location && (
                            <Marker
                                coordinate={location}
                                title={user?.name || 'My Location'}
                                description={address}
                                anchor={{ x: 0.5, y: 0.5 }}
                            >
                                <View style={styles.gmapMarkerContainer}>
                                    <View style={styles.gmapOuterRing} />
                                    <View style={styles.gmapDot}>
                                        <View style={styles.gmapDotInner} />
                                    </View>
                                </View>
                            </Marker>
                        )}

                        {/* Render All Database Charging Stations */}
                        {stations.map((st) => {
                            const lat = st.location?.coordinates?.[1];
                            const lng = st.location?.coordinates?.[0];
                            
                            if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;

                            return (
                                <Marker
                                    key={st._id}
                                    coordinate={{ 
                                        latitude: parseFloat(lat), 
                                        longitude: parseFloat(lng) 
                                    }}
                                    onPress={() => openSlotBookingModal(st)}
                                    anchor={{ x: 0.5, y: 1.0 }}
                                >
                                    <View style={styles.teardropMarkerContainer}>
                                        {/* Red Teardrop Pin Shell */}
                                        <View style={styles.teardropPinShell}>
                                            <View style={styles.teardropInnerCircle}>
                                                <Ionicons name="flash" size={16} color="#ffffff" />
                                            </View>
                                        </View>
                                        <View style={styles.teardropPointerTip} />
                                    </View>
                                </Marker>
                            );
                        })}
                    </MapView>
                ) : WebView ? (
                    <WebView
                        ref={webViewRef}
                        originWhitelist={['*']}
                        source={{ html: lightThemeGoogleMapsHtml }}
                        style={{ flex: 1 }}
                        onMessage={(event) => {
                            try {
                                const data = JSON.parse(event.nativeEvent.data);
                                if (data.type === 'SELECT_STATION') {
                                    const found = stations.find(s => s._id === data.id);
                                    if (found) openSlotBookingModal(found);
                                }
                            } catch (_e) {}
                        }}
                    />
                ) : (
                    <View style={styles.webMapFallback}>
                        <ActivityIndicator size="large" color="#10b981" />
                    </View>
                )}

                {/* Location Button */}
                <Animated.View style={[styles.fabContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                    <TouchableOpacity
                        style={styles.myLocationFab}
                        onPress={handleCenterOnUser}
                        activeOpacity={0.8}
                    >
                        {isRefreshing ? (
                            <ActivityIndicator size="small" color="#10b981" />
                        ) : (
                            <Ionicons name="locate" size={24} color="#10b981" />
                        )}
                    </TouchableOpacity>
                </Animated.View>

                {/* Station Loading Indicator */}
                {isLoadingStations && (
                    <View style={styles.loadingStationsOverlay}>
                        <ActivityIndicator size="small" color="#10b981" />
                        <Text style={styles.loadingStationsText}>Loading stations...</Text>
                    </View>
                )}
            </View>

            {/* Floating Header */}
            <Animated.View
                style={[styles.header, { paddingTop: Math.max(insets.top + 12, 40), opacity: fadeAnim }]}
                pointerEvents="box-none"
            >
                <BlurView intensity={80} tint="light" style={styles.headerBlur}>
                    <View style={styles.headerContent}>
                        <View style={styles.locationBadge}>
                            <Ionicons name="location" size={18} color="#10b981" />
                            <Text style={styles.locationText} numberOfLines={1}>
                                {address}
                            </Text>
                        </View>

                        <View style={styles.headerActions}>
                            <TouchableOpacity
                                style={styles.partnerButton}
                                onPress={() => router.push('/partner')}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['#10b981', '#059669']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.partnerGradient}
                                >
                                    <Ionicons name="add" size={16} color="#fff" />
                                    <Text style={styles.partnerButtonText}>Partner</Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.avatarButton}
                                onPress={showModal}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['#10b981', '#059669']}
                                    style={styles.avatarGradient}
                                >
                                    <Text style={styles.avatarText}>{userInitial}</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </BlurView>
            </Animated.View>

            {/* Profile Modal */}
            <Modal
                visible={showProfileModal}
                transparent={true}
                animationType="none"
                onRequestClose={hideModal}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={hideModal}
                >
                    <Animated.View
                        style={[styles.modalContainer, { transform: [{ translateY: modalSlideAnim }] }]}
                        onStartShouldSetResponder={() => true}
                    >
                        <View style={styles.modalHandle} />

                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Profile</Text>
                            <TouchableOpacity onPress={hideModal} style={styles.closeButton}>
                                <Ionicons name="close" size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.profileCard}>
                            <LinearGradient
                                colors={['#10b981', '#059669']}
                                style={styles.bigAvatarGradient}
                            >
                                <Text style={styles.bigAvatarText}>{userInitial}</Text>
                            </LinearGradient>
                            <Text style={styles.profileName}>{user?.name || 'User'}</Text>
                            <Text style={styles.profileEmail}>{user?.email || 'user@example.com'}</Text>
                            {user?.username && (
                                <View style={styles.usernameBadge}>
                                    <Ionicons name="at" size={14} color="#10b981" />
                                    <Text style={styles.profileUsername}>{user.username}</Text>
                                </View>
                            )}
                        </View>

                        <View style={styles.infoSection}>
                            <View style={styles.infoRow}>
                                <View style={styles.infoIcon}>
                                    <Ionicons name="checkmark-circle" size={20} color="#10b981" />
                                </View>
                                <Text style={styles.infoText}>Verified Account</Text>
                                <View style={styles.infoBadge}>
                                    <Text style={styles.infoBadgeText}>Active</Text>
                                </View>
                            </View>
                            <View style={styles.infoRow}>
                                <View style={styles.infoIcon}>
                                    <Ionicons name="shield-checkmark" size={20} color="#10b981" />
                                </View>
                                <Text style={styles.infoText}>Role: {user?.role || 'Customer'}</Text>
                            </View>
                        </View>

                        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
                            <LinearGradient
                                colors={['#ef4444', '#dc2626']}
                                style={styles.logoutGradient}
                            >
                                <Ionicons name="log-out" size={20} color="#ffffff" />
                                <Text style={styles.logoutButtonText}>Logout</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                </TouchableOpacity>
            </Modal>

            {/* ⚡ EV Slot Booking Bottom Sheet Modal */}
            <Modal visible={showBookingModal} transparent animationType="none">
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={hideSlotBookingModal}
                >
                    <Animated.View
                        style={[
                            styles.bookingModalContent,
                            { transform: [{ translateY: bookingSlideAnim }] },
                        ]}
                    >
                        <Pressable style={{ flex: 1 }} onPress={(e) => e.stopPropagation()}>
                            <View style={styles.sheetHandle} />

                            {selectedStation && (
                                <>
                                    {/* Station Header */}
                                    <View style={styles.bookingHeaderRow}>
                                        <View style={{ flex: 1 }}>
                                            <View style={styles.brandRow}>
                                                <Text style={styles.bookingBrandName}>{selectedStation.operatorBrand || 'Cutiepie'}</Text>
                                                <View style={styles.availBadge}>
                                                    <Ionicons name="ellipse" size={8} color="#10b981" />
                                                    <Text style={styles.availText}>{selectedStation.status || 'Available'}</Text>
                                                </View>
                                            </View>
                                            <Text style={styles.bookingStationTitle}>⚡ {selectedStation.stationName}</Text>
                                            <Text style={styles.bookingAddressText} numberOfLines={1}>
                                                📍 {selectedStation.address || selectedStation.cityState}
                                            </Text>
                                        </View>
                                        <TouchableOpacity style={styles.closeModalBtn} onPress={hideSlotBookingModal}>
                                            <Ionicons name="close" size={20} color="#64748b" />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Quick Spec Chips */}
                                    <View style={styles.specChipsRow}>
                                        <View style={styles.specChip}>
                                            <Ionicons name="flash" size={14} color="#10b981" />
                                            <Text style={styles.specChipText}>{selectedStation.powerOutput || '7.2 kW'}</Text>
                                        </View>
                                        <View style={styles.specChip}>
                                            <Ionicons name="pricetag" size={14} color="#10b981" />
                                            <Text style={styles.specChipText}>₹{selectedStation.priceRate || 15} / kWh</Text>
                                        </View>
                                        <View style={styles.specChip}>
                                            <Ionicons name="time" size={14} color="#10b981" />
                                            <Text style={styles.specChipText}>{selectedStation.operatingDays || '24/7'}</Text>
                                        </View>
                                    </View>

                                    {/* Connector Selector */}
                                    {selectedStation.connectors && selectedStation.connectors.length > 0 && (
                                        <View style={styles.sectionBlock}>
                                            <Text style={styles.sectionTitleText}>Select Connector</Text>
                                            <View style={styles.connectorRow}>
                                                {selectedStation.connectors.map((c) => (
                                                    <TouchableOpacity
                                                        key={c}
                                                        style={[styles.connectorChip, selectedConnector === c && styles.connectorChipActive]}
                                                        onPress={() => setSelectedConnector(c)}
                                                    >
                                                        <Ionicons name="hardware-chip" size={16} color={selectedConnector === c ? '#ffffff' : '#059669'} />
                                                        <Text style={[styles.connectorChipText, selectedConnector === c && styles.connectorChipTextActive]}>{c}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        </View>
                                    )}

                                    {/* Slot Date Selector */}
                                    <View style={styles.sectionBlock}>
                                        <Text style={styles.sectionTitleText}>Select Date</Text>
                                        <View style={styles.dateRow}>
                                            {[0, 1, 2].map((offset) => {
                                                const d = new Date();
                                                d.setDate(d.getDate() + offset);
                                                const dateStr = d.toISOString().split('T')[0];
                                                const label = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
                                                const isSel = selectedDate === dateStr;
                                                return (
                                                    <TouchableOpacity
                                                        key={dateStr}
                                                        style={[styles.dateChip, isSel && styles.dateChipActive]}
                                                        onPress={() => setSelectedDate(dateStr)}
                                                    >
                                                        <Text style={[styles.dateChipText, isSel && styles.dateChipTextActive]}>{label}</Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>

                                    {/* 1-Hour Time Slots */}
                                    <View style={styles.sectionBlock}>
                                        <Text style={styles.sectionTitleText}>Available 1-Hour Time Slots</Text>
                                        <View style={styles.slotsGrid}>
                                            {generateTimeSlots(selectedStation).slice(0, 8).map((slot) => {
                                                const isSel = selectedSlot === slot;
                                                return (
                                                    <TouchableOpacity
                                                        key={slot}
                                                        style={[styles.slotCard, isSel && styles.slotCardActive]}
                                                        onPress={() => setSelectedSlot(slot)}
                                                    >
                                                        <Ionicons name="time-outline" size={14} color={isSel ? '#ffffff' : '#475569'} />
                                                        <Text style={[styles.slotCardText, isSel && styles.slotCardTextActive]}>{slot}</Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>

                                    {/* Duration Selector */}
                                    <View style={styles.sectionBlock}>
                                        <Text style={styles.sectionTitleText}>Duration (Hours)</Text>
                                        <View style={styles.durationRow}>
                                            {[1, 2, 3, 4].map((hr) => (
                                                <TouchableOpacity
                                                    key={hr}
                                                    style={[styles.durationChip, durationHours === hr && styles.durationChipActive]}
                                                    onPress={() => setDurationHours(hr)}
                                                >
                                                    <Text style={[styles.durationChipText, durationHours === hr && styles.durationChipTextActive]}>
                                                        {hr} Hr ({'₹' + (selectedStation.priceRate || 15) * hr})
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>

                                    {/* Total Amount & Pay Button */}
                                    <View style={styles.bookingFooter}>
                                        <View style={styles.totalPriceBlock}>
                                            <Text style={styles.totalLabel}>Total Amount</Text>
                                            <Text style={styles.totalAmountText}>₹{(selectedStation.priceRate || 15) * durationHours}</Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.payRazorpayBtn}
                                            onPress={handleInitiateRazorpayPayment}
                                            disabled={isBookingSubmitting}
                                            activeOpacity={0.8}
                                        >
                                            <LinearGradient colors={['#10b981', '#059669']} style={styles.payBtnGradient}>
                                                {isBookingSubmitting ? (
                                                    <ActivityIndicator size="small" color="#ffffff" />
                                                ) : (
                                                    <>
                                                        <Ionicons name="shield-checkmark" size={18} color="#ffffff" />
                                                        <Text style={styles.payBtnText}>Pay ₹{(selectedStation.priceRate || 15) * durationHours} with Razorpay</Text>
                                                    </>
                                                )}
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    </View>
                                </>
                            )}
                        </Pressable>
                    </Animated.View>
                </TouchableOpacity>
            </Modal>

            {/* 💳 Razorpay Checkout Modal (Seamless Native WebView) */}
            <Modal visible={showRazorpayModal} animationType="slide" transparent={false}>
                <View style={{ flex: 1, backgroundColor: '#ffffff' }}>
                    {razorpayOrder && WebView ? (
                        <WebView
                            originWhitelist={['*']}
                            style={{ flex: 1, backgroundColor: '#ffffff' }}
                            source={{
                                html: `
                                <!DOCTYPE html>
                                <html>
                                <head>
                                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                                    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
                                    <style>
                                        html, body { height: 100%; margin: 0; padding: 0; background: #ffffff; overflow: hidden; }
                                    </style>
                                </head>
                                <body>
                                    <script>
                                        function startPayment() {
                                            var options = {
                                                key: "${razorpayOrder.keyId}",
                                                amount: "${razorpayOrder.amountInPaise}",
                                                currency: "INR",
                                                name: "Electrically EV Charging",
                                                description: "Booking at ${selectedStation?.stationName}",
                                                image: "https://cdn-icons-png.flaticon.com/512/2983/2983780.png",
                                                order_id: "${razorpayOrder.orderId}",
                                                prefill: {
                                                    name: "${user?.name || 'EV Driver'}",
                                                    email: "${user?.email || 'driver@ev.com'}",
                                                    contact: "${user?.phone || '9876543210'}"
                                                },
                                                theme: { color: "#10b981" },
                                                handler: function (response) {
                                                    if (window.ReactNativeWebView) {
                                                        window.ReactNativeWebView.postMessage(JSON.stringify({
                                                            type: 'RAZORPAY_SUCCESS',
                                                            razorpay_order_id: response.razorpay_order_id,
                                                            razorpay_payment_id: response.razorpay_payment_id,
                                                            razorpay_signature: response.razorpay_signature,
                                                            bookingId: "${razorpayOrder.bookingId}"
                                                        }));
                                                    }
                                                },
                                                modal: {
                                                    ondismiss: function() {
                                                        if (window.ReactNativeWebView) {
                                                            window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'RAZORPAY_CANCEL' }));
                                                        }
                                                    }
                                                }
                                            };
                                            var rzp = new Razorpay(options);
                                            rzp.open();
                                        }
                                        window.onload = startPayment;
                                    </script>
                                </body>
                                </html>
                                `
                            }}
                            onMessage={handleRazorpayWebMessage}
                        />
                    ) : (
                        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                            <ActivityIndicator size="large" color="#10b981" />
                        </View>
                    )}
                </View>
            </Modal>

            {/* 🎉 High-End Success Celebration Modal */}
            <Modal visible={showSuccessModal} transparent animationType="fade">
                <View style={styles.successOverlay}>
                    <View style={styles.successCard}>
                        {/* Celebrating Icon Ring */}
                        <View style={styles.successIconOuterRing}>
                            <LinearGradient colors={['#10b981', '#059669']} style={styles.successIconBadge}>
                                <Ionicons name="checkmark-sharp" size={38} color="#ffffff" />
                            </LinearGradient>
                        </View>

                        <Text style={styles.successTitle}>Booking Confirmed! 🎉</Text>
                        <Text style={styles.successSub}>Your EV charging slot has been reserved successfully.</Text>

                        {confirmedBookingDetails && (
                            <View style={styles.successDetailsCard}>
                                <View style={styles.successDetailRow}>
                                    <Text style={styles.detailLabel}>Station</Text>
                                    <Text style={styles.detailValueBold}>⚡ {confirmedBookingDetails.stationName}</Text>
                                </View>
                                <View style={styles.successDetailRow}>
                                    <Text style={styles.detailLabel}>Slot Time</Text>
                                    <Text style={styles.detailValue}>{confirmedBookingDetails.date} ({confirmedBookingDetails.slotTime})</Text>
                                </View>
                                <View style={styles.successDetailRow}>
                                    <Text style={styles.detailLabel}>Duration</Text>
                                    <Text style={styles.detailValue}>{confirmedBookingDetails.duration} Hr</Text>
                                </View>
                                <View style={[styles.successDetailRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
                                    <Text style={styles.detailLabel}>Total Paid</Text>
                                    <Text style={styles.detailAmountPaid}>₹{confirmedBookingDetails.amount}</Text>
                                </View>
                            </View>
                        )}

                        <TouchableOpacity
                            style={styles.doneBtn}
                            onPress={() => {
                                setShowSuccessModal(false);
                                setConfirmedBookingDetails(null);
                                router.push('/(tabs)/booking-history');
                            }}
                            activeOpacity={0.8}
                        >
                            <LinearGradient colors={['#10b981', '#047857']} style={styles.doneBtnGradient}>
                                <Ionicons name="list" size={18} color="#ffffff" />
                                <Text style={styles.doneBtnText}>View Booking History</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f0fdf4',
    },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 16,
        paddingBottom: 12,
        zIndex: 20,
    },
    headerBlur: {
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.7)',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 10,
    },
    locationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 8,
        marginRight: 10,
    },
    locationText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#0f172a',
        flex: 1,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    partnerButton: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    partnerGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        gap: 4,
    },
    partnerButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#ffffff',
    },
    avatarButton: {
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#ffffff',
    },
    avatarGradient: {
        width: 36,
        height: 36,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '800',
    },
    mapContainer: {
        flex: 1,
        position: 'relative',
    },
    map: {
        width: '100%',
        height: '100%',
    },
    webMapFallback: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0fdf4',
    },
    loadingStationsOverlay: {
        position: 'absolute',
        top: 100,
        alignSelf: 'center',
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    loadingStationsText: {
        fontSize: 12,
        color: '#475569',
        fontWeight: '600',
    },
    gmapMarkerContainer: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gmapOuterRing: {
        position: 'absolute',
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(16, 185, 129, 0.15)',
        borderWidth: 1.5,
        borderColor: 'rgba(16, 185, 129, 0.3)',
    },
    gmapDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#10b981',
        borderWidth: 4,
        borderColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },
    gmapDotInner: {
        width: 0,
        height: 0,
    },
    teardropMarkerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    teardropPinShell: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
        elevation: 7,
    },
    teardropInnerCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#ef4444',
        justifyContent: 'center',
        alignItems: 'center',
    },
    teardropPointerTip: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderTopWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#ffffff',
        marginTop: -3,
    },
    teardropLabelPill: {
        marginTop: 4,
        backgroundColor: 'rgba(15, 23, 42, 0.88)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.2)',
    },
    teardropLabelText: {
        color: '#ffffff',
        fontSize: 10,
        fontWeight: '800',
        maxWidth: 110,
    },
    fabContainer: {
        position: 'absolute',
        right: 20,
        bottom: Platform.OS === 'ios' ? 140 : 120,
    },
    myLocationFab: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingHorizontal: 24,
        paddingBottom: 34,
        paddingTop: 8,
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#e2e8f0',
        alignSelf: 'center',
        marginBottom: 16,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#0f172a',
    },
    closeButton: {
        padding: 4,
    },
    profileCard: {
        alignItems: 'center',
        paddingVertical: 24,
        backgroundColor: '#f8fafc',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        gap: 8,
        marginBottom: 20,
    },
    bigAvatarGradient: {
        width: 80,
        height: 80,
        borderRadius: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    bigAvatarText: {
        fontSize: 32,
        fontWeight: '800',
        color: '#ffffff',
    },
    profileName: {
        fontSize: 22,
        fontWeight: '700',
        color: '#0f172a',
    },
    profileEmail: {
        fontSize: 14,
        color: '#64748b',
    },
    usernameBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#ecfdf5',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    profileUsername: {
        fontSize: 13,
        color: '#10b981',
        fontWeight: '700',
    },
    infoSection: {
        gap: 12,
        marginBottom: 20,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#f8fafc',
        padding: 14,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    infoIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#ecfdf5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoText: {
        color: '#0f172a',
        fontSize: 14,
        fontWeight: '600',
        flex: 1,
    },
    infoBadge: {
        backgroundColor: '#d1fae5',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    infoBadgeText: {
        color: '#065f46',
        fontSize: 11,
        fontWeight: '700',
    },
    logoutButton: {
        borderRadius: 16,
        overflow: 'hidden',
    },
    logoutGradient: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    logoutButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '700',
    },
    gmapMarkerContainer: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
    },
    gmapOuterRing: {
        position: 'absolute',
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(16, 185, 129, 0.18)',
        borderWidth: 1.5,
        borderColor: 'rgba(16, 185, 129, 0.35)',
    },
    gmapDot: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#10b981',
        borderWidth: 4,
        borderColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
        elevation: 6,
    },
    gmapDotInner: {
        width: 0,
        height: 0,
    },
    teardropMarkerContainer: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    teardropPinShell: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.35,
        shadowRadius: 6,
        elevation: 7,
    },
    teardropInnerCircle: {
        width: 30,
        height: 30,
        borderRadius: 15,
        backgroundColor: '#ef4444',
        justifyContent: 'center',
        alignItems: 'center',
    },
    teardropPointerTip: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderTopWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#ffffff',
        marginTop: -3,
    },

    // Map Pin Highlight Badge
    mapHighlightBadge: {
        backgroundColor: '#ffffff',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        marginBottom: 4,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        alignItems: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 5,
        elevation: 6,
        maxWidth: 180,
    },
    mapHighlightTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: '#0f172a',
    },
    mapHighlightSub: {
        fontSize: 10,
        fontWeight: '600',
        color: '#059669',
    },

    // Slot Booking Bottom Sheet Styles
    bookingModalContent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: Platform.OS === 'ios' ? 36 : 20,
        maxHeight: height * 0.85,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 20,
    },
    sheetHandle: {
        width: 44,
        height: 5,
        backgroundColor: '#cbd5e1',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 16,
    },
    bookingHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 12,
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 2,
    },
    bookingBrandName: {
        fontSize: 12,
        fontWeight: '700',
        color: '#10b981',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    availBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#ecfdf5',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    availText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#059669',
    },
    bookingStationTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0f172a',
    },
    bookingAddressText: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
    },
    closeModalBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    specChipsRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 16,
    },
    specChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#f0fdf4',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#bbf7d0',
    },
    specChipText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#047857',
    },
    sectionBlock: {
        marginBottom: 14,
    },
    sectionTitleText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#334155',
        marginBottom: 8,
    },
    connectorRow: {
        flexDirection: 'row',
        gap: 8,
    },
    connectorChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: '#f8fafc',
        borderWidth: 1.5,
        borderColor: '#cbd5e1',
    },
    connectorChipActive: {
        backgroundColor: '#10b981',
        borderColor: '#10b981',
    },
    connectorChipText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#334155',
    },
    connectorChipTextActive: {
        color: '#ffffff',
    },
    dateRow: {
        flexDirection: 'row',
        gap: 8,
    },
    dateChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 12,
        backgroundColor: '#f8fafc',
        borderWidth: 1.5,
        borderColor: '#cbd5e1',
    },
    dateChipActive: {
        backgroundColor: '#0f172a',
        borderColor: '#0f172a',
    },
    dateChipText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
    },
    dateChipTextActive: {
        color: '#ffffff',
    },
    slotsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    slotCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        width: '48%',
    },
    slotCardActive: {
        backgroundColor: '#10b981',
        borderColor: '#10b981',
    },
    slotCardText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#334155',
    },
    slotCardTextActive: {
        color: '#ffffff',
        fontWeight: '700',
    },
    durationRow: {
        flexDirection: 'row',
        gap: 8,
    },
    durationChip: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 10,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#cbd5e1',
    },
    durationChipActive: {
        backgroundColor: '#10b981',
        borderColor: '#10b981',
    },
    durationChipText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#334155',
    },
    durationChipTextActive: {
        color: '#ffffff',
    },
    bookingFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderColor: '#f1f5f9',
    },
    totalPriceBlock: {
        justifyContent: 'center',
    },
    totalLabel: {
        fontSize: 11,
        color: '#64748b',
        fontWeight: '600',
    },
    totalAmountText: {
        fontSize: 22,
        fontWeight: '900',
        color: '#10b981',
    },
    payRazorpayBtn: {
        borderRadius: 14,
        overflow: 'hidden',
        flex: 1,
        marginLeft: 16,
    },
    payBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
        paddingHorizontal: 16,
    },
    payBtnText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '800',
    },

    // Razorpay Modal Styles
    razorpayHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderColor: '#e2e8f0',
        backgroundColor: '#ffffff',
    },
    closeRazorpayBtn: {
        padding: 6,
        marginRight: 12,
    },
    razorpayHeaderTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0f172a',
    },

    // Success Celebration Modal Styles
    successOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 24,
    },
    successCard: {
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: 28,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
        elevation: 24,
    },
    successIconOuterRing: {
        width: 84,
        height: 84,
        borderRadius: 42,
        backgroundColor: '#ecfdf5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    successIconBadge: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#10b981',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 10,
        elevation: 8,
    },
    successTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#0f172a',
        textAlign: 'center',
        marginBottom: 6,
    },
    successSub: {
        fontSize: 13,
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: 20,
    },
    successDetailsCard: {
        width: '100%',
        backgroundColor: '#f8fafc',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 20,
    },
    successDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    detailLabel: {
        fontSize: 12,
        color: '#64748b',
        fontWeight: '600',
    },
    detailValueBold: {
        fontSize: 13,
        fontWeight: '800',
        color: '#0f172a',
    },
    detailValue: {
        fontSize: 12,
        fontWeight: '700',
        color: '#334155',
    },
    detailAmountPaid: {
        fontSize: 16,
        fontWeight: '900',
        color: '#10b981',
    },
    doneBtn: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
    },
    doneBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 14,
    },
    doneBtnText: {
        color: '#ffffff',
        fontSize: 15,
        fontWeight: '800',
    },
});

export default HomeScreen;