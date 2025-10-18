import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Login.css';
import LDLogo from '../../assets/LD_logo.jpeg';

const Login = () => {
    const [credentials, setCredentials] = useState({
        email: '',
        password: ''
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    
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
        setError(''); // Clear error when user types
    };

    // No demo users - authenticate only via employee table

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        try {
            // Try admin authentication first, then employee authentication
            console.log('🔐 Attempting authentication (admin priority)...');
            const user = await login({
                email: credentials.email,
                password: credentials.password
                // No isEmployeeOnly flag - let AuthContext handle admin priority
            });
            
            // Show success message based on user type
            if (user.loginType === 'admin' || user.isAdmin || user.role === 'admin' || user.role === 'super_admin') {
                console.log('✅ Admin login successful - will redirect to admin dashboard');
            } else {
                console.log('✅ Employee login successful - will redirect to employee dashboard');
            }
            
            // Navigate to root and let DefaultRedirect component handle the routing
            navigate(from === '/' ? '/' : from, { replace: true });
        } catch (error) {
            console.error('Authentication error:', error);
            setError(error.message || 'Invalid email or password. Please check your credentials.');
        } finally {
            setLoading(false);
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
                        Manage your employee and admin information </p>
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
                    
                    <div className="auth_info" style={{ 
                        marginBottom: '1rem', 
                        padding: '0.75rem',
                        backgroundColor: '#f0fdf4',
                        border: '1px solid #bbf7d0',
                        borderRadius: '0.375rem',
                        fontSize: '0.875rem'
                    }}>
                        <strong>🔐 Admin & Employee Authentication:</strong><br/>
                        Use your admin or employee email and password. Admin login takes priority.<br/>
                        <em style={{ color: '#6b7280' }}>Admin: anitha.boppidi@ldintertech.com  pass:- Anith@EMS26_admin  <br/> Employee: harsha.karna@ldintertech.com  pass:- 0WJs8Ibxwt</em>
                    </div>
                    
                    <div className="form_group">
                        <label htmlFor="email " className='bodyMediumText4'>Email Address</label>
                        <input className='bodyRegularText5'
                            type="email"
                            id="email"
                            name="email"
                            value={credentials.email}
                            onChange={handleChange}
                            placeholder="Enter your admin or employee email address"
                            required
                            disabled={loading}
                        />
                    </div>

                    <div className="form_group">
                        <label htmlFor="password" className='bodyMediumText4' >Password</label>
                        <input className='bodyRegularText5'
                            type="password"
                            id="password"
                            name="password"
                            value={credentials.password}
                            onChange={handleChange}
                            placeholder="Enter your password"
                            required
                            disabled={loading}
                        />
                    </div>

                    <button type="submit" className="login_button bodyMediumText3 " disabled={loading}>
                        {loading ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;