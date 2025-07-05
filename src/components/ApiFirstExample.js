import React from 'react';
import { useApiFirst, useRealTimeApi, useStaticApi } from '../hooks/useApiFirst';
import { apiFirstService } from '../services/apiFirstService';
import { API_ENDPOINTS } from '../utils/api';

/**
 * Example component demonstrating API-first approach with selective caching
 */
const ApiFirstExample = () => {
  // Example 1: Real-time data (transactions) - Never cached, always fresh
  const {
    data: transactions,
    loading: transactionsLoading,
    error: transactionsError,
    source: transactionsSource,
    forceRefresh: refreshTransactions
  } = useRealTimeApi(`${API_ENDPOINTS.TRANSACTIONS}?_t=${Date.now()}`, {
    refreshInterval: 30000 // Auto-refresh every 30 seconds
  });

  // Example 2: Static data (user profile) - Can be cached for 2 minutes
  const {
    data: userProfile,
    loading: profileLoading,
    error: profileError,
    isStale: profileIsStale,
    forceRefresh: refreshProfile
  } = useStaticApi(`${API_ENDPOINTS.USERS}me/`, {
    cacheDuration: 120000 // 2 minutes cache
  });

  // Example 3: Menu items - API first, minimal caching as fallback
  const {
    data: menuItems,
    loading: menuLoading,
    error: menuError,
    isFromCache: menuFromCache,
    refetch: refetchMenu
  } = useApiFirst(API_ENDPOINTS.MENU_ITEMS, {
    useCache: true,
    cacheDuration: 30000, // 30 seconds minimal cache
    fallbackToCache: true, // Use cache only if API fails
    autoRefresh: false
  });

  // Manual API calls using the service directly
  const handleCreateOrder = async () => {
    try {
      const orderData = {
        customer_phone: '1234567890',
        delivery_type: 'pickup',
        items: []
      };

      const result = await apiFirstService.createOrder(orderData);
      console.log('Order created:', result);
      
      // Force refresh transactions after creating order
      refreshTransactions();
      
    } catch (error) {
      console.error('Failed to create order:', error);
    }
  };

  const handleClearCache = () => {
    apiFirstService.clearCache();
    console.log('All cache cleared');
  };

  const cacheStats = apiFirstService.getCacheStats();

  return (
    <div className="api-first-example p-4">
      <h2 className="text-2xl font-bold mb-6">API-First Approach Examples</h2>

      {/* Cache Statistics */}
      <div className="mb-6 p-4 bg-gray-100 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Cache Statistics</h3>
        <p>Network Status: <span className={`font-bold ${cacheStats.networkStatus === 'online' ? 'text-green-600' : 'text-red-600'}`}>
          {cacheStats.networkStatus}
        </span></p>
        <p>Cache Entries: {cacheStats.totalEntries}</p>
        <p>Active Requests: {cacheStats.activeRequests}</p>
        <button 
          onClick={handleClearCache}
          className="mt-2 px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600"
        >
          Clear All Cache
        </button>
      </div>

      {/* Real-time Transactions */}
      <div className="mb-6 p-4 border rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">Real-time Transactions</h3>
          <span className="text-sm text-gray-600">
            Source: {transactionsSource} | Auto-refresh: ON
          </span>
        </div>
        
        {transactionsLoading && <p className="text-blue-600">Loading transactions...</p>}
        {transactionsError && <p className="text-red-600">Error: {transactionsError}</p>}
        {transactions && (
          <div>
            <p className="text-green-600 mb-2">
              ✅ {transactions.transactions?.length || 0} transactions loaded
            </p>
            <button 
              onClick={refreshTransactions}
              className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Force Refresh
            </button>
          </div>
        )}
      </div>

      {/* User Profile (Static Data) */}
      <div className="mb-6 p-4 border rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">User Profile (Cached)</h3>
          <span className="text-sm text-gray-600">
            {profileIsStale ? '⚠️ Stale' : '✅ Fresh'} | Cache: 2min
          </span>
        </div>
        
        {profileLoading && <p className="text-blue-600">Loading profile...</p>}
        {profileError && <p className="text-red-600">Error: {profileError}</p>}
        {userProfile && (
          <div>
            <p className="text-green-600 mb-2">✅ Profile loaded</p>
            <button 
              onClick={refreshProfile}
              className="px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
            >
              Refresh Profile
            </button>
          </div>
        )}
      </div>

      {/* Menu Items */}
      <div className="mb-6 p-4 border rounded-lg">
        <div className="flex justify-between items-center mb-2">
          <h3 className="text-lg font-semibold">Menu Items</h3>
          <span className="text-sm text-gray-600">
            {menuFromCache ? '📋 From Cache' : '🌐 From API'} | Fallback cache
          </span>
        </div>
        
        {menuLoading && <p className="text-blue-600">Loading menu...</p>}
        {menuError && <p className="text-red-600">Error: {menuError}</p>}
        {menuItems && (
          <div>
            <p className="text-green-600 mb-2">
              ✅ {Array.isArray(menuItems) ? menuItems.length : 0} menu items loaded
            </p>
            <button 
              onClick={refetchMenu}
              className="px-3 py-1 bg-purple-500 text-white rounded hover:bg-purple-600"
            >
              Refetch Menu
            </button>
          </div>
        )}
      </div>

      {/* Manual Operations */}
      <div className="mb-6 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-2">Manual Operations</h3>
        <div className="space-x-2">
          <button 
            onClick={handleCreateOrder}
            className="px-3 py-1 bg-orange-500 text-white rounded hover:bg-orange-600"
          >
            Create Test Order
          </button>
        </div>
      </div>

      {/* API-First Principles Display */}
      <div className="p-4 bg-blue-50 rounded-lg">
        <h3 className="text-lg font-semibold mb-2">🌐 API-First Principles</h3>
        <ul className="list-disc list-inside space-y-1 text-sm">
          <li><strong>Real-time data</strong>: Always API first, no caching (transactions, orders)</li>
          <li><strong>Static data</strong>: API first with short cache for expensive operations (user profile)</li>
          <li><strong>Menu data</strong>: API first with fallback cache only on failure</li>
          <li><strong>Cache invalidation</strong>: Automatic on mutations (POST/PUT/PATCH/DELETE)</li>
          <li><strong>Network aware</strong>: Clear cache when coming online</li>
          <li><strong>Offline fallback</strong>: Use stale cache only when API fails</li>
        </ul>
      </div>
    </div>
  );
};

export default ApiFirstExample;
