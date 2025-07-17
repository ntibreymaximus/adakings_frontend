import React, { useState, useEffect } from 'react';
import { Card, Spinner, Row, Col, Modal, Button } from 'react-bootstrap';
import { API_BASE_URL } from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const MenuItemsStatsCard = ({ selectedDate, className }) => {
  const { userData, checkTokenValidity } = useAuth();
  const [loading, setLoading] = useState(true);
  const [menuItemsStats, setMenuItemsStats] = useState({
    totalItemsServed: 0,
    uniqueItemsServed: 0,
    topItems: []
  });

  useEffect(() => {
    if (userData && (userData.role === 'admin' || userData.role === 'superadmin')) {
      fetchMenuItemsStats();
    }
  }, [userData, selectedDate]);

  // State for controlling modal visibility
  const [showMenuItemsModal, setShowMenuItemsModal] = useState(false);

  const fetchMenuItemsStats = async () => {
    try {
      const isValid = await checkTokenValidity();
      if (!isValid) return;

      const token = localStorage.getItem('token');
      const today = new Date().toISOString().split('T')[0];
      const dateParam = selectedDate || today;
      
      const response = await fetch(`${API_BASE_URL}/stats/menu-items-served/?date=${dateParam}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        setMenuItemsStats(data);
      } else {
        // If the endpoint doesn't exist, calculate from orders
        await fetchMenuItemsFromOrders(dateParam);
      }
    } catch (error) {
      console.error('Failed to fetch menu items stats:', error);
      // Fallback to calculating from orders
      await fetchMenuItemsFromOrders(selectedDate || new Date().toISOString().split('T')[0]);
    } finally {
      setLoading(false);
    }
  };

  const fetchMenuItemsFromOrders = async (date) => {
    try {
      const token = localStorage.getItem('token');
      const today = new Date().toISOString().split('T')[0];
      const isToday = date === today;
      
      const endpoint = isToday 
        ? `${API_BASE_URL}/orders/today/`
        : `${API_BASE_URL}/orders/?date=${date}`;

      const response = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const orders = await response.json();
        const ordersArray = Array.isArray(orders) ? orders : (orders.results || []);
        
        // Calculate menu items statistics from orders
        const itemsCount = {};
        let totalItemsServed = 0;
        
        ordersArray.forEach(order => {
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
              const itemName = item.product_name || item.name || item.menu_item_name || item.title || 'Unknown Item';
              const quantity = parseInt(item.quantity) || 0;
              
              if (itemsCount[itemName]) {
                itemsCount[itemName] += quantity;
              } else {
                itemsCount[itemName] = quantity;
              }
              
              totalItemsServed += quantity;
            });
          }
        });

        // Get top 5 items
        const topItems = Object.entries(itemsCount)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([name, count]) => ({ name, count }));

        setMenuItemsStats({
          totalItemsServed,
          uniqueItemsServed: Object.keys(itemsCount).length,
          topItems
        });
      }
    } catch (error) {
      console.error('Failed to fetch orders for menu items stats:', error);
      setMenuItemsStats({
        totalItemsServed: 0,
        uniqueItemsServed: 0,
        topItems: []
      });
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (dateString === today.toISOString().split('T')[0]) {
      return 'Today';
    } else if (dateString === yesterday.toISOString().split('T')[0]) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString();
    }
  };

  if (!userData || (userData.role !== 'admin' && userData.role !== 'superadmin')) {
    return null;
  }

  return (
    <>
      <Card 
        className={`${className} cursor-pointer mb-3`} 
        onClick={() => setShowMenuItemsModal(true)}
        style={{ cursor: 'pointer' }}
      >
        <Card.Body>
          {loading ? (
            <div className="text-center py-3">
              <Spinner animation="border" size="sm" variant="primary" />
              <p className="mt-2 mb-0 text-muted">Loading menu stats...</p>
            </div>
          ) : (
            <>
              {/* Preview Stats */}
              <Row className="mb-3">
                <Col xs={6}>
                  <div className="text-center">
                    <h3 className="ada-text-primary mb-1">{menuItemsStats.totalItemsServed}</h3>
                    <h6 className="text-muted small mb-0">Total Items Served</h6>
                  </div>
                </Col>
                <Col xs={6}>
                  <div className="text-center">
                    <h3 className="ada-text-primary mb-1">{menuItemsStats.uniqueItemsServed}</h3>
                    <h6 className="text-muted small mb-0">Unique Items</h6>
                  </div>
                </Col>
              </Row>

              {/* Top Regular Item Preview */}
              {menuItemsStats.topItems.length > 0 && (
                <>
                  <hr className="my-3" />
                  <h6 className="text-muted mb-2">
                    <i className="bi bi-trophy me-2"></i>
                    Top Regular Item
                  </h6>
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="fw-semibold">{menuItemsStats.topItems[0].name}</span>
                    <span className="badge bg-primary">{menuItemsStats.topItems[0].count}</span>
                  </div>
                </>
              )}

              {menuItemsStats.totalItemsServed === 0 && (
                <div className="text-center py-3">
                  <i className="bi bi-inbox display-6 text-muted mb-2"></i>
                  <p className="text-muted mb-0">No menu items served {formatDate(selectedDate || new Date().toISOString().split('T')[0]).toLowerCase()}</p>
                </div>
              )}
            </>
          )}
        </Card.Body>
      </Card>

      {/* Modal for showing full information */}
      <Modal
        show={showMenuItemsModal}
        onHide={() => setShowMenuItemsModal(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>
            <i className="bi bi-box-seam me-2"></i>
            Menu Items Details - {formatDate(selectedDate || new Date().toISOString().split('T')[0])}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Summary Stats */}
          <Row className="mb-4">
            <Col xs={12} md={6} className="mb-3">
              <div className="text-center p-3 bg-light rounded">
                <h2 className="ada-text-primary mb-1">{menuItemsStats.totalItemsServed}</h2>
                <h6 className="text-muted mb-0">Total Items Served</h6>
              </div>
            </Col>
            <Col xs={12} md={6} className="mb-3">
              <div className="text-center p-3 bg-light rounded">
                <h2 className="ada-text-primary mb-1">{menuItemsStats.uniqueItemsServed}</h2>
                <h6 className="text-muted mb-0">Unique Items</h6>
              </div>
            </Col>
          </Row>

          {/* Full Top Items List */}
          {menuItemsStats.topItems.length > 0 && (
            <>
              <h6 className="text-muted mb-3">
                <i className="bi bi-trophy me-2"></i>
                Top Items Ranking
              </h6>
              <div className="top-items-list">
                {menuItemsStats.topItems.map((item, index) => (
                  <div key={index} className="d-flex justify-content-between align-items-center mb-3 p-3 bg-light rounded">
                    <div className="d-flex align-items-center">
                      <span className="badge bg-secondary me-3" style={{ minWidth: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        #{index + 1}
                      </span>
                      <div>
                        <h6 className="mb-1">{item.name}</h6>
                        <small className="text-muted">Menu Item</small>
                      </div>
                    </div>
                    <div className="text-end">
                      <span className="badge bg-primary fs-6 p-2">{item.count}</span>
                      <br />
                      <small className="text-muted">Orders</small>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {menuItemsStats.totalItemsServed === 0 && (
            <div className="text-center py-5">
              <i className="bi bi-inbox display-1 text-muted mb-3"></i>
              <h5 className="text-muted">No menu items served</h5>
              <p className="text-muted">No orders found for {formatDate(selectedDate || new Date().toISOString().split('T')[0]).toLowerCase()}</p>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowMenuItemsModal(false)}>
            <i className="bi bi-x-circle me-2"></i>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default MenuItemsStatsCard;
