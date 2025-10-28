import React from 'react';
import { Search } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';

const SearchAndFilter = ({
    searchQuery = '',
    onSearchChange,
    selectedDepartment = 'All Departments',
    onDepartmentChange,
    departments = ['All Departments', 'Administration', 'Development', 'Design', 'Interns'],
    selectedStatus = 'All Status',
    onStatusChange,
    statuses = ['All Status', 'Active', 'Leave', 'Terminated'],
    placeholder = 'Search employees...'
}) => {
    return (
        <div className="filters-section">
            <div className="search-bar" style={{minWidth:'60%'}}>
                <Search size={20} />
                <input
                    type="text"
                    placeholder={placeholder}
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>
            
            <Select
                value={selectedDepartment}
                onValueChange={onDepartmentChange}
            >
                <SelectTrigger className="department-filter">
                    <SelectValue placeholder="Select Department" />
                </SelectTrigger>
                <SelectContent>
                    {departments.map(dept => (
                        <SelectItem key={dept} value={dept}>
                            {dept}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>

            <Select
                value={selectedStatus}
                onValueChange={onStatusChange}
            >
                <SelectTrigger className="status-filter">
                    <SelectValue placeholder="Select Status" />
                </SelectTrigger>
                <SelectContent>
                    {statuses.map(status => (
                        <SelectItem key={status} value={status}>
                            {status}
                        </SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
    );
};

export default SearchAndFilter;