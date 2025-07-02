import React, { useState, useEffect } from 'react';

const AuthTest = () => {
  const [authInfo, setAuthInfo] = useState({});
  const [testResults, setTestResults] = useState([]);

  useEffect(() => {
    const runTests = async () => {
      const results = [];
      
      // Test 1: Check localStorage
      const userData = localStorage.getItem('userData');
      const token = localStorage.getItem('token');
      const refreshToken = localStorage.getItem('refreshToken');
      
      results.push({
        test: 'LocalStorage Check',
        userData: userData ? 'Present' : 'Missing',
        token: token ? 'Present' : 'Missing',
        refreshToken: refreshToken ? 'Present' : 'Missing'
      });
      
      // Test 2: Try API call
      if (token) {
        try {
          const response = await fetch('http://localhost:8000/api/orders/', {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });
          
          results.push({
            test: 'API Orders Call',
            status: response.status,
            statusText: response.statusText,
            success: response.ok
          });
          
          if (!response.ok) {
            const errorText = await response.text();
            results.push({
              test: 'API Error Details',
              error: errorText
            });
          }
        } catch (error) {
          results.push({
            test: 'API Orders Call',
            error: error.message,
            success: false
          });
        }
      }
      
      setAuthInfo({ userData, token, refreshToken });
      setTestResults(results);
    };
    
    runTests();
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'monospace' }}>
      <h2>Authentication Test</h2>
      
      <h3>Auth Info:</h3>
      <pre style={{ background: '#f5f5f5', padding: '10px' }}>
        {JSON.stringify(authInfo, null, 2)}
      </pre>
      
      <h3>Test Results:</h3>
      {testResults.map((result, index) => (
        <div key={index} style={{ 
          background: result.success === false ? '#ffebee' : '#e8f5e8', 
          padding: '10px', 
          margin: '5px 0',
          border: '1px solid #ddd'
        }}>
          <strong>{result.test}:</strong>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      ))}
      
      <button onClick={() => window.location.reload()}>
        Refresh Test
      </button>
    </div>
  );
};

export default AuthTest;
