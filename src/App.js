import './App.css';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout, ProtectedRoute, RouteHandler } from './components';
import Dashboard from './pages/dashboard/Dashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import EmployeeManagement from './pages/employeeManagement/EmployeeManagement.js';
import Timesheet from './pages/timesheet/timesheet.js';
import Leave from './pages/leave/leave.js';
import Login from './pages/login/Login.jsx';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LeaveProvider } from './contexts/LeaveContext';
import { EmployeeProvider } from './contexts/EmployeeContext';
import Attendance from './pages/attendencepage/attendencepage.js';

// Component to handle default routing based on user type
const DefaultRedirect = () => {
  const { user, isAdmin, isEmployee } = useAuth();
  
  console.log('🎯 DefaultRedirect - User type check:', {
    user: user?.email,
    isAdmin: isAdmin(),
    isEmployee: isEmployee(),
    userRole: user?.role
  });
  
  // If admin, redirect to admin dashboard
  if (isAdmin()) {
    console.log('✅ Admin detected - redirecting to /admin');
    return <Navigate to="/admin" replace />;
  }
  
  // If employee, redirect to regular dashboard
  if (isEmployee()) {
    console.log('✅ Employee detected - redirecting to /dashboard');
    return <Navigate to="/dashboard" replace />;
  }
  
  // Fallback to dashboard if user type is unclear
  console.log('⚠️ User type unclear - defaulting to /dashboard');
  return <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <div className="App">
      <AuthProvider>
        <EmployeeProvider>
          <LeaveProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              
              {/* Protected Routes */}
              <Route path="/" element={
                <ProtectedRoute>
                  <RouteHandler>
                    <Layout />
                  </RouteHandler>
                </ProtectedRoute>
              }>
                {/* Default redirect - handled by RouteHandler based on user type */}
                <Route index element={<DefaultRedirect />} />
                
                {/* Routes accessible to all authenticated users */}
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="timesheet" element={<Timesheet />} />
                <Route path="leave" element={<Leave />} />
                <Route path="attendance" element={<Attendance />} />
                
                {/* Admin-only routes */}
                <Route path="admin" element={
                  <ProtectedRoute adminOnly={true}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } />
                <Route path="employees" element={
                  <ProtectedRoute adminOnly={true}>
                    <EmployeeManagement />
                  </ProtectedRoute>
                } />
              </Route>
              
              {/* Catch all route */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </LeaveProvider>
        </EmployeeProvider>
      </AuthProvider>
    </div>
  );
}

export default App;
