import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const location = useLocation();

  // Handle window resize
  useEffect(() => {
    const handleResize = () => {
      setIsDesktop(window.innerWidth >= 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar on route changes
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Prevent scrolling when mobile sidebar is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
  }, [sidebarOpen]);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Desktop Sidebar - Fixed Position */}
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main Content Area */}
      <div 
        className="flex flex-col" 
        style={{ 
          marginLeft: isDesktop ? '260px' : '0',
          transition: 'margin-left 0.3s ease'
        }}
      >
        {/* Sticky Header */}
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        {/* Main Content */}
        <main className="flex-1">
          <div className="max-w-[1920px] mx-auto px-4 py-6">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;