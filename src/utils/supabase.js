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
        // console.log('🔐 Admin login attempt for:', email);
        
        const { data, error } = await supabase
            .from('admins')
            .select('*')
            .eq('email', email)
            .eq('password', password) // In production, use proper password hashing
            .single();
        
        if (error || !data) {
            console.error('❌ Admin login failed:', error?.message);
            throw new Error('Invalid admin email or password');
        }
        
        // console.log('✅ Admin login successful:', data.name);
        
        // Return admin data in user format
        return {
            id: data.id,
            email: data.email,
            name: data.name,
            role: data.role || 'admin',
            isAdmin: true,
            loginType: 'admin'
        };
    },

    // Change password for employee
    async changeEmployeePassword(employeeId, currentPassword, newPassword) {
        if (!employeeId) {
            throw new Error('Employee ID is required');
        }
        if (!currentPassword || !newPassword) {
            throw new Error('Current and new password are required');
        }
        if (newPassword.length < 6) {
            throw new Error('New password must be at least 6 characters');
        }

        // First verify current password
        const { data: employee, error: fetchError } = await supabase
            .from('employees')
            .select('password_hash')
            .eq('employee_id', employeeId)
            .single();

        if (fetchError || !employee) {
            throw new Error('Employee not found');
        }

        if (employee.password_hash !== currentPassword) {
            throw new Error('Current password is incorrect');
        }

        // Update to new password
        const { error: updateError } = await supabase
            .from('employees')
            .update({ 
                password_hash: newPassword,
                updated_at: new Date().toISOString()
            })
            .eq('employee_id', employeeId);

        if (updateError) {
            console.error('❌ Error updating password:', updateError);
            throw new Error('Failed to update password');
        }

        return { success: true, message: 'Password updated successfully' };
    },

    // Change password for admin
    async changeAdminPassword(adminId, currentPassword, newPassword) {
        if (!adminId) {
            throw new Error('Admin ID is required');
        }
        if (!currentPassword || !newPassword) {
            throw new Error('Current and new password are required');
        }
        if (newPassword.length < 6) {
            throw new Error('New password must be at least 6 characters');
        }

        // First verify current password
        const { data: admin, error: fetchError } = await supabase
            .from('admins')
            .select('password')
            .eq('id', adminId)
            .single();

        if (fetchError || !admin) {
            throw new Error('Admin not found');
        }

        if (admin.password !== currentPassword) {
            throw new Error('Current password is incorrect');
        }

        // Update to new password
        const { error: updateError } = await supabase
            .from('admins')
            .update({ 
                password: newPassword,
                updated_at: new Date().toISOString()
            })
            .eq('id', adminId);

        if (updateError) {
            console.error('❌ Error updating admin password:', updateError);
            throw new Error('Failed to update password');
        }

        return { success: true, message: 'Password updated successfully' };
    }
};

// Timesheet related functions
export const timesheetApi = {
    async createTimesheet(timesheetData) {
        // console.log('📋 Creating timesheet with data:', timesheetData);
        
        // Ensure we have employee_id if not provided 
        if (!timesheetData.employee_id && timesheetData.user) {
            try {
                const employee = await employeeApi.getEmployeeByUser(timesheetData.user);
                timesheetData.employee_id = employee.employee_id || employee.id;
                // Also add employee name for better tracking
                timesheetData.employee_name = employee.name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim();
                // console.log('✅ Added employee_id to timesheet:', timesheetData.employee_id, 'Name:', timesheetData.employee_name);
            } catch (error) {
                console.error('⚠️ Could not fetch employee_id for timesheet:', error.message);
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
        
        // console.log('✅ Timesheet created successfully:', data[0]);
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
        // console.log('🔍 Fetching timesheets for employee:', employeeId);
        
        const { data, error } = await supabase
            .from('timesheets')
            .select(`
                *,
                employees!inner(
                    employee_id,
                    first_name,
                    last_name,
                    name,
                    email
                )
            `)
            .eq('employee_id', employeeId)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Error fetching employee timesheets:', error);
            throw error;
        }

        // console.log('✅ Fetched employee timesheets:', data.length);
        
        // Transform data to include employee name for consistency
        const enrichedData = data.map(timesheet => ({
            ...timesheet,
            employee_name: timesheet.employees?.name || 
                          `${timesheet.employees?.first_name || ''} ${timesheet.employees?.last_name || ''}`.trim() ||
                          `Employee ${timesheet.employee_id}`
        }));

        return enrichedData;
    },

    async updateTimesheet(id, updates) {
        const { data, error } = await supabase
            .from('timesheets')
            .update(updates)
            .eq('id', id)
            .select();

        if (error) throw error;
        return data[0];
    },

    // Admin function: Get ALL employee timesheets with employee names
    async getAllTimesheets() {
        // console.log('🔍 Fetching ALL employee timesheets for admin view...');
        
        const { data, error } = await supabase
            .from('timesheets')
            .select(`
                *,
                employees!inner(
                    employee_id,
                    first_name,
                    last_name,
                    name,
                    email
                )
            `)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Error fetching all timesheets:', error);
            throw error;
        }

        // console.log('✅ Fetched all timesheets:', data.length);
        
        // Transform data to include employee name
        const enrichedData = data.map(timesheet => ({
            ...timesheet,
            employee_name: timesheet.employees?.name || 
                          `${timesheet.employees?.first_name || ''} ${timesheet.employees?.last_name || ''}`.trim() ||
                          `Employee ${timesheet.employee_id}`
        }));

        return enrichedData;
    }
};

// Leave management related functions
export const leaveApi = {
  async getLeaveBalance(employeeId) {
    console.log('📊 getLeaveBalance called with employeeId:', employeeId);
    
    // STEP 1: Get current year
    const currentYear = new Date().getFullYear();
    console.log('📅 Current year:', currentYear);

    // STEP 2: Query leave_balances with TWO filters
    const { data, error } = await supabase
      .from('leave_balances')
      .select('*')
      .eq('employee_id', employeeId)
      .eq('year', currentYear)
      .maybeSingle();

    console.log('🔍 Query result:', { data, error: error?.message });

    // STEP 3: If no data, return null
    if (!data) {
      console.log('⚠️ No leave balance found for employee', employeeId, 'year', currentYear);
      return null;
    }

    // STEP 4: Extract actual database columns
    const sick_leave_total = data.sick_leave ?? 0;
    const casual_leave_total = data.casual_leave ?? 0;
    const sick_used = data.sick_used ?? 0;
    const casual_used = data.casual_used ?? 0;

    // STEP 5: Calculate remaining values
    const remaining_sick = Math.max(0, sick_leave_total - sick_used);
    const remaining_casual = Math.max(0, casual_leave_total - casual_used);

    console.log('✅ Calculated values:', {
      sick_leave_total,
      casual_leave_total,
      sick_used,
      casual_used,
      remaining_sick,
      remaining_casual
    });

    // STEP 6: Return object with correct fields
    return {
      remaining_sick,
      remaining_casual,
      sick_leave: remaining_sick, // Alias
      casual_leave: remaining_casual, // Alias
      total_sick: sick_leave_total,
      total_casual: casual_leave_total,
      used_sick: sick_used,
      used_casual: casual_used,
      year: data.year,
      employee_id: data.employee_id
    };
  },

  // STEP 7: Add getLeaveBalanceByEmployeeId function (alias)
  async getLeaveBalanceByEmployeeId(employeeId) {
    return leaveApi.getLeaveBalance(employeeId);
  },

  async createLeaveRequest(leaveData) {
  console.log('🏖️ Creating leave request with data:', leaveData);

  // Ensure we have employee_id
  if (!leaveData.employee_id && leaveData.user) {
    const employee = await employeeApi.getEmployeeByUser(leaveData.user);
    leaveData.employee_id = employee.employee_id || employee.id;
  }

  // Remove the user object and document before inserting
  const { user, document, ...cleanLeaveData } = leaveData;

  const leaveRecord = {
    employee_id: cleanLeaveData.employee_id,
    leave_type: cleanLeaveData.leave_type,
    start_date: cleanLeaveData.start_date,
    end_date: cleanLeaveData.end_date,
    reason: cleanLeaveData.reason,
    subject: cleanLeaveData.subject,
    status: cleanLeaveData.status || 'pending',
    created_at: new Date().toISOString(),
  };

  // Handle document upload (keep existing code)
  if (document) {
    try {
      const documentMetadata = await leaveApi.uploadLeaveDocument(document, cleanLeaveData.employee_id);
      if (documentMetadata) {
        leaveRecord.has_documentation = true;
        leaveRecord.document_url = documentMetadata.publicUrl;
        // ... rest of document fields
      }
    } catch (uploadError) {
      console.warn('⚠️ Continuing without document');
    }
  }

  const { data, error } = await supabase
    .from('leave_requests')
    .insert([leaveRecord])
    .select();

  if (error) throw error;
  return data[0];
},




  async updateLeaveBalance(employeeId, leaveType, newBalance) {
    const updateData = {
      [`used_${leaveType}_leaves`]: newBalance,
      updated_at: new Date().toISOString(),
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
  },

  // Update leave request status (for admin approve/reject)
  async updateLeaveStatus(leaveId, status, rejectionReason = null) {
    console.log('📝 Updating leave status:', { leaveId, status, rejectionReason });
    
    const updateData = {
      status: status,
      updated_at: new Date().toISOString()
    };
    
    // Add rejection reason if provided
    if (status === 'rejected' && rejectionReason) {
      updateData.rejection_reason = rejectionReason;
    }
    
    const { data, error } = await supabase
      .from('leave_requests')
      .update(updateData)
      .eq('id', leaveId)
      .select();
    
    if (error) {
      console.error('❌ Error updating leave status:', error);
      throw error;
    }
    
    console.log('✅ Leave status updated:', data[0]);
    return data[0];
  },


    // Check if employee has any active approved leave requests for today's date
    async checkActiveLeaveRequest(employeeId, userId) {
        // console.log('🔍 Checking for active leave requests for employee:', employeeId || userId);
        
        const today = new Date().toISOString().slice(0, 10); // Get today's date in YYYY-MM-DD format
        // console.log('📅 Today\'s date:', today);
        
        try {
            const { data, error } = await supabase
                .from('leave_requests')
                .select('*')
                .eq('status', 'approved')
                .lte('start_date', today)
                .gte('end_date', today)
                .eq('employee_id', employeeId || userId);

            if (error) {
                console.error('❌ Error checking active leave requests:', error);
                throw error;
            }

            // console.log('📋 Active leave requests found:', data?.length || 0);
            // if (data && data.length > 0) {
            //     console.log('📝 Active leave details:', data[0]);
            // }
            
            return {
                hasActiveLeave: data && data.length > 0,
                activeLeave: data && data.length > 0 ? data[0] : null
            };
        } catch (error) {
            console.error('❌ Error in checkActiveLeaveRequest:', error);
            throw error;
        }
    },

    // Check if employee has any approved leave requests that overlap a given date range
    async checkOverlappingApprovedLeave(employeeId, userId, startDate, endDate) {
        // console.log('🔍 Checking for overlapping approved leaves for:', employeeId || userId, { startDate, endDate });

        try {
            // Fetch approved leaves for the employee then perform overlap check client-side
            const { data, error } = await supabase
                .from('leave_requests')
                .select('*')
                .eq('status', 'approved')
                .eq('employee_id', employeeId || userId);

            if (error) {
                console.error('❌ Error fetching approved leaves for overlap check:', error);
                throw error;
            }

            // Normalize incoming dates (YYYY-MM-DD)
            const sDate = (startDate || '').split('T')[0];
            const eDate = (endDate || '').split('T')[0];

            const overlapping = (data || []).filter(l => {
                const ls = (l.start_date || '').split('T')[0];
                const le = (l.end_date || '').split('T')[0];
                if (!ls || !le || !sDate || !eDate) return false;

                // Overlap exists unless one range ends before the other starts
                // i.e., NOT (le < sDate OR ls > eDate)
                return !(le < sDate || ls > eDate);
            });

            // console.log('📋 Overlapping approved leaves found:', overlapping.length);
            return { hasOverlap: overlapping.length > 0, overlappingLeaves: overlapping };
        } catch (err) {
            console.error('❌ Error in checkOverlappingApprovedLeave:', err);
            throw err;
        }
    },

    // Admin: Get ALL leave requests with employee info joined
    async getAllLeaveRequestsWithEmployees() {
        // console.log('🔍 Fetching ALL leave requests with employee data for admin view...');
        try {
            // First try with explicit foreign key reference
            const { data, error } = await supabase
                .from('leave_requests')
                .select(`
                    *,
                    employees!leave_requests_employee_id_fkey (
                        id,
                        employee_id,
                        first_name,
                        last_name,
                        name,
                        email,
                        department,
                        position
                    )
                `)
                .order('created_at', { ascending: false });

            if (error) {
                console.warn('⚠️ Join with foreign key failed, trying manual lookup:', error);
                
                // Fallback: Get all leave requests and manually join
                const { data: requests, error: reqError } = await supabase
                    .from('leave_requests')
                    .select('*')
                    .order('created_at', { ascending: false });
                
                if (reqError) throw reqError;
                
                // Get unique employee IDs
                const employeeIds = [...new Set(requests.map(r => r.employee_id).filter(Boolean))];
                // console.log('🆔 Unique employee IDs to lookup:', employeeIds);
                
                // Fetch employees - use employee_id column instead of id
                const { data: employees, error: empError } = await supabase
                    .from('employees')
                    .select('*')
                    .in('employee_id', employeeIds);
                
                if (empError) {
                    console.error('❌ Error fetching employees by employee_id:', empError);
                    
                    // Try alternative: maybe the table uses a different primary key
                    // console.log('🔄 Trying to fetch all employees and match manually...');
                    const { data: allEmployees, error: allEmpError } = await supabase
                        .from('employees')
                        .select('*');
                    
                    if (allEmpError) {
                        console.error('❌ Error fetching all employees:', allEmpError);
                        return requests;
                    }
                    
                    // console.log('👥 Fetched all employees:', allEmployees?.length || 0);
                    // console.log('📋 Sample employee record:', allEmployees?.[0]);
                    
                    // Create lookup map using employee_id
                    const empMap = {};
                    allEmployees?.forEach(emp => {
                        if (emp.employee_id) {
                            empMap[emp.employee_id] = emp;
                        }
                    });
                    
                    // console.log('🗺️ Employee map keys:', Object.keys(empMap));
                    
                    // Merge data
                    const enriched = requests.map(req => ({
                        ...req,
                        employees: empMap[req.employee_id] || null
                    }));
                    
                    // console.log('✅ Manually joined leave requests with employees:', enriched.length);
                    // console.log('📋 Sample enriched request:', enriched[0]);
                    return enriched;
                }
                
                // console.log('👥 Fetched employees:', employees?.length || 0);
                
                // Create lookup map using employee_id
                const empMap = {};
                employees?.forEach(emp => {
                    if (emp.employee_id) {
                        empMap[emp.employee_id] = emp;
                    }
                });
                
                // Merge data
                const enriched = requests.map(req => ({
                    ...req,
                    employees: empMap[req.employee_id] || null
                }));
                
                // console.log('✅ Manually joined leave requests with employees:', enriched.length);
                return enriched;
            }
            
            // console.log('✅ Fetched leave requests with join (admin):', data?.length || 0);
            return data || [];
        } catch (err) {
            console.error('❌ Error fetching all leave requests with employees:', err);
            // Final fallback to simple fetch without join
            const { data: simpleData, error: simpleError } = await supabase
                .from('leave_requests')
                .select('*')
                .order('created_at', { ascending: false });
            if (simpleError) throw simpleError;
            return simpleData || [];
        }
    },

    // Function to get document URL for a leave request
    async getLeaveRequestDocument(leaveRequestId) {
        const { data, error } = await supabase
          .from('leave_requests')
          .select('document_url, document_name')
          .eq('id', leaveRequestId)
          .single();

        if (error) throw error;
        return data;
    },

    async uploadLeaveDocument(file, employeeId) {
        if (!file) return null;

        try {
            const fileExt = file.name.split('.').pop();
            const fileName = `${employeeId}-${Date.now()}.${fileExt}`;
            const filePath = fileName; // Don't include folder in path, just the filename

            // console.log('📎 Uploading document:', {
            //     fileName: file.name,
            //     fileSize: file.size,
            //     fileType: file.type,
            //     employeeId,
            //     filePath
            // });

            // Upload file to Supabase Storage
            const { data, error } = await supabase.storage
                .from('leave-documents')
                .upload(filePath, file);

            if (error) {
                console.error('❌ Error uploading document:', error);
                throw error;
            }

            // console.log('✅ Document uploaded successfully:', data);

            // Get public URL for the uploaded file
            const { data: { publicUrl } } = supabase.storage
                .from('leave-documents')
                .getPublicUrl(filePath);

            // console.log('🔗 Generated public URL:', publicUrl);

            // Return comprehensive document metadata
            return {
                path: data.path,
                publicUrl: publicUrl,
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                uploadedAt: new Date().toISOString()
            };
        } catch (error) {
            console.error('❌ Document upload failed:', error);
            throw new Error(`Failed to upload document: ${error.message}`);
        }
    }
};

// Employee management related functions
export const employeeApi = {
    // Bulk fetch map of employee names by both id and employee_id
    async getEmployeeNamesMap(ids) {
        if (!ids || ids.length === 0) return {};
        const unique = [...new Set(ids.map((v) => String(v)))];

        const buildName = (row) =>
            row.name || `${row.first_name || ''} ${row.last_name || ''}`.trim() || `Employee ${String(row.id).slice(-4)}`;

        const map = {};
        try {
            // Query by employee_id
            const { data: byEmpId, error: e1 } = await supabase
                .from('employees')
                .select('id, employee_id, first_name, last_name, name')
                .in('employee_id', unique);
            if (!e1 && byEmpId) {
                for (const row of byEmpId) {
                    if (row.employee_id) map[String(row.employee_id)] = buildName(row);
                }
            }

            // Query by id
            const { data: byId, error: e2 } = await supabase
                .from('employees')
                .select('id, employee_id, first_name, last_name, name')
                .in('id', unique);
            if (!e2 && byId) {
                for (const row of byId) {
                    if (row.id) map[String(row.id)] = buildName(row);
                }
            }
        } catch (err) {
            console.error('❌ getEmployeeNamesMap error:', err);
        }
        return map;
    },
    // Get employee ID by user name, email, or user ID
    async getEmployeeByUser(user) {
        // console.log('🔍 Looking up employee for user:', user);
        
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
                    // console.log('✅ Found employee by employee_id:', data);
                    return data;
                }
            } catch (e) {
                console.error('⚠️ Employee lookup by employee_id failed:', e.message);
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
                    // console.log('✅ Found employee by email:', data);
                    return data;
                }
            } catch (e) {
                console.error('⚠️ Employee lookup by email failed:', e.message);
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
                    // console.log('✅ Found employee by exact name:', data);
                    return data;
                }
            } catch (e) {
                console.error('⚠️ Employee lookup by exact name failed:', e.message);
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
                    // console.log('✅ Found employee by partial name match:', data);
                    return data;
                }
            } catch (e) {
                console.error('⚠️ Employee lookup by partial name failed:', e.message);
                error = e;
            }
        }

        // If all strategies failed
        console.error('❌ All employee lookup strategies failed for user:', user);
        throw new Error(`Employee not found in database. Please ensure the employee record exists with email: ${user.email} or name: ${user.name}`);
    },

    async createEmployee(employeeData) {
        // console.log('👤 Creating employee with data:', employeeData);
        
        // Process the employee data
        const processedData = {
            ...employeeData,
            // For demo purposes, storing password as-is. In production, hash it!
            password_hash: employeeData.password,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        // Remove the plain password field
        delete processedData.password;
        
        // Ensure first_name and last_name are properly set
        // if (processedData.first_name && processedData.last_name) {
        //     console.log('✅ Employee has first_name and last_name:', {
        //         first_name: processedData.first_name,
        //         last_name: processedData.last_name
        //     });
        // } else {
        //     console.log('⚠️ Employee missing first_name or last_name:', {
        //         first_name: processedData.first_name,
        //         last_name: processedData.last_name
        //     });
        // }
        
        const { data, error } = await supabase
            .from('employees')
            .insert([processedData])
            .select();
        
        if (error) {
            console.error('❌ Error creating employee:', error);
            throw error;
        }
        
        // console.log('✅ Employee created successfully:', data[0]);
        return data[0];
    },

    async getEmployees() {
        // console.log('📋 Fetching employees from database...');
        
        try {
            const { data, error } = await supabase
                .from('employees')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Database error in getEmployees:', error);
                throw error;
            }
            
            // console.log('✅ Successfully fetched employees:', data?.length || 0);
            if (data && data.length > 0) {
                // console.log('📋 Sample employee record:', {
                //     id: data[0].id,
                //     employee_id: data[0].employee_id,
                //     name: data[0].name,
                //     email: data[0].email
                // });
            }
            
            return data || [];
        } catch (err) {
            console.error('❌ Exception in getEmployees:', err);
            throw err;
        }
    },

    async updateEmployee(employeeId, updates) {
        // console.log('🔄 Updating employee:', { employeeId, updates });
        
        if (!employeeId) {
            throw new Error('Employee ID is required for updating employee');
        }
        
        const { data, error } = await supabase
            .from('employees')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('employee_id', employeeId)
            .select();

        if (error) {
            console.error('❌ Error updating employee:', error);
            throw error;
        }
        
        // console.log('✅ Employee updated successfully:', data[0]);
        return data[0];
    },

    async deleteEmployee(employeeId) {
        const { error } = await supabase
            .from('employees')
            .delete()
            .eq('employee_id', employeeId);

        if (error) throw error;
        return true;
    },

    // Update only allowed profile fields (user-editable fields)
    async updateEmployeeProfile(employeeId, profileData) {
        if (!employeeId) {
            throw new Error('Employee ID is required for updating profile');
        }

        // Only allow these fields to be updated by the user
        const allowedFields = ['first_name', 'last_name', 'name', 'phone', 'email'];
        const sanitizedUpdates = {};
        
        for (const field of allowedFields) {
            if (profileData[field] !== undefined) {
                sanitizedUpdates[field] = profileData[field];
            }
        }

        // Auto-generate name from first_name and last_name if provided
        if (sanitizedUpdates.first_name || sanitizedUpdates.last_name) {
            const firstName = sanitizedUpdates.first_name || profileData.first_name || '';
            const lastName = sanitizedUpdates.last_name || profileData.last_name || '';
            sanitizedUpdates.name = `${firstName} ${lastName}`.trim();
        }

        sanitizedUpdates.updated_at = new Date().toISOString();

        const { data, error } = await supabase
            .from('employees')
            .update(sanitizedUpdates)
            .eq('employee_id', employeeId)
            .select();

        if (error) {
            console.error('❌ Error updating employee profile:', error);
            throw error;
        }
        
        return data[0];
    },

    // Get full employee profile by employee_id
    async getEmployeeProfile(employeeId) {
        const { data, error } = await supabase
            .from('employees')
            .select('*')
            .eq('employee_id', employeeId)
            .single();

        if (error) {
            console.error('❌ Error fetching employee profile:', error);
            throw error;
        }
        
        return data;
    }
};

// Holidays API functions
export const holidayApi = {
    // Get all holidays (optionally filter by year)
    async getHolidays(year = null) {
        console.log('📅 Fetching holidays from database...', year ? `for year ${year}` : 'all');
        
        let query = supabase
            .from('holidays')
            .select('*')
            .order('date', { ascending: true });
        
        if (year) {
            // Filter by year - dates are stored as YYYY-MM-DD
            query = query
                .gte('date', `${year}-01-01`)
                .lte('date', `${year}-12-31`);
        }
        
        const { data, error } = await query;
        
        if (error) {
            console.error('❌ Error fetching holidays:', error);
            throw error;
        }
        
        console.log(`✅ Fetched ${data?.length || 0} holidays`);
        return data || [];
    },

    // Upload holidays from Excel file data
    async uploadHolidays(holidays) {
        console.log('📤 Uploading holidays to database...', holidays.length, 'records');
        
        if (!holidays || holidays.length === 0) {
            throw new Error('No holidays to upload');
        }

        // Group holidays by year
        const holidaysByYear = {};
        holidays.forEach(h => {
            const year = h.date.split('-')[0];
            if (!holidaysByYear[year]) {
                holidaysByYear[year] = [];
            }
            holidaysByYear[year].push(h);
        });

        console.log('📊 Holidays grouped by year:', Object.keys(holidaysByYear));

        // For each year, delete existing holidays first, then insert new ones
        for (const year of Object.keys(holidaysByYear)) {
            console.log(`🗑️ Deleting existing holidays for year ${year}...`);
            
            const { error: deleteError } = await supabase
                .from('holidays')
                .delete()
                .gte('date', `${year}-01-01`)
                .lte('date', `${year}-12-31`);

            if (deleteError) {
                console.error(`❌ Error deleting holidays for ${year}:`, deleteError);
                throw deleteError;
            }
        }

        // Prepare records for insertion
        const records = holidays.map(h => ({
            date: h.date,
            name: h.name || 'Holiday',
            created_at: new Date().toISOString()
        }));

        // Insert new holidays
        const { data, error } = await supabase
            .from('holidays')
            .insert(records)
            .select();

        if (error) {
            console.error('❌ Error inserting holidays:', error);
            throw error;
        }

        console.log(`✅ Successfully uploaded ${data?.length || 0} holidays`);
        return data;
    },

    // Add a single holiday
    async addHoliday(date, name) {
        console.log('➕ Adding holiday:', date, name);
        
        const { data, error } = await supabase
            .from('holidays')
            .insert({
                date,
                name: name || 'Holiday',
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) {
            console.error('❌ Error adding holiday:', error);
            throw error;
        }

        return data;
    },

    // Delete a holiday by ID
    async deleteHoliday(id) {
        console.log('🗑️ Deleting holiday:', id);
        
        const { error } = await supabase
            .from('holidays')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('❌ Error deleting holiday:', error);
            throw error;
        }

        return { success: true };
    },

    // Delete all holidays for a specific year
    async deleteHolidaysByYear(year) {
        console.log('🗑️ Deleting all holidays for year:', year);
        
        const { error } = await supabase
            .from('holidays')
            .delete()
            .gte('date', `${year}-01-01`)
            .lte('date', `${year}-12-31`);

        if (error) {
            console.error('❌ Error deleting holidays:', error);
            throw error;
        }

        return { success: true };
    }
};

// Timesheet Compliance API - Warning & Auto Leave Deduction
export const timesheetComplianceApi = {
    
     
    formatDateLocal(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    },

    /**
     * Check for missing timesheets and return warnings/auto-leave info
     * Day+1 = Warning, Day+2 = Auto Leave Deduction
     * Excludes weekends (Sundays) and holidays
     * Only checks current year - fresh start each year
     */
    async checkMissingTimesheets(employeeId) {
        console.log('🔍 Checking missing timesheets for employee:', employeeId);
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const currentYear = today.getFullYear();
        const todayStr = this.formatDateLocal(today);
        
        console.log(`📅 Today is: ${todayStr} (year: ${currentYear})`);
        
        const result = {
            warnings: [],        // Days that need warning (Day+1)
            autoLeaveRequired: [], // Days that need auto-leave (Day+2)
            processed: []        // Already processed auto-leaves
        };
        
        try {
            // Get holidays for the current year
            const holidays = await holidayApi.getHolidays(currentYear);
            const holidayDates = new Set(holidays.map(h => h.date));
            
            // FRESH START: Always start from January 1st of current year
            // Never check previous year's timesheets
            const janFirst = new Date(currentYear, 0, 1); // January 1st of current year
            janFirst.setHours(0, 0, 0, 0);
            
            // Start date is ALWAYS Jan 1st of current year (fresh start)
            const startDate = janFirst;
            const startDateStr = `${currentYear}-01-01`;
            
            console.log(`📅 Checking timesheets from ${startDateStr} (current year: ${currentYear}, today: ${today.toISOString().split('T')[0]})`);
            
            const { data: timesheets, error: tsError } = await supabase
                .from('timesheets')
                .select('date')
                .eq('employee_id', employeeId)
                .gte('date', startDateStr);
            
            if (tsError) throw tsError;
            
            // Create set of dates with timesheets
            const timesheetDates = new Set(
                (timesheets || []).map(t => t.date?.split('T')[0])
            );
            
            console.log('📋 Timesheets found for current year:', Array.from(timesheetDates));
            
            // Get existing auto-leave records to avoid duplicates
            // Use broader check - any leave for a single day in this period
            const { data: existingAutoLeaves, error: alError } = await supabase
                .from('leave_requests')
                .select('start_date, end_date, reason')
                .eq('employee_id', employeeId)
                .gte('start_date', startDateStr);
            
            if (alError) throw alError;
            
            // Create set of dates that already have auto-leaves (broader matching)
            const autoLeaveDates = new Set();
            (existingAutoLeaves || []).forEach(leave => {
                const startDate = leave.start_date?.split('T')[0];
                const endDate = leave.end_date?.split('T')[0];
                const reason = (leave.reason || '').toLowerCase();
                
                // Only consider single-day leaves with timesheet-related reasons as auto-leaves
                if (startDate === endDate && 
                    (reason.includes('timesheet') || reason.includes('auto'))) {
                    autoLeaveDates.add(startDate);
                }
            });
            
            console.log('📋 Existing auto-leave dates:', Array.from(autoLeaveDates));
            
            // Check each day from startDate until yesterday (only current year)
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayStr = this.formatDateLocal(yesterday);
            
            console.log(`📆 Looping from ${startDateStr} to ${yesterdayStr}`);
            
            for (let d = new Date(startDate); d <= yesterday; d.setDate(d.getDate() + 1)) {
                // Use local date format to avoid timezone issues
                const dateStr = this.formatDateLocal(d);
                const dateYear = d.getFullYear();
                const dayOfWeek = d.getDay();
                
                // CRITICAL: Skip any date not in current year (extra safety check)
                if (dateYear !== currentYear) {
                    console.log(`⏭️ Skipping ${dateStr} - not in current year ${currentYear}`);
                    continue;
                }
                
                // Skip Sundays (0) and holidays
                if (dayOfWeek === 0 || holidayDates.has(dateStr)) {
                    continue;
                }
                
                // Check if timesheet exists for this date
                if (timesheetDates.has(dateStr)) {
                    continue; // Timesheet submitted, all good
                }
                
                // Calculate days since this missing date
                const daysDiff = Math.floor((today - d) / (1000 * 60 * 60 * 24));
                
                console.log(`❓ Missing timesheet for ${dateStr}, daysDiff: ${daysDiff}`);
                
                if (autoLeaveDates.has(dateStr)) {
                    // Already processed as auto-leave
                    result.processed.push({
                        date: dateStr,
                        message: `Auto-leave already applied for ${dateStr}`
                    });
                } else if (daysDiff >= 2) {
                    // Day+2 or more: Needs auto-leave deduction
                    result.autoLeaveRequired.push({
                        date: dateStr,
                        daysDiff,
                        message: `Timesheet for ${dateStr} was not submitted. Leave will be deducted.`
                    });
                } else if (daysDiff === 1) {
                    // Day+1: Warning only
                    result.warnings.push({
                        date: dateStr,
                        message: `Timesheet for ${dateStr} is not submitted. Please submit today to avoid leave deduction.`
                    });
                }
            }
            
            console.log('📋 Missing timesheet check result:', result);
            return result;
            
        } catch (error) {
            console.error('❌ Error checking missing timesheets:', error);
            throw error;
        }
    },

    /**
     * Create auto-leave record for missing timesheet
     * Deducts from casual leave first, then sick leave
     */
    async createAutoLeaveForMissingTimesheet(employeeId, missingDate) {
        console.log('⚠️ Creating auto-leave for missing timesheet:', employeeId, missingDate);
        
        // Generate a unique key for this operation to prevent race conditions
        const operationKey = `auto-leave-${employeeId}-${missingDate}`;
        
        // Check if this operation is already in progress (race condition prevention)
        if (this._processingLeaves && this._processingLeaves.has(operationKey)) {
            console.log('⏭️ Auto-leave creation already in progress for:', operationKey);
            return { skipped: true, reason: 'already_processing' };
        }
        
        // Initialize processing set if not exists
        if (!this._processingLeaves) {
            this._processingLeaves = new Set();
        }
        this._processingLeaves.add(operationKey);
        
        try {
            // CRITICAL: Check if ANY leave already exists for this date (broader check)
            // This catches auto-leaves regardless of exact reason text
            const { data: existingLeaves, error: checkError } = await supabase
                .from('leave_requests')
                .select('id, reason, status')
                .eq('employee_id', employeeId)
                .eq('start_date', missingDate)
                .eq('end_date', missingDate);
            
            if (checkError) {
                console.error('⚠️ Error checking existing auto-leave:', checkError);
            }
            
            // Check if any auto-leave (with timesheet-related reason) exists
            const autoLeaveExists = existingLeaves?.some(leave => 
                leave.reason?.toLowerCase().includes('timesheet') ||
                leave.reason?.toLowerCase().includes('auto')
            );
            
            if (autoLeaveExists) {
                console.log('⏭️ Auto-leave already exists for this date, skipping:', missingDate);
                this._processingLeaves.delete(operationKey);
                return existingLeaves[0]; // Return existing record instead of creating duplicate
            }
            
            // Get current leave balance
            const leaveBalance = await leaveApi.getLeaveBalance(employeeId);
            
            if (!leaveBalance) {
                console.warn('⚠️ No leave balance found for employee:', employeeId);
                // Still create the record but mark as unpaid/no balance
            }
            
            // Determine which leave type to deduct (casual first, then sick)
            let leaveType = 'casual';
            if (leaveBalance && leaveBalance.remaining_casual <= 0) {
                leaveType = 'sick';
            }
            
            // Create auto-leave request
            const leaveRecord = {
                employee_id: employeeId,
                leave_type: leaveType,
                start_date: missingDate,
                end_date: missingDate,
                reason: 'Timesheet not submitted on this day',
                subject: 'Auto Leave - Missing Timesheet',
                status: 'approved', // Auto-approved since it's a system action
                created_at: new Date().toISOString()
            };
            
            const { data, error } = await supabase
                .from('leave_requests')
                .insert([leaveRecord])
                .select();
            
            if (error) {
                // Check if it's a duplicate key error (race condition at DB level)
                if (error.code === '23505' || error.message?.includes('duplicate')) {
                    console.log('⏭️ Duplicate detected at DB level, skipping:', missingDate);
                    this._processingLeaves.delete(operationKey);
                    return { skipped: true, reason: 'duplicate_at_db' };
                }
                throw error;
            }
            
            // Update leave balance - increment used count
            const usedColumn = leaveType === 'casual' ? 'casual_used' : 'sick_used';
            const currentUsed = leaveType === 'casual' 
                ? (leaveBalance?.used_casual || 0) 
                : (leaveBalance?.used_sick || 0);
            
            const { error: updateError } = await supabase
                .from('leave_balances')
                .update({ 
                    [usedColumn]: currentUsed + 1,
                    updated_at: new Date().toISOString()
                })
                .eq('employee_id', employeeId)
                .eq('year', new Date().getFullYear());
            
            if (updateError) {
                console.error('⚠️ Error updating leave balance:', updateError);
                // Don't throw - the leave request was created successfully
            }
            
            console.log('✅ Auto-leave created successfully:', data[0]);
            this._processingLeaves.delete(operationKey);
            return data[0];
            
        } catch (error) {
            console.error('❌ Error creating auto-leave:', error);
            this._processingLeaves.delete(operationKey);
            throw error;
        }
    },

    /**
     * Process all pending auto-leaves for an employee
     * Called when employee logs in or dashboard loads
     */
    async processAutoLeaves(employeeId) {
        console.log('🔄 Processing auto-leaves for employee:', employeeId);
        
        const checkResult = await this.checkMissingTimesheets(employeeId);
        const processedLeaves = [];
        
        for (const missing of checkResult.autoLeaveRequired) {
            try {
                const leave = await this.createAutoLeaveForMissingTimesheet(employeeId, missing.date);
                processedLeaves.push({
                    date: missing.date,
                    success: true,
                    leave
                });
            } catch (error) {
                processedLeaves.push({
                    date: missing.date,
                    success: false,
                    error: error.message
                });
            }
        }
        
        return {
            warnings: checkResult.warnings,
            autoLeaveRequired: checkResult.autoLeaveRequired,
            processed: [...checkResult.processed, ...processedLeaves]
        };
    }
};

// Admin Dashboard API functions
export const adminApi = {
    // Get all admins from the admins table
    async getAdmins() {
        // console.log('👥 Fetching all admins from database...');
        
        const { data, error } = await supabase
            .from('admins')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Error fetching admins:', error);
            throw error;
        }

        // console.log('✅ Admins fetched successfully:', data?.length || 0);
        return data || [];
    },

    // Get all employees (admins are NOT employees)
    async getAllEmployeesAndAdmins() {
        // console.log('👥 Fetching employees from database...');
        
        try {
            // Get employees from employees table
            // console.log('📋 Fetching from employees table...');
            const employees = await employeeApi.getEmployees();
            // console.log('✅ Employees loaded from database:', employees.length, employees.length > 0 ? employees.slice(0, 2) : 'No employees found');
            
            // Add role field to employees for consistency
            const employeesWithRole = employees.map(emp => ({
                ...emp,
                role: emp.role || 'employee',
                isAdmin: false
            }));
            
            // console.log('🎯 Final result:');
            console.log(`   - Total employees: ${employeesWithRole.length}`);
            // console.log('   - Sample data:', employeesWithRole.slice(0, 3));
            return employeesWithRole;
            
        } catch (error) {
            console.error('❌ Error fetching employees:', error);
            throw error;
        }
    },

    // Simple employee name fetcher
    getEmployeeName: async (userId) => {
        try {
            // console.log('🔍 Fetching employee name for user_id:', userId);
            
            const { data: employee, error } = await supabase
                .from('employees')
                .select('id, employee_id, first_name, last_name, name')
                .or(`employee_id.eq.${userId},id.eq.${userId}`)
                .single();

            if (error) {
                // console.log('❌ Error fetching employee:', error);
                return null;
            }

            const name = employee.name || `${employee.first_name || ''} ${employee.last_name || ''}`.trim() || `Employee ${userId.slice(-4)}`;
            // console.log('✅ Found employee name:', name);
            return name;
        } catch (error) {
            // console.log('❌ Exception in getEmployeeName:', error);
            return `Employee ${userId.slice(-4)}`;
        }
    },

    // Debug function to check database connectivity and data
    async debugDatabase() {
        // console.log('🔍 Debugging database connection and data...');
        
        try {
            // Test leave_requests table
            const { data: leaveData, error: leaveError, count: leaveCount } = await supabase
                .from('leave_requests')
                .select('*', { count: 'exact' })
                .limit(5);
            
            // console.log('📋 Leave requests table:', {
            //     data: leaveData,
            //     error: leaveError,
            //     count: leaveCount
            // });

            // Test employees table
            const { data: empData, error: empError, count: empCount } = await supabase
                .from('employees')
                .select('*', { count: 'exact' })
                .limit(5);
            
            // console.log('👥 Employees table:', {
            //     data: empData,
            //     error: empError,
            //     count: empCount
            // });

            // Check for potential relationships
            if (leaveData && leaveData.length > 0 && empData && empData.length > 0) {
                // console.log('🔗 Checking relationships:');
                // console.log('📝 Sample leave request employee_id:', leaveData[0].employee_id);
                // console.log('👤 Sample employee employee_id:', empData[0].employee_id);
                // console.log('👤 Sample employee id:', empData[0].id);
                // console.log('👤 Sample employee name:', empData[0].name);
                
                // Try to find matching patterns
                const employeeIdsFromRequests = leaveData.map(req => req.employee_id).filter(Boolean);
                const employeeIds = empData.map(emp => emp.employee_id).filter(Boolean);
                const empIds = empData.map(emp => emp.id).filter(Boolean);
                
                // console.log('🔍 Unique employee_ids in leave_requests:', [...new Set(employeeIdsFromRequests)]);
                // console.log('🔍 Unique employee_ids in employees:', [...new Set(employeeIds)]);
                // console.log('🔍 Unique ids in employees:', [...new Set(empIds)]);
                
                // Check for matches
                const matchByEmployeeId = employeeIdsFromRequests.some(empId => empIds.includes(empId));
                
                // console.log('🎯 Match found (employee_id -> employee.id):', matchByEmployeeId);
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
            // console.log('📈 Getting dashboard stats for employees only...');
            
            // Get all employees from employees table (NOT admins)
            const { data: employees, error: empError } = await supabase
                .from('employees')
                .select('id, status, created_at, name, email');
            
            if (empError) {
                console.error('❌ Error fetching employees:', empError);
            }
            
            const activeEmployees = (employees || []).filter(emp => 
                !emp.status || emp.status === 'active' || emp.status === 'Active'
            );
            
            // console.log('📊 Employee Statistics:');
            console.log(`   - Total Employees: ${employees?.length || 0}`);
            console.log(`   - Active Employees: ${activeEmployees.length}`);

            // Get pending leave requests (try different status approaches)
            let { data: pendingLeaves, error: leaveError } = await supabase
                .from('leave_requests')
                .select('*')
                .eq('status', 'pending');
            
            // If no pending requests or status column doesn't exist, get all requests
            if (leaveError || !pendingLeaves || pendingLeaves.length === 0) {
                // console.log('⚠️ No pending status found, getting all leave requests...');
                const fallback = await supabase
                    .from('leave_requests')
                    .select('*');
                
                if (!fallback.error && fallback.data) {
                    pendingLeaves = fallback.data.filter(req => 
                        !req.status || req.status === 'pending' || req.status === null
                    );
                    // console.log('📋 Found leave requests (filtered):', pendingLeaves.length);
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

            // Calculate new employees this month
            const newEmployeesThisMonth = (employees || []).filter(emp => 
                emp.created_at && emp.created_at.startsWith(currentMonth)
            ).length;

            // Calculate employees currently on leave
            const employeesOnLeave = activeLeaves?.length || 0;
            const activeEmployeesToday = Math.max(0, activeEmployees.length - employeesOnLeave);
            
            // console.log('📊 Dashboard stats calculated:', {
            //     totalEmployees: employees?.length || 0,
            //     activeEmployees: activeEmployees.length,
            //     newEmployeesThisMonth,
            //     pendingRequests: pendingLeaves.length,
            //     approvedLeaves: approvedLeaves?.length || 0,
            //     employeesOnLeave,
            //     activeEmployeesToday,
            //     pendingTimesheets: pendingTimesheets?.length || 0
            // });

            return {
                // Employee counts (admins are NOT included)
                totalEmployees: employees?.length || 0,
                employeesCount: employees?.length || 0,
                activeStaff: activeEmployees.length,
                
                // New employees this month
                newEmployeesThisMonth,
                
                // Leave statistics
                pendingRequests: pendingLeaves.length,
                approvedLeaves: approvedLeaves?.length || 0,
                employeesOnLeave,
                
                // Active today
                activeEmployeesToday,
                
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
        // console.log('🔍 Fetching pending leave requests with direct employee join...');
        
        const { data, error } = await supabase
            .from('leave_requests')
            .select(`
                *,
                employees (
                    id,
                    employee_id,
                    first_name,
                    last_name,
                    name,
                    email,
                    role
                )
            `)
            .or('status.eq.pending,status.is.null')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Error fetching pending leaves with join:', error);
            throw error;
        }

        // console.log('✅ Fetched pending leaves with employee data:', data);
        return data;
    },

    async getPendingLeaveRequestsWithEmployeeData() {
        // console.log('🔍 Fetching pending leave requests with direct employee join...');
        
        const { data, error } = await supabase
            .from('leave_requests')
            .select(`
                *,
                employees (
                    id,
                    employee_id,
                    first_name,
                    last_name,
                    name,
                    email,
                    role
                )
            `)
            .or('status.eq.pending,status.is.null')
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Error fetching pending leaves with join:', error);
            throw error;
        }

        // console.log('✅ Fetched pending leaves with employee data:', data);
        return data;
    },

    async approveLeaveRequest(requestId) {
        // console.log('✅ Approving leave request:', requestId);
        
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
        
        // Calculate the number of leave days
        const startDate = new Date(leaveRequest.start_date);
        const endDate = new Date(leaveRequest.end_date);
        const leaveDays = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
        
        // Update leave_balances to reflect the approved leave
        if (leaveRequest.employee_id && leaveRequest.leave_type) {
            const leaveType = leaveRequest.leave_type.toLowerCase();
            const usedColumn = leaveType === 'casual' ? 'casual_used' : 'sick_used';
            const currentYear = new Date().getFullYear();
            
            // Get current balance
            const { data: balanceData } = await supabase
                .from('leave_balances')
                .select('*')
                .eq('employee_id', leaveRequest.employee_id)
                .eq('year', currentYear)
                .maybeSingle();
            
            if (balanceData) {
                const currentUsed = balanceData[usedColumn] || 0;
                
                const { error: updateError } = await supabase
                    .from('leave_balances')
                    .update({ 
                        [usedColumn]: currentUsed + leaveDays,
                        updated_at: new Date().toISOString()
                    })
                    .eq('employee_id', leaveRequest.employee_id)
                    .eq('year', currentYear);
                
                if (updateError) {
                    console.error('⚠️ Error updating leave balance:', updateError);
                } else {
                    console.log(`✅ Leave balance updated: ${usedColumn} increased by ${leaveDays}`);
                }
            }
        }
        
        // Update employee status to "Leave"
        if (leaveRequest.employee_id) {
            const employeeIdToUpdate = leaveRequest.employee_id;
            // console.log('📝 Updating employee status to Leave for ID:', employeeIdToUpdate);
            
            // Try updating employees table first (by id)
            const { data: empUpdate1, error: empError1 } = await supabase
                .from('employees')
                .update({ status: 'Leave' })
                .eq('id', employeeIdToUpdate);
            
            if (empError1) {
                console.warn('⚠️ Failed to update employees table by id:', empError1.message);
                
                // Try updating by employee_id field if id failed
                const { data: empUpdate2, error: empError2 } = await supabase
                    .from('employees')
                    .update({ status: 'Leave' })
                    .eq('employee_id', employeeIdToUpdate);
                
                if (empError2) {
                    console.warn('⚠️ Failed to update employees table by employee_id:', empError2.message);
                } else {
                    // console.log('✅ Employee status updated to Leave (via employee_id field)');
                }
            } else {
                // console.log('✅ Employee status updated to Leave (via id field)');
            }
        } else {
            console.error('⚠️ No employee_id found in leave request, cannot update employee status');
        }
        
        // console.log('✅ Leave request approved successfully:', data[0]);
        return data[0];
    },

    async rejectLeaveRequest(requestId, reason = '') {
        // console.log('❌ Rejecting leave request:', requestId);
        
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
                status: 'rejected'
            })
            .eq('id', requestId)
            .select();
        
        if (error) {
            console.error('❌ Error rejecting request:', error);
            throw error;
        }
        
        // Update employee status back to "Active" since leave was rejected
        if (leaveRequest.employee_id) {
            const employeeIdToUpdate = leaveRequest.employee_id;
            // console.log('📝 Updating employee status to Active for ID:', employeeIdToUpdate);
            
            // Try updating employees table first (by id)
            const { data: empUpdate1, error: empError1 } = await supabase
                .from('employees')
                .update({ status: 'Active' })
                .eq('id', employeeIdToUpdate);
            
            if (empError1) {
                console.warn('⚠️ Failed to update employees table by id:', empError1.message);
                
                // Try updating by employee_id field if id failed
                const { data: empUpdate2, error: empError2 } = await supabase
                    .from('employees')
                    .update({ status: 'Active' })
                    .eq('employee_id', employeeIdToUpdate);
                
                if (empError2) {
                    console.warn('⚠️ Failed to update employees table by employee_id:', empError2.message);
                } else {
                    // console.log('✅ Employee status updated to Active (via employee_id field)');
                }
            } else {
                // console.log('✅ Employee status updated to Active (via id field)');
            }
        } else {
            console.error('⚠️ No employee_id found in leave request, cannot update employee status');
        }
        
        // console.log('✅ Leave request rejected successfully:', data[0]);
        return data[0];
    },

    // Function to update employee status when leave ends
    async updateEmployeeStatusAfterLeave(userId) {
        // console.log('🔄 Checking if employee should return to active status:', userId);
        
        const today = new Date().toISOString().slice(0, 10);
        
        // Check if employee has any active leaves today
        const { data: activeLeaves, error } = await supabase
            .from('leave_requests')
            .select('*')
            .eq('status', 'approved')
            .lte('start_date', today)
            .gte('end_date', today)
            .eq('employee_id', userId);
        
        if (error) {
            console.error('❌ Error checking active leaves:', error);
            return;
        }
        
        // If no active leaves, set status back to Active
        if (!activeLeaves || activeLeaves.length === 0) {
            // console.log('📝 No active leaves found, setting employee status to Active');
            
            // Try updating by employee_id first
            const { error: empError1 } = await supabase
                .from('employees')
                .update({ status: 'Active' })
                .eq('employee_id', userId);
            
            if (empError1) {
                // If that fails, try updating by id
                const { error: empError2 } = await supabase
                    .from('employees')
                    .update({ status: 'Active' })
                    .eq('id', userId);
                
                if (empError2) {
                    console.error('❌ Failed to update employee status:', empError2);
                } else {
                    // console.log('✅ Employee status updated to Active (by id)');
                }
            } else {
                // console.log('✅ Employee status updated to Active (by employee_id)');
            }
        } else {
            // console.log('📅 Employee still has active leaves, keeping On-leave status');
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

// Account Details API functions
export const accountDetailsApi = {
    // Get account details for an employee
    async getAccountDetails(employeeId) {
        console.log('📋 Getting account details for employee:', employeeId);
        
        const { data, error } = await supabase
            .from('account_details')
            .select('*')
            .eq('employee_id', employeeId)
            .maybeSingle();
        
        if (error) {
            console.error('❌ Error fetching account details:', error);
            throw error;
        }
        
        return data;
    },

    // Save (insert or update) account details
    async saveAccountDetails(employeeId, details) {
        console.log('💾 Saving account details for employee:', employeeId);
        
        // Check if record exists
        const existing = await this.getAccountDetails(employeeId);
        
        const accountData = {
            employee_id: employeeId,
            bank_name: details.bank_name || null,
            bank_account_number: details.bank_account_number || null,
            ifsc_code: details.ifsc_code || null,
            aadhaar_number: details.aadhaar_number || null,
            aadhaar_address: details.aadhaar_address || null,
            pan_number: details.pan_number || null,
            updated_at: new Date().toISOString()
        };
        
        let result;
        
        if (existing) {
            // Update existing record
            const { data, error } = await supabase
                .from('account_details')
                .update(accountData)
                .eq('employee_id', employeeId)
                .select();
            
            if (error) throw error;
            result = data[0];
        } else {
            // Insert new record
            accountData.created_at = new Date().toISOString();
            
            const { data, error } = await supabase
                .from('account_details')
                .insert([accountData])
                .select();
            
            if (error) throw error;
            result = data[0];
        }
        
        console.log('✅ Account details saved successfully');
        return result;
    },

    // Get all account details (for admin)
    async getAllAccountDetails() {
        console.log('📋 Getting all account details (admin)');
        
        const { data, error } = await supabase
            .from('account_details')
            .select(`
                *,
                employees (
                    name,
                    email,
                    phone,
                    employee_id,
                    department,
                    position
                )
            `)
            .order('updated_at', { ascending: false });
        
        if (error) {
            console.error('❌ Error fetching all account details:', error);
            throw error;
        }
        
        return data || [];
    },

    // Get account details by employee ID (for admin modal)
    async getAccountDetailsByEmployeeId(employeeId) {
        console.log('📋 Getting account details for employee (admin view):', employeeId);
        
        // Get account details
        const { data: accountData, error: accError } = await supabase
            .from('account_details')
            .select('*')
            .eq('employee_id', employeeId)
            .maybeSingle();
        
        if (accError) {
            console.error('❌ Error fetching account details:', accError);
        }
        
        // Get employee info
        const { data: employeeData, error: empError } = await supabase
            .from('employees')
            .select('name, email, phone, employee_id, department, position')
            .eq('employee_id', employeeId)
            .maybeSingle();
        
        if (empError) {
            console.error('❌ Error fetching employee info:', empError);
        }
        
        return {
            account: accountData || {},
            employee: employeeData || {}
        };
    }
};

