import React, { createContext, useContext, useState, useEffect } from 'react';
import { employeeApi, adminApi } from '../utils/supabase';

const EmployeeContext = createContext();

export function EmployeeProvider({ children }) {
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadEmployees();
    }, []);

    const loadEmployees = async () => {
        try {
            setLoading(true);
            setError(null);
            console.log('🔄 EmployeeContext: Starting to load employees and admins from database...');
            
            // Get both employees and admins combined from their respective tables
            const data = await adminApi.getAllEmployeesAndAdmins();
            
            console.log('📊 EmployeeContext: Setting employee data:', {
                totalRecords: data.length,
                employees: data.filter(d => d.role === 'employee').length,
                admins: data.filter(d => d.role === 'admin').length,
                sampleData: data.slice(0, 2)
            });
            
            setEmployees(data);
            console.log('✅ EmployeeContext: Successfully loaded and set employee data');
            
        } catch (err) {
            console.error('❌ EmployeeContext: Error loading employees and admins:', err);
            setError(`Failed to load staff data: ${err.message}`);
            setEmployees([]); // Set empty array on error
        } finally {
            setLoading(false);
        }
    };

    const addEmployee = async (employeeData) => {
        try {
            setError(null);
            const newEmployee = await employeeApi.createEmployee(employeeData);
            setEmployees(prev => [newEmployee, ...prev]);
            return newEmployee;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const updateEmployee = async (id, updates) => {
        try {
            setError(null);
            const updatedEmployee = await employeeApi.updateEmployee(id, updates);
            setEmployees(prev => 
                prev.map(emp => emp.id === id ? updatedEmployee : emp)
            );
            return updatedEmployee;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const deleteEmployee = async (id) => {
        try {
            setError(null);
            await employeeApi.deleteEmployee(id);
            setEmployees(prev => prev.filter(emp => emp.id !== id));
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    return (
        <EmployeeContext.Provider value={{
            employees,
            loading,
            error,
            addEmployee,
            updateEmployee,
            deleteEmployee,
            refreshEmployees: loadEmployees
        }}>
            {children}
        </EmployeeContext.Provider>
    );
}

export function useEmployees() {
    const context = useContext(EmployeeContext);
    if (!context) {
        throw new Error('useEmployees must be used within an EmployeeProvider');
    }
    return context;
}