import React, { useState, useEffect } from 'react';
import { UserPlus, RefreshCw } from 'lucide-react';
import * as Dialog from '@radix-ui/react-dialog';
import { useEmployees } from '../../contexts/EmployeeContext';
import { 
    AddEmployeeForm, 
    EmployeeTable, 
    SearchAndFilter, 
    Notification 
} from '../../components';
import './EmployeeManagement.css';
import '../../styles/tailwind.css';

const EmployeeManagement = () => {
    const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
    const [selectedStatus, setSelectedStatus] = useState('All Status');
    const [notification, setNotification] = useState(null);
    const { employees, loading, error, addEmployee, updateEmployee, deleteEmployee, refreshEmployees } = useEmployees();

    const departments = ['All Departments', 'Administration', 'Engineering', 'Marketing', 'HR', 'Sales'];
    const statuses = ['All Status', 'Active', 'On Leave', 'Inactive', 'Terminated'];

    useEffect(() => {
        if (error) {
            console.error('Error loading employees:', error);
            // You might want to show an error message to the user
        }
    }, [error]);

    // Debug function to test database connections
    // const testDatabaseConnections = async () => {
    //     console.log('🧪 Testing database connections...');
        
    //     try {
    //         // Test employees table
    //         console.log('📋 Testing employees table...');
    //         const { employeeApi, adminApi } = await import('../../utils/supabase');
            
    //         const employees = await employeeApi.getEmployees();
    //         console.log('✅ Employees table result:', employees);
            
    //         // Test admins table
    //         console.log('👑 Testing admins table...');
    //         const admins = await adminApi.getAdmins();
    //         console.log('✅ Admins table result:', admins);
            
    //         // Test combined function
    //         console.log('🔗 Testing combined function...');
    //         const combined = await adminApi.getAllEmployeesAndAdmins();
    //         console.log('✅ Combined result:', combined);
            
    //         setNotification({
    //             type: 'success',
    //             message: `Database test complete. Found ${employees.length} employees and ${admins.length} admins.`
    //         });
            
    //     } catch (error) {
    //         console.error('❌ Database test failed:', error);
    //         setNotification({
    //             type: 'error',
    //             message: `Database test failed: ${error.message}`
    //         });
    //     }
    // };

    if (loading) {
        return <div className="loading">Loading employees...</div>;
    }

    // Use employees from context or empty array if not loaded
    const currentEmployees = employees || [];

    const filteredEmployees = currentEmployees.filter(employee => {
        const matchesSearch = (employee.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
            (employee.email?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
            (employee.position?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
            (employee.role?.toLowerCase().includes(searchQuery.toLowerCase()) || false);

        const matchesDepartment = selectedDepartment === 'All Departments' ||
            employee.department === selectedDepartment;

        // Status filtering - normalize status values for comparison
        const normalizeStatus = (status) => {
            if (!status) return 'active';
            const normalized = status.toLowerCase().replace(/[-_\s]/g, '');
            if (normalized === 'onleave' || normalized === 'on-leave') return 'onleave';
            return normalized;
        };

        const employeeStatus = normalizeStatus(employee.status);
        const filterStatus = normalizeStatus(selectedStatus);
        
        const matchesStatus = selectedStatus === 'All Status' || 
            filterStatus === employeeStatus ||
            (selectedStatus === 'Active' && (!employee.status || employeeStatus === 'active')) ||
            (selectedStatus === 'On Leave' && employeeStatus === 'onleave');

        return matchesSearch && matchesDepartment && matchesStatus;
    });

    // Handler functions for the AddEmployeeForm component
    const handleEmployeeSuccess = (message) => {
        setNotification({
            type: 'success',
            message: message
        });
        // Refresh employee data to include new additions
        refreshEmployees();
        // Clear notification after 3 seconds
        setTimeout(() => setNotification(null), 3000);
    };

    const handleEmployeeError = (message) => {
        setNotification({
            type: 'error',
            message: message
        });
        // Clear notification after 5 seconds
        setTimeout(() => setNotification(null), 5000);
    };

    return (
        <div className="employee-management">
            {/* Notification */}
            <Notification 
                notification={notification}
                onClose={() => setNotification(null)}
            />

            <div className="page-header">
                <div>
                    <h1 className='bodyMediumText1'>Employee Management</h1>
                    <p className='bodyRegularText4'>View and manage employee and admin information</p>
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                    {/* <button
                        className="add-employee-btn"
                        onClick={testDatabaseConnections}
                        style={{ backgroundColor: '#f59e0b', marginRight: '0.5rem' }}
                        title="Test database connections"
                    >
                        🧪 Test DB
                    </button> */}
                    <button
                        className="add-employee-btn bodyMediumText2"
                        onClick={() => refreshEmployees()}
                        style={{ backgroundColor: '#c4c6caff', marginRight: '0.5rem' }}
                        title="Refresh employee data"
                    >
                        <RefreshCw size={20} />
                        {/* Refresh */}
                    </button>
                    <button
                        className="add-employee-btn bodyMediumText3"
                        onClick={() => setEmployeeDialogOpen(true)}
                    >
                        <UserPlus size={20} />
                        Add Employee
                    </button>
                </div>
            </div>
            <div className="content-section">
                <div>
                    <div className="employee-count">
                        <h1 className='bodyMediumText2'>
                            {selectedDepartment === 'All Departments'
                                ? `All Staff (${filteredEmployees.length})`
                                : `${selectedDepartment} Staff (${filteredEmployees.length})`
                            }
                        </h1>
                        <p className='bodyRegularText4'>
                            Includes employees and administrators
                        </p>
                    </div>

                    <SearchAndFilter 
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        selectedDepartment={selectedDepartment}
                        onDepartmentChange={setSelectedDepartment}
                        departments={departments}
                        selectedStatus={selectedStatus}
                        onStatusChange={setSelectedStatus}
                        statuses={statuses}
                        placeholder="Search employees by name, email, or position..."
                    />
                </div>

                <EmployeeTable 
                    employees={filteredEmployees}
                    showActions={false} // Set to true when edit/delete functionality is ready
                    onEdit={(employee) => {
                        // TODO: Implement edit functionality
                        console.log('Edit employee:', employee);
                    }}
                    onDelete={(employee) => {
                        // TODO: Implement delete functionality  
                        console.log('Delete employee:', employee);
                    }}
                />
            </div>

            <Dialog.Root open={employeeDialogOpen} onOpenChange={setEmployeeDialogOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="dialog-overlay" />
                    <Dialog.Content className="dialog-content add_dialog-content">
                        <AddEmployeeForm 
                            onClose={() => setEmployeeDialogOpen(false)}
                            onSuccess={handleEmployeeSuccess}
                            onError={handleEmployeeError}
                        />
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>
        </div>
    );
};

export default EmployeeManagement;