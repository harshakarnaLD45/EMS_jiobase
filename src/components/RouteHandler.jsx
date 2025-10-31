import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RouteHandler = ({ children }) => {
    const { user, isAdmin, isEmployee } = useAuth();
    const location = useLocation();

    // console.log('🔀 RouteHandler:', { 
    //     path: location.pathname, 
    //     user: user?.email, 
    //     userRole: user?.role,
    //     isAdmin: isAdmin(), 
    //     isEmployee: isEmployee() 
    // });

    // If employee is trying to access admin routes, redirect to dashboard
    if (isEmployee() && (location.pathname.startsWith('/admin') || location.pathname.startsWith('/employees'))) {
        //console.log('🔄 Redirecting employee from admin route to dashboard');
        return <Navigate to="/dashboard" replace />;
    }

    // If admin is accessing root or dashboard, redirect to admin dashboard
    if (isAdmin() && (location.pathname === '/' || location.pathname === '/dashboard')) {
        //console.log('🔄 Redirecting admin to admin dashboard from:', location.pathname);
        return <Navigate to="/admin" replace />;
    }

    return children;
};

export default RouteHandler;