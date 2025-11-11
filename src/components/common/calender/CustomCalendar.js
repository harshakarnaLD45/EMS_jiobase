import React, { useState } from 'react';
import { format, addDays, startOfWeek, startOfMonth, endOfMonth, endOfWeek, isSameMonth, isSameDay, addMonths, subMonths, isBefore, startOfDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const CustomCalendar = ({ 
  onDateRangeSelect, 
  onDateSelect, // NEW: Support single date selection
  selectedRange, 
  onClose,
  singleDateMode = false, // NEW: Single date mode flag
  minDate = null, // NEW: Minimum selectable date
}) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dateRange, setDateRange] = useState(selectedRange || { from: null, to: null });
  const [singleDate, setSingleDate] = useState(null); // NEW: Single date state

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
    // NEW: Handle single date mode
    if (singleDateMode) {
      setSingleDate(day);
      return;
    }

    // Original range selection logic
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

    // NEW: Normalize minDate to start of day for comparison
    const normalizedMinDate = minDate ? startOfDay(minDate) : null;

    while (day <= endDate) {
      for (let i = 0; i < 7; i++) {
        const cloneDay = day;
        const isCurrentMonth = isSameMonth(day, monthStart);
        const isSunday = day.getDay() === 0; // Disable Sundays
        
        // NEW: Check if date is before minDate
        const isBeforeMinDate = normalizedMinDate && isBefore(startOfDay(day), normalizedMinDate);
        
        // Determine selection state based on mode
        const isSelected = singleDateMode 
          ? (singleDate && isSameDay(day, singleDate))
          : ((dateRange.from && isSameDay(day, dateRange.from)) || (dateRange.to && isSameDay(day, dateRange.to)));
        
        const isInRange = !singleDateMode && dateRange.from && dateRange.to && day >= dateRange.from && day <= dateRange.to;
        const isToday = isSameDay(day, new Date());
        
        // NEW: Disable if not current month, is Sunday, or is before minDate
        const isDisabled = !isCurrentMonth || isSunday || isBeforeMinDate;

        days.push(
          <div
            key={day}
            className={`calendar-cell ${
              isDisabled ? 'calendar-cell-disabled' : ''
            } ${
              isSelected ? 'calendar-cell-selected' : ''
            } ${isInRange ? 'calendar-cell-in-range' : ''} ${
              isToday ? 'calendar-cell-today' : ''
            }`}
            onClick={() => !isDisabled && handleDateClick(cloneDay)}
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
    if (singleDateMode) {
      setSingleDate(null);
      if (onDateSelect) {
        onDateSelect(null);
      }
    } else {
      setDateRange({ from: null, to: null });
      if (onDateRangeSelect) {
        onDateRangeSelect({ from: null, to: null });
      }
    }
  };

  const handleApply = () => {
    // NEW: Handle single date mode
    if (singleDateMode) {
      if (onDateSelect && singleDate) {
        onDateSelect(singleDate);
      }
      if (onClose) {
        onClose();
      }
      return;
    }

    // Original range mode
    if (onDateRangeSelect && dateRange.from && dateRange.to) {
      onDateRangeSelect(dateRange);
    }
    if (onClose) {
      onClose();
    }
  };

  // Calculate total leave days excluding Sundays
  const totalDaysExcludingSundays = (() => {
    if (singleDateMode || !dateRange.from || !dateRange.to) return 0;
    let count = 0;
    let current = new Date(dateRange.from);
    const end = new Date(dateRange.to);

    while (current <= end) {
      if (current.getDay() !== 0) count++; // Skip Sundays
      current.setDate(current.getDate() + 1);
    }

    return count;
  })();

  // Determine if we should show the footer
  const shouldShowFooter = singleDateMode ? singleDate : (dateRange.from && dateRange.to);

  return (
    <div className="custom-calendar">
      <div className="calendar-container">
        {renderHeader()}
        {renderDays()}
        {renderCells()}
        
        {shouldShowFooter && (
          <div className="calendar-footer">
            <div className="selected-range">
              {singleDateMode ? (
                <>
                  <strong>Selected:</strong> {format(singleDate, 'MMM dd, yyyy')}
                </>
              ) : (
                <>
                  <strong>Selected:</strong> {format(dateRange.from, 'MMM dd')} - {format(dateRange.to, 'MMM dd, yyyy')}
                  <span className="range-days">
                    ({totalDaysExcludingSundays} days excluding Sundays)
                  </span>
                </>
              )}
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
