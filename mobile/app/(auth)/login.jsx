import { useState, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Alert,
    ActivityIndicator,
    StatusBar,
    ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';
import Feather from '@expo/vector-icons/Feather';
import { useAuth } from '../../context/AuthContext.jsx';

export default function LoginScreen() {
    const router = useRouter();
    const { login } = useAuth();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const shakeAnim = useRef(new Animated.Value(0)).current;

    const shake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    };

    const validateForm = () => {
        const newErrors = {};

        if (!email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
            newErrors.email = 'Enter a valid email address';
        }

        if (!password) {
            newErrors.password = 'Password is required';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleLogin = async () => {
        if (!validateForm()) {
            shake();
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await login(email.trim().toLowerCase(), password);

            if (result && !result.success && result.requiresVerification) {
                router.push({
                    pathname: '/(auth)/verify-otp',
                    params: { email: result.email },
                });
                return;
            }
        } catch (error) {
            const message =
                error.response?.data?.message ||
                error.message ||
                'Login failed. Please check your credentials.';
            Alert.alert('Login Failed', message);
            shake();
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle="dark-content" backgroundColor="#F4FBF4" />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Back Button & Header */}
                <View style={styles.topHeader}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
                        <Feather name="arrow-left" size={20} color="#1E293B" />
                    </TouchableOpacity>
                </View>

                {/* Brand Logo & Welcome Title */}
                <View style={styles.brandContainer}>
                    <View style={styles.logoBadge}>
                        <Feather name="zap" size={32} color="#76C815" />
                    </View>
                    <Text style={styles.brandTitle}>osler<Text style={{ color: '#76C815' }}>.ev</Text></Text>
                    <Text style={styles.subHeading}>Sign In to access all-in-one EV charging</Text>
                </View>

                {/* Form Inputs */}
                <Animated.View style={[styles.form, { transform: [{ translateX: shakeAnim }] }]}>
                    {/* Email Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.fieldLabel}>Email Address</Text>
                        <View style={[styles.inputBox, errors.email && styles.inputBoxError]}>
                            <Feather name="mail" size={18} color="#94A3B8" style={styles.inputLeftIcon} />
                            <TextInput
                                style={styles.inputField}
                                placeholder="Enter your email address..."
                                placeholderTextColor="#94A3B8"
                                value={email}
                                onChangeText={(value) => {
                                    setEmail(value);
                                    if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                                }}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                editable={!isSubmitting}
                            />
                        </View>
                        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                    </View>

                    {/* Password Input */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.fieldLabel}>Password</Text>
                        <View style={[styles.inputBox, errors.password && styles.inputBoxError]}>
                            <Feather name="lock" size={18} color="#94A3B8" style={styles.inputLeftIcon} />
                            <TextInput
                                style={styles.inputField}
                                placeholder="••••••••••••"
                                placeholderTextColor="#94A3B8"
                                value={password}
                                onChangeText={(value) => {
                                    setPassword(value);
                                    if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
                                }}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                editable={!isSubmitting}
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                style={styles.eyeToggle}
                            >
                                <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                    </View>

                    {/* Forgot Password Link */}
                    <TouchableOpacity style={styles.forgotPassButton} activeOpacity={0.7}>
                        <Text style={styles.forgotPassText}>Forgot Password?</Text>
                    </TouchableOpacity>

                    {/* Sign In Pill Button */}
                    <TouchableOpacity
                        style={[styles.signInPillButton, isSubmitting && styles.buttonDisabled]}
                        onPress={handleLogin}
                        disabled={isSubmitting}
                        activeOpacity={0.88}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                            <>
                                <Text style={styles.signInButtonText}>Sign In</Text>
                                <View style={styles.arrowIconContainer}>
                                    <Feather name="arrow-right" size={18} color="#FFFFFF" />
                                </View>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Register Redirection Link */}
                    <TouchableOpacity
                        onPress={() => router.replace('/(auth)/register')}
                        style={styles.switchAuthContainer}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.switchAuthText}>
                            {"Don't have an account?"}{' '}
                            <Text style={styles.switchAuthHighlight}>Sign Up</Text>
                        </Text>
                    </TouchableOpacity>
                </Animated.View>
            </ScrollView>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F4FBF4',
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 24,
        paddingTop: 56,
        paddingBottom: 40,
        justifyContent: 'center',
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
    brandContainer: {
        alignItems: 'center',
        marginBottom: 32,
    },
    logoBadge: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#E6F4E2',
        shadowColor: '#76C815',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 12,
        elevation: 4,
        marginBottom: 12,
    },
    brandTitle: {
        fontSize: 28,
        fontWeight: '900',
        color: '#1E293B',
        letterSpacing: -0.5,
    },
    subHeading: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 6,
        textAlign: 'center',
    },
    form: {
        gap: 18,
    },
    inputGroup: {
        gap: 6,
    },
    fieldLabel: {
        fontSize: 13,
        fontWeight: '700',
        color: '#334155',
        marginLeft: 4,
    },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 18,
        borderWidth: 1.5,
        borderColor: '#E2EFE0',
        paddingHorizontal: 16,
        height: 56,
        shadowColor: '#102A00',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 6,
        elevation: 1,
    },
    inputBoxError: {
        borderColor: '#EF4444',
        backgroundColor: '#FEF2F2',
    },
    inputLeftIcon: {
        marginRight: 12,
    },
    inputField: {
        flex: 1,
        fontSize: 15,
        color: '#1E293B',
        fontWeight: '500',
    },
    eyeToggle: {
        padding: 8,
    },
    errorText: {
        fontSize: 12,
        color: '#EF4444',
        marginLeft: 6,
        fontWeight: '500',
    },
    forgotPassButton: {
        alignSelf: 'flex-end',
        marginTop: -4,
        paddingVertical: 4,
        paddingHorizontal: 4,
    },
    forgotPassText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#76C815',
    },
    signInPillButton: {
        backgroundColor: '#76C815',
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 10,
        shadowColor: '#76C815',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 14,
        elevation: 8,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    signInButtonText: {
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
    switchAuthContainer: {
        alignItems: 'center',
        paddingVertical: 14,
    },
    switchAuthText: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
    },
    switchAuthHighlight: {
        color: '#76C815',
        fontWeight: '700',
        textDecorationLine: 'underline',
    },
});
