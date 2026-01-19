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
        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log('Auth state changed:', event);

            if (session?.user) {
                // Store access token in localStorage for API requests
                if (session.access_token) {
                    localStorage.setItem('token', session.access_token);
                }
                await loadUserProfile(session.user);
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

            if (error) throw error;

            if (session?.user) {
                // Validate the session by checking if user exists in database
                const isValid = await validateSession(session.user);
                if (isValid) {
                    // Store access token in localStorage for API requests
                    if (session.access_token) {
                        localStorage.setItem('token', session.access_token);
                    }
                    await loadUserProfile(session.user);
                } else {
                    // Session is stale (user doesn't exist in DB after reset)
                    console.log('Stale session detected, signing out...');
                    await supabase.auth.signOut();
                    localStorage.removeItem('token');
                    setUser(null);
                    setProfile(null);
                }
            } else {
                // Clear token if no session
                localStorage.removeItem('token');
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            // On any auth error, clear the session
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

            // If no error and data exists, session is valid
            return !error && data;
        } catch {
            return false;
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

            if (error) {
                // If profile doesn't exist, it will be created by trigger
                console.log('Profile not found, it will be created automatically');
            }

            setUser(authUser);
            setProfile(profileData);
        } catch (error) {
            console.error('Error loading profile:', error);
            setUser(authUser);
        } finally {
            setLoading(false);
        }
    };

    const login = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

        await loadUserProfile(data.user);
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
        try {
            const { error } = await supabase.auth.signOut();
            if (error) throw error;
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setUser(null);
            setProfile(null);
        }
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
