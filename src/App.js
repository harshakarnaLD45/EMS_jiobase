import './App.css';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Layout, ProtectedRoute, RouteHandler } from './components';
import Dashboard from './pages/dashboard/Dashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import EmployeeManagement from './pages/employeeManagement/EmployeeManagement.js';
import Timesheet from './pages/timesheet/timesheet.js';
import Leave from './pages/leave/leave.js';
import Login from './pages/login/Login.jsx';
import ProfilePage from './components/profile-page/page.jsx';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LeaveProvider } from './contexts/LeaveContext';
import { EmployeeProvider } from './contexts/EmployeeContext';
import Attendance from './pages/attendencepage/attendencepage.js';
// import AccountDetails from './pages/Accdetails/accountdetails.js';

const DefaultRedirect = () => {
  const { isAdmin, isEmployee } = useAuth();

  if (isAdmin()) return <Navigate to="/admin" replace />;
  if (isEmployee()) return <Navigate to="/dashboard" replace />;
  return <Navigate to="/dashboard" replace />;
};

function App() {
  return (
    <div className="App">
      <Router>
        <AuthProvider>
          <EmployeeProvider>
            <LeaveProvider>
              <Routes>
                
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
                  <Route path="profile" element={<ProfilePage />} />
                  {/* <Route path="account-details" element={<AccountDetails />} /> */}

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
      </Router>
    </div>
  );
}

export default App;
