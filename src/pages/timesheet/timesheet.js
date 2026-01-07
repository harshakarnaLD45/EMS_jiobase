import React, { useState, useEffect } from 'react'; 
import { Plus, Clock, Calendar, Eye, Edit2, Trash2, CheckCircle, TrendingUp, Clock4, Info } from 'lucide-react';
import { Tooltip } from '@mui/material';
import './timesheet.css';
import * as Dialog from '@radix-ui/react-dialog';
import { CircleCheckBig } from '../../components/custom_icons';
import { useAuth } from '../../contexts/AuthContext';
import { timesheetApi, employeeApi } from '../../utils/supabase';
import CustomCalendar from '../../components/common/calender/CustomCalendar';
import '../../components/common/calender/CustomCalendar.css';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';

import { TimesheetForm } from '../../components';

// Helper function to format task time for display
const formatTaskTime = (hours, minutes) => {
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    if (h > 0 && m > 0) return `${h}h ${m}min`;
    if (h > 0) return `${h}h`;
    if (m > 0) return `${m}min`;
    return '0min';
};

// Helper function to format total hours for display
const formatTotalHours = (decimalHours) => {
    const totalMinutes = Math.round(decimalHours * 60);
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h > 0 && m > 0) return `${h}h ${m}min`;
    if (h > 0) return `${h}h`;
    if (m > 0) return `${m}min`;
    return '0min';
};

const Timesheet = () => {
    const [timesheetDialogOpen, setTimesheetDialogOpen] = useState(false);
    const [calendarVisible, setCalendarVisible] = useState(false);
    const [filters, setFilters] = useState({
        status: 'all',
        filterMode: 'all', // 'all', 'week', 'month', or 'custom'
        startDate: '',
        endDate: '',
        search: '',
        employee: 'all' // For admin view - filter by employee
    });
    const [timesheets, setTimesheets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [stats, setStats] = useState({
        weeklyHours: '0h',
        monthlyHours: '0h',
        approved: 0,
        pending: 0,
        todayHours: '0h'
    });
    const { user, isEmployee, isAdmin } = useAuth();
    const [employee, setEmployee] = useState(null);
    const [actionLoading, setActionLoading] = useState(null);
    const [actionStatus, setActionStatus] = useState({});

    // Load timesheets from database
    const loadTimesheets = async () => {
        try {
            setLoading(true);
            setError(null);

            if (!user) {
                return;
            }

            let timesheetData = [];

            // Check if admin - load all timesheets, if employee - load only their timesheets
            if (isAdmin()) {
                timesheetData = await timesheetApi.getAllTimesheets();
            } else {
                // Get employee data first
                let employeeData = null;
                try {
                    employeeData = await employeeApi.getEmployeeByUser(user);
                    setEmployee(employeeData);
                } catch (empError) {
                    // Continue with user ID if employee lookup fails
                }

                // Get employee ID for timesheet lookup
                const employeeId = employeeData?.employee_id || employeeData?.id || user.employee_id || user.id;

                if (!employeeId) {
                    throw new Error('Could not determine employee ID for timesheet lookup');
                }

                // Load timesheets using the API
                timesheetData = await timesheetApi.getTimesheetsByEmployeeId(employeeId);
            }

            // Transform data to match component format
            const transformedTimesheets = timesheetData.map(timesheet => {
                // Parse tasks from database format
                let parsedTasks = [];
                try {
                    if (typeof timesheet.tasks === 'string') {
                        const tasksJson = JSON.parse(timesheet.tasks || '[]');
                        // Transform from database format to component format
                        parsedTasks = tasksJson.map((task, index) => ({
                            id: task.id || index + 1,
                            taskTitle: task.taskTitle || 'No title',
                            description: task.description || '',
                            timeDisplay: task.timeSpent || formatTaskTime(task.hours, task.minutes)
                        }));
                    } else if (Array.isArray(timesheet.tasks)) {
                        parsedTasks = timesheet.tasks.map((task, index) => ({
                            id: task.id || index + 1,
                            taskTitle: task.taskTitle || 'No title',
                            description: task.description || '',
                            timeDisplay: task.timeSpent || formatTaskTime(task.hours, task.minutes)
                        }));
                    }
                } catch (error) {
                    parsedTasks = [];
                }

                return {
                    id: timesheet.id,
                    date: new Date(timesheet.date).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                    }),
                    hours: formatTotalHours(timesheet.hours),
                    hoursWorked: timesheet.hours,
                    tasks: parsedTasks,
                    note: timesheet.note || 'No notes',
                    status: timesheet.status || 'draft',
                    created_at: timesheet.created_at,
                    raw_date: timesheet.date,
                    employee_name: timesheet.employee_name || null // For admin view
                };
            });

            setTimesheets(transformedTimesheets);
            calculateStats(transformedTimesheets);

        } catch (error) {
            console.error('❌ Error loading timesheets:', error);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    // Calculate statistics from timesheets
    const calculateStats = (timesheetData) => {
        const now = new Date();
        const today = now.toISOString().split('T')[0];
        const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // Calculate today's hours
        const todayTimesheets = timesheetData.filter(ts => ts.raw_date === today);
        const todayHours = todayTimesheets.reduce((sum, ts) => sum + (ts.hoursWorked || 0), 0);

        // Calculate weekly hours (approved only)
        const weeklyTimesheets = timesheetData.filter(ts =>
            ts.raw_date >= weekAgo && ts.status === 'approved'
        );
        const weeklyHours = weeklyTimesheets.reduce((sum, ts) => sum + (ts.hoursWorked || 0), 0);

        // Calculate monthly hours (approved only)
        const monthlyTimesheets = timesheetData.filter(ts =>
            ts.raw_date >= monthAgo && ts.status === 'approved'
        );
        const monthlyHours = monthlyTimesheets.reduce((sum, ts) => sum + (ts.hoursWorked || 0), 0);

        // Count approved and pending
        const approved = timesheetData.filter(ts => ts.status === 'approved').length;
        const pending = timesheetData.filter(ts => ts.status === 'pending' || ts.status === 'submitted').length;

        setStats({
            weeklyHours: `${weeklyHours}h`,
            monthlyHours: `${monthlyHours}h`,
            todayHours: `${todayHours}h`,
            approved,
            pending
        });
    };

    // Load data on component mount
    useEffect(() => {
        loadTimesheets();
    }, [user]);

    // Close calendar when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (calendarVisible && !event.target.closest('.filter_section')) {
                setCalendarVisible(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [calendarVisible]);

    // Handle approve timesheet
    const handleApproveTimesheet = async (timesheetId) => {
        if (!timesheetId) return;
        
        try {
            setActionLoading(timesheetId);
            setActionStatus(prev => ({ ...prev, [timesheetId]: 'approving' }));

            const { supabase } = await import('../../utils/supabase');
            const { error } = await supabase
                .from('timesheets')
                .update({ status: 'approved' })
                .eq('id', timesheetId);

            if (error) throw error;

            setActionStatus(prev => ({ ...prev, [timesheetId]: 'approved' }));
            
            // Refresh data after a short delay
            setTimeout(() => {
                loadTimesheets();
            }, 1000);

            // Clean up status after delay
            setTimeout(() => {
                setActionStatus(prev => {
                    const newStatus = { ...prev };
                    delete newStatus[timesheetId];
                    return newStatus;
                });
            }, 3000);

        } catch (error) {
            console.error('Error approving timesheet:', error);
            setActionStatus(prev => ({ ...prev, [timesheetId]: 'error' }));
            
            setTimeout(() => {
                setActionStatus(prev => {
                    const newStatus = { ...prev };
                    delete newStatus[timesheetId];
                    return newStatus;
                });
            }, 3000);
        } finally {
            setActionLoading(null);
        }
    };

    // Handle reject timesheet
    const handleRejectTimesheet = async (timesheetId) => {
        if (!timesheetId) return;
        
        const reason = window.prompt('Enter rejection reason (optional):', 'Rejected by admin');
        if (reason === null) return; // User cancelled
        
        try {
            setActionLoading(timesheetId);
            setActionStatus(prev => ({ ...prev, [timesheetId]: 'rejecting' }));

            const { supabase } = await import('../../utils/supabase');
            const { error } = await supabase
                .from('timesheets')
                .update({ status: 'rejected' })
                .eq('id', timesheetId);

            if (error) throw error;

            setActionStatus(prev => ({ ...prev, [timesheetId]: 'rejected' }));
            
            // Refresh data after a short delay
            setTimeout(() => {
                loadTimesheets();
            }, 1000);

            // Clean up status after delay
            setTimeout(() => {
                setActionStatus(prev => {
                    const newStatus = { ...prev };
                    delete newStatus[timesheetId];
                    return newStatus;
                });
            }, 3000);

        } catch (error) {
            console.error('Error rejecting timesheet:', error);
            setActionStatus(prev => ({ ...prev, [timesheetId]: 'error' }));
            
            setTimeout(() => {
                setActionStatus(prev => {
                    const newStatus = { ...prev };
                    delete newStatus[timesheetId];
                    return newStatus;
                });
            }, 3000);
        } finally {
            setActionLoading(null);
        }
    };

    const StatusBadge = ({ status }) => {
        const getStatusStyles = () => {
            switch (status.toLowerCase()) {
                case 'approved':
                    return 'status_approved';
                case 'submitted':
                case 'pending':
                    return 'status_submitted';
                case 'rejected':
                    return 'status_rejected';
                case 'draft':
                    return 'status_draft';
                default:
                    return '';
            }
        };

        return (
            <span className={`status_indicator ${getStatusStyles()}`}>
                {status.charAt(0).toUpperCase() + status.slice(1)}
            </span>
        );
    };

    const getEntryActions = (status) => {
        switch (status.toLowerCase()) {
            case 'approved':
                return (
                    <div className="tooltip">
                        <button className="action_icon">
                            <Eye size={16} />
                        </button>
                        <span className="tooltip_text">View (Not Editable)</span>
                    </div>
                );
            case 'submitted':
            case 'pending':
                return (
                    <>
                        <div className="tooltip">
                            <button className="action_icon">
                                <Eye size={16} />
                            </button>
                            <span className="tooltip_text">View Details</span>
                        </div>
                    </>
                );
            case 'draft':
                return (
                    <>
                        <button className="action_icon">
                            <Edit2 size={16} />
                        </button>
                        <button className="action_icon">
                            <Trash2 size={16} />
                        </button>
                    </>
                );
            default:
                return null;
        }
    };

    const today = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    const todayTimesheet = timesheets.find(t => t.date === today);

    // Filter timesheets with proper date comparison
    const getFilteredTimesheets = () => {
        return timesheets.filter(timesheet => {
            // Status filter
            if (filters.status !== 'all' && timesheet.status !== filters.status) {
                return false;
            }

            // Employee filter (admin only)
            if (isAdmin() && filters.employee !== 'all' && timesheet.employee_name !== filters.employee) {
                return false;
            }

            // Get timesheet date and normalize it
            if (!timesheet.raw_date) return true;
            
            let timesheetDate;
            if (timesheet.raw_date.includes('T')) {
                timesheetDate = new Date(timesheet.raw_date);
            } else {
                timesheetDate = new Date(timesheet.raw_date + 'T00:00:00');
            }
            
            // Date range filter based on filter mode
            if (filters.filterMode === 'week') {
                const now = new Date();
                now.setHours(0, 0, 0, 0);
                
                const weekStart = new Date(now);
                weekStart.setDate(now.getDate() - now.getDay());
                
                const weekEnd = new Date(weekStart);
                weekEnd.setDate(weekStart.getDate() + 6);
                weekEnd.setHours(23, 59, 59, 999);

                if (timesheetDate < weekStart || timesheetDate > weekEnd) {
                    return false;
                }
            } else if (filters.filterMode === 'month') {
                const now = new Date();
                
                const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                monthStart.setHours(0, 0, 0, 0);
                
                const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                monthEnd.setHours(23, 59, 59, 999);

                if (timesheetDate < monthStart || timesheetDate > monthEnd) {
                    return false;
                }
            } else if (filters.filterMode === 'custom' && (filters.startDate || filters.endDate)) {
                if (filters.startDate) {
                    const startDate = new Date(filters.startDate + 'T00:00:00');
                    if (timesheetDate < startDate) {
                        return false;
                    }
                }

                if (filters.endDate) {
                    const endDate = new Date(filters.endDate + 'T23:59:59');
                    if (timesheetDate > endDate) {
                        return false;
                    }
                }
            }

            // Search filter
            if (filters.search) {
                const searchLower = filters.search.toLowerCase();
                const hasMatchingTask = timesheet.tasks && timesheet.tasks.some(task =>
                    (task.description && task.description.toLowerCase().includes(searchLower)) ||
                    (task.taskTitle && task.taskTitle.toLowerCase().includes(searchLower))
                );
                const matchesNote = timesheet.note &&
                    timesheet.note.toLowerCase().includes(searchLower);

                if (!hasMatchingTask && !matchesNote) {
                    return false;
                }
            }

            return true;
        });
    };

    const filteredTimesheets = getFilteredTimesheets();

    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
    };

    return (
        <div className="timesheet_container">
            {/* Header */}
            <div className="timesheet_header">
                <div className="timesheet_title">
                    <h1 className='bodyMediumText2'>Timesheets</h1>
                    <p className=' bodyRegularText4'>
                        {isAdmin() 
                            ? 'View and manage all employee timesheets' 
                            : 'Track your working hours and manage timesheets'
                        }
                    </p>
                </div>
                 {!isAdmin() && (
                <div className="btn_log_leave_section ">
                    <Dialog.Root open={timesheetDialogOpen} onOpenChange={setTimesheetDialogOpen}>
                        <Dialog.Trigger asChild>
                            <button className="className='bodyMediumText2 quick-action-btn new_time_btn primary">
                                <Plus className="w-4 h-4" />
                                New Timesheet
                            </button>
                        </Dialog.Trigger>
                        <Dialog.Portal>
                            <Dialog.Overlay className="dialog-overlay" />
                            <Dialog.Content className="dialog-content">
                                <TimesheetForm
                                    onClose={() => setTimesheetDialogOpen(false)}
                                    onSubmit={(newTimesheet) => {
                                        loadTimesheets();
                                        setTimesheetDialogOpen(false);
                                    }}
                                />
                            </Dialog.Content>
                        </Dialog.Portal>
                    </Dialog.Root>
                </div>)}
            </div>

            {/* Loading State */}
            {loading && (
                <div className="loading-state" style={{ padding: '2rem', textAlign: 'center' }}>
                    <Clock className="animate-spin w-8 h-8 mx-auto mb-2 text-blue-500" />
                    <p className='bodyMediumText2' >Loading timesheets...</p>
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="error-state" style={{ padding: '1rem', backgroundColor: '#fee', border: '1px solid #fcc', borderRadius: '8px', margin: '1rem 0' }}>
                    <p style={{ color: '#c33' }}>Error: {error}</p>
                    <button
                        onClick={loadTimesheets}
                        style={{ marginTop: '0.5rem', padding: '0.5rem 1rem', backgroundColor: '#007bff', color: 'white', border: 'none', borderRadius: '4px' }}
                    >
                        Retry
                    </button>
                </div>
            )}

            {/* Stats - Show for employees and admin */}
            {!loading && !error && (isEmployee() || isAdmin()) && (
                <div className="timesheet_stats">
                    {/* Today's Hours - show ONLY for employees */}
                    {isEmployee() && (
                        <div className="stat_card">
                            <div>
                                <div className="stat_label bodyRegularText4">Today's Hours</div>
                                <div className="stat_value bodyMediumText2">{stats.todayHours}</div>
                            </div>
                            <div className="stat_icon">
                                <Clock className="time_card_icons w-5 h-5 text-blue-500" />
                            </div>
                        </div>
                    )}

                    {/* Approved - show for both admin & employee */}
                    <div className="stat_card">
                        <div>
                            <div className="stat_label bodyRegularText4">Approved</div>
                            <div className="stat_value bodyMediumText2">{stats.approved}</div>
                        </div>
                        <div className="stat_icon greeen_green">
                            <CircleCheckBig size={24} className="w-6 h-6 text-green-500 time_card_icons" />
                        </div>
                    </div>

                    {/* Pending - show for both admin & employee */}
                    <div className="stat_card">
                        <div>
                            <div className="stat_label bodyRegularText4">Pending</div>
                            <div className="stat_value bodyMediumText2">{stats.pending}</div>
                        </div>
                        <div className="stat_icon">
                            <Clock4 className="time_card_icons w-5 h-5 text-orange-500" />
                        </div>
                    </div>
                </div>
            )}

            {/* Recent Timesheets */}
            <div className="recent_timesheets">
                <div className="recent_timesheets_header">
                    <div className="header_left">
                        <Calendar className="w-5 h-5 text-blue-500" />
                        <h2 className="bodyMediumText2">
                            {isAdmin() ? 'All Employee Timesheets' : 'Recent Timesheets'}
                        </h2>
                    </div>
                    <div className="filter_section">
                        <div className="filter_group">
                            {/* Employee Filter - Admin Only */}
                            {isAdmin() && (
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
                                        {Array.from(new Set(timesheets.map(ts => ts.employee_name).filter(Boolean)))
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

                {/* Empty State */}
                {!loading && !error && filteredTimesheets.length === 0 && (
                    <div className="empty-state" style={{
                        padding: '3rem 2rem',
                        textAlign: 'center',
                        border: '2px dashed #e0e0e0',
                        borderRadius: '8px',
                        backgroundColor: '#fafafa'
                    }}>
                        <Clock className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                        <h3 style={{ marginBottom: '0.5rem', color: '#666' }}>No Timesheets Found</h3>
                        <p style={{ color: '#888', marginBottom: '1.5rem' }}>
                            {timesheets.length === 0
                                ? (isAdmin() ? "No employee timesheets have been submitted yet." : "You haven't logged any timesheets yet.")
                                : `No timesheets found for the selected ${filters.filterMode} filter.`
                            }
                        </p>
                    </div>
                )}

                {filteredTimesheets.map((timesheet) => (
                    <div key={timesheet.id} className="timesheet_entry">
                        <div className="entry_header" style={{ margin: '0' }}>
                            <div className="entry_date_section">
                                <span className="entry_date bodyMediumText3">{timesheet.date}</span>
                                {/* Show employee name for admin view */}
                                {isAdmin() && timesheet.employee_name && (
                                    <span className="employee_name bodyRegularText5" style={{ 
                                        color: '#666', 
                                        fontSize: '0.85rem',
                                        fontStyle: 'italic' 
                                    }}>
                                        by {timesheet.employee_name}
                                    </span>
                                )}
                            </div>
                            <div className="entry_status bodyMediumText3">
                                <StatusBadge status={timesheet.status} />
                                
                                {/* Show view actions for employees, or approve/reject for admin on pending */}
                                {!isAdmin() && (
                                    <div className="entry_actions">
                                        {getEntryActions(timesheet.status)}
                                    </div>
                                )}
                                
                                {/* Admin: Show Approve/Reject buttons for pending/submitted timesheets */}
                                {isAdmin() && (timesheet.status === 'pending' || timesheet.status === 'submitted') && (
                                    <div className="request-actions" style={{ 
                                        display: 'flex', 
                                        gap: '0.5rem', 
                                        marginLeft: '0.5rem' 
                                    }}>
                                        <button
                                            className={`approve-btn bodyMediumText5 ${
                                                actionStatus[timesheet.id] === 'approved' ? 'success' : 
                                                actionStatus[timesheet.id] === 'approving' ? 'processing' : ''
                                            }`}
                                            onClick={() => handleApproveTimesheet(timesheet.id)}
                                            disabled={actionLoading === timesheet.id || 
                                                     ['approved', 'rejected'].includes(actionStatus[timesheet.id])}
                                        >
                                            {actionStatus[timesheet.id] === 'approving' ? 'Approving...' : 
                                             actionStatus[timesheet.id] === 'approved' ? 'Approved ✓' : 'Approve'}
                                        </button>
                                        <button
                                            className={`reject-btn bodyMediumText5 ${
                                                actionStatus[timesheet.id] === 'rejected' ? 'success' : 
                                                actionStatus[timesheet.id] === 'rejecting' ? 'processing' : ''
                                            }`}
                                            onClick={() => handleRejectTimesheet(timesheet.id)}
                                            disabled={actionLoading === timesheet.id || 
                                                     ['approved', 'rejected'].includes(actionStatus[timesheet.id])}
                                        >
                                            {actionStatus[timesheet.id] === 'rejecting' ? 'Rejecting...' : 
                                             actionStatus[timesheet.id] === 'rejected' ? 'Rejected ✗' : 'Reject'}
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="entry_details" style={{ margin: '0' }}>
                            <span className='bodyRegularText4'>Hours: {timesheet.hours}</span>
                        </div>

                        {timesheet.tasks && timesheet.tasks.length > 0 && (
                            <div className="entry_tasks " >
                                <div className="tasks_header bodyRegularText4 ">Tasks:</div>
                                <div className="task_bubbles">
                                    {timesheet.tasks.map((task, index) => {
                                        const hasDescription = task.description && task.description.trim() !== '';
                                        return (
                                            <div key={task.id || index} className="task_bubble">
                                                <span className="task_text bodyMediumText4">
                                                    {task.taskTitle || 'No title'}
                                                </span>
                                                <span className="task_duration bodyRegularText5">
                                                    {task.timeDisplay || task.timeSpent || '0min'}
                                                </span>
                                                {hasDescription && (
                                                    <Tooltip 
                                                        title={task.description}
                                                        arrow
                                                        placement="top"
                                                        slotProps={{
                                                            tooltip: {
                                                                sx: {
                                                                    bgcolor: '#1f2937',
                                                                    fontSize: '12px',
                                                                    maxWidth: '250px',
                                                                    padding: '8px 12px',
                                                                    '& .MuiTooltip-arrow': {
                                                                        color: '#1f2937',
                                                                    },
                                                                },
                                                            },
                                                        }}
                                                    >
                                                        <div className="task-info-icon">
                                                            <Info size={14} className="info-icon" />
                                                        </div>
                                                    </Tooltip>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Show note if available */}
                        {timesheet.note && timesheet.note !== 'No notes' && (
                            <div className="entry_note" style={{
                                marginTop: '0.5rem',
                                fontSize: '0.9rem',
                                color: '#666',
                                fontStyle: 'italic'
                            }}>
                                Note: {timesheet.note}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Timesheet;