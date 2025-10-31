import React, { useState, useEffect } from 'react';
import { Plus, Calendar, HeartPulse, Coffee, Zap, Clock, FileText, RefreshCw } from 'lucide-react';
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
  const { 
    leaveBalance, 
    loading, 
    error, 
    requestLeave,
    refreshBalance
  } = useLeave();
  
  // Add state for leave requests since it's not in the context
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all',
    filterMode: 'all', // 'all', 'week', 'month', or 'custom'
    startDate: '',
    endDate: '',
    employee: 'all' // For admin view - filter by employee
  });
  
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [formError, setFormError] = useState('');

  // Load data when component mounts or user changes
  useEffect(() => {
    if (user) {
      refreshLeaveData();
    }
  }, [user, isAdmin]);

  // Close calendar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (calendarVisible && !event.target.closest('.history_header')) {
        setCalendarVisible(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [calendarVisible]);

  // Function to load leave requests
  const loadLeaveRequests = async () => {
    if (!user) return;
    
    try {
      const { leaveApi } = await import('../../utils/supabase');
      let requests = [];
      
      if (isAdmin) {
        //console.log('� Admin view: Loading ALL employee leave requests');
        requests = await leaveApi.getAllLeaveRequestsWithEmployees();
        //console.log('✅ All leave requests loaded for admin:', requests.length);
      } else {
        const employeeId = user.employee_id || user.id;
        //console.log('� Employee view: Loading leave requests for employee ID:', employeeId);
        requests = await leaveApi.getLeaveRequests(employeeId);
      }
      
      // Transform data to include employee_name (similar to timesheet approach)
      const transformedRequests = requests.map(request => ({
        ...request,
        employee_name: request.employees?.name || 
                      `${request.employees?.first_name || ''} ${request.employees?.last_name || ''}`.trim() ||
                      request.employee_name ||
                      null
      }));
      
      //console.log('✅ Leave requests loaded:', transformedRequests);
      setLeaveRequests(transformedRequests || []);
    } catch (error) {
      console.error('❌ Error loading leave requests:', error);
      setLeaveRequests([]);
    }
  };

  // Combined refresh function
  const refreshLeaveData = async () => {
    if (isAdmin) {
      await loadLeaveRequests();
    } else {
      await Promise.all([
        refreshBalance(),
        loadLeaveRequests()
      ]);
    }
  };

  // Define leave type configurations with icons
  const leaveTypeConfigs = [
    {
      type: 'sick',
      displayName: 'Sick Leave',
      icon: HeartPulse,
      iconClass: 'sick_leave_icon',
      color: '#ef4444'
    },
    {
      type: 'casual',
      displayName: 'Casual Leave',
      icon: Coffee,
      iconClass: 'casual_leave_icon',
      color: '#3b82f6'
    },
  
  ];

  // Calculate leave statistics from balance data
  const calculateLeaveStats = () => {
    if (!leaveBalance) {
      return leaveTypeConfigs.map(config => ({
        ...config,
        daysLeft: 0,
        totalDays: 8, // Fixed allocation per leave type
        usedDays: 0
      }));
    }

    return leaveTypeConfigs.map(config => {
      // Each leave type has a fixed allocation of 8 days
      const totalAllocated = 8;
      
      // Get used days - calculate from approved leave requests for this type
      const usedDaysFromRequests = leaveRequests
        ? leaveRequests
            .filter(req => 
              req.leave_type === config.type && 
              req.status === 'approved'
            )
            .reduce((sum, req) => {
              const startDate = new Date(req.start_date);
              const endDate = new Date(req.end_date);
              const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
              return sum + duration;
            }, 0)
        : 0;
      
      // Also check the balance table for used days (fallback)
      const usedFromBalance = leaveBalance[`${config.type}_used`] || 0;
      
      // Use the higher value (requests calculation is more accurate)
      const actualUsed = Math.max(usedDaysFromRequests, usedFromBalance);
      
      // Days left = total allocated - used
      const daysLeft = Math.max(0, totalAllocated - actualUsed);
      
      return {
        ...config,
        daysLeft: daysLeft,
        totalDays: totalAllocated,
        usedDays: actualUsed
      };
    });
  };

  // Calculate overall statistics
  const calculateStats = () => {
    // Calculate total used days from approved leave requests (same logic as calculateLeaveStats)
    const totalUsed = leaveTypeConfigs.reduce((sum, config) => {
      // Get used days from approved leave requests for this type
      const usedDaysFromRequests = leaveRequests
        ? leaveRequests
            .filter(req => 
              req.leave_type === config.type && 
              req.status === 'approved'
            )
            .reduce((reqSum, req) => {
              const startDate = new Date(req.start_date);
              const endDate = new Date(req.end_date);
              const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
              return reqSum + duration;
            }, 0)
        : 0;
      
      // Also check the balance table for used days (fallback)
      const usedFromBalance = leaveBalance?.[`${config.type}_used`] || 0;
      
      // Use the higher value (requests calculation is more accurate)
      const actualUsed = Math.max(usedDaysFromRequests, usedFromBalance);
      
      return sum + actualUsed;
    }, 0);

    const pendingCount = leaveRequests?.filter(req => 
      req.status === 'pending' || !req.status
    ).length || 0;

    return {
      totalDaysUsed: totalUsed,
      pendingRequests: pendingCount
    };
  };

  const leaveTypes = isAdmin ? [] : calculateLeaveStats();
  const stats = isAdmin ? { totalDaysUsed: 0, pendingRequests: 0 } : calculateStats();

  const handleLeaveSubmit = async (leaveData) => {
    try {
      setFormError('');
      
      // Add user information to leave data
      const leaveRequestData = {
        ...leaveData,
        employee_id: user.employee_id || user.id,
        user_id: user.id
      };
      
      await requestLeave(leaveRequestData);
      setShowLeaveForm(false);
      // Refresh data to show new request
      await refreshLeaveData();
    } catch (error) {
      console.error('Leave submission error:', error);
      setFormError(error.message || 'Failed to submit leave request');
    }
  };

  // Format leave requests for display
  const formatLeaveHistory = () => {
    if (!leaveRequests || leaveRequests.length === 0) {
      return [];
    }

    return leaveRequests
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(request => {
        const startDate = new Date(request.start_date);
        const endDate = new Date(request.end_date);
        const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        
        const config = leaveTypeConfigs.find(c => c.type === request.leave_type) || leaveTypeConfigs[0];

        // Employee name for admin view (same approach as timesheet)
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

  // Filter leave requests (similar to timesheet filtering)
  const filteredLeaveHistory = leaveHistory.filter(leave => {
    // Employee filter (admin only)
    if (isAdmin && filters.employee !== 'all' && leave.employeeName !== filters.employee) {
      return false;
    }

    // Date range filter based on filter mode
    if (filters.filterMode === 'week') {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      const leaveDate = new Date(leave.raw_start_date);

      if (leaveDate < weekAgo) {
        return false;
      }
    } else if (filters.filterMode === 'month') {
      const monthAgo = new Date();
      monthAgo.setDate(monthAgo.getDate() - 30);
      const leaveDate = new Date(leave.raw_start_date);

      if (leaveDate < monthAgo) {
        return false;
      }
    }

    // Custom date range filter
    if (filters.startDate || filters.endDate) {
      const leaveDate = new Date(leave.raw_start_date);

      if (filters.startDate && new Date(filters.startDate) > leaveDate) {
        return false;
      }

      if (filters.endDate && new Date(filters.endDate) < leaveDate) {
        return false;
      }
    }

    return true;
  });

  const handleFilterChange = (field, value) => {
    //console.log('🔄 Filter change:', field, '=', value);
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="leave_container">
      {/* Header */}
      <div className="leave_header">
        <div className="leave_title">
          <h1 className='bodyMediumText1'>Leave Requests</h1>
          <p className='bodyRegularText4'>Manage your team time off and leave applications</p>
          {/* {error && (
            <div style={{ 
              color: '#dc2626', 
              fontSize: '0.875rem', 
              marginTop: '0.5rem',
              padding: '0.5rem',
              backgroundColor: '#fef2f2',
              borderRadius: '0.375rem',
              border: '1px solid #fecaca'
            }}>
              {error}
            </div>
          )} */}
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
            disabled={loading}
          >
            <Plus size={16} />
            Request Leave
          </button>
          )}
        </div>
      </div>

      {/* Leave Types Grid */}
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
                  width: `${Math.min((leave.usedDays / 8) * 100, 100)}%`,
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
                    style={{
                      minWidth: '180px',
                      marginRight: '10px'
                    }}
                  >
                    <SelectValue placeholder="All Employees" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {/* Get unique employee names from leave requests */}
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
              
              {/* Custom Calendar - Show/Hide based on state */}
              {calendarVisible && (
                <CustomCalendar
                  selectedRange={{
                    from: filters.startDate ? new Date(filters.startDate) : null,
                    to: filters.endDate ? new Date(filters.endDate) : null
                  }}
                  onDateRangeSelect={(range) => {
                    if (range?.from && range?.to) {
                      // Convert dates to YYYY-MM-DD format
                      const startDate = range.from.toISOString().split('T')[0];
                      const endDate = range.to.toISOString().split('T')[0];
                      
                      handleFilterChange('startDate', startDate);
                      handleFilterChange('endDate', endDate);
                      handleFilterChange('filterMode', 'custom');
                    } else if (!range?.from && !range?.to) {
                      // Clear date filters
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
        {loading ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '2rem',
            color: '#6b7280' 
          }}>
            Loading leave history...
          </div>
        ) : filteredLeaveHistory.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '2rem',
            color: '#6b7280' 
          }}>
            {leaveHistory.length === 0
              ? (isAdmin ? "No employee leave requests have been submitted yet." : "No leave requests found. Click 'Request Leave' to submit your first request.")
              : `No leave requests found for the selected ${filters.filterMode} filter.`
            }
          </div>
        ) : (
          filteredLeaveHistory.map((leave) => (
            <div key={leave.id} className="leave_entry">
              <div className="leave_entry_header">
                <div className="leave_info">
                  <h3 className='bodyMediumText3' style={{margin:'0px !important' }}>{leave.type} • {leave.duration}</h3>
                  {isAdmin && leave.employeeName && (
                    <span className="employee_name bodyRegularText5" style={{ 
                      color: '#666', 
                      fontSize: '0.85rem',
                      fontStyle: 'italic' 
                    }}>
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
                  {/* <div className="leave_dates">{leave.dateRange}</div>
                  <div className="leave_reason">{leave.reason}</div> */}
                </div>
                <div className="leave_status">
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
              onCancel={() => {
                setShowLeaveForm(false);
                setFormError('');
              }}
              onClose={() => {
                setShowLeaveForm(false);
                setFormError('');
              }}
              availableLeaveTypes={leaveTypeConfigs.map(config => ({
                value: config.type,
                label: config.displayName,
                available: leaveBalance?.[`${config.type}_leave`] || 0
              }))}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default Leave;
