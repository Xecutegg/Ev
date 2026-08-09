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
    ScrollView,
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
import CLEAN_MAP_STYLE from '../../constants/mapStyle.js';

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
const isSmallScreen = width < 380;
const isTablet = width > 768;

// Responsive sizing function
const rs = (size) => {
    const baseWidth = 375;
    const scale = Math.min(width / baseWidth, 1.5);
    return Math.round(size * scale);
};

const DEFAULT_LOCATION = {
    latitude: 28.6139,
    longitude: 77.209,
    latitudeDelta: 0.015,
    longitudeDelta: 0.015,
};

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
    const [selectedSlot, setSelectedSlot] = useState('');
    const [durationHours, setDurationHours] = useState(1);
    const [selectedConnector, setSelectedConnector] = useState('');
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
                return `${displayH}:00 ${period}`;
            };
            slots.push(`${fmt(h)} - ${fmt(nextH)}`);
        }
        return slots.length > 0 ? slots : ['8:00 AM - 9:00 AM', '9:00 AM - 10:00 AM', '10:00 AM - 11:00 AM'];
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
        if (!selectedStation || !selectedSlot || !selectedConnector) return;
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
                Alert.alert('Error', res.message || 'Could not initiate payment');
            }
        } catch (err) {
            Alert.alert('Error', err.response?.data?.message || err.message || 'Payment creation failed');
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
                        slotTime: selectedSlot,
                        date: selectedDate,
                        duration: durationHours,
                        amount: (selectedStation?.priceRate || 15) * durationHours,
                    });
                    setShowSuccessModal(true);
                } else {
                    Alert.alert('Verification Failed', verifyRes.message || 'Invalid signature');
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
            console.warn('Failed to load stations:', _err);
        } finally {
            setIsLoadingStations(false);
        }
    };

    const animateEntrance = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
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

    const animateMapTo = (coords) => {
        if (!coords || !coords.latitude || !coords.longitude) return;
        if (mapRef.current && mapRef.current.animateToRegion) {
            mapRef.current.animateToRegion(coords, 800);
        }
    };

    const fetchAddressAsync = async (lat, lng) => {
        try {
            if (Location && typeof Location.reverseGeocodeAsync === 'function') {
                const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
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
            }
        } catch (_err) { }
    };

    const getCurrentLocation = async () => {
        setIsLoadingLocation(true);
        try {
            if (Location && typeof Location.requestForegroundPermissionsAsync === 'function') {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    try {
                        const lastPos = await Location.getLastKnownPositionAsync({});
                        if (lastPos && lastPos.coords) {
                            const coords = {
                                latitude: lastPos.coords.latitude,
                                longitude: lastPos.coords.longitude,
                                latitudeDelta: 0.015,
                                longitudeDelta: 0.015,
                            };
                            setLocation(coords);
                            animateMapTo(coords);
                            fetchAddressAsync(coords.latitude, coords.longitude);
                        }

                        const currentPos = await Promise.race([
                            Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
                            new Promise((_, reject) => setTimeout(() => reject(new Error('Location timeout')), 6000))
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
                            fetchAddressAsync(coords.latitude, coords.longitude);
                            setIsLoadingLocation(false);
                            return;
                        }
                    } catch (_curErr) { }
                }
            }
            if (!location) setLocation(DEFAULT_LOCATION);
        } catch (err) {
            if (!location) setLocation(DEFAULT_LOCATION);
        } finally {
            setIsLoadingLocation(false);
        }
    };

    const handleCenterOnUser = async () => {
        setIsRefreshing(true);
        if (location) animateMapTo(location);
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
        } catch (_err) { }
        setIsRefreshing(false);
    };

    const handleLogout = async () => {
        setShowProfileModal(false);
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Logout', style: 'destructive', onPress: async () => { await logout(); } },
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
    })).filter(st => st.lat && st.lng && !isNaN(st.lat) && !isNaN(st.lng));

    const lightThemeOsmMapHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <style>
        html, body, #map { height: 100%; margin: 0; padding: 0; background: #F4FBF4; }
        .leaflet-control-attribution { display: none !important; }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: false }).setView([${currentCoords.latitude}, ${currentCoords.longitude}], 15);
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          maxZoom: 19
        }).addTo(map);

        var userIcon = L.divIcon({
          className: 'custom-user-icon',
          html: '<div style="background-color:#76C815;width:16px;height:16px;border-radius:50%;border:3px solid #ffffff;box-shadow:0 0 8px rgba(0,0,0,0.3);"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });

        L.marker([${currentCoords.latitude}, ${currentCoords.longitude}], { icon: userIcon })
          .addTo(map)
          .bindPopup("${user?.name || 'Your Location'}");

        var stationsData = ${JSON.stringify(stationsDataForWeb)};
        var stationIcon = L.divIcon({
          className: 'custom-station-icon',
          html: '<div style="background-color:#ef4444;width:24px;height:24px;border-radius:50%;border:2px solid #ffffff;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 6px rgba(0,0,0,0.3);color:white;font-weight:bold;font-size:12px;">⚡</div>',
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        });

        stationsData.forEach(function(st) {
          if (!st.lat || !st.lng) return;
          var marker = L.marker([parseFloat(st.lat), parseFloat(st.lng)], { icon: stationIcon }).addTo(map);
          marker.on('click', function() {
            if (window.ReactNativeWebView) {
              window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'SELECT_STATION', id: st.id }));
            }
          });
        });
      </script>
    </body>
    </html>
`;

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent={true} />

            <View style={styles.mapContainer}>
                {Platform.OS === 'web' ? (
                    <View style={styles.webMapFallback}>
                        <iframe
                            title="Live Location Map"
                            width="100%"
                            height="100%"
                            style={{ border: 0 }}
                            srcDoc={lightThemeOsmMapHtml}
                        />
                    </View>
                ) : MapView ? (
                    <MapView
                        ref={mapRef}
                        style={styles.map}
                        provider={PROVIDER_GOOGLE}
                        customMapStyle={CLEAN_MAP_STYLE}
                        mapType="standard"
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
                                                <Ionicons name="flash" size={rs(13)} color="#ffffff" />
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
                        source={{ html: lightThemeOsmMapHtml }}
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

                <Animated.View style={[styles.fabContainer, { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }]}>
                    <TouchableOpacity
                        style={styles.myLocationFab}
                        onPress={handleCenterOnUser}
                        activeOpacity={0.8}
                    >
                        {isRefreshing ? (
                            <ActivityIndicator size="small" color="#10b981" />
                        ) : (
                            <Ionicons name="locate" size={rs(20)} color="#10b981" />
                        )}
                    </TouchableOpacity>
                </Animated.View>

                {isLoadingStations && (
                    <View style={styles.loadingStationsOverlay}>
                        <ActivityIndicator size="small" color="#10b981" />
                        <Text style={styles.loadingStationsText}>Loading stations...</Text>
                    </View>
                )}
            </View>

            {/* Floating Header */}
            <Animated.View
                style={[styles.header, { paddingTop: Math.max(insets.top + rs(8), rs(32)), opacity: fadeAnim }]}
                pointerEvents="box-none"
            >
                <BlurView intensity={80} tint="light" style={styles.headerBlur}>
                    <View style={styles.headerContent}>
                        <View style={styles.locationBadge}>
                            <Ionicons name="location" size={rs(14)} color="#10b981" />
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
                                    <Ionicons name="add" size={rs(12)} color="#fff" />
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
                                <Ionicons name="close" size={rs(20)} color="#64748b" />
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
                                    <Ionicons name="at" size={rs(10)} color="#10b981" />
                                    <Text style={styles.profileUsername}>{user.username}</Text>
                                </View>
                            )}
                        </View>

                        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.8}>
                            <LinearGradient
                                colors={['#ef4444', '#dc2626']}
                                style={styles.logoutGradient}
                            >
                                <Ionicons name="log-out" size={rs(16)} color="#ffffff" />
                                <Text style={styles.logoutButtonText}>Logout</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    </Animated.View>
                </TouchableOpacity>
            </Modal>

            {/* Booking Bottom Sheet */}
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
                                <ScrollView 
                                    showsVerticalScrollIndicator={false}
                                    contentContainerStyle={styles.bookingScrollContent}
                                >
                                    {/* Station Header */}
                                    <View style={styles.bookingHeaderRow}>
                                        <View style={styles.stationInfoContainer}>
                                            <View style={styles.brandRow}>
                                                <View style={styles.brandBadge}>
                                                    <Text style={styles.bookingBrandName}>
                                                        {selectedStation.operatorBrand || 'Cutiepie'}
                                                    </Text>
                                                </View>
                                                <View style={[
                                                    styles.availBadge,
                                                    selectedStation.status === 'Available' ? styles.availableBadge : styles.unavailableBadge
                                                ]}>
                                                    <View style={[
                                                        styles.statusDot,
                                                        selectedStation.status === 'Available' ? styles.activeDot : styles.inactiveDot
                                                    ]} />
                                                    <Text style={[
                                                        styles.availText,
                                                        selectedStation.status === 'Available' ? styles.availableText : styles.unavailableText
                                                    ]}>
                                                        {selectedStation.status || 'Available'}
                                                    </Text>
                                                </View>
                                            </View>
                                            <Text style={styles.bookingStationTitle}>
                                                {selectedStation.stationName}
                                            </Text>
                                            <View style={styles.stationMetaRow}>
                                                <View style={styles.metaChip}>
                                                    <Text style={styles.metaChipText}>4.8 ★</Text>
                                                </View>
                                                <View style={styles.metaChip}>
                                                    <Text style={styles.metaChipText}>2.3 km</Text>
                                                </View>
                                                <View style={styles.metaChip}>
                                                    <Text style={styles.metaChipText}>97% uptime</Text>
                                                </View>
                                            </View>
                                        </View>
                                        <TouchableOpacity style={styles.closeModalBtn} onPress={hideSlotBookingModal}>
                                            <Ionicons name="close" size={rs(18)} color="#64748b" />
                                        </TouchableOpacity>
                                    </View>

                                    {/* Spec Chips */}
                                    <View style={styles.specChipsRow}>
                                        <View style={styles.specChip}>
                                            <Text style={styles.specChipLabel}>Power</Text>
                                            <Text style={styles.specChipValue}>
                                                {selectedStation.powerOutput || '7.2 kW'}
                                            </Text>
                                        </View>
                                        <View style={styles.specChip}>
                                            <Text style={styles.specChipLabel}>Rate</Text>
                                            <Text style={styles.specChipValue}>
                                                ₹{selectedStation.priceRate || 15}/kWh
                                            </Text>
                                        </View>
                                        <View style={styles.specChip}>
                                            <Text style={styles.specChipLabel}>Hours</Text>
                                            <Text style={styles.specChipValue}>
                                                {selectedStation.operatingDays || '24/7'}
                                            </Text>
                                        </View>
                                        <View style={styles.specChip}>
                                            <Text style={styles.specChipLabel}>Slots</Text>
                                            <Text style={styles.specChipValue}>
                                                {generateTimeSlots(selectedStation).length}
                                            </Text>
                                        </View>
                                    </View>

                                    {/* Connector Selector */}
                                    {selectedStation.connectors && selectedStation.connectors.length > 0 && (
                                        <View style={styles.sectionBlock}>
                                            <Text style={styles.sectionTitleText}>Connector</Text>
                                            <View style={styles.connectorRow}>
                                                {selectedStation.connectors.slice(0, 3).map((c) => (
                                                    <TouchableOpacity
                                                        key={c}
                                                        style={[
                                                            styles.connectorChip,
                                                            selectedConnector === c && styles.connectorChipActive
                                                        ]}
                                                        onPress={() => setSelectedConnector(c)}
                                                    >
                                                        <Text style={[
                                                            styles.connectorChipText,
                                                            selectedConnector === c && styles.connectorChipTextActive
                                                        ]}>
                                                            {c}
                                                        </Text>
                                                        {selectedConnector === c && (
                                                            <Text style={styles.connectorCheckmark}>✓</Text>
                                                        )}
                                                    </TouchableOpacity>
                                                ))}
                                            </View>
                                        </View>
                                    )}

                                    {/* Date & Time */}
                                    <View style={styles.sectionBlock}>
                                        <Text style={styles.sectionTitleText}>Date</Text>
                                        <View style={styles.dateRow}>
                                            {[0, 1, 2, 3].map((offset) => {
                                                const d = new Date();
                                                d.setDate(d.getDate() + offset);
                                                const dateStr = d.toISOString().split('T')[0];
                                                const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                                                const label = offset === 0 ? 'Today' :
                                                    offset === 1 ? 'Tomorrow' :
                                                    d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' });
                                                const isSel = selectedDate === dateStr;
                                                return (
                                                    <TouchableOpacity
                                                        key={dateStr}
                                                        style={[
                                                            styles.dateChip,
                                                            isSel && styles.dateChipActive,
                                                            isWeekend && styles.weekendDateChip
                                                        ]}
                                                        onPress={() => setSelectedDate(dateStr)}
                                                        disabled={isWeekend}
                                                    >
                                                        <Text style={[
                                                            styles.dateChipText,
                                                            isSel && styles.dateChipTextActive,
                                                            isWeekend && styles.weekendDateText
                                                        ]}>
                                                            {label}
                                                        </Text>
                                                        {isWeekend && (
                                                            <Text style={styles.weekendBadge}>Closed</Text>
                                                        )}
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>

                                    {/* Time Slots */}
                                    <View style={styles.sectionBlock}>
                                        <Text style={styles.sectionTitleText}>Time Slot</Text>
                                        <View style={styles.slotsGrid}>
                                            {generateTimeSlots(selectedStation).slice(0, 6).map((slot) => {
                                                const isSel = selectedSlot === slot;
                                                return (
                                                    <TouchableOpacity
                                                        key={slot}
                                                        style={[
                                                            styles.slotCard,
                                                            isSel && styles.slotCardActive
                                                        ]}
                                                        onPress={() => setSelectedSlot(slot)}
                                                    >
                                                        <Text style={[
                                                            styles.slotCardText,
                                                            isSel && styles.slotCardTextActive
                                                        ]}>
                                                            {slot}
                                                        </Text>
                                                        {isSel && (
                                                            <Text style={styles.slotCheckmark}>✓</Text>
                                                        )}
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>

                                    {/* Duration */}
                                    <View style={styles.sectionBlock}>
                                        <Text style={styles.sectionTitleText}>Duration</Text>
                                        <View style={styles.durationRow}>
                                            {[1, 2, 3, 4].map((hr) => {
                                                const price = (selectedStation.priceRate || 15) * hr;
                                                return (
                                                    <TouchableOpacity
                                                        key={hr}
                                                        style={[
                                                            styles.durationChip,
                                                            durationHours === hr && styles.durationChipActive
                                                        ]}
                                                        onPress={() => setDurationHours(hr)}
                                                    >
                                                        <Text style={[
                                                            styles.durationHours,
                                                            durationHours === hr && styles.durationChipTextActive
                                                        ]}>
                                                            {hr}h
                                                        </Text>
                                                        <Text style={[
                                                            styles.durationPrice,
                                                            durationHours === hr && styles.durationChipTextActive
                                                        ]}>
                                                            ₹{price}
                                                        </Text>
                                                        {durationHours === hr && (
                                                            <View style={styles.durationCheckmark}>
                                                                <Text style={styles.checkmarkText}>✓</Text>
                                                            </View>
                                                        )}
                                                    </TouchableOpacity>
                                                );
                                            })}
                                        </View>
                                    </View>

                                    {/* Footer */}
                                    <View style={styles.bookingFooter}>
                                        <View style={styles.totalPriceBlock}>
                                            <Text style={styles.totalLabel}>Total</Text>
                                            <Text style={styles.totalAmountText}>
                                                ₹{(selectedStation.priceRate || 15) * durationHours}
                                            </Text>
                                        </View>
                                        <TouchableOpacity
                                            style={[
                                                styles.payRazorpayBtn,
                                                (!selectedSlot || !selectedConnector || isBookingSubmitting) &&
                                                styles.payBtnDisabled
                                            ]}
                                            onPress={handleInitiateRazorpayPayment}
                                            disabled={!selectedSlot || !selectedConnector || isBookingSubmitting}
                                            activeOpacity={0.8}
                                        >
                                            <LinearGradient
                                                colors={!selectedSlot || !selectedConnector ? ['#cbd5e1', '#94a3b8'] : ['#76C815', '#65B811']}
                                                style={styles.payBtnGradient}
                                            >
                                                {isBookingSubmitting ? (
                                                    <ActivityIndicator size="small" color="#ffffff" />
                                                ) : (
                                                    <Text style={styles.payBtnText}>
                                                        {!selectedSlot ? 'Select Time' :
                                                         !selectedConnector ? 'Select Connector' :
                                                         'Confirm'}
                                                    </Text>
                                                )}
                                            </LinearGradient>
                                        </TouchableOpacity>
                                    </View>
                                </ScrollView>
                            )}
                        </Pressable>
                    </Animated.View>
                </TouchableOpacity>
            </Modal>

            {/* Razorpay Payment Modal */}
            <Modal visible={showRazorpayModal} animationType="slide" transparent={false}>
                <View style={styles.razorpayContainer}>
                    {razorpayOrder && WebView ? (
                        <WebView
                            originWhitelist={['*']}
                            style={styles.razorpayWebView}
                            source={{
                                html: `
                                <!DOCTYPE html>
                                <html>
                                <head>
                                    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                                    <script src="https://checkout.razorpay.com/v1/checkout.js"></script>
                                    <style>
                                        * { margin: 0; padding: 0; box-sizing: border-box; }
                                        body { 
                                            display: flex; 
                                            justify-content: center; 
                                            align-items: center; 
                                            height: 100vh; 
                                            background: #ffffff;
                                            font-family: -apple-system, system-ui, sans-serif;
                                        }
                                        .loader {
                                            text-align: center;
                                            padding: 20px;
                                        }
                                        .spinner {
                                            width: 40px;
                                            height: 40px;
                                            margin: 0 auto 16px;
                                            border: 3px solid #e2e8f0;
                                            border-top-color: #76C815;
                                            border-radius: 50%;
                                            animation: spin 0.8s linear infinite;
                                        }
                                        @keyframes spin {
                                            0% { transform: rotate(0deg); }
                                            100% { transform: rotate(360deg); }
                                        }
                                        h2 {
                                            color: #0f172a;
                                            font-size: 18px;
                                            font-weight: 700;
                                            margin-bottom: 8px;
                                        }
                                        p {
                                            color: #64748b;
                                            font-size: 14px;
                                        }
                                    </style>
                                </head>
                                <body>
                                    <div class="loader">
                                        <div class="spinner"></div>
                                        <h2>Processing Payment</h2>
                                        <p>Please wait while we secure your booking...</p>
                                    </div>
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
                                                theme: { color: "#76C815" },
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
                                        window.onload = function() {
                                            setTimeout(startPayment, 300);
                                        };
                                    </script>
                                </body>
                                </html>
                                `
                            }}
                            onMessage={handleRazorpayWebMessage}
                        />
                    ) : (
                        <View style={styles.razorpayLoading}>
                            <ActivityIndicator size="large" color="#76C815" />
                            <Text style={styles.razorpayLoadingText}>Loading payment gateway...</Text>
                        </View>
                    )}
                </View>
            </Modal>

            {/* Success Modal */}
            <Modal visible={showSuccessModal} transparent animationType="fade">
                <View style={styles.successOverlay}>
                    <View style={styles.successCard}>
                        <View style={styles.successIconOuterRing}>
                            <LinearGradient colors={['#76C815', '#65B811']} style={styles.successIconBadge}>
                                <Text style={styles.successIconText}>✓</Text>
                            </LinearGradient>
                        </View>

                        <Text style={styles.successTitle}>Booking Confirmed</Text>
                        <Text style={styles.successSub}>Your EV charging slot is reserved</Text>

                        {confirmedBookingDetails && (
                            <View style={styles.successDetailsCard}>
                                <View style={styles.successDetailRow}>
                                    <Text style={styles.detailLabel}>Station</Text>
                                    <Text style={styles.detailValueBold}>{confirmedBookingDetails.stationName}</Text>
                                </View>
                                <View style={styles.successDetailRow}>
                                    <Text style={styles.detailLabel}>Time</Text>
                                    <Text style={styles.detailValue}>{confirmedBookingDetails.slotTime}</Text>
                                </View>
                                <View style={styles.successDetailRow}>
                                    <Text style={styles.detailLabel}>Duration</Text>
                                    <Text style={styles.detailValue}>{confirmedBookingDetails.duration} hours</Text>
                                </View>
                                <View style={[styles.successDetailRow, { borderBottomWidth: 0 }]}>
                                    <Text style={styles.detailLabel}>Amount</Text>
                                    <Text style={styles.detailAmountPaid}>₹{confirmedBookingDetails.amount}</Text>
                                </View>
                            </View>
                        )}

                        <View style={styles.successActions}>
                            <TouchableOpacity
                                style={styles.primaryBtn}
                                onPress={() => {
                                    setShowSuccessModal(false);
                                    setConfirmedBookingDetails(null);
                                    router.push('/(tabs)/booking-history');
                                }}
                                activeOpacity={0.8}
                            >
                                <LinearGradient colors={['#76C815', '#5BA70E']} style={styles.primaryBtnGradient}>
                                    <Text style={styles.primaryBtnText}>View History</Text>
                                </LinearGradient>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.secondaryBtn}
                                onPress={() => {
                                    setShowSuccessModal(false);
                                    setConfirmedBookingDetails(null);
                                    setSelectedSlot('');
                                    setSelectedConnector('');
                                    setDurationHours(1);
                                }}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.secondaryBtnText}>Book Another</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F4FBF4' },
    
    // Header
    header: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingHorizontal: rs(12),
        paddingBottom: rs(8),
        zIndex: 20,
    },
    headerBlur: {
        borderRadius: rs(16),
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.85)',
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: rs(12),
        paddingVertical: rs(8),
    },
    locationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: rs(6),
        marginRight: rs(8),
    },
    locationText: {
        fontSize: rs(11),
        fontWeight: '600',
        color: '#0f172a',
        flex: 1,
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: rs(6),
    },
    partnerButton: {
        borderRadius: rs(10),
        overflow: 'hidden',
    },
    partnerGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: rs(10),
        paddingVertical: rs(6),
        gap: rs(4),
    },
    partnerButtonText: {
        fontSize: rs(10),
        fontWeight: '700',
        color: '#ffffff',
    },
    avatarButton: {
        borderRadius: rs(18),
        overflow: 'hidden',
        borderWidth: 2,
        borderColor: '#ffffff',
    },
    avatarGradient: {
        width: rs(32),
        height: rs(32),
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        color: '#ffffff',
        fontSize: rs(14),
        fontWeight: '800',
    },

    // Map
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
        top: rs(80),
        alignSelf: 'center',
        backgroundColor: 'rgba(255,255,255,0.9)',
        paddingHorizontal: rs(14),
        paddingVertical: rs(6),
        borderRadius: rs(16),
        flexDirection: 'row',
        alignItems: 'center',
        gap: rs(6),
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    loadingStationsText: { fontSize: rs(10), color: '#475569', fontWeight: '600' },

    // Map Markers
    gmapMarkerContainer: { width: rs(40), height: rs(40), justifyContent: 'center', alignItems: 'center' },
    gmapOuterRing: {
        position: 'absolute',
        width: rs(38),
        height: rs(38),
        borderRadius: rs(19),
        backgroundColor: 'rgba(118, 200, 21, 0.18)',
        borderWidth: 1.5,
        borderColor: 'rgba(118, 200, 21, 0.35)',
    },
    gmapDot: {
        width: rs(20),
        height: rs(20),
        borderRadius: rs(10),
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
        width: rs(32),
        height: rs(32),
        borderRadius: rs(16),
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
        width: rs(26),
        height: rs(26),
        borderRadius: rs(13),
        backgroundColor: '#ef4444',
        justifyContent: 'center',
        alignItems: 'center',
    },
    markerText: {
        color: '#ffffff',
        fontSize: rs(8),
        fontWeight: '800',
    },
    teardropPointerTip: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: rs(5),
        borderRightWidth: rs(5),
        borderTopWidth: rs(7),
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderTopColor: '#ffffff',
        marginTop: rs(-2),
    },

    // FAB
    fabContainer: {
        position: 'absolute',
        right: rs(16),
        bottom: Platform.OS === 'ios' ? rs(120) : rs(100),
    },
    myLocationFab: {
        width: rs(48),
        height: rs(48),
        borderRadius: rs(24),
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

    // Modals
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContainer: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: rs(24),
        borderTopRightRadius: rs(24),
        paddingHorizontal: rs(20),
        paddingBottom: rs(28),
        paddingTop: rs(6),
    },
    modalHandle: {
        width: rs(36),
        height: rs(4),
        borderRadius: rs(2),
        backgroundColor: '#e2e8f0',
        alignSelf: 'center',
        marginBottom: rs(12),
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: rs(16),
    },
    modalTitle: { fontSize: rs(18), fontWeight: '800', color: '#0f172a' },
    closeButton: { padding: rs(4) },

    // Profile Modal
    profileCard: {
        alignItems: 'center',
        paddingVertical: rs(20),
        backgroundColor: '#f8fafc',
        borderRadius: rs(20),
        borderWidth: 1,
        borderColor: '#e2e8f0',
        gap: rs(6),
        marginBottom: rs(16),
    },
    bigAvatarGradient: {
        width: rs(64),
        height: rs(64),
        borderRadius: rs(32),
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: rs(6),
    },
    bigAvatarText: { fontSize: rs(28), fontWeight: '800', color: '#ffffff' },
    profileName: { fontSize: rs(16), fontWeight: '700', color: '#0f172a' },
    profileEmail: { fontSize: rs(12), color: '#64748b' },
    usernameBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: rs(4),
        backgroundColor: '#F0F9ED',
        paddingHorizontal: rs(10),
        paddingVertical: rs(3),
        borderRadius: rs(10),
    },
    profileUsername: { fontSize: rs(11), color: '#76C815', fontWeight: '700' },
    logoutButton: { borderRadius: rs(14), overflow: 'hidden' },
    logoutGradient: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: rs(14),
        gap: rs(6),
    },
    logoutButtonText: { color: '#ffffff', fontSize: rs(14), fontWeight: '700' },

    // Booking Modal
    bookingModalContent: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#ffffff',
        borderTopLeftRadius: rs(24),
        borderTopRightRadius: rs(24),
        paddingHorizontal: rs(16),
        paddingTop: rs(10),
        paddingBottom: Platform.OS === 'ios' ? rs(28) : rs(16),
        maxHeight: height * 0.85,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: -8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 16,
    },
    bookingScrollContent: {
        paddingBottom: rs(12),
    },
    sheetHandle: {
        width: rs(36),
        height: rs(4),
        backgroundColor: '#cbd5e1',
        borderRadius: rs(2),
        alignSelf: 'center',
        marginBottom: rs(12),
    },
    bookingHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: rs(8),
    },
    stationInfoContainer: {
        flex: 1,
        marginRight: rs(12),
    },
    brandRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: rs(6),
        marginBottom: rs(2),
    },
    brandBadge: {
        backgroundColor: '#F0F9ED',
        paddingHorizontal: rs(8),
        paddingVertical: rs(2),
        borderRadius: rs(4),
    },
    bookingBrandName: {
        fontSize: rs(10),
        fontWeight: '700',
        color: '#76C815',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    availBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: rs(4),
        paddingHorizontal: rs(8),
        paddingVertical: rs(2),
        borderRadius: rs(12),
    },
    availableBadge: { backgroundColor: '#DCFCE7' },
    unavailableBadge: { backgroundColor: '#FEE2E2' },
    statusDot: {
        width: rs(6),
        height: rs(6),
        borderRadius: rs(3),
    },
    activeDot: { backgroundColor: '#22C55E' },
    inactiveDot: { backgroundColor: '#EF4444' },
    availText: { fontSize: rs(9), fontWeight: '600' },
    availableText: { color: '#16A34A' },
    unavailableText: { color: '#DC2626' },
    bookingStationTitle: {
        fontSize: rs(16),
        fontWeight: '800',
        color: '#0f172a',
        marginBottom: rs(4),
    },
    stationMetaRow: {
        flexDirection: 'row',
        gap: rs(6),
        flexWrap: 'wrap',
    },
    metaChip: {
        backgroundColor: '#f8fafc',
        paddingHorizontal: rs(8),
        paddingVertical: rs(2),
        borderRadius: rs(4),
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    metaChipText: {
        fontSize: rs(9),
        fontWeight: '600',
        color: '#334155',
    },
    closeModalBtn: {
        width: rs(28),
        height: rs(28),
        borderRadius: rs(14),
        backgroundColor: '#f1f5f9',
        justifyContent: 'center',
        alignItems: 'center',
    },

    // Spec Chips
    specChipsRow: {
        flexDirection: 'row',
        gap: rs(4),
        marginBottom: rs(12),
        flexWrap: 'wrap',
    },
    specChip: {
        flex: 1,
        minWidth: '22%',
        backgroundColor: '#F4FBF4',
        paddingHorizontal: rs(6),
        paddingVertical: rs(4),
        borderRadius: rs(6),
        borderWidth: 1,
        borderColor: '#D4EFC3',
        alignItems: 'center',
    },
    specChipLabel: {
        fontSize: rs(7),
        fontWeight: '600',
        color: '#94a3b8',
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    specChipValue: {
        fontSize: rs(10),
        fontWeight: '700',
        color: '#76C815',
        marginTop: rs(1),
    },

    // Sections
    sectionBlock: { marginBottom: rs(10) },
    sectionTitleText: { 
        fontSize: rs(12), 
        fontWeight: '700', 
        color: '#0f172a', 
        marginBottom: rs(6) 
    },

    // Connector
    connectorRow: { 
        flexDirection: 'row', 
        flexWrap: 'wrap', 
        gap: rs(6) 
    },
    connectorChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: rs(4),
        paddingHorizontal: rs(10),
        paddingVertical: rs(6),
        borderRadius: rs(8),
        backgroundColor: '#f8fafc',
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
    },
    connectorChipActive: { 
        backgroundColor: '#76C815', 
        borderColor: '#76C815' 
    },
    connectorChipText: { 
        fontSize: rs(10), 
        fontWeight: '600', 
        color: '#475569' 
    },
    connectorChipTextActive: { 
        color: '#ffffff' 
    },
    connectorCheckmark: {
        color: '#ffffff',
        fontWeight: '700',
        fontSize: rs(10),
    },

    // Date
    dateRow: {
        flexDirection: 'row',
        gap: rs(6),
    },
    dateChip: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: rs(4),
        paddingVertical: rs(6),
        borderRadius: rs(8),
        backgroundColor: '#f8fafc',
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
    },
    dateChipActive: {
        backgroundColor: '#0f172a',
        borderColor: '#0f172a',
    },
    dateChipText: {
        fontSize: rs(10),
        fontWeight: '600',
        color: '#475569',
    },
    dateChipTextActive: {
        color: '#ffffff',
    },
    weekendDateChip: {
        backgroundColor: '#f1f5f9',
        borderColor: '#e2e8f0',
        opacity: 0.6,
    },
    weekendDateText: {
        color: '#94a3b8',
    },
    weekendBadge: {
        fontSize: rs(7),
        fontWeight: '700',
        color: '#94a3b8',
        textTransform: 'uppercase',
    },

    // Slots
    slotsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: rs(6),
    },
    slotCard: {
        flex: 1,
        minWidth: '30%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: rs(4),
        paddingVertical: rs(6),
        paddingHorizontal: rs(4),
        borderRadius: rs(6),
        backgroundColor: '#f8fafc',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    slotCardActive: {
        backgroundColor: '#76C815',
        borderColor: '#76C815',
    },
    slotCardText: {
        fontSize: rs(9),
        fontWeight: '600',
        color: '#334155',
    },
    slotCardTextActive: {
        color: '#ffffff',
        fontWeight: '700',
    },
    slotCheckmark: {
        fontSize: rs(9),
        color: '#ffffff',
        fontWeight: '700',
    },

    // Duration
    durationRow: {
        flexDirection: 'row',
        gap: rs(6),
    },
    durationChip: {
        flex: 1,
        paddingVertical: rs(8),
        paddingHorizontal: rs(6),
        borderRadius: rs(8),
        backgroundColor: '#f8fafc',
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        alignItems: 'center',
        position: 'relative',
    },
    durationChipActive: {
        backgroundColor: '#76C815',
        borderColor: '#76C815',
    },
    durationHours: {
        fontSize: rs(13),
        fontWeight: '700',
        color: '#0f172a',
    },
    durationPrice: {
        fontSize: rs(10),
        fontWeight: '600',
        color: '#64748b',
        marginTop: rs(2),
    },
    durationChipTextActive: {
        color: '#ffffff',
    },
    durationCheckmark: {
        position: 'absolute',
        top: rs(-6),
        right: rs(-6),
        width: rs(18),
        height: rs(18),
        borderRadius: rs(9),
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#76C815',
    },
    checkmarkText: {
        fontSize: rs(9),
        color: '#76C815',
        fontWeight: '700',
    },

    // Footer
    bookingFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: rs(8),
        paddingTop: rs(10),
        borderTopWidth: 1,
        borderColor: '#f1f5f9',
    },
    totalPriceBlock: { 
        justifyContent: 'center' 
    },
    totalLabel: { 
        fontSize: rs(9), 
        color: '#94a3b8', 
        fontWeight: '600', 
        textTransform: 'uppercase',
        letterSpacing: 0.3,
    },
    totalAmountText: { 
        fontSize: rs(20), 
        fontWeight: '900', 
        color: '#0f172a' 
    },
    payRazorpayBtn: {
        borderRadius: rs(10),
        overflow: 'hidden',
        minWidth: rs(100),
        marginLeft: rs(12),
    },
    payBtnDisabled: {
        opacity: 0.6,
    },
    payBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: rs(10),
        paddingHorizontal: rs(14),
    },
    payBtnText: {
        color: '#ffffff',
        fontSize: rs(12),
        fontWeight: '800',
    },

    // Razorpay Modal
    razorpayContainer: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    razorpayWebView: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    razorpayLoading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#ffffff',
    },
    razorpayLoadingText: {
        marginTop: rs(16),
        color: '#64748b',
        fontSize: rs(14),
    },

    // Success Modal
    successOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: rs(20),
    },
    successCard: {
        width: '100%',
        maxWidth: rs(400),
        backgroundColor: '#ffffff',
        borderRadius: rs(24),
        padding: rs(20),
        alignItems: 'center',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 20,
    },
    successIconOuterRing: {
        width: rs(64),
        height: rs(64),
        borderRadius: rs(32),
        backgroundColor: '#F0F9ED',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: rs(12),
    },
    successIconBadge: {
        width: rs(48),
        height: rs(48),
        borderRadius: rs(24),
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#76C815',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    successIconText: {
        fontSize: rs(28),
        color: '#ffffff',
        fontWeight: '700',
    },
    successTitle: {
        fontSize: rs(18),
        fontWeight: '800',
        color: '#0f172a',
        textAlign: 'center',
        marginBottom: rs(4),
    },
    successSub: {
        fontSize: rs(12),
        color: '#64748b',
        textAlign: 'center',
        marginBottom: rs(16),
    },
    successDetailsCard: {
        width: '100%',
        backgroundColor: '#f8fafc',
        borderRadius: rs(16),
        padding: rs(14),
        borderWidth: 1,
        borderColor: '#e2e8f0',
        marginBottom: rs(16),
    },
    successDetailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: rs(5),
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    detailLabel: {
        fontSize: rs(10),
        color: '#64748b',
        fontWeight: '600',
    },
    detailValueBold: {
        fontSize: rs(11),
        fontWeight: '800',
        color: '#0f172a',
    },
    detailValue: {
        fontSize: rs(10),
        fontWeight: '700',
        color: '#334155',
    },
    detailAmountPaid: {
        fontSize: rs(14),
        fontWeight: '900',
        color: '#76C815',
    },
    successActions: {
        width: '100%',
        gap: rs(8),
    },
    primaryBtn: {
        width: '100%',
        borderRadius: rs(12),
        overflow: 'hidden',
    },
    primaryBtnGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: rs(12),
    },
    primaryBtnText: {
        color: '#ffffff',
        fontSize: rs(13),
        fontWeight: '800',
    },
    secondaryBtn: {
        width: '100%',
        paddingVertical: rs(10),
        borderRadius: rs(12),
        borderWidth: 1.5,
        borderColor: '#e2e8f0',
        alignItems: 'center',
    },
    secondaryBtnText: {
        color: '#475569',
        fontSize: rs(12),
        fontWeight: '600',
    },
});

export default HomeScreen;