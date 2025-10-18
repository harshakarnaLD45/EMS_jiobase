import React, { useState, useEffect } from 'react';
import { Plus, Clock, Calendar, Eye, Edit2, Trash2, CheckCircle, TrendingUp, Clock4 } from 'lucide-react';
import './timesheet.css';
import * as Dialog from '@radix-ui/react-dialog';
import { CircleCheckBig } from '../../components/custom_icons';
import { useAuth } from '../../contexts/AuthContext';
import { timesheetApi, employeeApi } from '../../utils/supabase';

import { TimesheetForm } from '../../components';
const Timesheet = () => {
    const [timesheetDialogOpen, setTimesheetDialogOpen] = useState(false);
    const [filters, setFilters] = useState({
        status: 'all',
        filterMode: 'week', // 'all', 'week', or 'month' - default to week
        startDate: '',
        endDate: '',
        search: ''
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
    const { user } = useAuth();
    const [employee, setEmployee] = useState(null);

    // Load timesheets from database
    const loadTimesheets = async () => {
        try {
            setLoading(true);
            setError(null);

            if (!user) {
                console.log('⚠️ No user found, cannot load timesheets');
                return;
            }

            // Get employee data first
            let employeeData = null;
            try {
                employeeData = await employeeApi.getEmployeeByUser(user);
                setEmployee(employeeData);
                console.log('✅ Employee data loaded:', employeeData);
            } catch (empError) {
                console.log('⚠️ Could not load employee data:', empError.message);
                // Continue with user ID if employee lookup fails
            }

            // Get employee ID for timesheet lookup
            const employeeId = employeeData?.employee_id || employeeData?.id || user.employee_id || user.id;
            
            if (!employeeId) {
                throw new Error('Could not determine employee ID for timesheet lookup');
            }

            console.log('🔍 Loading timesheets for employee ID:', employeeId);

            // Load timesheets using the API
            const timesheetData = await timesheetApi.getTimesheetsByEmployeeId(employeeId);
            
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
                            description: task.taskTitle || task.description || 'No description',
                            hours: parseFloat(task.timeSpent || task.hours || 0)
                        }));
                    } else if (Array.isArray(timesheet.tasks)) {
                        parsedTasks = timesheet.tasks.map((task, index) => ({
                            id: task.id || index + 1,
                            description: task.taskTitle || task.description || 'No description',
                            hours: parseFloat(task.timeSpent || task.hours || 0)
                        }));
                    }
                } catch (error) {
                    console.log('⚠️ Error parsing tasks for timesheet:', timesheet.id, error.message);
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
                    hours: `${timesheet.hours}h`,
                    hoursWorked: timesheet.hours,
                    tasks: parsedTasks,
                    note: timesheet.note || 'No notes',
                    status: timesheet.status || 'draft',
                    created_at: timesheet.created_at,
                    raw_date: timesheet.date
                };
            });

            setTimesheets(transformedTimesheets);
            calculateStats(transformedTimesheets);
            
            console.log('✅ Timesheets loaded successfully:', transformedTimesheets.length);
            console.log('📋 Sample timesheet data:', transformedTimesheets[0]);

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

  
    const StatusBadge = ({ status }) => {
        const getStatusStyles = () => {
            switch (status.toLowerCase()) {
                case 'approved':
                    return 'status_approved';
                case 'submitted':
                    return 'status_submitted';
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
                return (
                    <>
                        <div className="tooltip">
                            <button className="action_icon">
                                <Eye size={16} />
                            </button>
                            <span className="tooltip_text">View Details</span>
                        </div>
                        {/* <div className="tooltip">
                            <button className="action_icon">
                                <Edit2 size={16} />
                            </button>
                            <span className="tooltip_text">Retract & Edit</span>
                        </div> */}
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

    const filteredTimesheets = timesheets.filter(timesheet => {
        // Status filter
        if (filters.status !== 'all' && timesheet.status !== filters.status) {
            return false;
        }

        // Date range filter based on filter mode
        if (filters.filterMode === 'week') {
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            const timesheetDate = new Date(timesheet.raw_date || timesheet.date);
            
            if (timesheetDate < weekAgo) {
                return false;
            }
        } else if (filters.filterMode === 'month') {
            const monthAgo = new Date();
            monthAgo.setDate(monthAgo.getDate() - 30);
            const timesheetDate = new Date(timesheet.raw_date || timesheet.date);
            
            if (timesheetDate < monthAgo) {
                return false;
            }
        }
        // Custom date range filter
        if (filters.startDate || filters.endDate) {
            const timesheetDate = new Date(timesheet.raw_date || timesheet.date);

            if (filters.startDate && new Date(filters.startDate) > timesheetDate) {
                return false;
            }

            if (filters.endDate && new Date(filters.endDate) < timesheetDate) {
                return false;
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

    const handleFilterChange = (field, value) => {
        console.log('🔄 Filter change:', field, '=', value);
        
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
                    <p className=' bodyRegularText4'>Track your working hours and manage timesheets</p>
                </div>
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
                                        // Reload timesheets from database to get latest data
                                        loadTimesheets();
                                        setTimesheetDialogOpen(false);
                                    }}
                                />
                            </Dialog.Content>
                        </Dialog.Portal>
                    </Dialog.Root>
                </div>


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

            {/* Stats */}
            {!loading && !error && (
                <div className="timesheet_stats">
                    <div className="stat_card">
                        <div>
                            <div className="stat_label bodyRegularText4">Today's Hours</div>
                            <div className="stat_value bodyMediumText2 ">{stats.todayHours}</div>
                        </div>
                        <div className="stat_icon"><Clock className="time_card_icons w-5 h-5 text-blue-500" /></div>
                    </div>

                  
                    <div className="stat_card">
                        <div>
                            <div className="stat_label bodyRegularText4">Approved</div>
                            <div className="stat_value bodyMediumText2">{stats.approved}</div>
                        </div>
                        <div className="stat_icon greeen_green">
                            <CircleCheckBig size={24} className="w-6 h-6 text-green-500 time_card_icons" />
                        </div>
                    </div>

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
                        <h2 className="bodyMediumText2">Recent Timesheets</h2>
                    </div>
                    <div className="filter_section">
                        <div className="filter_group">
                           
                            <button  
                                className={`bodyMediumText4 filter_btn ${filters.filterMode === 'week' ? 'active' : ''}`}
                                onClick={() => handleFilterChange('filterMode', 'week')}
                            >
                                 Week
                            </button>
                            <button 
                                className={`bodyMediumText4 filter_btn ${filters.filterMode === 'month' ? 'active' : ''}`}
                                onClick={() => handleFilterChange('filterMode', 'month')}
                            >
                                 Month
                            </button>
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
                                ? "You haven't logged any timesheets yet." 
                                : `No timesheets found for the selected ${filters.filterMode} filter.`
                            }
                        </p>
                       
                    </div>
                )}

                {filteredTimesheets.map((timesheet) => (
                    <div key={timesheet.id} className="timesheet_entry">
                        <div className="entry_header" style={{margin:'0'}}>
                            <span className="entry_date bodyMediumText3">{timesheet.date}</span>
                            <div className="entry_status bodyMediumText3">
                                <StatusBadge status={timesheet.status} />
                                <div className="entry_actions">
                                    {getEntryActions(timesheet.status)}
                                </div>
                            </div>
                        </div>
                        <div className="entry_details" style={{margin:'0'}}>
                            <span className='bodyRegularText4'>Hours: {timesheet.hours}</span>

                        </div>

                        {timesheet.tasks && timesheet.tasks.length > 0 && (
                            <div className="entry_tasks " >
                                <div className="tasks_header bodyRegularText4 ">Tasks:</div>
                                <div className="task_bubbles">
                                    {timesheet.tasks.map((task, index) => (
                                        <div key={task.id || index} className="task_bubble ">
                                            <span className="task_text bodyMediumText4">
                                                {task.description || task.taskTitle || 'No description'}
                                            </span>
                                            <span className="task_duration bodyRegularText5">
                                                {task.hours || task.timeSpent || 0}h
                                            </span>
                                        </div>
                                    ))}
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
        </div >
    );
};

export default Timesheet;
