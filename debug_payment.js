// Debug script to test payment API endpoint
// Run this in browser console to debug the authentication issue

async function debugPaymentAPI() {
    console.log("=== Payment API Debug ===");
    
    // Check token in localStorage
    const token = localStorage.getItem('token');
    const refreshToken = localStorage.getItem('refreshToken');
    const userData = localStorage.getItem('userData');
    
    console.log("Token exists:", !!token);
    console.log("Refresh token exists:", !!refreshToken);
    console.log("User data exists:", !!userData);
    
    if (token) {
        console.log("Token length:", token.length);
        console.log("Token preview:", token.substring(0, 20) + "...");
        
        // Try to decode JWT to check expiration
        try {
            const parts = token.split('.');
            if (parts.length === 3) {
                const payload = JSON.parse(atob(parts[1]));
                console.log("Token payload:", payload);
                console.log("Token expires at:", new Date(payload.exp * 1000));
                console.log("Token is expired:", Date.now() > (payload.exp * 1000));
            }
        } catch (e) {
            console.error("Failed to decode token:", e);
        }
    }
    
    if (userData) {
        try {
            const parsedUserData = JSON.parse(userData);
            console.log("User role:", parsedUserData.role);
            console.log("User permissions:", parsedUserData);
        } catch (e) {
            console.error("Failed to parse user data:", e);
        }
    }
    
    // Test API endpoint with current token
    if (token) {
        console.log("\n=== Testing API Endpoint ===");
        
        try {
            const response = await fetch('http://localhost:8000/api/payments/initiate/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    order_number: "ADA-2024-001",
                    amount: 10.00,
                    payment_method: "CASH"
                })
            });
            
            console.log("Response status:", response.status);
            console.log("Response headers:", [...response.headers.entries()]);
            
            const responseText = await response.text();
            console.log("Response body:", responseText);
            
            // Try to parse as JSON
            try {
                const responseJson = JSON.parse(responseText);
                console.log("Response JSON:", responseJson);
            } catch (e) {
                console.log("Response is not JSON, likely HTML error page");
            }
            
        } catch (error) {
            console.error("Request failed:", error);
        }
    }
}

// Also test token refresh
async function testTokenRefresh() {
    console.log("\n=== Testing Token Refresh ===");
    
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (refreshToken) {
        try {
            const response = await fetch('http://localhost:8000/api/token/refresh/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ refresh: refreshToken })
            });
            
            console.log("Refresh response status:", response.status);
            
            if (response.ok) {
                const data = await response.json();
                console.log("New token received:", data);
                localStorage.setItem('token', data.access);
                if (data.refresh) {
                    localStorage.setItem('refreshToken', data.refresh);
                }
                console.log("Token refreshed successfully");
            } else {
                const errorText = await response.text();
                console.log("Refresh failed:", errorText);
            }
        } catch (error) {
            console.error("Token refresh failed:", error);
        }
    } else {
        console.log("No refresh token available");
    }
}

// Run the debug
debugPaymentAPI();

console.log("\n=== Instructions ===");
console.log("1. Run debugPaymentAPI() to check current authentication state");
console.log("2. Run testTokenRefresh() to try refreshing the token");
console.log("3. If token is expired, log out and log back in");
