import React, { useState, useEffect } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Plus, Calendar, Clock, TrendingUp, LineChart, Clock4, Users, FileText } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { adminApi, employeeApi, timesheetApi, leaveApi } from '../../utils/supabase';
import './Dashboard.css';
import { TimesheetForm, LeaveRequestForm } from '../../components';
import '../../components/common/calender/CustomCalendar.css';
import CustomCalendar from '../../components/common/calender/CustomCalendar';
import { StatusIndicator } from '../../components/common/StatusIndicator/Status_Indicator';



const Dashboard = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [timesheetDialogOpen, setTimesheetDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [stats, setStats] = useState({});
  const [recentTimesheets, setRecentTimesheets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, isAdmin } = useAuth();
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false); // NEW: Track if submitted today
  const [filters, setFilters] = useState({
    filterMode: 'all', // 'all', 'week', 'month', or 'custom'
    startDate: '',
    endDate: ''
  });

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

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
          // Get all employee timesheets
const timesheets = await timesheetApi.getTimesheetsByEmployeeId(user.employee_id || user.id);

// ✅ Apply filters before displaying
let filteredTimesheets = [...timesheets];

// Week filter
if (filters.filterMode === 'week') {
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - weekStart.getDay());
  weekStart.setHours(0, 0, 0, 0);

  filteredTimesheets = timesheets.filter(t => {
    const d = new Date(t.date || t.workDate);
    return d >= weekStart;
  });
}

// Month filter
if (filters.filterMode === 'month') {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  filteredTimesheets = timesheets.filter(t => {
    const d = new Date(t.date || t.workDate);
    return d >= monthStart;
  });
}

// Custom date range filter
if (filters.filterMode === 'custom' && filters.startDate && filters.endDate) {
  const start = new Date(filters.startDate);
  const end = new Date(filters.endDate);
  end.setHours(23, 59, 59, 999);

  filteredTimesheets = timesheets.filter(t => {
    const d = new Date(t.date || t.workDate);
    return d >= start && d <= end;
  });
}

// Set recent timesheets (show only first 3)
const recentTimesheetData = filteredTimesheets.slice(0, 3).map(timesheet => ({
  id: timesheet.id,
  date: new Date(timesheet.date || timesheet.workDate).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  }),
  hours: `${timesheet.hours || timesheet.hoursWorked || 0} hours`,
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
         
        // FIX 1: Check if employee has submitted today and calculate today's hours
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset to start of day
        
        const todayTimesheets = timesheets.filter(t => {
          const timesheetDate = new Date(t.workDate || t.date);
          timesheetDate.setHours(0, 0, 0, 0); // Reset to start of day
          return timesheetDate.getTime() === today.getTime();
        });
        
        // Set the flag if there are any timesheets for today
        setHasSubmittedToday(todayTimesheets.length > 0);

        // Calculate today's total hours (sum all entries for today)
        const todayApprovedTimesheets = todayTimesheets.filter(t => t.status === 'approved');
        const todayPendingTimesheets = todayTimesheets.filter(t => t.status !== 'approved');
        
        // Show total hours for today - use the correct field name
        const todayTotalHours = todayTimesheets.reduce((sum, t) => {
          const hours = parseFloat(t.hoursWorked || t.hours || 0);
          console.log('Today timesheet:', { date: t.workDate || t.date, hours, status: t.status });
          return sum + hours;
        }, 0);
        
        console.log('Today total hours:', todayTotalHours, 'from', todayTimesheets.length, 'timesheets');

        
        // Check if there are pending timesheets today to show status
        const todayStatus =
          todayPendingTimesheets.length > 0
            ? todayPendingTimesheets[0].status
            : todayApprovedTimesheets.length > 0
            ? 'approved'
            : null;

        const thisWeekStart = new Date();
        thisWeekStart.setDate(thisWeekStart.getDate() - thisWeekStart.getDay());
        thisWeekStart.setHours(0, 0, 0, 0);
        
        const weeklyHours = timesheets
          .filter(t => {
            const timesheetDate = new Date(t.date || t.workDate);
            return timesheetDate >= thisWeekStart;
          })
          .reduce((sum, t) => sum + parseFloat(t.hoursWorked || t.hours || 0), 0);

        // MONTHLY HOURS (include all statuses)
        const thisMonthStart = new Date();
        thisMonthStart.setDate(1);
        thisMonthStart.setHours(0, 0, 0, 0);
        
        const monthlyHours = timesheets
          .filter(t => {
            const timesheetDate = new Date(t.date || t.workDate);
            return timesheetDate >= thisMonthStart;
          })
          .reduce((sum, t) => sum + parseFloat(t.hoursWorked || t.hours || 0), 0);

        // ✅ Update the dashboard stats
        setStats({
          todayHours: Number(todayTotalHours.toFixed(1)),
          todayStatus: todayStatus,
          weeklyProgress: `${weeklyHours.toFixed(1)}h`,
          leaveBalance: (leaveBalance.sick_leave || 0) + (leaveBalance.casual_leave || 0),
          monthlyHours: `${monthlyHours.toFixed(1)}h`,
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
          todayHours: 0,
          todayStatus: null,
          weeklyProgress: "0h",
          leaveBalance: 0,
          monthlyHours: "0h",
          sickLeave: 0,
          casualLeave: 0
        });
        setHasSubmittedToday(false);
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
}, [user, isAdmin, filters]);


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
                  {/* FIX 2: Disable button if already submitted today */}
                  <button 
                    className="quick-action-btn primary bodyMediumText3"
                    disabled={hasSubmittedToday}
                    style={{
                      opacity: hasSubmittedToday ? 0.5 : 1,
                      cursor: hasSubmittedToday ? 'not-allowed' : 'pointer'
                    }}
                    title={hasSubmittedToday ? 'You have already logged work hours for today' : 'Log Work Hours'}
                  >
                    <Plus className="w-4 h-4" />
                    {hasSubmittedToday ? 'Work Hours Logged' : 'Log Work Hours'}
                  </button>
                </Dialog.Trigger>
                <Dialog.Portal>
                  <Dialog.Overlay className="dialog-overlay" />
                  <Dialog.Content className="dialog-content">
                    <TimesheetForm
                      onClose={() => setTimesheetDialogOpen(false)}
                      onSubmit={(newTimesheet) => {
                        // FIX 3: Reload dashboard data immediately after submission
                        setTimesheetDialogOpen(false);
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
  {stats.todayHours ? `${Number(stats.todayHours).toFixed(1)}h` : '0h'}
{stats.todayStatus && (
    <span
      className="ml-2"
      style={{
        fontSize: '12px',
        padding: '2px 8px',
        borderRadius: '12px',
      }}
    >
      <span
        style={{
          backgroundColor:
            stats.todayStatus === "approved" ? "#093c1dff" : "#db712fff",
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          display: 'inline-flex',
          marginRight: '4px',
        }}
      />
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

        <div className="filter_section" style={{ marginTop: '1.5rem' }}>
        <div className="filter_group">
          <button
            className={`bodyMediumText4 filter_btn ${filters.filterMode === 'week' ? 'active' : ''}`}
            onClick={() => {
              handleFilterChange('filterMode', 'week');
              handleFilterChange('startDate', '');
              handleFilterChange('endDate', '');
              setCalendarVisible(false);
            }}
          >
            Week
          </button>

          <button
            className={`bodyMediumText4 filter_btn ${filters.filterMode === 'month' ? 'active' : ''}`}
            onClick={() => {
              handleFilterChange('filterMode', 'month');
              handleFilterChange('startDate', '');
              handleFilterChange('endDate', '');
              setCalendarVisible(false);
            }}
          >
            Month
          </button>

          <button
            className={`bodyMediumText4 filter_btn ${filters.filterMode === 'all' ? 'active' : ''}`}
            onClick={() => {
              handleFilterChange('filterMode', 'all');
              handleFilterChange('startDate', '');
              handleFilterChange('endDate', '');
              setCalendarVisible(false);
            }}
          >
            All
          </button>

          <button
            className={`calendar-trigger-btn ${calendarVisible ? 'active' : ''}`}
            onClick={() => setCalendarVisible(!calendarVisible)}
            title="Custom Date Range"
          >
            <Calendar className="w-5 h-5 text-blue-500" />
          </button>

          {calendarVisible && (
            <CustomCalendar
              selectedRange={{
                from: filters.startDate ? new Date(filters.startDate) : null,
                to: filters.endDate ? new Date(filters.endDate) : null
              }}
              onDateRangeSelect={(range) => {
                if (range?.from && range?.to) {
                  const startDate = range.from.toISOString().split('T')[0];
                  const endDate = range.to.toISOString().split('T')[0];

                  handleFilterChange('startDate', startDate);
                  handleFilterChange('endDate', endDate);
                  handleFilterChange('filterMode', 'custom');
                } else if (!range?.from && !range?.to) {
                  handleFilterChange('startDate', '');
                  handleFilterChange('endDate', '');
                  handleFilterChange('filterMode', 'all');
                }
              }}
              onClose={() => setCalendarVisible(false)}
            />
          )}
        </div>
      </div>

      {/* Recent Timesheets and Quick Actions */}
      <div className="content-grid gap-6 w-full max-w-full">
        <div className="recent-timesheets stats-card w-full">
          <div className=" recent-timesheets-card w-full ">
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
                    {timesheet.status ? timesheet.status.charAt(0).toUpperCase() + timesheet.status.slice(1).toLowerCase() : ''}


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

        
      </div>
    </div>
  );
};

export default Dashboard;