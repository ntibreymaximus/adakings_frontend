import { useNavigate } from 'react-router-dom';
import { useCallback } from 'react';

const useAuth = () => {
  const navigate = useNavigate();

  const logout = useCallback(async () => {
    try {
      // Call backend logout endpoint
      await fetch('http://localhost:8000/api/users/logout/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (error) {
      console.error('Logout API call failed:', error);
    } finally {
      // Clear local storage and redirect regardless of API call result
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('userData');
      navigate('/login');
    }
  }, [navigate]);

  return { logout };
};

export default useAuth;

