import { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/auth.service.js';
import { setTokens, clearTokens, getAccessToken, getRefreshToken } from '../services/api.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    // Check for existing tokens on app start
    useEffect(() => {
        checkAuthStatus();
    }, []);

    const checkAuthStatus = async () => {
        try {
            const token = await getAccessToken();
            if (token) {
                const response = await authService.getMe();
                if (response.success) {
                    setUser(response.data.user);
                    setIsAuthenticated(true);
                }
            }
        } catch (error) {
            // Token invalid or expired — try refresh
            try {
                const refreshTokenValue = await getRefreshToken();
                if (refreshTokenValue) {
                    const refreshResponse = await authService.refreshToken(refreshTokenValue);
                    if (refreshResponse.success) {
                        await setTokens(
                            refreshResponse.data.accessToken,
                            refreshResponse.data.refreshToken
                        );
                        const meResponse = await authService.getMe();
                        if (meResponse.success) {
                            setUser(meResponse.data.user);
                            setIsAuthenticated(true);
                        }
                    }
                }
            } catch (refreshError) {
                // Refresh also failed — clear everything
                await clearTokens();
                setUser(null);
                setIsAuthenticated(false);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const register = async (username, name, email, password, confirmPassword) => {
        const response = await authService.register(username, name, email, password, confirmPassword);
        if (response.success) {
            return { success: true, data: response.data };
        }
        throw new Error(response.message);
    };

    const verifyOtp = async (email, otp) => {
        const response = await authService.verifyOtp(email, otp);
        if (response.success) {
            await setTokens(response.data.accessToken, response.data.refreshToken);
            setUser(response.data.user);
            setIsAuthenticated(true);
            return { success: true, data: response.data };
        }
        throw new Error(response.message);
    };

    const login = async (email, password) => {
        const response = await authService.login(email, password);
        if (response.success) {
            await setTokens(response.data.accessToken, response.data.refreshToken);
            setUser(response.data.user);
            setIsAuthenticated(true);
            return { success: true, data: response.data };
        }
        // Check if verification is required
        if (response.errors?.requiresVerification) {
            return { success: false, requiresVerification: true, email: response.errors.email };
        }
        throw new Error(response.message);
    };

    const logout = async () => {
        try {
            const refreshTokenValue = await getRefreshToken();
            await authService.logout(refreshTokenValue);
        } catch (error) {
            // Logout API might fail, but we should still clear local state
        } finally {
            await clearTokens();
            setUser(null);
            setIsAuthenticated(false);
        }
    };

    const resendOtp = async (email) => {
        const response = await authService.resendOtp(email);
        return response;
    };

    const updateUser = (updatedUserData) => {
        setUser((prev) => ({ ...prev, ...updatedUserData }));
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isLoading,
                isAuthenticated,
                register,
                verifyOtp,
                login,
                logout,
                resendOtp,
                checkAuthStatus,
                updateUser,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}

export default AuthContext;
