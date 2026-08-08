import React, { useState, useEffect, useRef, useCallback } from 'react';
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
    Pressable,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
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
    { featureType: 'all', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi', elementType: 'all', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi', elementType: 'labels.text', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.school', elementType: 'all', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.school', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.school', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.government', elementType: 'all', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.medical', elementType: 'all', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.park', elementType: 'all', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.place_of_worship', elementType: 'all', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.attraction', elementType: 'all', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.business', elementType: 'all', stylers: [{ visibility: 'off' }] },
    { featureType: 'transit', elementType: 'all', stylers: [{ visibility: 'off' }] },
    { featureType: 'administrative', elementType: 'labels', stylers: [{ visibility: 'on' }] },
    { featureType: 'road', elementType: 'labels', stylers: [{ visibility: 'on' }] },
];

const RED_PIN_SVG = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40"><path d="M16 0 C7 0 0 7 0 16 C0 25 13 38 16 40 C19 38 32 25 32 16 C32 7 25 0 16 0 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="1"/><circle cx="16" cy="15" r="11" fill="#ef4444"/><path d="M17 7 L10 18 L15 18 L14 24 L22 13 L17 13 Z" fill="#ffffff"/></svg>');

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
        return slots.length > 0 ? slots : ['08:00 AM - 09:00 AM', '09:00 AM - 10:00 AM', '10:00 AM - 11:00 AM'];
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
        } catch (_err) { }
    };

    useEffect(() => {
        getCurrentLocation();
        fetchStations();
        animateEntrance();
        startPulseAnimation();
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchStations();
        }, [])
    );

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
                .catch(() => { });
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
                    } catch (_lkErr) { }

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
                    } catch (_curErr) { }
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
        html, body, #map { height: 100%; margin: 0; padding: 0; background: #F4FBF4; }
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

          new google.maps.Marker({
            position: userPos,
            map: gMap,
            title: "${user?.name || 'User Location'}",
            icon: {
              path: google.maps.SymbolPath.CIRCLE,
              fillColor: '#76C815',
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
              fillColor: '#76C815',
              fillOpacity: 0.15,
              strokeColor: '#76C815',
              strokeWeight: 1.5,
              scale: 22,
              anchor: new google.maps.Point(0, 0)
            },
            zIndex: 1
          });

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
                      size: new google.maps.Size(32, 40),
                      scaledSize: new google.maps.Size(32, 40),
                      anchor: new google.maps.Point(16, 40)
                  },
                  zIndex: 100
              });

              var infoWindow = new google.maps.InfoWindow({
                  content: '<div style="padding:4px;font-family:sans-serif;font-size:12px;"><b>⚡ ' + st.name + '</b><br><span style="color:#ef4444;font-weight:bold;">₹' + st.price + ' / ' + (st.pricingType === 'per_kwh' ? 'kWh' : 'hr') + '</span> • ' + st.power + '</div>'
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
                                        <View style={styles.teardropPinShell}>
                                            <View style={styles.teardropInnerCircle}>
                                                <Ionicons name="flash" size={14} color="#ffffff" />
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
                            } catch (_e) { }
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
                            <Ionicons name="locate" size={22} color="#10b981" />
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

            {/* Floating Header - Compact */}
            <Animated.View
                style={[styles.header, { paddingTop: Math.max(insets.top + 8, 32), opacity: fadeAnim }]}
                pointerEvents="box-none"
            >
                <BlurView intensity={80} tint="light" style={styles.headerBlur}>
                    <View style={styles.headerContent}>
                        <View style={styles.locationBadge}>
                            <Ionicons name="location" size={16} color="#10b981" />
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
                                    colors={['#76C815', '#65B811']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.partnerGradient}
                                >
                                    <Ionicons name="add" size={14} color="#fff" />
                                    <Text style={styles.partnerButtonText}>Partner</Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.avatarButton}
                                onPress={showModal}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['#76C815', '#65B811']}
                                    style={styles.avatarGradient}
                                >
                                    <Text style={styles.avatarText}>{userInitial}</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </BlurView>
            </Animated.View>

            {/* Profile Modal - Compact */}
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
                                <Ionicons name="close" size={22} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.profileCard}>
                            <LinearGradient
                                colors={['#76C815', '#65B811']}
                                style={styles.bigAvatarGradient}
                            >
                                <Text style={styles.bigAvatarText}>{userInitial}</Text>
                            </LinearGradient>
                            <Text style={styles.profileName}>{user?.name || 'User'}</Text>
                            <Text style={styles.profileEmail}>{user?.email || 'user@example.com'}</Text>
                            {user?.username && (
                                <View style={styles.usernameBadge}>
                                    <Ionicons name="at" size={12} color="#10b981" />
                                    <Text style={styles.profileUsername}>{user.username}</Text>
                                </View>
                            )}
                        </View>

                        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
                            <LinearGradient
                                colors={['#ef4444', '#dc2626']}
                                style={styles.logoutGradient}
                            >
                                <Ionicons name="log-out" size={18} color="#ffffff" />
                                <Text style={styles.logoutButtonText}>Logout</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                </TouchableOpacity>
            </Modal>

            {/* ⚡ EV Slot Booking Bottom Sheet - Compact */}
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
                                    {/* Station Header - Compact */}
                                    <View style={styles.bookingHeaderRow}>
                                        <View style={{ flex: 1 }}>
                                            <View style={styles.brandRow}>
                                                <Text style={styles.bookingBrandName}>{selectedStation.operatorBrand || 'Cutiepie'}</Text>
                                                <View style={styles.availBadge}>
                                                    <Ionicons name="ellipse" size={6} color="#10b981" />
                                                    <Text style={styles.availText}>{selectedStation.status || 'Available'}</Text>
                                                </View>
                                            </View>
                                            <Text style={styles.bookingStationTitle}>⚡ {selectedStation.stationName}</Text>
                                        </View>
                                        <TouchableOpacity style={styles.closeModalBtn} onPress={hideSlotBookingModal}>
                                            <Ionicons name="close" size={18} color="#64748b" />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Quick Spec Chips - Compact */}
                                    <View style={styles.specChipsRow}>
                                        <View style={styles.specChip}>
                                            <Ionicons name="flash" size={12} color="#10b981" />
                                            <Text style={styles.specChipText}>{selectedStation.powerOutput || '7.2 kW'}</Text>
                                        </View>
                                        <View style={styles.specChip}>
                                            <Ionicons name="pricetag" size={12} color="#10b981" />
                                            <Text style={styles.specChipText}>₹{selectedStation.priceRate || 15}/kWh</Text>
                                        </View>
                                        <View style={styles.specChip}>
                                            <Ionicons name="time" size={12} color="#10b981" />
                                            <Text style={styles.specChipText}>{selectedStation.operatingDays || '24/7'}</Text>
                                        </View>
                                    </View>

                                    {/* Connector Selector - Compact */}
                                    {selectedStation.connectors && selectedStation.connectors.length > 0 && (
                                        <View style={styles.sectionBlock}>
                                            <Text style={styles.sectionTitleText}>Connector</Text>
                                            <View style={styles.connectorRow}>
                                                {selectedStation.connectors.slice(0, 3).map((c) => (
                                                    <TouchableOpacity
                                                        key={c}
                                                        style={[styles.connectorChip, selectedConnector === c && styles.connectorChipActive]}
                                                        onPress={() => setSelectedConnector(c)}
                                                    >
                                                        <Ionicons name="hardware-chip" size={14} color={selectedConnector === c ? '#ffffff' : '#059669'} />
                                                        <Text style={[styles.connectorChipText, selectedConnector === c && styles.connectorChipTextActive]}>{c}</Text>
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        </View>
                                    )}

                                    {/* Date & Slots - Compact */}
                                    <View style={styles.sectionBlock}>
                                        <Text style={styles.sectionTitleText}>Date & Time</Text>
                                        <View style={styles.dateRow}>
                                            {[0, 1, 2].map((offset) => {
                                                const d = new Date();
                                                d.setDate(d.getDate() + offset);
                                                const dateStr = d.toISOString().split('T')[0];
                                                const label = offset === 0 ? 'Today' : offset === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
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
                                        <View style={styles.slotsGrid}>
                                            {generateTimeSlots(selectedStation).slice(0, 4).map((slot) => {
                                                const isSel = selectedSlot === slot;
                                                return (
                                                    <TouchableOpacity
                                                        key={slot}
                                                        style={[styles.slotCard, isSel && styles.slotCardActive]}
                                                        onPress={() => setSelectedSlot(slot)}
                                                    >
                                                        <Ionicons name="time-outline" size={12} color={isSel ? '#ffffff' : '#475569'} />
                                                        <Text style={[styles.slotCardText, isSel && styles.slotCardTextActive]}>{slot}</Text>
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>

                                    {/* Duration - Compact */}
                                    <View style={styles.sectionBlock}>
                                        <Text style={styles.sectionTitleText}>Duration</Text>
                                        <View style={styles.durationRow}>
                                            {[1, 2, 3].map((hr) => (
                                                <TouchableOpacity
                                                    key={hr}
                                                    style={[styles.durationChip, durationHours === hr && styles.durationChipActive]}
                                                    onPress={() => setDurationHours(hr)}
                                                >
                                                    <Text style={[styles.durationChipText, durationHours === hr && styles.durationChipTextActive]}>
                                                        {hr}hr ₹{(selectedStation.priceRate || 15) * hr}
                                                    </Text>
                                                </TouchableOpacity>
                                            ))}
                                        </View>
                                    </View>

                                    {/* Footer - Compact */}
                                    <View style={styles.bookingFooter}>
                                        <View style={styles.totalPriceBlock}>
                                            <Text style={styles.totalLabel}>Total</Text>
                                            <Text style={styles.totalAmountText}>₹{(selectedStation.priceRate || 15) * durationHours}</Text>
                                        </View>
                                        <TouchableOpacity
                                            style={styles.payRazorpayBtn}
                                            onPress={handleInitiateRazorpayPayment}
                                            disabled={isBookingSubmitting}
                                            activeOpacity={0.8}
                                        >
                                            <LinearGradient colors={['#76C815', '#65B811']} style={styles.payBtnGradient}>
                                                {isBookingSubmitting ? (
                                                    <ActivityIndicator size="small" color="#ffffff" />
                                                ) : (
                                                    <>
                                                        <Ionicons name="shield-checkmark" size={16} color="#ffffff" />
                                                        <Text style={styles.payBtnText}>Pay Now</Text>
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

            {/* 💳 Razorpay Checkout Modal */}
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
                                                name: "Electrically",
                                                description: "Booking at ${selectedStation?.stationName}",
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

            {/* 🎉 Success Celebration Modal - Compact */}
            <Modal visible={showSuccessModal} transparent animationType="fade">
                <View style={styles.successOverlay}>
                    <View style={styles.successCard}>
                        <View style={styles.successIconOuterRing}>
                            <LinearGradient colors={['#76C815', '#65B811']} style={styles.successIconBadge}>
                                <Ionicons name="checkmark-sharp" size={32} color="#ffffff" />
                            </LinearGradient>
                        </View>

                        <Text style={styles.successTitle}>Booking Confirmed! 🎉</Text>
                        <Text style={styles.successSub}>Your EV charging slot is reserved</Text>

                        {confirmedBookingDetails && (
                            <View style={styles.successDetailsCard}>
                                <View style={styles.successDetailRow}>
                                    <Text style={styles.detailLabel}>Station</Text>
                                    <Text style={styles.detailValueBold}>⚡ {confirmedBookingDetails.stationName}</Text>
                                </View>
                                <View style={styles.successDetailRow}>
                                    <Text style={styles.detailLabel}>Time</Text>
                                    <Text style={styles.detailValue}>{confirmedBookingDetails.slotTime}</Text>
                                </View>
                                <View style={[styles.successDetailRow, { borderBottomWidth: 0 }]}>
                                    <Text style={styles.detailLabel}>Amount</Text>
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
                            <LinearGradient colors={['#76C815', '#5BA70E']} style={styles.doneBtnGradient}>
                                <Ionicons name="list" size={16} color="#ffffff" />
                                <Text style={styles.doneBtnText}>View History</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4FBF4' },
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 12,
        paddingBottom: 8,
        zIndex: 20,
    },
    headerBlur: {
        borderRadius: 16,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.8)',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    locationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 6,
        marginRight: 8,
    },
    locationText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#0f172a',
        flex: 1,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    partnerButton: {
        borderRadius: 10,
        overflow: 'hidden',
    },
    partnerGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        gap: 4,
    },
    partnerButtonText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#ffffff',
    },
    avatarButton: {
        borderRadius: 18,
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#ffffff',
    },
    avatarGradient: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '800',
    },
    mapContainer: { flex: 1, position: 'relative' },
    map: { width: '100%', height: '100%' },
    webMapFallback: {
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f0fdf4',
    },
    loadingStationsOverlay: {
        position: 'absolute',
        top: 80,
        alignSelf: 'center',
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: 14,
        paddingVertical: 6,
        borderRadius: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    loadingStationsText: { fontSize: 11, color: '#475569', fontWeight: '600' },
    gmapMarkerContainer: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
    gmapOuterRing: {
        position: 'absolute',
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(118, 200, 21, 0.18)',
        borderWidth: 1.5,
        borderColor: 'rgba(118, 200, 21, 0.35)',
    },
    gmapDot: {
        width: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: '#76C815',
        borderWidth: 3,
        borderColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#76C815',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },
    gmapDotInner: { width: 0, height: 0 },
    teardropMarkerContainer: { alignItems: 'center', justifyContent: 'center' },
    teardropPinShell: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 6,
    },
    teardropInnerCircle: {
        width: 26,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#ef4444',
        justifyContent: 'center',
        alignItems: 'center',
    },
    teardropPointerTip: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 5,
        borderRightWidth: 5,
        borderTopWidth: 7,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#ffffff',
        marginTop: -2,
    },
    fabContainer: {
        position: 'absolute',
        right: 16,
        bottom: Platform.OS === 'ios' ? 120 : 100,
    },
    myLocationFab: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 6,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingBottom: 28,
        paddingTop: 6,
    },
    modalHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#e2e8f0',
        alignSelf: 'center',
        marginBottom: 12,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a' },
    closeButton: { padding: 4 },
    profileCard: {
        alignItems: 'center',
        paddingVertical: 20,
        backgroundColor: '#f8fafc',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        gap: 6,
        marginBottom: 16,
    },
    bigAvatarGradient: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    bigAvatarText: { fontSize: 28, fontWeight: '800', color: '#ffffff' },
    profileName: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
    profileEmail: { fontSize: 13, color: '#64748b' },
    usernameBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F0F9ED',
        paddingHorizontal: 10,
        paddingVertical: 3,
        borderRadius: 10,
    },
    profileUsername: { fontSize: 12, color: '#76C815', fontWeight: '700' },
    logoutButton: { borderRadius: 14, overflow: 'hidden' },
    logoutGradient: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 14,
        gap: 6,
    },
    logoutButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '700' },
    // Booking Modal Styles - Compact
    bookingModalContent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 16,
        paddingTop: 10,
        paddingBottom: Platform.OS === 'ios' ? 28 : 16,
        maxHeight: height * 0.8,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 16,
    },
    sheetHandle: {
        width: 36,
        height: 4,
        backgroundColor: '#cbd5e1',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 12,
    },
    bookingHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    bookingBrandName: {
        fontSize: 11,
        fontWeight: '700',
        color: '#76C815',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    availBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#F0F9ED',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    availText: { fontSize: 10, fontWeight: '600', color: '#76C815' },
    bookingStationTitle: { fontSize: 17, fontWeight: '800', color: '#0f172a' },
    closeModalBtn: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    specChipsRow: {
        flexDirection: 'row',
        gap: 6,
        marginBottom: 12,
    },
    specChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#F4FBF4',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#D4EFC3',
    },
    specChipText: { fontSize: 10, fontWeight: '700', color: '#76C815' },
    sectionBlock: { marginBottom: 10 },
    sectionTitleText: { fontSize: 12, fontWeight: '700', color: '#334155', marginBottom: 6 },
    connectorRow: { flexDirection: 'row', gap: 6 },
    connectorChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
        backgroundColor: '#f8fafc',
        borderWidth: 1.5,
        borderColor: '#cbd5e1',
    },
    connectorChipActive: { backgroundColor: '#76C815', borderColor: '#76C815' },
    connectorChipText: { fontSize: 11, fontWeight: '700', color: '#334155' },
    connectorChipTextActive: { color: '#ffffff' },
    dateRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
    dateChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 10,
        backgroundColor: '#f8fafc',
        borderWidth: 1.5,
        borderColor: '#cbd5e1',
    },
    dateChipActive: { backgroundColor: '#0f172a', borderColor: '#0f172a' },
    dateChipText: { fontSize: 11, fontWeight: '700', color: '#475569' },
    dateChipTextActive: { color: '#ffffff' },
    slotsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    slotCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
        width: '48%',
    },
    slotCardActive: { backgroundColor: '#76C815', borderColor: '#76C815' },
    slotCardText: { fontSize: 10, fontWeight: '600', color: '#334155' },
    slotCardTextActive: { color: '#ffffff', fontWeight: '700' },
    durationRow: { flexDirection: 'row', gap: 6 },
    durationChip: {
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 8,
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#cbd5e1',
    },
    durationChipActive: { backgroundColor: '#76C815', borderColor: '#76C815' },
    durationChipText: { fontSize: 11, fontWeight: '700', color: '#334155' },
    durationChipTextActive: { color: '#ffffff' },
    bookingFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
        paddingTop: 8,
        borderTopWidth: 1,
        borderColor: '#f1f5f9',
    },
    totalPriceBlock: { justifyContent: 'center' },
    totalLabel: { fontSize: 10, color: '#64748b', fontWeight: '600' },
    totalAmountText: { fontSize: 20, fontWeight: '900', color: '#76C815' },
    payRazorpayBtn: {
        borderRadius: 12,
        overflow: 'hidden',
        flex: 1,
        marginLeft: 12,
    },
    payBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
        paddingHorizontal: 12,
    },
    payBtnText: { color: '#ffffff', fontSize: 13, fontWeight: '800' },
    // Success Modal Styles - Compact
    successOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    successCard: {
        width: '100%',
        backgroundColor: '#ffffff',
        borderRadius: 24,
        padding: 20,
        alignItems: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 20,
    },
    successIconOuterRing: {
        width: 68,
        height: 68,
        borderRadius: 34,
        backgroundColor: '#F0F9ED',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    successIconBadge: {
        width: 52,
        height: 52,
        borderRadius: 26,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#76C815',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    successTitle: { fontSize: 20, fontWeight: '800', color: '#0f172a', textAlign: 'center', marginBottom: 4 },
    successSub: { fontSize: 12, color: '#64748b', textAlign: 'center', marginBottom: 16 },
    successDetailsCard: {
        width: '100%',
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: 16,
    },
    successDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 6,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    detailLabel: { fontSize: 11, color: '#64748b', fontWeight: '600' },
    detailValueBold: { fontSize: 12, fontWeight: '800', color: '#0f172a' },
    detailValue: { fontSize: 11, fontWeight: '700', color: '#334155' },
    detailAmountPaid: { fontSize: 15, fontWeight: '900', color: '#76C815' },
    doneBtn: { width: '100%', borderRadius: 14, overflow: 'hidden' },
    doneBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 12,
    },
    doneBtnText: { color: '#ffffff', fontSize: 14, fontWeight: '800' },
});

export default HomeScreen;