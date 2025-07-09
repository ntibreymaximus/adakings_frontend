// Debug script to check API endpoints
console.log('=== DEBUG API ENDPOINTS ===');

// Import API endpoints
import { API_ENDPOINTS, API_BASE_URL } from './src/utils/api.js';

console.log('API_BASE_URL:', API_BASE_URL);
console.log('API_ENDPOINTS:', API_ENDPOINTS);

// Check what the cache service is using
import { apiCacheService } from './src/services/apiCacheService.js';

console.log('Cache service essential endpoints:', apiCacheService.cacheConfig.essential.endpoints);

console.log('=== END DEBUG ===');
