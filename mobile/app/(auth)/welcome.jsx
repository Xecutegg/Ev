import { View, Text, TouchableOpacity, StyleSheet, Animated, Dimensions, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path, Circle, G, Defs, LinearGradient as SvgGradient, Stop } from 'react-native-svg';

const { width, height } = Dimensions.get('window');

// Custom SVG Icons
const MapPinIcon = ({ size = 24, color = '#4CAF50' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path 
      d="M12 22C12 22 20 16 20 10C20 5.58172 16.4183 2 12 2C7.58172 2 4 5.58172 4 10C4 16 12 22 12 22Z" 
      stroke={color} 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <Circle cx="12" cy="10" r="3" fill={color} stroke={color} strokeWidth="2" />
  </Svg>
);

const ClockIcon = ({ size = 24, color = '#7B61FF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth="2" />
    <Path d="M12 6V12L16 14" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const ShieldIcon = ({ size = 24, color = '#FF6B6B' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path 
      d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" 
      stroke={color} 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
    <Path d="M9 12L11 14L15 10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

const LightningIcon = ({ size = 24, color = '#FFB800' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path 
      d="M13 2L4 14H12L11 22L20 10H12L13 2Z" 
      fill={color} 
      stroke={color} 
      strokeWidth="1.5" 
      strokeLinejoin="round"
    />
  </Svg>
);

const ArrowRightIcon = ({ size = 24, color = '#FFFFFF' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path 
      d="M5 12H19M19 12L12 5M19 12L12 19" 
      stroke={color} 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </Svg>
);

const SparkleIcon = ({ size = 20 }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path 
      d="M12 3L13.5 8.5L19 10L13.5 11.5L12 17L10.5 11.5L5 10L10.5 8.5L12 3Z" 
      fill="#FFB800" 
      opacity="0.6"
    />
    <Path 
      d="M20 7L20.5 9L22.5 9.5L20.5 10L20 12L19.5 10L17.5 9.5L19.5 9L20 7Z" 
      fill="#FFB800" 
      opacity="0.4"
    />
    <Path 
      d="M4 18L4.5 20L6.5 20.5L4.5 21L4 23L3.5 21L1.5 20.5L3.5 20L4 18Z" 
      fill="#FF6B6B" 
      opacity="0.4"
    />
  </Svg>
);

const CheckIcon = ({ size = 16, color = '#4CAF50' }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <Path 
      d="M20 6L9 17L4 12" 
      stroke={color} 
      strokeWidth="3" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    />
  </Svg>
);

export default function WelcomeScreen() {
    const router = useRouter();
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const slideAnim = useRef(new Animated.Value(40)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;
    const bounceAnim = useRef(new Animated.Value(0)).current;

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
                tension: 50,
                friction: 7,
                useNativeDriver: true,
            }),
            Animated.loop(
                Animated.sequence([
                    Animated.timing(bounceAnim, {
                        toValue: 1,
                        duration: 2000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(bounceAnim, {
                        toValue: 0,
                        duration: 2000,
                        useNativeDriver: true,
                    }),
                ])
            ),
        ]).start();
    }, []);

    const bounceInterpolate = bounceAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, -8, 0],
    });

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

            {/* Background Elements */}
            <View style={styles.bgGradient1} />
            <View style={styles.bgGradient2} />
            <View style={styles.bgGradient3} />
            
            {/* Floating Elements */}
            <View style={styles.floatingDot1} />
            <View style={styles.floatingDot2} />
            <View style={styles.floatingDot3} />
            <View style={styles.floatingDot4} />

            <Animated.View
                style={[
                    styles.content,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                {/* Logo Section */}
                <Animated.View style={[styles.logoSection, { transform: [{ scale: scaleAnim }] }]}>
                    <View style={styles.logoWrapper}>
                        <LinearGradient
                            colors={['#4CAF50', '#66BB6A', '#81C784']}
                            style={styles.logoGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                        >
                            <View style={styles.iconContainer}>
                                <LightningIcon size={48} color="#FFFFFF" />
                            </View>
                        </LinearGradient>
                        <Animated.View style={[styles.pulseRing, { transform: [{ scale: bounceInterpolate }] }]} />
                    </View>
                    <Text style={styles.brandTitle}>
                        Electrically
                    </Text>
                    <View style={styles.brandBadge}>
                        <CheckIcon size={14} color="#4CAF50" />
                        <Text style={styles.brandBadgeText}>Smart Charging</Text>
                    </View>
                </Animated.View>

                {/* Text Section */}
                <View style={styles.textSection}>
                    <Text style={styles.mainHeading}>
                        Power Up Your {'\n'}
                        <Text style={styles.gradientText}>EV Journey</Text>
                    </Text>
                    <Text style={styles.subtitleDescription}>
                        Find, book, and charge your electric vehicle at premium stations 
                        near you. Experience the future of sustainable mobility.
                    </Text>
                </View>

                {/* Feature Cards */}
                <View style={styles.featureGrid}>
                    {[
                        { 
                            icon: MapPinIcon, 
                            label: 'Live Tracking',
                            color: '#4CAF50',
                            bgColor: '#E8F5E9',
                            description: 'Find stations'
                        },
                        { 
                            icon: ClockIcon, 
                            label: 'Quick Booking',
                            color: '#7B61FF',
                            bgColor: '#F3F0FF',
                            description: 'Instant slots'
                        },
                        { 
                            icon: ShieldIcon, 
                            label: 'Safe Charging',
                            color: '#FF6B6B',
                            bgColor: '#FFEBEB',
                            description: 'Secure & fast'
                        },
                    ].map((feature, index) => (
                        <Animated.View 
                            key={index}
                            style={[
                                styles.featureCard,
                                { 
                                    opacity: fadeAnim,
                                    transform: [{ 
                                        translateY: fadeAnim.interpolate({
                                            inputRange: [0, 1],
                                            outputRange: [30 * (index + 1), 0]
                                        })
                                    }]
                                }
                            ]}
                        >
                            <View style={[styles.featureIconWrapper, { backgroundColor: feature.bgColor }]}>
                                <feature.icon size={22} color={feature.color} />
                            </View>
                            <Text style={styles.featureLabel}>{feature.label}</Text>
                            <Text style={styles.featureDescription}>{feature.description}</Text>
                        </Animated.View>
                    ))}
                </View>
            </Animated.View>

            {/* Footer */}
            <Animated.View
                style={[
                    styles.footer,
                    {
                        opacity: fadeAnim,
                        transform: [{ translateY: slideAnim }],
                    },
                ]}
            >
                <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={() => router.push('/(auth)/register')}
                    activeOpacity={0.85}
                >
                    <LinearGradient
                        colors={['#4CAF50', '#43A047', '#388E3C']}
                        style={styles.primaryGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Text style={styles.primaryButtonText}>Get Started</Text>
                        <View style={styles.arrowBadge}>
                            <ArrowRightIcon size={20} color="#FFFFFF" />
                        </View>
                    </LinearGradient>
                </TouchableOpacity>

                <View style={styles.dividerContainer}>
                    <View style={styles.divider} />
                    <Text style={styles.dividerText}>or</Text>
                    <View style={styles.divider} />
                </View>

                <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={() => router.push('/(auth)/login')}
                    activeOpacity={0.7}
                >
                    <Text style={styles.secondaryLinkText}>
                        Sign in to your account
                    </Text>
                    <View style={styles.secondaryArrow}>
                        <ArrowRightIcon size={16} color="#4CAF50" />
                    </View>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    bgGradient1: {
        position: 'absolute',
        top: -150,
        right: -100,
        width: 350,
        height: 350,
        borderRadius: 175,
        backgroundColor: 'rgba(76, 175, 80, 0.06)',
    },
    bgGradient2: {
        position: 'absolute',
        bottom: -100,
        left: -80,
        width: 280,
        height: 280,
        borderRadius: 140,
        backgroundColor: 'rgba(123, 97, 255, 0.05)',
    },
    bgGradient3: {
        position: 'absolute',
        top: '50%',
        right: -50,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(255, 107, 107, 0.04)',
    },
    floatingDot1: {
        position: 'absolute',
        top: 120,
        left: 30,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#4CAF50',
        opacity: 0.2,
    },
    floatingDot2: {
        position: 'absolute',
        top: 200,
        right: 40,
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: '#7B61FF',
        opacity: 0.15,
    },
    floatingDot3: {
        position: 'absolute',
        bottom: 250,
        left: 50,
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#FF6B6B',
        opacity: 0.2,
    },
    floatingDot4: {
        position: 'absolute',
        bottom: 180,
        right: 60,
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FFB800',
        opacity: 0.15,
    },
    content: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        paddingTop: 40,
    },
    logoSection: {
        alignItems: 'center',
        marginBottom: 28,
    },
    logoWrapper: {
        position: 'relative',
        marginBottom: 16,
    },
    logoGradient: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
    },
    iconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: 'center',
        alignItems: 'center',
    },
    pulseRing: {
        position: 'absolute',
        top: -8,
        left: -8,
        right: -8,
        bottom: -8,
        borderRadius: 58,
        borderWidth: 2,
        borderColor: '#4CAF50',
        opacity: 0.2,
    },
    brandTitle: {
        fontSize: 32,
        fontWeight: '900',
        color: '#1A2332',
        letterSpacing: -0.5,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    brandBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 6,
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    brandBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#4CAF50',
        letterSpacing: 0.5,
    },
    textSection: {
        alignItems: 'center',
        paddingHorizontal: 12,
        marginBottom: 28,
    },
    mainHeading: {
        fontSize: 30,
        fontWeight: '800',
        color: '#1A2332',
        textAlign: 'center',
        lineHeight: 38,
        letterSpacing: -0.5,
    },
    gradientText: {
        color: '#4CAF50',
    },
    subtitleDescription: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
        marginTop: 12,
        maxWidth: 320,
        fontWeight: '400',
    },
    featureGrid: {
        flexDirection: 'row',
        gap: 10,
        width: '100%',
        paddingHorizontal: 4,
    },
    featureCard: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 14,
        paddingHorizontal: 8,
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E8EDF2',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
        elevation: 2,
    },
    featureIconWrapper: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 6,
    },
    featureLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: '#1A2332',
        marginBottom: 2,
    },
    featureDescription: {
        fontSize: 9,
        color: '#94A3B8',
        fontWeight: '500',
    },
    footer: {
        paddingHorizontal: 24,
        paddingBottom: 32,
        gap: 12,
    },
    primaryButton: {
        height: 56,
        borderRadius: 28,
        overflow: 'hidden',
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 6,
    },
    primaryGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 24,
        gap: 10,
    },
    primaryButtonText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.5,
    },
    arrowBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    dividerContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingHorizontal: 20,
    },
    divider: {
        flex: 1,
        height: 1,
        backgroundColor: '#E2E8F0',
    },
    dividerText: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '500',
    },
    secondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        gap: 8,
        backgroundColor: '#F1F5F9',
        borderRadius: 28,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    secondaryLinkText: {
        fontSize: 15,
        color: '#1A2332',
        fontWeight: '600',
    },
    secondaryArrow: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#E8F5E9',
        justifyContent: 'center',
        alignItems: 'center',
    },
    trustSection: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginTop: 4,
    },
    trustItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    trustDot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#4CAF50',
        opacity: 0.5,
    },
    trustText: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '500',
    },
    trustDivider: {
        width: 1,
        height: 12,
        backgroundColor: '#E2E8F0',
    },
});