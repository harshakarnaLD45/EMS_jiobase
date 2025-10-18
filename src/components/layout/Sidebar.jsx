import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LDLogo from '../../assets/LD_logo.jpeg';

import { LayoutDashboard, Clock, Calendar, X, LogOut, Users } from 'lucide-react';

const Sidebar = ({ open, onClose }) => {
  const { user, isAdmin, logout } = useAuth();
  const navigate = useNavigate();

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
    <div className="h-full flex flex-col">
      {/* Logo & Title */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="app_logo">
                        <img style={{}} src={LDLogo} alt="Logo" className="logo_image" />
                    </div>
          {/* <span className="text-lg font-semibold text-gray-900">Employee Management</span> */}
        </div>
      </div>

      {/* Mobile Close Button */}
      <button
        onClick={onClose}
        className="md:hidden absolute top-6 right-6 p-2 hover:bg-gray-100 rounded-lg"
        aria-label="Close menu"
      >
        <X className="w-6 h-6 text-gray-600" />
      </button>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-6 space-y-1 overflow-y-auto">
        {navLinks.map(({ to, label, icon: Icon, isDefault }) => (
          <NavLink
            key={to}
            to={to}
            onClick={() => {
              console.log('📍 Navigating to:', to, 'User role:', user?.role);
              onClose();
            }}
            className={({ isActive }) =>
              `flex items-center px-4 py-3 rounded-lg transition-colors ${
                isActive 
                  ? 'bg-blue-50 bodyMediumText3' 
                  : 'hover:bg-gray-50 bodyRegularText4'
              }`
            }
          >
            <Icon className="w-5 h-5 mr-3" />
            {label}
            {isDefault && <span className="ml-auto text-xs text-blue-500"></span>}
          </NavLink>
        ))}
      </nav>

      {/* Profile & Sign Out */}
      <div className="p-6 border-t border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-blue-600 font-medium ">
              {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U'}
            </span>
          </div>
          <div className="">
            <h3 className=" bodyMediumText4" style={{marginBottom:'0px !important'}}>{user?.name || 'User'}</h3>
            <p className=" bodyRegularText5">
              {user?.role === 'admin' ? 'Administrator' : 'Employee'} • {user?.role === 'admin' ? 'Management' : 'Staff'}
            </p>
          </div>
        </div>
        <button 
          onClick={handleSignOut}
          className="w-full flex items-center px-4 py-2  hover:bg-gray-50 rounded-lg bodyRegularText4"
        >
          <LogOut className="w-4 h-4 mr-3" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <aside 
        className="hidden md:block fixed  left-0 w-64 h-screen bg-white border-r border-gray-200 z-50"
        aria-label="Sidebar"
      >
        {sidebarContent}
      </aside>

      {/* Mobile Sidebar */}
      {open && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 z-40 md:hidden" 
            onClick={onClose}
            aria-hidden="true"
          />
          <aside
            className="fixed inset-y-0 left-0 w-64 bg-white z-50 md:hidden shadow-xl"
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