// Custom hook for managing modal state with autoreload support
// This hook ensures that modal content is updated when WebSocket events occur

import { useState, useCallback, useEffect, useRef } from 'react';
import { useAutoreloadUpdates } from './useWebSocket';
import optimizedToast from '../utils/toastUtils';

/**
 * Custom hook that manages modal state with autoreload support
 * @param {Object} options - Configuration options
 * @param {string} options.modelType - The model type to listen for (e.g., 'Order', 'Payment')
 * @param {Function} options.onDataUpdate - Callback when data needs to be refreshed
 * @param {boolean} options.autoCloseOnExternalUpdate - Whether to close modal on external updates
 * @returns {Object} Modal state and control functions
 */
export function useModalWithAutoreload({
  modelType = 'Order',
  onDataUpdate,
  autoCloseOnExternalUpdate = false
}) {
  const [showModal, setShowModal] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const selectedItemRef = useRef(null);

  // Keep ref in sync with state
  useEffect(() => {
    selectedItemRef.current = selectedItem;
  }, [selectedItem]);

  // Setup autoreload for WebSocket updates
  useAutoreloadUpdates((data) => {
    // Check if the update is for our model type
    if (data.model === modelType || (modelType === 'Order' && data.model === 'Payment')) {
      console.log(`📡 Modal autoreload: ${modelType} update received:`, data);
      
      // If we have a selected item and modal is open
      if (selectedItemRef.current && showModal && data.object_id) {
        const isSelectedItemUpdated = selectedItemRef.current.id === data.object_id;
        
        if (isSelectedItemUpdated) {
          console.log('🔄 Current modal item was updated via autoreload');
          
          // If data update callback is provided, call it
          if (onDataUpdate) {
            onDataUpdate(data);
          }
          
          // Check if we should close the modal on external updates
          if (autoCloseOnExternalUpdate && data.source !== 'current_user') {
            optimizedToast.info('Item was updated externally. Modal will close.');
            setShowModal(false);
          } else {
            // Show subtle notification about the update
            const changeInfo = data.changes 
              ? Object.keys(data.changes).join(', ') 
              : 'content';
            
            optimizedToast.info(`Modal ${changeInfo} refreshed`, {
              autoClose: 1500,
              hideProgressBar: true,
              position: 'bottom-right'
            });
          }
        }
      }
    }
  });

  // Open modal with selected item
  const openModal = useCallback((item) => {
    setSelectedItem(item);
    setShowModal(true);
  }, []);

  // Close modal and clear selected item
  const closeModal = useCallback(() => {
    setShowModal(false);
    // Don't immediately clear selectedItem to allow for smooth transitions
    setTimeout(() => {
      setSelectedItem(null);
    }, 300);
  }, []);

  // Update selected item data (useful after refresh)
  const updateSelectedItem = useCallback((newData) => {
    if (selectedItem && newData && selectedItem.id === newData.id) {
      setSelectedItem(newData);
    }
  }, [selectedItem]);

  // Toggle updating state
  const setUpdating = useCallback((updating) => {
    setIsUpdating(updating);
  }, []);

  return {
    showModal,
    selectedItem,
    isUpdating,
    openModal,
    closeModal,
    updateSelectedItem,
    setUpdating,
    setShowModal,
    setSelectedItem
  };
}

/**
 * Hook for order modals with autoreload
 */
export function useOrderModalWithAutoreload(onDataUpdate) {
  return useModalWithAutoreload({
    modelType: 'Order',
    onDataUpdate,
    autoCloseOnExternalUpdate: false
  });
}

/**
 * Hook for payment modals with autoreload
 */
export function usePaymentModalWithAutoreload(onDataUpdate) {
  return useModalWithAutoreload({
    modelType: 'Payment',
    onDataUpdate,
    autoCloseOnExternalUpdate: false
  });
}

/**
 * Hook for transaction modals with autoreload
 */
export function useTransactionModalWithAutoreload(onDataUpdate) {
  return useModalWithAutoreload({
    modelType: 'Payment',
    onDataUpdate,
    autoCloseOnExternalUpdate: false
  });
}

export default useModalWithAutoreload;
