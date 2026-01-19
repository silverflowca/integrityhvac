import React, { createContext, useContext, useState, useEffect } from 'react';
import supabase from '../lib/supabase';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check for existing session on mount
        checkAuth();

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            console.log('Auth state changed:', event);

            if (session?.user) {
                // Store access token in localStorage for API requests
                if (session.access_token) {
                    localStorage.setItem('token', session.access_token);
                }
                setUser(session.user);
                // Load profile in background
                loadUserProfile(session.user);
            } else {
                // Clear token on logout
                localStorage.removeItem('token');
                setUser(null);
                setProfile(null);
            }
        });

        return () => subscription.unsubscribe();
    }, []);

    const checkAuth = async () => {
        try {
            const { data: { session }, error } = await supabase.auth.getSession();

            if (error) {
                console.error('getSession error:', error);
                throw error;
            }

            if (session?.user) {
                // Store access token in localStorage for API requests
                if (session.access_token) {
                    localStorage.setItem('token', session.access_token);
                }
                // Set user immediately from session
                setUser(session.user);
                // Load profile in background (don't await)
                loadUserProfile(session.user);
            } else {
                // No session - user is not logged in
                localStorage.removeItem('token');
                setUser(null);
                setProfile(null);
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            localStorage.removeItem('token');
            setUser(null);
            setProfile(null);
        } finally {
            setLoading(false);
        }
    };

    const validateSession = async (authUser) => {
        try {
            // Check if the user profile exists in the database
            const { data, error } = await supabase
                .from('users')
                .select('id')
                .eq('id', authUser.id)
                .single();

            if (error) {
                console.log('Validate session error:', error.message);
                // If profile doesn't exist yet, still consider session valid
                // (profile will be created on first load)
                if (error.code === 'PGRST116') {
                    return true; // No profile yet, but auth is valid
                }
                return false;
            }
            return !!data;
        } catch (err) {
            console.error('validateSession exception:', err);
            // On error, assume session is valid to avoid blocking login
            return true;
        }
    };

    const loadUserProfile = async (authUser) => {
        try {
            // Load user profile from users table
            const { data: profileData, error } = await supabase
                .from('users')
                .select('*')
                .eq('id', authUser.id)
                .single();

            if (!error && profileData) {
                setProfile(profileData);
            }
        } catch (error) {
            console.error('Error loading profile:', error);
        }
    };

    const login = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        // Store the token
        if (data.session?.access_token) {
            localStorage.setItem('token', data.session.access_token);
        }

        // Force page reload immediately - profile will load on page refresh
        window.location.href = '/';

        return data;
    };

    const register = async ({ email, password, name }) => {
        // Sign up with Supabase Auth
        const { data, error } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: {
                    name: name
                }
            }
        });

        if (error) throw error;

        // Profile will be created automatically by the database trigger
        // But we'll update the name
        if (data.user) {
            await supabase
                .from('users')
                .update({ name: name })
                .eq('id', data.user.id);

            await loadUserProfile(data.user);
        }

        return data;
    };

    const logout = async () => {
        // Clear state first to prevent flicker
        localStorage.removeItem('token');
        setUser(null);
        setProfile(null);

        try {
            await supabase.auth.signOut();
        } catch (error) {
            console.error('Logout error:', error);
        }

        // Force redirect to login
        window.location.href = '/login';
    };

    const resetPassword = async (email) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`
        });

        if (error) throw error;

        return { message: 'Password reset email sent! Check your inbox.' };
    };

    const updatePassword = async (newPassword) => {
        const { error } = await supabase.auth.updateUser({
            password: newPassword
        });

        if (error) throw error;

        return { message: 'Password updated successfully!' };
    };

    return (
        <AuthContext.Provider value={{
            user,
            profile,
            loading,
            login,
            logout,
            register,
            resetPassword,
            updatePassword,
            isAuthenticated: !!user
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};
