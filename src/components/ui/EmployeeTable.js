import React from 'react';
import { Edit, Trash } from 'lucide-react';

const EmployeeTable = ({ 
    employees = [], 
    onEdit = null, 
    onDelete = null,
    showActions = false 
}) => {
    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            return new Date(dateString).toLocaleDateString();
        } catch (error) {
            return dateString;
        }
    };

    const formatPhone = (phone) => {
        if (!phone) return 'N/A';
        return phone;
    };

    if (employees.length === 0) {
        return (
            <div className="empty-state" style={{
                textAlign: 'center',
                padding: '3rem',
                color: '#6b7280'
            }}>
                <h3 className="bodyMediumText3">No employees found</h3>
                <p className="bodyRegularText4">No employees found for the selected department</p>
            </div>
        );
    }

    return (
        <div className="employees-table">
            <div className="table-header">
                <span className="col-name bodyRegularText4">Name</span>
                <span className="col-contact bodyRegularText4">Contact</span>
                <span className="col-department bodyRegularText4">Department</span>
                <span className="col-position bodyRegularText4">Position</span>
                <span className="col-status bodyRegularText4">Status</span>
                <span className="col-date bodyRegularText4">Join Date</span>
                {showActions && <span className="col-actions bodyRegularText4">Actions</span>}
            </div>

            <div className="table-body">
                {employees.map(employee => (
                    <div key={employee.id} className="table-row">
                        <span className="col-name">
                            <div className="employee-name bodyRegularText4">
                                {employee.name || 'N/A'}
                            </div>
                        </span>
                        
                        <span className="col-contact">
                            <div className="contact-info">
                                <div className="email bodyRegularText4">{employee.email || 'N/A'}</div>
                                <div className="phone bodyRegularText4">{formatPhone(employee.phone)}</div>
                            </div>
                        </span>
                        
                        <span className="col-department">
                            <div className="department-badge bodyRegularText4">
                                {employee.department || 'N/A'}
                            </div>
                        </span>
                        
                        <span className="col-position bodyRegularText4">
                            {employee.position || 'N/A'}
                        </span>
                        
                        <span className="col-status">
                            <span className={`bodyRegularText4 status-badge ${(employee.status || 'active').toLowerCase()}`}>
                                {employee.status || 'Active'}
                            </span>
                        </span>
                        
                        <span className="col-date bodyRegularText4">
                            {formatDate(employee.joinDate || employee.join_date)}
                        </span>
                        
                        {showActions && (
                            <span className="col-actions">
                                <div className="action-buttons">
                                    {onEdit && (
                                        <button 
                                            className="action-btn edit"
                                            onClick={() => onEdit(employee)}
                                            title="Edit Employee"
                                        >
                                            <Edit size={16} />
                                        </button>
                                    )}
                                    {onDelete && (
                                        <button 
                                            className="action-btn delete"
                                            onClick={() => onDelete(employee)}
                                            title="Delete Employee"
                                        >
                                            <Trash size={16} />
                                        </button>
                                    )}
                                </div>
                            </span>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default EmployeeTable;