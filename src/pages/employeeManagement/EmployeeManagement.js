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
import AccountDetailsModal from '../Accdetails/AccountDetailsModal';
import './EmployeeManagement.css';
import '../../styles/tailwind.css';

const EmployeeManagement = () => {
    const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [selectedEmployee, setSelectedEmployee] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('All Departments');
    const [selectedStatus, setSelectedStatus] = useState('All Status');
    const [notification, setNotification] = useState(null);
    const [accountDetailsModalOpen, setAccountDetailsModalOpen] = useState(false);
    const [selectedEmployeeForAccountDetails, setSelectedEmployeeForAccountDetails] = useState(null);
    const { employees, loading, error, addEmployee, updateEmployee, deleteEmployee, refreshEmployees } = useEmployees();

    const departments = ['All Departments', 'Administration', 'Development', 'Design', 'Interns'];
    const statuses = ['All Status', 'Active', 'Leave',  'Terminated'];

    useEffect(() => {
        if (error) {
            console.error('Error loading employees:', error);
            // You might want to show an error message to the user
        }
    }, [error]);

    // Debug function to test database connections
    // const testDatabaseConnections = async () => {
    //     //console.log('🧪 Testing database connections...');
        
    //     try {
    //         // Test employees table
    //         //console.log('📋 Testing employees table...');
    //         const { employeeApi, adminApi } = await import('../../utils/supabase');
            
    //         const employees = await employeeApi.getEmployees();
    //         //console.log('✅ Employees table result:', employees);
            
    //         // Test admins table
    //         //console.log('👑 Testing admins table...');
    //         const admins = await adminApi.getAdmins();
    //         //console.log('✅ Admins table result:', admins);
            
    //         // Test combined function
    //         //console.log('🔗 Testing combined function...');
    //         const combined = await adminApi.getAllEmployeesAndAdmins();
    //         //console.log('✅ Combined result:', combined);
            
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
                    <p className='bodyRegularText4'>View and manage employee information</p>
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
                                ? `All Employees (${filteredEmployees.length})`
                                : `${selectedDepartment} Employees (${filteredEmployees.length})`
                            }
                        </h1>
                        <p className='bodyRegularText4'>
                            Manage employee records and status
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
                    showActions={true} // Enable edit/delete actions
                    onViewAccountDetails={(employee) => {
                        setSelectedEmployeeForAccountDetails(employee);
                        setAccountDetailsModalOpen(true);
                    }}
                    onEdit={(employee) => {
                        setSelectedEmployee(employee);
                        setEditDialogOpen(true);
                    }}
                    onDelete={async (employee) => {
                        try {
                            // Confirm before terminating
                            const confirmed = window.confirm(
                                `Are you sure you want to terminate ${employee.name}?\n\nThis will mark the employee as "Terminated" but keep their records in the system.`
                            );
                            
                            if (!confirmed) return;

                            // Update employee status to "Terminated" instead of deleting
                            const employeeIdToUpdate = employee.employee_id || employee.id;
                            //console.log('🔄 Terminating employee:', { employee, employeeIdToUpdate });
                            
                            if (!employeeIdToUpdate) {
                                throw new Error('Employee ID not found. Cannot update employee status.');
                            }
                            
                            await updateEmployee(employeeIdToUpdate, { 
                                status: 'Terminated',
                                terminated_at: new Date().toISOString()
                            });
                            
                            setNotification({
                                type: 'success',
                                message: `${employee.name} has been marked as Terminated`
                            });
                            
                            // Refresh the employee list
                            refreshEmployees();
                            
                            // Clear notification after 3 seconds
                            setTimeout(() => setNotification(null), 3000);
                            
                        } catch (error) {
                            console.error('Error terminating employee:', error);
                            setNotification({
                                type: 'error',
                                message: `Failed to terminate employee: ${error.message}`
                            });
                            setTimeout(() => setNotification(null), 5000);
                        }
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

            {/* Edit Employee Dialog */}
            <Dialog.Root open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <Dialog.Portal>
                    <Dialog.Overlay className="dialog-overlay" />
                    <Dialog.Content className="dialog-content add_dialog-content">
                        <AddEmployeeForm 
                            mode="edit"
                            employeeData={selectedEmployee}
                            onClose={() => {
                                setEditDialogOpen(false);
                                setSelectedEmployee(null);
                            }}
                            onSuccess={(message) => {
                                setNotification({
                                    type: 'success',
                                    message: message
                                });
                                refreshEmployees();
                                setEditDialogOpen(false);
                                setSelectedEmployee(null);
                                setTimeout(() => setNotification(null), 3000);
                            }}
                            onError={(message) => {
                                setNotification({
                                    type: 'error',
                                    message: message
                                });
                                setTimeout(() => setNotification(null), 5000);
                            }}
                        />
                    </Dialog.Content>
                </Dialog.Portal>
            </Dialog.Root>

            {/* Account Details Modal */}
            {accountDetailsModalOpen && selectedEmployeeForAccountDetails && (
                <AccountDetailsModal
                    employeeId={selectedEmployeeForAccountDetails.employee_id || selectedEmployeeForAccountDetails.id}
                    employeeName={selectedEmployeeForAccountDetails.name}
                    onClose={() => {
                        setAccountDetailsModalOpen(false);
                        setSelectedEmployeeForAccountDetails(null);
                    }}
                />
            )}
        </div>
    );
};

export default EmployeeManagement;