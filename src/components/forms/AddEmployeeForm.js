import React, { useState } from 'react';
import {
    Box,
    TextField,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Typography,
    Stack,
    IconButton,
    InputAdornment,
    Divider
} from '@mui/material';
import { Visibility, VisibilityOff, AutoFixHigh } from '@mui/icons-material';
import { useEmployees } from '../../contexts/EmployeeContext';

import '../../pages/attendencepage/attendence.css';


const AddEmployeeForm = ({ onClose, onSuccess, onError }) => {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        department: '',
        position: '',
        joinDate: '',
        password: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const { addEmployee, getPositionOptions } = useEmployees();

    const departments = ['Administration', 'Development', 'Design', 'Interns'];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            const newEmployee = {
                first_name: formData.firstName,
                last_name: formData.lastName,
                name: `${formData.firstName} ${formData.lastName}`.trim(), // Full name for compatibility
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
                onSuccess(`Employee ${formData.firstName} ${formData.lastName} has been added successfully!`);
            }

            // Reset form
            setFormData({
                firstName: '',
                lastName: '',
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
        setFormData(prev => {
            const newData = {
                ...prev,
                [field]: value
            };
            
            // Reset position when department changes
            if (field === 'department') {
                newData.position = '';
            }
            
            return newData;
        });
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
        <Box component="form" onSubmit={handleSubmit} sx={{ p: 3, maxWidth: 600, width: '100%' }}>
            <Typography variant="h5" component="h2" gutterBottom>
                Add New Employee
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Enter the employee details below. All fields are required.
            </Typography>

            <Stack spacing={3}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                        fullWidth
                        label="First Name"
                        required
                        value={formData.firstName}
                        onChange={(e) => handleInputChange('firstName', e.target.value)}
                        placeholder="Enter first name"
                    />
                    <TextField
                        fullWidth
                        label="Last Name"
                        required
                        value={formData.lastName}
                        onChange={(e) => handleInputChange('lastName', e.target.value)}
                        placeholder="Enter last name"
                    />
                </Stack>

                <TextField
                    fullWidth
                    label="Email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="Enter email address"
                />

                <TextField
                    fullWidth
                    label="Phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    placeholder="Enter phone number"
                />

                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <FormControl fullWidth required>
                        <InputLabel id="department-label">Department</InputLabel>
                        <Select
                            labelId="department-label"
                            id="department-select"
                            value={formData.department}
                            onChange={(e) => {
                                const value = e.target.value;
                                console.log('Department selected:', value);
                                setFormData(prev => ({
                                    ...prev,
                                    department: value,
                                    position: '' // Reset position when department changes
                                }));
                            }}
                            label="Department"
                            MenuProps={{
                                disablePortal: true,
                                disableScrollLock: true,
                                anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
                                transformOrigin: { vertical: 'top', horizontal: 'left' },
                                // PaperProps: {
                                //     sx: { zIndex: 1600 },
                                //     style: { height: "auto" },
                                // },
                            }}
                        >
                            <MenuItem value="" disabled>
                                Select department
                            </MenuItem>
                            {departments.map(dept => (
                                <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl fullWidth required disabled={!formData.department}>
                        <InputLabel id="position-label">Position</InputLabel>
                        <Select
                            labelId="position-label"
                            id="position-select"
                            value={formData.position}
                            onChange={(e) => {
                                const value = e.target.value;
                                console.log('Position selected:', value);
                                setFormData(prev => ({
                                    ...prev,
                                    position: value
                                }));
                            }}
                            label="Position"
                            MenuProps={{
                                disablePortal: true,
                                disableScrollLock: true,
                                anchorOrigin: { vertical: 'bottom', horizontal: 'left' },
                                transformOrigin: { vertical: 'top', horizontal: 'left' },
                                PaperProps: {
                                    sx: { zIndex: 1600 },
                                    style: { maxHeight: 300 },
                                },
                            }}
                        >
                            <MenuItem value="" disabled>
                                {formData.department ? 'Select position' : 'Select department first'}
                            </MenuItem>
                            {getPositionOptions(formData.department).map(position => (
                                <MenuItem key={position} value={position}>{position}</MenuItem>
                            ))}
                        </Select>
                        {!formData.department && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                                Please select a department first
                            </Typography>
                        )}
                    </FormControl>
                </Stack>

                <TextField
                    fullWidth
                    label="Join Date"
                    type="date"
                    required
                    value={formData.joinDate}
                    onChange={(e) => handleInputChange('joinDate', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    inputProps={{
                        max: new Date().toISOString().split('T')[0],
                        onFocus: (e) => {
                            if (e.currentTarget?.showPicker) {
                                // Some browsers allow showPicker on focus when initiated by user
                                try { e.currentTarget.showPicker(); } catch (_) {}
                            }
                        },
                        onMouseDown: (e) => {
                            // Guarantee a user gesture and open native picker
                            if (e.currentTarget?.showPicker) {
                                e.preventDefault();
                                try { e.currentTarget.showPicker(); } catch (_) {}
                            }
                        }
                    }}
                    
                />

                <Box>
                    <TextField
                        fullWidth
                        label="Password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={formData.password}
                        onChange={(e) => handleInputChange('password', e.target.value)}
                        placeholder="Enter temporary password"
                        inputProps={{ minLength: 8, maxLength: 15 }}
                        InputProps={{
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        onClick={() => setShowPassword(!showPassword)}
                                        edge="end"
                                        size="small"
                                    >
                                        {showPassword ? <VisibilityOff /> : <Visibility />}
                                    </IconButton>
                                    <Button
                                        onClick={generatePassword}
                                        size="small"
                                        variant="contained"
                                        startIcon={<AutoFixHigh />}
                                        sx={{ ml: 1, minWidth: 'auto' }}
                                    >
                                        Generate
                                    </Button>
                                </InputAdornment>
                            ),
                        }}
                        helperText="Minimum 8 characters. Employee can change this after first login."
                    />
                </Box>

                <Divider />

                <Stack direction="row" spacing={2} justifyContent="flex-end">
                    <Button
                        variant="outlined"
                        onClick={onClose}
                        disabled={isSubmitting}
                        size="large"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="contained"
                        disabled={isSubmitting}
                        size="large"
                    >
                        {isSubmitting ? 'Adding Employee...' : 'Add Employee'}
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
};

export default AddEmployeeForm;