import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import Feather from '@expo/vector-icons/Feather';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
    const router = useRouter();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;
    const scaleAnim = useRef(new Animated.Value(0.9)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 900,
                useNativeDriver: true,
            }),
            Animated.timing(slideAnim, {
                toValue: 0,
                duration: 700,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 40,
                friction: 7,
                useNativeDriver: true,
            }),
        ]).start();
    }, []);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F4FBF4" />

            {/* Background Subtle Gradient Spheres */}
            <View style={styles.bgGlowTop} />
            <View style={styles.bgGlowBottom} />

            {/* Content */}
            <Animated.View
                style={[
                    styles.content,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                {/* Logo Badge */}
                <Animated.View style={[styles.logoSection, { transform: [{ scale: scaleAnim }] }]}>
                    <View style={styles.iconCircle}>
                        <View style={styles.iconInner}>
                            <Feather name="zap" size={40} color="#76C815" />
                        </View>
                    </View>
                    <Text style={styles.brandTitle}>osler<Text style={{ color: '#76C815' }}>.ev</Text></Text>
                </Animated.View>

                {/* Main Heading & Subtitle */}
                <View style={styles.textSection}>
                    <Text style={styles.mainHeading}>Smart EV Charging{'\n'}Made Simple</Text>
                    <Text style={styles.subtitleDescription}>
                        Locate nearby charging stations, reserve time slots in real time, and charge seamlessly with instant digital receipts.
                    </Text>
                </View>

                {/* Feature Chips */}
                <View style={styles.featureGrid}>
                    <View style={styles.featureCard}>
                        <View style={styles.featureIconBadge}>
                            <Feather name="map-pin" size={18} color="#76C815" />
                        </View>
                        <Text style={styles.featureLabel}>Live Map</Text>
                    </View>
                    <View style={styles.featureCard}>
                        <View style={styles.featureIconBadge}>
                            <Feather name="clock" size={18} color="#76C815" />
                        </View>
                        <Text style={styles.featureLabel}>Book Slot</Text>
                    </View>
                    <View style={styles.featureCard}>
                        <View style={styles.featureIconBadge}>
                            <Feather name="shield-check" size={18} color="#76C815" />
                        </View>
                        <Text style={styles.featureLabel}>Fast Charge</Text>
                    </View>
                </View>
            </Animated.View>

            {/* Actions Footer */}
            <Animated.View
                style={[
                    styles.footer,
                    {
                        opacity: fadeAnim,
                        transform: [{ scale: scaleAnim }],
                    },
                ]}
            >
                <TouchableOpacity
                    style={styles.primaryPillButton}
                    onPress={() => router.push('/(auth)/register')}
                    activeOpacity={0.88}
                >
                    <Text style={styles.primaryButtonText}>Get Started</Text>
                    <View style={styles.arrowBadge}>
                        <Feather name="arrow-right" size={18} color="#FFFFFF" />
                    </View>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.secondaryLinkButton}
                    onPress={() => router.push('/(auth)/login')}
                    activeOpacity={0.7}
                >
                    <Text style={styles.secondaryLinkText}>
                        I already have <Text style={styles.highlightText}>an account</Text>
                    </Text>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4FBF4',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 80,
        paddingBottom: 44,
    },
    bgGlowTop: {
        position: 'absolute',
        top: -120,
        left: width / 2 - 160,
        width: 320,
        height: 320,
        borderRadius: 160,
        backgroundColor: 'rgba(118, 200, 21, 0.08)',
    },
    bgGlowBottom: {
        position: 'absolute',
        bottom: -60,
        right: -80,
        width: 280,
        height: 280,
        borderRadius: 140,
        backgroundColor: 'rgba(118, 200, 21, 0.05)',
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: 28,
    },
    iconCircle: {
        width: 96,
        height: 96,
        borderRadius: 48,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#76C815',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
        elevation: 6,
        borderWidth: 1.5,
        borderColor: '#E6F4E2',
    },
    iconInner: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#F0F9ED',
        justifyContent: 'center',
        alignItems: 'center',
    },
    brandTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: '#1E293B',
        letterSpacing: -0.5,
        marginTop: 14,
    },
    textSection: {
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    mainHeading: {
        fontSize: 30,
        fontWeight: '800',
        color: '#1E293B',
        textAlign: 'center',
        lineHeight: 38,
        letterSpacing: -0.5,
    },
    subtitleDescription: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
        marginTop: 14,
        maxWidth: 320,
    },
    featureGrid: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 36,
    },
    featureCard: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 18,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: '#E8F3E5',
        shadowColor: '#102A00',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 1,
    },
    featureIconBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#F0F9ED',
        justifyContent: 'center',
        alignItems: 'center',
    },
    featureLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#334155',
    },
    footer: {
        gap: 16,
    },
    primaryPillButton: {
        backgroundColor: '#76C815',
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        shadowColor: '#76C815',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 14,
        elevation: 8,
    },
    primaryButtonText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF',
        marginRight: 8,
    },
    arrowBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    secondaryLinkButton: {
        alignItems: 'center',
        paddingVertical: 10,
    },
    secondaryLinkText: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
    },
    highlightText: {
        color: '#76C815',
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
});
