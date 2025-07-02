import React from 'react';
import { 
  getActivityStyling, 
  getOrderStatusClass, 
  getOrderStatusIcon,
  getPaymentStatusClass,
  getPaymentStatusIcon,
  getPaymentMethodClass,
  getPaymentMethodIcon,
  getPaymentModeDisplay,
  formatPrice,
  formatActivityTime
} from '../utils/activityTypes';
import '../styles/mobile-native.css';

const ActivityTypesDemo = () => {
  // Sample order activities data
  const orderActivities = [
    { id: 1, status: 'Pending', created_at: new Date().toISOString(), order_number: '001', delivery_type: 'Pickup' },
    { id: 2, status: 'Accepted', created_at: new Date(Date.now() - 30*60*1000).toISOString(), order_number: '002', delivery_type: 'Delivery' },
    { id: 3, status: 'Fulfilled', created_at: new Date(Date.now() - 60*60*1000).toISOString(), order_number: '003', delivery_type: 'Pickup' },
    { id: 4, status: 'Cancelled', created_at: new Date(Date.now() - 90*60*1000).toISOString(), order_number: '004', delivery_type: 'Delivery' },
    { id: 5, status: 'Out for Delivery', created_at: new Date(Date.now() - 45*60*1000).toISOString(), order_number: '005', delivery_type: 'Delivery' }
  ];

  // Sample payment activities data
  const paymentActivities = [
    { id: 6, status: 'PAID', payment_status: 'PAID', payment_mode: 'CASH', amount: '25.50', order_id: '001', created_at: new Date().toISOString() },
    { id: 7, status: 'OVERPAID', payment_status: 'OVERPAID', payment_mode: 'MTN MOMO', amount: '30.00', order_id: '002', created_at: new Date(Date.now() - 20*60*1000).toISOString() },
    { id: 8, status: 'PARTIALLY PAID', payment_status: 'PARTIALLY PAID', payment_mode: 'TELECEL CASH', amount: '15.00', order_id: '003', created_at: new Date(Date.now() - 40*60*1000).toISOString() },
    { id: 9, status: 'PENDING', payment_status: 'PENDING PAYMENT', payment_mode: 'PAYSTACK(API)', amount: '45.00', order_id: '004', created_at: new Date(Date.now() - 70*60*1000).toISOString() },
    { id: 10, status: 'FAILED', payment_status: 'FAILED', payment_mode: 'PAYSTACK(USSD)', amount: '35.75', order_id: '005', created_at: new Date(Date.now() - 80*60*1000).toISOString() }
  ];

  // Sample refund activities data
  const refundActivities = [
    { 
      id: 11, 
      transaction_type: 'REFUND', 
      payment_mode: 'CASH', 
      amount: '-25.50', 
      order_id: '004', 
      created_at: new Date(Date.now() - 10*60*1000).toISOString() 
    }
  ];

  const allActivities = [...orderActivities, ...paymentActivities, ...refundActivities];

  const renderActivityItem = (activity) => {
    const styling = getActivityStyling(activity);
    
    return (
      <div key={activity.id} className={`pwa-activity-item ${styling.containerClass}`}>
        <div className={`pwa-activity-icon ${styling.cssClass}`}>
          <i className={styling.icon}></i>
        </div>
        
        <div className="pwa-activity-content">
          <div className="pwa-activity-title">
            {styling.activityType === 'order' 
              ? `Order #${activity.order_number} ${styling.status}`
              : styling.activityType === 'refund'
              ? 'Refund Processed'
              : `Payment ${styling.status}`
            }
          </div>
          
          <div className="pwa-activity-subtitle">
            Order #{activity.order_id || activity.order_number} • {formatActivityTime(activity.created_at)}
          </div>
          
          <div className="pwa-activity-meta">
            <div className={`pwa-status ${styling.cssClass}`}>
              {styling.status}
            </div>
            
            {activity.amount && (
              <div className="pwa-activity-amount">
                {formatPrice(Math.abs(activity.amount))}
              </div>
            )}
          </div>
          
          {styling.paymentMethod && (
            <div className="pwa-payment-method">
              <div className={styling.paymentMethod.class}>
                <i className={styling.paymentMethod.icon}></i>
              </div>
              <span>{styling.paymentMethod.display}</span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="pwa-content">
      <div className="pwa-card">
        <div className="pwa-card-title" style={{ marginBottom: '16px' }}>
          🎨 Activity Types Demo
        </div>
        <div className="pwa-card-subtitle" style={{ marginBottom: '20px' }}>
          Showcasing distinctive icons and styling for different activity types
        </div>
        
        {/* Order Status Activities */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '12px', color: '#2196f3' }}>
            📋 Order Status Changes
          </h3>
          <div>
            {orderActivities.map(renderActivityItem)}
          </div>
        </div>

        {/* Payment Transaction Activities */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '12px', color: '#4caf50' }}>
            💳 Payment Transactions
          </h3>
          <div>
            {paymentActivities.map(renderActivityItem)}
          </div>
        </div>

        {/* Refund Activities */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '12px', color: '#673ab7' }}>
            💰 Refund Transactions
          </h3>
          <div>
            {refundActivities.map(renderActivityItem)}
          </div>
        </div>

        {/* Timeline View Demo */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '12px', color: '#333' }}>
            📅 Timeline View
          </h3>
          <div className="pwa-activity-timeline">
            {allActivities.slice(0, 6).map((activity) => {
              const styling = getActivityStyling(activity);
              return (
                <div key={`timeline-${activity.id}`} className={`pwa-activity-timeline-item ${styling.activityType}`}>
                  <div style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '12px',
                    padding: '8px 0'
                  }}>
                    <div className={`pwa-activity-icon pwa-activity-icon-small ${styling.cssClass}`}>
                      <i className={styling.icon}></i>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>
                        {styling.activityType === 'order' 
                          ? `Order #${activity.order_number} ${styling.status}`
                          : styling.activityType === 'refund'
                          ? 'Refund Processed'
                          : `Payment ${styling.status}`
                        }
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#666' }}>
                        {formatActivityTime(activity.created_at)}
                      </div>
                    </div>
                    {activity.amount && (
                      <div style={{ fontSize: '0.8rem', fontWeight: '600' }}>
                        {formatPrice(Math.abs(activity.amount))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Status Indicators Legend */}
        <div style={{ marginBottom: '24px' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '12px', color: '#333' }}>
            🏷️ Status Indicators
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '8px' }}>
            {/* Order Status Examples */}
            {['Pending', 'Accepted', 'Fulfilled', 'Cancelled', 'Out for Delivery'].map(status => (
              <div key={status} className={`pwa-status ${getOrderStatusClass(status)}`}>
                <i className={getOrderStatusIcon(status)} style={{ marginRight: '4px' }}></i>
                {status}
              </div>
            ))}
            
            {/* Payment Status Examples */}
            {['PAID', 'OVERPAID', 'PARTIALLY PAID', 'PENDING PAYMENT', 'FAILED', 'REFUND'].map(status => (
              <div key={status} className={`pwa-status ${getPaymentStatusClass(status, status === 'REFUND')}`}>
                <i className={getPaymentStatusIcon(status, status === 'REFUND')} style={{ marginRight: '4px' }}></i>
                {status}
              </div>
            ))}
          </div>
        </div>

        {/* Payment Method Icons */}
        <div>
          <h3 style={{ fontSize: '1rem', fontWeight: '600', marginBottom: '12px', color: '#333' }}>
            💎 Payment Methods
          </h3>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {['CASH', 'MTN MOMO', 'TELECEL CASH', 'PAYSTACK(USSD)', 'PAYSTACK(API)'].map(method => (
              <div key={method} className="pwa-payment-method">
                <div className={getPaymentMethodClass(method)}>
                  <i className={getPaymentMethodIcon(method)}></i>
                </div>
                <span>{getPaymentModeDisplay(method)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pwa-card">
        <div className="pwa-card-title" style={{ marginBottom: '16px' }}>
          ✨ Features Implemented
        </div>
        <div style={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
          <div style={{ marginBottom: '8px' }}>
            ✅ <strong>Distinctive Icons:</strong> Each activity type has a unique Bootstrap icon
          </div>
          <div style={{ marginBottom: '8px' }}>
            ✅ <strong>Color Coding:</strong> Consistent color schemes for different statuses
          </div>
          <div style={{ marginBottom: '8px' }}>
            ✅ <strong>CSS Classes:</strong> Semantic class names (pwa-status-payment, pwa-status-refund, etc.)
          </div>
          <div style={{ marginBottom: '8px' }}>
            ✅ <strong>Payment Methods:</strong> Visual indicators for cash, mobile money, and online payments
          </div>
          <div style={{ marginBottom: '8px' }}>
            ✅ <strong>Timeline Support:</strong> Timeline-specific styling for activity feeds
          </div>
          <div>
            ✅ <strong>Activity Detection:</strong> Automatic classification of order vs payment vs refund activities
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityTypesDemo;
