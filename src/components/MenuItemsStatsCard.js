import React, { useState, useEffect } from 'react';
import { Card, Spinner, Row, Col, Modal, Button, Form, InputGroup } from 'react-bootstrap';
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
  
  // State for search filter
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filtered items based on search query
  const filteredItems = menuItemsStats.topItems.filter(item => 
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
      
      // First, fetch all menu items from the menu
      const menuResponse = await fetch(`${API_BASE_URL}/menu/items/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!menuResponse.ok) {
        throw new Error('Failed to fetch menu items');
      }

      const allMenuItems = await menuResponse.json();
      const menuItemsArray = Array.isArray(allMenuItems) ? allMenuItems : (allMenuItems.results || []);
      
      // Filter out extras - we only want regular menu items
      const regularMenuItems = menuItemsArray.filter(item => !item.is_extra);
      
      // Initialize all menu items with 0 count
      const itemsCount = {};
      regularMenuItems.forEach(item => {
        itemsCount[item.name] = 0;
      });
      
      // Now fetch orders for the specific date
      const endpoint = isToday 
        ? `${API_BASE_URL}/orders/today/`
        : `${API_BASE_URL}/orders/?date=${date}`;

      const ordersResponse = await fetch(endpoint, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      let totalItemsServed = 0;
      
      if (ordersResponse.ok) {
        const orders = await ordersResponse.json();
        const ordersArray = Array.isArray(orders) ? orders : (orders.results || []);
        
        // Calculate menu items statistics from orders
        ordersArray.forEach(order => {
          if (order.items && Array.isArray(order.items)) {
            order.items.forEach(item => {
              const itemName = item.product_name || item.name || item.menu_item_name || item.title || 'Unknown Item';
              const quantity = parseInt(item.quantity) || 0;
              
              // Only count if the item exists in our menu
              if (itemsCount.hasOwnProperty(itemName)) {
                itemsCount[itemName] += quantity;
                totalItemsServed += quantity;
              }
            });
          }
        });
      }

      // Get all items sorted by count (descending), including items with 0 count
      const topItems = Object.entries(itemsCount)
        .sort(([,a], [,b]) => b - a)
        .map(([name, count]) => ({ name, count }));

      setMenuItemsStats({
        totalItemsServed,
        uniqueItemsServed: regularMenuItems.length, // Total number of menu items, not just served ones
        topItems
      });
    } catch (error) {
      console.error('Failed to fetch menu items stats:', error);
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
                      Most Popular Item
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

          {/* Search Filter */}
          {menuItemsStats.topItems.length > 0 && (
            <>
              <h6 className="text-muted mb-3">
                <i className="bi bi-search me-2"></i>
                Search Menu Items
              </h6>
              <InputGroup className="mb-4">
                <InputGroup.Text>
                  <i className="bi bi-search"></i>
                </InputGroup.Text>
                <Form.Control
                  type="text"
                  placeholder="Search for menu items..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="ada-shadow-sm"
                />
                {searchQuery && (
                  <Button 
                    variant="outline-secondary" 
                    onClick={() => setSearchQuery('')}
                    title="Clear search"
                  >
                    <i className="bi bi-x"></i>
                  </Button>
                )}
              </InputGroup>
            </>
          )}
          
          {/* Full Top Items List */}
          {menuItemsStats.topItems.length > 0 && (
            <>
              <h6 className="text-muted mb-3">
                <i className="bi bi-trophy me-2"></i>
                {searchQuery ? `Search Results (${filteredItems.length})` : 'All Menu Items'}
              </h6>
              
              {filteredItems.length > 0 ? (
                <div className="top-items-list">
                  {filteredItems.map((item, index) => (
                    <div key={index} className="d-flex justify-content-between align-items-center mb-3 p-3 bg-light rounded">
                      <div className="d-flex align-items-center">
                        <span className="badge bg-secondary me-3" style={{ minWidth: '30px', height: '30px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          #{searchQuery ? menuItemsStats.topItems.findIndex(originalItem => originalItem.name === item.name) + 1 : index + 1}
                        </span>
                        <div>
                          <h6 className="mb-1">{item.name}</h6>
                          <small className="text-muted">Menu Item</small>
                        </div>
                      </div>
                      <div className="text-end">
                        <span className={`badge ${item.count > 0 ? 'bg-primary' : 'bg-secondary'} fs-6 p-2`}>{item.count}</span>
                        <br />
                        <small className="text-muted">{item.count === 1 ? 'Order' : 'Orders'}</small>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <i className="bi bi-search display-6 text-muted mb-2"></i>
                  <h6 className="text-muted">No items found</h6>
                  <p className="text-muted mb-0">No menu items match your search for "{searchQuery}"</p>
                </div>
              )}
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
          <div className="d-flex justify-content-between align-items-center w-100">
            <small className="text-muted">
              <i className="bi bi-info-circle me-1"></i>
              {searchQuery ? `Showing ${filteredItems.length} of ${menuItemsStats.topItems.length} items` : `Showing ${menuItemsStats.topItems.length} items`}
            </small>
            <Button variant="secondary" onClick={() => {
              setShowMenuItemsModal(false);
              setSearchQuery(''); // Clear search when closing modal
            }}>
              <i className="bi bi-x-circle me-2"></i>
              Close
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
    </>
  );
};

export default MenuItemsStatsCard;
