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

    setAssigning(true);
    try {
      const token = localStorage.getItem('token');
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
        throw new Error('Assignment failed');
      }
    } catch (error) {
      optimizedToast.error('Failed to assign rider');
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
        {order && (
          <Alert variant="info" className="mb-3">
            <strong>Order #{order.order_number}</strong><br/>
            Delivery to: {order.delivery_location}<br/>
            Customer: {order.customer_phone}
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
