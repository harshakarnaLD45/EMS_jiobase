import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Header from './Header';
import Sidebar from './Sidebar';

const Layout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

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
      <div className="flex flex-col md:pl-[260px]">
        {/* Sticky Header */}
        <Header onMenuClick={() => setSidebarOpen(true)} />
        
        {/* Main Content */}
        <main className="flex-1">
          <div className="max-w-[1920px] mx-auto ">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;