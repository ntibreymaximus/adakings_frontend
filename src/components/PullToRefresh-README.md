# Pull-to-Refresh Implementation

This implementation provides a native mobile pull-to-refresh experience for the AdaKings frontend application.

## Components

### 1. `usePullToRefresh` Hook
A custom React hook that handles the touch gestures and pull-to-refresh logic.

**Features:**
- Touch gesture detection (pull down)
- Configurable threshold for triggering refresh
- Visual resistance and maximum pull distance
- Haptic feedback on supported devices
- Only activates when scrolled to the top

**Usage:**
```javascript
const {
  containerRef,
  pullDistance,
  isRefreshing,
  canPull,
  refreshThreshold
} = usePullToRefresh(onRefresh, options);
```

**Options:**
- `threshold`: Distance needed to trigger refresh (default: 80px)
- `resistance`: Visual resistance for pull distance (default: 2.5)
- `maxPullDistance`: Maximum pull distance for visual effect (default: 150px)
- `refreshThreshold`: Threshold to actually trigger refresh (default: 70px)
- `enabled`: Whether pull-to-refresh is enabled (default: true)

### 2. `PullToRefreshIndicator` Component
Visual indicator that shows pull progress and refresh status.

**Features:**
- Animated icons (arrow/spinner)
- Dynamic text feedback
- Smooth opacity and rotation transitions
- Customizable appearance

### 3. `PullToRefreshWrapper` Component
Higher-order component that wraps any content with pull-to-refresh functionality.

**Features:**
- Automatic mobile detection
- Only enables on mobile devices
- Easy to integrate with existing components

**Usage:**
```javascript
<PullToRefreshWrapper 
  onRefresh={async () => {
    toast.info('Refreshing...');
    await fetchData();
  }}
  enabled={isMobile}
>
  {/* Your content here */}
</PullToRefreshWrapper>
```

## Implementation Details

### Mobile Detection
The system automatically detects mobile devices using:
- Screen width (`window.innerWidth <= 768`)
- Touch capability (`'ontouchstart' in window`)

### Touch Events
- `touchstart`: Records initial touch position
- `touchmove`: Calculates pull distance and shows visual feedback
- `touchend`: Triggers refresh if threshold is met

### Visual Feedback
- Pull indicator appears when user starts pulling down
- Icon rotates based on pull distance
- Text changes: "Pull to refresh" → "Release to refresh" → "Refreshing..."
- Smooth animations and transitions

### Performance Optimizations
- Uses `useCallback` and `useRef` to prevent unnecessary re-renders
- Passive event listeners where possible
- Debounced animations
- Efficient scroll position checking

## Integration

The pull-to-refresh functionality has been integrated into:

1. **ViewOrdersPage**: Refreshes order list
2. **ViewMenuPage**: Refreshes menu items
3. **ViewTransactionsPage**: Refreshes transaction data
4. **DashboardPage**: Refreshes dashboard content

## CSS Classes

The following CSS classes are available for styling:

- `.pull-to-refresh-container`: Main container with touch handling
- `.pull-to-refresh-indicator`: Visual indicator element
- `.refresh-icon-container`: Icon wrapper
- `.refreshing`: Applied during refresh state

## Browser Support

- **iOS Safari**: Full support with haptic feedback
- **Android Chrome**: Full support
- **Desktop browsers**: Automatically disabled
- **Progressive enhancement**: Gracefully degrades on unsupported devices

## Accessibility

- Proper ARIA labels for loading states
- Keyboard navigation not affected
- Screen reader friendly
- Respects user preference for reduced motion

## Testing

To test the pull-to-refresh functionality:

1. Open the app on a mobile device or use browser dev tools mobile simulation
2. Navigate to any of the integrated pages
3. Scroll to the top of the page
4. Pull down on the content area
5. Release when the indicator shows "Release to refresh"

## Customization

You can customize the behavior by passing options to the `PullToRefreshWrapper`:

```javascript
<PullToRefreshWrapper 
  onRefresh={handleRefresh}
  threshold={100}           // Require 100px pull
  resistance={3.0}          // Higher resistance
  maxPullDistance={200}     // Allow longer pulls
  refreshThreshold={80}     // Trigger at 80px
>
  {content}
</PullToRefreshWrapper>
```
