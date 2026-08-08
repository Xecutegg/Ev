import { useState, useRef } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Animated,
    Alert,
    ActivityIndicator,
    StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext.jsx';
import Svg, { Path, Circle } from 'react-native-svg';

// Custom SVG Icons
const AtSignIcon = ({ size = 20, color = '#94A3B8' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="4" stroke={color} strokeWidth="2" />
        <Path d="M16 8V16C16 18.2091 14.2091 20 12 20C9.79086 20 8 18.2091 8 16V12" stroke={color} strokeWidth="2" strokeLinecap="round"/>
        <Path d="M20 12C20 7.58172 16.4183 4 12 4C7.58172 4 4 7.58172 4 12C4 16.4183 7.58172 20 12 20" stroke={color} strokeWidth="2" strokeLinecap="round"/>
    </Svg>
);

const UserIcon = ({ size = 20, color = '#94A3B8' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M20 21V19C20 16.7909 18.2091 15 16 15H8C5.79086 15 4 16.7909 4 19V21" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <Circle cx="12" cy="7" r="4" stroke={color} strokeWidth="2" />
    </Svg>
);

const MailIcon = ({ size = 20, color = '#94A3B8' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M4 4H20C21.1 4 22 4.9 22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6C2 4.9 2.9 4 4 4Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <Path d="M22 6L12 13L2 6" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
);

const LockIcon = ({ size = 20, color = '#94A3B8' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M19 11H5C3.89543 11 3 11.8954 3 13V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V13C21 11.8954 20.1046 11 19 11Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <Path d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <Circle cx="12" cy="16" r="2" fill={color} />
        <Path d="M12 18V20" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </Svg>
);

const ShieldIcon = ({ size = 20, color = '#94A3B8' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M12 22C12 22 20 18 20 12V5L12 2L4 5V12C4 18 12 22 12 22Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <Path d="M9 12L11 14L15 10" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
);

const EyeIcon = ({ size = 20, color = '#64748B' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M1 12C1 12 5 4 12 4C19 4 23 12 23 12C23 12 19 20 12 20C5 20 1 12 1 12Z" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <Circle cx="12" cy="12" r="3" fill={color} />
    </Svg>
);

const EyeOffIcon = ({ size = 20, color = '#64748B' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M17.94 17.94C16.2306 19.243 14.1491 19.9649 12 20C5 20 1 12 1 12C2.24389 9.68189 3.96914 7.6566 6.06 6.06M9.9 4.24C10.5883 4.07888 11.2931 3.99834 12 4C19 4 23 12 23 12C22.393 13.1356 21.6691 14.1947 20.84 15.16M14.12 14.12C13.8454 14.4147 13.5141 14.6512 13.1462 14.8151C12.7782 14.9791 12.3809 15.0673 11.9781 15.0744C11.5753 15.0815 11.1752 15.0074 10.8016 14.8565C10.4281 14.7056 10.0887 14.481 9.80385 14.1962C9.519 13.9113 9.29439 13.5719 9.14351 13.1984C8.99262 12.8248 8.91853 12.4247 8.92563 12.0219C8.93274 11.6191 9.02091 11.2218 9.18488 10.8538C9.34884 10.4859 9.58525 10.1546 9.88 9.88M1 1L23 23" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
);

const ArrowLeftIcon = ({ size = 20, color = '#1E293B' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M19 12H5M5 12L12 19M5 12L12 5" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
);

const ArrowRightIcon = ({ size = 18, color = '#FFFFFF' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M5 12H19M19 12L12 5M19 12L12 19" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
);

const LightningIcon = ({ size = 28, color = '#4CAF50' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M13 2L4 14H12L11 22L20 10H12L13 2Z" fill={color} stroke={color} strokeWidth="1.5" strokeLinejoin="round"/>
    </Svg>
);

const CheckIcon = ({ size = 12, color = '#4CAF50' }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M20 6L9 17L4 12" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
    </Svg>
);

export default function RegisterScreen() {
    const router = useRouter();
    const { register } = useAuth();

    const [form, setForm] = useState({
        username: '',
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    const shakeAnim = useRef(new Animated.Value(0)).current;

    const shake = () => {
        Animated.sequence([
            Animated.timing(shakeAnim, { toValue: 8, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 5, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -5, duration: 50, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
        ]).start();
    };

    const getPasswordStrength = (pass) => {
        if (!pass) return { score: 0, text: '', color: '#E2E8F0' };
        let score = 0;
        if (pass.length >= 8) score += 1;
        if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
        if (/[0-9]/.test(pass)) score += 1;
        if (/[^A-Za-z0-9]/.test(pass)) score += 1;

        if (score <= 1) return { score: 1, text: 'Weak', color: '#EF4444' };
        if (score === 2) return { score: 2, text: 'Medium', color: '#F59E0B' };
        return { score: 3, text: 'Strong', color: '#4CAF50' };
    };

    const strength = getPasswordStrength(form.password);

    const validateForm = () => {
        const newErrors = {};

        if (!form.username.trim()) {
            newErrors.username = 'Username required';
        } else if (form.username.trim().length < 3) {
            newErrors.username = 'Min 3 characters';
        }

        if (!form.name.trim()) {
            newErrors.name = 'Name required';
        } else if (form.name.trim().length < 2) {
            newErrors.name = 'Min 2 characters';
        }

        if (!form.email.trim()) {
            newErrors.email = 'Email required';
        } else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
            newErrors.email = 'Invalid email';
        }

        if (!form.password) {
            newErrors.password = 'Password required';
        } else if (form.password.length < 8) {
            newErrors.password = 'Min 8 characters';
        }

        if (!form.confirmPassword) {
            newErrors.confirmPassword = 'Confirm password';
        } else if (form.password !== form.confirmPassword) {
            newErrors.confirmPassword = 'Passwords mismatch';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleRegister = async () => {
        if (!validateForm()) {
            shake();
            return;
        }

        setIsSubmitting(true);
        try {
            await register(
                form.username.trim(),
                form.name.trim(),
                form.email.trim().toLowerCase(),
                form.password,
                form.confirmPassword
            );
            router.push({
                pathname: '/(auth)/verify-otp',
                params: { email: form.email.trim().toLowerCase() },
            });
        } catch (error) {
            const message = error.response?.data?.message || error.message || 'Registration failed.';
            Alert.alert('Registration Failed', message);
            shake();
        } finally {
            setIsSubmitting(false);
        }
    };

    const updateField = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: null }));
        }
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
            <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Background Elements */}
                <View style={styles.bgGradient1} />
                <View style={styles.bgGradient2} />

                {/* Back Button */}
                <View style={styles.topHeader}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
                        <ArrowLeftIcon size={18} color="#1E293B" />
                    </TouchableOpacity>
                </View>

                {/* Brand Section - Compact */}
                <View style={styles.brandContainer}>
                    <LinearGradient
                        colors={['#4CAF50', '#43A047']}
                        style={styles.logoGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <LightningIcon size={28} color="#FFFFFF" />
                    </LinearGradient>
                    <Text style={styles.brandTitle}>Electrically</Text>
                    <View style={styles.brandBadge}>
                        <Text style={styles.brandBadgeText}>Create Your Account To Access!!</Text>
                    </View>
                </View>

                {/* Form Card - Compact */}
                <Animated.View style={[styles.formCard, { transform: [{ translateX: shakeAnim }] }]}>
                    {/* Username */}
                    <View style={styles.inputGroup}>
                        <View style={[styles.inputBox, errors.username && styles.inputBoxError]}>
                            <AtSignIcon size={18} color={errors.username ? '#EF4444' : '#94A3B8'} />
                            <TextInput
                                style={styles.inputField}
                                placeholder="Username"
                                placeholderTextColor="#94A3B8"
                                value={form.username}
                                onChangeText={(value) => updateField('username', value)}
                                autoCapitalize="none"
                                editable={!isSubmitting}
                            />
                        </View>
                        {errors.username && <Text style={styles.errorText}>{errors.username}</Text>}
                    </View>

                    {/* Full Name */}
                    <View style={styles.inputGroup}>
                        <View style={[styles.inputBox, errors.name && styles.inputBoxError]}>
                            <UserIcon size={18} color={errors.name ? '#EF4444' : '#94A3B8'} />
                            <TextInput
                                style={styles.inputField}
                                placeholder="Full Name"
                                placeholderTextColor="#94A3B8"
                                value={form.name}
                                onChangeText={(value) => updateField('name', value)}
                                autoCapitalize="words"
                                editable={!isSubmitting}
                            />
                        </View>
                        {errors.name && <Text style={styles.errorText}>{errors.name}</Text>}
                    </View>

                    {/* Email */}
                    <View style={styles.inputGroup}>
                        <View style={[styles.inputBox, errors.email && styles.inputBoxError]}>
                            <MailIcon size={18} color={errors.email ? '#EF4444' : '#94A3B8'} />
                            <TextInput
                                style={styles.inputField}
                                placeholder="Email"
                                placeholderTextColor="#94A3B8"
                                value={form.email}
                                onChangeText={(value) => updateField('email', value)}
                                autoCapitalize="none"
                                keyboardType="email-address"
                                editable={!isSubmitting}
                            />
                        </View>
                        {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}
                    </View>

                    {/* Password */}
                    <View style={styles.inputGroup}>
                        <View style={[styles.inputBox, errors.password && styles.inputBoxError]}>
                            <LockIcon size={18} color={errors.password ? '#EF4444' : '#94A3B8'} />
                            <TextInput
                                style={styles.inputField}
                                placeholder="Password"
                                placeholderTextColor="#94A3B8"
                                value={form.password}
                                onChangeText={(value) => updateField('password', value)}
                                secureTextEntry={!showPassword}
                                autoCapitalize="none"
                                editable={!isSubmitting}
                            />
                            <TouchableOpacity
                                onPress={() => setShowPassword(!showPassword)}
                                style={styles.eyeToggle}
                            >
                                {showPassword ? (
                                    <EyeOffIcon size={18} color="#64748B" />
                                ) : (
                                    <EyeIcon size={18} color="#64748B" />
                                )}
                            </TouchableOpacity>
                        </View>
                        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                    </View>

                    {/* Password Strength - Compact */}
                    {form.password.length > 0 && (
                        <View style={styles.strengthBox}>
                            <View style={styles.strengthBarRow}>
                                <View style={[styles.strengthSegment, strength.score >= 1 && { backgroundColor: strength.color }]} />
                                <View style={[styles.strengthSegment, strength.score >= 2 && { backgroundColor: strength.color }]} />
                                <View style={[styles.strengthSegment, strength.score >= 3 && { backgroundColor: strength.color }]} />
                            </View>
                            <Text style={[styles.strengthLabelText, { color: strength.color }]}>
                                {strength.text}
                            </Text>
                        </View>
                    )}

                    {/* Confirm Password */}
                    <View style={styles.inputGroup}>
                        <View style={[styles.inputBox, errors.confirmPassword && styles.inputBoxError]}>
                            <ShieldIcon size={18} color={errors.confirmPassword ? '#EF4444' : '#94A3B8'} />
                            <TextInput
                                style={styles.inputField}
                                placeholder="Confirm Password"
                                placeholderTextColor="#94A3B8"
                                value={form.confirmPassword}
                                onChangeText={(value) => updateField('confirmPassword', value)}
                                secureTextEntry={!showConfirmPassword}
                                autoCapitalize="none"
                                editable={!isSubmitting}
                            />
                            <TouchableOpacity
                                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                                style={styles.eyeToggle}
                            >
                                {showConfirmPassword ? (
                                    <EyeOffIcon size={18} color="#64748B" />
                                ) : (
                                    <EyeIcon size={18} color="#64748B" />
                                )}
                            </TouchableOpacity>
                        </View>
                        {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
                    </View>

                    {/* Sign Up Button - Compact */}
                    <TouchableOpacity
                        style={[styles.signUpButton, isSubmitting && styles.buttonDisabled]}
                        onPress={handleRegister}
                        disabled={isSubmitting}
                        activeOpacity={0.88}
                    >
                        <LinearGradient
                            colors={['#4CAF50', '#43A047']}
                            style={styles.signUpGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            {isSubmitting ? (
                                <ActivityIndicator color="#FFFFFF" size="small" />
                            ) : (
                                <>
                                    <Text style={styles.signUpButtonText}>Create Account</Text>
                                    <ArrowRightIcon size={18} color="#FFFFFF" />
                                </>
                            )}
                        </LinearGradient>
                    </TouchableOpacity>

                    {/* Login Link - Compact */}
                    <TouchableOpacity
                        onPress={() => router.replace('/(auth)/login')}
                        style={styles.loginContainer}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.loginText}>
                            Already have an account? <Text style={styles.loginHighlight}>Sign In</Text>
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
        backgroundColor: '#F8FAFC',
    },
    scrollContent: {
        flexGrow: 1,
        paddingHorizontal: 20,
        paddingTop: 40,
        paddingBottom: 20,
    },
    bgGradient1: {
        position: 'absolute',
        top: -80,
        right: -50,
        width: 200,
        height: 200,
        borderRadius: 100,
        backgroundColor: 'rgba(76, 175, 80, 0.05)',
    },
    bgGradient2: {
        position: 'absolute',
        bottom: -50,
        left: -50,
        width: 180,
        height: 180,
        borderRadius: 90,
        backgroundColor: 'rgba(123, 97, 255, 0.04)',
    },
    topHeader: {
        marginBottom: 8,
    },
    backButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
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
    brandContainer: {
        alignItems: 'center',
        marginBottom: 16,
    },
    logoGradient: {
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 12,
        elevation: 4,
        marginBottom: 6,
    },
    brandTitle: {
        fontSize: 22,
        fontWeight: '900',
        color: '#1A2332',
        letterSpacing: -0.5,
    },
    brandBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        marginTop: 3,
        backgroundColor: '#E8F5E9',
        paddingHorizontal: 10,
        paddingVertical: 2,
        borderRadius: 10,
    },
    brandBadgeText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#4CAF50',
        letterSpacing: 0.3,
    },
    formCard: {
        gap: 8,
        backgroundColor: '#FFFFFF',
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#E8EDF2',
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.04,
        shadowRadius: 10,
        elevation: 3,
    },
    inputGroup: {
        gap: 3,
    },
    inputBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        borderWidth: 1.5,
        borderColor: '#E2E8F0',
        paddingHorizontal: 12,
        height: 42,
    },
    inputBoxError: {
        borderColor: '#EF4444',
        backgroundColor: '#FEF2F2',
    },
    inputField: {
        flex: 1,
        fontSize: 14,
        color: '#1A2332',
        fontWeight: '500',
        paddingVertical: 6,
        paddingHorizontal: 8,
    },
    eyeToggle: {
        padding: 4,
        marginRight: -4,
    },
    errorText: {
        fontSize: 11,
        color: '#EF4444',
        marginLeft: 6,
        fontWeight: '500',
    },
    strengthBox: {
        marginTop: 1,
        marginBottom: 1,
        gap: 4,
        paddingHorizontal: 4,
    },
    strengthBarRow: {
        flexDirection: 'row',
        gap: 4,
        height: 4,
    },
    strengthSegment: {
        flex: 1,
        borderRadius: 2,
        backgroundColor: '#E2E8F0',
    },
    strengthLabelText: {
        fontSize: 10,
        fontWeight: '700',
    },
    signUpButton: {
        height: 44,
        borderRadius: 22,
        overflow: 'hidden',
        marginTop: 4,
        shadowColor: '#4CAF50',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25,
        shadowRadius: 12,
        elevation: 5,
    },
    signUpGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    signUpButtonText: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: 0.3,
    },
    loginContainer: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    loginText: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500',
    },
    loginHighlight: {
        color: '#4CAF50',
        fontWeight: '700',
    },
});