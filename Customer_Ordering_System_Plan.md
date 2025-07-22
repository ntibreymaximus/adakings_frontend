# Customer-Facing Ordering System Implementation Plan

## 📋 Comprehensive Implementation Plan

### 🎯 System Overview
A customer-facing web application where customers can:
- Browse the menu
- Place orders with their name and phone number
- Make payments through multiple payment methods
- Track their order status in real-time
- Receive SMS notifications for order updates

### 🔧 Backend Implementation Plan

#### 1. **Database Schema Updates**
- **Order Model Enhancements:**
  - Add `customer_name` field to store customer's full name
  - Add `customer_email` field (optional) for email notifications
  - Add `order_source` field to distinguish between customer orders and front desk orders
  - Add `is_guest_order` boolean field for non-registered customers

#### 2. **Customer Management**
- **New Customer Model (Optional):**
  - Create a lightweight customer profile system
  - Fields: name, phone, email, order_history
  - Allow guest checkout without registration
  - Option to save details for future orders

#### 3. **API Endpoints Structure**
```
/api/customer/
├── menu/                     # Public menu viewing
│   ├── categories/          # List menu categories
│   └── items/              # List menu items with availability
├── orders/
│   ├── create/             # Create new order
│   ├── track/{order_id}/   # Track specific order
│   ├── history/            # Order history (if authenticated)
│   └── cancel/{order_id}/  # Cancel order (with time restrictions)
├── payments/
│   ├── initiate/           # Start payment process
│   ├── verify/             # Verify payment status
│   └── methods/            # Available payment methods
└── notifications/
    └── subscribe/          # Subscribe to order updates
```

#### 4. **Payment Integration**
- **Payment Gateway Integration:**
  - Paystack API for card/mobile money payments
  - MTN MoMo integration
  - Telecel Cash integration
  - Cash on delivery option (for pickup orders)
  
- **Payment Flow:**
  1. Customer selects payment method
  2. System initiates payment request
  3. Customer completes payment
  4. System verifies payment
  5. Order is confirmed and sent to kitchen

#### 5. **Notification System**
- **SMS Notifications:**
  - Order confirmation
  - Order accepted by restaurant
  - Order ready for pickup/out for delivery
  - Order delivered/completed
  
- **Implementation Options:**
  - Twilio API
  - Africa's Talking API
  - Local SMS gateway provider

#### 6. **Order Processing Workflow**
```
Customer Places Order → Payment Processing → Order Confirmation
                                ↓
                    Front Desk Receives Order
                                ↓
                    Kitchen Prepares Order
                                ↓
                    Order Ready → Customer Notified
                                ↓
                    Delivery/Pickup → Order Completed
```

### 🎨 Frontend Implementation Plan

#### 1. **Customer Web Application Structure**
```
/customer-app/
├── pages/
│   ├── Home/               # Landing page with featured items
│   ├── Menu/               # Browse menu by categories
│   ├── Cart/               # Shopping cart
│   ├── Checkout/           # Order details & payment
│   ├── OrderTracking/      # Real-time order status
│   └── OrderHistory/       # Past orders (optional)
├── components/
│   ├── MenuItemCard/       # Display menu items
│   ├── CartWidget/         # Floating cart indicator
│   ├── PaymentForm/        # Payment method selection
│   ├── OrderStatus/        # Visual order tracking
│   └── CustomerForm/       # Name & phone input
└── services/
    ├── api/                # API communication
    ├── payment/            # Payment gateway integration
    └── notifications/      # WebSocket for real-time updates
```

#### 2. **Key Features**
- **Responsive Design:**
  - Mobile-first approach
  - Progressive Web App (PWA) capabilities
  - Offline menu browsing

- **User Experience:**
  - Guest checkout (no registration required)
  - Save order preferences
  - Reorder previous orders
  - Estimated delivery/pickup time

#### 3. **Technology Stack**
- **Frontend Framework:** React.js (matching existing admin panel)
- **State Management:** Redux or Context API
- **Styling:** Bootstrap + Custom CSS
- **Real-time Updates:** WebSockets or Server-Sent Events
- **Payment UI:** Paystack Inline or custom forms

### 🔒 Security Considerations

1. **Authentication & Authorization:**
   - JWT tokens for registered customers
   - Guest token system for anonymous orders
   - Rate limiting for API endpoints
   - CORS configuration for customer domain

2. **Data Protection:**
   - Encrypt sensitive customer data
   - PCI compliance for payment data
   - GDPR-compliant data handling
   - Secure SMS gateway integration

3. **Order Security:**
   - Order verification codes
   - Time-based order cancellation restrictions
   - Payment verification before order processing

### 📱 SMS Integration Plan

1. **SMS Provider Selection:**
   - Evaluate providers (Twilio, Africa's Talking, local providers)
   - Consider cost per SMS
   - Delivery reliability in Ghana
   - API ease of use

2. **Message Templates:**
   ```
   Order Confirmation: "Hi {name}, your order #{order_id} has been received. Total: ₵{amount}. Track: {link}"
   
   Order Ready: "Hi {name}, your order #{order_id} is ready for pickup!"
   
   Delivery Update: "Hi {name}, your order #{order_id} is out for delivery. ETA: {time}"
   ```

### 🚀 Implementation Phases

#### Phase 1: Backend Foundation (Week 1-2)
- [x] Update Order model with customer fields
- [x] Create customer API endpoints
- [x] Implement basic order creation API
- [ ] Set up SMS service integration

#### Phase 2: Payment Integration (Week 2-3)
- [ ] Integrate Paystack API
- [ ] Add mobile money providers
- [ ] Implement payment verification
- [ ] Create payment status webhooks

#### Phase 3: Frontend Development (Week 3-5)
- [ ] Set up React customer app
- [ ] Create menu browsing interface
- [ ] Implement cart functionality
- [ ] Build checkout process
- [ ] Add order tracking page

#### Phase 4: Notifications & Real-time (Week 5-6)
- [ ] Implement WebSocket connections
- [ ] Set up SMS notifications
- [ ] Create order status updates
- [ ] Test notification delivery

#### Phase 5: Testing & Deployment (Week 6-7)
- [ ] End-to-end testing
- [ ] Payment gateway testing
- [ ] Load testing
- [ ] Security audit
- [ ] Deploy to production

### 📊 Database Changes Required

1. **Order Model Updates:** ✅ COMPLETED
   ```python
   customer_name = CharField(max_length=100, blank=True)
   customer_phone = CharField(validators=[phone_regex], required for web orders)
   order_source = CharField(choices=['web', 'frontdesk', 'phone'])
   sms_notifications_sent = JSONField(default=dict)
   ```

2. **New Models:** ✅ COMPLETED
   ```python
   CustomerProfile:
   - phone (unique) - primary identifier
   - name (optional)
   - preferred_payment_method (CASH or PAYSTACK)
   - address_book (JSON)
   - created_at
   - updated_at
   - last_order_date
   - total_orders
   
   OrderNotification:
   - order (FK)
   - notification_type
   - status
   - recipient_phone
   - message
   - provider
   - provider_response
   - sent_at
   - delivered_at
   - retry_count
   ```

### 🔄 Integration Points

1. **With Existing System:**
   - Orders appear in front desk dashboard
   - Same order processing workflow
   - Unified payment tracking
   - Shared menu management
   - Common order status updates

2. **New Integrations:**
   - SMS gateway API
   - Payment gateway webhooks
   - Customer notification preferences
   - Order analytics for customers


---
