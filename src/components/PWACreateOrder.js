import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { authenticatedFetch, API_ENDPOINTS } from '../utils/api';
import '../styles/mobile-native.css';

const PWACreateOrder = () => {
  const navigate = useNavigate();
  const [allMenuItems, setAllMenuItems] = useState([]);
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryType, setDeliveryType] = useState('Pickup');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState({});
  const [errors, setErrors] = useState({});
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [, setNextOrderNumber] = useState('Loading...');
  const [deliveryLocations, setDeliveryLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showItemSelector, setShowItemSelector] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);

  // Ensure allMenuItems is always an array before filtering
  const safeMenuItems = Array.isArray(allMenuItems) ? allMenuItems : [];
  
  // Filter menu items
  const mainMenuItems = safeMenuItems.filter(item => item.type?.toLowerCase() !== 'extra' && item.is_available);
  
  // Filter main menu items by search term (excludes extras)
  const filteredMainItems = mainMenuItems.filter(item =>
    item.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fetchInitialData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch next order number
      try {
        const orderResponse = await authenticatedFetch(API_ENDPOINTS.NEXT_ORDER_NUMBER);
        if (orderResponse.ok) {
          const orderData = await orderResponse.json();
          setNextOrderNumber(orderData.next_order_number || 'AUTO');
        } else {
          setNextOrderNumber('AUTO');
        }
      } catch (error) {
        console.warn('Failed to fetch next order number:', error);
        setNextOrderNumber('AUTO');
      }

      // Fetch menu items with robust error handling
      try {
        console.log('[PWACreateOrder] Fetching menu items from:', API_ENDPOINTS.MENU_ITEMS);
        const menuResponse = await authenticatedFetch(API_ENDPOINTS.MENU_ITEMS);
        console.log('[PWACreateOrder] Menu fetch response status:', menuResponse.status);
        
        if (menuResponse.ok) {
          const menuData = await menuResponse.json();
          console.log('[PWACreateOrder] Raw menu data received:', menuData);
          console.log('[PWACreateOrder] Menu data type:', typeof menuData, 'Is array:', Array.isArray(menuData));
          
          // Ensure menuData is an array
          const safeMenuData = Array.isArray(menuData) ? menuData : [];
          console.log('[PWACreateOrder] Safe menu data length:', safeMenuData.length);
          console.log('[PWACreateOrder] Available items count:', safeMenuData.filter(item => item.is_available).length);
          console.log('[PWACreateOrder] Sample menu items:', safeMenuData.slice(0, 3));
          
          setAllMenuItems(safeMenuData);
          // Cache menu items for offline access
          localStorage.setItem('cachedMenuItems', JSON.stringify(safeMenuData));
        } else {
          console.warn('Menu fetch failed with status:', menuResponse.status);
          setAllMenuItems([]);
        }
      } catch (error) {
        console.warn('Failed to fetch menu items:', error);
        // Try to load cached menu items from localStorage as fallback
        try {
          const cachedMenu = localStorage.getItem('cachedMenuItems');
          if (cachedMenu) {
            const parsedMenu = JSON.parse(cachedMenu);
            const safeParsedMenu = Array.isArray(parsedMenu) ? parsedMenu : [];
            setAllMenuItems(safeParsedMenu);
            toast.info('Loaded cached menu items (offline mode)');
          } else {
            setAllMenuItems([]);
          }
        } catch (cacheError) {
          console.error('Failed to load cached menu:', cacheError);
          setAllMenuItems([]);
        }
      }

      // Fetch delivery locations
      try {
        const locationsResponse = await authenticatedFetch(`${API_ENDPOINTS.ORDERS}delivery-locations/`);
        if (locationsResponse.ok) {
          const locationsData = await locationsResponse.json();
          const safeLocationsData = Array.isArray(locationsData) ? locationsData : [];
          setDeliveryLocations(safeLocationsData);
        } else {
          setDeliveryLocations([]);
        }
      } catch (error) {
        console.warn('Failed to fetch delivery locations:', error);
        setDeliveryLocations([]);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error('Failed to load order data. Some features may be limited.');
      // Ensure we have safe default values
      setAllMenuItems([]);
      setDeliveryLocations([]);
      setNextOrderNumber('AUTO');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  const handleQuantityChange = (itemId, quantity) => {
    const numQuantity = parseInt(quantity, 10);
    if (numQuantity <= 0) {
      setSelectedItems(prev => {
        const newItems = { ...prev };
        delete newItems[itemId];
        return newItems;
      });
    } else {
      setSelectedItems(prev => ({
        ...prev,
        [itemId]: numQuantity,
      }));
    }
  };

  const handleAddItem = (itemId) => {
    if (!selectedItems[itemId]) {
      handleQuantityChange(itemId, 1);
    } else {
      handleQuantityChange(itemId, selectedItems[itemId] + 1);
    }
    setShowItemSelector(false);
  };


  const validateForm = () => {
    let formErrors = {};
    
    if (deliveryType === 'Delivery') {
      if (!customerPhone.trim()) {
        formErrors.customerPhone = 'Customer phone is required for delivery orders';
      }
      if (customerPhone.trim() && !/^(\+233|0)\d{9}$/.test(customerPhone.trim())) {
        formErrors.customerPhone = 'Invalid Ghana phone format (e.g., 0XXXXXXXXX or +233XXXXXXXXX)';
      }
      if (!deliveryLocation) {
        formErrors.deliveryLocation = 'Delivery location is required for delivery orders';
      }
    } else if (customerPhone.trim() && !/^(\+233|0)\d{9}$/.test(customerPhone.trim())) {
      formErrors.customerPhone = 'Invalid Ghana phone format (e.g., 0XXXXXXXXX or +233XXXXXXXXX)';
    }

    const currentOrderItems = Object.entries(selectedItems)
      .filter(([, quantity]) => quantity > 0);

    if (currentOrderItems.length === 0) {
      formErrors.items = 'At least one item must be added to the order';
    }
    
    setErrors(formErrors);
    return Object.keys(formErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (validateForm()) {
      setShowConfirmModal(true);
    }
  };

  const handleFinalSubmit = async () => {
    setSubmitting(true);
    try {
      const payloadItems = Object.entries(selectedItems)
        .filter(([, quantity]) => quantity > 0)
        .map(([itemId, quantity]) => ({ menu_item_id: parseInt(itemId), quantity }));

      const allItems = [...payloadItems];

      const payload = {
        customer_phone: customerPhone || null,
        delivery_type: deliveryType,
        delivery_location: deliveryType === 'Delivery' ? deliveryLocation : null,
        notes: notes || '',  // Send empty string instead of null
        items: allItems,
      };

      // Get token directly from localStorage for debugging
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please log in to create an order.');
        navigate('/login');
        return;
      }

      console.log('Creating order with payload:', JSON.stringify(payload, null, 2));
      console.log('Using token:', token ? 'Token exists' : 'No token');
      console.log('Payload details:');
      console.log('- Items count:', allItems.length);
      console.log('- Delivery type:', deliveryType);
      console.log('- Customer phone:', customerPhone);
      console.log('- Delivery location:', deliveryLocation);

      const response = await fetch(API_ENDPOINTS.ORDERS, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));

      if (response.ok) {
        const data = await response.json();
        console.log('Order created successfully:', data);
        toast.success(`Order ${data.order_number} created successfully!`);
        
        // Multiple approaches for instant updates
        // 1. Trigger global refresh event
        console.log('[PWACreateOrder] Dispatching orderCreated event:', data);
        window.dispatchEvent(new CustomEvent('orderCreated', { 
          detail: data,
          bubbles: true
        }));
        
        // 2. Trigger PWA-specific event
        window.dispatchEvent(new CustomEvent('pwa-order-created', { 
          detail: data,
          bubbles: true
        }));
        
        // 3. Store in localStorage for instant access
        try {
          const timestamp = Date.now();
          localStorage.setItem('lastCreatedOrder', JSON.stringify({
            ...data,
            _created_at: timestamp
          }));
          localStorage.setItem('orderCreatedFlag', timestamp.toString());
        } catch (e) {
          console.warn('[PWACreateOrder] Failed to store order flag:', e);
        }
        
        // 4. Post message for cross-tab communication
        if (window.BroadcastChannel) {
          try {
            const channel = new BroadcastChannel('adakings-orders');
            channel.postMessage({
              type: 'ORDER_CREATED',
              data: data,
              timestamp: Date.now()
            });
            channel.close();
          } catch (e) {
            console.warn('[PWACreateOrder] BroadcastChannel not available:', e);
          }
        }
        
        // Always redirect to orders page after successful creation
        navigate('/view-orders');
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { detail: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        console.error('Order creation failed:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        
        // Log the full error details
        console.error('Full error response:', errorData);
        console.error('Error details:', JSON.stringify(errorData, null, 2));
        
        // Handle different error types
        if (response.status === 401) {
          toast.error('Session expired. Please log in again.');
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('userData');
          navigate('/login');
        } else if (response.status === 400) {
          toast.error(`Invalid order data: ${errorData.detail || 'Please check your order details'}`);
        } else if (response.status === 500) {
          toast.error('Server error. Please try again later.');
        } else {
          toast.error(`Failed to create order: ${errorData.detail || errorData.message || 'Unknown error'}`);
        }
      }
    } catch (error) {
      console.error('Network or other error creating order:', error);
      
      if (error.message.includes('Authentication')) {
        toast.error('Authentication failed. Please log in again.');
        navigate('/login');
      } else {
        // Store order offline for later sync
        const payloadItems = Object.entries(selectedItems)
          .filter(([, quantity]) => quantity > 0)
          .map(([itemId, quantity]) => ({ menu_item_id: parseInt(itemId), quantity }));

        const allItems = [...payloadItems];
        
        const offlineOrder = {
          id: `offline-${Date.now()}`,
          customer_phone: customerPhone || null,
          delivery_type: deliveryType,
          delivery_location: deliveryType === 'Delivery' ? deliveryLocation : null,
          notes: notes || '',
          items: allItems,
          created_at: new Date().toISOString(),
          status: 'pending_sync',
          total: grandTotal
        };
        
        try {
          const existingOfflineOrders = JSON.parse(localStorage.getItem('offlineOrders') || '[]');
          existingOfflineOrders.push(offlineOrder);
          localStorage.setItem('offlineOrders', JSON.stringify(existingOfflineOrders));
          
          toast.success(`Order saved offline! Will sync when connection is restored.`);
          console.log('Order stored offline:', offlineOrder);
          
          // Clear form and navigate
          setSelectedItems({});
          setCustomerPhone('');
          setDeliveryLocation('');
          setNotes('');
          navigate('/view-orders');
        } catch (storageError) {
          console.error('Failed to store offline order:', storageError);
          toast.error('Failed to create order. Please check your connection and try again.');
        }
      }
    } finally {
      setSubmitting(false);
      setShowConfirmModal(false);
    }
  };

  // Calculate totals
  const currentOrderSubTotal = Object.entries(selectedItems).reduce((total, [itemId, quantity]) => {
    const item = safeMenuItems.find(mi => mi.id.toString() === itemId);
    return total + (item && item.price && quantity > 0 ? parseFloat(item.price) * quantity : 0);
  }, 0);
  
  const extrasSubTotal = 0;

  const currentDeliveryFee = deliveryType === 'Delivery' && deliveryLocation
    ? parseFloat(deliveryLocations.find(loc => loc.name === deliveryLocation)?.fee || 0)
    : 0;
    
  const grandTotal = currentOrderSubTotal + currentDeliveryFee;

  const formatPrice = (price) => `GH₵ ${parseFloat(price).toFixed(2)}`;

  if (loading) {
    return (
      <div className="pwa-content">
        <div className="pwa-loading">
          <div className="pwa-spinner"></div>
          <div className="pwa-loading-text">Loading order form...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pwa-content">
      {/* Order Header */}
      <div className="pwa-card">
        <div className="pwa-card-header">
          <div className="pwa-card-icon" style={{ background: 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)' }}>
            <i className="bi bi-plus-circle"></i>
          </div>
          <div>
            <div className="pwa-card-title">Create New Order</div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Order Items - First Section */}
        <div className="pwa-card">
          <div className="pwa-card-title" style={{ marginBottom: '16px', fontSize: '1rem' }}>Order Items</div>

          {Object.keys(selectedItems).length === 0 ? (
            <div className="pwa-empty">
              <div className="pwa-empty-icon">
                <i className="bi bi-cart"></i>
              </div>
              <div className="pwa-empty-title">No Items Selected</div>
              <div className="pwa-empty-subtitle">Add items to your order</div>
            </div>
          ) : (
            <div className="pwa-list">
              {Object.entries(selectedItems).map(([itemId, quantity]) => {
                const item = mainMenuItems.find(i => i.id.toString() === itemId);
                if (!item) return null;
                
                return (
                  <div key={itemId} className="pwa-list-item">
                    <div className="pwa-list-icon" style={{ background: '#4CAF50', color: 'white' }}>
                      <i className="bi bi-cup-hot"></i>
                    </div>
                    <div className="pwa-list-content">
                      <div className="pwa-list-title">{item.name}</div>
                      <div className="pwa-list-subtitle">
                        {formatPrice(item.price)} each
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '6px',
                        marginTop: '6px'
                      }}>
                        <button
                          type="button"
                          className="pwa-btn pwa-btn-secondary"
                          onClick={() => handleQuantityChange(itemId, quantity - 1)}
                          style={{ width: '28px', height: '28px', padding: '0', fontSize: '0.85rem' }}
                        >
                          -
                        </button>
                        <span style={{ 
                          minWidth: '35px', 
                          textAlign: 'center',
                          fontWeight: '600',
                          fontSize: '0.85rem'
                        }}>
                          {quantity}
                        </span>
                        <button
                          type="button"
                          className="pwa-btn pwa-btn-primary"
                          onClick={() => handleQuantityChange(itemId, quantity + 1)}
                          style={{ width: '28px', height: '28px', padding: '0', fontSize: '0.85rem' }}
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <div style={{ 
                      fontWeight: '600', 
                      color: '#1a1a1a',
                      fontSize: '0.8rem'
                    }}>
                      {formatPrice(parseFloat(item.price) * quantity)}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {errors.items && (
            <div style={{ color: '#f44336', fontSize: '0.75rem', marginTop: '8px' }}>
              {errors.items}
            </div>
          )}
          
          {/* Add Item Button - At Bottom */}
          <button
            type="button"
            className="pwa-btn pwa-btn-primary"
            onClick={() => setShowItemSelector(true)}
            style={{ 
              width: '100%', 
              padding: '10px 16px', 
              fontSize: '0.85rem',
              marginTop: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <i className="bi bi-plus" style={{ fontSize: '0.9rem' }}></i>
            Add Item
          </button>
        </div>


        {/* Delivery Type */}
        <div className="pwa-card">
          <div className="pwa-card-title" style={{ marginBottom: '16px', fontSize: '1rem' }}>Order Type</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              className={`pwa-btn ${deliveryType === 'Pickup' ? 'pwa-btn-primary' : 'pwa-btn-secondary'}`}
              onClick={() => setDeliveryType('Pickup')}
              style={{ padding: '10px 12px', fontSize: '0.85rem' }}
            >
              <i className="bi bi-bag" style={{ fontSize: '0.9rem' }}></i>
              Pickup
            </button>
            <button
              type="button"
              className={`pwa-btn ${deliveryType === 'Delivery' ? 'pwa-btn-primary' : 'pwa-btn-secondary'}`}
              onClick={() => setDeliveryType('Delivery')}
              style={{ padding: '10px 12px', fontSize: '0.85rem' }}
            >
              <i className="bi bi-truck" style={{ fontSize: '0.9rem' }}></i>
              Delivery
            </button>
          </div>
        </div>

        {/* Customer Details - Only for Delivery */}
        {deliveryType === 'Delivery' && (
          <div className="pwa-card">
            <div className="pwa-card-title" style={{ marginBottom: '16px', fontSize: '1rem' }}>Customer Details</div>
            
            <div className="pwa-form-group">
              <label className="pwa-form-label">
                Customer Phone <span style={{ color: '#f44336' }}>*</span>
              </label>
              <input
                type="tel"
                className="pwa-form-input"
                placeholder="0XXXXXXXXX or +233XXXXXXXXX"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
              {errors.customerPhone && (
                <div style={{ color: '#f44336', fontSize: '0.8rem', marginTop: '4px' }}>
                  {errors.customerPhone}
                </div>
              )}
            </div>
  
            <div className="pwa-form-group">
              <label className="pwa-form-label">
                Delivery Location <span style={{ color: '#f44336' }}>*</span>
              </label>
              <select
                className="pwa-form-input"
                value={deliveryLocation}
                onChange={(e) => setDeliveryLocation(e.target.value)}
              >
                <option value="">Select delivery location</option>
                {deliveryLocations.map(location => (
                  <option key={location.name} value={location.name}>
                    {location.name} - {formatPrice(location.fee)}
                  </option>
                ))}
              </select>
              {errors.deliveryLocation && (
                <div style={{ color: '#f44336', fontSize: '0.8rem', marginTop: '4px' }}>
                  {errors.deliveryLocation}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Order Summary */}
        <div className="pwa-card">
          <div className="pwa-card-title" style={{ marginBottom: '16px', fontSize: '1rem' }}>Order Summary</div>
          
          <div className="pwa-list">
            <div className="pwa-list-item">
              <div className="pwa-list-content">
                <div className="pwa-list-title">Items Subtotal</div>
              </div>
              <div style={{ fontWeight: '600' }}>{formatPrice(currentOrderSubTotal)}</div>
            </div>
            
            
            {deliveryType === 'Delivery' && currentDeliveryFee > 0 && (
              <div className="pwa-list-item">
                <div className="pwa-list-content">
                  <div className="pwa-list-title">Delivery Fee</div>
                  <div className="pwa-list-subtitle">{deliveryLocation}</div>
                </div>
                <div style={{ fontWeight: '600' }}>{formatPrice(currentDeliveryFee)}</div>
              </div>
            )}
            
            <div className="pwa-list-item" style={{ borderTop: '2px solid #e8eaed', paddingTop: '16px' }}>
              <div className="pwa-list-content">
                <div className="pwa-list-title" style={{ fontSize: '1.1rem', color: '#1a1a1a' }}>Total</div>
              </div>
              <div style={{ fontWeight: '700', fontSize: '1.1rem', color: '#1a1a1a' }}>
                {formatPrice(grandTotal)}
              </div>
            </div>
          </div>
        </div>

{/* Notes Button */}
        <div className="pwa-card">
          <button
            type="button"
            className={`pwa-btn ${notes ? 'pwa-btn-primary' : 'pwa-btn-secondary'}`}
            onClick={() => setShowNotesModal(true)}
            style={{ width: '100%', padding: '10px 16px', fontSize: '0.85rem' }}
          >
            <i className={`bi ${notes ? 'bi-check-circle' : 'bi-pencil'}`} style={{ fontSize: '0.9rem' }}></i>
            {notes ? 'Special Notes Added' : 'Add Special Notes'}
          </button>
          
          {notes && (
            <div style={{ 
              marginTop: '8px', 
              padding: '6px 10px', 
              background: '#f8f9fa', 
              borderRadius: '6px',
              fontSize: '0.75rem',
              color: '#666',
              border: '1px solid #e9ecef'
            }}>
              <strong>Notes:</strong> {notes.length > 50 ? notes.substring(0, 50) + '...' : notes}
            </div>
          )}

        </div>

        {/* Notes Modal */}
        {showNotesModal && (
          <div className="pwa-modal-overlay" onClick={() => setShowNotesModal(false)}>
            <div className="pwa-modal" onClick={(e) => e.stopPropagation()}>
              <div className="pwa-modal-header">
                <div className="pwa-modal-title">Special Notes</div>
                <button 
                  className="pwa-btn pwa-btn-secondary"
                  onClick={() => setShowNotesModal(false)}
                  style={{ 
                    width: 'auto', 
                    minWidth: '32px', 
                    height: '32px', 
                    padding: '0',
                    fontSize: '1rem'
                  }}
                >
                  <i className="bi bi-x"></i>
                </button>
              </div>
              <textarea
                className="pwa-form-input"
                placeholder="Any special instructions..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={5}
                style={{ width: '100%', resize: 'vertical', marginTop: '16px' }}
              />
              <div className="pwa-modal-actions">
                <button 
                  type="button"
                  className="pwa-btn pwa-btn-primary"
                  onClick={() => setShowNotesModal(false)}
                >
                  Save
                </button>
                <button 
                  type="button"
                  className="pwa-btn pwa-btn-secondary"
                  onClick={() => setShowNotesModal(false)}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Submit Button */}
        <div className="pwa-card">
          <button
            type="submit"
            className="pwa-btn pwa-btn-primary"
            disabled={submitting || Object.keys(selectedItems).length === 0}
            style={{ padding: '12px 16px', fontSize: '0.9rem' }}
          >
            {submitting ? (
              <>
                <div className="pwa-spinner" style={{ width: '16px', height: '16px', marginBottom: '0' }}></div>
                Creating Order...
              </>
            ) : (
              <>
                <i className="bi bi-check-circle" style={{ fontSize: '0.95rem' }}></i>
                Create Order ({formatPrice(grandTotal)})
              </>
            )}
          </button>
        </div>
      </form>

      {/* Item Selector Modal */}
      {showItemSelector && (
        <div className="pwa-modal-overlay" onClick={() => setShowItemSelector(false)}>
          <div className="pwa-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '90vw', maxHeight: '80vh' }}>
            <div className="pwa-modal-header">
              <div className="pwa-modal-title">Select Items</div>
            </div>
            
            <div style={{ padding: '16px 0' }}>
              <div className="pwa-search-container" style={{ marginBottom: '16px' }}>
                <div className="pwa-search-icon">
                  <i className="bi bi-search"></i>
                </div>
                <input
                  type="text"
                  className="pwa-search-input"
                  placeholder="Search menu items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div className="pwa-list" style={{ maxHeight: '300px', overflow: 'auto' }}>
                {console.log('[PWACreateOrder] Rendering modal with items:', {
                  allMenuItems: safeMenuItems.length,
                  mainMenuItems: mainMenuItems.length,
                  filteredMainItems: filteredMainItems.length,
                  searchTerm: searchTerm
                }) || ''}
                
                {filteredMainItems.length === 0 ? (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '20px', 
                    color: '#666',
                    fontSize: '0.9rem'
                  }}>
                    {safeMenuItems.length === 0 ? 'No menu items loaded' : 
                     mainMenuItems.length === 0 ? 'No available menu items' :
                     'No items match your search'}
                  </div>
                ) : (
                  filteredMainItems.map(item => (
                  <button
                    key={item.id}
                    className="pwa-list-item"
                    onClick={() => handleAddItem(item.id)}
                    style={{
                      background: 'none',
                      border: 'none',
                      width: '100%',
                      textAlign: 'left',
                      cursor: 'pointer'
                    }}
                  >
                    <div className="pwa-list-icon" 
                      style={{ 
                        background: item.type?.toLowerCase() === 'extra' ? '#FF9800' : '#4CAF50', 
                        color: 'white' 
                      }}>
                      <i className={item.type?.toLowerCase() === 'extra' ? 'bi bi-plus-square' : 'bi bi-cup-hot'}></i>
                    </div>
                    <div className="pwa-list-content">
                      <div className="pwa-list-title">{item.name}</div>
                      <div className="pwa-list-subtitle">
                        {formatPrice(item.price)}
                        {item.type?.toLowerCase() === 'extra' && <span style={{ color: '#FF9800', fontWeight: '600' }}> (Extra)</span>}
                      </div>
                    </div>
                    <div className="pwa-list-action">
                      <i className="bi bi-plus-circle"></i>
                    </div>
                  </button>
                  ))
                )}
              </div>
            </div>
            
            <div className="pwa-modal-actions">
              <button 
                className="pwa-btn pwa-btn-secondary"
                onClick={() => setShowItemSelector(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="pwa-modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="pwa-modal" onClick={(e) => e.stopPropagation()}>
            <div className="pwa-modal-header">
              <div className="pwa-modal-title">Confirm Order</div>
            </div>
            
            <div style={{ padding: '16px 0' }}>
              <p style={{ margin: '0 0 16px 0', fontSize: '0.95rem' }}>Please review your order details before confirming:</p>
              
              {/* Order Details */}
              <div style={{ 
                background: '#f8f9fa',
                padding: '16px',
                borderRadius: '8px',
                marginBottom: '16px',
                border: '1px solid #e9ecef'
              }}>
                {/* Order Number */}
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  marginBottom: '12px',
                  paddingBottom: '8px',
                  borderBottom: '1px solid #dee2e6'
                }}>
                  <strong style={{ fontSize: '1rem' }}>Order Details</strong>
                  <span style={{ color: '#6c757d', fontSize: '0.85rem' }}>{deliveryType}</span>
                </div>
                
                {/* Order Items */}
                <div style={{ marginBottom: '12px' }}>
                  <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px' }}>Items:</div>
                  {Object.entries(selectedItems).map(([itemId, quantity]) => {
                    const item = mainMenuItems.find(i => i.id.toString() === itemId);
                    if (!item) return null;
                    const itemTotal = parseFloat(item.price) * quantity;
                    return (
                      <div key={itemId} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        fontSize: '0.85rem',
                        marginBottom: '4px'
                      }}>
                        <span>{item.name} × {quantity}</span>
                        <span>{formatPrice(itemTotal)}</span>
                      </div>
                    );
                  })}
                </div>
                
                {/* Customer Info for Delivery */}
                {deliveryType === 'Delivery' && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px' }}>Customer Details:</div>
                    <div style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
                      <strong>Phone:</strong> {customerPhone || 'Not provided'}
                    </div>
                    <div style={{ fontSize: '0.85rem', marginBottom: '4px' }}>
                      <strong>Location:</strong> {deliveryLocation || 'Not selected'}
                    </div>
                  </div>
                )}
                
                {/* Notes */}
                {notes && (
                  <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '0.9rem', fontWeight: '600', marginBottom: '8px' }}>Special Notes:</div>
                    <div style={{ 
                      fontSize: '0.85rem',
                      fontStyle: 'italic',
                      color: '#6c757d',
                      background: '#fff',
                      padding: '8px',
                      borderRadius: '4px',
                      border: '1px solid #dee2e6'
                    }}>
                      "{notes}"
                    </div>
                  </div>
                )}
                
                {/* Order Summary */}
                <div style={{ 
                  borderTop: '1px solid #dee2e6',
                  paddingTop: '12px'
                }}>
              <div style={{ 
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '0.85rem',
                marginBottom: '4px'
              }}>
                <span>Items Subtotal:</span>
                <span>{formatPrice(currentOrderSubTotal)}</span>
              </div>
              
                  
                  {deliveryType === 'Delivery' && currentDeliveryFee > 0 && (
                    <div style={{ 
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.85rem',
                      marginBottom: '4px'
                    }}>
                      <span>Delivery Fee:</span>
                      <span>{formatPrice(currentDeliveryFee)}</span>
                    </div>
                  )}
                  
                  <div style={{ 
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '1rem',
                    fontWeight: '700',
                    marginTop: '8px',
                    paddingTop: '8px',
                    borderTop: '1px solid #dee2e6'
                  }}>
                    <span>Total:</span>
                    <span>{formatPrice(grandTotal)}</span>
                  </div>
                </div>
              </div>
              
              <p style={{ 
                margin: '0',
                fontSize: '0.85rem',
                color: '#6c757d',
                textAlign: 'center'
              }}>
                Click "Confirm" to create this order
              </p>
            </div>
            
            <div className="pwa-modal-actions">
              <button 
                className="pwa-btn pwa-btn-primary"
                onClick={handleFinalSubmit}
                disabled={submitting}
              >
                {submitting ? 'Creating...' : 'Confirm'}
              </button>
              <button 
                className="pwa-btn pwa-btn-secondary"
                onClick={() => setShowConfirmModal(false)}
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PWACreateOrder;
