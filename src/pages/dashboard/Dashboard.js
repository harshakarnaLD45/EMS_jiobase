import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Plus, Calendar, Clock, TrendingUp, LineChart, Clock4, Users, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { adminApi, employeeApi, timesheetApi, leaveApi } from '../../utils/supabase';
import './Dashboard.css';
import { TimesheetForm, LeaveRequestForm } from '../../components';

const Dashboard = () => {
  const [timesheetDialogOpen, setTimesheetDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [stats, setStats] = useState({});
  const [recentTimesheets, setRecentTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, isAdmin } = useAuth();

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  };

  // Load dashboard data from database
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      if (isAdmin()) {
        // Load admin dashboard data
        //console.log('📊 Loading admin dashboard data...');
        const dashboardStats = await adminApi.getDashboardStats();

        setStats({
          totalEmployees: dashboardStats.totalEmployees || 0,
          pendingRequests: dashboardStats.pendingRequests || 0,
          approvedLeaves: dashboardStats.approvedLeaves || 0,
          totalHoursThisMonth: `${dashboardStats.totalHoursThisMonth || 0}h`,
          employeesOnLeave: dashboardStats.employeesOnLeave || 0,
          activeEmployeesToday: dashboardStats.activeEmployeesToday || 0
        });

        // Load recent activity for admin
        const recentActivity = await adminApi.getRecentActivity();
        const formattedTimesheets = recentActivity.slice(0, 3).map((activity, index) => ({
          id: activity.id || index,
          date: new Date(activity.created_at || activity.start_date).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          }),
          hours: `${activity.days || 1} day${(activity.days || 1) > 1 ? 's' : ''}`,
          status: activity.status || 'pending'
        }));
        setRecentTimesheets(formattedTimesheets);

      } else {
        // Load employee dashboard data
        //console.log('👤 Loading employee dashboard data...');

        // Get employee timesheets using employee_id (since we only have employee auth now)
        const timesheets = await timesheetApi.getTimesheetsByEmployeeId(user.employee_id || user.id);
        const recentTimesheetData = timesheets.slice(0, 3).map(timesheet => ({
          id: timesheet.id,
          date: new Date(timesheet.date).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
          }),
          hours: `${timesheet.hours || 0} hours`,
          status: timesheet.status || 'pending'
        }));
        setRecentTimesheets(recentTimesheetData);

        // Get leave balance using employee_id if available, fallback to user.id
        let leaveBalance = { sick_leave: 0, casual_leave: 0 };
        try {
          leaveBalance = user.employee_id
            ? await leaveApi.getLeaveBalanceByEmployeeId(user.employee_id)
            : await leaveApi.getLeaveBalance(user.id);
        } catch (leaveError) {
          //console.log('⚠️ No leave balance found, using defaults');
        }

        // Calculate employee stats - ONLY COUNT APPROVED TIMESHEETS
        const todayTimesheets = timesheets.filter(t =>
          new Date(t.date).toDateString() === new Date().toDateString()
        );
        
        // Calculate today's total hours (all timesheets) and track status
        const todayApprovedTimesheets = todayTimesheets.filter(t => t.status === 'approved');
        const todayPendingTimesheets = todayTimesheets.filter(t => t.status !== 'approved');
        
        // Show total hours for today (all timesheets regardless of status)
        const todayTotalHours = todayTimesheets.reduce((sum, t) => sum + (t.hours || 0), 0);
        
        // Check if there are pending timesheets today to show status
        const todayStatus = todayPendingTimesheets.length > 0 ? todayPendingTimesheets[0].status : null;

        const thisWeekStart = new Date();
        thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
        const weeklyApprovedTimesheets = timesheets.filter(t => 
          new Date(t.date) >= thisWeekStart && t.status === 'approved'
        );
        const weeklyHours = weeklyApprovedTimesheets.reduce((sum, t) => sum + (t.hours || 0), 0);

        const thisMonthStart = new Date();
        thisMonthStart.setDate(1);
        const monthlyApprovedTimesheets = timesheets.filter(t => 
          new Date(t.date) >= thisMonthStart && t.status === 'approved'
        );
        const monthlyHours = monthlyApprovedTimesheets.reduce((sum, t) => sum + (t.hours || 0), 0);

        setStats({
          todayHours: `${todayTotalHours}h`,
          todayStatus: todayStatus,
          weeklyProgress: `${weeklyHours}h`,
          leaveBalance: leaveBalance.sick_leave + leaveBalance.casual_leave,
          monthlyHours: `${monthlyHours}h`,
          sickLeave: leaveBalance.sick_leave || 0,
          casualLeave: leaveBalance.casual_leave || 0
        });
      }

      //console.log('✅ Dashboard data loaded successfully');
    } catch (error) {
      console.error('❌ Error loading dashboard data:', error);
      setError(`Failed to load dashboard data: ${error.message}`);

      // Set fallback data
      if (isAdmin()) {
        setStats({
          totalEmployees: 0,
          pendingRequests: 0,
          approvedLeaves: 0,
          totalHoursThisMonth: "0h"
        });
      } else {
        setStats({
          todayHours: "0h",
          todayStatus: null,
          weeklyProgress: "0h",
          leaveBalance: 0,
          monthlyHours: "0h",
          sickLeave: 0,
          casualLeave: 0
        });
      }
    } finally {
      setLoading(false);
    }
  };

  // Load data when component mounts or user changes
  useEffect(() => {
    if (user) {
      loadDashboardData();
    }
  }, [user, isAdmin]);

  if (loading) {
    return (
      <div className="main_container">
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '200px',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="text-text-secondary">Loading dashboard data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="main_container">
      {/* Header Section */}
      <div className="good_greeting_container">
        <div className="good_greeting_section">
          <div>
            <h1 className="good_greeting bodyMediumText2">
              {getGreeting()}, {user?.name?.split(' ')[0] || 'User'}!
            </h1>
            <p className="text-text-secondary bodyRegularText4">
              
                 Here's your activity summary for today
            </p>
            {error && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                color: '#ef4444',
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '14px',
                marginTop: '8px'
              }}>
                {error}
              </div>
            )}
          </div>
          <div className="btn_log_leave_section">
           

            {!isAdmin() && (
              <Dialog.Root open={timesheetDialogOpen} onOpenChange={setTimesheetDialogOpen}>
                <Dialog.Trigger asChild>
                  <button className="quick-action-btn primary bodyMediumText3">
                    <Plus className="w-4 h-4" />
                    Log Hours
                  </button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="dialog-overlay" />
                  <Dialog.Content className="dialog-content">
                    <TimesheetForm
                      onClose={() => setTimesheetDialogOpen(false)}
                      onSubmit={(newTimesheet) => {
                        // Refresh dashboard data after adding timesheet
                        loadDashboardData();
                      }}
                    />
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
            )}

            {!isAdmin() && (
              <Dialog.Root open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
                <Dialog.Trigger asChild>
                  <button className="quick-action-btn secondary bodyMediumText3" >
                    <Calendar className="w-4 h-4" />
                    Request Leave
                  </button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="dialog-overlay" />
                  <Dialog.Content className="dialog-content">
                    <LeaveRequestForm
                      onClose={() => setLeaveDialogOpen(false)}
                      onSuccess={() => {
                        // Refresh dashboard data after submitting leave request
                        loadDashboardData();
                      }}
                    />
                  </Dialog.Content>
                </Dialog.Portal>
              </Dialog.Root>
            )}
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="stats-grid mb-2">
       
            <div className="stats-card">
              <div className="stats-card_container">
                <div className="stats-card_header">
                  <span className="stats_title bodyMediumText3">Today's Hours</span>
                  <Clock className="progress_icons Clock" />
                </div>
                <div className="stats_hrs bodyMediumText1">
                  {stats.todayHours}
                  {stats.todayStatus && (
                    <span className={` ml-2`} style={{ fontSize: '12px',  padding: '2px 8px', borderRadius: '12px' }}>
                      <span style={{ 
                        backgroundColor: stats.todayStatus === "approved" ? "#093c1dff" : "#db712fff", 
                        width: '6px', 
                        height: '6px', 
                        borderRadius: '50%', 
                        display: 'inline-flex', 
                        marginRight: '4px' 
                      }} />
                      {stats.todayStatus}
                    </span>
                  )}
                </div>
                {/* <div className="bodyRegularText5 text-text-secondary mt-1">
                  Today's timesheet
                </div> */}
              </div>
            </div>
            <div className="stats-card">
              <div className="stats-card_container">
                <div className="stats-card_header">
                  <span className="stats_title bodyMediumText3">Weekly Progress</span>
                  <TrendingUp className="progress_icons TrendingUp" />
                </div>
                <div className="stats_hrs bodyMediumText1">{stats.weeklyProgress}</div>
              </div>
            </div>
             <div className="stats-card">
              <div className="stats-card_container">
                <div className="stats-card_header">
                  <span className="stats_title bodyMediumText3">This Month</span>
                  <LineChart className="progress_icons LineChart"/>
                </div>
                <div className="stats_hrs bodyMediumText1">{stats.monthlyHours}</div>
              </div>
            </div>
            <div className="stats-card">
              <div className="stats-card_container">
                <div className="stats-card_header">
                  <span className="stats_title bodyMediumText3">Leave Balance</span>
                  <Calendar className="progress_icons Calendar" />
                </div>
                <div className="stats_hrs bodyMediumText1">{stats.leaveBalance}</div>
                <div className="sick_casual_leave_sec">
                  <span className='sick_casual_bubble ' > Sick: {stats.sickLeave} </span> <span className='sick_casual_bubble '> Casual: {stats.casualLeave}</span>
                </div>
              </div>
            </div>
           
        
      </div>

      {/* Recent Timesheets and Quick Actions */}
      <div className="content-grid gap-6">
        <div className="recent-timesheets stats-card">
          <div className=" recent-timesheets-card ">
            <h2 className=" bodyMediumText2">Recent Timesheets</h2>
            <div className="timesheets_lists">
              {recentTimesheets.map((timesheet) => (
                <div key={timesheet.id} className="timesheets_list_day">
                  <div >
                    <div className="bodyMediumText3">{timesheet.date}</div>
                    <div className=" bodyRegularText5">
                      {timesheet.hours}

                    </div>
                  </div>
                  <span className={`bodyMediumText4 status-badge ${timesheet.status}`}>
                    <span style={{ backgroundColor: timesheet.status === "approved" ? "#093c1dff" : "#db712fff", width: '8px', height: '8px', borderRadius: '50%', display: 'inline-block', marginRight: '6px' }} />
                    {timesheet.status}
                  </span>
                </div>
              ))}
            </div>

            {/* show All time sheets */}
            {/* <div>
              <h2 className="text-xl font-semibold mb-4 text-text-primary">Show All Timesheets</h2>
              <div>


              </div>
            </div> */}
          </div>
        </div>

        <div className="quick_actions stats-card">
          <div className="">
            <h2 className="bodyMediumText2">Quick Actions</h2>
           

          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;