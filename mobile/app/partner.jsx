import React, { useState, useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    SafeAreaView,
    StatusBar,
    Platform,
    Modal,
    Animated,
    Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import stationService from '../services/station.service.js';
import { useAuth } from '../context/AuthContext.jsx';

const { width, height } = Dimensions.get('window');

// Native Map & WebView components
let MapView, Marker, PROVIDER_GOOGLE, WebView;
try {
    const Maps = require('react-native-maps');
    MapView = Maps.default || Maps;
    Marker = Maps.Marker;
    PROVIDER_GOOGLE = Maps.PROVIDER_GOOGLE;
} catch (_e) {}

try {
    const Web = require('react-native-webview');
    WebView = Web.WebView || Web.default || Web;
} catch (_e) {}

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

export default function PartnerScreen() {
    const router = useRouter();
    const { user, updateUser } = useAuth();

    const [myStations, setMyStations] = useState([]);
    const [isLoadingStations, setIsLoadingStations] = useState(true);
    const [showFormModal, setShowFormModal] = useState(false);
    const [editingStationId, setEditingStationId] = useState(null);

    // Animation values
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(30)).current;
    const modalSlideAnim = useRef(new Animated.Value(height)).current;
    const mapModalSlideAnim = useRef(new Animated.Value(height)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;

    // Interactive Map Location Picker State
    const [showMapPickerModal, setShowMapPickerModal] = useState(false);
    const [pinCoords, setPinCoords] = useState({ latitude: 28.6139, longitude: 77.2090 });
    const [pinAddress, setPinAddress] = useState('');
    const [modalSearchText, setModalSearchText] = useState('');
    const [isSearchingModal, setIsSearchingModal] = useState(false);

    // Map References & Timers
    const modalMapRef = useRef(null);
    const webMapIframeRef = useRef(null);
    const geocodeTimerRef = useRef(null);

    const initialFormState = {
        stationName: '',
        operatorBrand: '',
        cityState: '',
        address: '',
        latitude: '',
        longitude: '',
        addressSearch: '',
        locationType: 'Suburban',
        chargerLevel: 'Level 2',
        powerOutput: '7.2 kW',
        totalPorts: '4',
        availablePorts: '4',
        connectors: ['CCS2', 'Type 2'],
        amenities: ['Coffee Shop', 'Convenience Store'],
        pricingType: 'per_kwh',
        priceRate: '15',
        operatingDays: '24/7 (Mon - Sun)',
        openTime: '06:00 AM',
        closeTime: '10:00 PM',
        status: 'Available',
    };

    const [form, setForm] = useState(initialFormState);
    const [isLocating, setIsLocating] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        fetchMyStations();
        animateEntrance();
    }, []);

    const animateEntrance = () => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
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

    const showFormModalWithAnimation = () => {
        setShowFormModal(true);
        Animated.spring(modalSlideAnim, {
            toValue: 0,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
        }).start();
    };

    const hideFormModal = () => {
        Animated.timing(modalSlideAnim, {
            toValue: height,
            duration: 350,
            useNativeDriver: true,
        }).start(() => setShowFormModal(false));
    };

    const showMapPickerWithAnimation = () => {
        setShowMapPickerModal(true);
        Animated.spring(mapModalSlideAnim, {
            toValue: 0,
            friction: 8,
            tension: 40,
            useNativeDriver: true,
        }).start();
    };

    const hideMapPicker = () => {
        Animated.timing(mapModalSlideAnim, {
            toValue: height,
            duration: 350,
            useNativeDriver: true,
        }).start(() => setShowMapPickerModal(false));
    };

    const fetchMyStations = async () => {
        setIsLoadingStations(true);
        try {
            const res = await stationService.getMyStations();
            if (res.success) {
                setMyStations(res.data || []);
                if ((!res.data || res.data.length === 0) && !showFormModal) {
                    showFormModalWithAnimation();
                }
            }
        } catch (_err) {
        } finally {
            setIsLoadingStations(false);
        }
    };

    const fetchFastLiveLocation = async () => {
        try {
            if (Location && typeof Location.requestForegroundPermissionsAsync === 'function') {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    try {
                        if (typeof Location.getLastKnownPositionAsync === 'function') {
                            const lastKnown = await Location.getLastKnownPositionAsync({});
                            if (lastKnown && lastKnown.coords) {
                                return {
                                    latitude: lastKnown.coords.latitude,
                                    longitude: lastKnown.coords.longitude,
                                };
                            }
                        }
                    } catch (_lk) {}

                    try {
                        const pos = await Location.getCurrentPositionAsync({
                            accuracy: Location.Accuracy.Balanced,
                        });
                        if (pos && pos.coords) {
                            return {
                                latitude: pos.coords.latitude,
                                longitude: pos.coords.longitude,
                            };
                        }
                    } catch (_cur) {}
                }
            }

            if (typeof navigator !== 'undefined' && navigator?.geolocation) {
                return new Promise((resolve) => {
                    navigator.geolocation.getCurrentPosition(
                        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
                        () => resolve(null),
                        { timeout: 4000, enableHighAccuracy: false }
                    );
                });
            }
        } catch (_e) {}
        return null;
    };

    const handleUseCurrentLocation = async () => {
        setIsLocating(true);
        try {
            const pos = await fetchFastLiveLocation();
            if (pos) {
                const latStr = pos.latitude.toFixed(6);
                const lngStr = pos.longitude.toFixed(6);
                setForm((prev) => ({
                    ...prev,
                    latitude: latStr,
                    longitude: lngStr,
                }));
                try {
                    const [place] = await Location.reverseGeocodeAsync({
                        latitude: pos.latitude,
                        longitude: pos.longitude,
                    });
                    if (place) {
                        const formatted = [place.city || place.subregion, place.region].filter(Boolean).join(', ');
                        setForm((prev) => ({ ...prev, cityState: formatted || 'Current Location' }));
                    }
                } catch (_gErr) {}
                Alert.alert('📍 Location Found', `Lat: ${latStr}, Lng: ${lngStr}`);
            } else {
                Alert.alert('⚠️ Notice', 'Could not access live GPS position.');
            }
        } catch (_err) {
            Alert.alert('Error', 'Could not fetch current location.');
        } finally {
            setIsLocating(false);
        }
    };

    useEffect(() => {
        if (Platform.OS === 'web' && typeof window !== 'undefined') {
            const handleWebMessage = (event) => {
                if (event.data && (event.data.type === 'PIN_MOVED' || event.data.lat)) {
                    const lat = parseFloat(event.data.lat);
                    const lng = parseFloat(event.data.lng);
                    if (!isNaN(lat) && !isNaN(lng)) {
                        setPinCoords({ latitude: lat, longitude: lng });
                        fetchReverseGeocode(lat, lng);
                    }
                }
            };
            window.addEventListener('message', handleWebMessage);
            return () => window.removeEventListener('message', handleWebMessage);
        }
    }, []);

    const debouncedReverseGeocode = (lat, lng) => {
        if (geocodeTimerRef.current) {
            clearTimeout(geocodeTimerRef.current);
        }
        geocodeTimerRef.current = setTimeout(() => {
            fetchReverseGeocode(lat, lng);
        }, 350);
    };

    const animateMapToLocation = (lat, lng) => {
        if (modalMapRef.current && modalMapRef.current.animateToRegion) {
            modalMapRef.current.animateToRegion(
                {
                    latitude: lat,
                    longitude: lng,
                    latitudeDelta: 0.008,
                    longitudeDelta: 0.008,
                },
                1000
            );
        }
        if (webMapIframeRef.current && webMapIframeRef.current.contentWindow) {
            webMapIframeRef.current.contentWindow.postMessage(
                { type: 'FLY_TO', lat, lng },
                '*'
            );
        }
    };

    const fetchReverseGeocode = async (lat, lng) => {
        try {
            if (Location && typeof Location.reverseGeocodeAsync === 'function') {
                const [place] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
                if (place) {
                    const formatted = [
                        place.name || place.street,
                        place.subregion || place.city || place.district,
                        place.region,
                    ].filter(Boolean).join(', ');
                    setPinAddress(formatted || `Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`);
                    return;
                }
            }
        } catch (_e) {}
        setPinAddress(`Lat: ${lat.toFixed(6)}, Lng: ${lng.toFixed(6)}`);
    };

    const openMapPicker = (searchQuery = '') => {
        showMapPickerWithAnimation();

        let lat = parseFloat(form.latitude) || 28.6139;
        let lng = parseFloat(form.longitude) || 77.2090;
        let query = searchQuery || form.addressSearch;

        const initialCoords = { latitude: lat, longitude: lng };
        setPinCoords(initialCoords);
        setModalSearchText(query || '');
        fetchReverseGeocode(initialCoords.latitude, initialCoords.longitude);

        if (query && query.trim()) {
            setIsSearchingModal(true);
            Location.geocodeAsync(query.trim())
                .then((results) => {
                    if (results && results.length > 0) {
                        const newLat = results[0].latitude;
                        const newLng = results[0].longitude;
                        setPinCoords({ latitude: newLat, longitude: newLng });
                        animateMapToLocation(newLat, newLng);
                        fetchReverseGeocode(newLat, newLng);
                    }
                })
                .catch(() => {})
                .finally(() => setIsSearchingModal(false));
        } else if (!form.latitude || !form.longitude) {
            fetchFastLiveLocation().then((fastPos) => {
                if (fastPos) {
                    setPinCoords(fastPos);
                    animateMapToLocation(fastPos.latitude, fastPos.longitude);
                    fetchReverseGeocode(fastPos.latitude, fastPos.longitude);
                }
            });
        } else {
            setTimeout(() => {
                animateMapToLocation(lat, lng);
            }, 200);
        }
    };

    const handleSearchInMapModal = async () => {
        if (!modalSearchText.trim()) return;
        setIsSearchingModal(true);
        try {
            if (Location && typeof Location.geocodeAsync === 'function') {
                const results = await Location.geocodeAsync(modalSearchText.trim());
                if (results && results.length > 0) {
                    const lat = results[0].latitude;
                    const lng = results[0].longitude;
                    const newCoords = { latitude: lat, longitude: lng };
                    setPinCoords(newCoords);
                    animateMapToLocation(lat, lng);
                    debouncedReverseGeocode(lat, lng);
                } else {
                    Alert.alert('Search Notice', `Could not find coordinates for "${modalSearchText.trim()}".`);
                }
            }
        } catch (_e) {
            Alert.alert('Error', 'Geocoding failed for entered address.');
        } finally {
            setIsSearchingModal(false);
        }
    };

    const handleApplyMapLocation = () => {
        const latStr = pinCoords.latitude.toFixed(6);
        const lngStr = pinCoords.longitude.toFixed(6);
        setForm((prev) => ({
            ...prev,
            latitude: latStr,
            longitude: lngStr,
            cityState: pinAddress || prev.cityState || modalSearchText,
            address: pinAddress || prev.address,
        }));
        hideMapPicker();
        Alert.alert('📍 Location Locked!', `Station position set to:\nLat: ${latStr}, Lng: ${lngStr}`);
    };

    const handleUnlockLocation = () => {
        setForm((prev) => ({
            ...prev,
            latitude: '',
            longitude: '',
            cityState: '',
            addressSearch: '',
        }));
    };

    const isLocationLocked = Boolean(form.latitude && form.longitude);

    const toggleAmenity = (amenity) => {
        setForm((prev) => {
            const exists = prev.amenities.includes(amenity);
            return {
                ...prev,
                amenities: exists
                    ? prev.amenities.filter((a) => a !== amenity)
                    : [...prev.amenities, amenity],
            };
        });
    };

    const toggleConnector = (conn) => {
        setForm((prev) => {
            const exists = prev.connectors.includes(conn);
            return {
                ...prev,
                connectors: exists
                    ? prev.connectors.filter((c) => c !== conn)
                    : [...prev.connectors, conn],
            };
        });
    };

    const openEditStationForm = (st) => {
        setEditingStationId(st._id);
        setForm({
            stationName: st.stationName || '',
            operatorBrand: st.operatorBrand || '',
            cityState: st.cityState || '',
            address: st.address || '',
            latitude: st.location?.coordinates?.[1]?.toString() || '',
            longitude: st.location?.coordinates?.[0]?.toString() || '',
            addressSearch: st.cityState || '',
            locationType: st.locationType || 'Suburban',
            chargerLevel: st.chargerLevel || 'Level 2',
            powerOutput: st.powerOutput || '7.2 kW',
            totalPorts: st.totalPorts?.toString() || '4',
            availablePorts: st.availablePorts?.toString() || '4',
            connectors: st.connectors || ['CCS2', 'Type 2'],
            amenities: st.amenities || [],
            pricingType: st.pricingType || 'per_kwh',
            priceRate: st.priceRate?.toString() || '15',
            operatingDays: st.operatingDays || '24/7 (Mon - Sun)',
            openTime: st.openTime || '06:00 AM',
            closeTime: st.closeTime || '10:00 PM',
            status: st.status || 'Available',
        });
        showFormModalWithAnimation();
    };

    const openNewStationForm = () => {
        setEditingStationId(null);
        setForm(initialFormState);
        showFormModalWithAnimation();
    };

    const handleSubmitStation = async () => {
        if (!form.stationName.trim()) {
            Alert.alert('Validation Error', 'Please enter your Station Name');
            return;
        }
        if (!form.latitude || !form.longitude) {
            Alert.alert('Validation Error', 'Please specify station location');
            return;
        }

        setIsSubmitting(true);
        try {
            if (editingStationId) {
                const res = await stationService.updateStation(editingStationId, form);
                if (res.success) {
                    Alert.alert('✅ Success', 'Charging station updated successfully!');
                    hideFormModal();
                    fetchMyStations();
                }
            } else {
                const res = await stationService.createStation(form);
                if (res.success) {
                    if (res.data?.user) {
                        updateUser(res.data.user);
                    }
                    Alert.alert(
                        '🎉 Station Listed!',
                        `"${form.stationName.trim()}" is now live!`
                    );
                    hideFormModal();
                    fetchMyStations();
                }
            }
        } catch (err) {
            const message = err.response?.data?.message || err.message || 'Failed to save charging station';
            Alert.alert('Error', message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteStation = (id, name) => {
        Alert.alert('Delete Station', `Are you sure you want to delete "${name}"?`, [
            { text: 'Cancel', style: 'cancel' },
            {
                text: 'Delete',
                style: 'destructive',
                onPress: async () => {
                    try {
                        const res = await stationService.deleteStation(id);
                        if (res.success) {
                            Alert.alert('✅ Deleted', 'Station removed successfully.');
                            fetchMyStations();
                        }
                    } catch (err) {
                        Alert.alert('Error', err.response?.data?.message || 'Failed to delete station');
                    }
                },
            },
        ]);
    };

    const renderStationCard = (st) => (
        <Animated.View 
            key={st._id} 
            style={[
                styles.stationItemCard,
                {
                    opacity: fadeAnim,
                    transform: [{ translateY: slideAnim }],
                }
            ]}
        >
            <View style={styles.stationItemHeader}>
                <View style={{ flex: 1 }}>
                    <Text style={styles.stationItemName}>{st.stationName}</Text>
                    <Text style={styles.stationItemAddress}>
                        {st.cityState || st.address || 'Location set'}
                    </Text>
                </View>
                <View
                    style={[
                        styles.statusTag,
                        st.status === 'Available' ? styles.statusAvail : styles.statusMaint,
                    ]}
                >
                    <Text style={styles.statusTagText}>{st.status}</Text>
                </View>
            </View>

            <View style={styles.stationMetaRow}>
                <View style={styles.metaChip}>
                    <Ionicons name="flash-outline" size={14} color="#10b981" />
                    <Text style={styles.metaValue}>{st.powerOutput}</Text>
                </View>
                <View style={styles.metaChip}>
                    <Ionicons name="hardware-chip-outline" size={14} color="#10b981" />
                    <Text style={styles.metaValue}>{st.totalPorts} Ports</Text>
                </View>
                <View style={styles.metaChip}>
                    <Ionicons name="pricetag-outline" size={14} color="#059669" />
                    <Text style={[styles.metaValue, { color: '#059669', fontWeight: '800' }]}>
                        ₹{st.priceRate} / {st.pricingType === 'per_kwh' ? 'kWh' : st.pricingType === 'per_hour' ? 'hr' : 'min'}
                    </Text>
                </View>
            </View>

            <View style={styles.stationActionRow}>
                <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => openEditStationForm(st)}
                    activeOpacity={0.8}
                >
                    <LinearGradient
                        colors={['#ecfdf5', '#d1fae5']}
                        style={styles.editGradient}
                    >
                        <Ionicons name="create-outline" size={16} color="#059669" />
                        <Text style={styles.editButtonText}>Edit</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteStation(st._id, st.stationName)}
                    activeOpacity={0.8}
                >
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

            {/* Header */}
            <Animated.View style={[styles.header, { opacity: fadeAnim }]}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.8}>
                    <Ionicons name="arrow-back" size={22} color="#0f172a" />
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.headerTitle}>Partner Portal</Text>
                    <Text style={styles.headerSubtitle}>
                        {user?.role === 'partner' ? 'Manage EV Charging Stations' : 'Join as a Partner'}
                    </Text>
                </View>
                {myStations.length > 0 && (
                    <TouchableOpacity style={styles.addNavButton} onPress={openNewStationForm} activeOpacity={0.8}>
                        <LinearGradient
                            colors={['#10b981', '#059669']}
                            style={styles.addNavGradient}
                        >
                            <Ionicons name="add" size={18} color="#ffffff" />
                            <Text style={styles.addNavButtonText}>Add New</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </Animated.View>

            {/* Main Content */}
            {isLoadingStations ? (
                <View style={styles.centerLoading}>
                    <ActivityIndicator size="large" color="#10b981" />
                </View>
            ) : (
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    {/* Partner Info Card */}
                    {(() => {
                        const isPartnerVerified = (user?.role === 'partner') || (myStations && myStations.length > 0);
                        return (
                            <Animated.View 
                                style={[
                                    styles.partnerInfoCard,
                                    isPartnerVerified && styles.verifiedPartnerCard,
                                    {
                                        opacity: fadeAnim,
                                        transform: [{ translateY: slideAnim }],
                                    }
                                ]}
                            >
                                <LinearGradient
                                    colors={isPartnerVerified ? ['#059669', '#10b981', '#34d399'] : ['#3b82f6', '#1d4ed8']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.partnerInfoIcon}
                                >
                                    <Ionicons 
                                        name={isPartnerVerified ? "shield-checkmark" : "sparkles"} 
                                        size={26} 
                                        color="#ffffff" 
                                    />
                                </LinearGradient>
                                <View style={{ flex: 1 }}>
                                    <View style={styles.verifiedHeaderRow}>
                                        <Text style={styles.partnerInfoTitle}>
                                            {isPartnerVerified ? 'Verified Partner' : 'Become a Partner'}
                                        </Text>
                                        {isPartnerVerified && (
                                            <View style={styles.verifiedChip}>
                                                <Ionicons name="checkmark-circle" size={13} color="#059669" />
                                                <Text style={styles.verifiedChipText}>Verified</Text>
                                            </View>
                                        )}
                                    </View>
                                    <Text style={styles.partnerInfoSubtitle}>
                                        {isPartnerVerified 
                                            ? `${myStations.length} Station${myStations.length !== 1 ? 's' : ''} Listed & Active`
                                            : 'List your EV charging station to start earning'
                                        }
                                    </Text>
                                </View>
                                {myStations.length > 0 && (
                                    <View style={styles.stationCountBadge}>
                                        <Text style={styles.stationCountText}>{myStations.length}</Text>
                                    </View>
                                )}
                            </Animated.View>
                        );
                    })()}

                    {/* Stations Section */}
                    <Animated.View 
                        style={[
                            styles.sectionCard,
                            {
                                opacity: fadeAnim,
                                transform: [{ translateY: slideAnim }],
                            }
                        ]}
                    >
                        <View style={styles.sectionHeaderRow}>
                            <Text style={styles.sectionTitle}>Your Listed Stations</Text>
                        </View>

                        {myStations.length === 0 ? (
                            <View style={styles.emptyCard}>
                                <View style={styles.emptyIconContainer}>
                                    <Ionicons name="flash-outline" size={56} color="#cbd5e1" />
                                </View>
                                <Text style={styles.emptyTitle}>No Stations Yet</Text>
                                <Text style={styles.emptySub}>
                                    List your first EV charging station to start earning!
                                </Text>
                                <TouchableOpacity style={styles.emptyAddButton} onPress={openNewStationForm} activeOpacity={0.8}>
                                    <LinearGradient
                                        colors={['#10b981', '#059669']}
                                        style={styles.emptyAddGradient}
                                    >
                                        <Ionicons name="add" size={20} color="#ffffff" />
                                        <Text style={styles.emptyAddButtonText}>List Your First Station</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            myStations.map((st) => renderStationCard(st))
                        )}
                    </Animated.View>
                </ScrollView>
            )}

            {/* Form Modal */}
            <Modal
                visible={showFormModal}
                transparent={true}
                animationType="none"
                onRequestClose={hideFormModal}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={hideFormModal}
                >
                    <Animated.View 
                        style={[
                            styles.modalContainer,
                            { transform: [{ translateY: modalSlideAnim }] }
                        ]}
                        onStartShouldSetResponder={() => true}
                    >
                        <View style={styles.modalHandle} />
                        
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editingStationId ? '✏️ Edit Station' : '📋 New Station'}
                            </Text>
                            <TouchableOpacity onPress={hideFormModal} style={styles.closeButton} activeOpacity={0.7}>
                                <Ionicons name="close" size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            {/* Station Information */}
                            <View style={styles.formSection}>
                                <Text style={styles.sectionTitle}>Station Details</Text>
                                
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Station Name *</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. Volta - Miami #7"
                                        placeholderTextColor="#94a3b8"
                                        value={form.stationName}
                                        onChangeText={(val) => setForm({ ...form, stationName: val })}
                                    />
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Operator / Brand</Text>
                                    <TextInput
                                        style={styles.input}
                                        placeholder="e.g. Volta, Tesla, ChargePoint"
                                        placeholderTextColor="#94a3b8"
                                        value={form.operatorBrand}
                                        onChangeText={(val) => setForm({ ...form, operatorBrand: val })}
                                    />
                                </View>
                            </View>

                            {/* Location */}
                            <View style={styles.formSection}>
                                <View style={styles.sectionTitleRow}>
                                    <Text style={styles.sectionTitle}>📍 Location</Text>
                                    {isLocationLocked && (
                                        <View style={styles.lockedBadge}>
                                            <Ionicons name="lock-closed" size={12} color="#059669" />
                                            <Text style={styles.lockedBadgeText}>Locked</Text>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Search Address</Text>
                                    <View style={styles.searchRow}>
                                        <TextInput
                                            style={[styles.input, { flex: 1 }, isLocationLocked && styles.disabledInput]}
                                            placeholder={isLocationLocked ? "🔒 Location locked" : "Search city or area..."}
                                            placeholderTextColor="#94a3b8"
                                            value={isLocationLocked ? (form.cityState || `Lat: ${form.latitude}, Lng: ${form.longitude}`) : form.addressSearch}
                                            onChangeText={(val) => !isLocationLocked && setForm({ ...form, addressSearch: val })}
                                            onSubmitEditing={() => !isLocationLocked && openMapPicker(form.addressSearch)}
                                            editable={!isLocationLocked}
                                        />
                                        <TouchableOpacity
                                            style={[styles.searchButton, isLocationLocked && styles.disabledSearchButton]}
                                            onPress={() => !isLocationLocked && openMapPicker(form.addressSearch)}
                                            disabled={isSearching || isLocationLocked}
                                            activeOpacity={0.8}
                                        >
                                            {isSearching ? (
                                                <ActivityIndicator size="small" color="#ffffff" />
                                            ) : (
                                                <Ionicons name={isLocationLocked ? "lock-closed" : "search"} size={20} color="#ffffff" />
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {isLocationLocked ? (
                                    <View style={styles.locationLockedCard}>
                                        <View style={styles.locationLockedHeader}>
                                            <View style={styles.locationLockedIcon}>
                                                <Ionicons name="location" size={20} color="#059669" />
                                            </View>
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.locationLockedTitle}>Location Confirmed</Text>
                                                <Text style={styles.locationLockedAddress} numberOfLines={2}>
                                                    {form.cityState || form.address || 'Custom Map Spot'}
                                                </Text>
                                            </View>
                                        </View>
                                        <View style={styles.locationActions}>
                                            <TouchableOpacity
                                                style={styles.changeMapButton}
                                                onPress={() => openMapPicker()}
                                                activeOpacity={0.8}
                                            >
                                                <Ionicons name="map" size={16} color="#059669" />
                                                <Text style={styles.changeMapButtonText}>Adjust Pin</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.unlockButton}
                                                onPress={handleUnlockLocation}
                                                activeOpacity={0.8}
                                            >
                                                <Ionicons name="lock-open" size={16} color="#64748b" />
                                                <Text style={styles.unlockButtonText}>Unlock</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ) : (
                                    <View style={{ gap: 10 }}>
                                        <TouchableOpacity
                                            style={styles.mapTriggerButton}
                                            onPress={() => openMapPicker()}
                                            activeOpacity={0.85}
                                        >
                                            <LinearGradient
                                                colors={['#10b981', '#059669']}
                                                style={styles.mapTriggerGradient}
                                            >
                                                <Ionicons name="map" size={20} color="#ffffff" />
                                                <Text style={styles.mapTriggerButtonText}>Open Map Picker</Text>
                                            </LinearGradient>
                                        </TouchableOpacity>

                                        <TouchableOpacity
                                            style={styles.gpsButton}
                                            onPress={handleUseCurrentLocation}
                                            disabled={isLocating}
                                            activeOpacity={0.8}
                                        >
                                            {isLocating ? (
                                                <ActivityIndicator size="small" color="#10b981" />
                                            ) : (
                                                <Ionicons name="locate" size={20} color="#10b981" />
                                            )}
                                            <Text style={styles.gpsButtonText}>
                                                {isLocating ? 'Fetching GPS...' : 'Use Current Location'}
                                            </Text>
                                        </TouchableOpacity>
                                    </View>
                                )}

                                <View style={styles.rowTwoInputs}>
                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                        <Text style={styles.label}>Latitude</Text>
                                        <TextInput
                                            style={[styles.input, isLocationLocked && styles.disabledInput]}
                                            placeholder="28.613920"
                                            placeholderTextColor="#94a3b8"
                                            keyboardType="numeric"
                                            value={form.latitude}
                                            onChangeText={(val) => setForm({ ...form, latitude: val })}
                                            editable={!isLocationLocked}
                                        />
                                    </View>
                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                        <Text style={styles.label}>Longitude</Text>
                                        <TextInput
                                            style={[styles.input, isLocationLocked && styles.disabledInput]}
                                            placeholder="77.209015"
                                            placeholderTextColor="#94a3b8"
                                            keyboardType="numeric"
                                            value={form.longitude}
                                            onChangeText={(val) => setForm({ ...form, longitude: val })}
                                            editable={!isLocationLocked}
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Environment</Text>
                                    <View style={styles.chipGrid}>
                                        {['Suburban', 'Urban', 'Highway', 'Commercial'].map((type) => (
                                            <TouchableOpacity
                                                key={type}
                                                style={[styles.chip, form.locationType === type && styles.chipActive]}
                                                onPress={() => setForm({ ...form, locationType: type })}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[styles.chipText, form.locationType === type && styles.chipTextActive]}>
                                                    {type}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            </View>

                            {/* Hardware Specs */}
                            <View style={styles.formSection}>
                                <Text style={styles.sectionTitle}>⚡ Hardware Specs</Text>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Charger Level</Text>
                                    <View style={styles.chipGrid}>
                                        {['Level 2', 'DC Fast', 'Level 3'].map((lvl) => (
                                            <TouchableOpacity
                                                key={lvl}
                                                style={[styles.chip, form.chargerLevel === lvl && styles.chipActive]}
                                                onPress={() => setForm({ ...form, chargerLevel: lvl })}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[styles.chipText, form.chargerLevel === lvl && styles.chipTextActive]}>
                                                    {lvl}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <View style={styles.rowTwoInputs}>
                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                        <Text style={styles.label}>Power (kW)</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="7.2"
                                            placeholderTextColor="#94a3b8"
                                            value={form.powerOutput}
                                            onChangeText={(val) => setForm({ ...form, powerOutput: val })}
                                        />
                                    </View>
                                    <View style={[styles.inputGroup, { flex: 1 }]}>
                                        <Text style={styles.label}>Total Ports</Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="4"
                                            placeholderTextColor="#94a3b8"
                                            keyboardType="numeric"
                                            value={form.totalPorts}
                                            onChangeText={(val) => setForm({ ...form, totalPorts: val })}
                                        />
                                    </View>
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Status</Text>
                                    <View style={styles.chipGrid}>
                                        {['Available', 'Maintenance', 'Offline'].map((st) => (
                                            <TouchableOpacity
                                                key={st}
                                                style={[styles.chip, form.status === st && styles.chipActive]}
                                                onPress={() => setForm({ ...form, status: st })}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[styles.chipText, form.status === st && styles.chipTextActive]}>
                                                    {st}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>
                            </View>

                            {/* Pricing */}
                            <View style={styles.formSection}>
                                <Text style={styles.sectionTitle}>💰 Pricing</Text>
                                <View style={styles.chipGrid}>
                                    {[
                                        { id: 'per_kwh', label: '/ kWh' },
                                        { id: 'per_hour', label: '/ Hour' },
                                        { id: 'per_min', label: '/ Min' },
                                        { id: 'free', label: 'Free' },
                                    ].map((model) => (
                                        <TouchableOpacity
                                            key={model.id}
                                            style={[styles.chip, form.pricingType === model.id && styles.chipActive]}
                                            onPress={() => setForm({ ...form, pricingType: model.id })}
                                            activeOpacity={0.7}
                                        >
                                            <Text style={[styles.chipText, form.pricingType === model.id && styles.chipTextActive]}>
                                                {model.label}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>

                                {form.pricingType !== 'free' && (
                                    <View style={[styles.inputGroup, { marginTop: 12 }]}>
                                        <Text style={styles.label}>
                                            Rate (₹{form.pricingType === 'per_kwh' ? '/kWh' : form.pricingType === 'per_hour' ? '/hr' : '/min'})
                                        </Text>
                                        <TextInput
                                            style={styles.input}
                                            placeholder="15"
                                            placeholderTextColor="#94a3b8"
                                            keyboardType="numeric"
                                            value={form.priceRate}
                                            onChangeText={(val) => setForm({ ...form, priceRate: val })}
                                        />
                                    </View>
                                )}
                            </View>

                            {/* Operating Hours & Time Slots */}
                            <View style={styles.formSection}>
                                <Text style={styles.sectionTitle}>⏰ Operating Days & Time Slots</Text>
                                
                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Operating Schedule</Text>
                                    <View style={styles.chipGrid}>
                                        {['24/7 (Mon - Sun)', 'Mon - Sat', 'Mon - Fri'].map((days) => (
                                            <TouchableOpacity
                                                key={days}
                                                style={[styles.chip, form.operatingDays === days && styles.chipActive]}
                                                onPress={() => setForm({ ...form, operatingDays: days })}
                                                activeOpacity={0.7}
                                            >
                                                <Text style={[styles.chipText, form.operatingDays === days && styles.chipTextActive]}>
                                                    {days}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                {form.operatingDays !== '24/7 (Mon - Sun)' && (
                                    <View style={styles.rowTwoInputs}>
                                        <View style={[styles.inputGroup, { flex: 1 }]}>
                                            <Text style={styles.label}>Opening Time</Text>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="06:00 AM"
                                                placeholderTextColor="#94a3b8"
                                                value={form.openTime}
                                                onChangeText={(val) => setForm({ ...form, openTime: val })}
                                            />
                                        </View>
                                        <View style={[styles.inputGroup, { flex: 1 }]}>
                                            <Text style={styles.label}>Closing Time</Text>
                                            <TextInput
                                                style={styles.input}
                                                placeholder="10:00 PM"
                                                placeholderTextColor="#94a3b8"
                                                value={form.closeTime}
                                                onChangeText={(val) => setForm({ ...form, closeTime: val })}
                                            />
                                        </View>
                                    </View>
                                )}
                            </View>

                            {/* Submit Button */}
                            <TouchableOpacity
                                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                                onPress={handleSubmitStation}
                                disabled={isSubmitting}
                                activeOpacity={0.85}
                            >
                                <LinearGradient
                                    colors={['#10b981', '#059669']}
                                    style={styles.submitGradient}
                                >
                                    {isSubmitting ? (
                                        <ActivityIndicator color="#ffffff" size="small" />
                                    ) : (
                                        <>
                                            <Ionicons name="checkmark-circle" size={24} color="#ffffff" />
                                            <Text style={styles.submitButtonText}>
                                                {editingStationId ? 'Save Changes' : 'List Station'}
                                            </Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </ScrollView>
                    </Animated.View>
                </TouchableOpacity>
            </Modal>

            {/* Map Picker Modal */}
            <Modal
                visible={showMapPickerModal}
                transparent={true}
                animationType="none"
                onRequestClose={hideMapPicker}
            >
                <TouchableOpacity
                    style={styles.modalOverlay}
                    activeOpacity={1}
                    onPress={hideMapPicker}
                >
                    <Animated.View 
                        style={[
                            styles.mapModalContainer,
                            { transform: [{ translateY: mapModalSlideAnim }] }
                        ]}
                        onStartShouldSetResponder={() => true}
                    >
                        <View style={styles.modalHandle} />
                        
                        <View style={styles.mapModalHeader}>
                            <Text style={styles.mapModalTitle}>📍 Set Location</Text>
                            <TouchableOpacity onPress={hideMapPicker} style={styles.closeButton} activeOpacity={0.7}>
                                <Ionicons name="close" size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.mapPickerSearchContainer}>
                            <View style={styles.searchRow}>
                                <TextInput
                                    style={[styles.input, { flex: 1, backgroundColor: '#ffffff' }]}
                                    placeholder="Search city or area..."
                                    placeholderTextColor="#94a3b8"
                                    value={modalSearchText}
                                    onChangeText={setModalSearchText}
                                    onSubmitEditing={handleSearchInMapModal}
                                />
                                <TouchableOpacity
                                    style={styles.searchButton}
                                    onPress={handleSearchInMapModal}
                                    disabled={isSearchingModal}
                                    activeOpacity={0.8}
                                >
                                    {isSearchingModal ? (
                                        <ActivityIndicator size="small" color="#ffffff" />
                                    ) : (
                                        <Ionicons name="search" size={20} color="#ffffff" />
                                    )}
                                </TouchableOpacity>
                            </View>
                        </View>

                        <View style={styles.mapPickerMapArea}>
                            {Platform.OS !== 'web' && MapView ? (
                                <View style={{ flex: 1, position: 'relative' }}>
                                    <MapView
                                        ref={modalMapRef}
                                        style={{ flex: 1 }}
                                        provider={PROVIDER_GOOGLE}
                                        mapType="hybrid"
                                        customMapStyle={CLEAN_MAP_STYLE}
                                        initialRegion={{
                                            latitude: pinCoords.latitude,
                                            longitude: pinCoords.longitude,
                                            latitudeDelta: 0.008,
                                            longitudeDelta: 0.008,
                                        }}
                                        onRegionChangeComplete={(region) => {
                                            const newCoords = { latitude: region.latitude, longitude: region.longitude };
                                            setPinCoords(newCoords);
                                            debouncedReverseGeocode(region.latitude, region.longitude);
                                        }}
                                    />
                                    <View style={styles.centerPinOverlay} pointerEvents="none">
                                        <View style={styles.centerPinContainer}>
                                            <Ionicons name="location" size={48} color="#10b981" />
                                            <View style={styles.centerPinDot} />
                                        </View>
                                    </View>
                                </View>
                            ) : (
                                <iframe
                                    ref={webMapIframeRef}
                                    title="Station Location Picker"
                                    width="100%"
                                    height="100%"
                                    style={{ border: 0 }}
                                    srcDoc={`
                                        <!DOCTYPE html>
                                        <html>
                                        <head>
                                          <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
                                          <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
                                          <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
                                          <style>
                                            html, body, #map { height: 100%; margin: 0; padding: 0; background: #e2e8f0; font-family: sans-serif; }
                                            .leaflet-control-container .leaflet-routing-container-hide { display: none; }
                                            .fixed-pin-wrapper {
                                              position: fixed;
                                              top: 50%;
                                              left: 50%;
                                              transform: translate(-50%, -100%);
                                              z-index: 9999;
                                              pointer-events: none;
                                              display: flex;
                                              flex-direction: column;
                                              align-items: center;
                                            }
                                            .custom-pin {
                                              width: 36px;
                                              height: 36px;
                                              background: #10b981;
                                              border-radius: 50% 50% 50% 0;
                                              transform: rotate(-45deg);
                                              border: 3.5px solid #ffffff;
                                              box-shadow: 0 4px 14px rgba(0,0,0,0.35);
                                              display: flex;
                                              align-items: center;
                                              justify-content: center;
                                            }
                                            .custom-pin::after {
                                              content: '';
                                              width: 10px;
                                              height: 10px;
                                              background: #ffffff;
                                              border-radius: 50%;
                                            }
                                            .pin-shadow {
                                              width: 10px;
                                              height: 6px;
                                              background: rgba(0,0,0,0.25);
                                              border-radius: 50%;
                                              margin-top: -2px;
                                            }
                                          </style>
                                        </head>
                                        <body>
                                          <div id="map"></div>
                                          <div class="fixed-pin-wrapper">
                                            <div class="custom-pin"></div>
                                            <div class="pin-shadow"></div>
                                          </div>
                                          <script>
                                            var map = L.map('map', { zoomControl: false }).setView([${pinCoords.latitude}, ${pinCoords.longitude}], 16);
                                            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                                              maxZoom: 19,
                                              attribution: '© OpenStreetMap'
                                            }).addTo(map);
                                            L.control.zoom({ position: 'bottomright' }).addTo(map);

                                            function notifyParent(lat, lng) {
                                              if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                                                window.ReactNativeWebView.postMessage(JSON.stringify({ lat: lat, lng: lng }));
                                              } else if (window.parent && window.parent.postMessage) {
                                                window.parent.postMessage({ type: 'PIN_MOVED', lat: lat, lng: lng }, '*');
                                              }
                                            }

                                            map.on('moveend', function() {
                                              var center = map.getCenter();
                                              notifyParent(center.lat, center.lng);
                                            });

                                            window.addEventListener('message', function(event) {
                                              if (event.data && event.data.type === 'FLY_TO') {
                                                map.flyTo([event.data.lat, event.data.lng], 16, { animate: true, duration: 1.2 });
                                              }
                                            });
                                          </script>
                                        </body>
                                        </html>
                                    `}
                                />
                            )}
                        </View>

                        <View style={styles.mapPickerBottomCard}>
                            <View style={styles.pinAddressContainer}>
                                <Ionicons name="location" size={22} color="#10b981" />
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.pinAddressTitle} numberOfLines={1}>
                                        {pinAddress || 'Selected Location'}
                                    </Text>
                                    <Text style={styles.pinCoordsSub}>
                                        {pinCoords.latitude.toFixed(6)}°N, {pinCoords.longitude.toFixed(6)}°E
                                    </Text>
                                </View>
                            </View>

                            <TouchableOpacity
                                style={styles.applyLocationButton}
                                onPress={handleApplyMapLocation}
                                activeOpacity={0.85}
                            >
                                <LinearGradient
                                    colors={['#10b981', '#059669']}
                                    style={styles.applyLocationGradient}
                                >
                                    <Ionicons name="checkmark-circle" size={22} color="#ffffff" />
                                    <Text style={styles.applyLocationButtonText}>Apply Location</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'android' ? 44 : 20,
        paddingHorizontal: 20,
        paddingBottom: 16,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f8fafc',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0f172a',
    },
    headerSubtitle: {
        fontSize: 13,
        color: '#64748b',
        marginTop: 2,
    },
    addNavButton: {
        borderRadius: 20,
        overflow: 'hidden',
    },
    addNavGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 8,
        gap: 4,
    },
    addNavButtonText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '700',
    },
    centerLoading: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: 20,
        gap: 18,
        paddingBottom: 40,
    },
    partnerInfoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        gap: 14,
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    verifiedPartnerCard: {
        backgroundColor: '#f0fdf4',
        borderColor: '#a7f3d0',
        shadowColor: '#10b981',
        shadowOpacity: 0.12,
    },
    partnerInfoIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#059669',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 5,
    },
    verifiedHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    verifiedChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#d1fae5',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#6ee7b7',
    },
    verifiedChipText: {
        fontSize: 10,
        fontWeight: '800',
        color: '#047857',
    },
    partnerInfoTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0f172a',
    },
    partnerInfoSubtitle: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
    },
    stationCountBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#ecfdf5',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#a7f3d0',
    },
    stationCountText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#059669',
    },
    sectionCard: {
        backgroundColor: '#ffffff',
        borderRadius: 20,
        padding: 18,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        gap: 14,
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '800',
        color: '#0f172a',
    },
    addNewLink: {
        fontSize: 13,
        fontWeight: '700',
        color: '#10b981',
    },
    emptyCard: {
        alignItems: 'center',
        paddingVertical: 32,
        gap: 10,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#f8fafc',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#334155',
    },
    emptySub: {
        fontSize: 13,
        color: '#64748b',
        textAlign: 'center',
        paddingHorizontal: 20,
    },
    emptyAddButton: {
        borderRadius: 20,
        overflow: 'hidden',
        marginTop: 8,
    },
    emptyAddGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        gap: 8,
    },
    emptyAddButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '700',
    },
    stationItemCard: {
        backgroundColor: '#f8fafc',
        borderRadius: 16,
        padding: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        gap: 10,
        marginBottom: 10,
    },
    stationItemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    stationItemName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#0f172a',
    },
    stationItemAddress: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
    },
    statusTag: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusAvail: {
        backgroundColor: '#ecfdf5',
    },
    statusMaint: {
        backgroundColor: '#fef3c7',
    },
    statusTagText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#059669',
    },
    stationMetaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        backgroundColor: '#ffffff',
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    metaChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaValue: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1e293b',
    },
    stationActionRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 4,
    },
    editButton: {
        borderRadius: 12,
        overflow: 'hidden',
    },
    editGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 14,
        paddingVertical: 6,
        gap: 6,
    },
    editButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#059669',
    },
    deleteButton: {
        padding: 6,
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
        maxHeight: height * 0.9,
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
        fontSize: 22,
        fontWeight: '800',
        color: '#0f172a',
    },
    closeButton: {
        padding: 4,
    },
    formSection: {
        marginBottom: 20,
        gap: 14,
    },
    sectionTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    inputGroup: {
        gap: 6,
    },
    label: {
        fontSize: 12,
        fontWeight: '700',
        color: '#475569',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    input: {
        backgroundColor: '#f8fafc',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        paddingHorizontal: 14,
        height: 48,
        fontSize: 14,
        color: '#0f172a',
    },
    rowTwoInputs: {
        flexDirection: 'row',
        gap: 12,
    },
    searchRow: {
        flexDirection: 'row',
        gap: 8,
    },
    searchButton: {
        backgroundColor: '#10b981',
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    disabledSearchButton: {
        backgroundColor: '#94a3b8',
    },
    disabledInput: {
        backgroundColor: '#f1f5f9',
        borderColor: '#cbd5e1',
        color: '#64748b',
    },
    chipGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    chip: {
        backgroundColor: '#f8fafc',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    chipActive: {
        backgroundColor: '#ecfdf5',
        borderColor: '#10b981',
    },
    chipText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748b',
    },
    chipTextActive: {
        color: '#059669',
        fontWeight: '700',
    },
    lockedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#ecfdf5',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#a7f3d0',
    },
    lockedBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#059669',
    },
    locationLockedCard: {
        backgroundColor: '#ecfdf5',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#a7f3d0',
        padding: 14,
        gap: 12,
    },
    locationLockedHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    locationLockedIcon: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#a7f3d0',
    },
    locationLockedTitle: {
        fontSize: 13,
        fontWeight: '800',
        color: '#065f46',
    },
    locationLockedAddress: {
        fontSize: 12,
        color: '#047857',
        fontWeight: '600',
        marginTop: 2,
    },
    locationActions: {
        flexDirection: 'row',
        gap: 10,
    },
    changeMapButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#10b981',
        paddingVertical: 10,
        borderRadius: 12,
    },
    changeMapButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#059669',
    },
    unlockButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    unlockButtonText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748b',
    },
    mapTriggerButton: {
        borderRadius: 14,
        overflow: 'hidden',
    },
    mapTriggerGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 8,
    },
    mapTriggerButtonText: {
        color: '#ffffff',
        fontSize: 14,
        fontWeight: '700',
    },
    gpsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#ecfdf5',
        borderWidth: 1,
        borderColor: '#a7f3d0',
        paddingVertical: 12,
        borderRadius: 14,
        gap: 8,
    },
    gpsButtonText: {
        color: '#059669',
        fontSize: 13,
        fontWeight: '700',
    },
    submitButton: {
        borderRadius: 24,
        overflow: 'hidden',
        marginTop: 6,
        marginBottom: 20,
    },
    submitButtonDisabled: {
        opacity: 0.7,
    },
    submitGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    submitButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    mapModalContainer: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 30,
        borderTopRightRadius: 30,
        paddingTop: 8,
        height: height * 0.95,
    },
    mapModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 8,
    },
    mapModalTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0f172a',
    },
    mapPickerSearchContainer: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        backgroundColor: '#f8fafc',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
    },
    mapPickerMapArea: {
        flex: 1,
        backgroundColor: '#e2e8f0',
    },
    centerPinOverlay: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginLeft: -24,
        marginTop: -40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    centerPinContainer: {
        alignItems: 'center',
    },
    centerPinDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#0f172a',
        marginTop: -8,
    },
    mapPickerBottomCard: {
        backgroundColor: '#ffffff',
        padding: 18,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        gap: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 10,
        elevation: 8,
    },
    pinAddressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        backgroundColor: '#f8fafc',
        padding: 12,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    pinAddressTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#0f172a',
    },
    pinCoordsSub: {
        fontSize: 12,
        color: '#64748b',
        marginTop: 2,
    },
    applyLocationButton: {
        borderRadius: 18,
        overflow: 'hidden',
    },
    applyLocationGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8,
    },
    applyLocationButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '800',
    },
});