// Custom hook for managing modal state with auto-refresh support
// This hook ensures that modal content is updated with 15-second polling

import { useState, useCallback, useEffect, useRef } from 'react';
import { useModalAutoRefresh } from './useAutoRefresh';
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

  // Setup auto-refresh for modal updates
  useModalAutoRefresh({
    modelType,
    onDataUpdate: (data) => {
      // Only refresh if modal is open and we have a selected item
      if (selectedItemRef.current && showModal) {
        console.log(`🔄 Modal auto-refresh: ${modelType} data refreshed`);
        
        // If data update callback is provided, call it
        if (onDataUpdate) {
          onDataUpdate(data);
        }
        
        // Show subtle notification about the refresh
        optimizedToast.info('Modal content refreshed', {
          autoClose: 1500,
          hideProgressBar: true,
          position: 'bottom-right'
        });
      }
    },
    enabled: showModal // Only refresh when modal is open
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
