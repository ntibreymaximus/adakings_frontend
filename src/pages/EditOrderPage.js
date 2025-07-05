import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Spinner, Alert, Button } from 'react-bootstrap';
import { toast } from 'react-toastify';
import { API_ENDPOINTS } from '../utils/api';
import { tokenFetch } from '../utils/tokenFetch';
import CreateOrderForm from './CreateOrderForm';

const EditOrderPage = () => {
  const { orderNumber } = useParams();
  const navigate = useNavigate();
  const [orderData, setOrderData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchOrderData = async () => {
      try {
        setLoading(true);
        const response = await tokenFetch(`${API_ENDPOINTS.ORDERS}${orderNumber}/`);
        
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('Order not found');
          }
          throw new Error(`Failed to fetch order data. Status: ${response.status}`);
        }
        
        const data = await response.json();
        setOrderData(data);
        setError(null);
      } catch (error) {
        console.error('Error fetching order data:', error);
        setError(error.message);
        toast.error(`Failed to load order: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (orderNumber) {
      fetchOrderData();
    }
  }, [orderNumber]);

  if (loading) {
    return (
      <Container className="my-3 my-md-4 px-3 px-md-4" style={{ minHeight: 'calc(100vh - 100px)' }}>
        <div className="mb-3">
          <Button 
            variant="outline-primary" 
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="d-flex align-items-center ada-shadow-sm"
            style={{ minHeight: '44px' }}
          >
            <i className="bi bi-arrow-left me-2"></i>
            <span>Back to Dashboard</span>
          </Button>
        </div>
        
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
          <div className="text-center">
            <Spinner animation="border" variant="primary" className="mb-3" />
            <h5 className="text-muted">Loading order data...</h5>
            <p className="text-muted">Please wait while we fetch order #{orderNumber}</p>
          </div>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="my-3 my-md-4 px-3 px-md-4" style={{ minHeight: 'calc(100vh - 100px)' }}>
        <div className="mb-3">
          <Button 
            variant="outline-primary" 
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="d-flex align-items-center ada-shadow-sm"
            style={{ minHeight: '44px' }}
          >
            <i className="bi bi-arrow-left me-2"></i>
            <span>Back to Dashboard</span>
          </Button>
        </div>
        
        <Alert variant="danger" className="text-center">
          <Alert.Heading>
            <i className="bi bi-exclamation-triangle me-2"></i>
            Error Loading Order
          </Alert.Heading>
          <p className="mb-3">{error}</p>
          <div className="d-flex gap-2 justify-content-center">
            <Button 
              variant="outline-danger" 
              onClick={() => navigate('/view-orders')}
            >
              <i className="bi bi-list me-2"></i>
              View All Orders
            </Button>
            <Button 
              variant="primary" 
              onClick={() => window.location.reload()}
            >
              <i className="bi bi-arrow-clockwise me-2"></i>
              Try Again
            </Button>
          </div>
        </Alert>
      </Container>
    );
  }

  if (!orderData) {
    return (
      <Container className="my-3 my-md-4 px-3 px-md-4" style={{ minHeight: 'calc(100vh - 100px)' }}>
        <div className="mb-3">
          <Button 
            variant="outline-primary" 
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="d-flex align-items-center ada-shadow-sm"
            style={{ minHeight: '44px' }}
          >
            <i className="bi bi-arrow-left me-2"></i>
            <span>Back to Dashboard</span>
          </Button>
        </div>
        
        <Alert variant="warning" className="text-center">
          <Alert.Heading>Order Not Found</Alert.Heading>
          <p>Order #{orderNumber} could not be found.</p>
          <Button 
            variant="primary" 
            onClick={() => navigate('/view-orders')}
          >
            <i className="bi bi-list me-2"></i>
            View All Orders
          </Button>
        </Alert>
      </Container>
    );
  }

  return (
    <CreateOrderForm 
      isEditMode={true}
      existingOrder={orderData}
      orderNumber={orderNumber}
    />
  );
};

export default EditOrderPage;
