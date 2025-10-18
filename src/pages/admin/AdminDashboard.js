import React, { useState, useEffect } from 'react';
import { Users, Calendar, AlertTriangle, UserPlus, FileText, RefreshCw } from 'lucide-react';
import { adminApi, leaveApi } from '../../utils/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { AddEmployeeForm } from '../../components';
import './AdminDashboard.css';
import * as Dialog from '@radix-ui/react-dialog';

const AdminDashboard = () => {
    const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
    const [dashboardStats, setDashboardStats] = useState({
        totalEmployees: { count: 0, change: '+0 this month' },
        activeToday: { count: 0, rate: 'Loading...' },
        onLeave: { count: 0, details: 'Loading...' },
        pendingApprovals: { count: 0, details: 'Loading...' }
    });
    const [recentActivity, setRecentActivity] = useState([]);
    const [pendingTimesheets, setPendingTimesheets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user } = useAuth();

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            console.log('🚀 Starting to load dashboard data...');
            
            // Debug database connection first
            try {
                const debugResult = await adminApi.debugDatabase();
                console.log('🔍 Database debug result:', debugResult);
            } catch (debugError) {
                console.error('⚠️ Debug failed:', debugError);
            }
            
            // Fetch employees and admins data directly (same as Employee Management)
            let allStaff, activity, leaveRequests, timesheets;
            
            try {
                console.log('👥 Fetching all staff (employees + admins)...');
                allStaff = await adminApi.getAllEmployeesAndAdmins();
                console.log('✅ Staff data loaded:', allStaff?.length || 0);
                console.log('📋 Sample staff data:', allStaff?.slice(0, 2));
                
                if (!allStaff || allStaff.length === 0) {
                    console.warn('⚠️ No staff data returned - checking individual tables...');
                    
                    // Try fetching employees directly
                    const { employeeApi } = await import('../../utils/supabase');
                    const employees = await employeeApi.getEmployees();
                    console.log('📊 Direct employees query:', employees?.length || 0);
                    
                    // Try fetching admins directly
                    const admins = await adminApi.getAdmins();
                    console.log('👑 Direct admins query:', admins?.length || 0);
                    
                    allStaff = [...(employees || []), ...(admins || [])];
                }
            } catch (staffError) {
                console.error('❌ Error loading staff data:', staffError);
                setError(`Staff loading failed: ${staffError.message}`);
                allStaff = [];
            }

            try {
                console.log('📋 Fetching leave requests...');
                const { supabase } = await import('../../utils/supabase');
                const { data: leaves, error: leaveError } = await supabase
                    .from('leave_requests')
                    .select('*');
                
                if (leaveError) {
                    console.error('❌ Leave requests error:', leaveError);
                    throw leaveError;
                }
                
                leaveRequests = leaves || [];
                console.log('✅ Leave requests loaded:', leaveRequests.length);
                console.log('📋 Sample leave request:', leaveRequests[0]);
            } catch (leaveError) {
                console.error('❌ Error loading leave requests:', leaveError);
                setError(`Leave requests failed: ${leaveError.message}`);
                leaveRequests = [];
            }

            try {
                console.log('⏰ Fetching timesheets...');
                const { supabase } = await import('../../utils/supabase');
                const { data: timesheetData, error: timesheetError } = await supabase
                    .from('timesheets')
                    .select('*');
                
                if (timesheetError) {
                    console.error('❌ Timesheets error:', timesheetError);
                    throw timesheetError;
                }
                
                timesheets = timesheetData || [];
                console.log('✅ Timesheets loaded:', timesheets.length);
                console.log('📋 Sample timesheet:', timesheets[0]);
            } catch (timesheetError) {
                console.error('❌ Error loading timesheets:', timesheetError);
                setError(`Timesheets failed: ${timesheetError.message}`);
                timesheets = [];
            }

            // Calculate stats from the fetched data
            const currentMonth = new Date().toISOString().slice(0, 7);
            const today = new Date().toISOString().slice(0, 10);
            
            // Filter data
            const employees = allStaff.filter(staff => staff.role === 'employee' || !staff.isAdmin);
            const admins = allStaff.filter(staff => staff.role === 'admin' || staff.isAdmin);
            
            const pendingLeaves = leaveRequests.filter(req => 
                !req.status || req.status === 'pending' || req.status === null
            );
            const approvedLeaves = leaveRequests.filter(req => req.status === 'approved');
            const activeLeaves = approvedLeaves.filter(req => 
                req.start_date <= today && req.end_date >= today
            );
            
            // Get employee IDs who are currently on leave
            const employeeIdsOnLeave = activeLeaves.map(leave => leave.employee_id || leave.user_id);
            
            // Calculate staff who are active today (not on leave and with active status)
            const activeStaffToday = allStaff.filter(staff => {
                // Must have active status
                const hasActiveStatus = !staff.status || 
                                      staff.status === 'active' || 
                                      staff.status === 'Active';
                
                // Must NOT be on leave today
                const isNotOnLeave = !employeeIdsOnLeave.includes(staff.id) && 
                                   !employeeIdsOnLeave.includes(staff.employee_id);
                
                return hasActiveStatus && isNotOnLeave;
            });
            
            // Also count people with active status from database (for total active count)
            const activeStaff = allStaff.filter(staff => 
                !staff.status || staff.status === 'active' || staff.status === 'Active'
            );
            // Filter pending timesheets - match database query logic
            const pendingTimesheets = timesheets.filter(ts => 
                !ts.status || ts.status === 'pending' || ts.status === 'submitted' || ts.status === null
            );
            
            console.log('🔍 Timesheet status debugging:');
            console.log('   - Total timesheets fetched:', timesheets.length);
            console.log('   - All timesheets:', timesheets.map(ts => ({ 
                id: ts.id, 
                status: ts.status, 
                status_type: typeof ts.status,
                employee_id: ts.employee_id, 
                date: ts.date,
                hours: ts.hours 
            })));
            console.log('   - Pending timesheets after filter:', pendingTimesheets.length);
            console.log('   - Pending timesheet details:', pendingTimesheets.map(ts => ({ 
                id: ts.id, 
                status: ts.status, 
                employee_id: ts.employee_id,
                date: ts.date 
            })));
            
            const newStaffThisMonth = allStaff.filter(staff => 
                staff.created_at && staff.created_at.startsWith(currentMonth)
            ).length;

            // Debug the filtering
            console.log('🔍 Debug filtering results:');
            console.log('   - All staff:', allStaff?.length || 0);
            console.log('   - Employees:', employees?.length || 0);
            console.log('   - Admins:', admins?.length || 0);
            console.log('   - Active staff (by status):', activeStaff?.length || 0);
            console.log('   - Staff on leave today:', activeLeaves?.length || 0);
            console.log('   - Employee IDs on leave:', employeeIdsOnLeave);
            console.log('   - Active staff today (calculated):', activeStaffToday?.length || 0);
            console.log('   - Active staff today details:', activeStaffToday?.map(s => ({ 
                id: s.id, 
                name: s.name, 
                status: s.status, 
                role: s.role 
            })));
            console.log('   - Leave requests:', leaveRequests?.length || 0);
            console.log('   - Pending leaves:', pendingLeaves?.length || 0);
            console.log('   - Approved leaves:', approvedLeaves?.length || 0);
            console.log('   - Active leaves today:', activeLeaves?.length || 0);
            console.log('   - Timesheets:', timesheets?.length || 0);
            console.log('   - Pending timesheets:', pendingTimesheets?.length || 0);

            const stats = {
                totalStaff: allStaff?.length || 0,
                totalEmployees: allStaff?.length || 0, // For compatibility
                employeesCount: employees?.length || 0,
                adminsCount: admins?.length || 0,
                activeStaff: activeStaff?.length || 0,
                activeStaffToday: activeStaffToday?.length || 0,
                newStaffThisMonth: newStaffThisMonth || 0,
                pendingRequests: pendingLeaves?.length || 0,
                approvedLeaves: approvedLeaves?.length || 0,
                staffOnLeave: activeLeaves?.length || 0,
                pendingTimesheets: pendingTimesheets?.length || 0
            };
            
            console.log('📊 Final calculated stats:', stats);
            
            if (stats.totalStaff === 0) {
                console.error('🚨 No staff data found! This indicates a database connection issue.');
                setError('No staff data found. Please check database connection and tables.');
            }

            // Use the leave requests we already fetched as activity
            activity = leaveRequests.map(req => {
                // Find employee/admin info from our staff data
                const staffMember = allStaff.find(staff => 
                    staff.employee_id === req.employee_id || 
                    staff.id === req.employee_id ||
                    staff.id === req.user_id
                );
                
                return {
                    ...req,
                    employees: staffMember ? {
                        name: staffMember.name,
                        email: staffMember.email,
                        role: staffMember.role
                    } : null
                };
            });
            
            console.log('📋 Processed activity with staff info:', activity.length);
            
            // Process pending timesheets with employee info
            const enrichedTimesheets = pendingTimesheets.map(timesheet => {
                // Find employee/admin info from our staff data
                const staffMember = allStaff.find(staff => 
                    staff.employee_id === timesheet.employee_id || 
                    staff.id === timesheet.employee_id ||
                    staff.id === timesheet.user_id
                );
                
                return {
                    ...timesheet,
                    employee_name: staffMember ? staffMember.name : `Employee ${timesheet.employee_id || 'Unknown'}`
                };
            });
            
            console.log('⏰ Processed timesheets with staff info:', enrichedTimesheets.length);
            console.log('📋 Enriched timesheets data:', enrichedTimesheets);
            setPendingTimesheets(enrichedTimesheets);
            
            // Final verification - compare stats vs actual state
            console.log('🏁 Final verification:');
            console.log('   - Stats pending timesheets:', stats.pendingTimesheets);
            console.log('   - Actual pending timesheets being set:', enrichedTimesheets.length);
            
            setDashboardStats({
                totalEmployees: {
                    count: stats.totalStaff,
                    change: `+${stats.newStaffThisMonth} this month (${stats.employeesCount} emp + ${stats.adminsCount} admin)`
                },
                activeToday: {
                    count: stats.activeStaffToday,
                    rate: stats.totalStaff > 0 ? 
                        `${Math.round((stats.activeStaffToday / stats.totalStaff) * 100)}% attendance` : 
                        '0% attendance'
                },
                onLeave: {
                    count: stats.staffOnLeave,
                    details: stats.staffOnLeave > 0 ? 
                        `${stats.staffOnLeave} currently on leave` : 
                        'No one on leave today'
                },
                pendingApprovals: {
                    count: stats.pendingRequests + stats.pendingTimesheets,
                    details: stats.pendingRequests > 0 || stats.pendingTimesheets > 0 ?
                        `${stats.pendingRequests} leave requests + ${stats.pendingTimesheets} timesheets` : 
                        'All items processed'
                }
            });
            
            console.log('🎯 Setting recent activity:', activity);
            setRecentActivity(activity || []);
            
            if (activity && activity.length > 0) {
                console.log('✅ Successfully loaded real data from Supabase');
            } else {
                console.log('⚠️ No activity data found - this might be expected if no leave requests exist');
                setError('No leave requests found in database.');
            }
            
        } catch (error) {
            console.error('❌ Critical error loading dashboard data:', error);
            setError(`Failed to load data: ${error.message}`);
            
            // Set fallback empty stats to prevent undefined errors
            setDashboardStats({
                totalEmployees: { count: 0, change: 'Database connection error' },
                activeToday: { count: 0, rate: 'Unable to calculate' },
                onLeave: { count: 0, details: 'Data unavailable' },
                pendingApprovals: { count: 0, details: 'Cannot load requests' }
            });
            
            setRecentActivity([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            loadDashboardData();
        }
    }, [user]);

    const [actionLoading, setActionLoading] = useState(null); // Track which action is loading

    const handleApproveRequest = async (requestId) => {
        try {
            setActionLoading(requestId);
            await adminApi.approveLeaveRequest(requestId);
            await loadDashboardData(); // Refresh data
            setError('Leave request approved successfully!');
            setTimeout(() => setError(null), 3000); // Clear success message
        } catch (error) {
            console.error('Failed to approve request:', error);
            setError(`Failed to approve request: ${error.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectRequest = async (requestId, reason = '') => {
        try {
            setActionLoading(requestId);
            await adminApi.rejectLeaveRequest(requestId, reason);
            await loadDashboardData(); // Refresh data
            setError('Leave request rejected!');
            setTimeout(() => setError(null), 3000); // Clear success message
        } catch (error) {
            console.error('Failed to reject request:', error);
            setError(`Failed to reject request: ${error.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleApproveTimesheet = async (timesheetId) => {
        try {
            setActionLoading(timesheetId);
            
            // Import timesheetApi to update timesheet status
            const { timesheetApi } = await import('../../utils/supabase');
            await timesheetApi.updateTimesheet(timesheetId, { status: 'approved' });
            
            await loadDashboardData(); // Refresh data
            setError('Timesheet approved successfully!');
            setTimeout(() => setError(null), 3000); // Clear success message
        } catch (error) {
            console.error('Failed to approve timesheet:', error);
            setError(`Failed to approve timesheet: ${error.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    const handleRejectTimesheet = async (timesheetId, reason = '') => {
        try {
            setActionLoading(timesheetId);
            
            // Import timesheetApi to update timesheet status
            const { timesheetApi } = await import('../../utils/supabase');
            await timesheetApi.updateTimesheet(timesheetId, { 
                status: 'rejected',
                rejection_reason: reason 
            });
            
            await loadDashboardData(); // Refresh data
            setError('Timesheet rejected!');
            setTimeout(() => setError(null), 3000); // Clear success message
        } catch (error) {
            console.error('Failed to reject timesheet:', error);
            setError(`Failed to reject timesheet: ${error.message}`);
        } finally {
            setActionLoading(null);
        }
    };

    // Format pending requests for display (show all if no status field)
    const pendingRequests = recentActivity
        .filter(req => !req.status || req.status === 'pending' || req.status === null || req.status === '')
        .slice(0, 5)
        .map(req => {
            // Handle different employee name formats
            let employeeName = 'Unknown Employee';
            if (req.employees) {
                if (req.employees.name) {
                    employeeName = req.employees.name;
                } else if (req.employees.first_name && req.employees.last_name) {
                    employeeName = `${req.employees.first_name} ${req.employees.last_name}`;
                } else if (req.employees.first_name) {
                    employeeName = req.employees.first_name;
                }
            }

            // Calculate days if not provided
            let days = req.days;
            if (!days && req.start_date && req.end_date) {
                const start = new Date(req.start_date);
                const end = new Date(req.end_date);
                days = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
            }

            return {
                id: req.id,
                name: employeeName,
                type: req.leave_type?.charAt(0).toUpperCase() + req.leave_type?.slice(1) + ' Leave' || 'Leave',
                date: req.start_date && req.end_date 
                    ? `${new Date(req.start_date).toLocaleDateString()} - ${new Date(req.end_date).toLocaleDateString()}`
                    : 'Date not available',
                duration: `${days || 1} day${(days || 1) > 1 ? 's' : ''}`,
                rawData: req
            };
        });

    // Debug function - available in browser console as window.debugEmployeeData()
    React.useEffect(() => {
        window.debugEmployeeData = async () => {
            console.log('🔍 Starting employee data debug...');
            
            try {
                // Test direct queries
                console.log('📊 Testing direct database queries...');
                await adminApi.debugDatabase();
                
                // Test employee name function
                console.log('👤 Testing employee name function...');
                if (recentActivity && recentActivity.length > 0) {
                    const firstRequest = recentActivity[0];
                    if (firstRequest.rawData?.user_id) {
                        const employeeName = await adminApi.getEmployeeName(firstRequest.rawData.user_id);
                        console.log('✅ Employee name result:', employeeName);
                    }
                }
                
                console.log('📋 Current recentActivity state:', recentActivity);
                console.log('📋 Current pendingRequests:', pendingRequests);
                
            } catch (error) {
                console.error('❌ Debug function error:', error);
            }
        };
        
        return () => {
            delete window.debugEmployeeData;
        };
    }, [recentActivity, pendingRequests]);

    return (
        <div className="admin-dashboard">
            {/* Header */}
            <div className="admin-header">
                <div>
                    <h1 className="admin-title bodyMediumText2">Admin Dashboard</h1>
                    <p className="admin-subtitle bodyRegularText4">
                        Welcome back, {user?.name || 'Admin'}! Manage your team and monitor performance
                    </p>
                
                </div>
                <div className="admin-actions">
                    <button 
                        className="admin-button secondary "
                        onClick={loadDashboardData}
                        disabled={loading}
                        title="Refresh Data"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
                        {/* Refresh */}
                    </button>
                    {/* <button 
                        className="admin-button secondary"
                        onClick={async () => {
                            console.log('🔬 Running database diagnostic...');
                            try {
                                const { adminApi, employeeApi, supabase } = await import('../../utils/supabase');
                                
                                // Test basic connectivity
                                console.log('🧪 Testing database tables...');
                                const { data: empTest } = await supabase.from('employees').select('count');
                                const { data: adminTest } = await supabase.from('admins').select('count');
                                
                                // Test API functions
                                console.log('🧪 Testing API functions...');
                                const employees = await employeeApi.getEmployees();
                                const admins = await adminApi.getAdmins();
                                const combined = await adminApi.getAllEmployeesAndAdmins();
                                
                                console.log('📊 Results:', { 
                                    employees: employees.length, 
                                    admins: admins.length, 
                                    combined: combined.length 
                                });
                                
                                setError(`✅ DB Test: ${employees.length} emp + ${admins.length} admin = ${combined.length} total`);
                                setTimeout(() => setError(null), 5000);
                            } catch (error) {
                                console.error('❌ DB test failed:', error);
                                setError(`❌ DB Error: ${error.message}`);
                                setTimeout(() => setError(null), 5000);
                            }
                        }}
                        title="Test Database Connection"
                    >
                        🔬 Debug
                    </button> */}
                    <button className="admin-button primary bodyRegularText4" onClick={() => setEmployeeDialogOpen(true)}>
                        <UserPlus size={20} />
                        Add Employee
                    </button>
                    {/* <button className="admin-button secondary ">
                        <FileText size={20} />
                        View Reports
                    </button> */}
                </div>
            </div>

            {/* Stats Grid */}
            <div className="admin-stats-grid">
                <div className="admin-stat-card">
                    <div className="stat-icon employee">
                        <Users size={15} />
                    </div>
                    <div className="stat-info">
                        <h3 className='bodyMediumText3 '>Total Staff</h3>
                        <div className="stat-number bodyMediumText1">{dashboardStats.totalEmployees.count}</div>
                        <div className="stat-change bodyRegularText5" style={{ fontSize: '0.75rem' }}>{dashboardStats.totalEmployees.change}</div>
                    </div>
                </div>

                <div className="admin-stat-card">
                    <div className="stat-icon active">
                        <Users size={15} />
                    </div>
                    <div className="stat-info">
                        <h3 className='bodyMediumText3 '>Active Today</h3>
                        <div className="stat-number bodyMediumText1">{dashboardStats.activeToday.count}</div>
                        <div className="stat-change bodyRegularText5">{dashboardStats.activeToday.rate}</div>
                    </div>
                </div>

                <div className="admin-stat-card">
                    <div className="stat-icon leave">
                        <Calendar size={15} />
                    </div>
                    <div className="stat-info">
                        <h3  className='bodyMediumText3 '>On Leave</h3>
                        <div className="stat-number bodyMediumText1">{dashboardStats.onLeave.count}</div>
                        <div className="stat-change bodyRegularText5">{dashboardStats.onLeave.details}</div>
                    </div>
                </div>

                <div className="admin-stat-card">
                    <div className="stat-icon pending">
                        <AlertTriangle size={15} />
                    </div>
                    <div className="stat-info">
                        <h3 className='bodyMediumText3 '>Pending Approvals</h3>
                        <div className="stat-number bodyMediumText1">{dashboardStats.pendingApprovals.count}</div>
                        <div className="stat-change bodyRegularText5">{dashboardStats.pendingApprovals.details}</div>
                    </div>
                </div>
            </div>

            {/* Pending Leave Requests */}
            <div className="admin-section">
                <h2 className="section-title bodyRegularText3">Pending Leave Requests</h2>
                <div className="leave-requests">
                    {loading ? (
                        <div className="loading-state bodyRegularText4" style={{
                            textAlign: 'center',
                            padding: '2rem',
                            color: '#6b7280'
                        }}>
                            Loading requests...
                        </div>
                    ) : pendingRequests.length === 0 ? (
                        <div className="empty-state bodyRegularText4" style={{
                            textAlign: 'center',
                            padding: '2rem',
                            color: '#6b7280'
                        }}>
                            No pending requests at the moment
                        </div>
                    ) : (
                        pendingRequests.map(request => (
                            <div key={request.id} className="leave-request-card">
                                <div className="request-info">
                                    <div className="employee-name bodyMediumText3">
                                        {request.employees?.name || request.name || `Employee ${request.user_id?.slice(-4) || 'Unknown'}`}
                                    </div>
                                    <div className="leave-details " style={{ alignItems: 'center', gap: '0.5rem' }}>
                                        <span className="leave-type ">{request.type}</span>
                                        <span className="leave-date bodyRegularText5 ">{request.date} ({request.duration})</span>
                                    </div>
                                    {request.rawData?.reason && (
                                        <div className="leave-reason bodyRegularText4" style={{
                                            fontSize: '0.875rem',
                                            color: '#6b7280',
                                            marginTop: '0.25rem'
                                        }}>
                                            Reason: {request.rawData.reason}
                                        </div>
                                    )}
                                </div>
                                <div className="request-actions">
                                    <button 
                                        className="approve-btn bodyMediumText5"
                                        onClick={() => handleApproveRequest(request.id)}
                                        disabled={loading || actionLoading === request.id}
                                    >
                                        {actionLoading === request.id ? 'Approving...' : 'Approve'}
                                    </button>
                                    <button 
                                        className="reject-btn bodyMediumText5"
                                        onClick={() => handleRejectRequest(request.id, 'Rejected by admin')}
                                        disabled={loading || actionLoading === request.id}
                                    >
                                        {actionLoading === request.id ? 'Rejecting...' : 'Reject'}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Pending Timesheets */}
            <div className="admin-section">
                <h2 className="section-title bodyRegularText3">Pending Timesheets</h2>
                <div className="leave-requests">
                    {loading ? (
                        <div className="loading-state bodyRegularText4" style={{
                            textAlign: 'center',
                            padding: '2rem',
                            color: '#6b7280'
                        }}>
                            Loading timesheets...
                        </div>
                    ) : pendingTimesheets.length === 0 ? (
                        <div className="empty-state bodyRegularText4" style={{
                            textAlign: 'center',
                            padding: '2rem',
                            color: '#6b7280'
                        }}>
                            No pending timesheets at the moment
                        </div>
                    ) : (
                        pendingTimesheets.map(timesheet => (
                            <div key={timesheet.id} className="leave-request-card">
                                <div className="request-info">
                                    <div className="employee-name bodyMediumText3">
                                        {timesheet.employee_name || `Employee ${timesheet.employee_id || 'Unknown'}`}
                                    </div>
                                    <div className="leave-details">
                                        <span className="leave-type">{timesheet.hours}h - {new Date(timesheet.date).toLocaleDateString()}</span>
                                        <span className="leave-date bodyRegularText4">Status: {timesheet.status}</span>
                                    </div>
                                    <div style={{
                                        fontSize: '0.875rem',
                                        color: '#6b7280',
                                        marginTop: '0.5rem',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap:'0.5rem',
                                    }}>
                                        <div className='bodyRegularText4' style={{ marginBottom: '0.25rem', fontWeight: '500' }}>Tasks:</div>
                                        <div style={{ 
                                            display: 'flex', 
                                            flexWrap: 'wrap', 
                                            gap: '0.5rem',
                                            marginTop: '0.25rem'
                                        }}>
                                            {(() => {
                                                try {
                                                    let tasks = [];
                                                    
                                                    if (!timesheet.tasks || timesheet.tasks === '') {
                                                        return (
                                                            <div className="task_bubble" style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                padding: '0.25rem 0.5rem',
                                                                backgroundColor: '#f3f4f6',
                                                                borderRadius: '0.375rem',
                                                                border: '1px solid #e5e7eb',
                                                                fontSize: '0.75rem',
                                                                minWidth: '120px'
                                                            }}>
                                                                <span className="task_text" style={{ color: '#6b7280' }}>
                                                                    No tasks specified
                                                                </span>
                                                            </div>
                                                        );
                                                    }
                                                    
                                                    if (Array.isArray(timesheet.tasks)) {
                                                        tasks = timesheet.tasks;
                                                    } else if (typeof timesheet.tasks === 'string') {
                                                        tasks = JSON.parse(timesheet.tasks);
                                                    }
                                                    
                                                    if (!Array.isArray(tasks) || tasks.length === 0) {
                                                        return (
                                                            <div className="task_bubble" style={{
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'space-between',
                                                                padding: '0.25rem 0.5rem',
                                                                backgroundColor: '#f3f4f6',
                                                                borderRadius: '0.375rem',
                                                                border: '1px solid #e5e7eb',
                                                                fontSize: '0.75rem',
                                                                minWidth: '120px'
                                                            }}>
                                                                <span className="task_text" style={{ color: '#6b7280' }}>
                                                                    No tasks specified
                                                                </span>
                                                            </div>
                                                        );
                                                    }
                                                    
                                                    return tasks.map((task, index) => (
                                                        <div key={task.id || index} className="task_bubble" style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            padding: '0.25rem 0.5rem',
                                                            backgroundColor: '#eff6ff',
                                                            borderRadius: '0.375rem',
                                                            border: '1px solid #bfdbfe',
                                                            fontSize: '0.75rem',
                                                            minWidth: '120px',
                                                            gap: '0.5rem'
                                                        }}>
                                                            <span className="task_text" style={{ 
                                                                color: '#1e40af',
                                                                flex: 1,
                                                                minWidth: 0,
                                                                overflow: 'hidden',
                                                                textOverflow: 'ellipsis',
                                                                whiteSpace: 'nowrap'
                                                            }}>
                                                                {task.description || task.taskTitle || task.task || 'No description'}
                                                            </span>
                                                            <span className="task_duration" style={{
                                                                color: '#1d4ed8',
                                                                fontWeight: '500',
                                                                flexShrink: 0
                                                            }}>
                                                                {task.hours || task.timeSpent || 0}h
                                                            </span>
                                                        </div>
                                                    ));
                                                } catch (error) {
                                                    console.warn('Error parsing tasks for timesheet:', timesheet.id, error);
                                                    return (
                                                        <div className="task_bubble" style={{
                                                            display: 'inline-flex',
                                                            alignItems: 'center',
                                                            padding: '0.25rem 0.5rem',
                                                            backgroundColor: '#fef2f2',
                                                            borderRadius: '0.375rem',
                                                            border: '1px solid #fecaca',
                                                            fontSize: '0.75rem',
                                                            color: '#dc2626'
                                                        }}>
                                                            <span className="task_text">
                                                                {typeof timesheet.tasks === 'string' ? timesheet.tasks : 'Tasks format error'}
                                                            </span>
                                                        </div>
                                                    );
                                                }
                                            })()}
                                        </div>
                                    </div>
                                    {timesheet.note && timesheet.note !== 'No notes' && (
                                        <div className="leave-reason" style={{
                                            fontSize: '0.875rem',
                                            color: '#6b7280',
                                            marginTop: '0.25rem',
                                            fontStyle: 'italic'
                                        }}>
                                            Note: {timesheet.note}
                                        </div>
                                    )}
                                </div>
                                <div className="request-actions">
                                    <button 
                                        className="approve-btn"
                                        onClick={() => handleApproveTimesheet(timesheet.id)}
                                        disabled={loading || actionLoading === timesheet.id}
                                    >
                                        {actionLoading === timesheet.id ? 'Approving...' : 'Approve'}
                                    </button>
                                    <button 
                                        className="reject-btn"
                                        onClick={() => handleRejectTimesheet(timesheet.id, 'Rejected by admin')}
                                        disabled={loading || actionLoading === timesheet.id}
                                    >
                                        {actionLoading === timesheet.id ? 'Rejecting...' : 'Reject'}
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Add Employee Dialog */}
            <Dialog.Root open={employeeDialogOpen} onOpenChange={setEmployeeDialogOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="dialog-overlay" />
                    <Dialog.Content className="dialog-content add_dialog-content">
                        <AddEmployeeForm 
                            onClose={() => setEmployeeDialogOpen(false)}
                            onSuccess={(message) => {
                                setError(message);
                                setTimeout(() => setError(null), 3000);
                                loadDashboardData(); // Refresh stats after adding employee
                            }}
                            onError={(message) => {
                                setError(message);
                                setTimeout(() => setError(null), 5000);
                            }}
                        />
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </div>
    );
};

export default AdminDashboard;