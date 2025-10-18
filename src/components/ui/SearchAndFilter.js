import React from 'react';
import { Search } from 'lucide-react';

const SearchAndFilter = ({
    searchQuery = '',
    onSearchChange,
    selectedDepartment = 'All Departments',
    onDepartmentChange,
    departments = ['All Departments', 'Engineering', 'Marketing', 'HR', 'Sales', 'Finance', 'Operations'],
    selectedStatus = 'All Status',
    onStatusChange,
    statuses = ['All Status', 'Active', 'On Leave', 'Inactive', 'Terminated'],
    placeholder = 'Search employees...'
}) => {
    return (
        <div className="filters-section">
            <div className="search-bar">
                <Search size={20} />
                <input
                    type="text"
                    placeholder={placeholder}
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>
            
            <select
                value={selectedDepartment}
                onChange={(e) => onDepartmentChange(e.target.value)}
                className="department-filter"
            >
                {departments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                ))}
            </select>

            <select
                value={selectedStatus}
                onChange={(e) => onStatusChange(e.target.value)}
                className="status-filter"
            >
                {statuses.map(status => (
                    <option key={status} value={status}>{status}</option>
                ))}
            </select>
        </div>
    );
};

export default SearchAndFilter;