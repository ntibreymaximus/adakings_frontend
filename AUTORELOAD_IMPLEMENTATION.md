# Autoreload Implementation Guide

## Overview

The autoreload functionality provides real-time updates to the UI when system events occur (order creation, payment updates, status changes, etc.) without requiring manual page refresh. This creates a seamless experience where multiple users can see updates in real-time.

## How It Works

### Backend (Django)
1. **Django Signals** detect model changes (create, update, delete)
2. **WebSocket Consumer** sends notifications to connected clients
3. **Channel Groups** broadcast updates to relevant subscribers

### Frontend (React)
1. **WebSocket Service** maintains connection and handles messages
2. **React Hooks** subscribe components to specific events
3. **Components** automatically refresh data when updates occur

## Backend Implementation

### 1. WebSocket Consumer (Already Implemented)
Located at: `apps/websockets/consumers.py`

The consumer includes the `autoreload_update` handler that broadcasts updates to all authenticated users:

```python
async def autoreload_update(self, event):
    """Handle autoreload update notifications."""
    await self.send(text_data=json.dumps({
        'type': 'autoreload_update',
        'payload': event['payload']
    }))
```

### 2. Django Signals (Already Implemented)
Located at: `apps/websockets/signals.py`

Signals automatically send autoreload notifications when models change:

```python
def send_autoreload_notification(event_type, model_name, instance_data, changes=None):
    """Send autoreload notification to all connected clients."""
    payload = {
        'event': 'autoreload',
        'type': event_type,  # 'created' or 'updated'
        'model': model_name,  # 'Order', 'Payment', etc.
        'data': instance_data,
        'changes': changes,  # Dict of changed fields
        'timestamp': timezone.now().isoformat()
    }
    
    send_websocket_notification('autoreload', 'autoreload_update', payload)
```

## Frontend Implementation

### 1. Using the Autoreload Hook

Import and use the `useAutoreloadUpdates` hook in any component:

```javascript
import { useAutoreloadUpdates } from '../hooks/useWebSocket';

function YourComponent() {
  // Setup autoreload
  useAutoreloadUpdates((data) => {
    // Handle the update
    console.log('Autoreload update:', data);
    
    // Refresh your data
    fetchData();
  });
  
  // Your component logic...
}
```

### 2. Basic Implementation Example

```javascript
import React, { useState, useEffect, useCallback } from 'react';
import { useAutoreloadUpdates } from '../hooks/useWebSocket';
import { toast } from 'react-toastify';

function OrdersView() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Setup autoreload for orders
  useAutoreloadUpdates((data) => {
    // Only refresh for Order model updates
    if (data.model === 'Order') {
      console.log('📡 Order update received:', data);
      
      // Refresh without showing loader
      fetchOrders(false);
      
      // Show notification
      const message = data.type === 'created' 
        ? 'New order received!' 
        : 'Order updated';
      
      toast.info(message, {
        autoClose: 2000,
        position: "bottom-right"
      });
    }
  });
  
  const fetchOrders = useCallback(async (showLoader = true) => {
    if (showLoader) setLoading(true);
    
    try {
      const response = await fetch('/api/orders');
      const data = await response.json();
      setOrders(data);
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);
  
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);
  
  return (
    <div>
      {/* Your UI */}
    </div>
  );
}
```

### 3. Advanced Implementation with Filtering

```javascript
useAutoreloadUpdates((data) => {
  // Filter by multiple models
  if (data.model === 'Order' || data.model === 'Payment') {
    console.log(`📡 ${data.model} update:`, data);
    
    // Different actions for different models
    switch (data.model) {
      case 'Order':
        refreshOrders();
        break;
      case 'Payment':
        refreshPayments();
        refreshOrderDetails(); // Payment affects order status
        break;
    }
    
    // Custom notifications based on changes
    if (data.model === 'Order' && data.changes?.status) {
      toast.info(
        `Order status changed: ${data.changes.status.old} → ${data.changes.status.new}`,
        { position: "top-center" }
      );
    }
  }
});
```

### 4. Implementation with Debouncing

For high-frequency updates, implement debouncing:

```javascript
const debounceTimerRef = useRef(null);
const [pendingUpdates, setPendingUpdates] = useState(0);

useAutoreloadUpdates((data) => {
  if (data.model === 'Order') {
    // Count pending updates
    setPendingUpdates(prev => prev + 1);
    
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    
    // Set new timer
    debounceTimerRef.current = setTimeout(() => {
      console.log(`Processing ${pendingUpdates + 1} updates`);
      setPendingUpdates(0);
      
      // Single refresh for all updates
      fetchOrders(false);
      
      toast.info(`Orders refreshed (${pendingUpdates + 1} updates)`, {
        autoClose: 2000
      });
    }, 1000); // 1 second delay
  }
});
```

## Update Payload Structure

The autoreload update payload contains:

```javascript
{
  event: 'autoreload',
  type: 'created' | 'updated',
  model: 'Order' | 'Payment' | 'MenuItem' | etc.,
  data: {
    id: 123,
    // ... model instance data
  },
  changes: {
    // Only for updates, not creates
    status: {
      old: 'Pending',
      new: 'Accepted'
    },
    // ... other changed fields
  },
  timestamp: '2024-01-18T10:30:00Z'
}
```

## Best Practices

### 1. Filter Updates by Model
Only refresh when relevant models change:
```javascript
if (data.model === 'Order' || data.model === 'Payment') {
  // Refresh only order-related data
}
```

### 2. Avoid Loading States for Auto-refresh
Pass `false` to skip loading indicators:
```javascript
fetchData(false); // No loading spinner
```

### 3. Use Non-intrusive Notifications
Use toast notifications that don't block the UI:
```javascript
toast.info(message, {
  autoClose: 2000,
  position: "bottom-right",
  hideProgressBar: true
});
```

### 4. Handle Specific Changes
React to specific field changes:
```javascript
if (data.changes?.status) {
  // Status changed, might need special handling
}
```

### 5. Implement User Controls
Allow users to disable auto-refresh if needed:
```javascript
const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(true);

useAutoreloadUpdates((data) => {
  if (autoRefreshEnabled) {
    refreshData();
  }
});
```

## Testing Autoreload

### 1. Manual Testing
1. Open the application in multiple browser windows/tabs
2. Create/update an order in one window
3. Observe automatic updates in other windows

### 2. Console Testing
Monitor WebSocket messages in browser console:
```javascript
// In browser console
websocketService.subscribe('autoreload_update', (data) => {
  console.log('Autoreload:', data);
});
```

### 3. Backend Testing
Trigger updates from Django shell:
```python
# python manage.py shell
from apps.orders.models import Order
order = Order.objects.first()
order.status = 'Accepted'
order.save()  # This triggers autoreload
```

## Troubleshooting

### 1. Updates Not Received
- Check WebSocket connection status in browser console
- Verify user is authenticated
- Check Django logs for signal errors

### 2. Too Many Updates
- Implement debouncing
- Filter by specific models
- Check for update loops

### 3. Performance Issues
- Limit the data fetched on refresh
- Use pagination
- Cache unchanged data

## Adding Autoreload to New Components

1. Import the hook:
```javascript
import { useAutoreloadUpdates } from '../hooks/useWebSocket';
```

2. Add the hook with appropriate filtering:
```javascript
useAutoreloadUpdates((data) => {
  if (data.model === 'YourModel') {
    refreshYourData();
  }
});
```

3. Implement refresh function without loading state:
```javascript
const refreshYourData = async () => {
  try {
    const response = await fetch('/api/your-endpoint');
    const data = await response.json();
    setYourData(data);
  } catch (error) {
    console.error('Refresh error:', error);
  }
};
```

## Security Considerations

1. **Authentication Required**: Only authenticated users receive updates
2. **No Sensitive Data**: Don't send sensitive information in updates
3. **Rate Limiting**: Backend should implement rate limiting
4. **Data Validation**: Always validate data before using it

## Performance Optimization

1. **Selective Refresh**: Only refresh affected data
2. **Batch Updates**: Use debouncing for frequent updates
3. **Efficient Queries**: Optimize API endpoints for quick responses
4. **Client-side Caching**: Don't refetch unchanged data

## Future Enhancements

1. **Granular Subscriptions**: Subscribe to specific records
2. **Offline Queue**: Queue updates when offline
3. **Conflict Resolution**: Handle concurrent edits
4. **Update Preview**: Show what changed before refreshing
