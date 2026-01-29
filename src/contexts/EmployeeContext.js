import React, { createContext, useContext, useState, useEffect } from 'react';
import { employeeApi, adminApi } from '../utils/supabase';

const EmployeeContext = createContext();

export function EmployeeProvider({ children }) {
    const [employees, setEmployees] = useState([]);
    const [admins, setAdmins] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadEmployees();
    }, []);

   // In your EmployeeContext.js file, update the loadEmployees function:

const loadEmployees = async () => {
  try {
    setLoading(true);
    setError(null);
    console.log('🔄 EmployeeContext: Loading ALL users from database...');
    
    // Get ALL users (admins + employees)
    const data = await adminApi.getAllEmployeesAndAdmins();
    
    console.log('📊 EmployeeContext: All users data:', {
      totalRecords: data.length,
      sampleData: data.slice(0, 5)
    });
    
    // Separate into admins and employees
    const adminsOnly = data.filter(d => d.role === 'admin' || d.isAdmin === true);
    const employeesOnly = data.filter(d => d.role !== 'admin' && d.isAdmin !== true);

    console.log('👑 Admins found:', adminsOnly.length);
    console.log('👤 Employees found:', employeesOnly.length);
    
    // Log admin details for debugging
    if (adminsOnly.length > 0) {
      console.log('🔍 Admin details:', adminsOnly.map(a => ({
        id: a.id,
        name: a.name,
        email: a.email,
        role: a.role,
        source: a.source
      })));
    }

    setEmployees(employeesOnly);
    setAdmins(adminsOnly);

    console.log('✅ EmployeeContext: Successfully loaded and set employee data');
    
  } catch (err) {
    console.error('❌ EmployeeContext: Error loading employees:', err);
    setError(`Failed to load employee data: ${err.message}`);
    setEmployees([]);
  } finally {
    setLoading(false);
  }
};

    const addEmployee = async (employeeData) => {
        try {
            setError(null);
            //console.log('🔄 EmployeeContext: Adding new employee with data:', employeeData);
            
            // Validate required fields
            if (!employeeData.first_name || !employeeData.last_name) {
                throw new Error('First name and last name are required');
            }
            
            if (!employeeData.email) {
                throw new Error('Email is required');
            }
            
            if (!employeeData.department) {
                throw new Error('Department is required');
            }
            
            if (!employeeData.position) {
                throw new Error('Position is required');
            }
            
            const newEmployee = await employeeApi.createEmployee(employeeData);
            
            // Add the new employee to the state
            setEmployees(prev => [newEmployee, ...prev]);
            
            //console.log('✅ EmployeeContext: Employee added successfully:', newEmployee);
            return newEmployee;
        } catch (err) {
            console.error('❌ EmployeeContext: Error adding employee:', err);
            setError(err.message);
            throw err;
        }
    };

    const updateEmployee = async (employeeId, updates) => {
        try {
            setError(null);
            const updatedEmployee = await employeeApi.updateEmployee(employeeId, updates);
            setEmployees(prev => 
                prev.map(emp => emp.employee_id === employeeId ? updatedEmployee : emp)
            );
            return updatedEmployee;
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    const deleteEmployee = async (employeeId) => {
        try {
            setError(null);
            await employeeApi.deleteEmployee(employeeId);
            setEmployees(prev => prev.filter(emp => emp.employee_id !== employeeId));
        } catch (err) {
            setError(err.message);
            throw err;
        }
    };

    // Utility functions for the new data structure
    const getEmployeeFullName = (employee) => {
        if (employee.first_name && employee.last_name) {
            return `${employee.first_name} ${employee.last_name}`.trim();
        }
        return employee.name || 'Unknown Employee';
    };

    const getEmployeesByDepartment = (department) => {
        return employees.filter(emp => emp.department === department);
    };

    const getEmployeesByPosition = (position) => {
        return employees.filter(emp => emp.position === position);
    };

    const getPositionOptions = (department) => {
        const positionMap = {
            'Administration': ['General Manager', 'IT Manager'],
            'Development': ['Front End Developer', 'Back End Developer', 'Application Developer', 'Web Developer', 'AI Developer', 'PLC Programmer', 'Embedded System Engineer'],
            'Design': ['UX/UI Designer'],
            'Interns': ['Front End Developer', 'Back End Developer', 'Application Developer', 'Web Developer', 'AI Developer', 'UX/UI Designer', 'PLC Programmer', 'Embedded System Engineer']
        };
        return positionMap[department] || [];
    };

    return (
        <EmployeeContext.Provider value={{
            employees,
            admins,
            loading,
            error,
            addEmployee,
            updateEmployee,
            deleteEmployee,
            refreshEmployees: loadEmployees,
            // Utility functions
            getEmployeeFullName,
            getEmployeesByDepartment,
            getEmployeesByPosition,
            getPositionOptions
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