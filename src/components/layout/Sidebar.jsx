import React, { useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LDLogo from '../../assets/LD_logo.jpeg';

import { LayoutDashboard, Clock, Calendar, X, LogOut, Users } from 'lucide-react';

const Sidebar = ({ open, onClose }) => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

  // Add responsive styles for desktop sidebar
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      @media (min-width: 768px) {
        .desktop-sidebar {
          display: block !important;
        }
        .mobile-close-btn {
          display: none !important;
        }
      }
      @media (max-width: 767px) {
        .desktop-sidebar {
          display: none !important;
        }
        .mobile-close-btn {
          display: block !important;
        }
        .mobile-overlay, .mobile-sidebar {
          display: ${open ? 'block' : 'none'} !important;
        }
      }
    `;
    document.head.appendChild(styleElement);
    
    return () => {
      document.head.removeChild(styleElement);
    };
  }, [open]);

  // Define navigation links based on user role
  const getNavLinks = () => {
    const employeeLinks = [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, isDefault: true },
      { to: "/timesheet", label: "Timesheets", icon: Clock },
      { to: "/leave", label: "Leave Requests", icon: Calendar },
    ];

    const adminLinks = [
      { to: "/admin", label: "Admin Dashboard", icon: LayoutDashboard, isDefault: true },
      { to: "/employees", label: "Manage Employees", icon: Users },
      { to: "/timesheet", label: "Timesheets", icon: Clock },
      { to: "/leave", label: "Leave Requests", icon: Calendar },
    ];

    return isAdmin() ? adminLinks : employeeLinks;
  };

  const navLinks = getNavLinks();

  const handleSignOut = () => {
    logout();
    navigate('/login');
    onClose();
  };

  const sidebarContent = (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Logo & Title */}
      <div style={{ padding: '24px', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="app_logo">
                        <img style={{}} src={LDLogo} alt="Logo" className="logo_image" />
                    </div>
          {/* <span className="text-lg font-semibold text-gray-900">Employee Management</span> */}
        </div>
      </div>

      {/* Mobile Close Button */}
      <button
        onClick={onClose}
        className="mobile-close-btn"
        style={{ 
          display: 'none',
          position: 'absolute',
          top: '24px',
          right: '24px',
          padding: '8px',
          borderRadius: '8px',
          border: 'none',
          background: 'transparent',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => e.target.style.backgroundColor = '#f3f4f6'}
        onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
        aria-label="Close menu"
      >
        <X style={{ width: '24px', height: '24px', color: '#6b7280' }} />
      </button>

      {/* Navigation */}
      <nav style={{ flex: '1', padding: '24px 12px', overflowY: 'auto' }}>
        {navLinks.map(({ to, label, icon: Icon, isDefault }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => {
              console.log('📍 Navigating to:', to, 'User role:', user?.role);
              onClose();
            }}
            className={({ isActive }) =>
              `${isActive ? 'active-nav-link bodyMediumText3' : 'nav-link bodyRegularText4 '}`
            }
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              padding: '12px 16px',
              borderRadius: '8px',
              transition: 'all 0.2s',
              textDecoration: 'none',
              marginBottom: '4px',
              backgroundColor: isActive ? '#eff6ff' : 'transparent',
              color: isActive ? '#1d4ed8' : '#374151'
            })}
            onMouseEnter={(e) => {
              if (!e.target.closest('a').classList.contains('active-nav-link')) {
                e.target.closest('a').style.backgroundColor = '#f9fafb';
              }
            }}
            onMouseLeave={(e) => {
              if (!e.target.closest('a').classList.contains('active-nav-link')) {
                e.target.closest('a').style.backgroundColor = 'transparent';
              }
            }}
          >
            <Icon style={{ width: '20px', height: '20px', marginRight: '12px' }} />
            {label}
            {isDefault && <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#3b82f6' }}></span>}
          </NavLink>
        ))}
      </nav>

      {/* Profile & Sign Out */}
      <div style={{ padding: '24px', borderTop: '1px solid #e5e7eb' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
          <div style={{ 
            width: '40px', 
            height: '40px', 
            borderRadius: '50%', 
            backgroundColor: '#dbeafe', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center' 
          }}>
            <span style={{ color: '#2563eb', fontWeight: '500' }}>
              {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
            </span>
          </div>
          <div style={{ flex: '1' }}>
            <h3 className=" bodyMediumText4" style={{marginBottom:'0px', fontSize: '14px', fontWeight: '500', color: '#111827'}}>{user?.name || 'User'}</h3>
            <p className=" bodyRegularText5" style={{ fontSize: '12px', color: '#6b7280', margin: 0 }}>
              {user?.role === 'admin' ? 'Administrator' : 'Employee'} • {user?.role === 'admin' ? 'Management' : 'Staff'}
            </p>
          </div>
        </div>
        <button  className=" bodyRegularText4"
          onClick={handleSignOut}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            padding: '8px 16px',
            borderRadius: '8px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: '14px',
            color: '#374151',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => e.target.style.backgroundColor = '#f9fafb'}
          onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
        >
          <LogOut style={{ width: '16px', height: '16px', marginRight: '12px' }} />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside 
        style={{
          display: 'none',
          position: 'fixed',
          top: 0,
          left: 0,
          width: '256px',
          height: '100vh',
          backgroundColor: 'white',
          borderRight: '1px solid #e5e7eb',
          zIndex: 50
        }}
        className="desktop-sidebar"
        aria-label="Sidebar"
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      {open && (
        <>
          <div 
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              zIndex: 40,
              display: 'block'
            }}
            className="mobile-overlay"
            onClick={onClose}
            aria-hidden="true"
          />
          <aside
            style={{
              position: 'fixed',
              top: 0,
              bottom: 0,
              left: 0,
              width: '256px',
              backgroundColor: 'white',
              zIndex: 50,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
            className="mobile-sidebar"
            aria-label="Sidebar"
          >
            {sidebarContent}
          </aside>
        </>
      )}
    </>
  );
};

export default Sidebar;