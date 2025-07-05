# API-First Approach Implementation

This document explains the implementation of an API-first strategy with selective caching in your React frontend application.

## Overview

The API-first approach prioritizes direct API calls over caching mechanisms, using cache only when absolutely necessary. This ensures data freshness while maintaining performance and offline capability.

## Key Principles

### 1. 🌐 API First, Cache Second
- **Always try API first** - Every request attempts to fetch fresh data from the server
- **Cache as fallback only** - Cache is used only when API calls fail
- **Minimal cache duration** - Very short cache TTL (10-30 seconds) for most data

### 2. 📊 Data Classification

#### Real-time Data (No Caching)
- **Transactions**: Always fresh, never cached
- **Orders**: Always fresh, never cached  
- **Live statistics**: Always fresh, never cached

```javascript
// Example: Real-time transactions
const { data: transactions } = useRealTimeApi(API_ENDPOINTS.TRANSACTIONS, {
  refreshInterval: 30000 // Auto-refresh every 30 seconds
});
```

#### Static Data (Minimal Caching)
- **User profiles**: 2-minute cache for expensive operations
- **System settings**: 5-minute cache for rarely changing data

```javascript
// Example: User profile with minimal caching
const { data: profile } = useStaticApi(`${API_ENDPOINTS.USERS}me/`, {
  cacheDuration: 120000 // 2 minutes cache
});
```

#### Semi-dynamic Data (Fallback Caching)
- **Menu items**: API first with 30-second fallback cache
- **Product catalogs**: API first with short fallback cache

```javascript
// Example: Menu items with fallback caching
const { data: menuItems } = useApiFirst(API_ENDPOINTS.MENU_ITEMS, {
  useCache: true,
  cacheDuration: 30000, // 30 seconds minimal cache
  fallbackToCache: true // Use cache only if API fails
});
```

### 3. 🔄 Cache Invalidation Strategy

#### Automatic Invalidation
- **Mutations**: POST/PUT/PATCH/DELETE operations automatically clear related cache
- **Network events**: Cache cleared when coming online after being offline
- **Manual operations**: Force refresh available for all endpoints

#### Smart Invalidation
```javascript
// Cache automatically invalidated when creating orders
await apiFirstService.createOrder(orderData);
// Related caches (orders, transactions) are automatically cleared
```

### 4. 🌍 Network Awareness

#### Online Behavior
- Prefer API calls always
- Use minimal caching for performance optimization
- Clear cache when network comes back online

#### Offline Behavior  
- Use stale cache as last resort
- Store data in localStorage for offline fallback
- Automatic refresh when network restored

## Implementation Files

### Core Services

#### `src/services/apiFirstService.js`
- **Purpose**: Central API service with selective caching
- **Features**: Request deduplication, cache invalidation, network monitoring
- **Cache Duration**: 10 seconds default, 2 minutes for expensive operations

#### `src/services/menuCacheService.js` (Updated)
- **Purpose**: Menu-specific service using API-first approach
- **Changes**: Removed aggressive caching, uses apiFirstService
- **Behavior**: API first with minimal fallback caching

#### `src/services/transactionDataService.js` (Updated)  
- **Purpose**: Transaction service for real-time data
- **Changes**: No caching, always fresh API calls
- **Fallback**: localStorage only for offline scenarios

### React Hooks

#### `src/hooks/useApiFirst.js`
- **useApiFirst**: General-purpose API-first hook with configurable caching
- **useRealTimeApi**: Specialized hook for real-time data (no caching)
- **useStaticApi**: Specialized hook for static data (minimal caching)

### Example Usage

#### `src/components/ApiFirstExample.js`
- Complete example demonstrating all approaches
- Shows real-time, static, and semi-dynamic data handling
- Includes cache monitoring and manual operations

## Usage Guidelines

### When to Use Each Hook

```javascript
// For real-time data that changes frequently
const { data } = useRealTimeApi('/api/transactions/', {
  refreshInterval: 30000
});

// For static data that rarely changes
const { data } = useStaticApi('/api/user/profile/', {
  cacheDuration: 120000 // 2 minutes
});

// For data that needs API-first with fallback
const { data } = useApiFirst('/api/menu/items/', {
  useCache: true,
  cacheDuration: 30000,
  fallbackToCache: true
});

// Manual API calls
const result = await apiFirstService.request('/api/orders/', {
  method: 'POST',
  body: JSON.stringify(orderData)
});
```

### Configuration Options

```javascript
const options = {
  // API behavior
  method: 'GET',
  useCache: false,                    // Enable/disable caching
  cacheDuration: 10000,              // Cache TTL in milliseconds
  fallbackToCache: true,             // Use cache when API fails
  bypassCache: false,                // Force API call ignoring cache
  timeout: 8000,                     // Request timeout
  
  // Hook behavior  
  autoRefresh: false,                // Auto-refresh data
  refreshInterval: 30000,            // Auto-refresh interval
  fetchOnMount: true,                // Fetch on component mount
  dependencies: [],                  // Re-fetch dependencies
  onSuccess: (data) => {},           // Success callback
  onError: (error) => {}             // Error callback
};
```

## Migration from Cache-Heavy Approach

### Before (Cache-heavy)
```javascript
// Old approach - cache first
const { data } = useMenuCache(filters, {
  cacheFirst: true,
  cacheDuration: 300000 // 5 minutes
});
```

### After (API-first)
```javascript
// New approach - API first
const { data } = useApiFirst(API_ENDPOINTS.MENU_ITEMS, {
  useCache: true,
  cacheDuration: 30000, // 30 seconds
  fallbackToCache: true
});
```

## Performance Benefits

### Improved Data Freshness
- Users always see the latest data
- Reduced stale data issues
- Better user experience with real-time updates

### Better Network Utilization
- Requests are deduplicated automatically
- Smart cache invalidation reduces unnecessary calls
- Network-aware behavior optimizes bandwidth usage

### Enhanced Offline Experience
- Graceful degradation to cached data
- Automatic recovery when network restored
- localStorage fallback for critical data

## Monitoring and Debugging

### Cache Statistics
```javascript
const stats = apiFirstService.getCacheStats();
console.log({
  totalEntries: stats.totalEntries,
  networkStatus: stats.networkStatus,
  activeRequests: stats.activeRequests
});
```

### Console Logging
The implementation includes comprehensive logging:
- 🌐 API requests
- 📋 Cache hits
- 🔄 Cache fallbacks
- ❌ API failures
- 🗑️ Cache invalidation

### Development Tools
- Real-time cache monitoring
- Manual cache clearing
- Force refresh capabilities
- Network status indicators

## Best Practices

### 1. Choose the Right Hook
- `useRealTimeApi` for frequently changing data
- `useStaticApi` for rarely changing data
- `useApiFirst` for everything else

### 2. Set Appropriate Cache Durations
- Real-time data: No caching
- User data: 2 minutes maximum
- Static data: 5 minutes maximum
- Fallback cache: 30 seconds maximum

### 3. Handle Errors Gracefully
```javascript
const { data, error, isFromCache } = useApiFirst(endpoint);

if (error && !data) {
  return <ErrorMessage message={error} />;
}

return (
  <div>
    {isFromCache && <WarningBanner message="Showing cached data" />}
    <DataDisplay data={data} />
  </div>
);
```

### 4. Optimize for User Experience
- Show loading states for API calls
- Indicate when data is from cache
- Provide manual refresh options
- Handle offline scenarios gracefully

## Conclusion

This API-first approach ensures that your application always strives to show the freshest data possible while maintaining good performance and offline capabilities. The selective caching strategy provides the best of both worlds: data freshness and user experience.

The implementation is backward compatible with existing code and can be adopted gradually throughout your application.
