import React, { useState, useEffect } from 'react';
import { Plus, Calendar, HeartPulse, Coffee, Zap, Clock, FileText, RefreshCw } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLeave } from '../../contexts/LeaveContext';
import { LeaveRequestForm } from '../../components';
import './leave.css';

const Leave = () => {
  const { user } = useAuth();
  const { 
    leaveBalance, 
    loading, 
    error, 
    requestLeave,
    refreshBalance
  } = useLeave();
  
  // Add state for leave requests since it's not in the context
  const [leaveRequests, setLeaveRequests] = useState([]);
  
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [formError, setFormError] = useState('');

  // Load data when component mounts or user changes
  useEffect(() => {
    if (user) {
      refreshLeaveData();
    }
  }, [user]);

  // Function to load leave requests
  const loadLeaveRequests = async () => {
    if (!user) return;
    
    try {
      const { leaveApi } = await import('../../utils/supabase');
      const employeeId = user.employee_id || user.id;
      console.log('📋 Loading leave requests for employee ID:', employeeId);
      
      const requests = await leaveApi.getLeaveRequests(employeeId);
      console.log('✅ Leave requests loaded:', requests);
      setLeaveRequests(requests || []);
    } catch (error) {
      console.error('❌ Error loading leave requests:', error);
      setLeaveRequests([]);
    }
  };

  // Combined refresh function
  const refreshLeaveData = async () => {
    await Promise.all([
      refreshBalance(),
      loadLeaveRequests()
    ]);
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

  const leaveTypes = calculateLeaveStats();
  const stats = calculateStats();

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
        
        const config = leaveTypeConfigs.find(c => c.type === request.leave_type) || 
                      leaveTypeConfigs[0];

        return {
          id: request.id,
          type: config.displayName,
          duration: `${duration} day${duration > 1 ? 's' : ''}`,
          dateRange: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
          reason: request.reason || 'No reason provided',
          status: request.status || 'pending',
          approvedBy: request.approved_by || 'Pending approval',
          appliedDate: `Applied ${new Date(request.created_at).toLocaleDateString()}`,
          rawData: request
        };
      });
  };

  const leaveHistory = formatLeaveHistory();

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
          <button 
            className="request_leave_btn bodyMediumText3"
            onClick={() => setShowLeaveForm(true)}
            disabled={loading}
          >
            <Plus size={16} />
            Request Leave
          </button>
        </div>
      </div>

      {/* Leave Types Grid */}
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

      {/* Leave Summary */}
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

      {/* Leave History */}
      <div className="leave_history">
        <div className="history_header">
          <FileText className="text-blue-500" size={20} />
          <h2 className='bodyMediumText2'>Leave History</h2>
        </div>
        {loading ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '2rem',
            color: '#6b7280' 
          }}>
            Loading leave history...
          </div>
        ) : leaveHistory.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            padding: '2rem',
            color: '#6b7280' 
          }}>
            No leave requests found. Click "Request Leave" to submit your first request.
          </div>
        ) : (
          leaveHistory.map((leave) => (
            <div key={leave.id} className="leave_entry">
              <div className="leave_entry_header">
                <div className="leave_info">
                  <h3 className='bodyMediumText3' style={{margin:'0px !important' }}>{leave.type} • {leave.duration}</h3>
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
                  {/* <span className="approved_by">
                    {leave.status === 'approved' ? `Approved by ${leave.approvedBy}` : 
                     leave.status === 'rejected' ? 'Request rejected' :
                     'Awaiting approval'}
                  </span> */}
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
      {showLeaveForm && (
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
