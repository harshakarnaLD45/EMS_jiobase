import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

const AccessDenied = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
                <div className="mb-6">
                    <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
                        <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Access Denied
                </h3>
                <p className="text-sm text-gray-500 mb-6">
                    You don't have permission to access this page. This area is restricted to administrators only.
                </p>
                <div className="space-y-3">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                    >
                        Go to Dashboard
                    </button>
                    
                    <p className="text-xs text-gray-400">
                        Logged in as: {user?.name} ({user?.role})
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AccessDenied;