import React, { useState, useEffect, useCallback } from 'react';
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
    Modal,
    Share,
} from 'react-native';
import { router, useRouter, useFocusEffect } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import bookingService from '../../services/booking.service.js';

function BookingHistoryScreen() {
    const [bookings, setBookings] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [filter, setFilter] = useState('All');

    // Receipt Modal state
    const [selectedReceipt, setSelectedReceipt] = useState(null);
    const [showReceiptModal, setShowReceiptModal] = useState(false);

    useEffect(() => {
        fetchBookings();
    }, []);

    useFocusEffect(
        useCallback(() => {
            fetchBookings();
        }, [])
    );

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

    const handleOpenReceipt = (booking) => {
        setSelectedReceipt(booking);
        setShowReceiptModal(true);
    };

    const handleCloseReceipt = () => {
        setShowReceiptModal(false);
        setSelectedReceipt(null);
    };

    const handleShareReceipt = async () => {
        if (!selectedReceipt) return;
        const stName = selectedReceipt.stationName || selectedReceipt.station?.stationName || 'EV Charging Station';
        const operator = selectedReceipt.operatorBrand || selectedReceipt.station?.operatorBrand || 'Independent';
        const dateStr = selectedReceipt.slotDate ? `${selectedReceipt.slotDate} (${selectedReceipt.slotTime})` : new Date(selectedReceipt.createdAt).toLocaleDateString();
        const orderId = selectedReceipt.razorpayOrderId || selectedReceipt.razorpayPaymentId || selectedReceipt._id;

        const receiptText = `ELECTRICALLY EV CHARGING RECEIPT
-----------------------------------
Station: ${stName} (${operator})
Slot: ${dateStr}
Duration: ${selectedReceipt.durationHours || 1} Hour(s)
Connector: ${selectedReceipt.connectorType || 'CCS2'}
Total Amount Paid: ₹${selectedReceipt.amount || 0}
Payment Status: ${selectedReceipt.paymentStatus || 'Paid'} (PAID VIA RAZORPAY)
Transaction ID: ${orderId}
-----------------------------------
Thank you for charging with Electrically!`;

        try {
            await Share.share({
                message: receiptText,
                title: 'EV Charging Receipt',
            });
        } catch (err) {
            console.warn('Share error:', err);
        }
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
                return { bg: '#E8F5E9', text: '#4CAF50', border: '#C8E6C9', icon: 'checkmark-circle' };
            case 'Completed':
                return { bg: '#E3F2FD', text: '#1976D2', border: '#BBDEFB', icon: 'checkmark-done-circle' };
            case 'Cancelled':
            case 'Failed':
                return { bg: '#FFEBEE', text: '#D32F2F', border: '#FFCDD2', icon: 'close-circle' };
            default:
                return { bg: '#F5F5F5', text: '#757575', border: '#E0E0E0', icon: 'time-circle' };
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
                    <LinearGradient
                        colors={['#4CAF50', '#43A047']}
                        style={styles.stationIconContainer}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <Ionicons name="flash" size={20} color="#FFFFFF" />
                    </LinearGradient>
                    <View style={styles.stationInfo}>
                        <Text style={styles.stationName} numberOfLines={1}>{stName}</Text>
                        <Text style={styles.stationLocation} numberOfLines={1}>{operator}</Text>
                    </View>
                    <View
                        style={[
                            styles.statusBadge,
                            { backgroundColor: statusStyle.bg, borderColor: statusStyle.border },
                        ]}
                    >
                        <Ionicons name={statusStyle.icon} size={12} color={statusStyle.text} />
                        <Text style={[styles.statusText, { color: statusStyle.text }]}>
                            {item.status || 'Confirmed'}
                        </Text>
                    </View>
                </View>

                <View style={styles.cardStatsGrid}>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Date & Slot</Text>
                        <Text style={styles.statValue} numberOfLines={1}>{displayDate}</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Duration</Text>
                        <Text style={styles.statValue}>{item.durationHours || 1} hr</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Amount</Text>
                        <Text style={[styles.statValue, { color: '#4CAF50', fontWeight: '800' }]}>
                            ₹{item.amount || 0}
                        </Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Connector</Text>
                        <Text style={styles.statValue}>{item.connectorType || 'CCS2'}</Text>
                    </View>
                </View>

                <View style={styles.cardFooter}>
                    <Text style={styles.bookingId}>ID: {item.razorpayOrderId ? item.razorpayOrderId.slice(-8) : item._id?.slice(-6)}</Text>
                    <TouchableOpacity 
                        style={styles.receiptButton} 
                        onPress={() => handleOpenReceipt(item)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="receipt-outline" size={14} color="#4CAF50" />
                        <Text style={styles.receiptButtonText}>Receipt</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

            {/* Header - Compact */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>Bookings</Text>
                    <Text style={styles.subtitle}>Your charging history</Text>
                </View>    
            </View>

            {/* Filter Chips - Compact */}
            <View style={styles.filterRow}>
                {['All', 'Confirmed', 'Completed', 'Cancelled'].map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.filterChip, filter === tab && styles.filterChipActive]}
                        onPress={() => setFilter(tab)}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.filterText, filter === tab && styles.filterTextActive]}>
                            {tab}
                        </Text>
                        {filter === tab && (
                            <View style={styles.filterDot} />
                        )}
                    </TouchableOpacity>
                ))}
            </View>

            {/* Bookings List */}
            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                </View>
            ) : (
                <FlatList
                    data={filteredBookings}
                    keyExtractor={(item) => item._id || item.id}
                    renderItem={renderBookingItem}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl 
                            refreshing={isRefreshing} 
                            onRefresh={handleRefresh} 
                            colors={['#4CAF50']}
                            tintColor="#4CAF50"
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <View style={styles.emptyIconContainer}>
                                <Ionicons name="calendar-outline" size={48} color="#CBD5E1" />
                            </View>
                            <Text style={styles.emptyTitle}>No bookings yet</Text>
                            <Text style={styles.emptySubtitle}>
                                {filter === 'All' ? 'Your charging history will appear here' : `No ${filter.toLowerCase()} bookings found`}
                            </Text>
                            <TouchableOpacity onPress={() => router.push('/(tabs)/home')} style={styles.exploreButton} activeOpacity={0.8}>
                                <LinearGradient
                                    colors={['#4CAF50', '#43A047']}
                                    style={styles.exploreGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    <Ionicons name="map-outline" size={18} color="#FFFFFF" />
                                    <Text style={styles.exploreButtonText}>Find Stations</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}

            {/* Digital Receipt Modal */}
            <Modal
                visible={showReceiptModal}
                transparent={true}
                animationType="fade"
                onRequestClose={handleCloseReceipt}
            >
                <TouchableOpacity style={styles.receiptOverlay} activeOpacity={1} onPress={handleCloseReceipt}>
                    <View style={styles.receiptModalCard} onStartShouldSetResponder={() => true}>
                        <View style={styles.receiptHeaderRow}>
                            <View style={styles.receiptBrandBadge}>
                                <Ionicons name="flash" size={16} color="#FFFFFF" />
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.receiptTitle}>Digital Tax Receipt</Text>
                                <Text style={styles.receiptSub}>Official EV Charging Invoice</Text>
                            </View>
                            <TouchableOpacity onPress={handleCloseReceipt} style={styles.receiptCloseBtn}>
                                <Ionicons name="close" size={20} color="#64748B" />
                            </TouchableOpacity>
                        </View>

                        {selectedReceipt && (
                            <View style={styles.receiptBody}>
                                <View style={styles.receiptPaidBadge}>
                                    <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                                    <Text style={styles.receiptPaidText}>PAID & VERIFIED</Text>
                                </View>

                                <View style={styles.receiptDivider} />

                                <View style={styles.receiptRow}>
                                    <Text style={styles.receiptLabel}>Station</Text>
                                    <Text style={styles.receiptValBold} numberOfLines={1}>
                                        {selectedReceipt.stationName || selectedReceipt.station?.stationName || 'EV Charging Station'}
                                    </Text>
                                </View>

                                <View style={styles.receiptRow}>
                                    <Text style={styles.receiptLabel}>Brand</Text>
                                    <Text style={styles.receiptVal}>
                                        {selectedReceipt.operatorBrand || selectedReceipt.station?.operatorBrand || 'Independent'}
                                    </Text>
                                </View>

                                <View style={styles.receiptRow}>
                                    <Text style={styles.receiptLabel}>Date & Time</Text>
                                    <Text style={styles.receiptVal}>
                                        {selectedReceipt.slotDate ? `${selectedReceipt.slotDate} (${selectedReceipt.slotTime})` : new Date(selectedReceipt.createdAt).toLocaleDateString()}
                                    </Text>
                                </View>

                                <View style={styles.receiptRow}>
                                    <Text style={styles.receiptLabel}>Duration</Text>
                                    <Text style={styles.receiptVal}>{selectedReceipt.durationHours || 1} Hour(s)</Text>
                                </View>

                                <View style={styles.receiptRow}>
                                    <Text style={styles.receiptLabel}>Connector</Text>
                                    <Text style={styles.receiptVal}> {selectedReceipt.connectorType || 'CCS2'}</Text>
                                </View>

                                <View style={styles.receiptRow}>
                                    <Text style={styles.receiptLabel}>Transaction ID</Text>
                                    <Text style={styles.receiptValMono} numberOfLines={1}>
                                        {selectedReceipt.razorpayOrderId || selectedReceipt.razorpayPaymentId || selectedReceipt._id}
                                    </Text>
                                </View>

                                <View style={styles.receiptDashedLine} />

                                <View style={styles.receiptTotalRow}>
                                    <Text style={styles.receiptTotalLabel}>Total Paid</Text>
                                    <Text style={styles.receiptTotalAmount}>₹{selectedReceipt.amount || 0}</Text>
                                </View>

                                <TouchableOpacity style={styles.shareReceiptBtn} onPress={handleShareReceipt} activeOpacity={0.85}>
                                    <LinearGradient
                                        colors={['#4CAF50', '#43A047']}
                                        style={styles.shareGradient}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 0 }}
                                    >
                                        <Ionicons name="share-outline" size={18} color="#FFFFFF" />
                                        <Text style={styles.shareBtnText}>Share / Download Receipt</Text>
                                    </LinearGradient>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: Platform.OS === 'android' ? 36 : 12,
        paddingHorizontal: 20,
        paddingBottom: 12,
    },
    title: {
        fontSize: 24,
        fontWeight: '900',
        color: '#1A2332',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 13,
        color: '#64748B',
        marginTop: 2,
        fontWeight: '400',
    },
    filterButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E8EDF2',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    filterRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        marginBottom: 12,
        gap: 8,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 14,
        paddingVertical: 7,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.02,
        shadowRadius: 4,
        elevation: 1,
    },
    filterChipActive: {
        backgroundColor: '#E8F5E9',
        borderColor: '#4CAF50',
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 2,
    },
    filterText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
    },
    filterTextActive: {
        color: '#4CAF50',
        fontWeight: '700',
    },
    filterDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#4CAF50',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 110,
        gap: 12,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    bookingCard: {
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        padding: 14,
        borderWidth: 1,
        borderColor: '#E8EDF2',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
        gap: 10,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    stationIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 3,
    },
    stationInfo: {
        flex: 1,
    },
    stationName: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1A2332',
    },
    stationLocation: {
        fontSize: 11,
        color: '#94A3B8',
        marginTop: 1,
        fontWeight: '500',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    statusText: {
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'capitalize',
    },
    cardStatsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        paddingVertical: 8,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    statBox: {
        width: '48%',
    },
    statLabel: {
        fontSize: 10,
        color: '#94A3B8',
        textTransform: 'uppercase',
        fontWeight: '600',
        letterSpacing: 0.3,
    },
    statValue: {
        fontSize: 12,
        fontWeight: '600',
        color: '#1A2332',
        marginTop: 1,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    bookingId: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '500',
    },
    receiptButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#F8FAFC',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E8EDF2',
    },
    receiptButtonText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#4CAF50',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
        gap: 8,
    },
    emptyIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1A2332',
    },
    emptySubtitle: {
        fontSize: 13,
        color: '#94A3B8',
        textAlign: 'center',
        marginBottom: 8,
    },
    exploreButton: {
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
        elevation: 4,
    },
    exploreGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 20,
        paddingVertical: 10,
    },
    exploreButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },

    // Receipt Modal Styles
    receiptOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    receiptModalCard: {
        width: '100%',
        backgroundColor: '#FFFFFF',
        borderRadius: 24,
        padding: 20,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 20,
    },
    receiptHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 16,
    },
    receiptBrandBadge: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#4CAF50',
        justifyContent: 'center',
        alignItems: 'center',
    },
    receiptTitle: {
        fontSize: 18,
        fontWeight: '800',
        color: '#1A2332',
    },
    receiptSub: {
        fontSize: 12,
        color: '#64748B',
    },
    receiptCloseBtn: {
        padding: 6,
        backgroundColor: '#F1F5F9',
        borderRadius: 16,
    },
    receiptBody: {
        gap: 10,
    },
    receiptPaidBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: '#E8F5E9',
        paddingVertical: 8,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#C8E6C9',
    },
    receiptPaidText: {
        fontSize: 12,
        fontWeight: '800',
        color: '#4CAF50',
        letterSpacing: 0.5,
    },
    receiptDivider: {
        height: 1,
        backgroundColor: '#E2E8F0',
        marginVertical: 4,
    },
    receiptRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    receiptLabel: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500',
    },
    receiptVal: {
        fontSize: 12,
        color: '#1A2332',
        fontWeight: '600',
    },
    receiptValBold: {
        fontSize: 13,
        color: '#1A2332',
        fontWeight: '800',
        maxWidth: 200,
    },
    receiptValMono: {
        fontSize: 11,
        color: '#64748B',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        maxWidth: 180,
    },
    receiptDashedLine: {
        height: 1,
        borderWidth: 1,
        borderColor: '#CBD5E1',
        borderStyle: 'dashed',
        marginVertical: 6,
    },
    receiptTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 4,
    },
    receiptTotalLabel: {
        fontSize: 14,
        fontWeight: '800',
        color: '#1A2332',
    },
    receiptTotalAmount: {
        fontSize: 22,
        fontWeight: '900',
        color: '#4CAF50',
    },
    shareReceiptBtn: {
        marginTop: 10,
        borderRadius: 14,
        overflow: 'hidden',
    },
    shareGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingVertical: 12,
    },
    shareBtnText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '700',
    },
});

export default BookingHistoryScreen;