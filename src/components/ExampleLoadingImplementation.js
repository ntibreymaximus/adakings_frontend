import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Modal, Button } from 'react-bootstrap';
import LoadingState, { 
  PageLoadingState, 
  CardLoadingState, 
  ModalLoadingState, 
  TableLoadingState,
  InlineLoadingState 
} from './LoadingState';

/**
 * Example implementation showing how to use the new centralized loading components
 * across different scenarios in your existing pages
 */
const ExampleLoadingImplementation = () => {
  const [pageLoading, setPageLoading] = useState(true);
  const [cardLoading, setCardLoading] = useState(false);
  const [tableLoading, setTableLoading] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [orders, setOrders] = useState([]);

  // Simulate initial page load
  useEffect(() => {
    const timer = setTimeout(() => {
      setPageLoading(false);
      setOrders([
        { id: 1, customer: 'John Doe', status: 'Pending', total: 25.99 },
        { id: 2, customer: 'Jane Smith', status: 'Completed', total: 42.50 }
      ]);
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Example functions to demonstrate loading states
  const handleRefreshCard = () => {
    setCardLoading(true);
    setTimeout(() => setCardLoading(false), 1500);
  };

  const handleRefreshTable = () => {
    setTableLoading(true);
    setTimeout(() => setTableLoading(false), 2000);
  };

  const handleButtonAction = () => {
    setButtonLoading(true);
    setTimeout(() => setButtonLoading(false), 1000);
  };

  const handleOpenModal = () => {
    setShowModal(true);
    setModalLoading(true);
    setTimeout(() => setModalLoading(false), 1500);
  };

  // 1. FULL PAGE LOADING - Use when entire page is loading
  if (pageLoading) {
    return (
      <PageLoadingState 
        pageName="Orders Dashboard"
        message="Setting up your workspace..."
      />
    );
  }

  return (
    <Container className="my-4">
      <h2 className="ada-page-title mb-4">Loading States Examples</h2>
      
      {/* 2. CARD LOADING - Use within cards/components */}
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <span>Recent Activity</span>
          <Button 
            variant="outline-light" 
            size="sm" 
            onClick={handleRefreshCard}
            disabled={cardLoading}
          >
            <i className="bi bi-arrow-clockwise"></i>
          </Button>
        </Card.Header>
        <Card.Body>
          {cardLoading ? (
            <CardLoadingState 
              context="Loading activity data"
              message="Fetching recent updates..."
            />
          ) : (
            <div>
              <p>✅ Activity data loaded successfully!</p>
              <ul className="list-unstyled mb-0">
                <li>• New order #1234 created</li>
                <li>• Payment received for order #1233</li>
                <li>• Order #1232 marked as delivered</li>
              </ul>
            </div>
          )}
        </Card.Body>
      </Card>

      {/* 3. TABLE LOADING - Use within tables */}
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <span>Orders Table</span>
          <Button 
            variant="outline-light" 
            size="sm" 
            onClick={handleRefreshTable}
            disabled={tableLoading}
          >
            <i className="bi bi-arrow-clockwise"></i>
          </Button>
        </Card.Header>
        <Card.Body className="p-0">
          <Table responsive striped hover className="mb-0">
            <thead>
              <tr>
                <th>Order ID</th>
                <th>Customer</th>
                <th>Status</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              {tableLoading ? (
                <TableLoadingState 
                  context="Loading orders"
                  message="Fetching order data..."
                  colSpan={4}
                />
              ) : (
                orders.map(order => (
                  <tr key={order.id}>
                    <td>#{order.id}</td>
                    <td>{order.customer}</td>
                    <td>
                      <span className={`badge ${order.status === 'Completed' ? 'bg-success' : 'bg-warning'}`}>
                        {order.status}
                      </span>
                    </td>
                    <td>${order.total}</td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </Card.Body>
      </Card>

      {/* 4. INLINE LOADING - Use in buttons and inline elements */}
      <Card className="mb-4">
        <Card.Header>Button Loading States</Card.Header>
        <Card.Body>
          <div className="d-flex gap-3 align-items-center">
            <Button 
              variant="primary" 
              onClick={handleButtonAction}
              disabled={buttonLoading}
            >
              {buttonLoading ? (
                <InlineLoadingState 
                  message="Processing..." 
                  size="sm" 
                  variant="light"
                />
              ) : (
                <>
                  <i className="bi bi-check-circle me-2"></i>
                  Process Order
                </>
              )}
            </Button>

            <Button variant="outline-primary" onClick={handleOpenModal}>
              Open Modal with Loading
            </Button>
          </div>
        </Card.Body>
      </Card>

      {/* 5. CUSTOM LOADING - Use LoadingState directly with custom props */}
      <Card className="mb-4">
        <Card.Header>Custom Loading Example</Card.Header>
        <Card.Body>
          <LoadingState 
            context="Syncing with server"
            message="This may take a few moments..."
            variant="success"
            size="md"
            className="border rounded p-3"
            style={{ backgroundColor: '#f8f9fa' }}
          />
        </Card.Body>
      </Card>

      {/* 6. MODAL LOADING - Use within modals */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Order Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {modalLoading ? (
            <ModalLoadingState 
              context="Loading order details"
              message="Fetching comprehensive order information..."
            />
          ) : (
            <div>
              <h5>Order #1234</h5>
              <p>✅ Order details loaded successfully!</p>
              <ul>
                <li>Customer: John Doe</li>
                <li>Status: Pending</li>
                <li>Total: $25.99</li>
                <li>Items: 3</li>
              </ul>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Instructions for implementation */}
      <Card className="mt-4">
        <Card.Header className="bg-info text-white">
          <i className="bi bi-info-circle me-2"></i>
          Implementation Guide
        </Card.Header>
        <Card.Body>
          <h6>How to use these loading components in your existing pages:</h6>
          <ol className="mb-0">
            <li><strong>Import the components:</strong><br/>
              <code>import LoadingState, {'{ PageLoadingState, CardLoadingState }'} from './LoadingState';</code></li>
            <li><strong>Replace existing loading implementations</strong> with the appropriate component</li>
            <li><strong>Use context prop</strong> to describe what's being loaded</li>
            <li><strong>Use message prop</strong> for additional user guidance</li>
            <li><strong>All loading states are automatically centered</strong> and responsive</li>
          </ol>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default ExampleLoadingImplementation;
