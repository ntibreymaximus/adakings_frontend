import React, { useState, useEffect, useCallback } from 'react';
import { Form, Button, Container, Row, Col, Card, ListGroup, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { authenticatedFetch, API_ENDPOINTS } from '../utils/api';

// Delivery locations will be fetched from backend

const CreateOrderForm = () => {
  const navigate = useNavigate();
  const [allMenuItems, setAllMenuItems] = useState([]);
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryType, setDeliveryType] = useState('Pickup');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState({});
  const [selectedExtras, setSelectedExtras] = useState({});
  const [errors, setErrors] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNotesModalOpen, setIsNotesModalOpen] = useState(false);
  const [showExtraDropdown, setShowExtraDropdown] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(true);
  const [deliveryLocations, setDeliveryLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filter menu items into main items and extras
  const mainMenuItems = (allMenuItems || []).filter(item => !item.is_extra && item.is_available);
  const extraMenuItems = (allMenuItems || []).filter(item => item.is_extra && item.is_available);
  
  // Fallback: if no main menu items found, show all available items (in case is_extra field is missing or different)
  const displayMenuItems = mainMenuItems.length > 0 ? mainMenuItems : (allMenuItems || []).filter(item => item.is_available);


  // Fetch delivery locations from backend
  const fetchDeliveryLocations = useCallback(async () => {
    setLoadingLocations(true);
    try {
      const response = await authenticatedFetch(`${API_ENDPOINTS.ORDERS}delivery-locations/`);
      if (!response.ok) {
        throw new Error(`Failed to fetch delivery locations. Status: ${response.status}`);
      }
      const data = await response.json();
      
      // Ensure we have an array
      let locations = data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        // If it's a paginated response, extract the results
        locations = data.results || data.items || data.data || [];
      }
      
      // Ensure we have an array
      if (!Array.isArray(locations)) {
        console.error('DeliveryLocations: Expected array but got:', typeof locations, locations);
        locations = [];
      }
      
      setDeliveryLocations(locations);
    } catch (error) {
      console.error('Error fetching delivery locations:', error);
      // Fallback to empty array if fetch fails
      setDeliveryLocations([]);
    } finally {
      setLoadingLocations(false);
    }
  }, []);



  useEffect(() => {
    const fetchInitialData = async () => {
      await fetchDeliveryLocations();
      try {
        const response = await authenticatedFetch(API_ENDPOINTS.MENU_ITEMS);
        if (!response.ok) {
          throw new Error(`Failed to fetch menu items. Status: ${response.status}`);
        }
        const data = await response.json();
        console.log('CreateOrderForm: API response:', data);
        console.log('CreateOrderForm: Data type:', typeof data);
        console.log('CreateOrderForm: Is array?', Array.isArray(data));
        
        // Handle different response structures
        let items = data;
        if (data && typeof data === 'object' && !Array.isArray(data)) {
            // If it's a paginated response, extract the results
            items = data.results || data.items || data.data || [];
        }
        
        // Ensure we have an array
        if (!Array.isArray(items)) {
            console.error('CreateOrderForm: Expected array but got:', typeof items, items);
            items = [];
        }
        
        console.log('CreateOrderForm: Final items:', items);
        console.log('CreateOrderForm: Items count:', items.length);
        console.log('CreateOrderForm: Available items:', items.filter(item => item.is_available).length);
        console.log('CreateOrderForm: Main items (not extras):', items.filter(item => !item.is_extra && item.is_available).length);
        console.log('CreateOrderForm: Sample items:', items.slice(0, 3));
        setAllMenuItems(items);
      } catch (error) {
        console.error('Error fetching menu items:', error);
        console.error('Failed to fetch menu items.');
      }
    };
    fetchInitialData();
  }, [fetchDeliveryLocations]);


  const handleRemoveItem = useCallback((itemId) => {
    setSelectedItems(prev => {
      const newItems = { ...prev };
      delete newItems[itemId];
      return newItems;
    });
    // Item removed from order
  }, []);

  const handleQuantityChange = useCallback((itemId, quantity) => {
    const numQuantity = parseInt(quantity, 10);
    if (numQuantity <= 0) {
      handleRemoveItem(itemId);
    } else {
      setSelectedItems(prev => ({
        ...prev,
        [itemId]: numQuantity,
      }));
    }
  }, [handleRemoveItem]);

  const handleAddItem = useCallback((itemId) => {
    const item = displayMenuItems.find(i => i.id === itemId);
    if (!item) return;

    if (!selectedItems[itemId] || selectedItems[itemId] === 0) {
        handleQuantityChange(itemId, 1);
        // Item added to order
    } else {
        // Item is already in the order
    }
    setShowMenuDropdown(false);
  }, [displayMenuItems, selectedItems, handleQuantityChange]);



  const handleAddExtra = (extraId) => {
    const extra = extraMenuItems.find(e => e.id === extraId);
    if (!extra) return;
    
    if (!selectedExtras[extraId] || selectedExtras[extraId] === 0) {
      setSelectedExtras(prev => ({ ...prev, [extraId]: 1 }));
      // Extra added
    } else {
      // Extra is already added
    }
    setShowExtraDropdown(false);
  };

  const handleRemoveExtra = (extraId) => {
    const extra = extraMenuItems.find(e => e.id === extraId);
    setSelectedExtras(prev => {
      const newExtras = { ...prev };
      delete newExtras[extraId];
      return newExtras;
    });
    if (extra) {
      // Extra removed
    }
  };

  const handleExtraQuantityChange = (extraId, quantity) => {
    const numQuantity = parseInt(quantity, 10);
    if (numQuantity <= 0) {
      handleRemoveExtra(extraId);
    } else {
      setSelectedExtras(prev => ({ ...prev, [extraId]: numQuantity }));
    }
  };

  const handleDeliveryTypeChange = (newDeliveryType) => {
    setDeliveryType(newDeliveryType);
    
    // Clear any validation errors related to customer fields when switching
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.customerName;
      delete newErrors.customerPhone;
      delete newErrors.deliveryLocation;
      return newErrors;
    });
    
    // Clear delivery-related fields when switching to pickup
    if (newDeliveryType === 'Pickup') {
      setDeliveryLocation('');
      setCustomerPhone('');
    }
  };

  const validateForm = () => {
    let formErrors = {};
    
    // Only validate customer fields if delivery is selected
    if (deliveryType === 'Delivery') {
      if (!customerPhone.trim()) formErrors.customerPhone = 'Customer phone is required for delivery orders';
      if (customerPhone.trim() && !/^(\+233|0)\d{9}$/.test(customerPhone.trim())) {
          formErrors.customerPhone = 'Invalid Ghana phone format (e.g., 0XXXXXXXXX or +233XXXXXXXXX)';
      }
      if (!deliveryLocation) {
          formErrors.deliveryLocation = 'Delivery location is required for delivery orders.';
      }
    } else {
      // For pickup orders, validate phone format only if provided
      if (customerPhone.trim() && !/^(\+233|0)\d{9}$/.test(customerPhone.trim())) {
          formErrors.customerPhone = 'Invalid Ghana phone format (e.g., 0XXXXXXXXX or +233XXXXXXXXX)';
      }
    }

    const currentOrderItems = Object.entries(selectedItems)
      .filter(([, quantity]) => quantity > 0)
      .map(([itemId, quantity]) => ({ menu_item_id: itemId, quantity }));

    if (currentOrderItems.length === 0) {
      formErrors.items = 'At least one item must be added to the order';
    }
    setErrors(formErrors);
    return Object.keys(formErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      setIsModalOpen(true);
    } else {
      console.error('Please correct the form errors.');
    }
  };

  const currentOrderSubTotal = Object.entries(selectedItems).reduce((total, [itemId, quantity]) => {
    const item = (allMenuItems || []).find(mi => mi.id.toString() === itemId);
    return total + (item && item.price && quantity > 0 ? parseFloat(item.price) * quantity : 0);
  }, 0);
  
  const extrasSubTotal = Object.entries(selectedExtras).reduce((total, [extraId, quantity]) => {
    const extra = extraMenuItems.find(e => e.id.toString() === extraId);
    return total + (extra && extra.price && quantity > 0 ? parseFloat(extra.price) * quantity : 0);
  }, 0);

  const currentDeliveryFee = deliveryType === 'Delivery' && deliveryLocation
                             ? parseFloat(deliveryLocations.find(loc => loc.name === deliveryLocation)?.fee || 0)
                             : 0;
  const grandTotal = currentOrderSubTotal + extrasSubTotal + currentDeliveryFee;

  const handleFinalSubmit = async () => {
    // Prevent multiple submissions
    if (isSubmitting) {
      toast.warning('Order is being processed, please wait...');
      return;
    }

    setIsSubmitting(true);

    try {
      const payloadItems = Object.entries(selectedItems)
        .filter(([, quantity]) => quantity > 0)
        .map(([itemId, quantity]) => ({ menu_item_id: itemId, quantity }));
      
      const payloadExtras = Object.entries(selectedExtras)
        .filter(([, quantity]) => quantity > 0)
        .map(([extraId, quantity]) => ({ menu_item_id: extraId, quantity }));
      
      // Combine main items and extras into one items array
      const allItems = [...payloadItems, ...payloadExtras];

      const orderPayload = {
        customer_phone: customerPhone.trim(),
        delivery_type: deliveryType,
        notes: notes.trim(),
        items: allItems,
      };

      if (deliveryType === 'Delivery') {
        orderPayload.delivery_location = deliveryLocation;
      }

      const response = await authenticatedFetch(API_ENDPOINTS.ORDERS, {
        method: 'POST',
        body: JSON.stringify(orderPayload),
      });

      if (response.ok) {
        const result = await response.json();
        
        // Show success notification
        toast.success(`🎉 Order ${result.order_number} created successfully!`, {
          position: "top-right",
          autoClose: 4000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        
        // Show order details in a second notification
        setTimeout(() => {
          toast.info(`📋 Order Total: ₵${grandTotal.toFixed(2)} | Type: ${deliveryType}${deliveryType === 'Delivery' && deliveryLocation ? ` to ${deliveryLocation}` : ''}`, {
            position: "top-right",
            autoClose: 6000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
        }, 500);
        
        setCustomerPhone('');
        setDeliveryType('Pickup');
        setDeliveryLocation('');
        setNotes('');
        setSelectedItems({});
        setSelectedExtras({});
        setErrors({});
        setIsModalOpen(false);
        navigate('/view-orders');
      } else {
        const errorData = await response.json().catch(() => ({ detail: `Request failed with status ${response.status}` }));
        let errorMessages = errorData.detail || 'Failed to create order.';
        console.error(`Error: ${errorMessages}`);
      }
    } catch (error) {
      console.error('Order submission error:', error);
      console.error('Network error: Could not submit order.');
    } finally {
      // Always re-enable the button after the request completes
      setIsSubmitting(false);
    }
  };


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
          <span>Return to Dashboard</span>
        </Button>
      </div>
      
      <Row className="g-3 g-md-4">
        {/* Order Form - Left Side (Full width on mobile, 8 columns on large screens) */}
        <Col lg={8} className="order-1 order-lg-1">
          <Card className="ada-shadow-md">
            <Card.Header className="ada-bg-primary text-white py-3">
              <h5 className="mb-0">
                <i className="bi bi-plus-circle me-2"></i>
                Create New Order
              </h5>
            </Card.Header>
            <Card.Body className="p-4">
              <Form onSubmit={handleSubmit}>
            
            {/* Menu Items Section */}
            <div className="mb-4">
              <h6 className="ada-text-primary mb-3 fw-bold text-start">
                <i className="bi bi-collection me-2"></i>
                Menu Items
              </h6>
              
              {errors.items && <div className="alert alert-danger py-2 mb-3">{errors.items}</div>}
              
              {Object.keys(selectedItems).length > 0 && (
                <div className="ada-shadow-sm mb-3" style={{ border: '1px solid #e9ecef', borderRadius: 'var(--ada-border-radius-lg)', backgroundColor: 'var(--ada-off-white)' }}>
                  <ListGroup variant="flush">
                    {Object.entries(selectedItems).map(([itemId, quantity]) => {
                      const item = displayMenuItems.find(mi => mi.id.toString() === itemId);
                      if (!item || quantity <= 0) return null;
                      return (
                        <ListGroup.Item key={itemId} className="py-3">
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="flex-grow-1">
                              <h6 className="mb-1 ada-text-primary">{item.name}</h6>
                              <small className="text-muted">₵{parseFloat(item.price || 0).toFixed(2)} each</small>
                            </div>
                            <div className="d-flex align-items-center ms-3">
                              <Button 
                                variant="outline-secondary" 
                                size="sm" 
                                onClick={() => handleQuantityChange(itemId, quantity - 1)}
                                className="ada-shadow-sm"
                                style={{ minHeight: '44px', minWidth: '44px' }}
                              >
                                {quantity === 1 ? <i className="bi bi-trash" style={{ fontSize: '0.8rem' }}></i> : '-'}
                              </Button>
                              <span className="mx-3 fw-bold ada-text-primary" style={{ minWidth: '25px', textAlign: 'center', fontSize: '1.1rem' }}>{quantity}</span>
                              <Button 
                                variant="outline-secondary" 
                                size="sm" 
                                onClick={() => handleQuantityChange(itemId, quantity + 1)}
                                className="ada-shadow-sm"
                                style={{ minHeight: '44px', minWidth: '44px' }}
                              >
                                +
                              </Button>
                            </div>
                          </div>
                        </ListGroup.Item>
                      );
                    })}
                  </ListGroup>
                </div>
              )}
              
              {/* Add Items Button - appears below selected items, aligned right */}
              <div className="mb-3 d-flex justify-content-end">
              <Button 
                variant="primary" 
                size="sm" 
                onClick={() => setShowMenuDropdown(!showMenuDropdown)}
                className="ada-shadow-sm"
                style={{ minHeight: '44px' }}
              >
                <i className="bi bi-plus me-1"></i>
                Add Items
              </Button>
              </div>
              
              {showMenuDropdown && (
                <div className="mb-3 p-3 ada-shadow-sm" style={{ border: '1px solid #e9ecef', borderRadius: 'var(--ada-border-radius-lg)', backgroundColor: 'var(--ada-light-gray)' }}>
                  <div className="d-flex gap-2 flex-wrap">
                    {displayMenuItems.length === 0 ? (
                      <div className="text-center py-3">
                        <div className="text-muted mb-2">
                          <i className="bi bi-exclamation-triangle" style={{ fontSize: '1.5rem' }}></i>
                        </div>
                        <p className="text-muted mb-0">No menu items available</p>
                        <small className="text-muted">
                          {allMenuItems.length === 0 ? 'No items loaded from API' : `${allMenuItems.length} total items, but none are available items`}
                        </small>
                      </div>
                    ) : (
                      displayMenuItems
                        .filter(item => !selectedItems[item.id])
                        .map(item => (
                          <Button
                            key={item.id}
                            variant="outline-success"
                            size="sm"
                            onClick={() => handleAddItem(item.id)}
                            className="ada-shadow-sm mb-2"
                            style={{ minHeight: '44px' }}
                          >
                            {item.name} (₵{parseFloat(item.price || 0).toFixed(2)})
                            <i className="bi bi-plus-circle ms-1"></i>
                          </Button>
                        ))
                    )}
                  </div>
                  {displayMenuItems.filter(item => !selectedItems[item.id]).length === 0 && (
                    <small className="text-muted fst-italic">All menu items have been added</small>
                  )}
                </div>
              )}
            </div>
            
            {/* Extras Section */}
            <div className="mb-4">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="ada-text-primary mb-0 fw-bold text-start">
                  <i className="bi bi-star me-2"></i>
                  Extras
                </h6>
                <Button 
                  variant="warning" 
                  size="sm" 
                  onClick={() => setShowExtraDropdown(!showExtraDropdown)}
                  className="ada-shadow-sm"
                  style={{ minHeight: '44px' }}
                >
                  <i className="bi bi-plus me-1"></i>
                  Add Extras
                </Button>
              </div>
              
              {showExtraDropdown && (
                <div className="mb-3 p-3 ada-shadow-sm" style={{ border: '1px solid #e9ecef', borderRadius: 'var(--ada-border-radius-lg)', backgroundColor: 'var(--ada-light-gray)' }}>
                  <div className="d-flex gap-2 flex-wrap">
                    {extraMenuItems
                      .filter(extra => !selectedExtras[extra.id])
                      .map(extra => (
                        <Button
                          key={extra.id}
                          variant="outline-success"
                          size="sm"
                          onClick={() => handleAddExtra(extra.id)}
                          className="ada-shadow-sm mb-2"
                          style={{ minHeight: '44px' }}
                        >
                          {extra.name} (₵{parseFloat(extra.price || 0).toFixed(2)})
                          <i className="bi bi-plus-circle ms-1"></i>
                        </Button>
                      ))
                    }
                  </div>
                  {extraMenuItems.filter(extra => !selectedExtras[extra.id]).length === 0 && (
                    <small className="text-muted fst-italic">All extras have been added</small>
                  )}
                </div>
              )}
              
              {Object.keys(selectedExtras).length > 0 && (
                <div className="ada-shadow-sm" style={{ border: '1px solid #e9ecef', borderRadius: 'var(--ada-border-radius-lg)', backgroundColor: 'var(--ada-off-white)' }}>
                  <ListGroup variant="flush">
                    {Object.entries(selectedExtras).map(([extraId, quantity]) => {
                      const extra = extraMenuItems.find(e => e.id.toString() === extraId);
                      if (!extra || quantity <= 0) return null;
                      return (
                        <ListGroup.Item key={extraId} className="py-3">
                          <div className="d-flex justify-content-between align-items-center">
                            <div className="flex-grow-1">
                              <h6 className="mb-1 ada-text-primary">{extra.name}</h6>
                              <small className="text-muted">₵{parseFloat(extra.price || 0).toFixed(2)} each</small>
                            </div>
                            <div className="d-flex align-items-center ms-3">
                              <Button 
                                variant="outline-secondary" 
                                size="sm" 
                                onClick={() => handleExtraQuantityChange(extraId, quantity - 1)}
                                className="ada-shadow-sm"
                                style={{ minHeight: '44px', minWidth: '44px' }}
                              >
                                {quantity === 1 ? <i className="bi bi-trash" style={{ fontSize: '0.8rem' }}></i> : '-'}
                              </Button>
                              <span className="mx-3 fw-bold ada-text-primary" style={{ minWidth: '25px', textAlign: 'center', fontSize: '1.1rem' }}>{quantity}</span>
                              <Button 
                                variant="outline-secondary" 
                                size="sm" 
                                onClick={() => handleExtraQuantityChange(extraId, quantity + 1)}
                                className="ada-shadow-sm"
                                style={{ minHeight: '44px', minWidth: '44px' }}
                              >
                                +
                              </Button>
                            </div>
                          </div>
                        </ListGroup.Item>
                      );
                    })}
                  </ListGroup>
                </div>
              )}
            </div>
            
            {/* Order Details Section */}
            <div className="mb-4">
              <h6 className="ada-text-primary mb-3 fw-bold text-start">
                <i className="bi bi-truck me-2"></i>
                Order Details
              </h6>
              <Row className="mb-3 gy-3">
                <Col md={4}>
                  <Form.Group controlId="deliveryType">
                    <Form.Label className="fw-semibold">Delivery Type</Form.Label>
                    <Form.Select 
                      value={deliveryType} 
                      onChange={(e) => handleDeliveryTypeChange(e.target.value)}
                      className="ada-shadow-sm"
                      style={{ minHeight: '44px' }}
                    >
                      <option value="Pickup">🏪 Pickup</option>
                      <option value="Delivery">🚚 Delivery</option>
                    </Form.Select>
                  </Form.Group>
                </Col>
                {deliveryType === 'Delivery' && (
                  <Col md={4}>
                    <Form.Group controlId="deliveryLocation">
                      <Form.Label className="fw-semibold">Delivery Location <span className="text-danger">*</span></Form.Label>
                      <Form.Select 
                        value={deliveryLocation} 
                        onChange={(e) => setDeliveryLocation(e.target.value)} 
                        isInvalid={!!errors.deliveryLocation}
                        className="ada-shadow-sm"
                        style={{ minHeight: '44px' }}
                        disabled={loadingLocations}
                      >
                        <option value="">
                          {loadingLocations ? '⏳ Loading locations...' : '📍 Select a location'}
                        </option>
                        {(deliveryLocations && Array.isArray(deliveryLocations) ? deliveryLocations : []).map(location => (
                          <option key={location.id || location.name} value={location.name}>
                            {location.name} (Fee: ₵{parseFloat(location.fee || 0).toFixed(2)})
                          </option>
                        ))}
                      </Form.Select>
                      <Form.Control.Feedback type="invalid">{errors.deliveryLocation}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                )}
              {deliveryType === 'Delivery' && (
                  <Col md={4}>
                    <Form.Group controlId="customerPhone">
                      <Form.Label className="fw-semibold">
                        Customer Phone <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="text"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        isInvalid={!!errors.customerPhone}
                        placeholder="0XXXXXXXXX or +233XXXXXXXXX"
                        className="ada-shadow-sm"
                        style={{ minHeight: '44px', fontSize: '16px' }}
                        required
                      />
                      <Form.Control.Feedback type="invalid">{errors.customerPhone}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                
                    )}
              </Row>
            </div>
            
            {/* Order Notes Button */}
            <div className="mb-3">
              <Button 
                variant="primary" 
                onClick={() => setIsNotesModalOpen(true)}
                className="ada-shadow-sm d-flex align-items-center"
                style={{ borderRadius: 'var(--ada-border-radius-md)', minHeight: '44px' }}
              >
                <i className="bi bi-chat-dots me-2"></i>
                <span>{notes.trim() ? 'Edit Order Notes' : 'Add Order Notes'}</span>
                {notes.trim() && <span className="badge bg-success ms-2">✓</span>}
              </Button>
              {notes.trim() && (
                <small className="text-muted d-block mt-1">
                  Preview: {notes.substring(0, 50)}{notes.length > 50 ? '...' : ''}
                </small>
              )}
            </div>
            
              </Form>
            </Card.Body>
          </Card>
        </Col>
        
        {/* Order Summary - Right Side (Full width on mobile, 4 columns on large screens) */}
        <Col lg={4} className="order-2 order-lg-2 mb-3 mb-lg-0">
          <Card className="ada-shadow-md">
            <Card.Header className="ada-bg-secondary text-white py-3">
              <h6 className="mb-0">
                <i className="bi bi-receipt me-2"></i>
                Order Summary
              </h6>
            </Card.Header>
            <Card.Body className="p-3" style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 300px)', minHeight: '200px' }}>
              {/* Selected Items */}
              {Object.keys(selectedItems).length > 0 ? (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="ada-text-primary mb-0">
                      <i className="bi bi-bag me-1"></i>
                      Items
                    </h6>
                    <span className="badge bg-primary">{Object.keys(selectedItems).length}</span>
                  </div>
                  <div className="mb-2" style={{ maxHeight: '120px', overflowY: 'auto' }}>
                    {Object.entries(selectedItems).map(([itemId, quantity]) => {
                      if (quantity <= 0) return null;
                      const item = displayMenuItems.find(mi => mi.id.toString() === itemId);
                      if (!item) return null;
                      const itemTotal = parseFloat(item.price || 0) * quantity;
                      return (
                        <div key={itemId} className="d-flex justify-content-between align-items-center mb-1 p-1" style={{ backgroundColor: 'var(--ada-off-white)', borderRadius: 'var(--ada-border-radius-sm)' }}>
                          <div className="flex-grow-1">
                            <div className="fw-semibold" style={{ fontSize: '0.8rem' }}>{item.name}</div>
                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>₵{parseFloat(item.price || 0).toFixed(2)} × {quantity}</small>
                          </div>
                          <div className="fw-bold ada-text-primary" style={{ fontSize: '0.8rem' }}>₵{itemTotal.toFixed(2)}</div>
                        </div>
                      );
                    })}
                  </div>
                  <hr className="my-2" />
                </>
              ) : (
                <div className="text-center py-3">
                  <i className="bi bi-bag text-muted" style={{ fontSize: '1.5rem' }}></i>
                  <p className="text-muted mt-2 mb-0">No items selected</p>
                  <small className="text-muted">Add items to see summary</small>
                </div>
              )}
              
              {/* Selected Extras */}
              {Object.keys(selectedExtras).length > 0 && (
                <>
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <h6 className="ada-text-primary mb-0">
                      <i className="bi bi-star me-1"></i>
                      Extras
                    </h6>
                    <span className="badge bg-warning">{Object.keys(selectedExtras).length}</span>
                  </div>
                  <div className="mb-2" style={{ maxHeight: '100px', overflowY: 'auto' }}>
                    {Object.entries(selectedExtras).map(([extraId, quantity]) => {
                      if (quantity <= 0) return null;
                      const extra = extraMenuItems.find(e => e.id.toString() === extraId);
                      if (!extra) return null;
                      const extraTotal = parseFloat(extra.price || 0) * quantity;
                      return (
                        <div key={extraId} className="d-flex justify-content-between align-items-center mb-1 p-1" style={{ backgroundColor: 'var(--ada-off-white)', borderRadius: 'var(--ada-border-radius-sm)' }}>
                          <div className="flex-grow-1">
                            <div className="fw-semibold" style={{ fontSize: '0.8rem' }}>{extra.name}</div>
                            <small className="text-muted" style={{ fontSize: '0.7rem' }}>₵{parseFloat(extra.price || 0).toFixed(2)} × {quantity}</small>
                          </div>
                          <div className="fw-bold ada-text-primary" style={{ fontSize: '0.8rem' }}>₵{extraTotal.toFixed(2)}</div>
                        </div>
                      );
                    })}
                  </div>
                  <hr className="my-2" />
                </>
              )}
              
              {/* Order Totals */}
              {(Object.keys(selectedItems).length > 0 || Object.keys(selectedExtras).length > 0) && (
                <>
                  <div className="d-flex justify-content-between mb-1">
                    <span>Items:</span>
                    <span className="fw-semibold">₵{currentOrderSubTotal.toFixed(2)}</span>
                  </div>
                  
                  {extrasSubTotal > 0 && (
                    <div className="d-flex justify-content-between mb-1">
                      <span>Extras:</span>
                      <span className="fw-semibold">₵{extrasSubTotal.toFixed(2)}</span>
                    </div>
                  )}
                  
                  {deliveryType === 'Delivery' && deliveryLocation && (
                    <div className="d-flex justify-content-between mb-1">
                      <span>Delivery ({deliveryLocation}):</span>
                      <span className="fw-semibold">₵{currentDeliveryFee.toFixed(2)}</span>
                    </div>
                  )}
                  
                  <hr className="my-2" />
                  
                  <div className="d-flex justify-content-between mb-3">
                    <h6 className="ada-text-primary mb-0">Total:</h6>
                    <h6 className="ada-text-primary mb-0">₵{grandTotal.toFixed(2)}</h6>
                  </div>
                  
                  {/* Order Type Badge */}
                  <div className="mb-2">
                    <span className={`badge ${deliveryType === 'Delivery' ? 'bg-warning' : 'bg-success'} w-100 py-2`} style={{ fontSize: '1rem' }}>
                      <i className={`bi ${deliveryType === 'Delivery' ? 'bi-truck' : 'bi-shop'} me-1`}></i>
                      {deliveryType} Order
                      {deliveryType === 'Delivery' && deliveryLocation && ` to ${deliveryLocation}`}
                    </span>
                  </div>
                </>
              )}
            </Card.Body>
            {/* Card Footer with Create Order Button */}
            {(Object.keys(selectedItems).length > 0 || Object.keys(selectedExtras).length > 0) && (
              <Card.Footer className="p-3">
                <div className="d-grid">
                  <Button 
                    variant="primary" 
                    size="md" 
                    onClick={handleSubmit}
                    className="ada-shadow-md py-3"
                    style={{ borderRadius: 'var(--ada-border-radius-md)', minHeight: '54px' }}
                  >
                    <i className="bi bi-check-circle me-2"></i>
                    Create Order
                  </Button>
                </div>
              </Card.Footer>
            )}
          </Card>
        </Col>
      </Row>

      <Modal show={isModalOpen} onHide={() => setIsModalOpen(false)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title className="d-flex justify-content-between align-items-center w-100">
            <div>
              <span>Confirm Order</span>
            </div>
            <div className="d-flex gap-2">
              <span className={`badge ${deliveryType === 'Delivery' ? 'bg-warning text-dark' : 'bg-success'}`} style={{ fontSize: '0.75rem' }}>
                <i className={`bi ${deliveryType === 'Delivery' ? 'bi-truck' : 'bi-shop'} me-1`}></i>
                {deliveryType}
              </span>
            </div>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="order-details-container">
          {/* Order Items Section - First */}
          {(Object.keys(selectedItems).length > 0 || Object.keys(selectedExtras).length > 0) && (
            <div className="mb-3">
              <Card className="h-100">
                <Card.Header style={{ backgroundColor: 'var(--ada-primary)', color: 'white' }}>
                  <h6 className="mb-0 text-white d-flex align-items-center">
                    <i className="bi bi-bag me-2"></i>
                    Order Items ({Object.keys(selectedItems).length + Object.keys(selectedExtras).length})
                  </h6>
                </Card.Header>
                <Card.Body className="p-3">
                  {/* Main Items */}
                  {Object.entries(selectedItems).map(([itemId, quantity]) => {
                    if (!(quantity > 0)) return null;
                    const itemDetails = (allMenuItems || []).find(mi => mi.id.toString() === itemId);
                    return (
                      <div key={itemId} className="d-flex justify-content-between align-items-center mb-2 p-2" style={{ backgroundColor: 'var(--ada-off-white)', borderRadius: '4px' }}>
                        <div className="flex-grow-1">
                          <div className="fw-semibold">{itemDetails?.name || `Item ${itemId}`}</div>
                          <small className="text-muted">₵{parseFloat(itemDetails?.price || 0).toFixed(2)} × {quantity}</small>
                        </div>
                        <div className="fw-bold text-success">₵{(parseFloat(itemDetails?.price || 0) * quantity).toFixed(2)}</div>
                      </div>
                    );
                  })}
                  
                  {/* Extras */}
                  {Object.entries(selectedExtras).map(([extraId, quantity]) => {
                    if (!(quantity > 0)) return null;
                    const extraDetails = (allMenuItems || []).find(mi => mi.id.toString() === extraId);
                    return (
                      <div key={extraId} className="d-flex justify-content-between align-items-center mb-2 p-2" style={{ backgroundColor: 'var(--ada-off-white)', borderRadius: '4px' }}>
                        <div className="flex-grow-1">
                          <div className="fw-semibold">{extraDetails?.name || `Extra ${extraId}`} <small className="text-muted">(Extra)</small></div>
                          <small className="text-muted">₵{parseFloat(extraDetails?.price || 0).toFixed(2)} × {quantity}</small>
                        </div>
                        <div className="fw-bold text-success">₵{(parseFloat(extraDetails?.price || 0) * quantity).toFixed(2)}</div>
                      </div>
                    );
                  })}
                  
                  <hr className="my-2" />
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="fw-bold">Items Subtotal:</span>
                    <span className="fw-bold text-success fs-6">₵{(currentOrderSubTotal + extrasSubTotal).toFixed(2)}</span>
                  </div>
                </Card.Body>
              </Card>
            </div>
          )}

          {/* Customer & Delivery and Summary Information - Side by Side in Cards */}
          <Row className="mb-3">
            <Col md={6}>
              <Card className="h-100 mb-3 mb-md-0">
                <Card.Header style={{ backgroundColor: 'var(--ada-primary)', color: 'white' }}>
                  <h6 className="mb-0 text-white d-flex align-items-center">
                    <i className="bi bi-person-circle me-2"></i>
                    Customer & Delivery
                  </h6>
                </Card.Header>
                <Card.Body className="p-3">
                  {deliveryType === 'Delivery' && (
                    <>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <span>Phone:</span>
                        <span className="text-muted small">{customerPhone.trim() || 'Not provided'}</span>
                      </div>
                    </>
                  )}
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span>Type:</span>
                    <span className={`badge ${deliveryType === 'Delivery' ? 'bg-warning text-dark' : 'bg-success'}`}>
                      <i className={`bi ${deliveryType === 'Delivery' ? 'bi-truck' : 'bi-shop'} me-1`}></i>
                      {deliveryType}
                    </span>
                  </div>
                  {deliveryType === 'Delivery' && deliveryLocation && (
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span>Location:</span>
                      <span className="text-muted small">{deliveryLocation}</span>
                    </div>
                  )}
                  {deliveryType === 'Delivery' && currentDeliveryFee > 0 && (
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span>Delivery Fee:</span>
                      <span className="fw-bold text-info">₵{currentDeliveryFee.toFixed(2)}</span>
                    </div>
                  )}
                  {notes.trim() && (
                    <div className="mt-2">
                      <div className="bg-light p-2 rounded">
                        <small>
                          <i className="bi bi-sticky me-1"></i>
                          <strong>Notes:</strong> {notes}
                        </small>
                      </div>
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>
            <Col md={6}>
              <Card className="h-100 mb-3 mb-md-0">
                <Card.Header style={{ backgroundColor: 'var(--ada-primary)', color: 'white' }}>
                  <h6 className="mb-0 text-white d-flex align-items-center">
                    <i className="bi bi-calculator me-2"></i>
                    Order Summary
                  </h6>
                </Card.Header>
                <Card.Body className="p-3">
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <span>Items Subtotal:</span>
                    <span className="fw-bold">₵{currentOrderSubTotal.toFixed(2)}</span>
                  </div>
                  {extrasSubTotal > 0 && (
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span>Extras Subtotal:</span>
                      <span className="fw-bold">₵{extrasSubTotal.toFixed(2)}</span>
                    </div>
                  )}
                  {currentDeliveryFee > 0 && (
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span>Delivery Fee:</span>
                      <span className="fw-bold">₵{currentDeliveryFee.toFixed(2)}</span>
                    </div>
                  )}
                  <hr className="my-2" />
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="fw-bold fs-5">Total:</span>
                    <span className="fw-bold text-success fs-5">₵{grandTotal.toFixed(2)}</span>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Modal.Body>
        <Modal.Footer className="p-3">
          <div className="d-flex flex-column flex-sm-row w-100 gap-3">
            <Button 
              variant="secondary" 
              onClick={() => setIsModalOpen(false)}
              className="order-3 order-sm-1 flex-fill"
              style={{ minHeight: '48px' }}
            >
              <i className="bi bi-pencil-square me-2"></i>
              Edit
            </Button>
            <Button 
              variant="danger" 
              onClick={() => { 
                setIsModalOpen(false); 
                setCustomerPhone(''); 
                setDeliveryType('Pickup'); 
                setNotes(''); 
                setSelectedItems({}); 
                setSelectedExtras({}); 
                setErrors({}); 
              }}
              className="order-2 order-sm-2 flex-fill"
              style={{ minHeight: '48px' }}
            >
              <i className="bi bi-x-circle me-2"></i>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="order-1 order-sm-3 flex-fill"
              style={{ minHeight: '48px' }}
            >
              {isSubmitting ? (
                <>
                  <div className="spinner-border spinner-border-sm me-2" role="status">
                    <span className="visually-hidden">Processing...</span>
                  </div>
                  Processing...
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle me-2"></i>
                  Accept
                </>
              )}
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* Notes Modal */}
      <Modal show={isNotesModalOpen} onHide={() => setIsNotesModalOpen(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-chat-dots me-2"></i>
            Order Notes
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group controlId="notesModal">
            <Form.Label className="fw-semibold">Special instructions or requests:</Form.Label>
            <Form.Control 
              as="textarea" 
              rows={4} 
              value={notes} 
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter any special instructions, dietary requirements, or delivery notes..."
              className="ada-shadow-sm"
              style={{ fontSize: '16px' }} /* Prevents zoom on focus in iOS */
            />
          </Form.Group>
          <small className="text-muted">
            Character count: {notes.length}
          </small>
        </Modal.Body>
        <Modal.Footer className="p-3">
          <div className="d-flex flex-column flex-sm-row w-100 gap-3">
            <Button 
              variant="danger" 
              onClick={() => setIsNotesModalOpen(false)}
              className="order-2 order-sm-1 flex-fill"
              style={{ minHeight: '48px' }}
            >
              <i className="bi bi-x-circle me-2"></i>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={() => setIsNotesModalOpen(false)}
              className="ada-shadow-sm order-1 order-sm-2 flex-fill"
              style={{ minHeight: '48px' }}
            >
              <i className="bi bi-check-circle me-2"></i>
              Save Notes
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

    </Container>
  );
};

export default CreateOrderForm;
