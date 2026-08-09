import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { AuthProvider, useAuth } from '../context/AuthContext.jsx';

function RootLayoutNav() {
    const { isAuthenticated, isLoading } = useAuth();
    const segments = useSegments();
    const router = useRouter();

    useEffect(() => {
        if (isLoading) return;

        const currentRoute = Array.isArray(segments) ? segments.join('/') : '';
        const inAuthGroup =
            segments.includes('(auth)') ||
            ['welcome', 'login', 'register', 'verify-otp', 'forgot-password'].some(
                (route) => currentRoute.includes(route) || segments.includes(route)
            );

        if (isAuthenticated && inAuthGroup) {
            // Authenticated user on auth screen → go to tabs
            router.replace('/(tabs)/home');
        } else if (!isAuthenticated && !inAuthGroup) {
            // Unauthenticated user on protected screen → go to welcome
            router.replace('/(auth)/welcome');
        }
    }, [isAuthenticated, isLoading, segments]);

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#76C815" />
                <StatusBar style="dark" />
            </View>
        );
    }

    return (
        <>
            <StatusBar style="dark" />
            <Stack
                screenOptions={{
                    headerShown: false,
                    contentStyle: { backgroundColor: '#F8FAF8' },
                    animation: 'fade',
                }}
            />
        </>
    );
}

export default function RootLayout() {
    return (
        <AuthProvider>
            <RootLayoutNav />
        </AuthProvider>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F8FAF8',
    },
});
