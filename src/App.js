import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
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

// ===============================
// Default Redirect Component
// ===============================
const DefaultRedirect = () => {
  const { user, isAdmin, isEmployee } = useAuth();

  // Determine where to send the user after login
  if (isAdmin()) {
    return <Navigate to="/admin" replace />;
  }

  if (isEmployee()) {
    return <Navigate to="/dashboard" replace />;
  }

  // Fallback redirect
  return <Navigate to="/dashboard" replace />;
};

// ===============================
// App Component
// ===============================
function App() {
  return (
    <div className="App">
      {/* ✅ Wrap everything with BrowserRouter */}
     
        <AuthProvider>
          <EmployeeProvider>
            <LeaveProvider>
              <Routes>
                {/* ---------- Public Route ---------- */}
                <Route path="/login" element={<Login />} />

                {/* ---------- Protected Routes ---------- */}
                <Route
                  path="/"
                  element={
                    <ProtectedRoute>
                      <RouteHandler>
                        <Layout />
                      </RouteHandler>
                    </ProtectedRoute>
                  }
                >
                  {/* Default Redirect (based on role) */}
                  <Route index element={<DefaultRedirect />} />

                  {/* Common Routes (for all logged-in users) */}
                  <Route path="dashboard" element={<Dashboard />} />
                  <Route path="timesheet" element={<Timesheet />} />
                  <Route path="leave" element={<Leave />} />
                  <Route path="attendance" element={<Attendance />} />

                  {/* Admin-only Routes */}
                  <Route
                    path="admin"
                    element={
                      <ProtectedRoute adminOnly={true}>
                        <AdminDashboard />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="employees"
                    element={
                      <ProtectedRoute adminOnly={true}>
                        <EmployeeManagement />
                      </ProtectedRoute>
                    }
                  />
                </Route>

                {/* ---------- Catch-all Route ---------- */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </LeaveProvider>
          </EmployeeProvider>
        </AuthProvider>
     
    </div>
  );
}

export default App;
