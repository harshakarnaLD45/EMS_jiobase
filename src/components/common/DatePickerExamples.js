import React, { useState } from 'react';
import DateRangePicker from './calender/callender';
import { format } from 'date-fns';

// Example usage for Leave Request Form
export const LeaveRequestDatePicker = ({ onDateRangeChange }) => {
  const [dateRange, setDateRange] = useState({ from: null, to: null });

  const handleRangeSelect = (range) => {
    setDateRange(range);
    if (onDateRangeChange) {
      onDateRangeChange(range);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Leave Period *
        </label>
        <DateRangePicker
          selectedRange={dateRange}
          onRangeSelect={handleRangeSelect}
          placeholder="Select leave dates"
        />
      </div>
      
      {dateRange?.from && dateRange?.to && (
        <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
          <div className="text-sm">
            <p className="font-medium text-blue-800">Leave Request Summary:</p>
            <p className="text-blue-700">
              From: {format(dateRange.from, 'EEEE, MMMM dd, yyyy')}
            </p>
            <p className="text-blue-700">
              To: {format(dateRange.to, 'EEEE, MMMM dd, yyyy')}
            </p>
            <p className="text-blue-700">
              Total Days: {Math.ceil((dateRange.to - dateRange.from) / (1000 * 60 * 60 * 24)) + 1}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

// Example usage for Timesheet Date Range
export const TimesheetDatePicker = ({ onDateRangeChange }) => {
  const [dateRange, setDateRange] = useState({ from: null, to: null });

  const handleRangeSelect = (range) => {
    setDateRange(range);
    if (onDateRangeChange) {
      onDateRangeChange(range);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Timesheet Period *
        </label>
        <DateRangePicker
          selectedRange={dateRange}
          onRangeSelect={handleRangeSelect}
          placeholder="Select timesheet period"
        />
      </div>
      
      {dateRange?.from && dateRange?.to && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="text-sm">
            <p className="font-medium text-green-800">Timesheet Period:</p>
            <p className="text-green-700">
              Week of {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')}
            </p>
            <p className="text-green-700">
              Working Days: {Math.ceil((dateRange.to - dateRange.from) / (1000 * 60 * 60 * 24)) + 1}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};