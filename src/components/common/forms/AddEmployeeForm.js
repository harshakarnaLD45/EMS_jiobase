import React, { useState } from 'react';
import { Eye, EyeOff, Wand2 } from 'lucide-react';
import { useEmployees } from '../../../contexts/EmployeeContext';
import { Button } from '../../ui/button';
import { Input } from '../../ui/input';
import { Label } from '../../ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../ui/card';


const AddEmployeeForm = ({ mode = 'add', employeeData = null, onClose, onSuccess, onError }) => {
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
    const { addEmployee, updateEmployee, getPositionOptions } = useEmployees();

    const departments = ['Administration', 'Development', 'Design', 'Interns'];

    // Load employee data when in edit mode
    React.useEffect(() => {
        if (mode === 'edit' && employeeData) {
            setFormData({
                firstName: employeeData.first_name || '',
                lastName: employeeData.last_name || '',
                email: employeeData.email || '',
                phone: employeeData.phone || '',
                department: employeeData.department || '',
                position: employeeData.position || '',
                joinDate: employeeData.join_date ? employeeData.join_date.split('T')[0] : '',
                password: '' // Don't show existing password
            });
        }
    }, [mode, employeeData]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (mode === 'edit') {
                // Update existing employee
                const updates = {
                    first_name: formData.firstName,
                    last_name: formData.lastName,
                    name: `${formData.firstName} ${formData.lastName}`.trim(),
                    email: formData.email,
                    phone: formData.phone,
                    department: formData.department,
                    position: formData.position,
                    join_date: formData.joinDate,
                };

                // Only update password if a new one was entered
                if (formData.password) {
                    updates.password = formData.password;
                }

                await updateEmployee(employeeData.employee_id, updates);
                onClose();
                
                if (onSuccess) {
                    onSuccess(`Employee ${formData.firstName} ${formData.lastName} has been updated successfully!`);
                }
            } else {
                // Add new employee
                const newEmployee = {
                    first_name: formData.firstName,
                    last_name: formData.lastName,
                    name: `${formData.firstName} ${formData.lastName}`.trim(),
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
            }
        } catch (error) {
            console.error(`Error ${mode === 'edit' ? 'updating' : 'adding'} employee:`, error);
            if (onError) {
                onError(`Failed to ${mode === 'edit' ? 'update' : 'add'} employee: ${error.message}`);
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
        <Card className="w-full max-w-2xl mx-auto">
            <CardHeader>
                <CardTitle>
                    {mode === 'edit' ? 'Edit Employee' : 'Add New Employee'}
                </CardTitle>
                <CardDescription>
                    {mode === 'edit' 
                        ? 'Update the employee details below.' 
                        : 'Enter the employee details below. All fields are required.'}
                </CardDescription>
            </CardHeader>
            
            <form onSubmit={handleSubmit}>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name *</Label>
                            <Input
                                id="firstName"
                                type="text"
                                placeholder="Enter first name"
                                value={formData.firstName}
                                onChange={(e) => handleInputChange('firstName', e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name *</Label>
                            <Input
                                id="lastName"
                                type="text"
                                placeholder="Enter last name"
                                value={formData.lastName}
                                onChange={(e) => handleInputChange('lastName', e.target.value)}
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="Enter email address"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="phone">Phone *</Label>
                        <Input
                            id="phone"
                            type="tel"
                            placeholder="Enter phone number"
                            value={formData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            required
                        />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="department">Department *</Label>
                            <div className="relative">
                                <select
                                    id="department"
                                    value={formData.department}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        //console.log('Department selected:', value);
                                        setFormData(prev => ({
                                            ...prev,
                                            department: value,
                                            position: '' // Reset position when department changes
                                        }));
                                    }}
                                    required
                                    className="flex h-10 w-full rounded-md border border-input bg-background pl-3 pr-10 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer"
                                >
                                    <option value="" disabled>Select department</option>
                                    {departments.map(dept => (
                                        <option key={dept} value={dept}>{dept}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="position">Position *</Label>
                            <div className="relative">
                                <select
                                    id="position"
                                    value={formData.position}
                                    onChange={(e) => {
                                        const value = e.target.value;
                                        //console.log('Position selected:', value);
                                        setFormData(prev => ({
                                            ...prev,
                                            position: value
                                        }));
                                    }}
                                    disabled={!formData.department}
                                    required
                                    className="flex h-10 w-full rounded-md border border-input bg-background pl-3 pr-10 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none cursor-pointer"
                                >
                                    <option value="" disabled>
                                        {formData.department ? 'Select position' : 'Select department first'}
                                    </option>
                                    {getPositionOptions(formData.department).map(position => (
                                        <option key={position} value={position}>{position}</option>
                                    ))}
                                </select>
                                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                    <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                            {!formData.department && (
                                <p className="text-sm text-muted-foreground">
                                    Please select a department first
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="joinDate">Join Date *</Label>
                        <div className="relative">
                            <Input
                                id="joinDate"
                                type="date"
                                value={formData.joinDate}
                                onChange={(e) => handleInputChange('joinDate', e.target.value)}
                                max={new Date().toISOString().split('T')[0]}
                                onFocus={(e) => {
                                    if (e.currentTarget?.showPicker) {
                                        // Some browsers allow showPicker on focus when initiated by user
                                        try { e.currentTarget.showPicker(); } catch (_) {}
                                    }
                                }}
                                onMouseDown={(e) => {
                                    // Guarantee a user gesture and open native picker
                                    if (e.currentTarget?.showPicker) {
                                        e.preventDefault();
                                        try { e.currentTarget.showPicker(); } catch (_) {}
                                    }
                                }}
                                required
                                className="flex h-10 w-full rounded-md border border-input bg-background px-3 
                                py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm 
                                file:font-medium placeholder:text-muted-foreground focus-visible:outline-none 
                                focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 
                                disabled:cursor-not-allowed disabled:opacity-50 pr-10 
                                [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-inner-spin-button]:hidden 
                                [&::-webkit-clear-button]:hidden"
                                style={{
                                    colorScheme: 'light',
                                    WebkitAppearance: 'none',
                                    MozAppearance: 'textfield'
                                }}
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                                <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Password {mode === 'add' ? '*' : ''}</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder={mode === 'edit' ? 'Leave blank to keep current password' : 'Enter temporary password'}
                                value={formData.password}
                                onChange={(e) => handleInputChange('password', e.target.value)}
                                minLength={8}
                                maxLength={15}
                                required={mode === 'add'}
                                className="pr-24"
                            />
                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 space-x-1">
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 w-8 p-0"
                                    onClick={() => setShowPassword(!showPassword)}
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={generatePassword}
                                    className="h-8 px-2"
                                >
                                    <Wand2 className="h-3 w-3 mr-1" />
                                    Gen
                                </Button>
                            </div>
                        </div>
                        {/* <p className="text-sm text-muted-foreground">
                            {mode === 'edit' 
                                ? 'Leave blank to keep current password. Minimum 8 characters if changing.' 
                                : 'Minimum 8 characters. Employee can change this after first login.'}
                        </p> */}
                    </div>

                </CardContent>
                
                <CardFooter className="flex justify-end space-x-2 pt-8">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                        disabled={isSubmitting}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={isSubmitting}
                    >
                        {isSubmitting 
                            ? (mode === 'edit' ? 'Updating Employee...' : 'Adding Employee...') 
                            : (mode === 'edit' ? 'Update Employee' : 'Add Employee')}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
};

export default AddEmployeeForm;