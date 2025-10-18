import React, { useEffect } from 'react';
import { Plus, Clock, Menu } from 'lucide-react';

const Header = ({ onMenuClick }) => {
  // Add responsive styles for mobile menu button and padding
  useEffect(() => {
    const styleElement = document.createElement('style');
    styleElement.textContent = `
      @media (min-width: 768px) {
        .mobile-menu-btn {
          display: none !important;
        }
        .header-container {
          padding: 0 24px !important;
        }
      }
      @media (max-width: 767px) {
        .mobile-menu-btn {
          display: block !important;
        }
        .header-container {
          padding: 0 16px !important;
        }
      }
    `;
    document.head.appendChild(styleElement);
    
    return () => {
      if (document.head.contains(styleElement)) {
        document.head.removeChild(styleElement);
      }
    };
  }, []);
  return (
    <header
      role="banner"
      style={{
        position: 'sticky',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height: '64px',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(255,255,255,0.7)'
      }}
    >
      <div 
        className="header-container"
        style={{ 
          height: '100%', 
          padding: '0 16px', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between', 
          borderBottom: '1px solid rgba(229, 231, 235, 0.8)' 
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <button
            onClick={onMenuClick}
            style={{
              display: 'none',
              padding: '8px',
              borderRadius: '8px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            className="mobile-menu-btn"
            onMouseEnter={(e) => e.target.style.backgroundColor = 'rgba(243, 244, 246, 0.5)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
            aria-label="Toggle menu"
          >
            <Menu style={{ width: '24px', height: '24px', color: '#6b7280' }} />
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} className="bodyRegularText4">Welcome back
            {/* <span className="text-lg text-gray-800 font-bold">John</span> */}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;