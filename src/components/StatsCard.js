import React, { useState, useEffect } from 'react';
import { Card, Spinner } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const StatsCard = ({ className }) => {
  const navigate = useNavigate();
  const { userData, checkTokenValidity } = useAuth();
  const [loading, setLoading] = useState(true);
  const [quickStats, setQuickStats] = useState({
    todayOrders: 0,
    todayRevenue: 0,
    pendingOrders: 0,
    monthlyRevenue: 0
  });

  useEffect(() => {
    if (userData && (userData.role === 'admin' || userData.role === 'superadmin')) {
      fetchQuickStats();
    }
  }, [userData]);

  const fetchQuickStats = async () => {
    try {
      const isValid = await checkTokenValidity();
      if (!isValid) return;

      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/orders/stats/quick/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setQuickStats(data);
      }
    } catch (error) {
      console.error('Failed to fetch quick stats:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!userData || (userData.role !== 'admin' && userData.role !== 'superadmin')) {
    return null;
  }

  return (
    <Card 
      className={`${className} cursor-pointer`} 
      onClick={() => navigate('/stats')}
      style={{ cursor: 'pointer' }}
    >
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">
          <i className="bi bi-graph-up me-2"></i>
          Quick Stats
        </h5>
        <span className="text-muted small">Click for details</span>
      </Card.Header>
      <Card.Body>
        {loading ? (
          <div className="text-center py-3">
            <Spinner animation="border" size="sm" variant="primary" />
          </div>
        ) : (
          <div className="row g-3">
            <div className="col-6">
              <div className="text-center">
                <h6 className="text-muted small mb-1">Today's Orders</h6>
                <h4 className="ada-text-primary mb-0">{quickStats.todayOrders}</h4>
              </div>
            </div>
            <div className="col-6">
              <div className="text-center">
                <h6 className="text-muted small mb-1">Today's Revenue</h6>
                <h4 className="ada-text-primary mb-0">₦{quickStats.todayRevenue.toLocaleString()}</h4>
              </div>
            </div>
            <div className="col-6">
              <div className="text-center">
                <h6 className="text-muted small mb-1">Pending Orders</h6>
                <h4 className="text-warning mb-0">{quickStats.pendingOrders}</h4>
              </div>
            </div>
            <div className="col-6">
              <div className="text-center">
                <h6 className="text-muted small mb-1">Monthly Revenue</h6>
                <h4 className="ada-text-primary mb-0">₦{quickStats.monthlyRevenue.toLocaleString()}</h4>
              </div>
            </div>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default StatsCard;
