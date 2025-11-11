import React, { useState, useEffect } from 'react'; 
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Login.css';
import LDLogo from '../../assets/LD_logo.jpeg';
import { Eye, EyeOff } from 'lucide-react'; // Icons for toggle

const Login = () => {
    const [credentials, setCredentials] = useState({
        email: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false); // toggle
    const [showForgotPassword, setShowForgotPassword] = useState(false); // forgot password modal
    const [resetEmail, setResetEmail] = useState('');
    const [resetLoading, setResetLoading] = useState(false);
    const [resetSuccess, setResetSuccess] = useState('');
    const [resetError, setResetError] = useState('');

    const { login, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    
    const from = location.state?.from?.pathname || '/';

    useEffect(() => {
        if (isAuthenticated()) {
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, navigate, from]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCredentials(prev => ({
            ...prev,
            [name]: value
        }));
        setError(''); // Clear error
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            const user = await login({
                email: credentials.email,
                password: credentials.password
            });
            
            navigate(from === '/' ? '/' : from, { replace: true });
        } catch (error) {
            console.error('Authentication error:', error);
            setError(error.message || 'Invalid email or password. Please check your credentials.');
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPasswordClick = () => {
        setShowForgotPassword(true);
        setResetEmail('');
        setResetError('');
        setResetSuccess('');
    };

    const handleCloseForgotPassword = () => {
        setShowForgotPassword(false);
        setResetEmail('');
        setResetError('');
        setResetSuccess('');
    };

    const handleResetPasswordSubmit = async (e) => {
        e.preventDefault();
        setResetLoading(true);
        setResetError('');
        setResetSuccess('');

        try {
            // Add your password reset API call here
            // Example: await resetPassword(resetEmail);
            
            // Simulated API call - replace with your actual API
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            setResetSuccess('Password reset link has been sent to your email address. Please check your inbox.');
            
            // Close modal after 3 seconds
            setTimeout(() => {
                handleCloseForgotPassword();
            }, 3000);
        } catch (error) {
            console.error('Password reset error:', error);
            setResetError(error.message || 'Failed to send reset link. Please try again.');
        } finally {
            setResetLoading(false);
        }
    };

    return (
        <div className="login_container">
            <div className="login_card">
                <div className="login_header">
                    <div className="app_logo">
                        <img src={LDLogo} alt="Logo" className="logo_image" />
                    </div>
                    <h1 className="app_title bodyMediumText2">Employment Management</h1>
                    <p className="login_subtitle bodyRegularText4">
                        Manage your employee and admin information
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="login_form">
                    {error && (
                        <div className="error_message" style={{ 
                            color: '#ef4444', 
                            marginBottom: '1rem', 
                            padding: '0.5rem',
                            backgroundColor: '#fef2f2',
                            border: '1px solid #fecaca',
                            borderRadius: '0.375rem'
                        }}>
                            {error}
                        </div>
                    )}

                    <div className="form_group">
                        <label htmlFor="email" className='bodyMediumText4'>Email Address</label>
                        <input
                            type="email"
                            id="email"
                            name="email"
                            value={credentials.email}
                            onChange={handleChange}
                            placeholder="Enter your admin or employee email address"
                            required
                            disabled={loading}
                            className='bodyRegularText5'
                        />
                    </div>

                    <div className="form_group">
                        <label htmlFor="password" className='bodyMediumText4'>Password</label>
                        <div style={{ position: 'relative' }}>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                name="password"
                                value={credentials.password}
                                onChange={handleChange}
                                placeholder="Enter your password"
                                required
                                disabled={loading}
                                className='bodyRegularText5'
                                style={{ width: '100%', paddingRight: '2.5rem', boxSizing: 'border-box' }}
                            />
                            <span
                                style={{
                                    position: 'absolute',
                                    right: '0.5rem',
                                    top: '50%',
                                    transform: 'translateY(-50%)',
                                    cursor: 'pointer',
                                    color: '#6b7280'
                                }}
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </span>
                        </div>
                    </div>

                    <div style={{ 
                        textAlign: 'right', 
                        marginTop: '-0.5rem', 
                        marginBottom: '1rem' 
                    }}>
                        <button
                            type="button"
                            onClick={handleForgotPasswordClick}
                            style={{
                                background: 'none',
                                border: 'none',
                                color: '#2563eb',
                                cursor: 'pointer',
                                fontSize: '0.875rem',
                                textDecoration: 'none',
                                padding: 0
                            }}
                            onMouseOver={(e) => e.target.style.textDecoration = 'underline'}
                            onMouseOut={(e) => e.target.style.textDecoration = 'none'}
                        >
                            Forgot Password?
                        </button>
                    </div>

                    <button type="submit" className="login_button bodyMediumText3" disabled={loading}>
                        {loading ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>
            </div>

            {/* Forgot Password Modal */}
            {showForgotPassword && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        backgroundColor: 'white',
                        borderRadius: '0.5rem',
                        padding: '2rem',
                        maxWidth: '450px',
                        width: '90%',
                        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
                    }}>
                        <h2 style={{
                            fontSize: '1.5rem',
                            fontWeight: '600',
                            marginBottom: '0.5rem',
                            color: '#111827'
                        }}>
                            Reset Password
                        </h2>
                        <p style={{
                            color: '#6b7280',
                            fontSize: '0.875rem',
                            marginBottom: '1.5rem'
                        }}>
                            Enter your email address and we'll send you a link to reset your password.
                        </p>

                        {resetSuccess && (
                            <div style={{
                                color: '#10b981',
                                marginBottom: '1rem',
                                padding: '0.75rem',
                                backgroundColor: '#f0fdf4',
                                border: '1px solid #bbf7d0',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem'
                            }}>
                                {resetSuccess}
                            </div>
                        )}

                        {resetError && (
                            <div style={{
                                color: '#ef4444',
                                marginBottom: '1rem',
                                padding: '0.75rem',
                                backgroundColor: '#fef2f2',
                                border: '1px solid #fecaca',
                                borderRadius: '0.375rem',
                                fontSize: '0.875rem'
                            }}>
                                {resetError}
                            </div>
                        )}

                        <form onSubmit={handleResetPasswordSubmit}>
                            <div className="form_group" style={{ marginBottom: '1.5rem' }}>
                                <label htmlFor="resetEmail" className='bodyMediumText4' style={{ 
                                    display: 'block', 
                                    marginBottom: '0.5rem' 
                                }}>
                                    Email Address
                                </label>
                                <input
                                    type="email"
                                    id="resetEmail"
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                    placeholder="Enter your email address"
                                    required
                                    disabled={resetLoading}
                                    className='bodyRegularText5'
                                    style={{
                                        width: '100%',
                                        padding: '0.625rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.375rem',
                                        fontSize: '0.875rem',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            </div>

                            <div style={{
                                display: 'flex',
                                gap: '0.75rem',
                                justifyContent: 'flex-end'
                            }}>
                                <button
                                    type="button"
                                    onClick={handleCloseForgotPassword}
                                    disabled={resetLoading}
                                    style={{
                                        padding: '0.625rem 1.25rem',
                                        border: '1px solid #d1d5db',
                                        borderRadius: '0.375rem',
                                        backgroundColor: 'white',
                                        color: '#374151',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                        fontWeight: '500'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={resetLoading}
                                    style={{
                                        padding: '0.625rem 1.25rem',
                                        border: 'none',
                                        borderRadius: '0.375rem',
                                        backgroundColor: '#2563eb',
                                        color: 'white',
                                        cursor: resetLoading ? 'not-allowed' : 'pointer',
                                        fontSize: '0.875rem',
                                        fontWeight: '500',
                                        opacity: resetLoading ? 0.6 : 1
                                    }}
                                >
                                    {resetLoading ? 'Sending...' : 'Send Reset Link'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Login;