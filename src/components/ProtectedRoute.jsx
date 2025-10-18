import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import AccessDenied from './ui/AccessDenied';

const ProtectedRoute = ({ children, requiredRole = null, adminOnly = false }) => {
    const { user, isAuthenticated, isAdmin, loading } = useAuth();
    const location = useLocation();

    console.log('🛡️ ProtectedRoute:', { 
        path: location.pathname, 
        user: user, 
        adminOnly: adminOnly, 
        requiredRole: requiredRole, 
        isAdmin: isAdmin(), 
        isAuthenticated: isAuthenticated() 
    });

    if (loading) {
        console.log('⏳ Auth still loading, showing spinner');
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Loading...</span>
            </div>
        );
    }

    if (!isAuthenticated()) {
        console.log('❌ User not authenticated, redirecting to login');
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // If admin only route and user is not admin
    if (adminOnly && !isAdmin()) {
        console.log('❌ Access denied: Admin only route but user is not admin');
        return <AccessDenied />;
    }

    // If specific role required and user doesn't have it
    if (requiredRole && user.role !== requiredRole) {
        console.log('❌ Access denied: Required role not met');
        return <AccessDenied />;
    }

    console.log('✅ Access granted');
    return children;
};

export default ProtectedRoute;