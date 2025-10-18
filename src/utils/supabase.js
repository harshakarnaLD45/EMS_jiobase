import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Authentication functions
export const authApi = {
    async signIn(email, password) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });
        if (error) throw error;
        return data;
    },

    async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) throw error;
    },

    async getCurrentUser() {
        const { data: { user }, error } = await supabase.auth.getUser();
        if (error) throw error;
        return user;
    },

    async getUserProfile(userId) {
        const { data, error } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', userId)
            .single();
        if (error) throw error;
        return data;
    },

    onAuthStateChange(callback) {
        return supabase.auth.onAuthStateChange(callback);
    },

    // Employee login using email and password from employees table
    async signInEmployee(email, password) {
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .eq('email', email)
            .eq('password_hash', password) // In production, compare with hashed password
            .single();
        
        if (error || !data) {
            throw new Error('Invalid email or password');
        }
        
        // Return employee data in user format
        return {
            id: data.id,
            email: data.email,
            name: data.name,
            role: data.role || 'employee',
            employee_id: data.employee_id,
            department: data.department,
            position: data.position
        };
    },

    // Admin login using email and password from admins table
    async signInAdmin(email, password) {
        console.log('🔐 Admin login attempt for:', email);
        
        const { data, error } = await supabase
            .from('admins')
            .select('*')
            .eq('email', email)
            .eq('password', password) // In production, use proper password hashing
            .single();
        
        if (error || !data) {
            console.log('❌ Admin login failed:', error?.message);
            throw new Error('Invalid admin email or password');
        }
        
        console.log('✅ Admin login successful:', data.name);
        
        // Return admin data in user format
        return {
            id: data.id,
            email: data.email,
            name: data.name,
            role: data.role || 'admin',
            isAdmin: true,
            loginType: 'admin'
        };
    }
};

// Timesheet related functions
export const timesheetApi = {
    async createTimesheet(timesheetData) {
        console.log('📋 Creating timesheet with data:', timesheetData);
        
        // Ensure we have employee_id if not provided 
        if (!timesheetData.employee_id && timesheetData.user) {
            try {
                const employee = await employeeApi.getEmployeeByUser(timesheetData.user);
                timesheetData.employee_id = employee.employee_id || employee.id;
                // Also add employee name for better tracking
                timesheetData.employee_name = employee.name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
                console.log('✅ Added employee_id to timesheet:', timesheetData.employee_id, 'Name:', timesheetData.employee_name);
            } catch (error) {
                console.log('⚠️ Could not fetch employee_id for timesheet:', error.message);
                // Continue without employee_id but log the issue
            }
        }

        // Remove the user object before inserting to database
        const { user, ...cleanTimesheetData } = timesheetData;

        // Map the data to match the updated schema (no user_id column)
        const timesheetRecord = {
            employee_id: cleanTimesheetData.employee_id,
            date: cleanTimesheetData.workDate || cleanTimesheetData.date,
            hours: parseFloat(cleanTimesheetData.hoursWorked || cleanTimesheetData.hours || 0),
            tasks: JSON.stringify(cleanTimesheetData.tasks || []),
            note: cleanTimesheetData.note || '',
            status: cleanTimesheetData.status || 'pending',
            created_at: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from('timesheets')
            .insert([timesheetRecord])
            .select();
        
        if (error) throw error;
        
        console.log('✅ Timesheet created successfully:', data[0]);
        return data[0];
    },

    async getTimesheets(employeeId) {
        const { data, error } = await supabase
            .from('timesheets')
            .select('*')
            .eq('employee_id', employeeId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async getTimesheetsByEmployeeId(employeeId) {
        const { data, error } = await supabase
            .from('timesheets')
            .select('*')
            .eq('employee_id', employeeId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async updateTimesheet(id, updates) {
        const { data, error } = await supabase
            .from('timesheets')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) throw error;
        return data[0];
    }
};

// Leave management related functions
export const leaveApi = {
    async getLeaveBalance(employeeId) {
        const { data, error } = await supabase
            .from('leave_balances')
            .select('*')
            .eq('employee_id', employeeId)
            .single();

        if (error) throw error;
        return data;
    },

    async getLeaveBalanceByEmployeeId(employeeId) {
        console.log('🔍 Getting leave balance for employee ID:', employeeId);
        
        // First try to get existing balance
        const { data, error } = await supabase
            .from('leave_balances')
            .select('*')
            .eq('employee_id', employeeId)
            .single();

        if (error) {
            console.log('⚠️ No existing leave balance found, creating default:', error.message);
            
            // If no balance found, create a default one
            try {
                const { data: newBalance, error: createError } = await supabase
                    .from('leave_balances')
                    .insert({
                        employee_id: employeeId,
                        sick_leave: 12,
                        casual_leave: 15,
                        annual_leave: 20
                    })
                    .select()
                    .single();
                
                if (createError) throw createError;
                console.log('✅ Created default leave balance:', newBalance);
                return newBalance;
                
            } catch (insertError) {
                console.error('❌ Error creating default leave balance:', insertError);
                throw insertError;
            }
        }
        
        console.log('✅ Found existing leave balance:', data);
        return data;
    },

    async createLeaveRequest(leaveData) {
        console.log('🏖️ Creating leave request with data:', leaveData);
        
        // Ensure we have employee_id if not provided
        if (!leaveData.employee_id && leaveData.user) {
            try {
                const employee = await employeeApi.getEmployeeByUser(leaveData.user);
                leaveData.employee_id = employee.employee_id || employee.id;
                // Also add employee name for better tracking
                leaveData.employee_name = employee.name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
                console.log('✅ Added employee_id to leave request:', leaveData.employee_id, 'Name:', leaveData.employee_name);
            } catch (error) {
                console.log('⚠️ Could not fetch employee_id for leave request:', error.message);
                // Continue without employee_id but log the issue
            }
        }

        // First, check leave balance using employee_id
        const balance = await this.getLeaveBalance(leaveData.employee_id);
        const requestedDays = calculateLeaveDays(leaveData.start_date, leaveData.end_date);

        // Check if enough balance is available
        if (leaveData.leave_type === 'sick' && balance.sick_leave < requestedDays) {
            throw new Error('Insufficient sick leave balance');
        }
        if (leaveData.leave_type === 'casual' && balance.casual_leave < requestedDays) {
            throw new Error('Insufficient casual leave balance');
        }

        // Remove the user object before inserting to database
        const { user, ...cleanLeaveData } = leaveData;

        // Map the data to match the updated schema
        const leaveRecord = {
            employee_id: cleanLeaveData.employee_id,
            leave_type: cleanLeaveData.leave_type,
            start_date: cleanLeaveData.start_date,
            end_date: cleanLeaveData.end_date,
            reason: cleanLeaveData.reason,
            subject: cleanLeaveData.subject,
            status: cleanLeaveData.status || 'pending',
            created_at: new Date().toISOString()
        };

        // If balance is sufficient, create leave request
        const { data, error } = await supabase
            .from('leave_requests')
            .insert([leaveRecord])
            .select();

        if (error) throw error;

        // Update leave balance using employee_id
        await this.updateLeaveBalance(
            leaveData.employee_id,
            leaveData.leave_type,
            balance[`${leaveData.leave_type}_leave`] - requestedDays
        );

        console.log('✅ Leave request created successfully:', data[0]);
        return data[0];
    },

    async updateLeaveBalance(employeeId, leaveType, newBalance) {
        const updateData = {
            [`${leaveType}_leave`]: newBalance,
            updated_at: new Date().toISOString()
        };

        const { error } = await supabase
            .from('leave_balances')
            .update(updateData)
            .eq('employee_id', employeeId);

        if (error) throw error;
    },

    async getLeaveRequests(employeeId) {
        const { data, error } = await supabase
            .from('leave_requests')
            .select('*')
            .eq('employee_id', employeeId)
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    }
};

// Employee management related functions
export const employeeApi = {
    // Get employee ID by user name, email, or user ID
    async getEmployeeByUser(user) {
        console.log('🔍 Looking up employee for user:', user);
        
        if (!user) {
            throw new Error('User data is required');
        }

        // Try multiple lookup strategies in order of preference
        let employee = null;
        let error = null;

        // Strategy 1: If user already has employee_id, use it directly
        if (user.employee_id) {
            try {
                const { data, error: empError } = await supabase
                    .from('employees')
                    .select('*')
                    .eq('employee_id', user.employee_id)
                    .single();
                
                if (!empError && data) {
                    console.log('✅ Found employee by employee_id:', data);
                    return data;
                }
            } catch (e) {
                console.log('⚠️ Employee lookup by employee_id failed:', e.message);
            }
        }

        // Strategy 2: Try email lookup
        if (user.email) {
            try {
                const { data, error: emailError } = await supabase
                    .from('employees')
                    .select('*')
                    .eq('email', user.email)
                    .single();
                
                if (!emailError && data) {
                    console.log('✅ Found employee by email:', data);
                    return data;
                }
            } catch (e) {
                console.log('⚠️ Employee lookup by email failed:', e.message);
            }
        }

        // Strategy 3: Try exact name match
        if (user.name) {
            try {
                const { data, error: nameError } = await supabase
                    .from('employees')
                    .select('*')
                    .eq('name', user.name)
                    .single();
                
                if (!nameError && data) {
                    console.log('✅ Found employee by exact name:', data);
                    return data;
                }
            } catch (e) {
                console.log('⚠️ Employee lookup by exact name failed:', e.message);
            }
        }

        // Strategy 4: Try partial name match
        if (user.name) {
            try {
                const nameParts = user.name.split(' ');
                const firstName = nameParts[0];
                const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : '';

                let nameQuery = supabase.from('employees').select('*');
                
                if (firstName && lastName) {
                    // Try first + last name combination
                    nameQuery = nameQuery.or(`name.ilike.%${user.name}%,first_name.ilike.%${firstName}%,last_name.ilike.%${lastName}%`);
                } else {
                    // Try just the name
                    nameQuery = nameQuery.or(`name.ilike.%${user.name}%,first_name.ilike.%${user.name}%,last_name.ilike.%${user.name}%`);
                }

                const { data, error: partialError } = await nameQuery.limit(1).single();
                
                if (!partialError && data) {
                    console.log('✅ Found employee by partial name match:', data);
                    return data;
                }
            } catch (e) {
                console.log('⚠️ Employee lookup by partial name failed:', e.message);
                error = e;
            }
        }

        // If all strategies failed
        console.log('❌ All employee lookup strategies failed for user:', user);
        throw new Error(`Employee not found in database. Please ensure the employee record exists with email: ${user.email} or name: ${user.name}`);
    },

    async createEmployee(employeeData) {
        // Hash password before storing (in production, use proper hashing)
        const processedData = {
            ...employeeData,
            // For demo purposes, storing password as-is. In production, hash it!
            password_hash: employeeData.password,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        // Remove the plain password field
        delete processedData.password;
        
        const { data, error } = await supabase
            .from('employees')
            .insert([processedData])
            .select();
        
        if (error) throw error;
        return data[0];
    },

    async getEmployees() {
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;
        return data;
    },

    async updateEmployee(id, updates) {
        const { data, error } = await supabase
            .from('employees')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('id', id)
            .select();

        if (error) throw error;
        return data[0];
    },

    async deleteEmployee(id) {
        const { error } = await supabase
            .from('employees')
            .delete()
            .eq('id', id);

        if (error) throw error;
        return true;
    }
};

// Admin Dashboard API functions
export const adminApi = {
    // Get all admins from the admins table
    async getAdmins() {
        console.log('👥 Fetching all admins from database...');
        
        const { data, error } = await supabase
            .from('admins')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Error fetching admins:', error);
            throw error;
        }

        console.log('✅ Admins fetched successfully:', data?.length || 0);
        return data || [];
    },

    // Get all employees and admins combined for employee management
    async getAllEmployeesAndAdmins() {
        console.log('👥 Starting to fetch employees and admins from database tables...');
        
        try {
            // Get employees from employees table
            console.log('📋 Fetching from employees table...');
            const employees = await employeeApi.getEmployees();
            console.log('✅ Employees loaded from database:', employees.length, employees.length > 0 ? employees.slice(0, 2) : 'No employees found');
            
            // Get admins from admins table  
            console.log('👑 Fetching from admins table...');
            const admins = await this.getAdmins();
            console.log('✅ Admins loaded from database:', admins.length, admins.length > 0 ? admins.slice(0, 2) : 'No admins found');
            
            // Transform admins to match employee structure
            console.log('🔄 Transforming admin data to match employee format...');
            const transformedAdmins = admins.map((admin, index) => {
                console.log(`Admin ${index + 1}:`, {
                    original: admin,
                    transformed: {
                        id: `admin_${admin.id}`,
                        name: admin.name || `${admin.first_name || ''} ${admin.last_name || ''}`.trim(),
                        email: admin.email,
                        department: admin.department || 'Administration',
                        role: 'admin'
                    }
                });
                
                return {
                    id: `admin_${admin.id}`, // Prefix to avoid ID conflicts
                    employee_id: admin.id,
                    name: admin.name || `${admin.first_name || ''} ${admin.last_name || ''}`.trim() || 'Admin User',
                    email: admin.email,
                    department: admin.department || 'Administration',
                    position: admin.position || 'Administrator',
                    role: 'admin',
                    status: admin.status || 'active',
                    phone: admin.phone || '',
                    hire_date: admin.created_at || admin.hire_date,
                    created_at: admin.created_at,
                    isAdmin: true,
                    // Keep original admin data for reference
                    originalAdminData: admin
                };
            });
            
            // Add role field to employees for consistency
            const employeesWithRole = employees.map(emp => ({
                ...emp,
                role: emp.role || 'employee',
                isAdmin: false
            }));
            
            // Combine employees and admins
            const combined = [...employeesWithRole, ...transformedAdmins];
            
            console.log('🎯 Final combined result:');
            console.log(`   - Total records: ${combined.length}`);
            console.log(`   - Employees: ${employeesWithRole.length}`);
            console.log(`   - Admins: ${transformedAdmins.length}`);
            console.log('   - Sample combined data:', combined.slice(0, 3));
            return combined;
            
        } catch (error) {
            console.error('❌ Error fetching employees and admins:', error);
            throw error;
        }
    },

    // Simple employee name fetcher
    getEmployeeName: async (userId) => {
        try {
            console.log('🔍 Fetching employee name for user_id:', userId);
            
            const { data: employee, error } = await supabase
                .from('employees')
                .select('id, employee_id, first_name, last_name, name')
                .or(`employee_id.eq.${userId},id.eq.${userId}`)
                .single();

            if (error) {
                console.log('❌ Error fetching employee:', error);
                return null;
            }

            const name = employee.name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || `Employee ${userId.slice(-4)}`;
            console.log('✅ Found employee name:', name);
            return name;
        } catch (error) {
            console.log('❌ Exception in getEmployeeName:', error);
            return `Employee ${userId.slice(-4)}`;
        }
    },

    // Debug function to check database connectivity and data
    async debugDatabase() {
        console.log('🔍 Debugging database connection and data...');
        
        try {
            // Test leave_requests table
            const { data: leaveData, error: leaveError, count: leaveCount } = await supabase
                .from('leave_requests')
                .select('*', { count: 'exact' })
                .limit(5);
            
            console.log('📋 Leave requests table:', {
                data: leaveData,
                error: leaveError,
                count: leaveCount
            });

            // Test employees table
            const { data: empData, error: empError, count: empCount } = await supabase
                .from('employees')
                .select('*', { count: 'exact' })
                .limit(5);
            
            console.log('👥 Employees table:', {
                data: empData,
                error: empError,
                count: empCount
            });

            // Check for potential relationships
            if (leaveData && leaveData.length > 0 && empData && empData.length > 0) {
                console.log('🔗 Checking relationships:');
                console.log('📝 Sample leave request employee_id:', leaveData[0].employee_id);
                console.log('👤 Sample employee employee_id:', empData[0].employee_id);
                console.log('👤 Sample employee id:', empData[0].id);
                console.log('👤 Sample employee name:', empData[0].name);
                
                // Try to find matching patterns
                const employeeIdsFromRequests = leaveData.map(req => req.employee_id).filter(Boolean);
                const employeeIds = empData.map(emp => emp.employee_id).filter(Boolean);
                const empIds = empData.map(emp => emp.id).filter(Boolean);
                
                console.log('🔍 Unique employee_ids in leave_requests:', [...new Set(employeeIdsFromRequests)]);
                console.log('🔍 Unique employee_ids in employees:', [...new Set(employeeIds)]);
                console.log('🔍 Unique ids in employees:', [...new Set(empIds)]);
                
                // Check for matches
                const matchByEmployeeId = employeeIdsFromRequests.some(empId => empIds.includes(empId));
                
                console.log('🎯 Match found (employee_id -> employee.id):', matchByEmployeeId);
            }

            return {
                leaveRequests: { data: leaveData, error: leaveError, count: leaveCount },
                employees: { data: empData, error: empError, count: empCount }
            };
        } catch (error) {
            console.error('❌ Database debug error:', error);
            return { error };
        }
    },
    async getDashboardStats() {
        try {
            console.log('📈 Getting comprehensive dashboard stats (employees + admins)...');
            
            // Get all employees from employees table
            const { data: employees, error: empError } = await supabase
                .from('employees')
                .select('id, status, created_at, name, email');
            
            if (empError) {
                console.error('❌ Error fetching employees:', empError);
            }
            
            // Get all admins from admins table
            const { data: admins, error: adminError } = await supabase
                .from('admins')
                .select('id, status, created_at, name, email');
            
            if (adminError) {
                console.error('❌ Error fetching admins:', adminError);
            }
            
            // Combine employees and admins for total staff count
            const allStaff = [...(employees || []), ...(admins || [])];
            const activeStaff = allStaff.filter(staff => 
                !staff.status || staff.status === 'active' || staff.status === 'Active'
            );
            
            console.log('📊 Staff Statistics:');
            console.log(`   - Total Employees: ${employees?.length || 0}`);
            console.log(`   - Total Admins: ${admins?.length || 0}`);
            console.log(`   - Total Staff: ${allStaff.length}`);
            console.log(`   - Active Staff: ${activeStaff.length}`);

            // Get pending leave requests (try different status approaches)
            let { data: pendingLeaves, error: leaveError } = await supabase
                .from('leave_requests')
                .select('*')
                .eq('status', 'pending');
            
            // If no pending requests or status column doesn't exist, get all requests
            if (leaveError || !pendingLeaves || pendingLeaves.length === 0) {
                console.log('⚠️ No pending status found, getting all leave requests...');
                const fallback = await supabase
                    .from('leave_requests')
                    .select('*');
                
                if (!fallback.error && fallback.data) {
                    pendingLeaves = fallback.data.filter(req => 
                        !req.status || req.status === 'pending' || req.status === null
                    );
                    console.log('📋 Found leave requests (filtered):', pendingLeaves.length);
                } else {
                    console.error('❌ Error fetching all leave requests:', fallback.error);
                    pendingLeaves = [];
                }
            }
            
            if (leaveError) {
                console.error('⚠️ Leave request query error:', leaveError);
            }

            // Get approved leaves for current month
            const currentMonth = new Date().toISOString().slice(0, 7);
            const today = new Date().toISOString().slice(0, 10);
            
            const { data: approvedLeaves, error: approvedError } = await supabase
                .from('leave_requests')
                .select('*')
                .eq('status', 'approved');
            
            if (approvedError) throw approvedError;

            // Get currently active leaves (approved and ongoing today)
            const { data: activeLeaves, error: activeLeavesError } = await supabase
                .from('leave_requests')
                .select('*')
                .eq('status', 'approved')
                .lte('start_date', today)
                .gte('end_date', today);
            
            if (activeLeavesError) console.error('Error fetching active leaves:', activeLeavesError);

            // Get all leave requests for this month
            const { data: thisMonthLeaves, error: monthError } = await supabase
                .from('leave_requests')
                .select('*')
                .gte('created_at', `${currentMonth}-01`)
                .lt('created_at', `${currentMonth}-32`);
            
            if (monthError) console.error('Error fetching month leaves:', monthError);

            // Get pending timesheets (including null/undefined status and submitted)
            const { data: pendingTimesheets, error: timesheetError } = await supabase
                .from('timesheets')
                .select('*')
                .or('status.eq.pending,status.eq.submitted,status.is.null');
            
            if (timesheetError) console.error('Error fetching timesheets:', timesheetError);

            // Calculate new staff members this month (employees + admins)
            const newEmployeesThisMonth = allStaff.filter(staff => 
                staff.created_at && staff.created_at.startsWith(currentMonth)
            ).length;
            
            const newAdminsThisMonth = (admins || []).filter(admin => 
                admin.created_at && admin.created_at.startsWith(currentMonth)
            ).length;

            // Calculate staff currently on leave
            const staffOnLeave = activeLeaves?.length || 0;
            const activeStaffToday = Math.max(0, activeStaff.length - staffOnLeave);
            
            console.log('📊 Dashboard stats calculated:', {
                totalStaff: allStaff.length,
                totalEmployees: employees?.length || 0,
                totalAdmins: admins?.length || 0,
                activeStaff: activeStaff.length,
                newStaffThisMonth: newEmployeesThisMonth,
                newEmployeesThisMonth: (employees || []).filter(emp => 
                    emp.created_at && emp.created_at.startsWith(currentMonth)
                ).length,
                newAdminsThisMonth,
                pendingRequests: pendingLeaves.length,
                approvedLeaves: approvedLeaves?.length || 0,
                staffOnLeave,
                activeStaffToday,
                pendingTimesheets: pendingTimesheets?.length || 0
            });

            return {
                // Total staff (employees + admins)
                totalEmployees: allStaff.length, // Renamed for compatibility but includes both
                totalStaff: allStaff.length,
                employeesCount: employees?.length || 0,
                adminsCount: admins?.length || 0,
                activeStaff: activeStaff.length,
                
                // New additions this month
                newEmployeesThisMonth,
                newStaffThisMonth: newEmployeesThisMonth,
                newAdminsThisMonth,
                
                // Leave statistics
                pendingRequests: pendingLeaves.length,
                approvedLeaves: approvedLeaves?.length || 0,
                employeesOnLeave: staffOnLeave,
                staffOnLeave,
                
                // Active today
                activeEmployeesToday: activeStaffToday,
                activeStaffToday,
                
                // Other metrics
                pendingTimesheets: pendingTimesheets?.length || 0,
                pendingLeaveDetails: pendingLeaves.slice(0, 5), // Latest 5 for display
                thisMonthLeaves: thisMonthLeaves?.length || 0,
            };
        } catch (error) {
            console.error('Error fetching dashboard stats:', error);
            throw error;
        }
    },

    async getRecentActivity() {
        try {
            console.log('🔍 Fetching recent activity...');
            
            // First, try to get just the leave requests without joins
            const { data: leaveRequests, error: leaveError } = await supabase
                .from('leave_requests')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(10);
            
            console.log('📊 Leave requests query result:', { leaveRequests, leaveError });
            
            if (leaveError) {
                console.error('❌ Error fetching leave requests:', leaveError);
                throw leaveError;
            }

            if (!leaveRequests || leaveRequests.length === 0) {
                console.log('⚠️ No leave requests found in database');
                return [];
            }

            console.log(`✅ Found ${leaveRequests.length} leave requests`);

            // Now try to enrich with employee data
            const enrichedData = await Promise.all(
                leaveRequests.map(async (request) => {
                    console.log('👤 Processing request:', request);
                    
                    // Try different approaches to get employee info
                    let employee = null;

                    // Method 1: Try user_id matching employee_id
                    if (request.user_id) {
                        console.log('🔍 Looking up employee by user_id -> employee_id:', request.user_id);
                        const { data: empData, error: empError } = await supabase
                            .from('employees')
                            .select('*')
                            .eq('employee_id', request.user_id)
                            .maybeSingle();
                        
                        if (empData && !empError) {
                            employee = empData;
                            console.log('✅ Found employee by employee_id match:', employee);
                        } else {
                            console.log('⚠️ No employee found by employee_id match, error:', empError);
                            
                            // Method 1b: Try matching by id field
                            const { data: empData2, error: empError2 } = await supabase
                                .from('employees')
                                .select('*')
                                .eq('id', request.user_id)
                                .maybeSingle();
                            
                            if (empData2 && !empError2) {
                                employee = empData2;
                                console.log('✅ Found employee by id match:', employee);
                            } else {
                                console.log('⚠️ No employee found by id match either, error:', empError2);
                            }
                        }
                    }

                    // Method 2: If still no employee, try getting the first employee as a fallback
                    if (!employee) {
                        console.log('🔍 No specific match found, getting first available employee...');
                        const { data: empData, error: empError } = await supabase
                            .from('employees')
                            .select('*')
                            .limit(1)
                            .maybeSingle();
                        
                        if (empData && !empError) {
                            employee = empData;
                            console.log('✅ Using fallback employee:', employee);
                        }
                    }

                    // Add employee data to request
                    if (employee) {
                        request.employees = {
                            first_name: employee.first_name || employee.name?.split(' ')[0] || 'Employee',
                            last_name: employee.last_name || employee.name?.split(' ').slice(1).join(' ') || '',
                            name: employee.name || `${employee.first_name || 'Employee'} ${employee.last_name || ''}`.trim()
                        };
                        console.log('✅ Added employee data to request:', request.employees);
                    } else {
                        console.log('❌ No employee found for request:', request.id, 'user_id:', request.user_id);
                        // Use the user_id as a fallback name
                        const fallbackName = request.user_id ? `Employee ${request.user_id.slice(-4)}` : 'Unknown Employee';
                        request.employees = {
                            first_name: fallbackName,
                            last_name: '',
                            name: fallbackName
                        };
                    }

                    return request;
                })
            );

            console.log('🎯 Final enriched data:', enrichedData);
            return enrichedData;
            
        } catch (error) {
            console.error('❌ Error in getRecentActivity:', error);
            throw error;
        }
    },

    async approveLeaveRequest(requestId) {
        console.log('✅ Approving leave request:', requestId);
        
        // First, get the leave request details to find the employee
        const { data: leaveRequest, error: fetchError } = await supabase
            .from('leave_requests')
            .select('*')
            .eq('id', requestId)
            .single();
        
        if (fetchError) {
            console.error('❌ Error fetching leave request:', fetchError);
            throw fetchError;
        }
        
        // Update the leave request status to approved
        const { data, error } = await supabase
            .from('leave_requests')
            .update({ 
                status: 'approved'
            })
            .eq('id', requestId)
            .select();
        
        if (error) {
            console.error('❌ Error approving request:', error);
            throw error;
        }
        
        // Update employee status to "On-leave" - try multiple approaches for better reliability
        if (leaveRequest.employee_id || leaveRequest.user_id) {
            const employeeIdToUpdate = leaveRequest.employee_id || leaveRequest.user_id;
            console.log('📝 Updating employee status to On-leave for ID:', employeeIdToUpdate);
            
            // Try updating employees table first (by id)
            const { data: empUpdate1, error: empError1 } = await supabase
                .from('employees')
                .update({ status: 'On-leave' })
                .eq('id', employeeIdToUpdate);
            
            if (empError1) {
                console.warn('⚠️ Failed to update employees table by id:', empError1.message);
                
                // Try updating by employee_id field if id failed
                const { data: empUpdate2, error: empError2 } = await supabase
                    .from('employees')
                    .update({ status: 'On-leave' })
                    .eq('employee_id', employeeIdToUpdate);
                
                if (empError2) {
                    console.warn('⚠️ Failed to update employees table by employee_id:', empError2.message);
                } else {
                    console.log('✅ Employee status updated to On-leave (via employee_id field)');
                }
            } else {
                console.log('✅ Employee status updated to On-leave (via id field)');
            }
            
            // Also try updating admins table in case the person is an admin
            const { data: adminUpdate, error: adminError } = await supabase
                .from('admins')
                .update({ status: 'On-leave' })
                .eq('id', employeeIdToUpdate);
            
            if (adminError) {
                console.log('ℹ️ No admin record found to update (this is normal for employees):', adminError.message);
            } else if (adminUpdate && adminUpdate.length > 0) {
                console.log('✅ Admin status also updated to On-leave');
            }
        } else {
            console.error('⚠️ No employee_id or user_id found in leave request, cannot update employee status');
        }
        
        console.log('✅ Leave request approved successfully:', data[0]);
        return data[0];
    },

    async rejectLeaveRequest(requestId, reason = '') {
        console.log('❌ Rejecting leave request:', requestId, 'Reason:', reason);
        
        // First, get the leave request details to find the employee
        const { data: leaveRequest, error: fetchError } = await supabase
            .from('leave_requests')
            .select('*')
            .eq('id', requestId)
            .single();
        
        if (fetchError) {
            console.error('❌ Error fetching leave request:', fetchError);
            throw fetchError;
        }
        
        // Update the leave request status to rejected
        const { data, error } = await supabase
            .from('leave_requests')
            .update({ 
                status: 'rejected',
                rejection_reason: reason
            })
            .eq('id', requestId)
            .select();
        
        if (error) {
            console.error('❌ Error rejecting request:', error);
            throw error;
        }
        
        // Update employee status back to "active" since leave was rejected - try multiple approaches
        if (leaveRequest.employee_id || leaveRequest.user_id) {
            const employeeIdToUpdate = leaveRequest.employee_id || leaveRequest.user_id;
            console.log('📝 Updating employee status to active for ID:', employeeIdToUpdate);
            
            // Try updating employees table first (by id)
            const { data: empUpdate1, error: empError1 } = await supabase
                .from('employees')
                .update({ status: 'active' })
                .eq('id', employeeIdToUpdate);
            
            if (empError1) {
                console.warn('⚠️ Failed to update employees table by id:', empError1.message);
                
                // Try updating by employee_id field if id failed
                const { data: empUpdate2, error: empError2 } = await supabase
                    .from('employees')
                    .update({ status: 'active' })
                    .eq('employee_id', employeeIdToUpdate);
                
                if (empError2) {
                    console.warn('⚠️ Failed to update employees table by employee_id:', empError2.message);
                } else {
                    console.log('✅ Employee status updated to active (via employee_id field)');
                }
            } else {
                console.log('✅ Employee status updated to active (via id field)');
            }
            
            // Also try updating admins table in case the person is an admin
            const { data: adminUpdate, error: adminError } = await supabase
                .from('admins')
                .update({ status: 'active' })
                .eq('id', employeeIdToUpdate);
            
            if (adminError) {
                console.log('ℹ️ No admin record found to update (this is normal for employees):', adminError.message);
            } else if (adminUpdate && adminUpdate.length > 0) {
                console.log('✅ Admin status also updated to active');
            }
        } else {
            console.error('⚠️ No employee_id or user_id found in leave request, cannot update employee status');
        }
        
        console.log('✅ Leave request rejected successfully:', data[0]);
        return data[0];
    },

    // Function to update employee status when leave ends
    async updateEmployeeStatusAfterLeave(userId) {
        console.log('🔄 Checking if employee should return to active status:', userId);
        
        const today = new Date().toISOString().slice(0, 10);
        
        // Check if employee has any active leaves today
        const { data: activeLeaves, error } = await supabase
            .from('leave_requests')
            .select('*')
            .eq('status', 'approved')
            .lte('start_date', today)
            .gte('end_date', today)
            .or(`employee_id.eq.${userId},user_id.eq.${userId}`);
        
        if (error) {
            console.error('❌ Error checking active leaves:', error);
            return;
        }
        
        // If no active leaves, set status back to active
        if (!activeLeaves || activeLeaves.length === 0) {
            console.log('📝 No active leaves found, setting employee status to active');
            
            // Try updating by employee_id first
            const { error: empError1 } = await supabase
                .from('employees')
                .update({ status: 'active' })
                .eq('employee_id', userId);
            
            if (empError1) {
                // If that fails, try updating by id
                const { error: empError2 } = await supabase
                    .from('employees')
                    .update({ status: 'active' })
                    .eq('id', userId);
                
                if (empError2) {
                    console.error('❌ Failed to update employee status:', empError2);
                } else {
                    console.log('✅ Employee status updated to active (by id)');
                }
            } else {
                console.log('✅ Employee status updated to active (by employee_id)');
            }
        } else {
            console.log('📅 Employee still has active leaves, keeping On-leave status');
        }
    }
};

// Helper function to calculate number of leave days
function calculateLeaveDays(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include both start and end days
    return diffDays;
}