import React, { useState, useEffect, useCallback } from 'react';
import { Form, Button, Container, Row, Col, Card, ListGroup, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { API_ENDPOINTS } from '../utils/api';
import { apiFirstService } from '../services/apiFirstService';
import { menuCacheService } from '../services/menuCacheService';

// Delivery locations will be fetched from backend

const CreateOrderForm = ({ isEditMode = false, existingOrder = null, orderNumber = null }) => {
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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showExtraDropdown, setShowExtraDropdown] = useState(false);
  const [showMenuDropdown, setShowMenuDropdown] = useState(true);
  const [deliveryLocations, setDeliveryLocations] = useState([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [customLocationName, setCustomLocationName] = useState('');
  const [customLocationFee, setCustomLocationFee] = useState('');
  const [locationSearchTerm, setLocationSearchTerm] = useState('');
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  
  // Filter menu items into main items and extras
  const mainMenuItems = (allMenuItems || []).filter(item => !item.is_extra && item.is_available);
  const extraMenuItems = (allMenuItems || []).filter(item => item.is_extra && item.is_available);
  
  // Fallback: if no main menu items found, show all available items (in case is_extra field is missing or different)
  const displayMenuItems = mainMenuItems.length > 0 ? mainMenuItems : (allMenuItems || []).filter(item => item.is_available);

  // Filter delivery locations based on search term
  const filteredDeliveryLocations = deliveryLocations.filter(location =>
    location.name.toLowerCase().includes(locationSearchTerm.toLowerCase())
  );

  // Fetch delivery locations from backend
  const fetchDeliveryLocations = useCallback(async () => {
    setLoadingLocations(true);
    try {
      const data = await apiFirstService.request(`${API_ENDPOINTS.ORDERS}delivery-locations/`, {
        method: 'GET'
      });
      
      // Ensure we have an array
      let locations = data;
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        // If it's a paginated response, extract the results
        locations = data.results || data.items || data.data || [];
      }
      
      // Ensure we have an array
      if (!Array.isArray(locations)) {
        locations = [];
      }
      
      setDeliveryLocations(locations);
    } catch (error) {
      // Fallback to empty array if fetch fails
      setDeliveryLocations([]);
    } finally {
      setLoadingLocations(false);
    }
  }, []);



  // Function to populate form with existing order data
  const populateFormWithOrderData = useCallback((order) => {
    if (!order) return;
    
    console.log('🔄 Populating form with order data:', order);
    
    // Set basic order details
    setCustomerPhone(order.customer_phone || '');
    setDeliveryType(order.delivery_type || 'Pickup');
    setNotes(order.notes || '');
    
    // Set delivery location
    if (order.delivery_type === 'Delivery') {
      if (order.custom_delivery_location) {
        setDeliveryLocation('Other');
        setCustomLocationName(order.custom_delivery_location);
        setCustomLocationFee(order.custom_delivery_fee?.toString() || '0');
        setLocationSearchTerm('Custom location - use fields below');
      } else if (order.delivery_location) {
        setDeliveryLocation(order.delivery_location);
        setLocationSearchTerm(order.delivery_location);
      }
    }
    
    // Set selected items - need to wait for allMenuItems to be loaded
    if (allMenuItems && allMenuItems.length > 0) {
      const newSelectedItems = {};
      const newSelectedExtras = {};
      
      if (order.items && Array.isArray(order.items)) {
        console.log('📋 Processing order items:', order.items);
        order.items.forEach(item => {
          // Find the menu item in allMenuItems to get is_extra status
          const menuItem = allMenuItems.find(mi => mi.id === item.menu_item_id);
          if (menuItem) {
            if (menuItem.is_extra) {
              newSelectedExtras[item.menu_item_id] = item.quantity;
              console.log(`✨ Added extra: ${menuItem.name} (quantity: ${item.quantity})`);
            } else {
              newSelectedItems[item.menu_item_id] = item.quantity;
              console.log(`🍽️ Added item: ${menuItem.name} (quantity: ${item.quantity})`);
            }
          } else {
            console.warn(`⚠️ Menu item with ID ${item.menu_item_id} not found in current menu items`);
            // Default to regular item if menu item not found
            newSelectedItems[item.menu_item_id] = item.quantity;
          }
        });
      }
      
      setSelectedItems(newSelectedItems);
      setSelectedExtras(newSelectedExtras);
      console.log('✅ Items populated:', { items: newSelectedItems, extras: newSelectedExtras });
    } else {
      console.log('⏳ Menu items not loaded yet, will populate items later');
    }
  }, [allMenuItems]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const fetchInitialData = async () => {
      await fetchDeliveryLocations();
      
      try {
        // Use cache service for instant menu loading
        console.log(`🚀 Loading menu items for order ${isEditMode ? 'editing' : 'creation'}...`);
        const items = await menuCacheService.getMenuItems();
        setAllMenuItems(items);
        console.log(`✅ Loaded ${items.length} menu items for order ${isEditMode ? 'editing' : 'creation'}`);
        
        // If in edit mode and we have existing order data, populate the form
        if (isEditMode && existingOrder && !isInitialized) {
          populateFormWithOrderData(existingOrder);
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('❌ Error loading menu items for order:', error);
        // Fallback to empty array on error
        setAllMenuItems([]);
      }
    };
    
    fetchInitialData();
  }, [fetchDeliveryLocations, isEditMode, existingOrder, populateFormWithOrderData, isInitialized]);
  
  // Separate effect to repopulate items when menu items are loaded (after initial load)
  useEffect(() => {
    if (isEditMode && existingOrder && allMenuItems.length > 0 && isInitialized) {
      // Re-populate items now that menu items are available
      console.log('🔄 Re-populating items with loaded menu data');
      populateFormWithOrderData(existingOrder);
    }
  }, [allMenuItems, isEditMode, existingOrder, populateFormWithOrderData, isInitialized]);

  // Close location dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showLocationDropdown && !event.target.closest('[data-location-search]')) {
        setShowLocationDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showLocationDropdown]);


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
      setCustomLocationName('');
      setCustomLocationFee('');
      setLocationSearchTerm('');
      setShowLocationDropdown(false);
    }
  };

  // Handle location selection from search dropdown
  const handleLocationSelect = (location) => {
    setDeliveryLocation(location.name);
    setLocationSearchTerm(location.name);
    setShowLocationDropdown(false);
    
    // Clear custom location fields when regular location is selected
    setCustomLocationName('');
    setCustomLocationFee('');
    
    // Clear any validation errors
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors.deliveryLocation;
      delete newErrors.customLocationName;
      delete newErrors.customLocationFee;
      return newErrors;
    });
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
      } else if (deliveryLocation === 'Other') {
          if (!customLocationName.trim()) {
              formErrors.customLocationName = 'Custom location name is required.';
          }
          if (!customLocationFee.trim()) {
              formErrors.customLocationFee = 'Custom location fee is required.';
          } else if (isNaN(parseFloat(customLocationFee)) || parseFloat(customLocationFee) < 0) {
              formErrors.customLocationFee = 'Please enter a valid fee amount.';
          }
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
                             ? deliveryLocation === 'Other'
                               ? parseFloat(customLocationFee || 0)
                               : parseFloat(deliveryLocations.find(loc => loc.name === deliveryLocation)?.fee || 0)
                             : 0;
  const grandTotal = currentOrderSubTotal + extrasSubTotal + currentDeliveryFee;

  const handleFinalSubmit = async () => {
    // Prevent multiple submissions
    if (isSubmitting) {
      toast.warning(`Order is being ${isEditMode ? 'updated' : 'processed'}, please wait...`);
      return;
    }

    const startTime = performance.now();
    console.log('⏱️ Order submission started');
    
    // Fast pre-validation before setting loading state
    const preValidationItems = Object.entries(selectedItems).filter(([, quantity]) => quantity > 0);
    if (preValidationItems.length === 0) {
      toast.error('Please add at least one item to the order');
      return;
    }
    
    setIsSubmitting(true);

    try {
      const payloadItems = preValidationItems.map(([itemId, quantity]) => ({ menu_item_id: itemId, quantity }));
      
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
        if (deliveryLocation === 'Other') {
          // For custom locations, use the custom fields and clear predefined location
          orderPayload.custom_delivery_location = customLocationName.trim();
          orderPayload.custom_delivery_fee = parseFloat(customLocationFee);
          orderPayload.delivery_location = null; // Explicitly clear predefined location
        } else {
          // For predefined locations, use the delivery_location field and clear custom fields
          orderPayload.delivery_location = deliveryLocation;
          orderPayload.custom_delivery_location = null; // Explicitly clear custom location
          orderPayload.custom_delivery_fee = null; // Explicitly clear custom fee
        }
      } else {
        // For pickup orders, clear all delivery-related fields
        orderPayload.delivery_location = null;
        orderPayload.custom_delivery_location = null;
        orderPayload.custom_delivery_fee = null;
      }

      // Determine API endpoint and method based on edit mode
      const orderNumberForApi = existingOrder?.order_number || orderNumber;
      const apiUrl = isEditMode 
        ? `${API_ENDPOINTS.ORDERS}${orderNumberForApi}/`
        : API_ENDPOINTS.ORDERS;
      const method = isEditMode ? 'PATCH' : 'POST';

      const payloadTime = performance.now();
      console.log(`⏱️ Payload prepared in ${(payloadTime - startTime).toFixed(2)}ms`);
      
      console.log('🚀 API Request Details:');
      console.log('- Edit Mode:', isEditMode);
      console.log('- Method:', method);
      console.log('- URL:', apiUrl);
      console.log('- Payload:', JSON.stringify(orderPayload, null, 2));
      console.log('- Existing Order:', existingOrder);

      const apiStartTime = performance.now();
      const result = await apiFirstService.request(apiUrl, {
        method: method,
        body: JSON.stringify(orderPayload),
        headers: {
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache'
        }
      });
      const apiEndTime = performance.now();

      console.log(`📡 API call completed in ${(apiEndTime - apiStartTime).toFixed(2)}ms`);
      console.log('✅ Success Response:', result);
      
      // Show success notification with order details
      const actionText = isEditMode ? 'updated' : 'created';
      const locationText = deliveryType === 'Delivery' && deliveryLocation ? ` to ${deliveryLocation === 'Other' ? (customLocationName || 'Custom Location') : deliveryLocation}` : '';
      
      toast.success(`🎉 Order ${result.order_number} ${actionText}! Total: ₵${grandTotal.toFixed(2)} | ${deliveryType}${locationText}`, {
        position: "top-right",
        autoClose: 3000,
        hideProgressBar: false,
        closeOnClick: true,
        pauseOnHover: true,
        draggable: true,
      });
      
      // Clear form only if creating new order
      if (!isEditMode) {
        setCustomerPhone('');
        setDeliveryType('Pickup');
        setDeliveryLocation('');
        setCustomLocationName('');
        setCustomLocationFee('');
        setLocationSearchTerm('');
        setShowLocationDropdown(false);
        setNotes('');
        setSelectedItems({});
        setSelectedExtras({});
        setErrors({});
      }
      
      setIsModalOpen(false);
      
      const endTime = performance.now();
      console.log(`✅ Order ${actionText} completed in ${(endTime - startTime).toFixed(2)}ms total`);
      
      navigate('/view-orders');
    } catch (error) {
      console.error('🚨 Network/Request Error:', error);
      toast.error(`Error ${isEditMode ? 'updating' : 'creating'} order. Please try again.`);
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
                <i className={`bi ${isEditMode ? 'bi-pencil-square' : 'bi-plus-circle'} me-2`}></i>
                {isEditMode ? `Edit Order ${existingOrder?.order_number || ''}` : 'Create New Order'}
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
                      <div className="position-relative" data-location-search>
                        <Form.Control
                          type="text"
                          value={locationSearchTerm}
                          onChange={(e) => {
                            setLocationSearchTerm(e.target.value);
                            // Only show dropdown if not setting up custom location
                            if (deliveryLocation !== 'Other') {
                              setShowLocationDropdown(true);
                            }
                            if (e.target.value === '') {
                              setDeliveryLocation('');
                            }
                          }}
                          onFocus={() => {
                            // Only show dropdown if not setting up custom location
                            if (deliveryLocation !== 'Other') {
                              setShowLocationDropdown(true);
                            }
                          }}
                          isInvalid={!!errors.deliveryLocation}
                          className="ada-shadow-sm"
                          style={{ minHeight: '44px', fontSize: '16px' }}
                          placeholder={
                            loadingLocations 
                              ? '⏳ Loading locations...' 
                              : deliveryLocation === 'Other'
                                ? '🏠 Custom location - use fields below'
                                : '📍 Search locations...'
                          }
                          disabled={loadingLocations || deliveryLocation === 'Other'}
                        />
                        {showLocationDropdown && !loadingLocations && deliveryLocation !== 'Other' && (
                          <div 
                            className="position-absolute w-100 bg-white border rounded shadow-lg" 
                            style={{ 
                              zIndex: 1050, 
                              top: '100%', 
                              maxHeight: '200px', 
                              overflowY: 'auto',
                              border: '1px solid #dee2e6'
                            }}
                          >
                            {filteredDeliveryLocations.length > 0 ? (
                              filteredDeliveryLocations.map(location => (
                                <div
                                  key={location.id || location.name}
                                  className="p-2 border-bottom cursor-pointer"
                                  style={{ 
                                    cursor: 'pointer',
                                    '&:hover': { backgroundColor: '#f8f9fa' }
                                  }}
                                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                                  onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                                  onClick={() => handleLocationSelect(location)}
                                >
                                  <div className="fw-semibold">{location.name}</div>
                                  <small className="text-muted">Fee: ₵{parseFloat(location.fee || 0).toFixed(2)}</small>
                                </div>
                              ))
                            ) : (
                              <div className="p-2 text-muted text-center">
                                {locationSearchTerm ? 'No locations found' : 'Type to search locations'}
                              </div>
                            )}
                            <div
                              className="p-2 border-top cursor-pointer text-primary"
                              style={{ 
                                cursor: 'pointer',
                                backgroundColor: '#f8f9fa'
                              }}
                              onClick={() => {
                                setDeliveryLocation('Other');
                                setLocationSearchTerm('');
                                setShowLocationDropdown(false);
                              }}
                            >
                              🏠 Other (Custom Location)
                            </div>
                          </div>
                        )}
                      </div>
                      <Form.Control.Feedback type="invalid">{errors.deliveryLocation}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                )}
                
                {/* Custom Location Fields - Show when "Other" is selected */}
                {deliveryType === 'Delivery' && deliveryLocation === 'Other' && (
                  <>
                    <Col md={6}>
                      <Form.Group controlId="customLocationName">
                        <Form.Label className="fw-semibold">Custom Location Name <span className="text-danger">*</span></Form.Label>
                        <Form.Control
                          type="text"
                          value={customLocationName}
                          onChange={(e) => setCustomLocationName(e.target.value)}
                          isInvalid={!!errors.customLocationName}
                          placeholder="Enter location name"
                          className="ada-shadow-sm"
                          style={{ minHeight: '44px', fontSize: '16px' }}
                        />
                        <Form.Control.Feedback type="invalid">{errors.customLocationName}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group controlId="customLocationFee">
                        <Form.Label className="fw-semibold">Custom Delivery Fee (₵) <span className="text-danger">*</span></Form.Label>
                      <Form.Control
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={customLocationFee}
                        onChange={(e) => setCustomLocationFee(e.target.value)}
                        isInvalid={!!errors.customLocationFee}
                        placeholder="0.00"
                        className="ada-shadow-sm"
                        style={{ minHeight: '44px', fontSize: '16px' }}
                      />
                        <Form.Control.Feedback type="invalid">{errors.customLocationFee}</Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </>
                )}
                
                {deliveryType === 'Delivery' && (
                  <Col md={4}>
                    <Form.Group controlId="customerPhone">
                      <Form.Label className="fw-semibold">
                        Customer Phone <span className="text-danger">*</span>
                      </Form.Label>
                      <Form.Control
                        type="tel"
                        inputMode="tel"
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
                      <span>Delivery ({deliveryLocation === 'Other' ? customLocationName || 'Custom Location' : deliveryLocation}):</span>
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
                      {deliveryType === 'Delivery' && deliveryLocation && ` to ${deliveryLocation === 'Other' ? (customLocationName || 'Custom Location') : deliveryLocation}`}
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
                    <i className={`bi ${isEditMode ? 'bi-check-circle' : 'bi-check-circle'} me-2`}></i>
                    {isEditMode ? 'Update Order' : 'Create Order'}
                  </Button>
                </div>
              </Card.Footer>
            )}
          </Card>
        </Col>
      </Row>

      <Modal 
        show={isModalOpen} 
        onHide={() => setIsModalOpen(false)} 
        centered
        size={isMobile ? undefined : "lg"}
        fullscreen={isMobile ? "sm-down" : false}
      >
        <Modal.Header closeButton>
          <Modal.Title className="d-flex justify-content-between align-items-center w-100">
            <div>
              <span>{isEditMode ? 'Confirm Order Update' : 'Confirm Order'}</span>
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
                      <span className="text-muted small">{deliveryLocation === 'Other' ? (customLocationName || 'Custom Location') : deliveryLocation}</span>
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
        <Modal.Footer className={isMobile ? "p-2" : "p-3"}>
          <div className={`d-flex flex-column flex-sm-row w-100 ${isMobile ? 'gap-2' : 'gap-3'}`}>
            <Button 
              variant="secondary" 
              onClick={() => setIsModalOpen(false)}
              className="order-3 order-sm-1 flex-fill"
              size={isMobile ? "sm" : undefined}
              style={{ minHeight: isMobile ? '36px' : '48px' }}
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
                setDeliveryLocation('');
                setCustomLocationName('');
                setCustomLocationFee('');
                setLocationSearchTerm('');
                setShowLocationDropdown(false);
                setNotes(''); 
                setSelectedItems({}); 
                setSelectedExtras({}); 
                setErrors({});
              }}
              className="order-2 order-sm-2 flex-fill"
              size={isMobile ? "sm" : undefined}
              style={{ minHeight: isMobile ? '36px' : '48px' }}
            >
              <i className="bi bi-x-circle me-2"></i>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={handleFinalSubmit}
              disabled={isSubmitting}
              className="order-1 order-sm-3 flex-fill"
              size={isMobile ? "sm" : undefined}
              style={{ minHeight: isMobile ? '36px' : '48px' }}
            >
              {isSubmitting ? (
                <>
                  <div className="spinner-border spinner-border-sm me-2" role="status">
                    <span className="visually-hidden">Processing...</span>
                  </div>
                  {isMobile ? 'Processing...' : 'Processing...'}
                </>
              ) : (
                <>
                  <i className="bi bi-check-circle me-2"></i>
                  {isEditMode ? (isMobile ? 'Update' : 'Update Order') : (isMobile ? 'Accept' : 'Accept')}
                </>
              )}
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* Notes Modal */}
      <Modal 
        show={isNotesModalOpen} 
        onHide={() => setIsNotesModalOpen(false)} 
        centered
        size={isMobile ? undefined : "lg"}
        fullscreen={isMobile ? "sm-down" : false}
      >
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
        <Modal.Footer className={isMobile ? "p-2" : "p-3"}>
          <div className={`d-flex flex-column flex-sm-row w-100 ${isMobile ? 'gap-2' : 'gap-3'}`}>
            <Button 
              variant="danger" 
              onClick={() => setIsNotesModalOpen(false)}
              className="order-2 order-sm-1 flex-fill"
              size={isMobile ? "sm" : undefined}
              style={{ minHeight: isMobile ? '36px' : '48px' }}
            >
              <i className="bi bi-x-circle me-2"></i>
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={() => setIsNotesModalOpen(false)}
              className="ada-shadow-sm order-1 order-sm-2 flex-fill"
              size={isMobile ? "sm" : undefined}
              style={{ minHeight: isMobile ? '36px' : '48px' }}
            >
              <i className="bi bi-check-circle me-2"></i>
              {isMobile ? 'Save' : 'Save Notes'}
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

    </Container>
  );
};

export default CreateOrderForm;
