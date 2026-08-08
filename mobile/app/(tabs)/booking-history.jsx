import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    Platform,
    StatusBar,
    ActivityIndicator,
    RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';
import bookingService from '../../services/booking.service.js';

function BookingHistoryScreen() {
    const [bookings, setBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [filter, setFilter] = useState('All');

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        try {
            const res = await bookingService.getMyBookings();
            if (res.success && Array.isArray(res.data)) {
                setBookings(res.data);
            }
        } catch (_err) {
            console.warn('Failed to fetch bookings:', _err);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setIsRefreshing(true);
        fetchBookings();
    };

    const filteredBookings = bookings.filter((item) => {
        if (filter === 'All') return true;
        const status = item.status || 'Confirmed';
        return status.toLowerCase() === filter.toLowerCase();
    });

    const getStatusStyle = (status) => {
        switch (status) {
            case 'Confirmed':
            case 'Active':
                return { bg: '#F0F9ED', text: '#76C815', border: '#D4EFC3' };
            case 'Completed':
                return { bg: '#EFF6FF', text: '#2563EB', border: '#BFDBFE' };
            case 'Cancelled':
            case 'Failed':
                return { bg: '#FEF2F2', text: '#DC2626', border: '#FECACA' };
            default:
                return { bg: '#F8FAFC', text: '#64748B', border: '#E2E8F0' };
        }
    };

    const renderBookingItem = ({ item }) => {
        const statusStyle = getStatusStyle(item.status || 'Confirmed');
        const stName = item.stationName || item.station?.stationName || 'EV Charging Station';
        const operator = item.operatorBrand || item.station?.operatorBrand || 'Independent';
        const displayDate = item.slotDate ? `${item.slotDate} (${item.slotTime})` : new Date(item.createdAt).toLocaleDateString();

        return (
            <View style={styles.bookingCard}>
                <View style={styles.cardHeader}>
                    <View style={styles.stationIconContainer}>
                        <Feather name="zap" size={22} color="#76C815" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.stationName}>{stName}</Text>
                        <Text style={styles.stationLocation}>Brand: {operator}</Text>
                    </View>
                    <View
                        style={[
                            styles.statusBadge,
                            { backgroundColor: statusStyle.bg, borderColor: statusStyle.border },
                        ]}
                    >
                        <Text style={[styles.statusText, { color: statusStyle.text }]}>
                            {item.status || 'Confirmed'}
                        </Text>
                    </View>
                </View>

                <View style={styles.cardDivider} />

                <View style={styles.cardStatsGrid}>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Date & Slot</Text>
                        <Text style={styles.statValue}>{displayDate}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Duration</Text>
                        <Text style={styles.statValue}>{item.durationHours || 1} hr</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Payment</Text>
                        <Text style={[styles.statValue, { color: item.paymentStatus === 'Paid' ? '#76C815' : '#D97706' }]}>
                            {item.paymentStatus || 'Paid'}
                        </Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Total Paid</Text>
                        <Text style={[styles.statValue, { color: '#76C815', fontWeight: '800' }]}>
                            ₹{item.amount}
                        </Text>
                    </View>
                </View>

                <View style={styles.cardFooter}>
                    <Text style={styles.connectorText}>⚡ {item.connectorType || 'CCS2'}</Text>
                    <View style={styles.receiptButton}>
                        <Text style={styles.receiptButtonText}>ID: {item.razorpayOrderId ? item.razorpayOrderId.slice(-8) : item._id?.slice(-6)}</Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F4FBF4" />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Booking History</Text>
                    <Text style={styles.subtitle}>Your EV charging slot log</Text>
                </View>
            </View>

            {/* Filter Chips */}
            <View style={styles.filterRow}>
                {['All', 'Confirmed', 'Completed', 'Cancelled'].map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.filterChip, filter === tab && styles.filterChipActive]}
                        onPress={() => setFilter(tab)}
                    >
                        <Text style={[styles.filterText, filter === tab && styles.filterTextActive]}>
                            {tab}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            {/* Bookings List */}
            {isLoading ? (
                <View style={styles.emptyContainer}>
                    <ActivityIndicator size="large" color="#76C815" />
                </View>
            ) : (
                <FlatList
                    data={filteredBookings}
                    keyExtractor={(item) => item._id || item.id}
                    renderItem={renderBookingItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} colors={['#76C815']} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Feather name="clock" size={44} color="#94A3B8" />
                            <Text style={styles.emptyText}>No {filter} bookings found</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4FBF4',
    },
    header: {
        paddingTop: Platform.OS === 'android' ? 44 : 20,
        paddingHorizontal: 20,
        paddingBottom: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: '#1E293B',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 4,
    },
    filterRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 16,
        gap: 10,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#E2EFE0',
    },
    filterChipActive: {
        backgroundColor: '#F0F9ED',
        borderColor: '#76C815',
    },
    filterText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },
    filterTextActive: {
        color: '#76C815',
        fontWeight: '700',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 110,
        gap: 16,
    },
    bookingCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 22,
        padding: 18,
        borderWidth: 1.5,
        borderColor: '#E2EFE0',
        gap: 12,
        shadowColor: '#102A00',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    stationIconContainer: {
        width: 46,
        height: 46,
        borderRadius: 16,
        backgroundColor: '#F0F9ED',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#D4EFC3',
    },
    stationName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
    },
    stationLocation: {
        fontSize: 12,
        color: '#64748B',
        marginTop: 2,
    },
    statusBadge: {
        paddingHorizontal: 12,
        paddingVertical: 5,
        borderRadius: 14,
        borderWidth: 1,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    cardDivider: {
        height: 1,
        backgroundColor: '#F0F5EE',
    },
    cardStatsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    statBox: {
        width: '46%',
    },
    statLabel: {
        fontSize: 11,
        color: '#94A3B8',
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    statValue: {
        fontSize: 13,
        fontWeight: '600',
        color: '#1E293B',
        marginTop: 2,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 4,
    },
    connectorText: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
    },
    receiptButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    receiptButtonText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#76C815',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingVertical: 60,
        gap: 12,
    },
    emptyText: {
        fontSize: 15,
        color: '#94A3B8',
        fontWeight: '500',
    },
});

export default BookingHistoryScreen;
