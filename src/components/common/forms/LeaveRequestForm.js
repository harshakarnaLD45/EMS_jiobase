import React, { useState, useEffect } from 'react';
import { X, Calendar, FileText, CheckCircle } from 'lucide-react'; // Import CheckCircle for success icon
import { useLeave } from '../../../contexts/LeaveContext';
import { useAuth } from '../../../contexts/AuthContext';
import { Calendar as CalendarIcon } from 'lucide-react';
import CustomCalendar from '../calender/CustomCalendar';
import { leaveApi } from '../../../utils/supabase';

// Helper component for the Success Modal
const SuccessModal = ({ message, onClose }) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1001, // Higher than the form modal
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '0.75rem',
        padding: '2rem',
        maxWidth: '350px',
        width: '90%',
        textAlign: 'center',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
      }}>
        <CheckCircle style={{ width: '3rem', height: '3rem', color: '#10b981', margin: '0 auto 1rem' }} />
        <h3 className="bodyMediumText2" style={{ color: '#10b981', marginBottom: '0.5rem' }}>Success!</h3>
        <p className="bodyRegularText4" style={{ color: '#4b5563', marginBottom: '1.5rem' }}>{message}</p>
        <button
          onClick={onClose}
          style={{
            padding: '0.5rem 1.5rem',
            backgroundColor: '#10b981',
            color: 'white',
            borderRadius: '0.5rem',
            border: 'none',
            cursor: 'pointer',
            transition: 'background-color 150ms ease'
          }}
        >
          Close
        </button>
      </div>
    </div>
  );
};

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
    cursor: 'pointer',
    border: 'none',
    backgroundColor: 'transparent'
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
    gap: '0.5rem'
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
    position: 'relative'
  },
  select: {
    width: '100%',
    padding: '0.5rem',
    borderRadius: '0.5rem',
    border: '1px solid #d1d5db',
    transition: 'all 150ms ease',
    appearance: 'none',
    outline: 'none',
    backgroundColor: 'white'
  },
  input: {
    width: '100%',
    padding: '0.5rem',
    borderRadius: '0.5rem',
    border: '1px solid #d1d5db',
    transition: 'all 150ms ease',
    outline: 'none'
  },
  textarea: {
    width: '100%',
    padding: '0.5rem',
    borderRadius: '0.5rem',
    border: '1px solid #d1d5db',
    transition: 'all 150ms ease',
    resize: 'vertical',
    minHeight: '6rem',
    maxHeight: '15rem',
    outline: 'none'
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
    cursor: 'pointer',
    backgroundColor: 'white'
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
    gap: '0.5rem',
    border: 'none'
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
  const { leaveBalance, loading, error, requestLeave } = useLeave();

  const [formData, setFormData] = useState({
    leaveType: '',
    selectedDate: '',
    startDate: '',
    endDate: '',
    subject: '',
    reason: ''
  });

  const [documentFile, setDocumentFile] = useState(null);
  const [fileError, setFileError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [calendarVisible, setCalendarVisible] = useState(false);
  const [dateError, setDateError] = useState('');
  // 🆕 NEW STATE: For handling the success message pop-up
  const [successMessage, setSuccessMessage] = useState(null); 
  const [activeLeaveCheck, setActiveLeaveCheck] = useState({ 
    isChecking: false, 
    hasActiveLeave: false, 
    activeLeave: null,
    checked: false
  });

  // Get leave types from leaveBalance with correct property names
  const leaveTypes = leaveBalance ? [
    { 
      type: 'sick', 
      label: 'Sick Leave', 
      remaining: leaveBalance.remaining_sick_leaves || 0 
    },
    { 
      type: 'casual', 
      label: 'Casual Leave', 
      remaining: leaveBalance.remaining_casual_leaves || 0 
    }
  ] : [
    { type: 'sick', label: 'Sick Leave', remaining: 0 },
    { type: 'casual', label: 'Casual Leave', remaining: 0 }
  ];

  // Check for active leave requests
  useEffect(() => {
    const checkActiveLeave = async () => {
      if (!user) return;
      
      setActiveLeaveCheck(prev => ({ ...prev, isChecking: true }));
      
      try {
        const activeResult = await leaveApi.checkActiveLeaveRequest(
          user?.employee_id || user?.id, 
          user?.id
        );
        
        let overlapResult = { hasOverlap: false, overlappingLeaves: [] };
        if (formData.startDate && formData.endDate) {
          try {
            overlapResult = await leaveApi.checkOverlappingApprovedLeave(
              user?.employee_id || user?.id,
              user?.id,
              formData.startDate,
              formData.endDate
            );
          } catch (overlapError) {
            console.warn('⚠️ Could not check for overlapping leaves:', overlapError);
          }
        }
        
        const hasConflict = activeResult.hasActiveLeave || overlapResult.hasOverlap;
        const conflictingLeave = activeResult.activeLeave || (overlapResult.overlappingLeaves && overlapResult.overlappingLeaves[0]);
        
        setActiveLeaveCheck({
          isChecking: false,
          hasActiveLeave: hasConflict,
          activeLeave: conflictingLeave,
          checked: true
        });
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
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setFileError('');
    
    if (!file) {
      setDocumentFile(null);
      return;
    }

    const maxSize = 1 * 1024 * 1024; // 1MB
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png'
    ];

    if (file.size > maxSize) {
      setFileError('File size must be less than 1MB.');
      e.target.value = '';
      setDocumentFile(null);
      return;
    }

    if (!allowedTypes.includes(file.type)) {
      setFileError('Please upload a PDF, DOC, DOCX, JPG, or PNG file');
      e.target.value = '';
      setDocumentFile(null);
      return;
    }

    setDocumentFile(file);
  };

  const calculateLeaveDays = () => {
    if (!formData.startDate || !formData.endDate) return 0;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    return Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
  };

  const isDocumentationRequired = () => {
    return formData.leaveType === 'sick' && calculateLeaveDays() > 1;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.startDate || !formData.endDate) {
      setDateError('Please select a leave date');
      return;
    }
    
    // Check required documentation before submission
    if (isDocumentationRequired() && !documentFile) {
        setFileError('Documentation is required for sick leave requests longer than one day.');
        return;
    }

    setIsSubmitting(true);
    setDateError('');
    setFileError('');

    try {
      // Check active leave
      if (activeLeaveCheck.hasActiveLeave) {
        // ❌ Replaced alert() with a visual notice/error handler (using a standard alert for now for immediate error feedback, but keeping the visual success in place)
        alert('You already have an approved or pending leave request that conflicts with this date range.');
        setIsSubmitting(false);
        return;
      }

      // Upload document if provided
      let documentUrl = null;
      if (documentFile) {
        const { data, error: uploadError } = await leaveApi.uploadDocument(documentFile);
        if (uploadError) throw uploadError;
        documentUrl = data.path;
      }

      // Prepare leave request
      const leaveRequest = {
        user_id: user?.id,
        employee_id: user?.employee_id || leaveBalance?.employee_id,
        leave_type: formData.leaveType,
        start_date: formData.startDate,
        end_date: formData.endDate,
        subject: formData.subject,
        reason: formData.reason,
        status: 'pending',
        document_url: documentUrl || null,
        has_documentation: !!documentUrl,
        document_name: documentFile?.name || null
      };

      console.log('📤 Submitting leave request:', leaveRequest);

      // Submit via context
      await requestLeave(leaveRequest);
      
      // ✅ SUCCESS POP-UP IMPLEMENTATION
      setSuccessMessage('Your leave request has been submitted for approval.');
      // NOTE: We do NOT call onClose() here. We wait for the user to close the SuccessModal.

    } catch (err) {
      console.error('Error submitting leave request:', err);
      // Fallback for submission error
      alert(err.message || 'Failed to submit leave request'); 
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      {/* 1. Main Form Modal */}
      <div style={styles.container}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerTitle}>
            <Calendar style={styles.headerIcon} />
            <h2 className="bodyRegularText3" style={styles.title}>Request Time Off</h2>
          </div>
          <button onClick={onClose} style={styles.closeButton} disabled={isSubmitting}>
            <X style={{ width: '1.25rem', height: '1.25rem', color: '#6b7280' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Leave Type */}
          <div style={styles.formGroup}>
            <label className="bodyMediumText5" style={styles.label}>
              Leave Type <span style={styles.required}>*</span>
            </label>
            <div style={styles.selectWrapper}>
              <select
                className="bodyMediumText5"
                name="leaveType"
                value={formData.leaveType}
                onChange={handleChange}
                required
                style={styles.select}
                disabled={loading || isSubmitting}
              >
                <option value="">{loading ? 'Loading leave types...' : 'Select leave type'}</option>
                {leaveTypes.map((leave, index) => (
                  <option key={index} value={leave.type}>
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

          {/* Date Selection */}
          <div style={styles.formGroup}>
            <label className="bodyMediumText5" style={styles.label}>
              Select Date <span style={styles.required}>*</span>
            </label>
            <div
              onClick={() => {
                if (!isSubmitting) { // Prevent calendar interaction while submitting
                    setCalendarVisible(!calendarVisible);
                    setDateError('');
                }
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                border: dateError ? '1px solid #ef4444' : '1px solid #d1d5db',
                borderRadius: '0.5rem',
                padding: '0.5rem 0.75rem',
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                transition: 'all 150ms ease',
                backgroundColor: calendarVisible ? '#f0f9ff' : 'white'
              }}
            >
              <span className="bodyMediumText5" style={{ 
                color: formData.selectedDate ? '#374151' : '#9ca3af' 
              }}>
                {formData.selectedDate || 'Pick a date'}
              </span>
              <CalendarIcon style={{ width: '1.25rem', height: '1.25rem', color: '#3b82f6' }} />
            </div>

            {dateError && (
              <div style={{
                marginTop: '0.5rem',
                padding: '0.75rem',
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '0.5rem',
                color: '#dc2626',
                fontSize: '0.875rem'
              }}>
                {dateError}
              </div>
            )}

            {calendarVisible && (
              <div style={{ 
                marginTop: '0.5rem', 
                position: 'relative', 
                zIndex: 50,
                backgroundColor: 'white',
                borderRadius: '0.5rem',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
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
            <label className="bodyMediumText5" style={styles.label}>
              Subject <span style={styles.required}>*</span>
            </label>
            <input
              className="bodyMediumText5"
              type="text"
              name="subject"
              required
              value={formData.subject}
              onChange={handleChange}
              placeholder="Enter subject for your leave request..."
              style={styles.input}
              disabled={isSubmitting}
            />
          </div>

          {/* Reason */}
          <div style={styles.formGroup}>
            <label className="bodyMediumText5" style={styles.label}>
              Reason for Leave <span style={styles.required}>*</span>
            </label>
            <textarea
              className="bodyMediumText5"
              name="reason"
              required
              value={formData.reason}
              onChange={handleChange}
              placeholder="Please provide a detailed reason for your leave request..."
              style={styles.textarea}
              disabled={isSubmitting}
            />
          </div>

          {/* Document Upload for Sick Leave */}
          {isDocumentationRequired() && (
            <div style={styles.formGroup}>
              <label className="bodyMediumText5" style={styles.label}>
                Supporting Documentation <span style={styles.required}>*</span>
              </label>
              <div style={styles.fileInputWrapper}>
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  style={styles.fileInput}
                  required={isDocumentationRequired() && !documentFile} // Conditionally required
                  disabled={isSubmitting}
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
                    <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>
                      {(documentFile.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  </div>
                )}
              </div>

              {fileError && (
                <div style={{
                  marginTop: '0.5rem',
                  padding: '0.75rem',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  borderRadius: '0.5rem',
                  color: '#dc2626',
                  fontSize: '0.875rem'
                }}>
                  {fileError}
                </div>
              )}

              <div style={{ ...styles.fileInfo, marginTop: '0.5rem' }}>
                Required for sick leave requests of more than one consecutive day
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div style={styles.actions}>
            <button
              className="bodyMediumText5"
              type="button"
              onClick={onClose}
              style={styles.cancelButton}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              className="bodyMediumText5"
              type="submit"
              style={{
                ...styles.submitButton,
                backgroundColor: (activeLeaveCheck.hasActiveLeave || isSubmitting || loading) ? '#9ca3af' : '#3b82f6',
                cursor: (activeLeaveCheck.hasActiveLeave || isSubmitting || loading) ? 'not-allowed' : 'pointer'
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
      
      {/* 2. Success Modal Overlay */}
      {successMessage && (
        <SuccessModal
          message={successMessage}
          onClose={() => {
            setSuccessMessage(null);
            onClose(); // Close the main form after closing the success message
          }}
        />
      )}
    </>
  );
};

export default LeaveRequestForm;