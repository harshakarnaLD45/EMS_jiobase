import React, { useState } from 'react';
import { X, Calendar, FileText } from 'lucide-react';
import { useLeave } from '../../../contexts/LeaveContext';
import { useAuth } from '../../../contexts/AuthContext';
import { Input, InputAdornment } from '@mui/material';
import { leaveApi } from '../../../utils/supabase';
import { Calendar as CalendarIcon } from 'lucide-react';
import CustomCalendar from '../calender/CustomCalendar'


const styles = {
  container: {
    backgroundColor: 'white',
    borderRadius: '0.5rem',
    boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    maxWidth: '42rem',
    margin: '0 auto'
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
    color: '#ef4444',
  },
  selectWrapper: {
    position: 'relative',
    outline: 'none !important',
  },
  select: {
    width: '100%',
    padding: '0.5rem',
    borderRadius: '0.5rem',
    border: '1px solid #d1d5db',
    transition: 'all 150ms ease',
    appearance: 'none',
    outline: 'none !important',
  },
  dateGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '1rem'
  },
  inputWrapper: {
    position: 'relative'
  },
  icon: {
    position: 'absolute',
    left: '0.75rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#9ca3af',
    pointerEvents: 'none'
  },
  input: {
    width: '100%',
    paddingLeft: '2.5rem',
    padding: '0.5rem',
    borderRadius: '0.5rem',
    border: '1px solid #d1d5db',
    transition: 'all 150ms ease',
    outline: 'none !important',
  },
  textarea: {
    width: '100%',
    padding: '0.5rem',
    borderRadius: '0.5rem',
    border: '1px solid #d1d5db',
    transition: 'all 150ms ease',
    resize: 'auto',
    minHeight: '6rem',
    maxHeight: '15rem',
   outline: 'none ',


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
    backgroundColor: '#3b82f6',
    color: 'white',
    borderRadius: '0.5rem',
    transition: 'background-color 150ms ease',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  fileInputWrapper: {
    position: 'relative',
    border: '1px dashed #d1d5db',
    borderRadius: '0.5rem',
    padding: '1rem',
    textAlign: 'center',
    backgroundColor: '#f9fafb',
    cursor: 'pointer',
    transition: 'all 150ms ease'
  },
  fileInput: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
    opacity: 0,
    cursor: 'pointer'
  },
  fileInputLabel: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.5rem',
    color: '#6b7280',
    fontSize: '0.875rem'
  },
  fileName: {
    marginTop: '0.5rem',
    fontSize: '0.875rem',
    color: '#374151',
    fontWeight: '500'
  },
  fileInfo: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    marginTop: '0.25rem'
  }
};

const LeaveRequestForm = ({ onClose }) => {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
  leaveType: '',       // Leave type dropdown
  selectedDate: '',    // Displayed in input field
  startDate: '',       // Start date for submission
  endDate: '',         // End date for submission
  subject: '',         // Subject input
  reason: ''           // Reason textarea
});

  const [documentFile, setDocumentFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [activeLeaveCheck, setActiveLeaveCheck] = useState({ 
    isChecking: false, 
    hasActiveLeave: false, 
    activeLeave: null,
    checked: false
  });
  const { leaveBalance, loading, error, requestLeave } = useLeave();
  const [dateError, setDateError] = useState('');




  // Get leave types with actual balance from Supabase
  const leaveTypes = leaveBalance ? [
    { type: 'sick', label: 'Sick Leave', remaining: leaveBalance.sick_leave || 0 },
    { type: 'casual', label: 'Casual Leave', remaining: leaveBalance.casual_leave || 0 },
    // { type: 'annual', label: 'Annual Leave', remaining: leaveBalance.annual_leave || 0 }
  ] : [
    { type: 'sick', label: 'Sick Leave', remaining: 0 },
    { type: 'casual', label: 'Casual Leave', remaining: 0 },
    // { type: 'annual', label: 'Annual Leave', remaining: 0 }
  ];

  //console.log('🏖️ Leave balance in form:', leaveBalance);
  //console.log('🏖️ Leave types:', leaveTypes);

  // Check for active leave requests on component mount and when date changes
  React.useEffect(() => {
    const checkActiveLeave = async () => {
      if (!user) return;
      
      setActiveLeaveCheck(prev => ({ ...prev, isChecking: true }));
      
      try {
        // Check for currently active leaves (today's date)
        const activeResult = await leaveApi.checkActiveLeaveRequest(
          user?.employee_id || user?.id, 
          user?.id
        );
        
        // If we have form dates, also check for overlaps with requested dates
        let overlapResult = { hasOverlap: false, overlappingLeaves: [] };
        if (formData.startDate && formData.endDate) {
          try {
            overlapResult = await leaveApi.checkOverlappingApprovedLeave(
              user?.employee_id || user?.id,
              user?.id,
              formData.startDate,
              formData.endDate
            );
            //console.log('🔍 Overlap check result for dates:', formData.startDate, 'to', formData.endDate, overlapResult);
          } catch (overlapError) {
            console.warn('⚠️ Could not check for overlapping leaves:', overlapError);
          }
        }
        
        // Set state based on either active leave OR overlapping approved leaves
        const hasConflict = activeResult.hasActiveLeave || overlapResult.hasOverlap;
        const conflictingLeave = activeResult.activeLeave || (overlapResult.overlappingLeaves && overlapResult.overlappingLeaves[0]);
        
        setActiveLeaveCheck({
          isChecking: false,
          hasActiveLeave: hasConflict,
          activeLeave: conflictingLeave,
          checked: true
        });
        
        // console.log('🔍 Combined leave check result:', {
        //   activeToday: activeResult.hasActiveLeave,
        //   overlapsRequested: overlapResult.hasOverlap,
        //   finalConflict: hasConflict,
        //   conflictingLeave
        // });
      } catch (error) {
        console.error('❌ Error checking active leave:', error);
        setActiveLeaveCheck({
          isChecking: false,
          hasActiveLeave: false,
          activeLeave: null,
          checked: true
        });
      }
    };

    checkActiveLeave();
  }, [user, formData.startDate, formData.endDate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    
    // Clear previous errors
    setFileError('');
    
    if (file) {
      // Validate file size (1MB limit)
      const maxSize = 1 * 1024 * 1024; // 1MB in bytes
      if (file.size > maxSize) {
        setFileError('File size must be less than 1MB. Please compress your file or choose a smaller file.');
        e.target.value = ''; // Clear the input
        setDocumentFile(null); // Clear the selected file
        return;
      }
      
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/jpg',
        'image/png'
      ];
      
      if (!allowedTypes.includes(file.type)) {
        setFileError('Please upload a PDF, DOC, DOCX, JPG, or PNG file');
        e.target.value = ''; // Clear the input
        setDocumentFile(null); // Clear the selected file
        return;
      }
      
      // console.log('📎 File selected:', {
      //   name: file.name,
      //   size: file.size,
      //   type: file.type
      // });
    }
    
    setDocumentFile(file);
  };

  // Calculate number of days between start and end date
  const calculateLeaveDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    return diffDays;
  };

  // Check if documentation is required
  const isDocumentationRequired = () => {
    return formData.leaveType === 'sick' && calculateLeaveDays() > 1;
  };

 const handleSubmit = async (e) => {
  e.preventDefault();
  
  // Validate date selection
  if (!formData.startDate || !formData.endDate) {
    setDateError("Please select a leave date");
    setIsSubmitting(false);
    return;
  }
  
  setIsSubmitting(true);
  setDateError(''); // Clear any previous errors

  try {
    // 1️⃣ Check active leave and overlaps
    if (activeLeaveCheck.hasActiveLeave) {
      alert('You already have an active approved leave request.');
      setIsSubmitting(false);
      return;
    }

    // 2️⃣ Upload file if required
    let documentFileUrl = null;
    if (documentFile) {
      const { data, error: uploadError } = await leaveApi.uploadDocument(documentFile);
      if (uploadError) throw uploadError;
      documentFileUrl = data.path; // or data.Key depending on your storage
    }

    // 3️⃣ Prepare leave request payload
  const leaveRequest = {
  user_id: user?.id ?? user?.user?.id ?? null,
  employee_id: user?.employee_id ?? user?.id ?? user?.user?.id ?? null,
  leave_type: formData.leaveType,
  start_date: formData.startDate,
  end_date: formData.endDate,
  subject: formData.subject,
  reason: formData.reason,
  status: 'pending',
  document_url: documentFileUrl || null
};

// 🧠 Debug logs (important)
console.log("🧾 Leave Request Payload:", leaveRequest);
console.log("👤 Current user:", user);

// Debug log
console.log("📤 Submitting leave request:", leaveRequest);
    // 4️⃣ Insert as single row using array + .single() for Supabase
    const { data, error } = await leaveApi.requestLeave([leaveRequest], { single: true });
    // OR, if inside leaveApi.requestLeave you call Supabase directly:
    // const { data, error } = await supabase.from('leaves').insert([leaveRequest]).select().single();

    if (error) throw error;

    console.log('Leave request submitted successfully:', data);
    onClose();
  } catch (err) {
    console.error('Error submitting leave request:', err);
    alert(`Error submitting leave request: ${err.message}`);
  } finally {
    setIsSubmitting(false);
  }
};



  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div style={styles.headerTitle}>
          <Calendar style={styles.headerIcon} />
          <h2 className='bodyRegularText3' style={styles.title}>Request Time Off</h2>
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
        {/* Loading/Error State */}
        {loading && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#f0f9ff',
            border: '1px solid #bfdbfe',
            borderRadius: '0.5rem',
            color: '#1e40af',
            textAlign: 'center'
          }}>
            Loading leave balance...
          </div>
        )}

        {error && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '0.5rem',
            color: '#dc2626',
            textAlign: 'center'
          }}>
            Error loading leave balance: {error}
          </div>
        )}

        {/* Active Leave Check Status */}
        {/* {activeLeaveCheck.isChecking && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#f0f9ff',
            border: '1px solid #bfdbfe',
            borderRadius: '0.5rem',
            color: '#1e40af',
            textAlign: 'center'
          }}>
            Checking for active leave requests...
          </div>
        )} */}

        {/* {activeLeaveCheck.checked && activeLeaveCheck.hasActiveLeave && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#fef2f2',
            border: '1px solid #ef4444',
            borderRadius: '0.5rem',
            color: '#dc2626',
            textAlign: 'center'
          }}>
            <strong>🚫 Leave Request Conflict Detected</strong>
            <br />
            {activeLeaveCheck.activeLeave ? (
              <>
                You have an approved leave request from{' '}
                <strong>{new Date(activeLeaveCheck.activeLeave.start_date).toLocaleDateString()} to {new Date(activeLeaveCheck.activeLeave.end_date).toLocaleDateString()}</strong>
                {' '}({activeLeaveCheck.activeLeave.leave_type} leave).
                <br />
                {formData.startDate && formData.endDate ? 
                  'This conflicts with your requested dates. Please choose different dates or cancel the existing approved leave.' :
                  'Please wait until your current leave ends before submitting a new request.'
                }
              </>
            ) : (
              'You have an existing approved leave request that conflicts with your requested dates.'
            )}
          </div>
        )} */}

        {/* {activeLeaveCheck.checked && !activeLeaveCheck.hasActiveLeave && formData.startDate && formData.endDate && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#d1fae5',
            border: '1px solid #34d399',
            borderRadius: '0.5rem',
            color: '#065f46',
            textAlign: 'center'
          }}>
            ✅ No conflicts found for {new Date(formData.startDate).toLocaleDateString()} to {new Date(formData.endDate).toLocaleDateString()}. You can submit this leave request.
          </div>
        )} */}

        {/* {activeLeaveCheck.checked && !activeLeaveCheck.hasActiveLeave && (!formData.startDate || !formData.endDate) && (
          <div style={{
            padding: '1rem',
            backgroundColor: '#f0f9ff',
            border: '1px solid #60a5fa',
            borderRadius: '0.5rem',
            color: '#1e40af',
            textAlign: 'center'
          }}>
            ℹ️ Please select your leave dates to check for conflicts with existing approved leaves.
          </div>
        )} */}

        {/* Leave Type */}
        <div style={styles.formGroup}>
          <label className='bodyMediumText5' style={styles.label}>
            Leave Type <span style={styles.required}>*</span>
          </label>
          <div style={styles.selectWrapper}>
            <select className='bodyMediumText5'
              name="leaveType"
              value={formData.leaveType}
              onChange={handleChange}
              required
              style={styles.select}
              disabled={loading}
            >
              <option className='bodyMediumText5' value="">{loading ? 'Loading leave types...' : 'Select leave type'}</option>
              {leaveTypes.map((leave, index) => (
                <option className='bodyMediumText5' key={index} value={leave.type}>
                  {leave.label} ({leave.remaining} days left)
                </option>
              ))}
            </select>
            <div style={{
              position: 'absolute',
              right: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none'
            }}>
              <svg style={{ width: '1.25rem', height: '1.25rem', color: '#9ca3af' }} viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        </div>

        {/* Date Range */}
       
   <div style={styles.formGroup}>
  <label className="bodyMediumText5" style={styles.label}>
    Select Date <span style={styles.required}>*</span>
  </label>
  <div
    onClick={() => {
      setCalendarVisible(!calendarVisible);
      setDateError(''); // Clear error when opening calendar
    }}
    style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      border: dateError ? '1px solid #ef4444' : '1px solid #d1d5db',
      borderRadius: '0.5rem',
      padding: '0.5rem 0.75rem',
      cursor: 'pointer',
      transition: 'all 150ms ease',
      backgroundColor: calendarVisible ? '#f0f9ff' : 'white'
    }}
    onMouseEnter={(e) => {
      if (!dateError) {
        e.currentTarget.style.borderColor = '#3b82f6';
      }
    }}
    onMouseLeave={(e) => {
      if (!dateError) {
        e.currentTarget.style.borderColor = '#d1d5db';
      }
    }}
  >
    <span className="bodyMediumText5" style={{ 
      color: formData.selectedDate ? '#374151' : '#9ca3af' 
    }}>
      {formData.selectedDate || 'Pick a date'}
    </span>
    <CalendarIcon style={{ width: '1.25rem', height: '1.25rem', color: '#3b82f6' }} />
  </div>
  
  {/* Inline Date Error Message */}
  {dateError && (
    <div style={{
      marginTop: '0.5rem',
      padding: '0.75rem',
      backgroundColor: '#fef2f2',
      border: '1px solid #fecaca',
      borderRadius: '0.5rem',
      color: '#dc2626',
      fontSize: '0.875rem',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem'
    }}>
      <svg style={{ width: '1rem', height: '1rem', flexShrink: 0 }} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
      <span className="bodyMediumText5">{dateError}</span>
    </div>
  )}
  
  {calendarVisible && (
    <div style={{ 
      marginTop: '0.5rem', 
      position: 'relative', 
      zIndex: 50,
      backgroundColor: 'white',
      borderRadius: '0.5rem',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      padding: '0.5rem'
    }}>
     
<CustomCalendar
  onDateRangeSelect={(range) => {
    if (range.from && range.to) {
      const startDate = range.from.toISOString().split('T')[0];
      const endDate = range.to.toISOString().split('T')[0];
      
      setFormData({
        ...formData,
        startDate: startDate,
        endDate: endDate,
        selectedDate: `${startDate} to ${endDate}`
      });
      
      setCalendarVisible(false);
    }
  }}
  singleDateMode={false}  
  minDate={new Date()}
/>

    </div>
  )}
</div>


        {/* Subject */}
        <div style={styles.formGroup}>
          <label  className='bodyMediumText5' style={styles.label}>
            Subject <span style={styles.required}>*</span>
          </label>
          <input  className='bodyMediumText5'
            type="text"
            name="subject"
            required
            value={formData.subject}
            onChange={handleChange}
            placeholder="Enter subject for your leave request..."
            style={{
              width: '100%',
              padding: '0.5rem',
              borderRadius: '0.5rem',
              border: '1px solid #d1d5db',
              transition: 'all 150ms ease',
              resize: 'none',
              outline: 'none',
              minHeight: '2.5rem', height: '20px !important'
            }}
          />
        </div>
        {/* Reason */}
        <div style={styles.formGroup}>
          <label  className='bodyMediumText5' style={styles.label}>
            Reason for Leave <span style={styles.required}>*</span>
          </label>
          <textarea  className='bodyMediumText5'
            name="reason"
            required
            value={formData.reason}
            onChange={handleChange}
            placeholder="Please provide a detailed reason for your leave request..."
            style={styles.textarea}
          />
        </div>

        {/* Document Upload for Sick Leave */}
        {isDocumentationRequired() && (
          <div style={styles.formGroup}>
            <label className='bodyMediumText5' style={styles.label}>
              Supporting Documentation <span style={styles.required}>*</span>
            </label>
            <div style={styles.fileInputWrapper}>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                style={styles.fileInput}
              />
              <label style={styles.fileInputLabel}>
                <FileText style={{ width: '1.5rem', height: '1.5rem' }} />
                <span>Click to upload medical certificate or doctor's note</span>
                <span style={styles.fileInfo}>PDF, DOC, JPG, PNG up to 1MB</span>
              </label>
              {documentFile && (
                <div style={{
                  ...styles.fileName,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '0.25rem'
                }}>
                  <div style={{ fontWeight: '600', color: '#059669' }}>
                    ✓ {documentFile.name}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: '#6b7280'
                  }}>
                    {(documentFile.size / 1024 / 1024).toFixed(2)} MB • {documentFile.type.split('/')[1].toUpperCase()}
                  </div>
                </div>
              )}
            </div>
            
            {/* Error Message */}
            {fileError && (
              <div style={{
                marginTop: '0.5rem',
                padding: '0.75rem',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '0.5rem',
                color: '#dc2626',
                fontSize: '0.875rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <svg style={{ width: '1rem', height: '1rem', flexShrink: 0 }} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{fileError}</span>
              </div>
            )}
            
            <div style={{...styles.fileInfo, marginTop: '0.5rem'}}>
              Required for sick leave requests of more than one consecutive day
            </div>
          </div>
        )}

        {/* Form Actions */}
        <div style={styles.actions}>
          <button  className='bodyMediumText5'
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
          <button  className='bodyMediumText5'
            type="submit"
            style={{
              ...styles.submitButton,
              backgroundColor: (activeLeaveCheck.hasActiveLeave || isSubmitting || loading) ? '#9ca3af' : '#3b82f6',
              cursor: (activeLeaveCheck.hasActiveLeave || isSubmitting || loading) ? 'not-allowed' : 'pointer',
              ':hover': { backgroundColor: (activeLeaveCheck.hasActiveLeave || isSubmitting || loading) ? '#9ca3af' : '#2563eb' }
            }}
            disabled={isSubmitting || loading || activeLeaveCheck.hasActiveLeave}
          >
            {isSubmitting ? 'Submitting...' : 
             activeLeaveCheck.hasActiveLeave ? 'Cannot Submit - Active Leave Exists' :
             'Submit Leave Request'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default LeaveRequestForm;