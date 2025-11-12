import React, { createContext, useContext, useState, useEffect } from 'react'; 
import { leaveApi } from '../utils/supabase';
import { useAuth } from './AuthContext';

const LeaveContext = createContext();

export function LeaveProvider({ children }) {
    const [leaveRequests, setLeaveRequests] = useState([]);
    const [leaveSetting, setLeaveSetting] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user } = useAuth();

    useEffect(() => {
        if (user) loadLeaveData();
        else {
            setLeaveRequests([]);
            setLeaveSetting(null);
            setLoading(false);
        }
    }, [user]);

    const loadLeaveData = async () => {
        if (!user) return setLoading(false);

        try {
            setLoading(true);
            setError(null);

            const { supabase } = await import('../utils/supabase');

            // 1️⃣ Get employee info
            const { data: employeeData, error: empError } = await supabase
                .from('employees')
                .select('id, employee_id, role')
                .eq('employee_id', user.employee_id || user.id)
                .maybeSingle();

            if (empError || !employeeData) throw new Error('Employee not found');

            // 2️⃣ Get leave settings for employee type
            const { data: settingData, error: settingError } = await supabase
                .from('leave_settings')
                .select('*')
                .eq('type', employeeData.role || 'Intern') // fallback to 'Intern'
                .maybeSingle();

            if (settingError || !settingData) throw new Error('Leave settings not found');

            setLeaveSetting(settingData);

            // 3️⃣ Get leave requests for this employee
            const { data: requests = [] } = await supabase
                .from('leave_requests')
                .select('*')
                .eq('employee_id', employeeData.employee_id);

            setLeaveRequests(requests);

        } catch (err) {
            console.error('❌ Error loading leave data:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    // Calculate used & remaining leaves
    const getLeaveSummary = () => {
        if (!leaveSetting) return { used_casual: 0, used_sick: 0, remaining_casual: 0, remaining_sick: 0 };

        const currentYear = new Date().getFullYear();

        const used_casual = leaveRequests
            .filter(r => r.leave_type === 'casual' && r.status === 'approved' && new Date(r.start_date).getFullYear() === currentYear)
            .reduce((sum, r) => sum + ((new Date(r.end_date) - new Date(r.start_date)) / (1000 * 60 * 60 * 24) + 1), 0);

        const used_sick = leaveRequests
            .filter(r => r.leave_type === 'sick' && r.status === 'approved' && new Date(r.start_date).getFullYear() === currentYear)
            .reduce((sum, r) => sum + ((new Date(r.end_date) - new Date(r.start_date)) / (1000 * 60 * 60 * 24) + 1), 0);

        return {
            used_casual,
            used_sick,
            remaining_casual: Math.max(0, leaveSetting.total_casual_leaves - used_casual),
            remaining_sick: Math.max(0, leaveSetting.total_sick_leaves - used_sick)
        };
    };

    const requestLeave = async (leaveData) => {
        try {
            setError(null);
            const result = await leaveApi.createLeaveRequest(leaveData);
            await loadLeaveData(); // refresh data
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
            leaveSummary: getLeaveSummary(),
            loading,
            error,
            requestLeave,
            refreshLeaveData: loadLeaveData
        }}>
            {children}
        </LeaveContext.Provider>
    );
}

export function useLeave() {
    const context = useContext(LeaveContext);
    if (!context) throw new Error('useLeave must be used within a LeaveProvider');
    return context;
}
