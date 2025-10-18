import React from 'react';
import { Plus, Clock, Menu } from 'lucide-react';

const Header = ({ onMenuClick }) => {
  return (
    <header
      role="banner"
      className="sticky top-0 left-0 right-0 z-50 h-16"
      style={{
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        backgroundColor: 'rgba(255,255,255,0.7)'
      }}
    >
      <div className="h-full px-4 md:px-6 flex items-center justify-between border-b border-gray-200/80">
        <div className="flex items-center gap-4">
          <button
            onClick={onMenuClick}
            className="md:hidden p-2 hover:bg-gray-100/50 rounded-lg"
            aria-label="Toggle menu"
          >
            <Menu className="w-6 h-6 text-gray-600" />
          </button>
          <div className="flex items-center gap-3 bodyRegularText4">Welcome back
            {/* <span className="text-lg text-gray-800 font-bold">John</span> */}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;