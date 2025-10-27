import React, { useState, useEffect } from "react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../../components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../../components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Badge } from "../../components/ui/badge";
import { timesheetApi, employeeApi } from "../../utils/supabase";
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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentEmployee, setCurrentEmployee] = useState(null);
    const [hoveredDay, setHoveredDay] = useState(null);
    const [infoDay, setInfoDay] = useState(null);
    
    const { employees } = useEmployees();
    const { user, isAdmin, isEmployee } = useAuth();

    // Calculate attendance statistics from real timesheet data (role-based)
    const attendanceStats = React.useMemo(() => {
        const monthIndex = months.indexOf(selectedMonth);
        const year = parseInt(selectedYear);
        const daysInCurrentMonth = new Date(year, monthIndex + 1, 0).getDate();
        
        // Filter timesheets for selected month/year
        // Note: timesheets are already filtered by employee in loadTimesheetData()
        const monthlyTimesheets = timesheets.filter(timesheet => {
            const timesheetDate = new Date(timesheet.date);
            return timesheetDate.getMonth() === monthIndex && 
                   timesheetDate.getFullYear() === year;
        });

        // Count working days (excluding weekends)
        let workingDays = 0;
        for (let day = 1; day <= daysInCurrentMonth; day++) {
            const date = new Date(year, monthIndex, day);
            const dayOfWeek = date.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday or Saturday
                workingDays++;
            }
        }

        // Calculate present days (unique dates with timesheets)
        const presentDates = new Set();
        monthlyTimesheets.forEach(timesheet => {
            if (timesheet.status === 'completed' || timesheet.status === 'approved' || 
                timesheet.total_hours > 0 || timesheet.clock_in_time) {
                presentDates.add(timesheet.date);
            }
        });

        return {
            workingDays,
            present: presentDates.size,
            absent: Math.max(0, workingDays - presentDates.size),
            holidays: 0, // This could be enhanced with a holidays API
        };
    }, [timesheets, selectedMonth, selectedYear]);

    // Load timesheet data and current employee info
    useEffect(() => {
        loadCurrentEmployeeData();
    }, [user, employees]);

    // Load timesheet data when employee info is ready
    useEffect(() => {
        if (currentEmployee || isAdmin()) {
            loadTimesheetData();
        }
    }, [selectedMonth, selectedYear, currentEmployee, isAdmin]);

    // Load current employee data for role-based filtering
    const loadCurrentEmployeeData = async () => {
        if (!user) return;
        
        try {
            console.log('🔍 === EMPLOYEE IDENTIFICATION DEBUG ===');
            console.log('🔍 Current user object:', JSON.stringify(user, null, 2));
            console.log('🔍 User email:', user.email);
            console.log('🔍 User id:', user.id);
            console.log('🔍 User employee_id:', user.employee_id);
            console.log('🔍 User name:', user.name);
            console.log('🔍 Available employees count:', employees.length);
            console.log('🔍 Employee emails:', employees.map(emp => ({ email: emp.email, name: emp.name || `${emp.first_name} ${emp.last_name}`, employee_id: emp.employee_id, id: emp.id })));
            
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
                // Admin view - fetch all timesheets
                console.log('👑 Admin view: Loading all timesheets');
                const allTimesheets = await timesheetApi.getAllTimesheets();
                console.log('📊 Loaded all timesheets for admin:', allTimesheets.length);
                setTimesheets(allTimesheets);
            } else if (isEmployee() && currentEmployee) {
                // Employee view - fetch all timesheets and filter client-side for now
                // This ensures we get the same data structure as admin view
                console.log('👤 Employee view: Loading all timesheets and filtering for', currentEmployee.email);
                const allTimesheets = await timesheetApi.getAllTimesheets();
                console.log('📊 Loaded all timesheets:', allTimesheets.length);
                
                const targetEmployeeId = currentEmployee.employee_id || currentEmployee.id;
                console.log('🆔 Filtering for employee ID:', targetEmployeeId);
                console.log('🔍 Sample timesheet employee IDs:', allTimesheets.slice(0, 5).map(ts => ts.employee_id));
                
                // Filter for current employee only - try multiple ID matching strategies
                let employeeTimesheets = allTimesheets.filter(timesheet => 
                    timesheet.employee_id === targetEmployeeId
                );

                // If no results with exact match, try string conversion
                if (employeeTimesheets.length === 0) {
                    employeeTimesheets = allTimesheets.filter(timesheet => 
                        String(timesheet.employee_id) === String(targetEmployeeId)
                    );
                    if (employeeTimesheets.length > 0) {
                        console.log('📊 Found timesheets with string ID matching');
                    }
                }

                // If still no results, try matching by employee email from joined data
                if (employeeTimesheets.length === 0) {
                    employeeTimesheets = allTimesheets.filter(timesheet => 
                        timesheet.employees?.email === currentEmployee.email
                    );
                    if (employeeTimesheets.length > 0) {
                        console.log('📊 Found timesheets with email matching');
                    }
                }
                
                console.log('📊 Filtered employee timesheets:', employeeTimesheets.length);
                console.log('📊 Sample filtered timesheet:', employeeTimesheets[0]);
                setTimesheets(employeeTimesheets);
            } else if (isEmployee() && !currentEmployee) {
                // Employee but no current employee data yet - wait
                console.log('⏳ Employee detected but no employee data yet, waiting...');
                setTimesheets([]);
            } else {
                // Default fallback - should not happen in normal cases
                console.log('❓ Unknown user type, no data loaded');
                setTimesheets([]);
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
        console.log('📋 Processing table data from timesheets:', timesheets.length);
        const monthIndex = months.indexOf(selectedMonth);
        const year = parseInt(selectedYear);
        
        // Filter timesheets for selected month/year
        const monthlyTimesheets = timesheets.filter(timesheet => {
            const timesheetDate = new Date(timesheet.date);
            return timesheetDate.getMonth() === monthIndex && 
                   timesheetDate.getFullYear() === year;
        });
        
        console.log('📋 Monthly timesheets for table:', monthlyTimesheets.length);
        if (monthlyTimesheets.length > 0) {
            console.log('📋 Sample monthly timesheet:', monthlyTimesheets[0]);
        }

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

    // Get attendance status for a specific day
    const getDayAttendanceStatus = (day) => {
        const monthIndex = months.indexOf(selectedMonth);
        const year = parseInt(selectedYear);
        const date = new Date(year, monthIndex, day);
        const dateString = date.toISOString().split('T')[0];
        
        const dayTimesheets = timesheets.filter(timesheet => 
            timesheet.date === dateString
        );
        
        if (dayTimesheets.length > 0) {
            return dayTimesheets.some(ts => ts.total_hours > 0) ? 'present' : 'absent';
        }
        
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) return 'weekend';
        
        return null; // No data
    };

    // Get detailed data for a specific day (used by info popup)
    const getDayDetails = (day) => {
        const monthIndex = months.indexOf(selectedMonth);
        const year = parseInt(selectedYear);
        const date = new Date(year, monthIndex, day);
        const dateString = date.toISOString().split('T')[0];

        const dayTimesheets = timesheets.filter(ts => ts.date === dateString);

        return {
            date,
            dateString,
            dayTimesheets,
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
        <div style={{ padding: '24px', minHeight: '100vh', backgroundColor: 'var(--background)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '4px' }}>
                        <h1 style={{ fontSize: '30px', fontWeight: 'bold', color: 'var(--foreground)' }}>
                            {isEmployee() ? 'My Attendance' : 'Attendance & Calendar'}
                        </h1>
                        <Badge variant={isAdmin() ? 'default' : 'secondary'} style={{ fontSize: '11px' }}>
                            {isAdmin() ? '👑 Admin View' : '👤 Employee View'}
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
                    <Button variant="outline" size="icon">
                        <Download style={{ height: '16px', width: '16px' }} />
                    </Button>
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
                            <p style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>leave</p>
                            <div style={{ fontSize: '24px', fontWeight: 'bold',color: '#f81515ff' }}>
                                {attendanceStats.absent}
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
                            <p style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>Holidays</p>
                            <div style={{ fontSize: '24px', fontWeight: 'bold',color: '#60a5fa'  }}>
                                {attendanceStats.holidays}
                            </div>
                        </div>
                        <div style={{
                            display: 'flex',
                            borderRadius: '6px',
                        }}>
                            <Palmtree style={{ width: '16px' }} />
                        </div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardContent style={{ padding: '24px' }}>
                    <Tabs value={activeView} onValueChange={setActiveView} style={{ width: '100%' }}>
                        <TabsList style={{ display: 'grid', width: '30%', gridTemplateColumns: '1fr 1fr' }}>
                            <TabsTrigger value="calendar" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {/* <LayoutGrid style={{ height: '16px', width: '16px' }} /> */}
                                Calendar View
                            </TabsTrigger>
                            <TabsTrigger value="table" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {/* <List style={{ height: '16px', width: '16px' }} /> */}
                                Table View
                            </TabsTrigger>
                        </TabsList>

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
                                        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

                                        const attendanceStatus = getDayAttendanceStatus(day);
                                        let statusBgColor = 'var(--card)';
                                        let statusIndicator = null;
                                        
                                        if (isWeekend) {
                                            statusBgColor = 'var(--muted)';
                                        } else if (attendanceStatus === 'present') {
                                            statusBgColor = '#dcfce7';
                                            statusIndicator = '●';
                                        } else if (attendanceStatus === 'absent') {
                                            statusBgColor = '#fee2e2';
                                            statusIndicator = '●';
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
                                        <span style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>Present ({attendanceStats.present} days)</span>
                                    </div>
                                    
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{
                                            width: '16px',
                                            height: '16px',
                                            borderRadius: '4px',
                                             backgroundColor: '#fee2e2',
                                            border: '1px solid #f87171'
                                        }} />
                                        <span style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>Leave</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{
                                            width: '16px',
                                            height: '16px',
                                            borderRadius: '4px',
                                            backgroundColor: '#dbeafe',
                                            border: '1px solid #60a5fa'
                                        }} />
                                        <span style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>Holiday</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{
                                            width: '16px',
                                            height: '16px',
                                            borderRadius: '4px',
                                            // backgroundColor: 'var(--muted) ',
                                            backgroundColor: '#e8effaff ',
                                            border: '1px solid var(--border)'
                                        }} />
                                        <span style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>Weekend</span>
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
                                                    <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{details.dateString}</div>
                                                </div>
                                                <button onClick={() => setInfoDay(null)} style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 18 }}>✕</button>
                                            </div>

                                            <div style={{ marginBottom: 12 }}>
                                                <div style={{ fontSize: 13, marginBottom: 6 }}>Status: <strong>{details.status || 'No Data'}</strong></div>
                                                <div style={{ fontSize: 13 }}>Records: {details.dayTimesheets.length}</div>
                                            </div>

                                            {details.dayTimesheets.length > 0 ? (
                                                <div style={{ maxHeight: 220, overflow: 'auto', borderTop: '1px solid #eee', paddingTop: 8 }}>
                                                    {details.dayTimesheets.map((ts, i) => (
                                                        <div key={i} style={{ padding: '8px 0', borderBottom: '1px solid #f5f5f5' }}>
                                                            <div style={{ fontSize: 13 }}><strong>{ts.employees?.name || `${ts.employees?.first_name || ''} ${ts.employees?.last_name || ''}`.trim() || 'Unknown'}</strong></div>
                                                            <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>{ts.total_hours ? `Hours: ${ts.total_hours}` : 'Hours: -'}</div>
                                                            <div style={{ fontSize: 12, color: 'var(--muted-foreground)' }}>Status: {ts.status || 'n/a'}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div style={{ padding: 12, color: 'var(--muted-foreground)' }}>No timesheet records for this day.</div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })()}

                        </TabsContent>

                        <TabsContent value="table" style={{ marginTop: '24px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                <div>
                                    <h3 style={{ fontSize: '20px', fontWeight: '600', marginBottom: '4px' }}>Attendance Records</h3>
                                    <p style={{ fontSize: '14px', color: 'var(--muted-foreground)' }}>Detailed attendance log with check-in/out times</p>
                                </div>

                                <div style={{ border: '1px solid var(--border)', borderRadius: '8px' }}>
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Date</TableHead>
                                                <TableHead>Day</TableHead>
                                                <TableHead>Status</TableHead>
                                                <TableHead>Employees</TableHead>
                                                <TableHead>Check In</TableHead>
                                                <TableHead>Check Out</TableHead>
                                                <TableHead>Total Hours</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {tableData.length > 0 ? tableData.map((record, index) => (
                                                <TableRow key={index}>
                                                    <TableCell style={{ fontWeight: '500' }}>{record.date}</TableCell>
                                                    <TableCell style={{ color: 'var(--muted-foreground)' }}>{record.day}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={getStatusColor(record.status)}>
                                                            {record.status.charAt(0).toUpperCase() + record.status.slice(1)}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell style={{ color: 'var(--muted-foreground)', fontSize: '12px' }}>
                                                        {record.employees?.length > 0 ? (
                                                            <div style={{ maxWidth: '200px' }}>
                                                                {record.employees.slice(0, 2).join(', ')}
                                                                {record.employees.length > 2 && ` +${record.employees.length - 2} more`}
                                                            </div>
                                                        ) : '-'}
                                                    </TableCell>
                                                    <TableCell style={{ color: 'var(--muted-foreground)' }}>{record.checkIn}</TableCell>
                                                    <TableCell style={{ color: 'var(--muted-foreground)' }}>{record.checkOut}</TableCell>
                                                    <TableCell style={{ fontWeight: '500' }}>{record.hours}</TableCell>
                                                </TableRow>
                                            )) : (
                                                <TableRow>
                                                    <TableCell colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--muted-foreground)' }}>
                                                        No attendance data found for {selectedMonth} {selectedYear}
                                                    </TableCell>
                                                </TableRow>
                                            )}
                                        </TableBody>
                                    </Table>
                                </div>
                            </div>
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
