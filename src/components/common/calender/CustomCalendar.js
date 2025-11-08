import React, { useState } from 'react';
import { format, addDays, startOfWeek, startOfMonth, endOfMonth, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const CustomCalendar = ({ onDateRangeSelect, selectedRange, onClose }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dateRange, setDateRange] = useState(selectedRange || { from: null, to: null });

  const renderHeader = () => {
    return (
      <div className="calendar-header">
        <button 
          className="calendar-nav-btn"
          onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
        >
          <ChevronLeft size={16} />
        </button>
        <h2 className="calendar-month-year">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button 
          className="calendar-nav-btn"
          onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    );
  };

  const renderDays = () => {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return (
      <div className="calendar-days-header">
        {days.map(day => (
          <div key={day} className="calendar-day-name">
            {day}
          </div>
        ))}
      </div>
    );
  };

  const handleDateClick = (day) => {
    if (!dateRange.from || (dateRange.from && dateRange.to)) {
      // Starting new selection
      const newRange = { from: day, to: null };
      setDateRange(newRange);
    } else if (dateRange.from && !dateRange.to) {
      // Completing selection
      const newRange = day < dateRange.from 
        ? { from: day, to: dateRange.from }
        : { from: dateRange.from, to: day };
      setDateRange(newRange);
      if (onDateRangeSelect) {
        onDateRangeSelect(newRange);
      }
    }
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const rows = [];
    let days = [];
    let day = startDate;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isSelected = (dateRange.from && isSameDay(day, dateRange.from)) ||
                           (dateRange.to && isSameDay(day, dateRange.to));
        const isInRange = dateRange.from && dateRange.to && day >= dateRange.from && day <= dateRange.to;
        const isToday = isSameDay(day, new Date());
        const isSunday = day.getDay() === 0; // Disable Sundays

        days.push(
          <div
            key={day}
            className={`calendar-cell ${
              !isCurrentMonth ? 'calendar-cell-disabled' : ''
            } ${isSunday ? 'calendar-cell-disabled' : ''} ${
              isSelected ? 'calendar-cell-selected' : ''
            } ${isInRange ? 'calendar-cell-in-range' : ''} ${
              isToday ? 'calendar-cell-today' : ''
            }`}
            onClick={() => isCurrentMonth && !isSunday && handleDateClick(cloneDay)}
          >
            <span className="calendar-cell-text">{format(day, 'd')}</span>
          </div>
        );

        day = addDays(day, 1);
      }
      rows.push(
        <div key={day} className="calendar-row">
          {days}
        </div>
      );
      days = [];
    }

    return <div className="calendar-body">{rows}</div>;
  };

  const handleClear = () => {
    setDateRange({ from: null, to: null });
    if (onDateRangeSelect) {
      onDateRangeSelect({ from: null, to: null });
    }
  };

  const handleApply = () => {
    if (onDateRangeSelect && dateRange.from && dateRange.to) {
      onDateRangeSelect(dateRange);
    }
    if (onClose) {
      onClose();
    }
  };

  // Calculate total leave days excluding Sundays
  const totalDaysExcludingSundays = (() => {
    if (!dateRange.from || !dateRange.to) return 0;
    let count = 0;
    let current = new Date(dateRange.from);
    const end = new Date(dateRange.to);

    while (current <= end) {
      if (current.getDay() !== 0) count++; // Skip Sundays
      current.setDate(current.getDate() + 1);
    }

    return count;
  })();

  return (
    <div className="custom-calendar">
      <div className="calendar-container">
        {renderHeader()}
        {renderDays()}
        {renderCells()}
        
        {dateRange.from && dateRange.to && (
          <div className="calendar-footer">
            <div className="selected-range">
              <strong>Selected:</strong> {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')}
              <span className="range-days">
                ({totalDaysExcludingSundays} days excluding Sundays)
              </span>
            </div>
            <div className="calendar-actions">
              <button className="calendar-btn calendar-btn-clear" onClick={handleClear}>
                Clear
              </button>
              <button className="calendar-btn calendar-btn-apply" onClick={handleApply}>
                Apply
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomCalendar;
