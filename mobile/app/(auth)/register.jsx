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
import Feather from '@expo/vector-icons/Feather';
import { useAuth } from '../../context/AuthContext.jsx';

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
            Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
            Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
        ]).start();
    };

    // Calculate password strength
    const getPasswordStrength = (pass) => {
        if (!pass) return { score: 0, text: '', color: '#E2EFE0' };
        let score = 0;
        if (pass.length >= 8) score += 1;
        if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score += 1;
        if (/[0-9]/.test(pass)) score += 1;
        if (/[^A-Za-z0-9]/.test(pass)) score += 1;

        if (score <= 1) return { score: 1, text: 'Weak! Add Strength! 💪', color: '#EF4444' };
        if (score === 2) return { score: 2, text: 'Medium! Keep going! ⚡', color: '#F59E0B' };
        return { score: 3, text: 'Perfect! Strong Password! ✨', color: '#76C815' };
    };

    const strength = getPasswordStrength(form.password);

    const validateForm = () => {
        const newErrors = {};

        if (!form.username.trim()) {
            newErrors.username = 'Username is required';
        } else if (form.username.trim().length < 3) {
            newErrors.username = 'Username must be at least 3 characters';
        } else if (!/^[a-zA-Z0-9_]+$/.test(form.username.trim())) {
            newErrors.username = 'Only letters, numbers, and underscores';
        }

        if (!form.name.trim()) {
            newErrors.name = 'Name is required';
        } else if (form.name.trim().length < 2) {
            newErrors.name = 'Name must be at least 2 characters';
        }

        if (!form.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
            newErrors.email = 'Enter a valid email address';
        }

        if (!form.password) {
            newErrors.password = 'Password is required';
        } else if (form.password.length < 8) {
            newErrors.password = 'At least 8 characters required';
        }

        if (!form.confirmPassword) {
            newErrors.confirmPassword = 'Confirm your password';
        } else if (form.password !== form.confirmPassword) {
            newErrors.confirmPassword = 'Passwords do not match';
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
            const message =
                error.response?.data?.message ||
                error.message ||
                'Registration failed. Please try again.';

            const fieldErrors = error.response?.data?.errors;
            if (fieldErrors && Array.isArray(fieldErrors)) {
                const newErrors = {};
                fieldErrors.forEach((e) => {
                    if (e.field) newErrors[e.field] = e.message;
                });
                setErrors(newErrors);
            }

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
            <StatusBar barStyle="dark-content" backgroundColor="#F4FBF4" />

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
            >
                {/* Back Button & Top Header */}
                <View style={styles.topHeader}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton} activeOpacity={0.7}>
                        <Feather name="arrow-left" size={20} color="#1E293B" />
                    </TouchableOpacity>
                </View>

                {/* Brand Logo & Heading */}
                <View style={styles.brandContainer}>
                    <View style={styles.logoBadge}>
                        <Feather name="zap" size={32} color="#76C815" />
                    </View>
                    <Text style={styles.brandTitle}>osler<Text style={{ color: '#76C815' }}>.ev</Text></Text>
                    <Text style={styles.subHeading}>{"Let's sign up to get started quickly"}</Text>
                </View>

                {/* Form */}
                <Animated.View style={[styles.form, { transform: [{ translateX: shakeAnim }] }]}>
                    {/* Username */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.fieldLabel}>Username</Text>
                        <View style={[styles.inputBox, errors.username && styles.inputBoxError]}>
                            <Feather name="at-sign" size={18} color="#94A3B8" style={styles.inputLeftIcon} />
                            <TextInput
                                style={styles.inputField}
                                placeholder="Choose a username..."
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
                        <Text style={styles.fieldLabel}>Full Name</Text>
                        <View style={[styles.inputBox, errors.name && styles.inputBoxError]}>
                            <Feather name="user" size={18} color="#94A3B8" style={styles.inputLeftIcon} />
                            <TextInput
                                style={styles.inputField}
                                placeholder="Enter your full name..."
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
                        <Text style={styles.fieldLabel}>Email Address</Text>
                        <View style={[styles.inputBox, errors.email && styles.inputBoxError]}>
                            <Feather name="mail" size={18} color="#94A3B8" style={styles.inputLeftIcon} />
                            <TextInput
                                style={styles.inputField}
                                placeholder="elementary221b@gmail.com"
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
                        <Text style={styles.fieldLabel}>Password</Text>
                        <View style={[styles.inputBox, errors.password && styles.inputBoxError]}>
                            <Feather name="lock" size={18} color="#94A3B8" style={styles.inputLeftIcon} />
                            <TextInput
                                style={styles.inputField}
                                placeholder="••••••••"
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
                                <Feather name={showPassword ? 'eye-off' : 'eye'} size={18} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                        {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}
                    </View>

                    {/* Password Strength Indicator (Matching Mockup) */}
                    {form.password.length > 0 && (
                        <View style={styles.strengthBox}>
                            <View style={styles.strengthBarRow}>
                                <View style={[styles.strengthSegment, strength.score >= 1 && { backgroundColor: strength.color }]} />
                                <View style={[styles.strengthSegment, strength.score >= 2 && { backgroundColor: strength.color }]} />
                                <View style={[styles.strengthSegment, strength.score >= 3 && { backgroundColor: strength.color }]} />
                            </View>
                            <Text style={[styles.strengthLabelText, { color: strength.color }]}>
                                Password strength: {strength.text}
                            </Text>
                        </View>
                    )}

                    {/* Confirm Password */}
                    <View style={styles.inputGroup}>
                        <Text style={styles.fieldLabel}>Confirm Password</Text>
                        <View style={[styles.inputBox, errors.confirmPassword && styles.inputBoxError]}>
                            <Feather name="shield" size={18} color="#94A3B8" style={styles.inputLeftIcon} />
                            <TextInput
                                style={styles.inputField}
                                placeholder="••••••••"
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
                                <Feather name={showConfirmPassword ? 'eye-off' : 'eye'} size={18} color="#64748B" />
                            </TouchableOpacity>
                        </View>
                        {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}
                    </View>

                    {/* Sign Up Pill Button */}
                    <TouchableOpacity
                        style={[styles.signUpPillButton, isSubmitting && styles.buttonDisabled]}
                        onPress={handleRegister}
                        disabled={isSubmitting}
                        activeOpacity={0.88}
                    >
                        {isSubmitting ? (
                            <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                            <>
                                <Text style={styles.signUpButtonText}>Sign Up</Text>
                                <View style={styles.arrowIconContainer}>
                                    <Feather name="arrow-right" size={18} color="#FFFFFF" />
                                </View>
                            </>
                        )}
                    </TouchableOpacity>

                    {/* Login Link */}
                    <TouchableOpacity
                        onPress={() => router.replace('/(auth)/login')}
                        style={styles.switchAuthContainer}
                        activeOpacity={0.7}
                    >
                        <Text style={styles.switchAuthText}>
                            Already have <Text style={styles.switchAuthHighlight}>an account</Text>
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
    },
    topHeader: {
        marginBottom: 16,
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
        marginBottom: 28,
    },
    logoBadge: {
        width: 68,
        height: 68,
        borderRadius: 34,
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
        marginBottom: 10,
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
        marginTop: 4,
        textAlign: 'center',
    },
    form: {
        gap: 16,
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
        height: 54,
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
    strengthBox: {
        marginTop: 2,
        marginBottom: 4,
        gap: 6,
        paddingHorizontal: 4,
    },
    strengthBarRow: {
        flexDirection: 'row',
        gap: 6,
        height: 5,
    },
    strengthSegment: {
        flex: 1,
        borderRadius: 3,
        backgroundColor: '#E2EFE0',
    },
    strengthLabelText: {
        fontSize: 12,
        fontWeight: '700',
    },
    signUpPillButton: {
        backgroundColor: '#76C815',
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 12,
        shadowColor: '#76C815',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35,
        shadowRadius: 14,
        elevation: 8,
    },
    buttonDisabled: {
        opacity: 0.7,
    },
    signUpButtonText: {
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
        paddingVertical: 12,
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
