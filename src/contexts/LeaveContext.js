import React, { createContext, useContext, useState, useEffect } from 'react'; 
import { leaveApi } from '../utils/supabase';
import { useAuth } from './AuthContext';

const LeaveContext = createContext();

export function LeaveProvider({ children }) {
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [leaveSetting, setLeaveSetting] = useState(null);
    const [leaveSummary, setLeaveSummary] = useState({
        used_casual: 0,
        used_sick: 0,
        remaining_casual: 0,
        remaining_sick: 0
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user } = useAuth();

    // Reactive leave summary calculation - uses database values directly
    useEffect(() => {
        console.log('Calculating leave summary...', { leaveSetting });

        // Handle empty state
        if (!leaveSetting) {
            console.log('⚠️ No leave setting available');
            setLeaveSummary({
                used_casual: 0,
                used_sick: 0,
                total_casual: 0,
                total_sick: 0,
                remaining_casual: 0,
                remaining_sick: 0,
                isAvailable: false
            });
            return;
        }

        // STEP 1: Get values from leaveSetting (which came from database)
        const total_casual = leaveSetting.total_casual_leaves ?? 0;
        const total_sick = leaveSetting.total_sick_leaves ?? 0;
        const used_casual = leaveSetting.casual_used ?? 0;
        const used_sick = leaveSetting.sick_used ?? 0;

        // STEP 2: Calculate remaining
        const remaining_casual = Math.max(0, total_casual - used_casual);
        const remaining_sick = Math.max(0, total_sick - used_sick);

        // STEP 3: Create summary object with isAvailable flag
        const summary = {
            used_casual,
            used_sick,
            total_casual,
            total_sick,
            remaining_casual,
            remaining_sick,
            isAvailable: true
        };

        console.log('New leaveSummary:', summary);
        
        // STEP 4: Set summary
        setLeaveSummary(summary);
    }, [leaveSetting]); // STEP 5: Only recalculate when leaveSetting changes

    // Load data when user changes
    useEffect(() => {
        if (user) {
            console.log('User logged in, loading leave data...', user);
            loadLeaveData();
        } else {
            setLeaveRequests([]);
            setLeaveSetting(null);
            setLeaveSummary({ used_casual: 0, used_sick: 0, remaining_casual: 0, remaining_sick: 0 });
            setLoading(false);
        }
    }, [user]);

    // FIXED loadLeaveData with proper fallback
    const loadLeaveData = async () => {
        if (!user) return;

        try {
            setLoading(true);
            setError(null);

            const { supabase } = await import('../utils/supabase');

            console.log('Trying to find employee for user:', { employee_id: user.employee_id, auth_id: user.id });

            let employeeData = null;

            // PART A - First employee query (using user.employee_id):
            // Try user.employee_id first
            if (user.employee_id) {
                const { data, error } = await supabase
                    .from('employees')
                    .select('id, employee_id, name, email, department, position, status')
                    .eq('employee_id', user.employee_id)
                    .maybeSingle();

                console.log('Query with employee_id result:', { data, error: error?.message });
                employeeData = data;
            }

            // PART B - Fallback employee query (using user.id):
            // Fallback to auth user.id
            if (!employeeData && user.id) {
                const { data, error } = await supabase
                    .from('employees')
                    .select('id, employee_id, name, email, department, position, status')
                    .eq('id', user.id)
                    .maybeSingle();

                console.log('Fallback query with user.id result:', { data, error: error?.message });
                employeeData = data;
            }

            if (!employeeData) {
                throw new Error('Employee record not found. Check if employee row exists with employee_id matching either your custom employee_id or auth UUID.');
            }

            console.log('Employee found:', employeeData);

            // STEP 1: Get current year
            const currentYear = new Date().getFullYear();
            console.log('📅 Loading leave balance for year:', currentYear);

            // STEP 2: Query leave_balances with correct filters
            const { data: balanceData, error: balanceError } = await supabase
                .from('leave_balances')
                .select('*')
                .eq('employee_id', employeeData.employee_id)
                .eq('year', currentYear)
                .maybeSingle();

            console.log('Leave balance query result:', { balanceData, error: balanceError?.message });

            // STEP 3 & 4: Handle if no balance data exists, or map it
            let settingData = null;
            
            if (!balanceData) {
                console.log('⚠️ No leave balance found for employee', employeeData.employee_id, 'year', currentYear);
                settingData = null;
            } else {
                settingData = {
                    total_sick_leaves: balanceData.sick_leave ?? 0,
                    total_casual_leaves: balanceData.casual_leave ?? 0,
                    sick_used: balanceData.sick_used ?? 0,
                    casual_used: balanceData.casual_used ?? 0,
                    year: balanceData.year,
                    employee_id: balanceData.employee_id
                };
                console.log('Leave balance loaded:', settingData);
            }

            // STEP 5: Set the setting
            setLeaveSetting(settingData);

            // Load leave requests
            const { data: requests = [] } = await supabase
                .from('leave_requests')
                .select('*')
                .eq('employee_id', employeeData.employee_id);

            console.log('Leave requests loaded:', requests.length, requests);
            setLeaveRequests(requests);

        } catch (err) {
            console.error('Failed to load leave data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const requestLeave = async (leaveData) => {
        try {
            setError(null);
            const result = await leaveApi.createLeaveRequest(leaveData);
            await loadLeaveData();
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    return (
        <LeaveContext.Provider value={{
            leaveRequests,
            leaveSetting,
            leaveSummary,
            loading,
            error,
            requestLeave,
            refreshLeaveData: loadLeaveData,
            refreshBalance: loadLeaveData  // ← Removes the warning
        }}>
            {children}
        </LeaveContext.Provider>
    );
}

export function useLeave() {
    const context = useContext(LeaveContext);
    if (!context) {
        throw new Error('useLeave must be used within a LeaveProvider');
    }
    return context;
}