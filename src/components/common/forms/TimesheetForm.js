import React, { useState } from 'react';
import { X, Clock, Plus } from 'lucide-react';
import { timesheetApi } from '../../../utils/supabase';
import { useAuth } from '../../../contexts/AuthContext';

const styles = {
  container: {
    position: 'relative',
    // backgroundColor: 'transparent',
    width: '100%',
    maxWidth: '42rem',
    margin: '0 auto',
    borderRadius: '0.5rem',
    background: "#f1f1f1 !important",
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '1rem',
    borderBottom: '1px solid #e5e7eb'
  },
  headerTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  headerIcon: {
    width: '1.25rem',
    height: '1.25rem',
    color: '#3b82f6'
  },
  title: {
    fontSize: '1.25rem',
    fontWeight: '600',
    color: '#111827'
  },
  closeButton: {
    padding: '0.5rem',
    borderRadius: '9999px',
    transition: 'background-color 150ms ease',
    cursor: 'pointer'
  },
  form: {
    padding: '1.5rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem'
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    marginBottom: '0.25rem'
  },
  required: {
    color: '#ef4444'
  },
  inputWrapper: {
    position: 'relative'

  },
  input: {
    width: '100%',
    padding: '0.5rem',
    borderRadius: '0.5rem',
    border: '1px solid #d1d5db',
    transition: 'all 150ms ease',
    outline: 'none',
    cursor: 'pointer !important', // removes default blue outline

  },
  inputWithIcon: {
    padding: '0.5rem',
    width: '100%',
  },
  icon: {
    position: 'absolute',
    left: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#9ca3af',
    pointerEvents: 'none'
  },
  gridContainer: {
    display: 'flex',

    gap: '1rem',
    justifyContent: 'end'
  },
  textarea: {
    width: '100%',
    padding: '0.5rem',
    borderRadius: '0.5rem',
    border: '1px solid #d1d5db',
    transition: 'all 150ms ease',
    resize: 'none',
    minHeight: '6rem'
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '0.75rem',
    paddingTop: '1rem',
    borderTop: '1px solid #e5e7eb'
  },
  cancelButton: {
    padding: '0.5rem 1rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.5rem',
    transition: 'background-color 150ms ease',
    cursor: 'pointer'
  },
  submitButton: {
    padding: '0.5rem 1.5rem',
    backgroundColor: '#2563eb',
    color: 'white',
    borderRadius: '0.5rem',
    transition: 'background-color 150ms ease',
    cursor: 'pointer'
  },
  taskTable: {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '1rem'
  },
  tableHeader: {
    textAlign: 'left',
    padding: '0.75rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#374151',
    borderBottom: '1px solid #e5e7eb'
  },
  tableCell: {
    padding: '0.2rem'
  },
  addTaskButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    padding: '0.5rem',
    color: '#2563eb',
    backgroundColor: '#eff6ff',
    border: 'none',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    cursor: 'pointer',
    marginTop: '0.5rem'
  },
  taskInput: {
    width: '100%',
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '0.375rem',
    fontSize: '0.875rem',
    outline: 'none',

  },
  removeTaskButton: {
    padding: '0.25rem',
    color: '#ef4444',
    backgroundColor: 'transparent',
    border: 'none',
    borderRadius: '0.25rem',
    cursor: 'pointer'
  }
};

const TimesheetForm = ({ onClose, onSubmit }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    workDate: new Date().toISOString().split('T')[0],
    hoursWorked: '0',

    tasks: [{ taskTitle: '', hours: 0, minutes: 0 }]
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    setValidationError('');

    // Restrict submitting timesheet FOR Sunday (work date cannot be Sunday)
    const workDate = new Date(formData.workDate);
    if (workDate.getDay() === 0) { 
      setValidationError('Timesheets cannot be submitted for Sundays. Please select a weekday (Monday-Saturday).');
      setIsSubmitting(false);
      return;
    }

    // Validate that all tasks have time values
    const hasEmptyTime = formData.tasks.some(task => 
      (task.hours || 0) === 0 && (task.minutes || 0) === 0
    );

    if (hasEmptyTime) {
      setValidationError('Please enter time spent for all tasks. Each task must have a duration greater than 0.');
      setIsSubmitting(false);
      return;
    }

    // Validate that total hours is greater than 0
    if (parseFloat(formData.hoursWorked) <= 0) {
      setValidationError('Total working hours must be greater than 0.');
      setIsSubmitting(false);
      return;
    }

    try {
      // Format tasks with readable time display (e.g., "2h 30min" or "45min")
      const formattedTasks = formData.tasks.map(task => {
        const h = task.hours || 0;
        const m = task.minutes || 0;
        let timeDisplay = '';
        if (h > 0 && m > 0) {
          timeDisplay = `${h}h ${m}min`;
        } else if (h > 0) {
          timeDisplay = `${h}h`;
        } else {
          timeDisplay = `${m}min`;
        }
        return {
          taskTitle: task.taskTitle,
          description: task.description || '',
          hours: h,
          minutes: m,
          timeSpent: timeDisplay
        };
      });

      // Create timesheet data for Supabase (matching updated schema)
      const timesheetData = {
        userId: user?.id,
        employee_id: user?.employee_id || user?.id, // Use employee_id if available, fallback to user.id
        workDate: formData.workDate,
        hoursWorked: parseFloat(formData.hoursWorked),
        tasks: formattedTasks,
        note: '', // Add note field as per schema
        status: 'pending',
        user: user // Pass user data for employee lookup
      };

      // Save to Supabase
      const savedTimesheet = await timesheetApi.createTimesheet(timesheetData);

      // Format the date for display
      const date = new Date(formData.workDate);
      const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric'
      });

      // Create the display object for the UI
      const displayTimesheet = {
        id: savedTimesheet.id,
        date: formattedDate,
        hours: `${formData.hoursWorked} hours`,
        hoursWorked: formData.hoursWorked,
        tasks: formData.tasks,
        status: 'pending'
      };

      onSubmit(displayTimesheet);
      onClose();
    } catch (error) {
      console.error('Error saving timesheet:', error);
      // You might want to show an error message to the user
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Handle task field changes - store hours and minutes directly
  const handleTaskChange = (index, field, value) => {
    setFormData(prev => {
      const newTasks = [...prev.tasks];
      const task = { ...newTasks[index] };

      if (field === 'hours') {
        task.hours = parseInt(value) || 0;
      } else if (field === 'minutes') {
        task.minutes = parseInt(value) || 0;
      } else {
        task[field] = value;
      }

      newTasks[index] = task;

      // Recalculate total hours from all tasks
      const totalMinutes = newTasks.reduce((sum, t) => {
        return sum + ((t.hours || 0) * 60) + (t.minutes || 0);
      }, 0);
      const totalHours = totalMinutes / 60;

      return {
        ...prev,
        tasks: newTasks,
        hoursWorked: totalHours.toString(),
      };
    });
  };

 

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

 

  const addTask = () => {
    setFormData(prev => ({
      ...prev,
      tasks: [...prev.tasks, { taskTitle: '', hours: 0, minutes: 0 }]
    }));
  };

  const removeTask = (index) => {
    setFormData(prev => {
      const newTasks = prev.tasks.filter((_, i) => i !== index);
      
      // Recalculate total hours after removing task
      const totalMinutes = newTasks.reduce((sum, task) => {
        return sum + ((task.hours || 0) * 60) + (task.minutes || 0);
      }, 0);
      const totalHours = totalMinutes / 60;

      return {
        ...prev,
        tasks: newTasks,
        hoursWorked: totalHours.toString()
      };
    });
  };


  
  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <Clock style={styles.headerIcon} />
          <h2 className='bodyMediumText2' style={styles.title}>Log Working Hours</h2>
        </div>
        <button
          onClick={onClose}
          style={{
            ...styles.closeButton,
            ':hover': { backgroundColor: '#f3f4f6' }
          }}
        >
          <X style={{ width: '1.25rem', height: '1.25rem', color: '#6b7280' }} />
        </button>
      </div>

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.formGroup}>
          {/* Work Date */}
          <div>
            <label className='bodyMediumText4' style={styles.label}>
              Work Date <span style={styles.required}>*</span>
            </label>
            <div style={styles.inputWrapper}>
              <input
                className='bodyMediumText4'
                type="date"
                name="workDate"
                required
                value={formData.workDate}
                onChange={handleChange}
                min={(() => {
                const pastTwoDays = new Date();
                pastTwoDays.setDate(pastTwoDays.getDate() - 2);
                return pastTwoDays.toISOString().split('T')[0];
                })()}
                max={new Date().toISOString().split('T')[0]} // 👈 disables future dates in calendar
                onFocus={(e) => e.target.showPicker && e.target.showPicker()} // 👈 keeps picker auto-open
                style={{ ...styles.input, ...styles.inputWithIcon }}
              />

            </div>
          </div>



         {/* Tasks Table */}
         <div> 
           <label className='bodyMediumText4' style={styles.label}>
            Tasks <span style={styles.required}>*</span>
         </label>
       <table style={styles.taskTable}>
       <thead>
      <tr>
        <th className='bodyMediumText4' style={styles.tableHeader}>Task Title</th>
        <th className='bodyMediumText4' style={styles.tableHeader}>Description</th> {/* New column */}
        <th className='bodyMediumText4' style={styles.tableHeader}>Duration</th>
        <th className='bodyMediumText4' style={styles.tableHeader}></th>
      </tr>
    </thead>
    <tbody>
      {formData.tasks.map((task, index) => (
        <tr key={index}>
          <td style={styles.tableCell}>
            <input
              className='bodyMediumText4'
              type="text"
              value={task.taskTitle}
              onChange={(e) => handleTaskChange(index, 'taskTitle', e.target.value)}
              placeholder="Enter task title"
              style={styles.taskInput}
              required
            />
          </td>

          {/* New Description Column */}
          <td style={styles.tableCell}>
            <input
              className='bodyMediumText4'
              type="text"
              value={task.description || ''}
              onChange={(e) => handleTaskChange(index, 'description', e.target.value)}
              placeholder="Enter task description"
              style={styles.taskInput}
            />
          </td>

          <td style={styles.tableCell}>
            <div style={{ position: 'relative', width: '100%' }}>
              <input
      type="number"
      className="bodyMediumText4"
      name="hours"
      value={task.hours || 0}
      onChange={(e) => handleTaskChange(index, 'hours', e.target.value)}
      min="0"
      max="23"
      style={{
        width: '50px',
        backgroundColor: 'transparent',
        border: '1px solid #d1d5db',
        textAlign: 'center',
        color: '#374151',
        borderRadius: '6px',
      }}
    />
    <span className="bodyMediumText4" style={{ color: '#6b7280' }}>hr :</span>

    {/* Minutes */}
    <input
      type="number"
      className="bodyMediumText4"
      name="minutes"
      value={task.minutes || 0}
      onChange={(e) => handleTaskChange(index, 'minutes', e.target.value)}
      min="0"
      max="59"
      style={{
        width: '50px',
        backgroundColor: 'transparent',
        border: '1px solid #d1d5db',
        textAlign: 'center',
        color: '#374151',
        borderRadius: '6px',
      }}
    />
    <span className="bodyMediumText4" style={{ color: '#6b7280' }}>min</span>
  </div>
          </td>

          <td style={styles.tableCell}>
            {formData.tasks.length > 1 && (
              <button
                type="button"
                onClick={() => removeTask(index)}
                style={styles.removeTaskButton}
              >
                <X size={16} />
              </button>
            )}
          </td>
        </tr>
      ))}
    </tbody>
  </table>

  <button className='bodyMediumText4'
    type="button"
    onClick={addTask}
    style={styles.addTaskButton}
  >
    <Plus size={16} /> Add Task
  </button>
</div>
<div style={styles.gridContainer}>
  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
    <label className="bodyMediumText3" style={styles.label}>
      Total Hours <span style={styles.required}>*</span>
    </label>

    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        backgroundColor: '#f3f4f6',
        borderRadius: '0.5rem',
        padding: '0.5rem 0.75rem',
        width: 'fit-content',
      }}
    >
  <span className="bodyMediumText4" style={{ color: '#374151' }}>
  {(() => {
    const totalMinutes = formData.tasks.reduce((sum, task) => {
      return sum + ((task.hours || 0) * 60) + (task.minutes || 0);
    }, 0);

    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `${hours} hrs ${minutes} min`;
  })()}
</span>
 </div>
  </div>
</div>


        {/* Validation Error Display */}
        {validationError && (
          <div style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#ef4444',
            padding: '0.75rem',
            borderRadius: '0.5rem',
            fontSize: '0.875rem',
            marginTop: '1rem'
          }}>
            {validationError}
          </div>
        )}

        {/* Form Actions */}
        <div style={styles.actions}>
          <button  className='bodyMediumText3'
            type="button"
            onClick={onClose}
            style={{
              ...styles.cancelButton,
              ':hover': { backgroundColor: '#f9fafb' }
            }}
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button  className='bodyMediumText3'
            type="submit"
            style={{
              ...styles.submitButton,
              ':hover': { backgroundColor: '#1d4ed8' },
              opacity: (isSubmitting || parseFloat(formData.hoursWorked) <= 0) ? 0.6 : 1
            }}
            disabled={isSubmitting || parseFloat(formData.hoursWorked) <= 0}
          >
            {isSubmitting ? 'Saving...' : 'Submit for Approval'}
          </button>
        </div>
        </div>
      </form>
    </div>
  );
};

export default TimesheetForm;