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
    StatusBar,
    Platform,
    Modal,
    Animated,
    Dimensions,
    KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import stationService from '../services/station.service.js';
import configService from '../services/config.service.js';
import { useAuth } from '../context/AuthContext.jsx';
import {
    ArrowLeft,
    Plus,
    MapPin,
    Lock,
    Unlock,
    Search,
    X,
    Zap,
    Shield,
    Sparkles,
    Check,
    Clock,
    Calendar,
    DollarSign,
    Map,
    Locate,
    Trash2,
    Edit,
    GripVertical,
    Power,
    HardDrive,
    Tag,
} from 'lucide-react-native';

const { width, height } = Dimensions.get('window');

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

const CLEAN_MAP_STYLE = [
    { featureType: 'all', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi', elementType: 'all', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi', elementType: 'labels.text', stylers: [{ visibility: 'off' }] },
    { featureType: 'poi.school', elementType: 'all', stylers: [{ visibility: 'off' }] },
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

    // Interactive Map Location Picker State
    const [showMapPickerModal, setShowMapPickerModal] = useState(false);
    const [pinCoords, setPinCoords] = useState({ latitude: 28.6139, longitude: 77.2090 });
    const [pinAddress, setPinAddress] = useState('');
    const [modalSearchText, setModalSearchText] = useState('');
    const [isSearchingModal, setIsSearchingModal] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const searchDebounceTimer = useRef(null);

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
        chargerLevel: 'Level 2 (Faster AC)',
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
        setSuggestions([]);
        if (searchDebounceTimer.current) clearTimeout(searchDebounceTimer.current);
        Animated.timing(mapModalSlideAnim, {
            toValue: height,
            duration: 250,
            useNativeDriver: true,
        }).start(() => {
            setShowMapPickerModal(false);
        });
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
                    } catch (_lk) { }

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
                    } catch (_cur) { }
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
        } catch (_e) { }
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
                } catch (_gErr) { }
                Alert.alert('Location Found', `Lat: ${latStr}, Lng: ${lngStr}`);
            } else {
                Alert.alert('Notice', 'Could not access live GPS position.');
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
        } catch (_e) { }
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
                .catch(() => { })
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

    const handleSearchTextChange = (text) => {
        setModalSearchText(text);

        if (searchDebounceTimer.current) {
            clearTimeout(searchDebounceTimer.current);
        }

        if (!text || text.trim().length < 2) {
            setSuggestions([]);
            return;
        }

        searchDebounceTimer.current = setTimeout(async () => {
            setIsSearchingModal(true);
            try {
                const res = await configService.getPlacesAutocomplete(text.trim());
                if (res.success && Array.isArray(res.data) && res.data.length > 0) {
                    setSuggestions(res.data);
                } else if (Location && typeof Location.geocodeAsync === 'function') {
                    const results = await Location.geocodeAsync(text.trim());
                    if (results && results.length > 0) {
                        const formatted = results.map((r, i) => ({
                            description: `${text.trim()} (${r.latitude.toFixed(4)}, ${r.longitude.toFixed(4)})`,
                            mainText: text.trim(),
                            secondaryText: `Lat: ${r.latitude.toFixed(4)}, Lng: ${r.longitude.toFixed(4)}`,
                            lat: r.latitude,
                            lng: r.longitude,
                            placeId: `geo_${i}`,
                        }));
                        setSuggestions(formatted);
                    } else {
                        setSuggestions([]);
                    }
                } else {
                    setSuggestions([]);
                }
            } catch (_err) {
                setSuggestions([]);
            } finally {
                setIsSearchingModal(false);
            }
        }, 400);
    };

    const handleSelectSuggestion = async (item) => {
        setSuggestions([]);
        setModalSearchText(item.description || item.mainText);
        setIsSearchingModal(true);

        try {
            let lat = item.lat;
            let lng = item.lng;

            if (!lat || !lng) {
                const detailsRes = await configService.getPlaceDetails(item.placeId, item.description);
                if (detailsRes.success && detailsRes.data) {
                    lat = detailsRes.data.lat;
                    lng = detailsRes.data.lng;
                }
            }

            if (!lat || !lng) {
                if (Location && typeof Location.geocodeAsync === 'function') {
                    const results = await Location.geocodeAsync(item.description || item.mainText);
                    if (results && results.length > 0) {
                        lat = results[0].latitude;
                        lng = results[0].longitude;
                    }
                }
            }

            if (lat && lng) {
                const newCoords = { latitude: lat, longitude: lng };
                setPinCoords(newCoords);
                animateMapToLocation(lat, lng);
                debouncedReverseGeocode(lat, lng);
            }
        } catch (_e) {
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
        Alert.alert('Location Locked!', `Station position set to:\nLat: ${latStr}, Lng: ${lngStr}`);
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
            chargerLevel: st.chargerLevel || 'Level 2 (Faster AC)',
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
                    Alert.alert('Success', 'Charging station updated successfully!');
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
                        'Station Listed!',
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
                            Alert.alert('Deleted', 'Station removed successfully.');
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
                    <Power size={14} color="#4CAF50" />
                    <Text style={styles.metaValue}>{st.powerOutput}</Text>
                </View>
                <View style={styles.metaChip}>
                    <HardDrive size={14} color="#4CAF50" />
                    <Text style={styles.metaValue}>{st.totalPorts} Ports</Text>
                </View>
                <View style={styles.metaChip}>
                    <Tag size={14} color="#4CAF50" />
                    <Text style={[styles.metaValue, { color: '#4CAF50', fontWeight: '800' }]}>
                        ₹{st.priceRate} / {st.pricingType === 'per_kwh' ? 'kWh' : 'hr'}
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
                        colors={['#E8F5E9', '#C8E6C9']}
                        style={styles.editGradient}
                    >
                        <Edit size={16} color="#4CAF50" />
                        <Text style={styles.editButtonText}>Edit</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDeleteStation(st._id, st.stationName)}
                    activeOpacity={0.8}
                >
                    <Trash2 size={20} color="#ef4444" />
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
                    <ArrowLeft size={22} color="#0f172a" />
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
                            colors={['#4CAF50', '#388E3C']}
                            style={styles.addNavGradient}
                        >
                            <Plus size={18} color="#ffffff" />
                            <Text style={styles.addNavButtonText}>Add New</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                )}
            </Animated.View>

            {/* Main Content */}
            {isLoadingStations ? (
                <View style={styles.centerLoading}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
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
                                    colors={isPartnerVerified ? ['#4CAF50', '#388E3C'] : ['#2196F3', '#1565C0']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                    style={styles.partnerInfoIcon}
                                >
                                    {isPartnerVerified ? (
                                        <Shield size={26} color="#ffffff" />
                                    ) : (
                                        <Sparkles size={26} color="#ffffff" />
                                    )}
                                </LinearGradient>
                                <View style={{ flex: 1 }}>
                                    <View style={styles.verifiedHeaderRow}>
                                        <Text style={styles.partnerInfoTitle}>
                                            {isPartnerVerified ? 'Verified Partner' : 'Become a Partner'}
                                        </Text>
                                        {isPartnerVerified && (
                                            <View style={styles.verifiedChip}>
                                                <Check size={12} color="#4CAF50" />
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
                                    <Zap size={48} color="#cbd5e1" />
                                </View>
                                <Text style={styles.emptyTitle}>No Stations Yet</Text>
                                <Text style={styles.emptySub}>
                                    List your first EV charging station to start earning!
                                </Text>
                                <TouchableOpacity style={styles.emptyAddButton} onPress={openNewStationForm} activeOpacity={0.8}>
                                    <LinearGradient
                                        colors={['#4CAF50', '#388E3C']}
                                        style={styles.emptyAddGradient}
                                    >
                                        <Plus size={20} color="#ffffff" />
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

            {/* Form Modal - Simplified */}
            <Modal
                visible={showFormModal}
                transparent={true}
                animationType="none"
                onRequestClose={hideFormModal}
            >
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={StyleSheet.absoluteFillObject}
                        activeOpacity={1}
                        onPress={hideFormModal}
                    />
                    <Animated.View
                        style={[
                            styles.modalContainer,
                            { transform: [{ translateY: modalSlideAnim }] }
                        ]}
                    >
                        <View style={styles.modalHandle} />

                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {editingStationId ? 'Edit Station' : 'New Station'}
                            </Text>
                            <TouchableOpacity onPress={hideFormModal} style={styles.closeButton} activeOpacity={0.7}>
                                <X size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            showsVerticalScrollIndicator={false}
                        >
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

                            {/* Location - Simplified */}
                            <View style={styles.formSection}>
                                <View style={styles.sectionTitleRow}>
                                    <Text style={styles.sectionTitle}>Location</Text>
                                    {isLocationLocked && (
                                        <View style={styles.lockedBadge}>
                                            <Lock size={12} color="#4CAF50" />
                                            <Text style={styles.lockedBadgeText}>Locked</Text>
                                        </View>
                                    )}
                                </View>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Search Address</Text>
                                    <View style={styles.searchRow}>
                                        <TextInput
                                            style={[styles.input, { flex: 1 }, isLocationLocked && styles.disabledInput]}
                                            placeholder={isLocationLocked ? "Location locked" : "Search city or area..."}
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
                                                <Search size={20} color="#ffffff" />
                                            )}
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                {isLocationLocked ? (
                                    <View style={styles.locationLockedCard}>
                                        <View style={styles.locationLockedHeader}>
                                            <View style={styles.locationLockedIcon}>
                                                <MapPin size={20} color="#4CAF50" />
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
                                                <Map size={16} color="#4CAF50" />
                                                <Text style={styles.changeMapButtonText}>Adjust Pin</Text>
                                            </TouchableOpacity>
                                            <TouchableOpacity
                                                style={styles.unlockButton}
                                                onPress={handleUnlockLocation}
                                                activeOpacity={0.8}
                                            >
                                                <Unlock size={16} color="#64748b" />
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
                                                colors={['#4CAF50', '#388E3C']}
                                                style={styles.mapTriggerGradient}
                                            >
                                                <Map size={20} color="#ffffff" />
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
                                                <ActivityIndicator size="small" color="#4CAF50" />
                                            ) : (
                                                <Locate size={20} color="#4CAF50" />
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

                            {/* Hardware Specs - Simplified */}
                            <View style={styles.formSection}>
                                <Text style={styles.sectionTitle}>Hardware Specs</Text>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Charger Level</Text>
                                    <View style={styles.chipGrid}>
                                        {[
                                            'Level 1 (Slow AC)',
                                            'Level 2 (Faster AC)',
                                            'DC Fast Charger (Super-fast DC)',
                                        ].map((lvl) => (
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

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Supported Plugs / Connectors</Text>
                                    <View style={styles.chipGrid}>
                                        {['CCS2', 'Type 2', 'CHAdeMO', 'GB/T'].map((conn) => {
                                            const isSelected = form.connectors?.includes(conn);
                                            return (
                                                <TouchableOpacity
                                                    key={conn}
                                                    style={[styles.chip, isSelected && styles.chipActive]}
                                                    onPress={() => toggleConnector(conn)}
                                                    activeOpacity={0.7}
                                                >
                                                    <Text style={[styles.chipText, isSelected && styles.chipTextActive]}>
                                                        {isSelected ? '✓ ' : ''}{conn}
                                                    </Text>
                                                </TouchableOpacity>
                                            );
                                        })}
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

                            {/* Pricing - Simplified */}
                            <View style={styles.formSection}>
                                <Text style={styles.sectionTitle}>Pricing</Text>
                                <View style={styles.chipGrid}>
                                    {[
                                        { id: 'per_kwh', label: '/ kWh' },
                                        { id: 'per_hour', label: '/ Hour' },
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
                                            Rate (₹{form.pricingType === 'per_kwh' ? '/kWh' : '/hr'})
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

                            {/* Operating Hours - Simplified */}
                            <View style={styles.formSection}>
                                <Text style={styles.sectionTitle}>Operating Hours</Text>

                                <View style={styles.inputGroup}>
                                    <Text style={styles.label}>Schedule</Text>
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
                                    colors={['#4CAF50', '#388E3C']}
                                    style={styles.submitGradient}
                                >
                                    {isSubmitting ? (
                                        <ActivityIndicator color="#ffffff" size="small" />
                                    ) : (
                                        <>
                                            <Check size={24} color="#ffffff" />
                                            <Text style={styles.submitButtonText}>
                                                {editingStationId ? 'Save Changes' : 'List Station'}
                                            </Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        </ScrollView>
                    </Animated.View>
                </View>
            </Modal>

            {/* Map Picker Modal - Simplified */}
            <Modal
                visible={showMapPickerModal}
                transparent={true}
                animationType="none"
                onRequestClose={hideMapPicker}
                statusBarTranslucent={true}
            >
                <KeyboardAvoidingView
                    style={{ flex: 1 }}
                    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                >
                    <View style={styles.modalOverlay}>
                        <TouchableOpacity
                            style={StyleSheet.absoluteFillObject}
                            activeOpacity={1}
                            onPress={hideMapPicker}
                        />
                        <Animated.View
                            style={[
                                styles.mapModalContainer,
                                { transform: [{ translateY: mapModalSlideAnim }] }
                            ]}
                        >
                        <View style={styles.modalHandle} />

                        <View style={styles.mapModalHeader}>
                            <Text style={styles.mapModalTitle}>Set Location</Text>
                            <TouchableOpacity onPress={hideMapPicker} style={styles.closeButton} activeOpacity={0.7}>
                                <X size={24} color="#64748b" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.mapPickerSearchContainer}>
                            <View style={styles.searchRow}>
                                <TextInput
                                    style={[styles.input, { flex: 1, backgroundColor: '#ffffff' }]}
                                    placeholder="Search city or area..."
                                    placeholderTextColor="#94a3b8"
                                    value={modalSearchText}
                                    onChangeText={handleSearchTextChange}
                                    onSubmitEditing={() => {
                                        if (suggestions.length > 0) {
                                            handleSelectSuggestion(suggestions[0]);
                                        }
                                    }}
                                />
                                <TouchableOpacity
                                    style={styles.searchButton}
                                    onPress={() => {
                                        if (suggestions.length > 0) {
                                            handleSelectSuggestion(suggestions[0]);
                                        }
                                    }}
                                    disabled={isSearchingModal}
                                    activeOpacity={0.8}
                                >
                                    {isSearchingModal ? (
                                        <ActivityIndicator size="small" color="#ffffff" />
                                    ) : (
                                        <Search size={20} color="#ffffff" />
                                    )}
                                </TouchableOpacity>
                            </View>

                            {suggestions.length > 0 && (
                                <ScrollView
                                    style={styles.suggestionsListContainer}
                                    keyboardShouldPersistTaps="handled"
                                    nestedScrollEnabled={true}
                                >
                                    {suggestions.map((item, idx) => (
                                        <TouchableOpacity
                                            key={item.placeId || idx}
                                            style={styles.suggestionRow}
                                            onPress={() => handleSelectSuggestion(item)}
                                            activeOpacity={0.7}
                                        >
                                            <Ionicons name="location-sharp" size={18} color="#10b981" style={{ marginRight: 10 }} />
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.suggestionMainText} numberOfLines={1}>
                                                    {item.mainText || item.description}
                                                </Text>
                                                {item.secondaryText ? (
                                                    <Text style={styles.suggestionSecondaryText} numberOfLines={1}>
                                                        {item.secondaryText}
                                                    </Text>
                                                ) : null}
                                            </View>
                                        </TouchableOpacity>
                                    ))}
                                </ScrollView>
                            )}
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
                                        <View style={styles.teardropMarkerContainer}>
                                            <View style={styles.teardropPinShell}>
                                                <View style={styles.teardropInnerCircle}>
                                                    <Ionicons name="flash" size={14} color="#ffffff" />
                                                </View>
                                            </View>
                                            <View style={styles.teardropPointerTip} />
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
                                              background: #4CAF50;
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
                                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="40" viewBox="0 0 32 40">
                                              <path d="M16 0 C7 0 0 7 0 16 C0 25 13 38 16 40 C19 38 32 25 32 16 C32 7 25 0 16 0 Z" fill="#ffffff" stroke="#cbd5e1" stroke-width="1"/>
                                              <circle cx="16" cy="15" r="11" fill="#ef4444"/>
                                              <path d="M17 7 L10 18 L15 18 L14 24 L22 13 L17 13 Z" fill="#ffffff"/>
                                            </svg>
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
                                    colors={['#4CAF50', '#388E3C']}
                                    style={styles.applyLocationGradient}
                                >
                                    <Check size={22} color="#ffffff" />
                                    <Text style={styles.applyLocationButtonText}>Apply Location</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f8fafc' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: Platform.OS === 'android' ? 44 : 20,
        paddingHorizontal: 16,
        paddingBottom: 12,
        backgroundColor: '#ffffff',
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f8fafc',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    headerTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
    headerSubtitle: { fontSize: 12, color: '#64748b', marginTop: 1 },
    addNavButton: { borderRadius: 16, overflow: 'hidden' },
    addNavGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 6,
        gap: 4,
    },
    addNavButtonText: { color: '#ffffff', fontSize: 11, fontWeight: '700' },
    centerLoading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    scrollContent: { padding: 16, gap: 14, paddingBottom: 30 },
    partnerInfoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        padding: 14,
        borderRadius: 18,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        gap: 12,
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    verifiedPartnerCard: {
        backgroundColor: '#F4FBF4',
        borderColor: '#C8E6C9',
        shadowColor: '#4CAF50',
        shadowOpacity: 0.1,
    },
    partnerInfoIcon: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 4,
    },
    verifiedHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    verifiedChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
        backgroundColor: '#d1fae5',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#6ee7b7',
    },
    verifiedChipText: { fontSize: 9, fontWeight: '800', color: '#047857' },
    partnerInfoTitle: { fontSize: 14, fontWeight: '800', color: '#0f172a' },
    partnerInfoSubtitle: { fontSize: 11, color: '#64748b', marginTop: 1 },
    stationCountBadge: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#C8E6C9',
    },
    stationCountText: { fontSize: 11, fontWeight: '800', color: '#4CAF50' },
    sectionCard: {
        backgroundColor: '#ffffff',
        borderRadius: 18,
        padding: 16,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        gap: 12,
        shadowColor: '#0f172a',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 2,
    },
    sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    sectionTitle: { fontSize: 15, fontWeight: '800', color: '#0f172a' },
    emptyCard: { alignItems: 'center', paddingVertical: 24, gap: 8 },
    emptyIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#f8fafc',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: '#334155' },
    emptySub: { fontSize: 12, color: '#64748b', textAlign: 'center', paddingHorizontal: 16 },
    emptyAddButton: { borderRadius: 16, overflow: 'hidden', marginTop: 6 },
    emptyAddGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 10,
        gap: 6,
    },
    emptyAddButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
    stationItemCard: {
        backgroundColor: '#f8fafc',
        borderRadius: 14,
        padding: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        gap: 8,
        marginBottom: 8,
    },
    stationItemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    stationItemName: { fontSize: 14, fontWeight: '700', color: '#0f172a' },
    stationItemAddress: { fontSize: 11, color: '#64748b', marginTop: 1 },
    statusTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    statusAvail: { backgroundColor: '#ecfdf5' },
    statusMaint: { backgroundColor: '#fef3c7' },
    statusTagText: { fontSize: 10, fontWeight: '700', color: '#059669' },
    stationMetaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        backgroundColor: '#ffffff',
        padding: 8,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    metaChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
    metaValue: { fontSize: 11, fontWeight: '700', color: '#1e293b' },
    stationActionRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 2 },
    editButton: { borderRadius: 10, overflow: 'hidden' },
    editGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 5,
        gap: 4,
    },
    editButtonText: { fontSize: 11, fontWeight: '700', color: '#4CAF50' },
    deleteButton: { padding: 4 },
    modalOverlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.5)', justifyContent: 'flex-end' },
    modalContainer: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 20,
        paddingBottom: 28,
        paddingTop: 6,
        maxHeight: height * 0.9,
    },
    modalHandle: {
        width: 36,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#e2e8f0',
        alignSelf: 'center',
        marginBottom: 12,
    },
    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
    closeButton: { padding: 4 },
    formSection: { marginBottom: 16, gap: 12 },
    sectionTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    inputGroup: { gap: 4 },
    label: { fontSize: 11, fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: 0.3 },
    input: {
        backgroundColor: '#f8fafc',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        paddingHorizontal: 12,
        height: 42,
        fontSize: 13,
        color: '#0f172a',
    },
    rowTwoInputs: { flexDirection: 'row', gap: 10 },
    searchRow: { flexDirection: 'row', gap: 6 },
    searchButton: { backgroundColor: '#4CAF50', width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    disabledSearchButton: { backgroundColor: '#94a3b8' },
    disabledInput: { backgroundColor: '#f1f5f9', borderColor: '#cbd5e1', color: '#64748b' },
    chipGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    chip: {
        backgroundColor: '#f8fafc',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    chipActive: { backgroundColor: '#E8F5E9', borderColor: '#4CAF50' },
    chipText: { fontSize: 11, fontWeight: '600', color: '#64748b' },
    chipTextActive: { color: '#4CAF50', fontWeight: '700' },
    lockedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#A5D6A7',
    },
    lockedBadgeText: { fontSize: 10, fontWeight: '700', color: '#4CAF50' },
    locationLockedCard: {
        backgroundColor: '#E8F5E9',
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#A5D6A7',
        padding: 12,
        gap: 10,
    },
    locationLockedHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    locationLockedIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#A5D6A7',
    },
    locationLockedTitle: { fontSize: 12, fontWeight: '800', color: '#2E7D32' },
    locationLockedAddress: { fontSize: 11, color: '#388E3C', fontWeight: '600', marginTop: 1 },
    locationActions: { flexDirection: 'row', gap: 8 },
    changeMapButton: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#4CAF50',
        paddingVertical: 8,
        borderRadius: 10,
    },
    changeMapButtonText: { fontSize: 11, fontWeight: '700', color: '#4CAF50' },
    unlockButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        backgroundColor: '#ffffff',
        borderWidth: 1,
        borderColor: '#cbd5e1',
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 10,
    },
    unlockButtonText: { fontSize: 11, fontWeight: '600', color: '#64748b' },
    mapTriggerButton: { borderRadius: 12, overflow: 'hidden' },
    mapTriggerGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 6,
    },
    mapTriggerButtonText: { color: '#ffffff', fontSize: 13, fontWeight: '700' },
    gpsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#E8F5E9',
        borderWidth: 1,
        borderColor: '#A5D6A7',
        paddingVertical: 10,
        borderRadius: 12,
        gap: 6,
    },
    gpsButtonText: { color: '#4CAF50', fontSize: 12, fontWeight: '700' },
    submitButton: { borderRadius: 20, overflow: 'hidden', marginTop: 4, marginBottom: 16 },
    submitButtonDisabled: { opacity: 0.7 },
    submitGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 6,
    },
    submitButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '800', letterSpacing: 0.3 },
    mapModalContainer: {
        backgroundColor: '#ffffff',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 6,
        flex: 1,
        maxHeight: height * 0.9,
    },
    mapModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 6 },
    mapModalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
    mapPickerSearchContainer: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        backgroundColor: '#f8fafc',
        borderBottomWidth: 1,
        borderBottomColor: '#e2e8f0',
        zIndex: 100,
    },
    suggestionsListContainer: {
        maxHeight: 180,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        marginTop: 8,
        borderWidth: 1,
        borderColor: '#e2e8f0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 6,
    },
    suggestionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#f1f5f9',
    },
    suggestionMainText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#0f172a',
    },
    suggestionSecondaryText: {
        fontSize: 11,
        color: '#64748b',
        marginTop: 1,
    },
    mapPickerMapArea: { flex: 1, backgroundColor: '#e2e8f0' },
    centerPinOverlay: {
        position: 'absolute',
        top: '50%',
        left: '50%',
        marginLeft: -16,
        marginTop: -38,
        alignItems: 'center',
        justifyContent: 'center',
    },
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
        shadowOpacity: 0.2,
        shadowRadius: 4,
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
    mapPickerBottomCard: {
        backgroundColor: '#ffffff',
        padding: 14,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        gap: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
        elevation: 6,
    },
    pinAddressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#f8fafc',
        padding: 10,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#e2e8f0',
    },
    pinAddressTitle: { fontSize: 13, fontWeight: '700', color: '#0f172a' },
    pinCoordsSub: { fontSize: 11, color: '#64748b', marginTop: 1 },
    applyLocationButton: { borderRadius: 14, overflow: 'hidden' },
    applyLocationGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        gap: 6,
    },
    applyLocationButtonText: { color: '#ffffff', fontSize: 15, fontWeight: '800' },
});
