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
        const isSelected = dateRange.from && isSameDay(day, dateRange.from) ||
                          dateRange.to && isSameDay(day, dateRange.to);
        const isInRange = dateRange.from && dateRange.to &&
                         day >= dateRange.from && day <= dateRange.to;
        const isToday = isSameDay(day, new Date());

        days.push(
          <div
            key={day}
            className={`calendar-cell ${
              !isCurrentMonth ? 'calendar-cell-disabled' : ''
            } ${isSelected ? 'calendar-cell-selected' : ''} ${
              isInRange ? 'calendar-cell-in-range' : ''
            } ${isToday ? 'calendar-cell-today' : ''}`}
            onClick={() => isCurrentMonth && handleDateClick(cloneDay)}
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
                ({Math.ceil((dateRange.to - dateRange.from) / (1000 * 60 * 60 * 24)) + 1} days)
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