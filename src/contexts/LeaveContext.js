import React, { createContext, useContext, useState, useEffect } from 'react';
import { leaveApi } from '../utils/supabase';
import { useAuth } from './AuthContext';

const LeaveContext = createContext();

export function LeaveProvider({ children }) {
    const [leaveBalance, setLeaveBalance] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            loadLeaveBalance();
        } else {
            setLeaveBalance(null);
            setLoading(false);
        }
    }, [user]);

    const loadLeaveBalance = async () => {
        if (!user) {
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError(null);
            
            // Use employee_id if available, otherwise fallback to user.id
            const employeeId = user.employee_id || user.id;
            console.log('🏖️ Loading leave balance for employee ID:', employeeId);
            
            const balance = await leaveApi.getLeaveBalanceByEmployeeId(employeeId);
            console.log('✅ Leave balance loaded:', balance);
            setLeaveBalance(balance);
        } catch (err) {
            console.error('❌ Error loading leave balance:', err);
            setError(err.message);
            
            // If no balance found, set default values
            if (err.message.includes('No rows') || err.message.includes('not found')) {
                console.log('⚠️ No leave balance found, setting default values');
                setLeaveBalance({
                    employee_id: user.employee_id || user.id,
                    sick_leave: 12,
                    casual_leave: 12,
                });
                setError(null);
            }
        } finally {
            setLoading(false);
        }
    };

    const requestLeave = async (leaveData) => {
        try {
            setError(null);
            const result = await leaveApi.createLeaveRequest(leaveData);
            await loadLeaveBalance(); // Refresh balance after request
            return result;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    return (
        <LeaveContext.Provider value={{
            leaveBalance,
            loading,
            error,
            requestLeave,
            refreshBalance: loadLeaveBalance
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