import React, { useState } from 'react';
import { useEmployees } from '../../contexts/EmployeeContext';

const AddEmployeeForm = ({ onClose, onSuccess, onError }) => {
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        department: '',
        position: '',
        joinDate: '',
        password: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { addEmployee } = useEmployees();

    const departments = ['Engineering', 'Marketing', 'HR', 'Sales', 'Finance', 'Operations'];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const newEmployee = {
                name: formData.fullName,
                email: formData.email,
                phone: formData.phone,
                department: formData.department,
                position: formData.position,
                status: 'Active',
                join_date: formData.joinDate,
                password: formData.password
            };

            await addEmployee(newEmployee);
            onClose();
            
            if (onSuccess) {
                onSuccess(`Employee ${formData.fullName} has been added successfully!`);
            }

            // Reset form
            setFormData({
                fullName: '',
                email: '',
                phone: '',
                department: '',
                position: '',
                joinDate: '',
                password: ''
            });
        } catch (error) {
            console.error('Error adding employee:', error);
            if (onError) {
                onError(`Failed to add employee: ${error.message}`);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleInputChange = (field, value) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const generatePassword = () => {
        // Generate a random 8-character password with letters and numbers
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let password = '';
        for (let i = 0; i < 10; i++) {
            password += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        handleInputChange('password', password);
    };

    return (
        <form onSubmit={handleSubmit} className="add-employee-form" style={{padding:"20px, "}}>
            <h2>Add New Employee</h2>
            <p>Enter the employee details below. All fields are required.</p>

            <div className="form-group">
                <label>Full Name *</label>
                <input
                    type="text"
                    required
                    value={formData.fullName}
                    onChange={(e) => handleInputChange('fullName', e.target.value)}
                    placeholder="Enter full name"
                />
            </div>

            <div className="form-group">
                <label>Email *</label>
                <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Enter email address"
                />
            </div>

            <div className="form-group">
                <label>Phone</label>
                <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="Enter phone number"
                />
            </div>

            <div className="form-group">
                <label>Department *</label>
                <select
                    required
                    value={formData.department}
                    onChange={(e) => handleInputChange('department', e.target.value)}
                >
                    <option value="">Select department</option>
                    {departments.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                    ))}
                </select>
            </div>

            <div className="form-group">
                <label>Position *</label>
                <input
                    type="text"
                    required
                    value={formData.position}
                    onChange={(e) => handleInputChange('position', e.target.value)}
                    placeholder="Enter position/title"
                />
            </div>

            <div className="form-group">
                <label>Join Date *</label>
                <input
                    type="date"
                    required
                    value={formData.joinDate}
                    onChange={(e) => handleInputChange('joinDate', e.target.value)}
                    max={new Date().toISOString().split('T')[0]} // Prevent future dates
                />
            </div>
            <div className="form-group">
                <label>Password *</label>
                <div className="password-input-group" style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <div style={{ position: 'relative', flex: 1 }}>
                        <input
                            type={showPassword ? "text" : "password"}
                            required
                            value={formData.password}
                            onChange={(e) => handleInputChange('password', e.target.value)}
                            placeholder="Enter temporary password"
                            minLength="8"
                            maxLength="15"
                            style={{ 
                                width: '100%',
                                paddingRight: '40px' // Make room for the eye icon
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            style={{
                                position: 'absolute',
                                right: '8px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                padding: '4px',
                                color: '#6b7280',
                                fontSize: '16px'
                            }}
                            title={showPassword ? "Hide password" : "Show password"}
                        >
                            {showPassword ? '🙈' : '👁️'}
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={generatePassword}
                        className="generate-password-btn"
                        style={{
                            padding: '8px 12px',
                            fontSize: '12px',
                            backgroundColor: '#3b82f6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap'
                        }}
                        title="Generate random password"
                    >
                        Generate
                    </button>
                </div>
                <small className="form-help" style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px', display: 'block' }}>
                    Minimum 6 characters. Employee can change this after first login.
                </small>
            </div>            <div className="form-actions">
                <button
                    type="button"
                    onClick={onClose}
                    className="cancel-btn"
                    disabled={isSubmitting}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    className="submit-btn"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Adding Employee...' : 'Add Employee'}
                </button>
            </div>
        </form>
    );
};

export default AddEmployeeForm;