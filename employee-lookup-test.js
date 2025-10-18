// Test script to verify employee lookup functionality
// This is a temporary test file to check if our employee lookup works correctly

import { employeeApi } from './src/utils/supabase.js';

// Test cases for different user scenarios
const testUsers = [
    {
        name: "Test with email",
        user: { email: "john.doe@company.com", name: "John Doe" }
    },
    {
        name: "Test with name only",
        user: { name: "Jane Smith" }
    },
    {
        name: "Test with employee_id",
        user: { employee_id: "EMP001", name: "Bob Johnson" }
    }
];

async function testEmployeeLookup() {
    console.log('🧪 Starting employee lookup tests...');
    
    for (const testCase of testUsers) {
        console.log(`\n📋 ${testCase.name}:`);
        console.log('Input user:', testCase.user);
        
        try {
            const employee = await employeeApi.getEmployeeByUser(testCase.user);
            console.log('✅ Found employee:', {
                id: employee.id,
                employee_id: employee.employee_id,
                name: employee.name,
                email: employee.email
            });
        } catch (error) {
            console.log('❌ Error:', error.message);
        }
    }
    
    console.log('\n🎯 Employee lookup tests completed');
}

// Note: This test file is for verification purposes only
// It should be run in a proper testing environment with database access
console.log('📝 Employee lookup test file created');
console.log('💡 To run tests, ensure database connection is available');

export { testEmployeeLookup };