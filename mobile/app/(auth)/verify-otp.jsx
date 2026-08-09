import { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Alert,
    ActivityIndicator,
    StatusBar,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useAuth } from '../../context/AuthContext.jsx';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60; // seconds

export default function VerifyOtpScreen() {
    const router = useRouter();
    const { email } = useLocalSearchParams();
    const { verifyOtp, resendOtp } = useAuth();

    const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN);
    const [canResend, setCanResend] = useState(false);

    const inputRefs = useRef([]);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const scaleAnim = useRef(new Animated.Value(0.95)).current;
    const shakeAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.parallel([
            Animated.timing(fadeAnim, {
                toValue: 1,
                duration: 600,
                useNativeDriver: true,
            }),
            Animated.spring(scaleAnim, {
                toValue: 1,
                tension: 50,
                friction: 8,
                useNativeDriver: true,
            }),
        ]).start();

        setTimeout(() => inputRefs.current[0]?.focus(), 400);
    }, []);

    useEffect(() => {
        if (resendTimer <= 0) {
            setCanResend(true);
            return;
        }

        const timer = setInterval(() => {
            setResendTimer((prev) => prev - 1);
        }, 1000);

        return () => clearInterval(timer);
    }, [resendTimer]);

    const shake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 12, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -12, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
    };

    const handleOtpChange = (value, index) => {
        if (value && !/^\d$/.test(value)) return;

        const newOtp = [...otp];
        newOtp[index] = value;
        setOtp(newOtp);

        if (value && index < OTP_LENGTH - 1) {
            inputRefs.current[index + 1]?.focus();
        }

        if (value && index === OTP_LENGTH - 1) {
            const fullOtp = newOtp.join('');
            if (fullOtp.length === OTP_LENGTH) {
                handleVerify(fullOtp);
            }
        }
    };

    const handleKeyPress = (e, index) => {
        if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
            const newOtp = [...otp];
            newOtp[index - 1] = '';
            setOtp(newOtp);
        }
    };

    const handleVerify = async (otpCode = null) => {
        const code = otpCode || otp.join('');
        if (code.length !== OTP_LENGTH) {
            Alert.alert('Error', 'Please enter the complete 6-digit code');
            shake();
            return;
        }

        setIsSubmitting(true);
        try {
            await verifyOtp(email, code);
            router.replace('/(tabs)/home');
        } catch (error) {
            const message =
                error.response?.data?.message ||
                error.message ||
                'Verification failed. Please try again.';
            Alert.alert('Verification Failed', message);
            shake();
            setOtp(Array(OTP_LENGTH).fill(''));
            inputRefs.current[0]?.focus();
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResend = async () => {
        if (!canResend) return;

        try {
            await resendOtp(email);
            setCanResend(false);
            setResendTimer(RESEND_COOLDOWN);
            Alert.alert('OTP Sent', 'A new verification code has been sent to your email');
        } catch (error) {
            const message =
                error.response?.data?.message ||
                error.message ||
                'Failed to resend OTP';
            Alert.alert('Error', message);
        }
    };

    const formatTimer = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <Animated.View
            style={[
                styles.container,
                {
                    opacity: fadeAnim,
                    transform: [{ scale: scaleAnim }],
                },
            ]}
        >
            <StatusBar barStyle="dark-content" backgroundColor="#F4FBF4" />

            {/* Back Button */}
            <View style={styles.topHeader}>
                <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
                    <Feather name="arrow-left" size={20} color="#1E293B" />
                </TouchableOpacity>
            </View>

            {/* Icon Banner */}
            <View style={styles.iconContainer}>
                <View style={styles.iconCircle}>
                    <View style={styles.iconInner}>
                        <Feather name="mail" size={36} color="#76C815" />
                    </View>
                </View>
            </View>

            {/* Title & Email Subtitle */}
            <Text style={styles.title}>Verify Your Email</Text>
            <Text style={styles.subtitle}>
                {"We've sent a 6-digit code to"}{'\n'}
                <Text style={styles.emailHighlight}>{email || 'your email'}</Text>
            </Text>

            {/* OTP Input Boxes */}
            <Animated.View style={[styles.otpRow, { transform: [{ translateX: shakeAnim }] }]}>
                {otp.map((digit, index) => (
                    <TextInput
                        key={index}
                        ref={(ref) => (inputRefs.current[index] = ref)}
                        style={[
                            styles.otpBox,
                            digit && styles.otpBoxFilled,
                            isSubmitting && styles.otpBoxDisabled,
                        ]}
                        value={digit}
                        onChangeText={(value) => handleOtpChange(value, index)}
                        onKeyPress={(e) => handleKeyPress(e, index)}
                        keyboardType="number-pad"
                        maxLength={1}
                        editable={!isSubmitting}
                        selectionColor="#76C815"
                    />
                ))}
            </Animated.View>

            {/* Resend Code Timer */}
            <View style={styles.resendContainer}>
                {canResend ? (
                    <TouchableOpacity onPress={handleResend} activeOpacity={0.7}>
                        <Text style={styles.resendActiveText}>Resend Code</Text>
                    </TouchableOpacity>
                ) : (
                    <Text style={styles.timerText}>
                        Resend code in <Text style={styles.timerHighlight}>{formatTimer(resendTimer)}</Text>
                    </Text>
                )}
            </View>

            {/* Verify Pill Button */}
            <TouchableOpacity
                style={[styles.verifyPillButton, isSubmitting && styles.buttonDisabled]}
                onPress={() => handleVerify()}
                disabled={isSubmitting}
                activeOpacity={0.88}
            >
                {isSubmitting ? (
                    <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                    <>
                        <Text style={styles.verifyButtonText}>Verify Email</Text>
                        <View style={styles.arrowIconContainer}>
                            <Feather name="arrow-right" size={18} color="#FFFFFF" />
                        </View>
                    </>
                )}
            </TouchableOpacity>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4FBF4',
        paddingHorizontal: 24,
        paddingTop: 56,
    },
    topHeader: {
        marginBottom: 20,
    },
    backButton: {
        width: 42,
        height: 42,
        borderRadius: 21,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E6F4E2',
        shadowColor: '#102A00',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 2,
    },
    iconContainer: {
        alignItems: 'center',
        marginBottom: 24,
    },
    iconCircle: {
        width: 90,
        height: 90,
        borderRadius: 45,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#E6F4E2',
        shadowColor: '#76C815',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 14,
        elevation: 4,
    },
    iconInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#F0F9ED',
        justifyContent: 'center',
        alignItems: 'center',
    },
    title: {
        fontSize: 28,
        fontWeight: '900',
        color: '#1E293B',
        textAlign: 'center',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        lineHeight: 22,
        marginTop: 8,
    },
    emailHighlight: {
        color: '#76C815',
        fontWeight: '700',
    },
    otpRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 10,
        marginTop: 36,
        marginBottom: 24,
    },
    otpBox: {
        width: 48,
        height: 56,
        borderRadius: 16,
        backgroundColor: '#FFFFFF',
        borderWidth: 1.5,
        borderColor: '#E2EFE0',
        textAlign: 'center',
        fontSize: 22,
        fontWeight: '800',
        color: '#1E293B',
        shadowColor: '#102A00',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 1,
    },
    otpBoxFilled: {
        borderColor: '#76C815',
        backgroundColor: '#F0F9ED',
    },
    otpBoxDisabled: {
        opacity: 0.5,
    },
    resendContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    timerText: {
        fontSize: 13,
        color: '#64748B',
    },
    timerHighlight: {
        color: '#76C815',
        fontWeight: '700',
    },
    resendActiveText: {
        fontSize: 14,
        color: '#76C815',
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
    verifyPillButton: {
        backgroundColor: '#76C815',
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#76C815',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 14,
        elevation: 8,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    verifyButtonText: {
        fontSize: 17,
        fontWeight: '700',
        color: '#FFFFFF',
        marginRight: 8,
    },
    arrowIconContainer: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});
