import { Tabs } from 'expo-router';
import { View, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Feather from '@expo/vector-icons/Feather';

export default function TabsLayout() {
    const insets = useSafeAreaInsets();
    const bottomMargin = Math.max(insets.bottom, Platform.OS === 'android' ? 14 : 10) + (Platform.OS === 'ios' ? 14 : 10);

    return (
        <Tabs
            screenOptions={{
                headerShown: false,
                tabBarActiveTintColor: '#76C815',
                tabBarInactiveTintColor: '#94A3B8',
                tabBarStyle: [styles.tabBar, { marginBottom: bottomMargin }],
                tabBarLabelStyle: styles.tabBarLabel,
                tabBarItemStyle: styles.tabBarItem,
            }}
        >
            <Tabs.Screen
                name="home"
                options={{
                    title: 'Map & Charging',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
                            <Feather name="map-pin" size={20} color={focused ? '#76C815' : color} />
                        </View>
                    ),
                }}
            />
            <Tabs.Screen
                name="booking-history"
                options={{
                    title: 'My Bookings',
                    tabBarIcon: ({ color, focused }) => (
                        <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
                            <Feather name="clock" size={20} color={focused ? '#76C815' : color} />
                        </View>
                    ),
                }}
            />
        </Tabs>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        backgroundColor: '#FFFFFF',
        borderTopWidth: 0,
        height: Platform.OS === 'ios' ? 78 : 64,
        paddingBottom: Platform.OS === 'ios' ? 20 : 8,
        paddingTop: 8,
        marginHorizontal: 18,
        borderRadius: 32,
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        elevation: 12,
        shadowColor: '#102A00',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        borderWidth: 1.5,
        borderColor: '#E6F4E2',
    },
    tabBarLabel: {
        fontSize: 12,
        fontWeight: '700',
        marginTop: 2,
    },
    tabBarItem: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainer: {
        width: 44,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconContainerActive: {
        backgroundColor: '#F0F9ED',
    },
});
