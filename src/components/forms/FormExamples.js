import React, { useState } from 'react';
import DateRangePicker from '../common/calender/callender';
import { format } from 'date-fns';

export const LeaveRequestFormWithCalendar = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    leaveType: '',
    reason: '',
    dateRange: { from: null, to: null },
    hasDocuments: false
  });

  const handleDateRangeChange = (range) => {
    setFormData(prev => ({
      ...prev,
      dateRange: range
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit({
        ...formData,
        startDate: formData.dateRange.from,
        endDate: formData.dateRange.to,
        totalDays: formData.dateRange.from && formData.dateRange.to 
          ? Math.ceil((formData.dateRange.to - formData.dateRange.from) / (1000 * 60 * 60 * 24)) + 1 
          : 0
      });
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Leave Request</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Leave Type *
          </label>
          <select
            value={formData.leaveType}
            onChange={(e) => setFormData(prev => ({ ...prev, leaveType: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
          >
            <option value="">Select leave type</option>
            <option value="sick">Sick Leave</option>
            <option value="vacation">Vacation</option>
            <option value="personal">Personal Leave</option>
            <option value="emergency">Emergency Leave</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Leave Period *
          </label>
          <DateRangePicker
            selectedRange={formData.dateRange}
            onRangeSelect={handleDateRangeChange}
            placeholder="Select leave dates"
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason
          </label>
          <textarea
            value={formData.reason}
            onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="3"
            placeholder="Explain the reason for your leave request..."
          />
        </div>

        {formData.dateRange?.from && formData.dateRange?.to && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-800 mb-2">Leave Summary:</h4>
            <div className="text-sm text-blue-700 space-y-1">
              <p>From: {format(formData.dateRange.from, 'EEEE, MMMM dd, yyyy')}</p>
              <p>To: {format(formData.dateRange.to, 'EEEE, MMMM dd, yyyy')}</p>
              <p>Total Days: {Math.ceil((formData.dateRange.to - formData.dateRange.from) / (1000 * 60 * 60 * 24)) + 1}</p>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={!formData.leaveType || !formData.dateRange?.from || !formData.dateRange?.to}
          className="w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit Leave Request
        </button>
      </form>
    </div>
  );
};

export const TimesheetFormWithCalendar = ({ onSubmit }) => {
  const [formData, setFormData] = useState({
    dateRange: { from: null, to: null },
    totalHours: '',
    tasks: '',
    notes: ''
  });

  const handleDateRangeChange = (range) => {
    setFormData(prev => ({
      ...prev,
      dateRange: range
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (onSubmit) {
      onSubmit({
        ...formData,
        startDate: formData.dateRange.from,
        endDate: formData.dateRange.to,
        workingDays: formData.dateRange.from && formData.dateRange.to 
          ? Math.ceil((formData.dateRange.to - formData.dateRange.from) / (1000 * 60 * 60 * 24)) + 1 
          : 0
      });
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Timesheet Entry</h2>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Work Period *
          </label>
          <DateRangePicker
            selectedRange={formData.dateRange}
            onRangeSelect={handleDateRangeChange}
            placeholder="Select work period"
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Total Hours *
          </label>
          <input
            type="number"
            value={formData.totalHours}
            onChange={(e) => setFormData(prev => ({ ...prev, totalHours: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            min="0"
            max="200"
            step="0.5"
            placeholder="Enter total hours worked"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tasks Completed
          </label>
          <textarea
            value={formData.tasks}
            onChange={(e) => setFormData(prev => ({ ...prev, tasks: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            rows="3"
            placeholder="Describe the tasks you completed..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
            rows="2"
            placeholder="Any additional notes..."
          />
        </div>

        {formData.dateRange?.from && formData.dateRange?.to && (
          <div className="p-4 bg-green-50 border border-green-200 rounded-md">
            <h4 className="font-medium text-green-800 mb-2">Timesheet Summary:</h4>
            <div className="text-sm text-green-700 space-y-1">
              <p>Period: {format(formData.dateRange.from, 'MMM dd')} - {format(formData.dateRange.to, 'MMM dd, yyyy')}</p>
              <p>Working Days: {Math.ceil((formData.dateRange.to - formData.dateRange.from) / (1000 * 60 * 60 * 24)) + 1}</p>
              {formData.totalHours && (
                <p>Hours per day: {(parseFloat(formData.totalHours) / (Math.ceil((formData.dateRange.to - formData.dateRange.from) / (1000 * 60 * 60 * 24)) + 1)).toFixed(1)}</p>
              )}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={!formData.dateRange?.from || !formData.dateRange?.to || !formData.totalHours}
          className="w-full py-2 px-4 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Submit Timesheet
        </button>
      </form>
    </div>
  );
};