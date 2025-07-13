# Delivery Rider Assignment Implementation Guide - ADARESMANSYS

## Overview
This document outlines the implementation of a delivery rider assignment feature that integrates seamlessly with your existing order management workflow. The feature allows assignment of delivery orders to riders, with payment processing only occurring when riders return.

## Current System Analysis

### Existing Order Statuses
- **Pickup Orders**: Pending → Accepted → Fulfilled → Cancelled
- **Delivery Orders**: Accepted → Out for Delivery → Fulfilled → Cancelled

### Current Payment Flow
- Payment validation occurs before status changes (except for delivery orders "Out for Delivery")
- Delivery orders require payment only for "Fulfilled" status
- Payment modes: Cash, MTN MoMo, Telecel Cash, Paystack

## Proposed Implementation

### 1. Database Schema Changes

#### New Tables/Fields to Add:

```sql
-- Delivery Riders Table
CREATE TABLE delivery_riders (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    status ENUM('active', 'inactive', 'busy') DEFAULT 'active',
    current_orders INT DEFAULT 0,
    total_deliveries INT DEFAULT 0,
    rating DECIMAL(3,2) DEFAULT 5.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Order Assignment Table
CREATE TABLE order_assignments (
    id INT PRIMARY KEY AUTO_INCREMENT,
    order_id INT NOT NULL,
    rider_id INT NOT NULL,
    assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    picked_up_at TIMESTAMP NULL,
    delivered_at TIMESTAMP NULL,
    returned_at TIMESTAMP NULL,
    status ENUM('assigned', 'picked_up', 'delivered', 'returned') DEFAULT 'assigned',
    notes TEXT,
    FOREIGN KEY (order_id) REFERENCES orders(id),
    FOREIGN KEY (rider_id) REFERENCES delivery_riders(id)
);

-- Add fields to existing orders table
ALTER TABLE orders ADD COLUMN assigned_rider_id INT NULL;
ALTER TABLE orders ADD COLUMN rider_assignment_id INT NULL;
ALTER TABLE orders ADD COLUMN delivery_instructions TEXT NULL;
```

### 2. Updated Order Status Flow

#### Simplified Delivery Order Workflow:
1. **Accepted** → Order confirmed, ready for assignment
2. **Out for Delivery** → Rider assigned and dispatched with order
3. **Fulfilled** → Rider returned, payment confirmed, order completed

### 3. Frontend Component Updates

#### A. New Component: `DeliveryRiderSelector.js`

```javascript
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
      const response = await fetch(`${API_BASE_URL}/delivery-riders/available/`, {
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
      const response = await fetch(`${API_BASE_URL}/orders/${order.id}/assign-rider/`, {
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
    <Modal show={show} onHide={onHide} size="lg" centered>
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
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Cancel
        </Button>
        <Button 
          variant="primary" 
          onClick={handleAssignRider}
          disabled={!selectedRider || assigning}
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
```

#### B. Update `ViewOrdersPage.js` - Add Rider Assignment

```javascript
// Add new state variables
const [showRiderSelector, setShowRiderSelector] = useState(false);
const [orderForAssignment, setOrderForAssignment] = useState(null);

// Add function to handle rider assignment
const handleAssignRider = (order) => {
  setOrderForAssignment(order);
  setShowRiderSelector(true);
};

// Update the status options function
const getStatusOptions = (order) => {
  if (!order) return ['Pending', 'Accepted', 'Fulfilled', 'Cancelled'];
  
  if (order.delivery_type === 'Delivery') {
    // Simplified delivery workflow with rider assignment
    const baseStatuses = ['Accepted'];
    
    // Show "Out for Delivery" - this will trigger rider assignment if not assigned
    baseStatuses.push('Out for Delivery');
    baseStatuses.push('Fulfilled', 'Cancelled');
    
    return baseStatuses;
  } else {
    // Pickup orders remain unchanged
    return ['Pending', 'Accepted', 'Fulfilled', 'Cancelled'];
  }
};

// Update handleUpdateStatus function
const handleUpdateStatus = async () => {
  if (!selectedOrder || !newStatus) {
    contextToast.formValidation('Status');
    return;
  }
  
  // Special handling for "Out for Delivery" status for delivery orders
  if (newStatus === 'Out for Delivery' && selectedOrder.delivery_type === 'Delivery') {
    // Check if rider is already assigned
    if (!selectedOrder.assigned_rider_id) {
      // Show rider selector before updating status
      setShowStatusModal(false);
      handleAssignRider(selectedOrder);
      return;
    }
  }
  
  // Check if the new status is "Cancelled" and show confirmation modal
  if (newStatus === 'Cancelled') {
    setShowCancellationModal(true);
    return;
  }
  
  // If not cancellation, proceed with regular status update
  await performStatusUpdate();
};
```

#### C. Update Order Table Display

```javascript
// Add rider information column in the table
const RiderInfoColumn = ({ order }) => {
  if (order.delivery_type !== 'Delivery') {
    return <span className="text-muted">-</span>;
  }
  
  if (order.assigned_rider_name) {
    return (
      <div>
        <strong>{order.assigned_rider_name}</strong>
        <br/>
        <small className="text-muted">{order.assigned_rider_phone}</small>
      </div>
    );
  }
  
  return (
    <Button 
      size="sm" 
      variant="outline-primary"
      onClick={() => handleAssignRider(order)}
    >
      <i className="bi bi-person-plus me-1"></i>
      Assign
    </Button>
  );
};
```

### 4. Backend API Endpoints (Recommendations)

```python
# Django REST Framework example endpoints

# GET /api/delivery-riders/available/
def get_available_riders(request):
    """Get list of available delivery riders"""
    riders = DeliveryRider.objects.filter(
        status='active',
        current_orders__lt=3  # Max 3 concurrent orders
    ).order_by('current_orders', '-rating')
    
    return Response(DeliveryRiderSerializer(riders, many=True).data)

# POST /api/orders/{order_id}/assign-rider/
def assign_rider_to_order(request, order_id):
    """Assign a rider to an order"""
    order = get_object_or_404(Order, id=order_id)
    rider_id = request.data.get('rider_id')
    rider = get_object_or_404(DeliveryRider, id=rider_id)
    
    # Create assignment record
    assignment = OrderAssignment.objects.create(
        order=order,
        rider=rider,
        notes=request.data.get('delivery_instructions', '')
    )
    
    # Update order
    order.assigned_rider = rider
    order.rider_assignment = assignment
    order.status = 'Assigned to Rider'
    order.save()
    
    # Update rider
    rider.current_orders += 1
    rider.save()
    
    return Response({'success': True, 'assignment_id': assignment.id})

# PATCH /api/orders/{order_id}/update-delivery-status/
def update_delivery_status(request, order_id):
    """Update delivery status (for rider app or staff)"""
    order = get_object_or_404(Order, id=order_id)
    new_status = request.data.get('status')
    
    # Validate status progression
    valid_transitions = {
        'Assigned to Rider': ['Picked Up', 'Cancelled'],
        'Picked Up': ['Out for Delivery', 'Cancelled'],
        'Out for Delivery': ['Delivered', 'Cancelled'],
        'Delivered': ['Returned'],
        'Returned': ['Fulfilled']
    }
    
    if new_status in valid_transitions.get(order.status, []):
        order.status = new_status
        
        # Update assignment timestamps
        if order.rider_assignment:
            assignment = order.rider_assignment
            if new_status == 'Picked Up':
                assignment.picked_up_at = timezone.now()
            elif new_status == 'Delivered':
                assignment.delivered_at = timezone.now()
            elif new_status == 'Returned':
                assignment.returned_at = timezone.now()
                # Rider is now available for new orders
                order.assigned_rider.current_orders -= 1
                order.assigned_rider.save()
            
            assignment.status = new_status.lower().replace(' ', '_')
            assignment.save()
        
        order.save()
        return Response({'success': True})
    else:
        return Response({'error': 'Invalid status transition'}, status=400)
```

### 5. Enhanced Payment Flow

#### Payment Processing When Rider Returns

```javascript
// In ViewOrdersPage.js - Enhanced payment modal for returned deliveries
const handleReturnedDeliveryPayment = async (order) => {
  // Show payment modal specifically for returned deliveries
  setSelectedOrder(order);
  setNewPaymentMode('CASH'); // Default to cash for delivery returns
  setPaymentAmount(order.total_price);
  setIsRefundMode(false);
  setShowPaymentModal(true);
};

// Modified payment processing for delivery returns
const processDeliveryReturnPayment = async () => {
  try {
    // Process payment
    const paymentResult = await processPayment();
    
    if (paymentResult.success) {
      // Update order status to Fulfilled
      await updateOrderStatus(selectedOrder.id, 'Fulfilled');
      
      // Update rider statistics
      await updateRiderStats(selectedOrder.assigned_rider_id, 'completed');
      
      optimizedToast.success('Delivery completed and payment processed');
    }
  } catch (error) {
    optimizedToast.error('Payment processing failed');
  }
};
```

### 6. Mobile Optimization

#### Rider Quick Actions for Mobile

```javascript
// Add to mobile order cards
const DeliveryRiderActions = ({ order }) => {
  if (order.delivery_type !== 'Delivery') return null;
  
  const getNextAction = () => {
    switch (order.status) {
      case 'Accepted':
        return { label: 'Send Out for Delivery', action: () => updateStatus(order, 'Out for Delivery'), icon: 'truck' };
      case 'Out for Delivery':
        return { label: 'Complete & Process Payment', action: () => handleReturnedDeliveryPayment(order), icon: 'credit-card' };
      default:
        return null;
    }
  };
  
  const action = getNextAction();
  if (!action) return null;
  
  return (
    <Button 
      size="sm" 
      variant="primary" 
      onClick={action.action}
      className="w-100 mt-2"
    >
      <i className={`bi bi-${action.icon} me-2`}></i>
      {action.label}
    </Button>
  );
};
```

### 7. Workflow Summary

#### Complete Delivery Order Lifecycle:

1. **Order Created** → Status: "Pending"
2. **Staff Accepts** → Status: "Accepted"
3. **Set Out for Delivery** → Rider assignment modal triggered, order status becomes "Out for Delivery"
4. **Rider Returns** → Rider comes back with payment/delivery confirmation
5. **Payment Processed** → Status: "Fulfilled" (Cash collected, payment recorded)

### 8. Implementation Priority

#### Phase 1 (Week 1-2):
- Create `DeliveryRiderSelector` component
- Update `ViewOrdersPage` with rider assignment
- Add basic rider management API endpoints

#### Phase 2 (Week 3-4):
- Enhanced status tracking and transitions
- Mobile optimization for rider actions
- Payment flow integration for returned deliveries

#### Phase 3 (Week 5-6):
- Rider performance analytics
- Delivery time tracking
- Customer notifications integration

### 9. Benefits

1. **Clear Accountability**: Each delivery has an assigned rider
2. **Better Tracking**: Real-time status updates throughout delivery
3. **Improved Cash Flow**: Payment only processed when rider returns with cash
4. **Enhanced Customer Service**: Better delivery tracking and communication
5. **Operational Efficiency**: Optimized rider allocation and workload management

This implementation seamlessly integrates with your existing ADARESMANSYS workflow while adding the sophisticated delivery rider management you need.
