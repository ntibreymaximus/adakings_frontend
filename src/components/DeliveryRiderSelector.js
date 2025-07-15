import React, { useState, useEffect } from 'react';
import { Modal, Form, Button, Card, Badge, Alert } from 'react-bootstrap';
import { API_BASE_URL } from '../utils/api';
import optimizedToast from '../utils/toastUtils';

const DeliveryRiderSelector = ({ 
  show, 
  onHide, 
  order, 
  onAssignmentComplete 
}) => {
  const [riders, setRiders] = useState([]);
  const [selectedRider, setSelectedRider] = useState(null);
  const [loading, setLoading] = useState(false);
  const [assigning, setAssigning] = useState(false);
  const [deliveryInstructions, setDeliveryInstructions] = useState('');

  // Fetch available riders
  useEffect(() => {
    if (show) {
      fetchAvailableRiders();
    }
  }, [show]);

  const fetchAvailableRiders = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_BASE_URL}/deliveries/riders/available/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRiders(data);
      }
    } catch (error) {
      optimizedToast.error('Failed to load riders');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignRider = async () => {
    if (!selectedRider) {
      optimizedToast.error('Please select a rider');
      return;
    }

    if (!order || !order.id) {
      optimizedToast.error('Invalid order data. Please refresh and try again.');
      return;
    }

    setAssigning(true);
    try {
      const token = localStorage.getItem('token');
      console.log('Assigning rider to order:', {
        orderId: order.id,
        orderNumber: order.order_number,
        riderId: selectedRider.id,
        riderName: selectedRider.name
      });

      const response = await fetch(`${API_BASE_URL}/deliveries/orders/${order.id}/assign-rider/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rider_id: selectedRider.id,
          delivery_instructions: deliveryInstructions
        })
      });

      if (response.ok) {
        optimizedToast.success(`Order assigned to ${selectedRider.name}`);
        onAssignmentComplete();
        onHide();
      } else {
        // Get detailed error message from response
        let errorMessage = 'Failed to assign rider';
        try {
          const errorData = await response.json();
          console.error('Assignment error response:', errorData);
          
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.detail) {
            errorMessage = errorData.detail;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          }
          
          // Handle specific error cases
          if (response.status === 404) {
            errorMessage = `Order ${order.order_number || order.id} not found. Please refresh the page.`;
          } else if (response.status === 400) {
            if (errorMessage.includes('already assigned')) {
              errorMessage = 'This order has already been assigned to a rider.';
            } else if (errorMessage.includes('not ready for delivery')) {
              errorMessage = 'Order must be in "Accepted" status before assigning a rider.';
            }
          } else if (response.status === 500) {
            errorMessage = 'Server error. Please try again later or contact support.';
          }
        } catch (parseError) {
          console.error('Error parsing error response:', parseError);
        }
        
        optimizedToast.error(errorMessage);
      }
    } catch (error) {
      console.error('Network error during assignment:', error);
      optimizedToast.error('Network error. Please check your connection and try again.');
    } finally {
      setAssigning(false);
    }
  };

  return (
<Modal show={show} onHide={onHide} size="lg" centered fullscreen="sm-down">
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-person-plus me-2"></i>
          Assign Delivery Rider
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {order ? (
          <Alert variant="info" className="mb-3">
            <strong>Order #{order.order_number}</strong><br/>
            <small className="text-muted">Order ID: {order.id}</small><br/>
            Delivery to: {order.delivery_location || 'N/A'}<br/>
            Customer: {order.customer_phone || 'N/A'}
          </Alert>
        ) : (
          <Alert variant="danger" className="mb-3">
            <i className="bi bi-exclamation-triangle me-2"></i>
            <strong>Error:</strong> No order data provided. Please close this window and try again.
          </Alert>
        )}

        <Form.Group className="mb-3">
          <Form.Label>Delivery Instructions (Optional)</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={deliveryInstructions}
            onChange={(e) => setDeliveryInstructions(e.target.value)}
            placeholder="Special delivery instructions..."
          />
        </Form.Group>

        {loading ? (
          <div className="text-center p-3">
            <div className="spinner-border" role="status"></div>
            <p>Loading available riders...</p>
          </div>
        ) : (
          <div className="riders-list">
            <h6>Available Riders:</h6>
            {riders.map(rider => (
              <Card 
                key={rider.id}
                className={`mb-2 cursor-pointer ${selectedRider?.id === rider.id ? 'border-primary' : ''}`}
                onClick={() => setSelectedRider(rider)}
                style={{ cursor: 'pointer' }}
              >
                <Card.Body className="py-2">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <strong>{rider.name}</strong>
                      <br/>
                      <small className="text-muted">{rider.phone}</small>
                    </div>
                    <div className="text-end">
                      <Badge bg={rider.current_orders === 0 ? 'success' : 'warning'}>
                        {rider.current_orders} active orders
                      </Badge>
                      <br/>
                      <small className="text-muted">
                        Rating: {rider.rating}/5.0
                      </small>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            ))}
            
            {riders.length === 0 && (
              <Alert variant="warning">
                No riders available at the moment
              </Alert>
            )}
          </div>
        )}
</Modal.Body>
      <Modal.Footer className="d-flex flex-column flex-sm-row gap-2">
        <Button variant="secondary" onClick={onHide} className="w-100 w-sm-auto">
          Cancel
        </Button>
<Button 
          variant="primary" 
          onClick={handleAssignRider}
          disabled={!selectedRider || assigning}
          className="w-100 w-sm-auto"
        >
          {assigning ? (
            <>
              <span className="spinner-border spinner-border-sm me-2"></span>
              Assigning...
            </>
          ) : (
            'Assign Rider'
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default DeliveryRiderSelector;
