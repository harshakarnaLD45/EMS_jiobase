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
    <div style={{
      maxWidth: '28rem',
      margin: '0 auto',
      padding: '1.5rem',
      backgroundColor: 'white',
      borderRadius: '0.5rem',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
    }}>
      <h2 style={{
        fontSize: '1.5rem',
        fontWeight: 'bold',
        marginBottom: '1.5rem',
        color: '#1f2937'
      }}>Leave Request</h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            Leave Type *
          </label>
          <select
            value={formData.leaveType}
            onChange={(e) => setFormData(prev => ({ ...prev, leaveType: e.target.value }))}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              outline: 'none',
              fontSize: '1rem'
            }}
            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
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
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            Leave Period *
          </label>
          <DateRangePicker
            selectedRange={formData.dateRange}
            onRangeSelect={handleDateRangeChange}
            placeholder="Select leave dates"
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            Reason
          </label>
          <textarea
            value={formData.reason}
            onChange={(e) => setFormData(prev => ({ ...prev, reason: e.target.value }))}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              outline: 'none',
              fontSize: '1rem',
              resize: 'vertical'
            }}
            onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            rows="3"
            placeholder="Explain the reason for your leave request..."
          />
        </div>

        {formData.dateRange?.from && formData.dateRange?.to && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#eff6ff',
            border: '1px solid #bfdbfe',
            borderRadius: '0.375rem'
          }}>
            <h4 style={{
              fontWeight: '500',
              color: '#1e40af',
              marginBottom: '0.5rem'
            }}>Leave Summary:</h4>
            <div style={{
              fontSize: '0.875rem',
              color: '#1d4ed8',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}>
              <p>From: {format(formData.dateRange.from, 'EEEE, MMMM dd, yyyy')}</p>
              <p>To: {format(formData.dateRange.to, 'EEEE, MMMM dd, yyyy')}</p>
              <p>Total Days: {Math.ceil((formData.dateRange.to - formData.dateRange.from) / (1000 * 60 * 60 * 24)) + 1}</p>
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={!formData.leaveType || !formData.dateRange?.from || !formData.dateRange?.to}
          style={{
            width: '100%',
            padding: '0.5rem 1rem',
            backgroundColor: !formData.leaveType || !formData.dateRange?.from || !formData.dateRange?.to ? '#9ca3af' : '#2563eb',
            color: 'white',
            borderRadius: '0.375rem',
            border: 'none',
            outline: 'none',
            cursor: !formData.leaveType || !formData.dateRange?.from || !formData.dateRange?.to ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: '500',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!(!formData.leaveType || !formData.dateRange?.from || !formData.dateRange?.to)) {
              e.target.style.backgroundColor = '#1d4ed8';
            }
          }}
          onMouseLeave={(e) => {
            if (!(!formData.leaveType || !formData.dateRange?.from || !formData.dateRange?.to)) {
              e.target.style.backgroundColor = '#2563eb';
            }
          }}
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
    <div style={{
      maxWidth: '28rem',
      margin: '0 auto',
      padding: '1.5rem',
      backgroundColor: 'white',
      borderRadius: '0.5rem',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
    }}>
      <h2 style={{
        fontSize: '1.5rem',
        fontWeight: 'bold',
        marginBottom: '1.5rem',
        color: '#1f2937'
      }}>Timesheet Entry</h2>
      
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            Work Period *
          </label>
          <DateRangePicker
            selectedRange={formData.dateRange}
            onRangeSelect={handleDateRangeChange}
            placeholder="Select work period"
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            Total Hours *
          </label>
          <input
            type="number"
            value={formData.totalHours}
            onChange={(e) => setFormData(prev => ({ ...prev, totalHours: e.target.value }))}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              outline: 'none',
              fontSize: '1rem'
            }}
            onFocus={(e) => e.target.style.borderColor = '#10b981'}
            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            min="0"
            max="200"
            step="0.5"
            placeholder="Enter total hours worked"
            required
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            Tasks Completed
          </label>
          <textarea
            value={formData.tasks}
            onChange={(e) => setFormData(prev => ({ ...prev, tasks: e.target.value }))}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              outline: 'none',
              fontSize: '1rem',
              resize: 'vertical'
            }}
            onFocus={(e) => e.target.style.borderColor = '#10b981'}
            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            rows="3"
            placeholder="Describe the tasks you completed..."
          />
        </div>

        <div>
          <label style={{
            display: 'block',
            fontSize: '0.875rem',
            fontWeight: '500',
            color: '#374151',
            marginBottom: '0.5rem'
          }}>
            Notes
          </label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            style={{
              width: '100%',
              padding: '0.5rem 0.75rem',
              border: '1px solid #d1d5db',
              borderRadius: '0.375rem',
              outline: 'none',
              fontSize: '1rem',
              resize: 'vertical'
            }}
            onFocus={(e) => e.target.style.borderColor = '#10b981'}
            onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
            rows="2"
            placeholder="Any additional notes..."
          />
        </div>

        {formData.dateRange?.from && formData.dateRange?.to && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '0.375rem'
          }}>
            <h4 style={{
              fontWeight: '500',
              color: '#166534',
              marginBottom: '0.5rem'
            }}>Timesheet Summary:</h4>
            <div style={{
              fontSize: '0.875rem',
              color: '#15803d',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.25rem'
            }}>
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
          style={{
            width: '100%',
            padding: '0.5rem 1rem',
            backgroundColor: !formData.dateRange?.from || !formData.dateRange?.to || !formData.totalHours ? '#9ca3af' : '#059669',
            color: 'white',
            borderRadius: '0.375rem',
            border: 'none',
            outline: 'none',
            cursor: !formData.dateRange?.from || !formData.dateRange?.to || !formData.totalHours ? 'not-allowed' : 'pointer',
            fontSize: '1rem',
            fontWeight: '500',
            transition: 'background-color 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!(!formData.dateRange?.from || !formData.dateRange?.to || !formData.totalHours)) {
              e.target.style.backgroundColor = '#047857';
            }
          }}
          onMouseLeave={(e) => {
            if (!(!formData.dateRange?.from || !formData.dateRange?.to || !formData.totalHours)) {
              e.target.style.backgroundColor = '#059669';
            }
          }}
        >
          Submit Timesheet
        </button>
      </form>
    </div>
  );
};