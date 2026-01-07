import React, { useState, useEffect } from 'react';
import { Plus, Calendar, HeartPulse, Coffee, Zap, Clock, FileText, RefreshCw,AlertTriangle, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLeave } from '../../contexts/LeaveContext';
import { LeaveRequestForm } from '../../components';
import CustomCalendar from '../../components/common/calender/CustomCalendar';
import '../../components/common/calender/CustomCalendar.css';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import './leave.css';

const Leave = () => {
  const { user, isAdmin: isAdminFn, isEmployee: isEmployeeFn } = useAuth();
  const isAdmin = isAdminFn?.() || false;
  const isEmployee = isEmployeeFn?.() || false;
  
  // Destructure, but use a default empty object in case useLeave returns null/undefined properties
  const { 
    leaveBalance, 
    loading, 
    error, 
    requestLeave,
    // Safely destructure refreshBalance, it will be undefined if not exposed by the context
    refreshBalance: contextRefreshBalance 
  } = useLeave() || {}; 
  
  // Define a placeholder/dummy refresh function for safety if it's missing from context
  const safeRefreshBalance = typeof contextRefreshBalance === 'function' 
    ? contextRefreshBalance 
    : async () => {
        console.warn('refreshBalance is missing from useLeave context. Using a NO-OP function.');
        return Promise.resolve();
      };

  const [leaveRequests, setLeaveRequests] = useState([]);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    filterMode: 'all', // 'all', 'week', 'month', 'custom'
    startDate: '',
    endDate: '',
    employee: 'all'
  });
  
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [actionStatus, setActionStatus] = useState({});
  const [actionLoading, setActionLoading] = useState(null);
  const [employeeId, setEmployeeId] = useState(null);
  const [warningDismissed, setWarningDismissed] = useState(false);

  // ------------------- Fetch employee_id -------------------
  useEffect(() => {
    const getEmployeeId = async () => {
      if (!user) return;
      
      try {
        const { supabase } = await import('../../utils/supabase');
        
        // 1. Check if user object already has the ID
        if (user.employee_id) {
          setEmployeeId(user.employee_id);
          return;
        }

        let employeeData = null;

        // 2. Try fetching by email first (most reliable)
        if (user.email) {
          const { data: empByEmail } = await supabase
            .from('employees')
            .select('id, employee_id')
            .eq('email', user.email)
            .maybeSingle();
          
          if (empByEmail) {
            employeeData = empByEmail;
          }
        }
        
        // 3. If still not found, try by id matching employee_id
        if (!employeeData && user.id) {
          const { data: empById } = await supabase
            .from('employees')
            .select('id, employee_id')
            .eq('employee_id', user.id)
            .maybeSingle();
          
          if (empById) {
            employeeData = empById;
          }
        }

        if (employeeData?.employee_id) {
          setEmployeeId(employeeData.employee_id);
        } else if (employeeData?.id) {
          setEmployeeId(employeeData.id);
        } else {
          console.error('No employee record found for user:', user.id);
          setFormError('No employee record found. Please contact admin.');
        }
      } catch (err) {
        console.error('Error in getEmployeeId:', err);
        setFormError('Failed to load employee data.');
      }
    };

    getEmployeeId();
  }, [user]);

  // ------------------- Data Loading and Refresh -------------------
  useEffect(() => {
    // Initial data load when employeeId or user/isAdmin status changes
    if (user && (isAdmin || employeeId)) {
      refreshLeaveData();
    }
    // Dependency on refreshLeaveData is safe since it's defined outside this effect 
    // and its dependencies (safeRefreshBalance, loadLeaveRequests) are stable.
  }, [user, employeeId, isAdmin]);

  const loadLeaveRequests = async () => {
    if (!user || (!isAdmin && !employeeId)) return;
    
    try {
      const { leaveApi } = await import('../../utils/supabase');
      let requests = [];
      
      if (isAdmin) {
        requests = await leaveApi.getAllLeaveRequestsWithEmployees();
      } else {
        requests = await leaveApi.getLeaveRequests(employeeId);
      }
      
      const transformedRequests = requests.map(request => ({
        ...request,
        employee_name: request.employees?.name || 
                      `${request.employees?.first_name || ''} ${request.employees?.last_name || ''}`.trim() ||
                      request.employee_name ||
                      null
      }));
      
      setLeaveRequests(transformedRequests || []);
    } catch (error) {
      console.error('Error loading leave requests:', error);
      setLeaveRequests([]);
    }
  };

  const refreshLeaveData = async () => {
    if (isAdmin) {
      // Admins only need to refresh the list of requests
      await loadLeaveRequests();
    } else if (employeeId) {
      // Employees need to refresh both balance and the list of requests
      // This is where the fix is applied, using safeRefreshBalance
      await Promise.all([safeRefreshBalance(), loadLeaveRequests()]);
    }
  };

  // ------------------- Admin Actions -------------------
  const handleApproveRequest = async (id) => {
    if (!id) return;
    try {
      setActionLoading(id);
      setActionStatus(prev => ({ ...prev, [id]: 'approving' }));
      const { leaveApi } = await import('../../utils/supabase');
      await leaveApi.updateLeaveStatus(id, 'approved');
      setActionStatus(prev => ({ ...prev, [id]: 'approved' }));
      await refreshLeaveData();
    } catch (err) {
      console.error('Error approving leave:', err);
      setActionStatus(prev => ({ ...prev, [id]: undefined }));
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectRequest = async (id, defaultReason = 'Rejected by admin') => {
    if (!id) return;
    try {
      setActionLoading(id);
      setActionStatus(prev => ({ ...prev, [id]: 'rejecting' }));
      const reason = window.prompt('Enter rejection reason (optional):', defaultReason) || defaultReason;
      const { leaveApi } = await import('../../utils/supabase');
      await leaveApi.updateLeaveStatus(id, 'rejected', reason);
      setActionStatus(prev => ({ ...prev, [id]: 'rejected' }));
      await refreshLeaveData();
    } catch (err) {
      console.error('Error rejecting leave:', err);
      setActionStatus(prev => ({ ...prev, [id]: undefined }));
    } finally {
      setActionLoading(null);
    }
  };
  
  // ------------------- Leave Configuration and Calculations -------------------
  const leaveTypeConfigs = [
    { type: 'sick', displayName: 'Sick Leave', icon: HeartPulse, iconClass: 'sick_leave_icon', color: '#ef4444', totalDays: 4 },
    { type: 'casual', displayName: 'Casual Leave', icon: Coffee, iconClass: 'casual_leave_icon', color: '#3b82f6', totalDays: 10 },
  ];

  // This function properly calculates used days from approved requests
  const calculateLeaveStats = () => {
    if (!leaveRequests || leaveRequests.length === 0) {
      return leaveTypeConfigs.map(config => ({ 
        ...config, 
        daysLeft: config.totalDays, 
        totalDays: config.totalDays, 
        usedDays: 0 
      }));
    }

    const currentYear = new Date().getFullYear();

    return leaveTypeConfigs.map(config => {
      const totalAllocated = config.totalDays;
      
      // Calculate used days from APPROVED requests for current year
      const usedDaysFromRequests = leaveRequests
        .filter(req => {
          if (!req || !req.start_date || !req.leave_type) return false;
          
          const startDate = new Date(req.start_date);
          const reqYear = startDate.getFullYear();
          
          // Only count approved leaves for current year
          return req.leave_type === config.type && 
                 req.status === 'approved' && 
                 reqYear === currentYear;
        })
        .reduce((sum, req) => {
          const startDate = new Date(req.start_date);
          const endDate = new Date(req.end_date);
          // Calculate duration including both start and end dates
          const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
          return sum + duration;
        }, 0);
      
      // Get used days from balance table (source of truth to avoid duplicates)
      const balanceField = config.type === 'sick' ? 'used_sick' : 'used_casual';
      const usedFromBalance = leaveBalance?.[balanceField] || 0;
      
      // Use the leave_balances table as source of truth (avoids duplicate counting from leave_requests)
      // Only fall back to counting requests if balance is somehow 0 but requests exist
      const actualUsed = usedFromBalance > 0 ? usedFromBalance : usedDaysFromRequests;
      const daysLeft = Math.max(0, totalAllocated - actualUsed);
      
      // console.log(`${config.type} Leave Calculation:`, {
      //   usedFromRequests: usedDaysFromRequests,
      //   usedFromBalance: usedFromBalance,
      //   actualUsed: actualUsed,
      //   daysLeft: daysLeft,
      //   totalAllocated: totalAllocated
      // });
      
      return { 
        ...config, 
        daysLeft, 
        totalDays: totalAllocated, 
        usedDays: actualUsed 
      };
    });
  };

  // Calculate stats using the same logic for summary
  const calculateStats = () => {
    if (!leaveRequests || leaveRequests.length === 0) {
      return { totalDaysUsed: 0, pendingRequests: 0 };
    }

    const currentYear = new Date().getFullYear();
    
    const totalUsed = leaveTypeConfigs.reduce((sum, config) => {
      const usedDaysFromRequests = leaveRequests
        .filter(req => {
          if (!req || !req.start_date || !req.leave_type) return false;
          const startDate = new Date(req.start_date);
          const reqYear = startDate.getFullYear();
          return req.leave_type === config.type && 
                 req.status === 'approved' && 
                 reqYear === currentYear;
        })
        .reduce((reqSum, req) => {
          const startDate = new Date(req.start_date);
          const endDate = new Date(req.end_date);
          const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
          return reqSum + duration;
        }, 0);
      
      // Use correct field names from leave_balances table
      const balanceField = config.type === 'sick' ? 'used_sick' : 'used_casual';
      const usedFromBalance = leaveBalance?.[balanceField] || 0;
      // Use leave_balances as source of truth (avoids duplicate counting)
      const actualUsed = usedFromBalance > 0 ? usedFromBalance : usedDaysFromRequests;
      return sum + actualUsed;
    }, 0);

    const pendingCount = leaveRequests.filter(req => 
      req.status === 'pending' || !req.status
    ).length;
    
    return { totalDaysUsed: totalUsed, pendingRequests: pendingCount };
  };

  const leaveTypes = isAdmin ? [] : calculateLeaveStats();
  const stats = isAdmin ? { totalDaysUsed: 0, pendingRequests: 0 } : calculateStats();

  // ------------------- Leave Submission -------------------
  const handleLeaveSubmit = async (leaveData) => {
    try {
      setFormError('');
      
      // Validate employee_id exists
      if (!employeeId) {
        throw new Error('Employee ID not found. Please refresh the page or contact admin.');
      }

      const leaveRequestData = { 
        ...leaveData, 
        employee_id: employeeId,
        user_id: user.id 
      };

      console.log('Submitting leave request:', leaveRequestData);
      
      await requestLeave(leaveRequestData);
      setShowLeaveForm(false);
      await refreshLeaveData();
    } catch (error) {
      console.error('Leave submission error:', error);
      setFormError(error.message || 'Failed to submit leave request');
    }
  };

  // ------------------- History Formatting and Filtering -------------------
  const formatLeaveHistory = () => {
    if (!leaveRequests || leaveRequests.length === 0) return [];
    return leaveRequests
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(request => {
        const startDate = new Date(request.start_date);
        const endDate = new Date(request.end_date);
        const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        const config = leaveTypeConfigs.find(c => c.type === request.leave_type) || leaveTypeConfigs[0];
        const employeeName = request.employee_name || null;
        return {
          id: request.id,
          type: config.displayName,
          duration: `${duration} day${duration > 1 ? 's' : ''}`,
          dateRange: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
          reason: request.reason || 'No reason provided',
          status: request.status || 'pending',
          approvedBy: request.approved_by || 'Pending approval',
          appliedDate: `Applied ${new Date(request.created_at).toLocaleDateString()}`,
          rawData: request,
          employeeName,
          raw_start_date: request.start_date,
          raw_end_date: request.end_date
        };
      });
  };

  const leaveHistory = formatLeaveHistory();

  // Filter logic
  const filteredLeaveHistory = leaveHistory.filter((leave) => {
    // Status filter (currently not in UI, but keep the logic for future use)
    if (filters.status !== 'all' && leave.status !== filters.status)
      return false;
      
    // Employee filter (admin only)
    if (isAdmin && filters.employee !== 'all' && leave.employeeName !== filters.employee)
      return false;

    const leaveStart = new Date(leave.raw_start_date);
    const leaveEnd = new Date(leave.raw_end_date);
    const today = new Date();

    let filterStart = null;
    let filterEnd = null;

    // --- Handle each filter mode correctly ---
    if (filters.filterMode === 'week') {
      // Get start of this week (Monday)
      const dayOfWeek = today.getDay(); // 0 = Sunday
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      filterStart = new Date(today);
      filterStart.setDate(today.getDate() - diffToMonday);
      filterStart.setHours(0, 0, 0, 0);

      // End of the week (Sunday)
      filterEnd = new Date(filterStart);
      filterEnd.setDate(filterStart.getDate() + 6);
      filterEnd.setHours(23, 59, 59, 999);
    } 
    else if (filters.filterMode === 'month') {
      // Start and end of current month
      filterStart = new Date(today.getFullYear(), today.getMonth(), 1);
      filterEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
    } 
    else if (filters.filterMode === 'custom') {
      if (filters.startDate) filterStart = new Date(filters.startDate);
      if (filters.endDate) filterEnd = new Date(filters.endDate);
    }

    // --- Apply filter ---
    if (filterStart && filterEnd) {
      // Include leave if it overlaps with selected range
      return leaveEnd >= filterStart && leaveStart <= filterEnd;
    }

    return true; // 'all' mode or no filters
  });

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };
  
  // ------------------- Calendar Visibility -------------------
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Use the class name from the history_header to determine if we clicked inside the calendar area
      if (calendarVisible && !event.target.closest('.history_header')) {
        setCalendarVisible(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [calendarVisible]);

  // Auto-hide warning banner after 10 seconds
  useEffect(() => {
    if (!warningDismissed && !isAdmin) {
      const timer = setTimeout(() => {
        setWarningDismissed(true);
      }, 10000); // 10 seconds
      
      return () => clearTimeout(timer);
    }
  }, [warningDismissed, isAdmin]);

  // ------------------- Render -------------------
  return (
    <div className="leave_container">
      {/* Header */}
      <div className="leave_header">
        <div className="leave_title">
          <h1 className='bodyMediumText1'>Leave Requests</h1>
          <p className='bodyRegularText4'>Manage your team time off and leave applications</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            className="request_leave_btn bodyMediumText4"
            onClick={() => refreshLeaveData()}
            disabled={loading}
            style={{ 
              backgroundColor: 'transparent',
              border: '1px solid #d1d5db',
              color: '#6b7280'
            }}
            title="Refresh Data"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          {!isAdmin && (
          <button 
            className="request_leave_btn bodyMediumText3"
            onClick={() => setShowLeaveForm(true)}
            disabled={loading || !employeeId}
            title={!employeeId ? 'Loading employee data...' : 'Request Leave'}
          >
            <Plus size={16} />
            Request Leave
          </button>
          )}
        </div>
      </div>

      {/* Error Message for missing employee_id */}
      {!isAdmin && !employeeId && !loading && (
        <div style={{
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#dc2626',
          padding: '1rem',
          borderRadius: '0.5rem',
          margin: '1rem 0'
        }}>
          <strong>Error:</strong> {formError || 'Unable to load employee data. Please refresh the page or contact administrator.'}
        </div>
      )}

      {/* Leave Types Grid (SICK and CASUAL cards) */}
      {!isAdmin && (
      <div className="leave_types_grid">
        {loading ? (
          <div style={{ 
            gridColumn: '1 / -1', 
            textAlign: 'center', 
            padding: '2rem',
            color: '#6b7280' 
          }}>
            Loading leave balance...
          </div>
        ) : leaveTypes.length === 0 ? (
          <div style={{ 
            gridColumn: '1 / -1', 
            textAlign: 'center', 
            padding: '2rem',
            color: '#6b7280' 
          }}>
            No leave balance data available
          </div>
        ) : (
          leaveTypes.map((leave, index) => (
            <div key={index} className="leave_type_card">
              <div className="leave_type_header">
                <div className="days_left bodyMediumText1">{leave.daysLeft}</div>
                <div className={`leave_type_icon ${leave.iconClass} `}>
                  <leave.icon size={20} style={{ color: leave.color }} />
                </div>
              </div>
              <div className="leave_type_name bodyMediumText3">{leave.displayName}</div>
              <div className="leave_usage bodyRegularText4">
                {leave.usedDays} used of {leave.totalDays} days
              </div>
              <div style={{
                width: '100%',
                height: '4px',
                backgroundColor: '#e5e7eb',
                borderRadius: '2px',
                marginTop: '0.5rem',
                overflow: 'hidden'
              }}>
                <div style={{
                  width: `${Math.min((leave.usedDays / leave.totalDays) * 100, 100)}%`,
                  height: '100%',
                  backgroundColor: leave.color,
                  borderRadius: '2px',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            </div>
          ))
        )}
      </div>
      )}

      {/* Leave Summary */}
      {!isAdmin && (
      <div className="leave_summary">
        <div className="summary_card">
          <div className="summary_content ">
            <div className="summary_label bodyMediumText3">Total Days Used</div>
            <div className="summary_value bodyMediumText2">{stats.totalDaysUsed}</div>
          </div>
          <div className="summary_icon">
            <Calendar size={24} color="#6B7280" />
          </div>
        </div>
        <div className="summary_card">
          <div className="summary_content">
            <div className="bodyMediumText3 summary_label">Pending Requests</div>
            <div className="bodyMediumText2 summary_value">{stats.pendingRequests}</div>
          </div>
          <div className="summary_icon">
            <Clock size={24} color="#6B7280" />
          </div>
        </div>
      </div>
      )}

      {/* Unapproved Leave Reminder - Employee only, auto-hide after 10s */}
      {!isAdmin && !warningDismissed && (
      <div style={{
                      backgroundColor: '#fef3c7',
                      border: '1px solid #f59e0b',
                      borderRadius: '8px',
                      padding: '12px 16px',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '12px'
                    }}>
                      <AlertTriangle style={{ color: '#d97706', flexShrink: 0, marginTop: '2px' }} size={20} />
                      <div style={{ flex: 1 }}>
                        <h3 style={{ 
                          margin: 0, 
                          fontSize: '14px', 
                          fontWeight: 600, 
                          color: '#92400e',
                          marginBottom: '4px'
                        }}>
                          Unapproved Leave Reminder
                        </h3>
                       
                        <p style={{ 
                          margin: '8px 0 0 0', 
                          fontSize: '12px', 
                          color: '#92400e',
                          fontStyle: 'italic'
                        }}>
                          Unapproved leave days are treated as unpaid leave
                        </p>
                      </div>
                      <button 
                        onClick={() => setWarningDismissed(true)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '4px',
                          color: '#92400e'
                        }}
                      >
                        <X size={16} />
                      </button>
                    </div>
      )}

      {/* Leave History */}
      <div className="leave_history">
        <div className="history_header">
          <div className="header_left">
            <FileText className="text-blue-500" size={20} />
            <h2 className='bodyMediumText2'>
              {isAdmin ? 'All Employee Leave History' : 'Leave History'}
            </h2>
          </div>

          <div className="filter_section">
            <div className="filter_group">
              {/* Employee Filter - Admin Only */}
              {isAdmin && (
                <Select 
                  value={filters.employee}
                  onValueChange={(value) => handleFilterChange('employee', value)}
                >
                  <SelectTrigger 
                    className="bodyMediumText4"
                    style={{ minWidth: '180px', marginRight: '10px' }}
                  >
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {Array.from(new Set(leaveHistory.map(lh => lh.employeeName).filter(Boolean)))
                      .sort()
                      .map(employeeName => (
                        <SelectItem key={employeeName} value={employeeName}>
                          {employeeName}
                        </SelectItem>
                      ))
                    }
                  </SelectContent>
                </Select>
              )}

              {/* Quick Filter Buttons */}
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
        </div>

        {/* Leave Entries */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            Loading leave history...
          </div>
        ) : filteredLeaveHistory.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#6b7280' }}>
            {leaveHistory.length === 0
              ? (isAdmin ? "No employee leave requests have been submitted yet." : "No leave requests found. Click 'Request Leave' to submit your first request.")
              : `No leave requests found for the selected ${filters.filterMode} filter.`}
          </div>
        ) : (
          filteredLeaveHistory.map((leave) => (
            <div key={leave.id} className="leave_entry">
              <div className="leave_entry_header">
                <div className="leave_info">
                  <h3 className='bodyMediumText3' style={{ margin: '0px !important' }}>
                    {leave.type} • {leave.duration}
                  </h3>
                  {isAdmin && leave.employeeName && (
                    <span className="employee_name bodyRegularText5" style={{ color: '#666', fontSize: '0.85rem', fontStyle: 'italic' }}>
                      by {leave.employeeName}
                    </span>
                  )}
                  <div className="leave_dates bodyRegularText5">{leave.dateRange}</div>
                  <div className="leave_reason bodyRegularText4">{leave.reason}</div>

                  {leave.rawData?.has_documentation && (
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      marginTop: '0.5rem',
                      padding: '0.5rem',
                      backgroundColor: '#f0f9ff',
                      borderRadius: '0.375rem',
                      border: '1px solid #bfdbfe'
                    }}>
                      <FileText size={16} style={{ color: '#3b82f6' }} />
                      <div style={{ fontSize: '0.875rem', color: '#1e40af' }}>
                        <strong>Document attached:</strong> {leave.rawData.document_name || 'Supporting document'}
                      </div>
                      {leave.rawData.document_url && (
                        <button
                          onClick={() => window.open(leave.rawData.document_url, '_blank')}
                          style={{
                            padding: '0.25rem 0.5rem',
                            fontSize: '0.75rem',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '0.25rem',
                            cursor: 'pointer'
                          }}
                        >
                          View Document
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Status + Admin Buttons */}
                <div className="leave_status" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
                  <span className={`bodyMediumText4 status_badge ${
                    leave.status === 'approved' ? 'status_approved' : 
                    leave.status === 'rejected' ? 'status_rejected' : 
                    'status_pending'
                  }`}>
                    {leave.status?.charAt(0).toUpperCase() + leave.status?.slice(1) || 'Pending'}
                  </span>

                  <span className="applied_date bodyRegularText5">
                    {leave.appliedDate}
                  </span>

                  {/* Show Approve/Reject for Admin on Pending only */}
                  {isAdmin && leave.status === 'pending' && (
                    <div className="request-actions" style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button
                        className="approve-btn bodyMediumText5"
                        onClick={() => handleApproveRequest(leave.id)}
                        disabled={actionLoading === leave.id}
                      >
                        {actionLoading === leave.id ? 'Loading...' : 'Approve'}
                      </button>
                      <button
                        className="reject-btn bodyMediumText5"
                        onClick={() => handleRejectRequest(leave.id, 'Rejected by admin')}
                        disabled={actionLoading === leave.id}
                      >
                        {actionLoading === leave.id ? 'Loading...' : 'Reject'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Leave Request Form Modal */}
      {showLeaveForm && !isAdmin && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '0.5rem',
            maxWidth: '500px',
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto'
          }}>
            {formError && (
              <div style={{ 
                color: '#dc2626', 
                fontSize: '0.875rem', 
                margin: '1rem',
                padding: '0.5rem',
                backgroundColor: '#fef2f2',
                borderRadius: '0.375rem',
                border: '1px solid #fecaca'
              }}>
                {formError}
              </div>
            )}
            
            <LeaveRequestForm
              onSubmit={handleLeaveSubmit}
              onClose={() => {
                setShowLeaveForm(false);
                setFormError('');
              }}
            />

          </div>
        </div>
      )}
    </div>
  );
};

export default Leave;