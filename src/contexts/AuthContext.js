import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../utils/supabase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [supabaseUser, setSupabaseUser] = useState(null);

    useEffect(() => {
        // Check for existing authentication state
        const initializeAuth = async () => {
            console.log('🔄 Initializing authentication...');
            
            try {
                // First check localStorage for persisted session
                const savedUser = localStorage.getItem('user');
                if (savedUser) {
                    const parsedUser = JSON.parse(savedUser);
                    console.log('📱 Found saved user in localStorage:', parsedUser);
                    setUser(parsedUser);
                    
                    // Set loading to false early if we have a saved user
                    // This prevents the logout redirect while we verify with Supabase
                    setLoading(false);
                }

                // Then check Supabase auth (but don't block on it if we have savedUser)
                const currentUser = await authApi.getCurrentUser();
                console.log('🔍 Supabase current user:', currentUser);
                
                if (currentUser) {
                    setSupabaseUser(currentUser);
                    try {
                        const profile = await authApi.getUserProfile(currentUser.id);
                        const userData = {
                            id: currentUser.id,
                            email: currentUser.email,
                            name: profile.name || currentUser.user_metadata?.name || 'User',
                            role: profile.role || 'employee'
                        };
                        setUser(userData);
                        localStorage.setItem('user', JSON.stringify(userData));
                        console.log('✅ Supabase user authenticated:', userData);
                    } catch (profileError) {
                        console.log('⚠️ No profile found, using basic user data');
                        const userData = {
                            id: currentUser.id,
                            email: currentUser.email,
                            name: currentUser.user_metadata?.name || 'User',
                            role: 'employee'
                        };
                        setUser(userData);
                        localStorage.setItem('user', JSON.stringify(userData));
                    }
                } else if (!savedUser) {
                    // No Supabase user and no saved user
                    console.log('❌ No authenticated user found');
                    setUser(null);
                    setLoading(false);
                } else {
                    // We have savedUser but no Supabase session
                    // Keep the saved user but log the discrepancy
                    console.log('⚠️ Have localStorage user but no Supabase session - keeping user logged in');
                }
            } catch (error) {
                console.error('❌ Auth initialization error:', error);
                // Still try to use saved user from localStorage
                const savedUser = localStorage.getItem('user');
                if (savedUser) {
                    console.log('🔄 Falling back to localStorage user');
                    setUser(JSON.parse(savedUser));
                } else {
                    setUser(null);
                }
            } finally {
                // Only set loading to false if we haven't already done so
                setLoading(false);
                console.log('✅ Auth initialization complete');
            }
        };

        initializeAuth();

        // Listen for auth changes
        const { data: { subscription } } = authApi.onAuthStateChange(async (event, session) => {
            console.log('🔄 Auth state change:', event, session?.user?.id);
            
            if (session?.user) {
                setSupabaseUser(session.user);
                try {
                    const profile = await authApi.getUserProfile(session.user.id);
                    const userData = {
                        id: session.user.id,
                        email: session.user.email,
                        name: profile.name || session.user.user_metadata?.name || 'User',
                        role: profile.role || 'employee'
                    };
                    setUser(userData);
                    localStorage.setItem('user', JSON.stringify(userData));
                    console.log('✅ User profile updated:', userData);
                } catch (error) {
                    console.log('⚠️ No profile found, using session data');
                    const userData = {
                        id: session.user.id,
                        email: session.user.email,
                        name: session.user.user_metadata?.name || 'User',
                        role: 'employee'
                    };
                    setUser(userData);
                    localStorage.setItem('user', JSON.stringify(userData));
                }
            } else {
                // Check if we should clear user data or keep localStorage user
                const savedUser = localStorage.getItem('user');
                if (event === 'SIGNED_OUT' || !savedUser) {
                    console.log('❌ Session ended, clearing user data');
                    setSupabaseUser(null);
                    setUser(null);
                    localStorage.removeItem('user');
                } else {
                    console.log('⚠️ Supabase session lost but keeping localStorage user');
                    setSupabaseUser(null);
                    // Keep the user from localStorage
                }
            }
        });

        return () => {
            subscription?.unsubscribe();
        };
    }, []);

    const login = async (userData) => {
        console.log('🔑 Login attempt:', userData);
        
        if (userData.isDemo) {
            // Demo user login (existing functionality)
            console.log('🎭 Demo user login');
            setUser(userData);
            localStorage.setItem('user', JSON.stringify(userData));
            return userData;
        } else if (userData.isEmployeeOnly) {
            // Employee-only authentication - no fallbacks
            try {
                console.log('🔐 Employee-only authentication attempt');
                const employeeUser = await authApi.signInEmployee(userData.email, userData.password);
                console.log('✅ Employee login successful:', employeeUser);
                
                setUser(employeeUser);
                localStorage.setItem('user', JSON.stringify(employeeUser));
                return employeeUser;
                
            } catch (employeeError) {
                console.error('❌ Employee authentication failed:', employeeError.message);
                throw new Error('Invalid employee email or password. Please check your credentials.');
            }
        } else {
            // NEW PRIORITY: Try admin login first, then employee login
            try {
                console.log('🔐 Attempting admin login first');
                const adminUser = await authApi.signInAdmin(userData.email, userData.password);
                console.log('✅ Admin login successful:', adminUser);
                
                setUser(adminUser);
                localStorage.setItem('user', JSON.stringify(adminUser));
                return adminUser;
                
            } catch (adminError) {
                console.log('⚠️ Admin login failed, trying employee login:', adminError.message);
                
                try {
                    console.log('🔐 Attempting employee login');
                    const employeeUser = await authApi.signInEmployee(userData.email, userData.password);
                    console.log('✅ Employee login successful:', employeeUser);
                    
                    setUser(employeeUser);
                    localStorage.setItem('user', JSON.stringify(employeeUser));
                    return employeeUser;
                    
                } catch (employeeError) {
                    console.log('⚠️ Employee login failed, trying Supabase auth:', employeeError.message);
                    
                    try {
                        // Final fallback to Supabase authentication
                        console.log('🔐 Supabase authentication attempt');
                        const { user: authUser } = await authApi.signIn(userData.email, userData.password);
                        console.log('✅ Supabase auth successful:', authUser);
                        
                        // Immediately set user data to prevent logout on refresh
                        const tempUserData = {
                            id: authUser.id,
                            email: authUser.email,
                            name: authUser.user_metadata?.name || 'User',
                            role: 'admin' // Supabase users are typically admins
                        };
                        setUser(tempUserData);
                        localStorage.setItem('user', JSON.stringify(tempUserData));
                        
                        // User state will be updated via the auth state change listener
                        return authUser;
                    } catch (supabaseError) {
                        console.error('❌ All login methods failed');
                        throw new Error('Invalid email or password');
                    }
                }
            }
        }
    };

    const logout = async () => {
        try {
            if (supabaseUser) {
                await authApi.signOut();
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            setUser(null);
            setSupabaseUser(null);
            localStorage.removeItem('user');
        }
    };

    const isAuthenticated = () => {
        const authenticated = user !== null;
        console.log('🔍 isAuthenticated check:', { user: user, authenticated: authenticated });
        return authenticated;
    };

    const isAdmin = () => {
        const result = user && (user.role === 'admin' || user.role === 'super_admin' || user.isAdmin === true || user.loginType === 'admin');
        console.log('🔍 isAdmin check:', { user: user, role: user?.role, isAdmin: user?.isAdmin, loginType: user?.loginType, result: result });
        return result;
    };

    const isEmployee = () => {
        const result = user && user.role === 'employee';
        console.log('🔍 isEmployee check:', { user: user, role: user?.role, result: result });
        return result;
    };

    return (
        <AuthContext.Provider value={{
            user,
            supabaseUser,
            loading,
            login,
            logout,
            isAuthenticated,
            isAdmin,
            isEmployee
        }}>
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