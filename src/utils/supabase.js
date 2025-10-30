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
        console.log('🔍 Fetching timesheets for employee:', employeeId);
        
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

        console.log('✅ Fetched employee timesheets:', data.length);
        
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
        console.log('🔍 Fetching ALL employee timesheets for admin view...');
        
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

        console.log('✅ Fetched all timesheets:', data.length);
        
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

        // Remove the user object and document before inserting to database
        const { user, document, ...cleanLeaveData } = leaveData;

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

        // Handle document upload if provided
        if (document) {
          console.log('📎 Processing document upload for leave request');
          
          try {
            // Use the enhanced uploadLeaveDocument function
            const documentMetadata = await leaveApi.uploadLeaveDocument(document, cleanLeaveData.employee_id);
            
            if (documentMetadata) {
              leaveRecord.has_documentation = true;
              leaveRecord.document_url = documentMetadata.publicUrl;
              leaveRecord.document_name = documentMetadata.fileName;
              leaveRecord.document_type = documentMetadata.fileType;
              leaveRecord.document_size = documentMetadata.fileSize;
              leaveRecord.uploaded_at = documentMetadata.uploadedAt;
              
              console.log('✅ Document metadata added to leave record:', {
                hasDocumentation: leaveRecord.has_documentation,
                documentName: leaveRecord.document_name,
                documentSize: leaveRecord.document_size,
                documentType: leaveRecord.document_type
              });
            }
          } catch (uploadError) {
            console.error('❌ Error handling document upload:', uploadError);
            // For now, continue without the document but log the error
            // In production, you might want to fail the entire request
            console.warn('⚠️ Continuing leave request creation without document due to upload error');
          }
        }

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
    },

    // Check if employee has any active approved leave requests for today's date
    async checkActiveLeaveRequest(employeeId, userId) {
        console.log('🔍 Checking for active leave requests for employee:', employeeId || userId);
        
        const today = new Date().toISOString().slice(0, 10); // Get today's date in YYYY-MM-DD format
        console.log('📅 Today\'s date:', today);
        
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

            console.log('📋 Active leave requests found:', data?.length || 0);
            if (data && data.length > 0) {
                console.log('📝 Active leave details:', data[0]);
            }
            
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
        console.log('🔍 Checking for overlapping approved leaves for:', employeeId || userId, { startDate, endDate });

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

            console.log('📋 Overlapping approved leaves found:', overlapping.length);
            return { hasOverlap: overlapping.length > 0, overlappingLeaves: overlapping };
        } catch (err) {
            console.error('❌ Error in checkOverlappingApprovedLeave:', err);
            throw err;
        }
    },

    // Admin: Get ALL leave requests with employee info joined
    async getAllLeaveRequestsWithEmployees() {
        console.log('🔍 Fetching ALL leave requests with employee data for admin view...');
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
                console.log('🆔 Unique employee IDs to lookup:', employeeIds);
                
                // Fetch employees - use employee_id column instead of id
                const { data: employees, error: empError } = await supabase
                    .from('employees')
                    .select('*')
                    .in('employee_id', employeeIds);
                
                if (empError) {
                    console.error('❌ Error fetching employees by employee_id:', empError);
                    
                    // Try alternative: maybe the table uses a different primary key
                    console.log('🔄 Trying to fetch all employees and match manually...');
                    const { data: allEmployees, error: allEmpError } = await supabase
                        .from('employees')
                        .select('*');
                    
                    if (allEmpError) {
                        console.error('❌ Error fetching all employees:', allEmpError);
                        return requests;
                    }
                    
                    console.log('👥 Fetched all employees:', allEmployees?.length || 0);
                    console.log('📋 Sample employee record:', allEmployees?.[0]);
                    
                    // Create lookup map using employee_id
                    const empMap = {};
                    allEmployees?.forEach(emp => {
                        if (emp.employee_id) {
                            empMap[emp.employee_id] = emp;
                        }
                    });
                    
                    console.log('🗺️ Employee map keys:', Object.keys(empMap));
                    
                    // Merge data
                    const enriched = requests.map(req => ({
                        ...req,
                        employees: empMap[req.employee_id] || null
                    }));
                    
                    console.log('✅ Manually joined leave requests with employees:', enriched.length);
                    console.log('📋 Sample enriched request:', enriched[0]);
                    return enriched;
                }
                
                console.log('👥 Fetched employees:', employees?.length || 0);
                
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
                
                console.log('✅ Manually joined leave requests with employees:', enriched.length);
                return enriched;
            }
            
            console.log('✅ Fetched leave requests with join (admin):', data?.length || 0);
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

            console.log('📎 Uploading document:', {
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                employeeId,
                filePath
            });

            // Upload file to Supabase Storage
            const { data, error } = await supabase.storage
                .from('leave-documents')
                .upload(filePath, file);

            if (error) {
                console.error('❌ Error uploading document:', error);
                throw error;
            }

            console.log('✅ Document uploaded successfully:', data);

            // Get public URL for the uploaded file
            const { data: { publicUrl } } = supabase.storage
                .from('leave-documents')
                .getPublicUrl(filePath);

            console.log('🔗 Generated public URL:', publicUrl);

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
        console.log('👤 Creating employee with data:', employeeData);
        
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
        if (processedData.first_name && processedData.last_name) {
            console.log('✅ Employee has first_name and last_name:', {
                first_name: processedData.first_name,
                last_name: processedData.last_name
            });
        } else {
            console.log('⚠️ Employee missing first_name or last_name:', {
                first_name: processedData.first_name,
                last_name: processedData.last_name
            });
        }
        
        const { data, error } = await supabase
            .from('employees')
            .insert([processedData])
            .select();
        
        if (error) {
            console.error('❌ Error creating employee:', error);
            throw error;
        }
        
        console.log('✅ Employee created successfully:', data[0]);
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

    async updateEmployee(employeeId, updates) {
        const { data, error } = await supabase
            .from('employees')
            .update({
                ...updates,
                updated_at: new Date().toISOString()
            })
            .eq('employee_id', employeeId)
            .select();

        if (error) throw error;
        return data[0];
    },

    async deleteEmployee(employeeId) {
        const { error } = await supabase
            .from('employees')
            .delete()
            .eq('employee_id', employeeId);

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

    // Get all employees (admins are NOT employees)
    async getAllEmployeesAndAdmins() {
        console.log('👥 Fetching employees from database...');
        
        try {
            // Get employees from employees table
            console.log('📋 Fetching from employees table...');
            const employees = await employeeApi.getEmployees();
            console.log('✅ Employees loaded from database:', employees.length, employees.length > 0 ? employees.slice(0, 2) : 'No employees found');
            
            // Add role field to employees for consistency
            const employeesWithRole = employees.map(emp => ({
                ...emp,
                role: emp.role || 'employee',
                isAdmin: false
            }));
            
            console.log('🎯 Final result:');
            console.log(`   - Total employees: ${employeesWithRole.length}`);
            console.log('   - Sample data:', employeesWithRole.slice(0, 3));
            return employeesWithRole;
            
        } catch (error) {
            console.error('❌ Error fetching employees:', error);
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
            console.log('📈 Getting dashboard stats for employees only...');
            
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
            
            console.log('📊 Employee Statistics:');
            console.log(`   - Total Employees: ${employees?.length || 0}`);
            console.log(`   - Active Employees: ${activeEmployees.length}`);

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

            // Calculate new employees this month
            const newEmployeesThisMonth = (employees || []).filter(emp => 
                emp.created_at && emp.created_at.startsWith(currentMonth)
            ).length;

            // Calculate employees currently on leave
            const employeesOnLeave = activeLeaves?.length || 0;
            const activeEmployeesToday = Math.max(0, activeEmployees.length - employeesOnLeave);
            
            console.log('📊 Dashboard stats calculated:', {
                totalEmployees: employees?.length || 0,
                activeEmployees: activeEmployees.length,
                newEmployeesThisMonth,
                pendingRequests: pendingLeaves.length,
                approvedLeaves: approvedLeaves?.length || 0,
                employeesOnLeave,
                activeEmployeesToday,
                pendingTimesheets: pendingTimesheets?.length || 0
            });

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
        console.log('🔍 Fetching pending leave requests with direct employee join...');
        
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

        console.log('✅ Fetched pending leaves with employee data:', data);
        return data;
    },

    async getPendingLeaveRequestsWithEmployeeData() {
        console.log('🔍 Fetching pending leave requests with direct employee join...');
        
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

        console.log('✅ Fetched pending leaves with employee data:', data);
        return data;
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
        
        // Update employee status to "Leave"
        if (leaveRequest.employee_id) {
            const employeeIdToUpdate = leaveRequest.employee_id;
            console.log('📝 Updating employee status to Leave for ID:', employeeIdToUpdate);
            
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
                    console.log('✅ Employee status updated to Leave (via employee_id field)');
                }
            } else {
                console.log('✅ Employee status updated to Leave (via id field)');
            }
        } else {
            console.error('⚠️ No employee_id found in leave request, cannot update employee status');
        }
        
        console.log('✅ Leave request approved successfully:', data[0]);
        return data[0];
    },

    async rejectLeaveRequest(requestId, reason = '') {
        console.log('❌ Rejecting leave request:', requestId);
        
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
            console.log('📝 Updating employee status to Active for ID:', employeeIdToUpdate);
            
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
                    console.log('✅ Employee status updated to Active (via employee_id field)');
                }
            } else {
                console.log('✅ Employee status updated to Active (via id field)');
            }
        } else {
            console.error('⚠️ No employee_id found in leave request, cannot update employee status');
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
            .eq('employee_id', userId);
        
        if (error) {
            console.error('❌ Error checking active leaves:', error);
            return;
        }
        
        // If no active leaves, set status back to Active
        if (!activeLeaves || activeLeaves.length === 0) {
            console.log('📝 No active leaves found, setting employee status to Active');
            
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
                    console.log('✅ Employee status updated to Active (by id)');
                }
            } else {
                console.log('✅ Employee status updated to Active (by employee_id)');
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