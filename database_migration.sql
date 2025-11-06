
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
-- Run this script in your new Supabase account to recreate all tables and storage

-- Enable Row Level Security (RLS) extension if not already enabled
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
    sick_leave numeric DEFAULT 12,
    casual_leave numeric DEFAULT 15,
    updated_at timestamptz DEFAULT now(),
    FOREIGN KEY (employee_id) REFERENCES public.employees(employee_id) ON DELETE CASCADE
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
-- INDEXES FOR PERFORMANCE
-- ==========================================

-- Employees indexes
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON public.employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_department ON public.employees(department);

-- Leave requests indexes
CREATE INDEX IF NOT EXISTS idx_leave_requests_employee_id ON public.leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON public.leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON public.leave_requests(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_created_at ON public.leave_requests(created_at);

-- Timesheets indexes
CREATE INDEX IF NOT EXISTS idx_timesheets_employee_id ON public.timesheets(employee_id);
CREATE INDEX IF NOT EXISTS idx_timesheets_date ON public.timesheets(date);
CREATE INDEX IF NOT EXISTS idx_timesheets_status ON public.timesheets(status);

-- Leave balances indexes
CREATE INDEX IF NOT EXISTS idx_leave_balances_employee_id ON public.leave_balances(employee_id);

-- Admins indexes
CREATE INDEX IF NOT EXISTS idx_admins_email ON public.admins(email);

-- ==========================================
-- ROW LEVEL SECURITY POLICIES
-- ==========================================

-- Enable RLS on all tables
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (you may need to adjust based on your auth setup)
-- Allow all operations for now (you can customize these policies later)

-- Admins table policies
CREATE POLICY "Allow all for admins table" ON public.admins FOR ALL USING (true);

-- Employees table policies
CREATE POLICY "Allow all for employees table" ON public.employees FOR ALL USING (true);


-- Leave requests table policies
CREATE POLICY "Allow all for leave_requests table" ON public.leave_requests FOR ALL USING (true);

-- Timesheets table policies
CREATE POLICY "Allow all for timesheets table" ON public.timesheets FOR ALL USING (true);

-- ==========================================
-- SAMPLE DATA (Optional - for testing)
-- ==========================================

-- Insert sample admin
INSERT INTO public.admins (name, email, password, role) 
VALUES ('System Admin', 'admin@company.com', 'admin123', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Insert sample employees
INSERT INTO public.employees (name, email, phone, department, position, first_name, last_name, password_hash)
VALUES 
    ('John Doe', 'john.doe@company.com', '+1234567890', 'Engineering', 'Software Developer', 'John', 'Doe', 'password123'),
    ('Jane Smith', 'jane.smith@company.com', '+1234567891', 'Marketing', 'Marketing Manager', 'Jane', 'Smith', 'password123'),
    ('Bob Johnson', 'bob.johnson@company.com', '+1234567892', 'Sales', 'Sales Representative', 'Bob', 'Johnson', 'password123')
ON CONFLICT (email) DO NOTHING;

-- Create leave balances for employees
INSERT INTO public.leave_balances (employee_id, sick_leave, casual_leave)
SELECT employee_id, 12, 15 
FROM public.employees 
WHERE email IN ('john.doe@company.com', 'jane.smith@company.com', 'bob.johnson@company.com')
ON CONFLICT DO NOTHING;

