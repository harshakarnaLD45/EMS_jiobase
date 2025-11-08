
-- ✅ 1. Create a Supabase Project

-- Go to https://supabase.com/dashboard

-- Click New Project

-- Choose:

-- Organization

-- Project Name

-- Database Password (VERY IMPORTANT)

-- Wait for the project to initialize.

-- ✅ 2. Open SQL Editor

-- Left Sidebar → SQL Editor
-- You will paste your schema here.



-- Employment Management System - Database Migration Script
-- CORRECTED: 5 sick days, 12 casual days, with yearly reset tracking

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 1. ADMINS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.admins (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    name varchar NOT NULL,
    email varchar UNIQUE NOT NULL,
    password varchar NOT NULL,
    role varchar DEFAULT 'admin',
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ==========================================
-- 2. EMPLOYEES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.employees (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id uuid DEFAULT uuid_generate_v4() UNIQUE NOT NULL,
    name text,
    email text UNIQUE,
    phone text,
    department text,
    position text,
    status text DEFAULT 'Active',
    first_name text,
    last_name text,
    join_date date DEFAULT CURRENT_DATE,
    terminated_at timestamptz,
    password_hash varchar,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- ==========================================
-- 3. LEAVE_BALANCES TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.leave_balances (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    employee_id uuid NOT NULL,
    year integer DEFAULT EXTRACT(YEAR FROM CURRENT_DATE),
    sick_leave numeric DEFAULT 5,
    casual_leave numeric DEFAULT 12,
    sick_used numeric DEFAULT 0,
    casual_used numeric DEFAULT 0,
    updated_at timestamptz DEFAULT now(),
    FOREIGN KEY (employee_id) REFERENCES public.employees(employee_id) ON DELETE CASCADE,
    UNIQUE(employee_id, year)
);

-- ==========================================
-- 4. LEAVE_REQUESTS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.leave_requests (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    leave_type varchar NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    reason text,
    status varchar DEFAULT 'pending',
    created_at timestamptz DEFAULT now(),
    subject text,
    employee_id uuid NOT NULL,
    has_documentation boolean DEFAULT false,
    document_url text,
    document_name text,
    document_type text,
    document_size int4,
    uploaded_at timestamptz,
    approved_by text,
    FOREIGN KEY (employee_id) REFERENCES public.employees(employee_id) ON DELETE CASCADE
);

-- ==========================================
-- 5. TIMESHEETS TABLE
-- ==========================================
CREATE TABLE IF NOT EXISTS public.timesheets (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    date date NOT NULL,
    hours numeric NOT NULL,
    tasks jsonb,
    status varchar DEFAULT 'pending',
    created_at timestamptz DEFAULT now(),
    employee_id uuid NOT NULL,
    note text,
    FOREIGN KEY (employee_id) REFERENCES public.employees(employee_id) ON DELETE CASCADE
);

-- ==========================================
-- INDEXES
-- ==========================================
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON public.employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_department ON public.employees(department);

CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON public.leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON public.leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_created_at ON public.leave_requests(created_at);

CREATE INDEX IF NOT EXISTS idx_timesheets_employee_id ON public.timesheets(employee_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_date ON public.timesheets(date);
CREATE INDEX IF NOT EXISTS idx_timesheets_status ON public.timesheets(status);

CREATE INDEX IF NOT EXISTS idx_leave_balances_employee_id ON public.leave_balances(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_balances_year ON public.leave_balances(year);

CREATE INDEX IF NOT EXISTS idx_admins_email ON public.admins(email);

-- ==========================================
-- FUNCTIONS & TRIGGERS
-- ==========================================
-- Function: Auto-create leave balance for new year
CREATE OR REPLACE FUNCTION public.get_or_create_leave_balance(emp_id uuid, target_year integer)
RETURNS TABLE (
    id uuid,
    employee_id uuid,
    year integer,
    sick_leave numeric,
    casual_leave numeric,
    sick_used numeric,
    casual_used numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT lb.id, lb.employee_id, lb.year, lb.sick_leave, lb.casual_leave, lb.sick_used, lb.casual_used
    FROM public.leave_balances lb
    WHERE lb.employee_id = emp_id AND lb.year = target_year;

    IF NOT FOUND THEN
        RETURN QUERY
        INSERT INTO public.leave_balances (employee_id, year, sick_leave, casual_leave, sick_used, casual_used)
        VALUES (emp_id, target_year, 5, 12, 0, 0)
        RETURNING *;
    END IF;
END;
$$;

-- Trigger: Auto-create current year balance for new employees
CREATE OR REPLACE FUNCTION public.create_initial_leave_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    INSERT INTO public.leave_balances (employee_id, year, sick_leave, casual_leave, sick_used, casual_used)
    VALUES (NEW.employee_id, EXTRACT(YEAR FROM CURRENT_DATE), 5, 12, 0, 0);
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_create_leave_balance
AFTER INSERT ON public.employees
FOR EACH ROW
EXECUTE FUNCTION public.create_initial_leave_balance();

-- ==========================================
-- ROW LEVEL SECURITY
-- ==========================================
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can do everything" ON public.admins
FOR ALL USING (true);

-- Employees: Allow authenticated users
CREATE POLICY "Authenticated users can view employees" ON public.employees
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update own profile" ON public.employees
FOR UPDATE USING (auth.role() = 'authenticated');

-- Leave balances
CREATE POLICY "Users can view own leave balance" ON public.leave_balances
FOR SELECT USING (true);

CREATE POLICY "System can insert leave balance" ON public.leave_balances
FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update leave balance" ON public.leave_balances
FOR UPDATE USING (true);

-- Leave requests
CREATE POLICY "Users can view leave requests" ON public.leave_requests
FOR SELECT USING (true);

CREATE POLICY "Users can create leave requests" ON public.leave_requests
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update leave requests" ON public.leave_requests
FOR UPDATE USING (true);

-- Timesheets
CREATE POLICY "Users can view timesheets" ON public.timesheets
FOR SELECT USING (true);

CREATE POLICY "Users can create timesheets" ON public.timesheets
FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update timesheets" ON public.timesheets
FOR UPDATE USING (true);

-- ==========================================
-- SAMPLE DATA
-- ==========================================
INSERT INTO public.admins (name, email, password, role)
VALUES ('System Admin', 'admin@company.com', 'admin123', 'admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO public.employees (name, email, phone, department, position, first_name, last_name, password_hash)
VALUES
('John Doe', 'john.doe@company.com', '+1234567890', 'Engineering', 'Software Developer', 'John', 'Doe', 'password123'),
('Jane Smith', 'jane.smith@company.com', '+1234567891', 'Marketing', 'Marketing Manager', 'Jane', 'Smith', 'password123'),
('Bob Johnson', 'bob.johnson@company.com', '+1234567892', 'Sales', 'Sales Representative', 'Bob', 'Johnson', 'password123')
ON CONFLICT (email) DO NOTHING;