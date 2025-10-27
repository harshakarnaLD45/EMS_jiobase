import React, { useState } from 'react';
import DateRangePicker from '../components/common/callender';
import TimesheetFilters from '../components/timesheet/TimesheetFilters';
import '../components/timesheet/TimesheetFilters.css';
import { format } from 'date-fns';

const CalendarDemo = () => {
  const [selectedRange, setSelectedRange] = useState({ from: null, to: null });
  const [filters, setFilters] = useState({
    status: 'all',
    filterMode: 'all',
    startDate: '',
    endDate: '',
    search: ''
  });

  const handleRangeSelect = (range) => {
    setSelectedRange(range);
    console.log('Selected range:', range);
  };

  const handleFilterChange = (field, value) => {
    console.log('Filter change:', field, '=', value);
    setFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Calendar Demo</h1>
      
      <div style={{ marginBottom: '2rem' }}>
        <h2>Basic Date Range Picker</h2>
        <DateRangePicker
          selectedRange={selectedRange}
          onRangeSelect={handleRangeSelect}
          placeholder="Select your date range..."
        />
        
        {selectedRange?.from && selectedRange?.to && (
          <div style={{ 
            marginTop: '1rem', 
            padding: '1rem', 
            background: '#f0f9ff', 
            border: '1px solid #bae6fd',
            borderRadius: '8px'
          }}>
            <strong>Selected Range:</strong><br/>
            From: {format(selectedRange.from, 'EEEE, MMMM dd, yyyy')}<br/>
            To: {format(selectedRange.to, 'EEEE, MMMM dd, yyyy')}<br/>
            Duration: {Math.ceil((selectedRange.to - selectedRange.from) / (1000 * 60 * 60 * 24)) + 1} days
          </div>
        )}
      </div>

      <div>
        <h2>Timesheet Filters Component</h2>
        <TimesheetFilters 
          filters={filters}
          onFilterChange={handleFilterChange}
        />
        
        <div style={{ 
          marginTop: '1rem', 
          padding: '1rem', 
          background: '#f9fafb', 
          border: '1px solid #e5e7eb',
          borderRadius: '8px'
        }}>
          <strong>Current Filter State:</strong>
          <pre>{JSON.stringify(filters, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
};

export default CalendarDemo;