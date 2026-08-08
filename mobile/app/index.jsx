import { Redirect } from 'expo-router';
import { useAuth } from '../context/AuthContext.jsx';

export default function Index() {
    const { isAuthenticated } = useAuth();

    if (isAuthenticated) {
        return <Redirect href="/(tabs)/home" />;
    }

    return <Redirect href="/(auth)/welcome" />;
}
