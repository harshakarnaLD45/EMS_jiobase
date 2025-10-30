import React, { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { timesheetApi, leaveApi, employeeApi } from "../../utils/supabase";
import { useEmployees } from "../../contexts/EmployeeContext";
import { useAuth } from "../../contexts/AuthContext";
import {
    Calendar,
    Users,
    UserX,
    Palmtree,
    Download,
    LayoutGrid,
    List,
    Loader2
} from 'lucide-react';

import './attendence.css';

const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const years = ["2023", "2024", "2025", "2026"];

export default function Attendance() {
    const [selectedMonth, setSelectedMonth] = useState("October");
    const [selectedYear, setSelectedYear] = useState("2025");
    const [activeView, setActiveView] = useState("calendar");
    const [timesheets, setTimesheets] = useState([]);
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentEmployee, setCurrentEmployee] = useState(null);
    const [hoveredDay, setHoveredDay] = useState(null);
    const [infoDay, setInfoDay] = useState(null);
    const [filters, setFilters] = useState({
        employee: 'all'
    });

    const { employees } = useEmployees();
    const { user, isAdmin, isEmployee } = useAuth();

    // Handle filter changes
    const handleFilterChange = (field, value) => {
        setFilters(prev => ({
            ...prev,
            [field]: value
        }));
    };

    // Get attendance status for a specific day based on timesheet and leave data
    const getDayAttendanceStatus = (day) => {
        const monthIndex = months.indexOf(selectedMonth);
        const year = parseInt(selectedYear);
        
        // Create date string directly to avoid timezone issues
        const paddedMonth = String(monthIndex + 1).padStart(2, '0');
        const paddedDay = String(day).padStart(2, '0');
        const dateString = `${year}-${paddedMonth}-${paddedDay}`;
        
        // Create date object for day calculations
        const date = new Date(year, monthIndex, day);

        // Check for approved leave requests first (highest priority)
        const approvedLeave = leaveRequests?.find(leave => {
            if (leave.status !== 'approved') return false;
            
            // Normalize all dates to YYYY-MM-DD format for reliable comparison
            const leaveStartDate = leave.start_date.split('T')[0]; // Remove time part if present
            const leaveEndDate = leave.end_date.split('T')[0]; // Remove time part if present
            
            // Compare using string comparison since all are in YYYY-MM-DD format
            const isInRange = dateString >= leaveStartDate && dateString <= leaveEndDate;
            
            // Debug logging for multi-day leave issue
            if (dateString === '2025-10-17' || dateString === '2025-10-18') {
                console.log(`🔍 Leave check for ${dateString}:`, {
                    leaveStartDate,
                    leaveEndDate,
                    dateString,
                    isInRange,
                    leaveType: leave.leave_type
                });
            }
            
            return isInRange;
        });

        if (approvedLeave) {
            return 'leave'; // Approved leave takes precedence
        }

        // Check timesheet status for this date (exact string match)
        const dayTimesheets = timesheets.filter(timesheet => 
            timesheet.date === dateString
        );

        if (dayTimesheets.length > 0) {
            // Check if any timesheet is approved
            const hasApprovedTimesheet = dayTimesheets.some(ts => 
                ts.status === 'approved' || !ts.status // Treat null/undefined as approved for backward compatibility
            );
            
            // Check if any timesheet is rejected
            const hasRejectedTimesheet = dayTimesheets.some(ts => 
                ts.status === 'rejected'
            );

            if (hasApprovedTimesheet && !hasRejectedTimesheet) {
                return 'present'; // Approved timesheet = Present
            } else if (hasRejectedTimesheet) {
                return 'half-day'; // Rejected timesheet = Half-day
            }
        }

        // Check if it's a weekend (only Sunday)
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0) return 'weekend'; // Only Sunday is weekend

        return null; // No data for workdays (Monday-Saturday)
    };

    // Calculate attendance statistics from timesheet and leave data (role-based)
    const attendanceStats = React.useMemo(() => {
        const monthIndex = months.indexOf(selectedMonth);
        const year = parseInt(selectedYear);
        const daysInCurrentMonth = new Date(year, monthIndex + 1, 0).getDate();
        
        // Count working days (Monday-Saturday, excluding only Sunday)
        let workingDays = 0;
        for (let day = 1; day <= daysInCurrentMonth; day++) {
            const date = new Date(year, monthIndex, day);
            const dayOfWeek = date.getDay();
            // Count Monday-Saturday as working days (exclude only Sunday)
            if (dayOfWeek !== 0) {
                workingDays++;
            }
        }

        // Calculate daily attendance status for the month
        let presentDays = 0;
        let leaveDays = 0;
        let halfDays = 0;
        
        for (let day = 1; day <= daysInCurrentMonth; day++) {
            const status = getDayAttendanceStatus(day);
            switch (status) {
                case 'present':
                    presentDays++;
                    break;
                case 'leave':
                    leaveDays++;
                    break;
                case 'half-day':
                    halfDays++;
                    break;
                // 'weekend' and null (no data) don't count toward any category
            }
        }

        // Calculate absent days (working days with no data)
        const absentDays = Math.max(0, workingDays - presentDays - leaveDays - halfDays);

        return {
            workingDays,
            present: presentDays,
            absent: absentDays,
            leave: leaveDays,
            halfDay: halfDays,
            holidays: 0, // Can be extended for holiday data
            attendanceRate: workingDays > 0 ? Math.round(((presentDays + (halfDays * 0.5)) / workingDays) * 100) : 0
        };
    }, [timesheets, leaveRequests, selectedMonth, selectedYear]);

    // Load timesheet data and current employee info
    useEffect(() => {
        loadCurrentEmployeeData();
    }, [user, employees]);

    // Load timesheet data when employee info is ready
    useEffect(() => {
        if (currentEmployee || isAdmin()) {
            loadTimesheetData();
        }
    }, [selectedMonth, selectedYear, currentEmployee, isAdmin, filters.employee]);

    // Load current employee data for role-based filtering
    const loadCurrentEmployeeData = async () => {
        if (!user) return;

        try {
            // console.log('🔍 === EMPLOYEE IDENTIFICATION DEBUG ===');
            // console.log('🔍 Current user object:', JSON.stringify(user, null, 2));
            // console.log('🔍 User email:', user.email);
            // console.log('🔍 User id:', user.id);
            // console.log('🔍 User employee_id:', user.employee_id);
            // console.log('🔍 User name:', user.name);
            // console.log('🔍 Available employees count:', employees.length);
            // console.log('🔍 Employee emails:', employees.map(emp => ({ email: emp.email, name: emp.name || `${emp.first_name} ${emp.last_name}`, employee_id: emp.employee_id, id: emp.id })));

            // PRIORITY 1: If user already has employee_id from login, use it directly
            if (user.employee_id) {
                console.log('✅ PRIORITY 1: User has employee_id from login:', user.employee_id);

                // Find the full employee record for additional data
                const employeeRecord = employees.find(emp =>
                    emp.employee_id === user.employee_id ||
                    emp.id === user.id
                );

                const employeeData = {
                    id: user.id,
                    employee_id: user.employee_id, // THIS IS THE KEY FIELD
                    email: user.email,
                    name: user.name,
                    first_name: user.name?.split(' ')[0] || employeeRecord?.first_name || 'Employee',
                    last_name: user.name?.split(' ').slice(1).join(' ') || employeeRecord?.last_name || '',
                    role: user.role || 'employee',
                    department: user.department || employeeRecord?.department,
                    position: user.position || employeeRecord?.position
                };

                setCurrentEmployee(employeeData);
                console.log('✅ Set current employee from user.employee_id:', employeeData);
                console.log('🆔 *** EMPLOYEE_ID TO USE FOR FILTERING: ***', employeeData.employee_id);
                return;
            }

            // PRIORITY 2: Try to find employee by email (most reliable for employees list)
            let employee = employees.find(emp => emp.email === user.email);

            if (!employee) {
                // Try case-insensitive email match
                employee = employees.find(emp =>
                    emp.email?.toLowerCase() === user.email?.toLowerCase()
                );
                if (employee) {
                    console.log('👤 PRIORITY 2: Employee found via case-insensitive email match');
                }
            }

            // PRIORITY 3: Try to find by user ID or employee_id
            if (!employee) {
                employee = employees.find(emp =>
                    emp.user_id === user.id ||
                    emp.id === user.id ||
                    emp.employee_id === user.id
                );
                if (employee) {
                    console.log('👤 PRIORITY 3: Employee found via ID matching');
                }
            }

            // PRIORITY 4: Try matching by name parts
            if (!employee && user.name) {
                const userNameParts = user.name.toLowerCase().split(' ');
                employee = employees.find(emp => {
                    const empName = (emp.name || `${emp.first_name || ''} ${emp.last_name || ''}`).toLowerCase();
                    return userNameParts.some(part => empName.includes(part) && part.length > 2);
                });
                if (employee) {
                    console.log('👤 PRIORITY 4: Employee found via name matching');
                }
            }

            if (employee) {
                setCurrentEmployee(employee);
                console.log('✅ Current employee found in employees list:', employee);
                console.log('🆔 *** EMPLOYEE_ID TO USE FOR FILTERING: ***', employee.employee_id || employee.id);
            } else if (isEmployee()) {
                // If employee role but not found in list, create minimal employee data
                const minimalEmployee = {
                    id: user.id,
                    employee_id: user.id,
                    email: user.email,
                    name: user.name,
                    first_name: user.name?.split(' ')[0] || 'Employee',
                    last_name: user.name?.split(' ').slice(1).join(' ') || '',
                    role: 'employee'
                };
                setCurrentEmployee(minimalEmployee);
                console.log('⚠️ Created minimal employee data (not found in employees list):', minimalEmployee);
                console.log('🆔 *** EMPLOYEE_ID TO USE FOR FILTERING: ***', minimalEmployee.employee_id);
            } else {
                console.log('❌ User is not an employee or no matching employee found');
                setCurrentEmployee(null);
            }
        } catch (error) {
            console.error('❌ Error loading current employee data:', error);
        }
    };

    const loadTimesheetData = async () => {
        try {
            setLoading(true);
            setError(null);

            if (isAdmin()) {
                // Admin view - fetch all timesheets and leave requests
                console.log('👑 Admin view: Loading all attendance data');
                const [allTimesheets, allLeaveRequests] = await Promise.all([
                    timesheetApi.getAllTimesheets(),
                    leaveApi.getAllLeaveRequestsWithEmployees()
                ]);
                console.log('📊 Loaded for admin:', {
                    timesheets: allTimesheets.length,
                    leaveRequests: allLeaveRequests.length
                });
                
                // Apply employee filter if selected
                let filteredTimesheets = allTimesheets;
                let filteredLeaveRequests = allLeaveRequests;
                
                if (filters.employee !== 'all') {
                    filteredTimesheets = allTimesheets.filter(ts => 
                        ts.employee_name === filters.employee
                    );
                    
                    filteredLeaveRequests = allLeaveRequests.filter(lr => {
                        const employeeName = lr.employees?.name || 
                                           `${lr.employees?.first_name || ''} ${lr.employees?.last_name || ''}`.trim() ||
                                           'Unknown Employee';
                        return employeeName === filters.employee;
                    });
                    
                    console.log(`📊 Filtered for ${filters.employee}:`, {
                        timesheets: filteredTimesheets.length,
                        leaveRequests: filteredLeaveRequests.length
                    });
                }
                
                console.log('📋 Sample timesheets:', filteredTimesheets.slice(0, 3));
                console.log('📅 Sample leave requests:', filteredLeaveRequests.slice(0, 3));
                
                setTimesheets(filteredTimesheets);
                setLeaveRequests(filteredLeaveRequests);
            } else if (isEmployee() && currentEmployee) {
                // Employee view - fetch personal timesheets and leave requests
                console.log('👤 Employee view: Loading personal attendance data for', currentEmployee.email);
                
                const targetEmployeeId = currentEmployee.employee_id || currentEmployee.id;
                console.log('🆔 Loading data for employee ID:', targetEmployeeId);
                
                try {
                    // Fetch both timesheets and leave requests for the employee
                    const [employeeTimesheets, employeeLeaveRequests] = await Promise.all([
                        timesheetApi.getTimesheetsByEmployeeId(targetEmployeeId),
                        leaveApi.getLeaveRequests(targetEmployeeId)
                    ]);
                    
                    console.log('📊 Personal data loaded:', {
                        timesheets: employeeTimesheets.length,
                        leaveRequests: employeeLeaveRequests.length
                    });
                    
                    setTimesheets(employeeTimesheets);
                    setLeaveRequests(employeeLeaveRequests);
                    
                } catch (personalDataError) {
                    console.error('❌ Error loading personal data:', personalDataError);
                    // Fallback: try with alternative ID or load all and filter
                    console.log('🔄 Trying fallback approach...');
                    
                    const [allTimesheets, allLeaveRequests] = await Promise.all([
                        timesheetApi.getAllTimesheets(),
                        leaveApi.getAllLeaveRequestsWithEmployees()
                    ]);
                    
                    // Filter for current employee
                    const employeeTimesheets = allTimesheets.filter(timesheet => {
                        return timesheet.employee_id === targetEmployeeId ||
                               String(timesheet.employee_id) === String(targetEmployeeId) ||
                               timesheet.employees?.email === currentEmployee.email;
                    });
                    
                    const employeeLeaveRequests = allLeaveRequests.filter(lr => {
                        return lr.employee_id === targetEmployeeId ||
                               String(lr.employee_id) === String(targetEmployeeId) ||
                               lr.employees?.email === currentEmployee.email;
                    });
                    
                    console.log('📊 Fallback filtered data:', {
                        timesheets: employeeTimesheets.length,
                        leaveRequests: employeeLeaveRequests.length
                    });
                    
                    setTimesheets(employeeTimesheets);
                    setLeaveRequests(employeeLeaveRequests);
                }
            } else if (isEmployee() && !currentEmployee) {
                // Employee but no current employee data yet - wait
                console.log('⏳ Employee detected but no employee data yet, waiting...');
                setTimesheets([]);
                setLeaveRequests([]);
            } else {
                // Default fallback - should not happen in normal cases
                console.log('❓ Unknown user type, no data loaded');
                setTimesheets([]);
                setLeaveRequests([]);
            }
        } catch (err) {
            console.error('❌ Error loading timesheet data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Generate calendar days for the selected month
    const getDaysInMonth = (month, year) => {
        const monthIndex = months.indexOf(month);
        const daysInMonth = new Date(parseInt(year), monthIndex + 1, 0).getDate();
        const firstDay = new Date(parseInt(year), monthIndex, 1).getDay();
        return { daysInMonth, firstDay };
    };

    const { daysInMonth, firstDay } = getDaysInMonth(selectedMonth, selectedYear);

    // Process timesheet data for table display
    const tableData = React.useMemo(() => {
        const monthIndex = months.indexOf(selectedMonth);
        const year = parseInt(selectedYear);

        // Filter timesheets for selected month/year
        const monthlyTimesheets = timesheets.filter(timesheet => {
            const timesheetDate = new Date(timesheet.date);
            return timesheetDate.getMonth() === monthIndex &&
                timesheetDate.getFullYear() === year;
        });

        // Group by date and aggregate data
        const groupedByDate = {};
        monthlyTimesheets.forEach(timesheet => {
            const date = timesheet.date;
            if (!groupedByDate[date]) {
                groupedByDate[date] = {
                    date: new Date(date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                    }),
                    day: new Date(date).toLocaleDateString('en-US', { weekday: 'short' }),
                    status: 'present',
                    checkIn: null,
                    checkOut: null,
                    totalHours: 0,
                    employees: []
                };
            }

            // Calculate total hours
            if (timesheet.total_hours) {
                groupedByDate[date].totalHours += parseFloat(timesheet.total_hours);
            }

            // Track employee names
            const employeeName = timesheet.employees?.name ||
                `${timesheet.employees?.first_name || ''} ${timesheet.employees?.last_name || ''}`.trim() ||
                'Unknown Employee';
            groupedByDate[date].employees.push(employeeName);
        });

        // Convert to array and format
        return Object.values(groupedByDate).map(dayData => ({
            date: dayData.date,
            day: dayData.day,
            status: dayData.totalHours > 0 ? 'present' : 'absent',
            checkIn: dayData.totalHours > 0 ? '09:00 AM' : '-', // Simplified - could be enhanced
            checkOut: dayData.totalHours > 0 ? '06:00 PM' : '-', // Simplified - could be enhanced
            hours: dayData.totalHours > 0 ? `${dayData.totalHours.toFixed(1)}h` : '-',
            employees: dayData.employees
        })).slice(0, 10); // Limit to 10 recent entries
    }, [timesheets, selectedMonth, selectedYear]);

    const getStatusColor = (status) => {
        switch (status) {
            case "present": return "success";
            case "absent": return "error";
            case "leave": return "warning";
            case "holiday": return "default";
            default: return "secondary";
        }
    };

    // Helper function to safely parse tasks JSON and calculate total hours
    const parseTimesheetTasks = (tasksData) => {
        if (!tasksData) return { parsedTasks: [], totalHours: 0 };

        try {
            let tasks = [];
            
            // Handle different task data formats
            if (typeof tasksData === 'string') {
                tasks = JSON.parse(tasksData);
            } else if (Array.isArray(tasksData)) {
                tasks = tasksData;
            } else if (typeof tasksData === 'object') {
                tasks = [tasksData];
            }

            // Ensure tasks is an array
            if (!Array.isArray(tasks)) {
                console.warn('⚠️ Tasks data is not an array:', tasksData);
                return { parsedTasks: [], totalHours: 0 };
            }

            // Calculate total hours from timeSpent fields
            const totalHours = tasks.reduce((sum, task) => {
                const timeSpent = parseFloat(task.timeSpent || task.time_spent || 0);
                return sum + timeSpent;
            }, 0);

            return { parsedTasks: tasks, totalHours };
        } catch (error) {
            console.error('❌ Error parsing tasks JSON:', error, 'Original data:', tasksData);
            return { parsedTasks: [], totalHours: 0 };
        }
    };

    // Helper function to get employee display name with fallback logic
    const getEmployeeDisplayName = (timesheet) => {
        const employee = timesheet.employees;
        
        if (!employee) {
            console.warn('⚠️ No employee data found for timesheet:', timesheet);
            return 'Unknown Employee';
        }

        // Priority 1: Use name field if available
        if (employee.name && employee.name.trim()) {
            return employee.name.trim();
        }

        // Priority 2: Combine first_name and last_name
        const firstName = employee.first_name || '';
        const lastName = employee.last_name || '';
        const fullName = `${firstName} ${lastName}`.trim();
        
        if (fullName) {
            return fullName;
        }

        // Priority 3: Use email as fallback
        if (employee.email) {
            return employee.email;
        }

        // Priority 4: Use employee_id as final fallback
        if (employee.employee_id) {
            return `Employee ${employee.employee_id}`;
        }

        return 'Unknown Employee';
    };

    // Get detailed data for a specific day (used by info popup)
    const getDayDetails = (day) => {
        const monthIndex = months.indexOf(selectedMonth);
        const year = parseInt(selectedYear);
        
        // Create date string directly to avoid timezone issues (same as getDayAttendanceStatus)
        const paddedMonth = String(monthIndex + 1).padStart(2, '0');
        const paddedDay = String(day).padStart(2, '0');
        const dateString = `${year}-${paddedMonth}-${paddedDay}`;
        
        const date = new Date(year, monthIndex, day);

        // Get timesheet data for this specific date
        const dayTimesheets = timesheets.filter(ts => ts.date === dateString);
        
        // Get leave request data for this date (using consistent string comparison)
        const dayLeaveRequests = leaveRequests.filter(leave => {
            if (leave.status !== 'approved') return false;
            
            // Normalize dates to YYYY-MM-DD format for reliable comparison
            const leaveStartDate = leave.start_date.split('T')[0]; // Remove time part if present
            const leaveEndDate = leave.end_date.split('T')[0]; // Remove time part if present
            
            // Compare using string comparison since all are in YYYY-MM-DD format
            return dateString >= leaveStartDate && dateString <= leaveEndDate;
        });

        return {
            date,
            dateString,
            dayTimesheets,
            dayLeaveRequests,
            status: getDayAttendanceStatus(day),
        };
    };

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <Loader2 style={{ height: '32px', width: '32px', animation: 'spin 1s linear infinite' }} />
                <p style={{ color: 'var(--muted-foreground)' }}>Loading attendance data...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div style={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                minHeight: '100vh',
                flexDirection: 'column',
                gap: '16px'
            }}>
                <p style={{ color: 'var(--destructive)' }}>Error loading attendance data: {error}</p>
                <Button onClick={loadTimesheetData}>Retry</Button>
            </div>
        );
    }

    return (
        <div style={{  minHeight: '100vh', backgroundColor: 'var(--background)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: 'var(--foreground)' }}>
                            {isEmployee() ? 'My Attendance' : 'Attendance & Calendar'}
                        </h1>
                        <Badge variant={isAdmin() ? 'default' : 'secondary'} style={{ fontSize: '11px' }}>
                            {isAdmin() ? '👑 Admin View' : ''}
                        </Badge>
                    </div>
                    <p style={{ color: 'var(--muted-foreground)' }}>
                        {isEmployee()
                            ? `Track your personal attendance and work schedule${currentEmployee ? ` (${currentEmployee.name || currentEmployee.email})` : ''}`
                            : `Monitor team attendance and work calendar (${employees.length} employees)`
                        }
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {/* Employee Filter - Admin Only */}
                    {isAdmin() && (
                        <Select
                            value={filters.employee}
                            onValueChange={(value) => handleFilterChange('employee', value)}
                        >
                            <SelectTrigger
                                className="bodyRegularText5"
                                style={{
                                    minWidth: 'auto',
                                    // marginRight: '10px'
                                }}
                            >
                                <SelectValue placeholder="All Employees" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Employees</SelectItem>
                                {/* Show all employees from the system, not just those with timesheets */}
                                {employees
                                    .filter(emp => emp.status !== 'Terminated') // Only show active employees
                                    .sort((a, b) => (a.name || `${a.first_name} ${a.last_name}`).localeCompare(b.name || `${b.first_name} ${b.last_name}`))
                                    .map(employee => {
                                        const employeeName = employee.name || `${employee.first_name} ${employee.last_name}`.trim();
                                        return (
                                            <SelectItem key={employee.id} value={employeeName}>
                                                {employeeName}
                                            </SelectItem>
                                        );
                                    })
                                }
                            </SelectContent>
                        </Select>
                    )}





                    <Select value={selectedMonth} onValueChange={(value) => {
                        setSelectedMonth(value);
                        loadTimesheetData();
                    }}>
                        <SelectTrigger style={{ width: '140px' }}>
                            <SelectValue placeholder="Select month" />
                        </SelectTrigger>
                        <SelectContent>
                            {months.map((month) => (
                                <SelectItem key={month} value={month}>{month}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <Select value={selectedYear} onValueChange={(value) => {
                        setSelectedYear(value);
                        loadTimesheetData();
                    }}>
                        <SelectTrigger style={{ width: '100px' }}>
                            <SelectValue placeholder="Select year" />
                        </SelectTrigger>
                        <SelectContent>
                            {years.map((year) => (
                                <SelectItem key={year} value={year}>{year}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    {/* <Button variant="outline" size="icon">
                        <Download style={{ height: '16px', width: '16px' }} />
                    </Button> */}
                </div>
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                gap: '24px',
                marginBottom: '24px'
            }}>
                <Card>
                    <CardContent style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '24px' }}>

                        <div >
                            <p style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>Working Days</p>
                            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                                {attendanceStats.workingDays}
                            </div>
                        </div>
                        <div style={{
                            display: 'flex',
                            borderRadius: '6px',
                        }}>
                            <Calendar style={{ width: '16px' }} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '24px' }}>
                        <div>
                            <p style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>Present</p>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#4ade80' }}>
                                {attendanceStats.present}
                            </div>
                        </div>
                        <div style={{
                            display: 'flex',
                            borderRadius: '6px',
                        }}>
                            <Users style={{ width: '16px' }} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '24px' }}>
                        <div>
                            <p style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>Leave</p>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#f81515ff' }}>
                                {attendanceStats.leave || 0}
                            </div>
                        </div>
                        <div style={{
                            display: 'flex',
                            borderRadius: '6px',
                        }}>
                            <UserX style={{ width: '16px' }} />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '24px' }}>
                        <div>
                            <p style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>Half-Day</p>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#a855f7' }}>
                                {attendanceStats.halfDay || 0}
                            </div>
                        </div>
                        <div style={{
                            display: 'flex',
                            borderRadius: '6px',
                        }}>
                            <div style={{ width: '16px', height: '16px', fontSize: '16px' }}>◐</div>
                        </div>
                    </CardContent>
                </Card>

                {/* <Card>
                    <CardContent style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '24px' }}>
                        <div>
                            <p style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>Absent</p>
                            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>
                                {attendanceStats.absent}
                            </div>
                        </div>
                        <div style={{
                            display: 'flex',
                            borderRadius: '6px',
                        }}>
                            <div style={{ width: '16px', height: '16px', backgroundColor: '#fee2e2', border: '1px solid #ef4444', borderRadius: '2px' }} />
                        </div>
                    </CardContent>
                </Card> */}
            </div>

            <Card>
                <CardContent style={{ padding: '24px' }}>
                    <Tabs value={activeView} onValueChange={setActiveView} style={{ width: '100%' }}>
                        {/* <TabsList style={{ display: 'grid', width: '30%', gridTemplateColumns: '1fr 1fr' }}>
                            <TabsTrigger value="calendar" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <LayoutGrid style={{ height: '16px', width: '16px' }} />
                                Calendar View
                            </TabsTrigger>
                            <TabsTrigger value="table" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <List style={{ height: '16px', width: '16px' }} />
                                Table View
                            </TabsTrigger>
                        </TabsList> */}

                        <TabsContent value="calendar" style={{ marginTop: '24px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>
                                        Monthly Calendar - {selectedMonth} {selectedYear}
                                    </h3>
                                    <p style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>View attendance patterns and holidays</p>
                                </div>

                                <div style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(7, 1fr)',
                                    gap: '8px',
                                    marginBottom: '16px'
                                }}>
                                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                                        <div key={day} style={{
                                            textAlign: 'center',
                                            fontSize: '14px',
                                            fontWeight: '500',
                                            color: 'var(--muted-foreground)',
                                            paddingTop: '8px',
                                            paddingBottom: '8px'
                                        }}>
                                            {day}
                                        </div>
                                    ))}

                                    {Array.from({ length: firstDay }).map((_, index) => (
                                        <div key={`empty-${index}`} style={{ aspectRatio: '1', minHeight: '40px' }} />
                                    ))}

                                    {Array.from({ length: daysInMonth }).map((_, index) => {
                                        const day = index + 1;
                                        const dayOfWeek = (firstDay + index) % 7;

                                        const attendanceStatus = getDayAttendanceStatus(day);
                                        let statusBgColor = 'var(--card)';
                                        let statusIndicator = null;

                                        if (attendanceStatus === 'weekend') {
                                            statusBgColor = '#dadaddff';
                                        } else if (attendanceStatus === 'present') {
                                            statusBgColor = '#dcfce7';
                                            statusIndicator = '●';
                                        } else if (attendanceStatus === 'leave') {
                                            statusBgColor = '#fee2e2';
                                            statusIndicator = '●';
                                        } else if (attendanceStatus === 'half-day') {
                                            statusBgColor = '#e3d2f7ff';
                                            statusIndicator = '◐';
                                        }

                                        const borderColor = (hoveredDay === day || infoDay === day) ? 'var(--primary)' : 'var(--border)';
                                        return (
                                            <div
                                                key={day}
                                                onMouseEnter={() => setHoveredDay(day)}
                                                onMouseLeave={() => setHoveredDay(null)}
                                                style={{
                                                    position: 'relative',
                                                    aspectRatio: '1',
                                                    minHeight: '40px',
                                                    border: `1px solid ${borderColor}`,
                                                    borderRadius: '8px',
                                                    padding: '8px',
                                                    cursor: 'pointer',
                                                    display: 'flex',
                                                    alignItems: 'flex-start',
                                                    justifyContent: 'space-between',
                                                    flexDirection: 'column',
                                                    backgroundColor: statusBgColor,
                                                    transition: 'border-color 0.15s ease'
                                                }}
                                            >
                                                <span style={{ fontSize: '14px', fontWeight: '500' }}>{day}</span>

                                                {/* Info icon - appears on hover or when info open for this day */}
                                                {(hoveredDay === day || infoDay === day) && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); setInfoDay(day); }}
                                                        aria-label={`Details for ${day}`}
                                                        style={{
                                                            position: 'absolute',
                                                            top: 6,
                                                            right: 6,
                                                            width: 18,
                                                            height: 18,
                                                            borderRadius: 9,
                                                            border: '1px solid rgba(0,0,0,0.08)',
                                                            background: 'white',
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            fontSize: 11,
                                                            color: '#333',
                                                            boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
                                                        }}
                                                    >
                                                        i
                                                    </button>
                                                )}

                                                {statusIndicator && (
                                                    <span style={{
                                                        fontSize: '8px',
                                                        color: attendanceStatus === 'present' ? '#16a34a' : '#dc2626',
                                                        alignSelf: 'flex-end'
                                                    }}>
                                                        {statusIndicator}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '24px',
                                    paddingTop: '16px',
                                    borderTop: '1px solid var(--border)'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{
                                            width: '16px',
                                            height: '16px',
                                            borderRadius: '4px',
                                            backgroundColor: '#dcfce7',
                                            border: '1px solid #4ade80'
                                        }} />
                                        <span style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>Present </span>
                                    </div>

                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{
                                            width: '16px',
                                            height: '16px',
                                            borderRadius: '4px',
                                            backgroundColor: '#fee2e2',
                                            border: '1px solid #f87171'
                                        }} />
                                        <span style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>Leave </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{
                                            width: '16px',
                                            height: '16px',
                                            borderRadius: '4px',
                                            backgroundColor: '#e3d2f7ff',
                                            border: '1px solid #a855f7'
                                        }} />
                                        <span style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>Half-day </span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{
                                            width: '16px',
                                            height: '16px',
                                            borderRadius: '4px',
                                            backgroundColor: '#d6d7d8ff',
                                            border: '1px solid #cccdcfff'
                                        }} />
                                        <span style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>Weekend </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{
                                            width: '16px',
                                            height: '16px',
                                            borderRadius: '4px',
                                            backgroundColor: 'var(--card)',
                                            border: '1px solid var(--border)'
                                        }} />
                                        <span style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>No Data ({attendanceStats.absent || 0} days)</span>
                                    </div>
                                </div>
                                </div>
                            </div>

                            {/* Info modal / popup for a selected day */}
                            {infoDay !== null && (() => {
                                const details = getDayDetails(infoDay);
                                return (
                                    <div
                                        role="dialog"
                                        aria-modal="true"
                                        style={{
                                            position: 'fixed',
                                            inset: 0,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            background: 'rgba(0,0,0,0.35)',
                                            zIndex: 60
                                        }}
                                        onClick={() => setInfoDay(null)}
                                    >
                                        <div
                                            onClick={(e) => e.stopPropagation()}
                                            style={{
                                                width: 380,
                                                maxWidth: '90%',
                                                background: 'white',
                                                borderRadius: 8,
                                                padding: 18,
                                                boxShadow: '0 10px 30px rgba(0,0,0,0.12)'
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                                <div>
                                                    <strong style={{ fontSize: 16 }}>Details for {details.date.toLocaleDateString()}</strong>
                                                    {/* <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{details.dateString}</div> */}
                                                </div>
                                                <button onClick={() => setInfoDay(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18 }}>✕</button>
                                            </div>

                                            <div style={{ marginBottom: 12 }}>
                                                <div style={{ fontSize: 13, marginBottom: 6 }}>Status: <strong>{details.status || 'No Data'}</strong></div>
                                                <div style={{ fontSize: 13 }}>Timesheet Records: {details.dayTimesheets.length}</div>
                                                {details.dayLeaveRequests.length > 0 && (
                                                    <div style={{ fontSize: 13 }}>Leave Records: {details.dayLeaveRequests.length}</div>
                                                )}
                                            </div>

                                            {/* PRIORITY HIERARCHY: Show Leave Information OR Timesheet Information (never both) */}
                                            {details.dayLeaveRequests.length > 0 ? (
                                                /* PRIORITY 1: Approved Leave - Show ONLY leave details, hide timesheets */
                                                <div>
                                                    <div style={{ marginBottom: 12, padding: 12,  borderRadius: 6, border: '1px solid #a5fca9ff' }}>
                                                        <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: '#dc2626', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            📅 Approved Leave Request
                                                        </div>
                                                        {details.dayLeaveRequests.map((leave, i) => {
                                                            // Resolve employee display name for the leave record with several fallbacks
                                                            const employeeName =
                                                                leave.employee_name ||
                                                                leave.employees?.name ||
                                                                (leave.employees ? `${leave.employees.first_name || ''} ${leave.employees.last_name || ''}`.trim() : '') ||
                                                                leave.employee?.name ||
                                                                `${leave.first_name || ''} ${leave.last_name || ''}`.trim() ||
                                                                'Unknown Employee';

                                                            return (
                                                                <div key={i} style={{ 
                                                                    fontSize: 13, 
                                                                    color: '#7f1d1d',
                                                                    backgroundColor: 'rgba(255,255,255,0.7)',
                                                                    padding: 8,
                                                                    borderRadius: 4,
                                                                    marginBottom: 6
                                                                }}>
                                                                    {/* Employee reference */}
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                                                                        <div style={{ fontSize: 14, fontWeight: '700', color: '#111' }}>👤 {employeeName}</div>
                                                                        <div style={{ marginLeft: 'auto', fontSize: 12, color: '#065f46', fontWeight: 700 }}>{leave.status === 'approved' ? 'Approved' : (leave.status || '')}</div>
                                                                    </div>

                                                                    <div style={{ fontWeight: '600', marginBottom: 4 }}>
                                                                         Type: <span style={{ color: '#dc2626', fontWeight: 500 }}>{leave.leave_type}</span>
                                                                    </div>
                                                                    <div style={{ marginBottom: 4 }}>
                                                                         Reason: {leave.reason}
                                                                    </div>
                                                                    <div style={{ marginBottom: 4 }}>
                                                                        Duration: {new Date(leave.start_date).toLocaleDateString()} - {new Date(leave.end_date).toLocaleDateString()}
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            ) : (
                                                /* PRIORITY 2: Timesheet Only - Show timesheet tasks when no approved leave */
                                                details.dayTimesheets.length > 0 ? (
                                                    <div style={{ maxHeight: 280, overflow: 'auto', borderTop: '1px solid #eee', paddingTop: 8 }}>
                                                        <div style={{ fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: '#059669', display: 'flex', alignItems: 'center', gap: 6 }}>
                                                            ⏰ Timesheet Tasks
                                                        </div>
                                                        
                                                        {details.dayTimesheets.map((ts, i) => {
                                                            // Parse tasks and calculate total hours
                                                            const { parsedTasks, totalHours } = parseTimesheetTasks(ts.tasks);
                                                            const employeeName = getEmployeeDisplayName(ts);
                                                            
                                                            // Use calculated hours or fallback to total_hours field
                                                            const displayHours = totalHours > 0 ? totalHours : (ts.total_hours || 0);
                                                            
                                                            return (
                                                                <div key={i} style={{ 
                                                                    padding: 12, 
                                                                    borderBottom: '1px solid #f5f5f5', 
                                                                    backgroundColor: '#f8f9fa', 
                                                                    borderRadius: 8, 
                                                                    marginBottom: 8,
                                                                    border: '1px solid #e5e7eb',
                                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                                                                }}>
                                                                    {/* Employee Name Header */}
                                                                    <div style={{ 
                                                                        fontSize: 14, 
                                                                        fontWeight: 'bold', 
                                                                        marginBottom: 8, 
                                                                        color: '#1f2937',
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: 6,
                                                                        paddingBottom: 6,
                                                                        borderBottom: '1px solid #e5e7eb'
                                                                    }}>
                                                                        👤 {employeeName}
                                                                    </div>

                                                                    {/* Hours and Status Row */}
                                                                    <div style={{ 
                                                                        display: 'flex', 

                                                                        justifyContent: 'space-between', 
                                                                        alignItems: 'center',
                                                                        marginBottom: 10,
                                                                        flexWrap: 'wrap',
                                                                        gap: 8
                                                                    }}>
                                                                          <div style={{ fontSize: 12 }}>
                                                                                    <span style={{
                                                                                        backgroundColor: ts.status === 'approved' ? '#dcfce7' : ts.status === 'rejected' ? '#fee2e2' : '#f3f4f6',
                                                                                        color: ts.status === 'approved' ? '#166534' : ts.status === 'rejected' ? '#dc2626' : '#374151',
                                                                                        padding: '4px 10px',
                                                                                        borderRadius: '6px',
                                                                                        fontSize: '11px',
                                                                                        fontWeight: '600',
                                                                                        textTransform: 'capitalize'
                                                                                    }}>
                                                                                        {ts.status || 'Pending'}
                                                                                    </span>
                                                                                </div>
                                                                        <div style={{ fontSize: 12, color: '#6b7280' }}>
                                                                            <span style={{ fontWeight: '600', color: '#059669' }}>
                                                                                {displayHours > 0 ? `${displayHours}h` : 'No hours recorded'}
                                                                            </span>
                                                                            {/* {totalHours > 0 && totalHours !== (ts.total_hours || 0) && (
                                                                                <span style={{ fontSize: 10, color: '#6b7280', fontStyle: 'italic' }}>
                                                                                    {' '}(calculated from tasks)
                                                                                </span>
                                                                            )} */}
                                                                        </div>
                                                                       
                                                                    </div>

                                                                    {/* Tasks Section */}
                                                                    {parsedTasks && parsedTasks.length > 0 ? (
                                                                        <div style={{ fontSize: 12 }}>
                                                                            <div style={{ 
                                                                                fontWeight: 'bold', 
                                                                                marginBottom: 8, 
                                                                                color: '#374151',
                                                                                display: 'flex',
                                                                                alignItems: 'center',
                                                                                gap: 4
                                                                            }}>
                                                                                📋 Tasks Completed ({parsedTasks.length})
                                                                            </div>
                                                                            
                                                                            {/* Task List */}
                                                                            <div style={{ 
                                                                                backgroundColor: 'white', 
                                                                                padding: 10, 
                                                                                borderRadius: 6, 
                                                                                border: '1px solid #d1d5db',
                                                                                maxHeight: 120,
                                                                                overflow: 'auto'
                                                                            }}>

                                                                                
                                                                                {parsedTasks.map((task, taskIndex) => (
                                                                                    <div key={taskIndex} style={{
                                                                                        display: 'flex',
                                                                                        justifyContent: 'space-between',
                                                                                        alignItems: 'flex-start',
                                                                                        padding: '6px 0',
                                                                                        borderBottom: taskIndex < parsedTasks.length - 1 ? '1px solid #f3f4f6' : 'none',
                                                                                        gap: 8
                                                                                    }}>
                                                                                        <div style={{ 
                                                                                            flex: 1,
                                                                                            fontSize: 11,
                                                                                            lineHeight: '1.4',
                                                                                            color: '#374151'
                                                                                        }}>
                                                                                            • {task.taskTitle || task.task_title || task.title || 'Untitled Task'}
                                                                                        </div>
                                                                                        <div style={{
                                                                                            fontSize: 10,
                                                                                            fontWeight: '600',
                                                                                            color: '#059669',
                                                                                            backgroundColor: '#f0fdf4',
                                                                                            padding: '2px 6px',
                                                                                            borderRadius: '4px',
                                                                                            whiteSpace: 'nowrap'
                                                                                        }}>
                                                                                            {task.timeSpent || task.time_spent || 0}h
                                                                                        </div>
                                                                                    </div>
                                                                                ))}
                                                                            </div>
                                                                        </div>
                                                                    ) : ts.tasks ? (
                                                                        /* Fallback for malformed task data */
                                                                        <div style={{ fontSize: 12 }}>
                                                                            <div style={{ fontWeight: 'bold', marginBottom: 6, color: '#374151' }}>📋 Tasks (Raw Data):</div>
                                                                            <div style={{ 
                                                                                backgroundColor: 'white', 
                                                                                padding: 8, 
                                                                                borderRadius: 4, 
                                                                                border: '1px solid #d1d5db',
                                                                                whiteSpace: 'pre-wrap',
                                                                                fontSize: 10,
                                                                                maxHeight: 60,
                                                                                overflow: 'auto',
                                                                                lineHeight: '1.3',
                                                                                color: '#6b7280',
                                                                                fontStyle: 'italic'
                                                                            }}>
                                                                                {typeof ts.tasks === 'string' ? ts.tasks : JSON.stringify(ts.tasks, null, 2)}
                                                                            </div>
                                                                        </div>
                                                                    ) : (
                                                                        /* No tasks data */
                                                                        <div style={{ 
                                                                            fontSize: 11, 
                                                                            color: '#6b7280', 
                                                                            fontStyle: 'italic',
                                                                            textAlign: 'center',
                                                                            padding: 8
                                                                        }}>
                                                                            📝 No task details available
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                ) : (
                                                    /* No timesheet data and no leave */
                                                    <div style={{ padding: 16, color: 'var(--muted-foreground)', textAlign: 'center', fontStyle: 'italic' }}>
                                                        {details.status === 'weekend' ? '🏖️ Weekend - No work scheduled' : 
                                                         '� No timesheet records for this day'}
                                                    </div>
                                                )
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
