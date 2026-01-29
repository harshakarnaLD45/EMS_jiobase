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
    
    // ✅ IMPORTANT: Get both employees AND admins from context
    const { employees, admins, loading, error, addEmployee, updateEmployee, deleteEmployee, refreshEmployees } = useEmployees();
    
    const roles = ['All Roles', 'Admin', 'Employee'];
    const [selectedRole, setSelectedRole] = useState('All Roles');

    const departments = ['All Departments', 'Administration', 'Development', 'Design', 'Interns'];
    const statuses = ['All Status', 'Active', 'Leave',  'Terminated'];

    useEffect(() => {
        if (error) {
            console.error('Error loading employees:', error);
        }
    }, [error]);

    if (loading) {
        return <div className="loading">Loading employees...</div>;
    }

    // ✅ FIX: Combine employees and admins into one array for filtering
    const allUsers = [
        ...(employees || []),
        ...(admins || [])
    ];

    console.log('🔍 All users for filtering:', {
        totalUsers: allUsers.length,
        employees: employees?.length || 0,
        admins: admins?.length || 0,
        sampleAdmin: admins?.[0]
    });

    const filteredEmployees = allUsers.filter(employee => {
        const matchesSearch = (employee.name?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
            (employee.email?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
            (employee.position?.toLowerCase().includes(searchQuery.toLowerCase()) || false) ||
            (employee.role?.toLowerCase().includes(searchQuery.toLowerCase()) || false);

        const matchesDepartment = selectedDepartment === 'All Departments' ||
         employee.department?.toLowerCase() === selectedDepartment.toLowerCase();

        // ✅ FIX: Improved role matching
       let employeeRoleMapped = 'employee'; // default role

    if (employee.department?.trim().toLowerCase() === 'administration') {
        employeeRoleMapped = 'admin';
    } else if (employee.role?.toLowerCase() === 'admin') {
        employeeRoleMapped = 'admin';
    }

const matchesRole = selectedRole === 'All Roles' ||
    selectedRole.toLowerCase() === employeeRoleMapped;
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

        return matchesSearch && matchesDepartment && matchesStatus && matchesRole;
    });

    console.log('🎯 Filtered results:', {
        total: filteredEmployees.length,
        selectedRole,
        adminsInFiltered: filteredEmployees.filter(e => e.role === 'admin').length
    });

    // Handler functions for the AddEmployeeForm component
    const handleEmployeeSuccess = (message) => {
        setNotification({
            type: 'success',
            message: message
        });
        refreshEmployees();
        setTimeout(() => setNotification(null), 3000);
    };

    const handleEmployeeError = (message) => {
        setNotification({
            type: 'error',
            message: message
        });
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
                    <button
                        className="add-employee-btn bodyMediumText2"
                        onClick={() => refreshEmployees()}
                        style={{ backgroundColor: '#c4c6caff', marginRight: '0.5rem' }}
                        title="Refresh employee data"
                    >
                        <RefreshCw size={20} />
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
                        selectedRole={selectedRole}
                        onRoleChange={setSelectedRole}
                        roles={roles}
                        placeholder="Search employees by name, email, or position..."
                    />

                </div>

                <EmployeeTable 
                    employees={filteredEmployees}
                    showActions={true}
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
                            const confirmed = window.confirm(
                                `Are you sure you want to terminate ${employee.name}?\n\nThis will mark the employee as "Terminated" but keep their records in the system.`
                            );
                            
                            if (!confirmed) return;

                            const employeeIdToUpdate = employee.employee_id || employee.id;
                            
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
                            
                            refreshEmployees();
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