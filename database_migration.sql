
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
        VALUES (emp_id, target_year, 4, 10, 0, 0)
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
-- For custom authentication (not using Supabase Auth), we allow public read access
-- This enables login queries to work. Consider additional security measures in production.

ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_balances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timesheets ENABLE ROW LEVEL SECURITY;

-- Admins table: Allow SELECT for login, full access for management
CREATE POLICY "Allow admin login" ON public.admins
FOR SELECT USING (true);

CREATE POLICY "Allow admin operations" ON public.admins
FOR ALL USING (true);

-- Employees table: Allow public read for authentication
CREATE POLICY "Allow employee login" ON public.employees
FOR SELECT USING (true);

CREATE POLICY "Allow employee insert" ON public.employees
FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow employee update" ON public.employees
FOR UPDATE USING (true);

CREATE POLICY "Allow employee delete" ON public.employees
FOR DELETE USING (true);

-- Leave balances: Allow full access
CREATE POLICY "Allow leave balance operations" ON public.leave_balances
FOR ALL USING (true);

-- Leave requests: Allow full access
CREATE POLICY "Allow leave request operations" ON public.leave_requests
FOR ALL USING (true);

-- Timesheets: Allow full access
CREATE POLICY "Allow timesheet operations" ON public.timesheets
FOR ALL USING (true);

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

-- ========================================== 
-- EMS v2 - 2026 
--Leave Balances Initialization 
-- ========================================== 
INSERT INTO public.leave_balances (
    employee_id,
    year,
    sick_leave,
    casual_leave,
    sick_used,
    casual_used
)
SELECT
    e.employee_id,
    2026,
    4,
    10,
    0,
    0
FROM public.employees e
WHERE NOT EXISTS (
    SELECT 1
    FROM public.leave_balances lb
    WHERE lb.employee_id = e.employee_id
      AND lb.year = 2026
);

-- ==========================================
-- Account Details Table
-- ==========================================

CREATE TABLE IF NOT EXISTS public.account_details (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

    -- Must match employees.employee_id type
    employee_id UUID NOT NULL UNIQUE,

    -- Bank Details
    bank_name VARCHAR(100),
    bank_account_number VARCHAR(50),
    ifsc_code VARCHAR(20),

    -- Identity Details
    aadhaar_number VARCHAR(12),
    aadhaar_address TEXT,
    pan_number VARCHAR(10),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Foreign key constraint
    CONSTRAINT fk_employee
        FOREIGN KEY (employee_id)
        REFERENCES public.employees(employee_id)
        ON DELETE CASCADE
);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_account_details_employee_id
ON public.account_details(employee_id);

-- Enable RLS
ALTER TABLE public.account_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Employees can view own account details"
    ON public.account_details
    FOR SELECT USING (true);

CREATE POLICY "Employees can insert own account details"
    ON public.account_details
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Employees can update own account details"
    ON public.account_details
    FOR UPDATE USING (true);

CREATE POLICY "Admins can manage all account details"
    ON public.account_details
    FOR ALL USING (true);

COMMENT ON TABLE public.account_details
IS 'Stores employee bank and identity details for payroll and verification';

-- ============================================
-- HOLIDAYS TABLE CREATION SCRIPT FOR SUPABASE
-- ============================================
-- Run this script in your Supabase SQL Editor

-- Create the holidays table
CREATE TABLE IF NOT EXISTS holidays (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    date DATE NOT NULL,
    name VARCHAR(255) NOT NULL DEFAULT 'Holiday',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create an index on the date column for faster queries
CREATE INDEX IF NOT EXISTS idx_holidays_date ON holidays(date);

-- Create a unique constraint to prevent duplicate dates
-- (one holiday per date)
CREATE UNIQUE INDEX IF NOT EXISTS idx_holidays_unique_date ON holidays(date);

-- Enable Row Level Security (RLS)
ALTER TABLE holidays ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read access to all users" ON holidays
    FOR SELECT
    USING (true);

CREATE POLICY "Allow insert for authenticated users" ON holidays
    FOR INSERT
    WITH CHECK (true);

CREATE POLICY "Allow update for authenticated users" ON holidays
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow delete for authenticated users" ON holidays
    FOR DELETE
    USING (true);

-- Create a function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_holidays_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to automatically update updated_at
CREATE TRIGGER trigger_holidays_updated_at
    BEFORE UPDATE ON holidays
    FOR EACH ROW
    EXECUTE FUNCTION update_holidays_updated_at();

-- ============================================
-- SAMPLE DATA (Optional - Remove if not needed)
-- ============================================
-- Uncomment the lines below to insert sample holidays for 2026

-- INSERT INTO holidays (date, name) VALUES
--     ('2026-01-01', 'New Year''s Day'),
--     ('2026-01-26', 'Republic Day'),
--     ('2026-03-10', 'Holi'),
--     ('2026-04-02', 'Good Friday'),
--     ('2026-04-14', 'Ambedkar Jayanti'),
--     ('2026-05-01', 'May Day'),
--     ('2026-08-15', 'Independence Day'),
--     ('2026-10-02', 'Gandhi Jayanti'),
--     ('2026-10-20', 'Dussehra'),
--     ('2026-11-10', 'Diwali'),
--     ('2026-12-25', 'Christmas')
-- ON CONFLICT (date) DO UPDATE SET name = EXCLUDED.name;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- After running the script, use these queries to verify:

-- Check if table exists
-- SELECT * FROM holidays LIMIT 10;

-- Check table structure
-- \d holidays

-- Count holidays by year
-- SELECT EXTRACT(YEAR FROM date) as year, COUNT(*) as count 
-- FROM holidays 
-- GROUP BY EXTRACT(YEAR FROM date) 
-- ORDER BY year;

