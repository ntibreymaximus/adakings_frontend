import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Form, Button, Container, Row, Col, Card, ListGroup, Modal, Spinner, Alert, Nav, Tab } from 'react-bootstrap';
import { useNavigate, useParams } from 'react-router-dom';
import optimizedToast, { contextToast } from '../utils/toastUtils';
import { API_ENDPOINTS } from '../utils/api';
import { apiFirstService } from '../services/apiFirstService';
import { menuCacheService } from '../services/menuCacheService';
import { useAuth } from '../contexts/AuthContext';
import useCallDetection from '../hooks/useCallDetection';

// Delivery locations will be fetched from backend

const CreateOrderForm = ({ isEditMode: isEditModeProp = false }) => {
  const navigate = useNavigate();
  const { orderNumber } = useParams();
  const { userData } = useAuth();
  
  // Determine if we're in edit mode from prop or URL
  const isEditMode = isEditModeProp || !!orderNumber;
  
  const [allMenuItems, setAllMenuItems] = useState([]);
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryType, setDeliveryType] = useState('Pickup');
  const [deliveryLocation, setDeliveryLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState({});
  const [selectedExtras, setSelectedExtras] = useState({});
  const [errors, setErrors] = useState({});
  const [existingOrder, setExistingOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(null);
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
  const [showDeliveryModal, setShowDeliveryModal] = useState(false);
  
  // Refs for cleanup and debouncing
  const searchTimeoutRef = useRef(null);
  
  // Filter menu items into main items and extras
  // Handle cases where is_available might not be set (default to true)
  const mainMenuItems = (allMenuItems || []).filter(item => !item.is_extra && (item.is_available !== false));
  const extraMenuItems = (allMenuItems || []).filter(item => item.is_extra && (item.is_available !== false));
  
  // Further categorize main menu items by type
  const regularMenuItems = mainMenuItems.filter(item => item.item_type === 'regular');
  const boltMenuItems = mainMenuItems.filter(item => item.item_type === 'bolt');
  
  // Fallback: if no main menu items found, show all items that aren't explicitly unavailable
  const displayMenuItems = mainMenuItems.length > 0 ? mainMenuItems : (allMenuItems || []).filter(item => !item.is_extra && (item.is_available !== false));
  
  // State for active menu tab
  const [activeMenuTab, setActiveMenuTab] = useState('regular');

  // Call detection hook
  const {
    showCallModal,
    detectedNumber,
    setDetectedNumber,
    formatPhoneNumber,
    closeCallModal,
    isProcessing,
    triggerCallModal,
    isCallDetectionSupported
  } = useCallDetection();

  // Effect to autofill customer phone on call modal accept
  useEffect(() => {
    if (showCallModal && detectedNumber) {
      optimizedToast.info('Incoming call detected. You can add the number directly.');
    }
  }, [showCallModal, detectedNumber]);
  
  // Request permissions on mount if on mobile
  useEffect(() => {
    if (isCallDetectionSupported && isMobile) {
      // Check if we've already requested permissions (stored in localStorage)
      const permissionsRequested = localStorage.getItem('callDetectionPermissionsRequested');
      
      if (!permissionsRequested) {
        // Show a message explaining why we need permissions
        optimizedToast.info('Enable camera access to automatically detect phone numbers from incoming calls', {
          duration: 5000,
          position: 'top-center'
        });
        
        // Mark that we've requested permissions
        localStorage.setItem('callDetectionPermissionsRequested', 'true');
      }
    }
  }, [isCallDetectionSupported, isMobile]);

  const handleAcceptCallNumber = () => {
    // Set the phone number
    setCustomerPhone(formatPhoneNumber(detectedNumber));
    
    // Automatically set delivery type to Delivery
    setDeliveryType('Delivery');
    
    // Fetch delivery locations if not already loaded
    if (deliveryLocations.length === 0 && !loadingLocations) {
      fetchDeliveryLocations();
    }
    
    // Show delivery modal on mobile after accepting the number
    if (isMobile) {
      setTimeout(() => {
        setShowDeliveryModal(true);
      }, 300); // Small delay to ensure smooth transition
    }
    
    // Show success message
    optimizedToast.success('Phone number added. Please select delivery location.');
    
    closeCallModal();
  };

  const handleRejectCallNumber = () => {
    setDetectedNumber('');
    closeCallModal();
  };

  // Filter delivery locations based on search term
  const filteredDeliveryLocations = deliveryLocations.filter(location =>
    location.name.toLowerCase().includes(locationSearchTerm.toLowerCase())
  );

  // Fetch delivery locations from backend
  const fetchDeliveryLocations = useCallback(async () => {
    // Prevent multiple simultaneous calls
    if (loadingLocations) {
      console.log('⚠️ Delivery locations already loading, skipping...');
      return;
    }
    
    setLoadingLocations(true);
    console.log('🚀 Fetching delivery locations...');
    
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
      console.log(`✅ Loaded ${locations.length} delivery locations`);
    } catch (error) {
      console.error('❌ Error fetching delivery locations:', error);
      // Fallback to empty array if fetch fails
      setDeliveryLocations([]);
    } finally {
      setLoadingLocations(false);
    }
  }, [loadingLocations]);



  // Function to populate form with existing order data
  const populateFormWithOrderData = useCallback((order) => {
    if (!order) return;
    
    console.log('🔄 Populating form with order data:', order);
    
    // Set basic order details
    setCustomerPhone(order.customer_phone || '');
    setDeliveryType(order.delivery_type || 'Pickup');
    setNotes(order.notes || '');
    
    // Set delivery location using historical data when available
    if (order.delivery_type === 'Delivery') {
      if (order.custom_delivery_location) {
        setDeliveryLocation('Other');
        setCustomLocationName(order.custom_delivery_location);
        setCustomLocationFee(order.custom_delivery_fee?.toString() || '0');
        setLocationSearchTerm('Custom location - use fields below');
      } else if (order.delivery_location) {
        // Use current delivery location if it exists
        setDeliveryLocation(order.delivery_location);
        setLocationSearchTerm(order.delivery_location);
      } else if (order.delivery_location_name) {
        // Use historical delivery location name if current location is deleted
        setDeliveryLocation(order.delivery_location_name);
        setLocationSearchTerm(order.delivery_location_name);
        console.log('📍 Using historical delivery location:', order.delivery_location_name);
      } else if (order.effective_delivery_location_name) {
        // Fallback to effective delivery location name
        setDeliveryLocation(order.effective_delivery_location_name);
        setLocationSearchTerm(order.effective_delivery_location_name);
        console.log('📍 Using effective delivery location:', order.effective_delivery_location_name);
      }
    }
    
    // Set selected items - need to wait for allMenuItems to be loaded
    if (allMenuItems && allMenuItems.length > 0) {
      const newSelectedItems = {};
      const newSelectedExtras = {};
      
      if (order.items && Array.isArray(order.items)) {
        console.log('📋 Processing order items:', order.items);
        console.log('📋 Sample item structure:', order.items[0]);
        order.items.forEach(item => {
          // Handle different possible field names for menu item ID
          let menuItemId = item.menu_item_id || item.menu_item || item.id;
          
          // Check if menu_item is an object with nested id
          if (item.menu_item && typeof item.menu_item === 'object') {
            menuItemId = item.menu_item.id;
            console.log(`📋 Nested menu item found:`, item.menu_item);
          }
          
          console.log(`🔍 Looking for menu item with ID: ${menuItemId}`);
          
          // Find the menu item in allMenuItems to get is_extra status
          const menuItem = allMenuItems.find(mi => {
            return mi.id === menuItemId || 
                   mi.id === parseInt(menuItemId) || 
                   mi.id.toString() === menuItemId.toString();
          });
          
          if (menuItem) {
            if (menuItem.is_extra) {
              newSelectedExtras[menuItem.id.toString()] = item.quantity;
              console.log(`✨ Added extra: ${menuItem.name} (ID: ${menuItem.id}, quantity: ${item.quantity})`);
            } else {
              newSelectedItems[menuItem.id.toString()] = item.quantity;
              console.log(`🍽️ Added item: ${menuItem.name} (ID: ${menuItem.id}, quantity: ${item.quantity})`);
            }
          } else {
            console.warn(`⚠️ Menu item with ID ${menuItemId} not found in current menu items`);
            console.log('Available menu item IDs:', allMenuItems.map(mi => mi.id));
            // Check if the item has embedded menu item info we can use
            if (item.menu_item && typeof item.menu_item === 'object') {
              const isExtra = item.menu_item.is_extra || false;
              if (isExtra) {
                newSelectedExtras[menuItemId.toString()] = item.quantity;
              } else {
                newSelectedItems[menuItemId.toString()] = item.quantity;
              }
            } else {
              // Default to regular item if menu item not found
              newSelectedItems[menuItemId.toString()] = item.quantity;
            }
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
    if (activeMenuTab === "bolt") {
      setDeliveryType("Delivery");
      setDeliveryLocation("Bolt Delivery");
      setCustomLocationFee(0);
      // Don't clear customer phone - it's optional for Bolt orders
    }
  }, [activeMenuTab]);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Fetch order data when in edit mode
  useEffect(() => {
    const fetchOrderData = async () => {
      if (!isEditMode || !orderNumber) return;
      
      try {
        setLoading(true);
        console.log(`🔍 Fetching order data for order #${orderNumber}`);
        
        const data = await apiFirstService.request(`${API_ENDPOINTS.ORDERS}${orderNumber}/`, {
          method: 'GET'
        });
        
        console.log('✅ Order data fetched:', data);
        console.log('📦 Existing order items:', data.items);
        
        // Check if order can be edited
        if (data.status === 'Fulfilled' || data.status === 'Cancelled') {
          setLoadError(`Cannot edit ${data.status.toLowerCase()} orders`);
          optimizedToast.error(`This order is ${data.status.toLowerCase()} and cannot be edited`);
          return;
        }
        
        setExistingOrder(data);
        setLoadError(null);
      } catch (error) {
        console.error('❌ Error fetching order data:', error);
        if (error.status === 404) {
          setLoadError('Order not found');
        } else {
          setLoadError(error.message || 'Failed to fetch order data');
        }
        optimizedToast.error(`Failed to load order: ${error.message || 'Unknown error'}`);
      } finally {
        setLoading(false);
      }
    };
    
    fetchOrderData();
  }, [isEditMode, orderNumber]);

  useEffect(() => {
    const fetchInitialData = async () => {
      // Only fetch delivery locations once on mount
      if (deliveryLocations.length === 0 && !loadingLocations) {
        await fetchDeliveryLocations();
      }
      
      try {
        // Use cache service for instant menu loading
        console.log(`🚀 Loading menu items for order ${isEditMode ? 'editing' : 'creation'}...`);
        const items = await menuCacheService.getMenuItems();
        setAllMenuItems(items);
        console.log(`✅ Loaded ${items.length} menu items for order ${isEditMode ? 'editing' : 'creation'}`);
        
        // Debug menu items
        console.log('📊 Menu items breakdown:');
        console.log(`- Total items: ${items.length}`);
        console.log(`- Items with is_extra=true: ${items.filter(item => item.is_extra).length}`);
        console.log(`- Items with is_extra=false: ${items.filter(item => !item.is_extra).length}`);
        console.log(`- Items with is_available=true: ${items.filter(item => item.is_available === true).length}`);
        console.log(`- Items with is_available=false: ${items.filter(item => item.is_available === false).length}`);
        console.log(`- Items with is_available undefined: ${items.filter(item => item.is_available === undefined).length}`);
        if (items.length > 0) {
          console.log('Sample item:', items[0]);
        }
        
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
    // Remove fetchDeliveryLocations from dependencies to prevent repeated calls
  }, [isEditMode, existingOrder, populateFormWithOrderData, isInitialized, deliveryLocations.length, loadingLocations]);
  
  // Separate effect to repopulate items when menu items are loaded (after initial load)
  useEffect(() => {
    if (isEditMode && existingOrder && allMenuItems.length > 0 && !isInitialized) {
      // Populate items now that menu items are available
      console.log('🔄 Populating items with loaded menu data');
      populateFormWithOrderData(existingOrder);
      setIsInitialized(true);
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
  
  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, []);



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

    // Check item type and clear opposite type selections
    if (item.item_type === 'regular') {
      const newSelectedItems = { ...selectedItems };
      boltMenuItems.forEach(boltItem => delete newSelectedItems[boltItem.id]);
      setSelectedItems(newSelectedItems);
      activeMenuTab === 'bolt' && setActiveMenuTab('regular');
      // Only reset delivery if we were on Bolt delivery
      if (deliveryLocation === 'Bolt Delivery') {
        setDeliveryType('Pickup');
        setDeliveryLocation('');
        setLocationSearchTerm('');
        setCustomLocationName('');
        setCustomLocationFee('');
      }
    } else if (item.item_type === 'bolt') {
      const newSelectedItems = { ...selectedItems };
      regularMenuItems.forEach(regItem => delete newSelectedItems[regItem.id]);
      setSelectedItems(newSelectedItems);
      activeMenuTab === 'regular' && setActiveMenuTab('bolt');
      // Set delivery to Bolt Delivery when adding bolt items
      setDeliveryType("Delivery");
      setDeliveryLocation("Bolt Delivery");
      setLocationSearchTerm("Bolt Delivery");
      setCustomLocationFee("0");
    }

    if (!selectedItems[itemId] || selectedItems[itemId] === 0) {
        handleQuantityChange(itemId, 1);
        // Item added to order
    } else {
        // Item is already in the order
    }
    setShowMenuDropdown(false);
  }, [displayMenuItems, selectedItems, handleQuantityChange, boltMenuItems, regularMenuItems, activeMenuTab, deliveryLocation]);

  useEffect(() => {
    // Check if any bolt items are selected
    const hasBoltItems = Object.keys(selectedItems).some(itemId => {
      const item = displayMenuItems.find(i => i.id.toString() === itemId);
      return item && item.item_type === 'bolt' && selectedItems[itemId] > 0;
    });
    
    // Only reset delivery info if we're switching FROM bolt tab to regular tab with no bolt items
    // Don't clear if the user has already set up delivery details for regular items
    if (activeMenuTab === 'regular' && !hasBoltItems && deliveryLocation === 'Bolt Delivery') {
      setDeliveryLocation('');
      setLocationSearchTerm('');
      setCustomLocationName('');
      setCustomLocationFee('');
      setDeliveryType('Pickup');
    }
  }, [activeMenuTab, selectedItems, displayMenuItems, deliveryLocation]);



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
    } else if (newDeliveryType === 'Delivery') {
      // When switching to delivery, fetch locations if not already loaded
      if (deliveryLocations.length === 0 && !loadingLocations) {
        fetchDeliveryLocations();
      }
      // Show delivery modal on mobile
      if (isMobile) {
        setShowDeliveryModal(true);
      }
    }
  };

  // Handle location selection from search dropdown
  const handleLocationSelect = (location) => {
    setDeliveryLocation(location.id); // Store the ID
    setLocationSearchTerm(location.name); // Display the name in search field
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
      // Special handling for Bolt orders - they don't require customer phone
      const isBoltOrder = activeMenuTab === 'bolt';
      const isBoltDelivery = deliveryLocation === 'Bolt Delivery';
      
      // Skip phone validation for Bolt orders when using their delivery types
      if (!isBoltOrder || !isBoltDelivery) {
        if (!customerPhone.trim()) formErrors.customerPhone = 'Customer phone is required for delivery orders';
        if (customerPhone.trim() && !/^(\+233|0)\d{9}$/.test(customerPhone.trim())) {
            formErrors.customerPhone = 'Invalid Ghana phone format (e.g., 0XXXXXXXXX or +233XXXXXXXXX)';
        }
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
                               : parseFloat(deliveryLocations.find(loc => loc.id === deliveryLocation || loc.id.toString() === deliveryLocation.toString())?.fee || 0)
                             : 0;
  const grandTotal = currentOrderSubTotal + extrasSubTotal + currentDeliveryFee;

  // Helper function to get location name from ID
  const getLocationDisplayName = (locationId) => {
    if (!locationId) return '';
    if (locationId === 'Other') return customLocationName || 'Custom Location';
    if (locationId === 'Bolt Delivery') return 'Bolt Delivery';
    
    // Find location by ID
    const location = deliveryLocations.find(loc => 
      loc.id === locationId || loc.id.toString() === locationId.toString()
    );
    return location ? location.name : locationId;
  };

  // Separate validation function for order submission
  const validateOrderSubmission = () => {
    // Validate items
    const validItems = Object.entries(selectedItems).filter(([, quantity]) => quantity > 0);
    if (validItems.length === 0) {
      return { isValid: false, error: 'At least one item must be added to the order' };
    }
    
    // Validate delivery orders
    if (deliveryType === 'Delivery') {
      // Special handling for Bolt orders - they don't require customer phone
      const isBoltOrder = activeMenuTab === 'bolt';
      const isBoltDelivery = deliveryLocation === 'Bolt Delivery';
      
      // Validate phone for non-Bolt delivery orders
      if (!isBoltOrder || !isBoltDelivery) {
        const cleanPhone = customerPhone.trim().replace(/\s+/g, '').replace(/-/g, '');
        if (!cleanPhone) {
          return { isValid: false, error: 'Customer phone number is required for delivery orders' };
        }
        if (!/^(\+233|0)\d{9}$/.test(cleanPhone)) {
          return { isValid: false, error: 'Invalid Ghana phone format (e.g., 0241234567 or +233241234567)' };
        }
      }
      
      // Validate delivery location
      if (!deliveryLocation) {
        return { isValid: false, error: 'Delivery location is required for delivery orders' };
      }
      
      // Validate custom location details if "Other" is selected
      if (deliveryLocation === 'Other') {
        if (!customLocationName.trim()) {
          return { isValid: false, error: 'Custom location name is required' };
        }
        if (!customLocationFee.trim() || isNaN(parseFloat(customLocationFee)) || parseFloat(customLocationFee) < 0) {
          return { isValid: false, error: 'Please enter a valid delivery fee amount' };
        }
      }
    }
    
    return { isValid: true, validItems };
  };

  const handleFinalSubmit = async () => {
    // Prevent multiple submissions
    if (isSubmitting) {
      contextToast.operationPending();
      return;
    }

    const startTime = performance.now();
    console.log('⏱️ Order submission started');
    
    // Validate order before submission
    const validation = validateOrderSubmission();
    if (!validation.isValid) {
      optimizedToast.error(validation.error);
      console.log('❌ Validation failed:', validation.error);
      return; // Exit early - no API call will be made
    }
    
    // Only proceed with submission if validation passed
    console.log('✅ Validation passed, proceeding with submission');
    setIsSubmitting(true);

    try {
      // Use validated items from validation result
      const payloadItems = validation.validItems
        .map(([itemId, quantity]) => ({ 
          menu_item_id: parseInt(itemId), 
          quantity: parseInt(quantity) 
        }))
        .filter(item => !isNaN(item.menu_item_id) && item.menu_item_id > 0);
      
      const payloadExtras = Object.entries(selectedExtras)
        .filter(([, quantity]) => quantity > 0)
        .map(([extraId, quantity]) => ({ 
          menu_item_id: parseInt(extraId), 
          quantity: parseInt(quantity) 
        }))
        .filter(item => !isNaN(item.menu_item_id) && item.menu_item_id > 0);
      
      // Combine main items and extras into one items array
      const allItems = [...payloadItems, ...payloadExtras];
      
      // Validate that we have at least one item
      if (allItems.length === 0) {
        optimizedToast.error('No valid items in order. Please add at least one item.');
        setIsSubmitting(false);
        return;
      }
      
      console.log('🛒 Items being sent:', allItems);

      // Clean up phone number - remove any spaces or special characters
      const cleanPhone = customerPhone.trim().replace(/\s+/g, '').replace(/-/g, '');
      
      const orderPayload = {
        customer_phone: cleanPhone,
        delivery_type: deliveryType,
        notes: notes.trim(),
        items: allItems,
        // User tracking information
        modified_by: userData?.id || userData?.user_id,
        modified_by_username: userData?.username,
        modified_by_role: userData?.role || userData?.user_role,
      };
      
      // Only add created_by fields for new orders
      if (!isEditMode) {
        orderPayload.created_by = userData?.id || userData?.user_id;
        orderPayload.created_by_username = userData?.username;
        orderPayload.created_by_role = userData?.role || userData?.user_role;
      }
      
      // Preserve existing order status and payment info when editing
      if (isEditMode && existingOrder) {
        orderPayload.status = existingOrder.status;
        orderPayload.payment_status = existingOrder.payment_status;
        // Don't send total_price - it's calculated by the backend
        // Don't modify payment amounts directly from order form
      }

      if (deliveryType === 'Delivery') {
        if (deliveryLocation === 'Other') {
          // For custom locations, use the custom fields
          orderPayload.custom_delivery_location = customLocationName.trim();
          orderPayload.custom_delivery_fee = parseFloat(customLocationFee);
          // Explicitly set delivery_location to null for custom locations
          orderPayload.delivery_location = null;
        } else {
          // For predefined locations, use the delivery_location field
          orderPayload.delivery_location = deliveryLocation;
          // Explicitly clear custom fields for predefined locations
          orderPayload.custom_delivery_location = null;
          orderPayload.custom_delivery_fee = null;
        }
      } else {
        // For pickup orders, explicitly clear all delivery fields
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
      const locationText = deliveryType === 'Delivery' && deliveryLocation ? ` to ${getLocationDisplayName(deliveryLocation)}` : '';
      
      // Use the backend calculated total price instead of frontend calculated
      const finalTotal = result.total_price || grandTotal;
      console.log('📊 Order total comparison:', {
        frontend: grandTotal,
        backend: result.total_price,
        using: finalTotal
      });
      optimizedToast.success(`Order ${result.order_number} ${actionText} - ₵${parseFloat(finalTotal).toFixed(2)}`);
      
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
      
      // Navigate to view orders page with the order ID to auto-open the order details modal
      navigate(`/view-orders?openOrder=${result.order_number || result.id}`);
    } catch (error) {
      console.error('🚨 Network/Request Error:', error);
      console.error('Error details:', {
        message: error.message,
        status: error.status,
        response: error.response,
        data: error.data
      });
      
      // Show more specific error message
      let errorMessage = `Error ${isEditMode ? 'updating' : 'creating'} order`;
      if (error.message) {
        errorMessage += `: ${error.message}`;
      } else if (error.status === 400) {
        errorMessage += ': Invalid order data';
      } else if (error.status === 403) {
        errorMessage += ': Permission denied';
      } else if (error.status === 404) {
        errorMessage += ': Order not found';
      }
      
      optimizedToast.error(errorMessage);
    } finally {
      // Always re-enable the button after the request completes
      setIsSubmitting(false);
    }
  };


  // Show loading state when fetching order data in edit mode
  if (isEditMode && loading) {
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

  // Show error state if order fetch failed
  if (isEditMode && loadError) {
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
          <p className="mb-3">{loadError}</p>
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
            <Card.Header className={`${isEditMode ? 'bg-warning' : 'ada-bg-primary'} text-white py-3`}>
              <h5 className="mb-0">
                <i className={`bi ${isEditMode ? 'bi-pencil-square' : 'bi-plus-circle'} me-2`}></i>
                {isEditMode ? `Edit Order ${existingOrder?.order_number || orderNumber || ''}` : 'Create New Order'}
              </h5>
              {isEditMode && existingOrder && (
                <small className="d-block mt-1">
                  Status: <span className="badge bg-light text-dark">{existingOrder.status}</span>
                </small>
              )}
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
                      let item = displayMenuItems.find(mi => mi.id.toString() === itemId.toString());
                      // If not found in displayMenuItems, search in allMenuItems
                      if (!item) {
                        item = allMenuItems.find(mi => mi.id.toString() === itemId.toString() && !mi.is_extra);
                      }
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
                  {displayMenuItems.length === 0 ? (
                    <div className="text-center py-3">
                      <div className="text-muted mb-2">
                        <i className="bi bi-exclamation-triangle" style={{ fontSize: '1.5rem' }}></i>
                      </div>
                      <p className="text-muted mb-0">No menu items available</p>
                      <small className="text-muted">
                        {allMenuItems.length === 0 ? 'No items loaded from API' : 
                         mainMenuItems.length === 0 ? `${allMenuItems.length} items loaded, but all are marked as extras` :
                         `${allMenuItems.length} total items loaded`}
                      </small>
                    </div>
                  ) : (
                    <Tab.Container activeKey={activeMenuTab} onSelect={(k) => setActiveMenuTab(k)}>
                      <Nav variant="tabs" className="mb-3">
                        <Nav.Item>
                          <Nav.Link eventKey="regular">
                            <i className="bi bi-bag-fill me-1"></i>
                            Regular
                          </Nav.Link>
                        </Nav.Item>
                        <Nav.Item>
                          <Nav.Link eventKey="bolt">
                            <i className="bi bi-lightning-fill me-1"></i>
                            Bolt
                          </Nav.Link>
                        </Nav.Item>
                      </Nav>
                      <Tab.Content>
                        <Tab.Pane eventKey="regular" style={{ minHeight: '100px' }}>
                          <div className="d-flex gap-2 flex-wrap">
                            {regularMenuItems.filter(item => !selectedItems[item.id]).length === 0 ? (
                              <small className="text-muted fst-italic">All regular items have been added</small>
                            ) : (
                              regularMenuItems
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
                        </Tab.Pane>
                        <Tab.Pane eventKey="bolt" style={{ minHeight: '100px' }}>
                          <div className="d-flex gap-2 flex-wrap">
                            {boltMenuItems.filter(item => !selectedItems[item.id]).length === 0 ? (
                              <small className="text-muted fst-italic">All Bolt items have been added</small>
                            ) : (
                              boltMenuItems
                                .filter(item => !selectedItems[item.id])
                                .map(item => (
                                  <Button
                                    key={item.id}
                                    variant="outline-primary"
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
                        </Tab.Pane>
                      </Tab.Content>
                    </Tab.Container>
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
                    {/* Show delivery info on mobile when delivery is selected */}
                    {isMobile && deliveryType === 'Delivery' && (
                      <div className="mt-3">
                        <Card className="border-0 shadow-sm">
                          <Card.Body className="p-3">
                            <div className="d-flex justify-content-between align-items-center mb-3">
                              <h6 className="mb-0 text-muted" style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                                <i className="bi bi-info-circle-fill me-2"></i>
                                Delivery Details
                              </h6>
                              <button
                                type="button"
                                className="btn btn-sm p-1 border-0 bg-light rounded-circle"
                                onClick={() => setShowDeliveryModal(true)}
                                style={{ 
                                  width: '32px',
                                  height: '32px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'center',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.backgroundColor = '#e9ecef';
                                  e.currentTarget.style.transform = 'scale(1.1)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                                  e.currentTarget.style.transform = 'scale(1)';
                                }}
                              >
                                <i className="bi bi-pencil-square text-primary" style={{ fontSize: '0.9rem' }}></i>
                              </button>
                            </div>
                            
                            {deliveryLocation && (
                              <div className="mb-2">
                                <div className="d-flex align-items-start">
                                  <i className="bi bi-geo-alt-fill text-primary me-2" style={{ fontSize: '1rem' }}></i>
                                  <div className="flex-grow-1">
                                    <small className="text-muted d-block mb-1">Location</small>
                                    <p className="mb-0 fw-semibold" style={{ fontSize: '0.95rem' }}>
                                      {getLocationDisplayName(deliveryLocation)}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {customerPhone && (
                              <div className="mb-2">
                                <div className="d-flex align-items-start">
                                  <i className="bi bi-telephone-fill text-primary me-2" style={{ fontSize: '1rem' }}></i>
                                  <div className="flex-grow-1">
                                    <small className="text-muted d-block mb-1">Phone</small>
                                    <p className="mb-0 fw-semibold" style={{ fontSize: '0.95rem' }}>
                                      {customerPhone}
                                    </p>
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {currentDeliveryFee > 0 && (
                              <div className="mt-3 pt-2 border-top">
                                <div className="d-flex justify-content-between align-items-center">
                                  <span className="text-muted" style={{ fontSize: '0.9rem' }}>
                                    <i className="bi bi-cash me-1"></i>
                                    Delivery Fee
                                  </span>
                                  <span className="fw-bold text-success" style={{ fontSize: '0.95rem' }}>
                                    ₵{currentDeliveryFee.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                            )}
                            
                            {!deliveryLocation && (
                              <div className="text-center py-3">
                                <i className="bi bi-truck text-muted mb-2" style={{ fontSize: '2rem', display: 'block' }}></i>
                                <p className="text-muted mb-3" style={{ fontSize: '0.9rem' }}>No delivery details set</p>
                                <Button 
                                  variant="primary" 
                                  size="sm" 
                                  className="px-4 py-2" 
                                  onClick={() => setShowDeliveryModal(true)}
                                  style={{ 
                                    borderRadius: '20px',
                                    fontWeight: '500'
                                  }}
                                >
                                  <i className="bi bi-plus-circle me-2"></i>
                                  Add Delivery Details
                                </Button>
                              </div>
                            )}
                          </Card.Body>
                        </Card>
                      </div>
                    )}
                  </Form.Group>
                </Col>
                {deliveryType === 'Delivery' && !isMobile && (
                  <Col md={4}>
                    <Form.Group controlId="deliveryLocation">
                      <Form.Label className="fw-semibold">Delivery Location <span className="text-danger">*</span></Form.Label>
                      <div className="position-relative" data-location-search>
                        <Form.Control
                          type="text"
                          value={locationSearchTerm}
                          onChange={(e) => {
                            const newValue = e.target.value;
                            setLocationSearchTerm(newValue);
                            
                            // Clear any existing timeout
                            if (searchTimeoutRef.current) {
                              clearTimeout(searchTimeoutRef.current);
                            }
                            
                            // Debounce dropdown showing to prevent erratic behavior
                            searchTimeoutRef.current = setTimeout(() => {
                              // Only show dropdown if not setting up custom location and locations are loaded
                              if (deliveryLocation !== 'Other' && !loadingLocations && newValue.length > 0) {
                                setShowLocationDropdown(true);
                              } else if (newValue.length === 0) {
                                setShowLocationDropdown(false);
                              }
                            }, 150); // 150ms debounce
                            
                            // Clear delivery location if search term is cleared
                            if (newValue === '') {
                              setDeliveryLocation('');
                              setShowLocationDropdown(false);
                            }
                          }}
                          onFocus={() => {
                            // Only show dropdown if not setting up custom location and locations are loaded
                            if (deliveryLocation !== 'Other' && !loadingLocations) {
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
                                : deliveryLocations.length === 0
                                  ? '📍 No locations available'
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
                    {/* Show delivery locations first */}
                    {deliveryLocations.length > 0 && filteredDeliveryLocations.length > 0 && (
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
                    )}
                    {/* Show "Other" option at the bottom */}
                    <div
                      className="p-2 border-top cursor-pointer text-primary"
                      style={{ 
                        cursor: 'pointer',
                        backgroundColor: '#f8f9fa'
                      }}
                      onClick={() => {
                        setDeliveryLocation('Other');
                        setCustomLocationName(locationSearchTerm); // Auto-fill with search term
                        setLocationSearchTerm('');
                        setShowLocationDropdown(false);
                      }}
                    >
                      🏠 Other (Custom Location)
                    </div>
                    {/* Show no results message if needed */}
                    {filteredDeliveryLocations.length === 0 && locationSearchTerm && (
                      <div className="p-2 text-muted text-center">
                        No locations found
                      </div>
                    )}
                  </div>
                )}
                      </div>
                      <Form.Control.Feedback type="invalid">{errors.deliveryLocation}</Form.Control.Feedback>
                    </Form.Group>
                  </Col>
                )}
                
                {/* Custom Location Fields - Show when "Other" is selected */}
                {deliveryType === 'Delivery' && deliveryLocation === 'Other' && !isMobile && (
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
                
                {deliveryType === 'Delivery' && !isMobile && (
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
                      let item = displayMenuItems.find(mi => mi.id.toString() === itemId.toString());
                      // If not found in displayMenuItems, search in allMenuItems
                      if (!item) {
                        item = allMenuItems.find(mi => mi.id.toString() === itemId.toString() && !mi.is_extra);
                      }
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
                      let extra = extraMenuItems.find(e => e.id.toString() === extraId.toString());
                      // If not found in extraMenuItems, search in allMenuItems
                      if (!extra) {
                        extra = allMenuItems.find(mi => mi.id.toString() === extraId.toString() && mi.is_extra);
                      }
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
                      <span>Delivery ({getLocationDisplayName(deliveryLocation)}):</span>
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
                      {deliveryType === 'Delivery' && deliveryLocation && ` to ${getLocationDisplayName(deliveryLocation)}`}
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
              {isEditMode && existingOrder && (
                <span className="badge bg-info" style={{ fontSize: '0.75rem' }}>
                  <i className="bi bi-pencil me-1"></i>
                  Editing #{existingOrder.order_number}
                </span>
              )}
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
                      <span className="text-muted small">{getLocationDisplayName(deliveryLocation)}</span>
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

      {/* Delivery Details Modal for Mobile */}
      <Modal 
        show={showDeliveryModal && isMobile} 
        onHide={() => {
          // Reset to pickup if no location selected
          if (!deliveryLocation && !customerPhone) {
            setDeliveryType('Pickup');
          }
          setShowDeliveryModal(false);
        }} 
        centered
        size="lg"
        fullscreen="sm-down"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-truck me-2"></i>
            Delivery Details
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            {/* Delivery Location */}
            <Form.Group className="mb-3" controlId="deliveryModalLocation">
              <Form.Label className="fw-semibold">
                Delivery Location <span className="text-danger">*</span>
              </Form.Label>
              <div className="position-relative" data-location-search>
                <Form.Control
                  type="text"
                  value={locationSearchTerm}
                  onChange={(e) => {
                    const newValue = e.target.value;
                    setLocationSearchTerm(newValue);
                    
                    // Clear any existing timeout
                    if (searchTimeoutRef.current) {
                      clearTimeout(searchTimeoutRef.current);
                    }
                    
                    // Debounce dropdown showing to prevent erratic behavior
                    searchTimeoutRef.current = setTimeout(() => {
                      // Only show dropdown if not setting up custom location and locations are loaded
                      if (deliveryLocation !== 'Other' && !loadingLocations && newValue.length > 0) {
                        setShowLocationDropdown(true);
                      } else if (newValue.length === 0) {
                        setShowLocationDropdown(false);
                      }
                    }, 150); // 150ms debounce
                    
                    // Clear delivery location if search term is cleared
                    if (newValue === '') {
                      setDeliveryLocation('');
                      setShowLocationDropdown(false);
                    }
                  }}
                  onFocus={() => {
                    // Only show dropdown if not setting up custom location and locations are loaded
                    if (deliveryLocation !== 'Other' && !loadingLocations) {
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
                        : deliveryLocations.length === 0
                          ? '📍 No locations available'
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
                    {/* Show delivery locations first */}
                    {deliveryLocations.length > 0 && filteredDeliveryLocations.length > 0 && (
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
                    )}
                    {/* Show "Other" option at the bottom */}
                    <div
                      className="p-2 border-top cursor-pointer text-primary fw-semibold"
                      style={{ 
                        cursor: 'pointer',
                        backgroundColor: '#f8f9fa'
                      }}
                      onClick={() => {
                        setDeliveryLocation('Other');
                        setCustomLocationName(locationSearchTerm); // Auto-fill with search term
                        setLocationSearchTerm('');
                        setShowLocationDropdown(false);
                      }}
                    >
                      🏠 Other (Custom Location)
                    </div>
                    {/* Show no results message if needed */}
                    {filteredDeliveryLocations.length === 0 && locationSearchTerm && (
                      <div className="p-2 text-muted text-center">
                        No locations found
                      </div>
                    )}
                  </div>
                )}
              </div>
              <Form.Control.Feedback type="invalid">{errors.deliveryLocation}</Form.Control.Feedback>
            </Form.Group>

            {/* Custom Location Fields - Show when "Other" is selected */}
            {deliveryLocation === 'Other' && (
              <>
                <Form.Group className="mb-3" controlId="deliveryModalCustomLocation">
                  <Form.Label className="fw-semibold">
                    Custom Location Name <span className="text-danger">*</span>
                  </Form.Label>
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
                <Form.Group className="mb-3" controlId="deliveryModalCustomFee">
                  <Form.Label className="fw-semibold">
                    Custom Delivery Fee (₵) <span className="text-danger">*</span>
                  </Form.Label>
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
              </>
            )}

            {/* Customer Phone */}
            <Form.Group className="mb-3" controlId="deliveryModalPhone">
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
              />
              <Form.Control.Feedback type="invalid">{errors.customerPhone}</Form.Control.Feedback>
            </Form.Group>

            {/* Delivery Summary */}
            {(deliveryLocation || customerPhone) && (
              <div className="mt-4 p-3 bg-light rounded">
                <h6 className="mb-2">Delivery Summary</h6>
                {customerPhone && (
                  <div className="d-flex justify-content-between mb-1">
                    <span>Phone:</span>
                    <span className="fw-semibold">{customerPhone}</span>
                  </div>
                )}
                {deliveryLocation && (
                  <>
                    <div className="d-flex justify-content-between mb-1">
                      <span>Location:</span>
                      <span className="fw-semibold">
                                        {getLocationDisplayName(deliveryLocation)}
                      </span>
                    </div>
                    <div className="d-flex justify-content-between mb-1">
                      <span>Delivery Fee:</span>
                      <span className="fw-semibold text-success">
                        ₵{currentDeliveryFee.toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            )}
          </Form>
        </Modal.Body>
        <Modal.Footer className="d-flex flex-column flex-sm-row gap-2">
          <Button 
            variant="secondary" 
            className="w-100 w-sm-auto order-2 order-sm-1"
            onClick={() => {
              // Reset to pickup and clear fields
              setDeliveryType('Pickup');
              setDeliveryLocation('');
              setCustomerPhone('');
              setCustomLocationName('');
              setCustomLocationFee('');
              setLocationSearchTerm('');
              setShowLocationDropdown(false);
              setShowDeliveryModal(false);
            }}
          >
            <i className="bi bi-x-circle me-2"></i>
            Cancel Delivery
          </Button>
          <Button 
            variant="primary" 
            className="w-100 w-sm-auto order-1 order-sm-2"
            onClick={() => {
              // Validate delivery fields
              let hasErrors = false;
              let modalErrors = {};
              
              if (!customerPhone.trim()) {
                modalErrors.customerPhone = 'Customer phone is required for delivery orders';
                hasErrors = true;
              } else if (!/^(\+233|0)\d{9}$/.test(customerPhone.trim())) {
                modalErrors.customerPhone = 'Invalid Ghana phone format';
                hasErrors = true;
              }
              
              if (!deliveryLocation) {
                modalErrors.deliveryLocation = 'Delivery location is required';
                hasErrors = true;
              } else if (deliveryLocation === 'Other') {
                if (!customLocationName.trim()) {
                  modalErrors.customLocationName = 'Custom location name is required';
                  hasErrors = true;
                }
                if (!customLocationFee.trim()) {
                  modalErrors.customLocationFee = 'Custom location fee is required';
                  hasErrors = true;
                } else if (isNaN(parseFloat(customLocationFee)) || parseFloat(customLocationFee) < 0) {
                  modalErrors.customLocationFee = 'Please enter a valid fee amount';
                  hasErrors = true;
                }
              }
              
              if (hasErrors) {
                setErrors(modalErrors);
              } else {
                setErrors({});
                setShowDeliveryModal(false);
              }
            }}
          >
            <i className="bi bi-check-circle me-2"></i>
            Confirm Delivery
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Call Detection Modal */}
      <Modal 
        show={showCallModal} 
        onHide={handleRejectCallNumber} 
        centered
        size="md"
        backdrop="static"
        keyboard={false}
      >
        <Modal.Header closeButton>
          <Modal.Title className="d-flex align-items-center">
            <i className="bi bi-telephone-fill me-2 text-primary"></i>
            Incoming Call Detected
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div className="text-center mb-3">
            <i className="bi bi-phone-vibrate text-primary" style={{ fontSize: '2rem' }}></i>
            <h6 className="mt-2 mb-3">Phone Call Detected</h6>
            <p className="text-muted">Would you like to add this phone number to your order?</p>
          </div>
          
          {detectedNumber && (
            <div className="text-center mb-3 p-3 bg-light rounded">
              <strong>Detected Number:</strong>
              <br />
              <code className="text-primary fs-5">{formatPhoneNumber(detectedNumber)}</code>
            </div>
          )}
          
          <div className="alert alert-info">
            <i className="bi bi-info-circle me-2"></i>
            <small>This will automatically fill the customer phone field for delivery orders.</small>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <div className="d-flex gap-2 w-100">
            <Button 
              variant="secondary" 
              onClick={handleRejectCallNumber}
              className="flex-fill"
            >
              <i className="bi bi-x-circle me-2"></i>
              Ignore
            </Button>
            <Button 
              variant="primary" 
              onClick={handleAcceptCallNumber}
              className="flex-fill"
              disabled={!detectedNumber}
            >
              <i className="bi bi-check-circle me-2"></i>
              Use This Number
            </Button>
          </div>
        </Modal.Footer>
      </Modal>

      {/* OCR Processing Indicator */}
      <Modal 
        show={isProcessing} 
        centered
        size="sm"
        backdrop="static"
        keyboard={false}
      >
        <Modal.Body className="text-center py-4">
          <Spinner animation="border" variant="primary" className="mb-3" />
          <h6>Detecting Phone Number...</h6>
          <p className="text-muted mb-0">Processing incoming call information</p>
        </Modal.Body>
      </Modal>

      {/* Add floating button for manual trigger (for testing) */}
      {isMobile && (
        <Button
          variant="primary"
          className="position-fixed"
          style={{
            bottom: '20px',
            right: '20px',
            borderRadius: '50%',
            width: '60px',
            height: '60px',
            zIndex: 1000,
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
          }}
          onClick={triggerCallModal}
          disabled={isProcessing}
        >
          <i className="bi bi-telephone-fill fs-4"></i>
        </Button>
      )}

    </Container>
  );
};

export default CreateOrderForm;
