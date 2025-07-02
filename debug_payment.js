// Debug script to test payment API
// Run this in browser console to test the payment endpoint

async function debugPaymentAPI() {
    const token = localStorage.getItem('token');
    console.log('Token exists:', !!token);
    
    if (!token) {
        console.error('No token found in localStorage');
        return;
    }
    
    // Test data
    const testPaymentData = {
        order_number: 'ADA-0001', // Replace with a real order number
        amount: 10.00,
        payment_method: 'CASH',
        payment_type: 'payment'
    };
    
    console.log('Testing payment initiate endpoint...');
    console.log('Request data:', testPaymentData);
    
    try {
        const response = await fetch('http://localhost:8000/api/payments/initiate/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testPaymentData),
        });
        
        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));
        
        const responseData = await response.text();
        console.log('Response body (raw):', responseData);
        
        try {
            const jsonData = JSON.parse(responseData);
            console.log('Response body (parsed):', jsonData);
        } catch (e) {
            console.log('Response is not JSON');
        }
        
        if (!response.ok) {
            console.error('Request failed with status:', response.status);
            if (response.status === 405) {
                console.error('Method not allowed - check if endpoint accepts POST');
            } else if (response.status === 403) {
                console.error('Forbidden - check user permissions/role');
            } else if (response.status === 401) {
                console.error('Unauthorized - check token validity');
            }
        } else {
            console.log('Request successful!');
        }
        
    } catch (error) {
        console.error('Network error:', error);
    }
}

// Also test the user's role
async function checkUserRole() {
    const token = localStorage.getItem('token');
    if (!token) {
        console.error('No token found');
        return;
    }
    
    try {
        const response = await fetch('http://localhost:8000/api/users/me/', {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });
        
        if (response.ok) {
            const userData = await response.json();
            console.log('Current user data:', userData);
            console.log('User role:', userData.role);
            console.log('Is superuser:', userData.is_superuser);
            console.log('Is staff:', userData.is_staff);
        } else {
            console.error('Failed to get user data:', response.status);
        }
    } catch (error) {
        console.error('Error getting user data:', error);
    }
}

console.log('Debug functions loaded. Run:');
console.log('debugPaymentAPI() - to test payment endpoint');
console.log('checkUserRole() - to check current user role');
