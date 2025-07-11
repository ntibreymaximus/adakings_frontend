import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Form, InputGroup, Spinner, Alert, Button, Card, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { API_BASE_URL } from '../utils/api';
import { tokenFetch } from '../utils/tokenFetch';
import { menuCacheService } from '../services/menuCacheService';
import { useAuth } from '../contexts/AuthContext';

const ViewMenuPage = () => {
    const navigate = useNavigate();
    const { userData } = useAuth();
    const [menuItems, setMenuItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

    // Function to fetch menu items (can be reused for refresh) - Now uses cache service
    const fetchMenuItems = async (forceRefresh = false) => {
        try {
            setError(''); // Clear any previous errors
            
            if (forceRefresh) {
                // Clear cache for fresh data
                menuCacheService.clearCache();
            }
            
            // Get filters based on current UI state
            const filters = {};
            if (categoryFilter !== 'all') {
                filters.item_type = categoryFilter;
            }
            if (searchTerm.trim()) {
                filters.search = searchTerm.trim();
            }
            
            // Use cache service for instant loading
            const items = await menuCacheService.getMenuItems(filters);
            setMenuItems(items);
            
            console.log(`✅ Loaded ${items.length} menu items ${forceRefresh ? '(forced refresh)' : '(cache or fresh)'}`);
            
        } catch (err) {
            console.error('❌ Error loading menu items:', err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth < 768);
        };
        
        window.addEventListener('resize', handleResize);
        fetchMenuItems();
        
        return () => window.removeEventListener('resize', handleResize);
    }, []);


    // Filter menu items based on search and item type
    const safeMenuItems = Array.isArray(menuItems) ? menuItems : [];
    const filteredMenuItems = safeMenuItems.filter(item => {
        // Additional safety check for item object
        if (!item || typeof item !== 'object') return false;
        
        const itemName = item.name || '';
        const itemDescription = item.description || '';
        const itemType = item.item_type || 'regular';
        
        const matchesSearch = itemName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                             itemDescription.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = categoryFilter === 'all' || itemType === categoryFilter;
        return matchesSearch && matchesType;
    });

    if (loading) {
        return (
            <Container className="mt-4">
                <div className="mb-3">
                    <Button
                        variant="outline-primary"
                        size="sm"
                        onClick={() => navigate('/dashboard')}
                        className="d-flex align-items-center ada-shadow-sm"
                        style={{ minHeight: '44px' }}
                    >
                        <i className="bi bi-arrow-left me-2"></i>
                        <span>Return to Dashboard</span>
                    </Button>
                </div>
                <div className="text-center">
                    <div className="spinner-border" role="status">
                        <span className="visually-hidden">Loading...</span>
                    </div>
                    <p className="mt-2">Loading menu items...</p>
                </div>
            </Container>
        );
    }

    if (error) {
        return (
            <Container className="mt-4">
                <Alert variant="danger" className="p-4">
                    <h5 className="alert-heading">Error Loading Menu</h5>
                    <p>{error}</p>
                    <hr />
                    <div className="d-grid gap-2 d-md-flex justify-content-md-center">
                        <Button onClick={() => navigate('/dashboard')}>
                          <i className="bi bi-house me-2"></i>
                          Return to Dashboard
                        </Button>
                    </div>
                </Alert>
            </Container>
        );
    }

  // Function to toggle menu item availability
  const toggleAvailability = async (itemId, currentStatus) => {
    try {
      const response = await tokenFetch(`${API_BASE_URL}/menu/items/${itemId}/toggle-availability/`, {
        method: 'PUT',
        body: JSON.stringify({
          modified_by: userData?.id || userData?.user_id,
          modified_by_username: userData?.username,
          modified_by_role: userData?.role || userData?.user_role
        }),
      });

      if (!response.ok) {
        // Try to get the error details from the response
        let errorMessage = 'Failed to toggle availability';
        try {
          const errorData = await response.json();
          if (errorData.error) {
            errorMessage = errorData.error;
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.detail) {
            errorMessage = errorData.detail;
          }
        } catch (parseError) {
          // If response is not JSON, use status text
          errorMessage = response.statusText || 'Failed to toggle availability';
        }
        throw new Error(errorMessage);
      }

      const updatedItem = await response.json();
      
      // Update the menu items state with the new availability status
      setMenuItems(prev => prev.map(item => 
        item.id === itemId ? { ...item, is_available: updatedItem.is_available } : item
      ));
      
      // Update the cache service with the new item data
      menuCacheService.updateMenuItemInCache(updatedItem);

      toast.success(`${updatedItem.name} is now ${updatedItem.is_available ? 'available' : 'unavailable'}`);
    } catch (err) {
      console.error('Error toggling availability:', err);
      toast.error(err.message || 'Failed to update item availability. Please try again.');
    }
  };

  return (
      <Container className="my-3 my-md-4 px-3 px-md-4">
        {/* Return to Dashboard Button */}
        <div className="mb-3">
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => navigate('/dashboard')}
            className="d-flex align-items-center ada-shadow-sm"
            style={{ minHeight: '44px' }}
          >
            <i className="bi bi-arrow-left me-2"></i>
            <span>Return to Dashboard</span>
          </Button>
        </div>
      
      <Card className="border-0">
        <Card.Header className="bg-primary text-white">
          <div className="d-flex justify-content-between align-items-center flex-wrap">
            <h5 className="mb-0">
              <i className="bi bi-menu-button-wide me-2"></i>
              Menu Items
            </h5>
            <div className="d-flex align-items-center mt-2 mt-sm-0">
              <span className="small me-2">Total: {(menuItems || []).length} items</span>
            </div>
          </div>
        </Card.Header>
        
        <Card.Body className="p-3">
          {/* Search and Filter Controls */}
          <Row className="mb-4">
            <Col xs={12} md={8}>
              <InputGroup>
                <InputGroup.Text>
                  <i className="bi bi-search"></i>
                </InputGroup.Text>
                <Form.Control
                  placeholder="Search menu items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <Button 
                    variant="secondary"
                    onClick={() => setSearchTerm('')}
                  >
                    <i className="bi bi-x-lg"></i>
                  </Button>
                )}
              </InputGroup>
            </Col>
            <Col xs={12} md={4} className="mt-2 mt-md-0">
              <Form.Select 
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Types</option>
                <option value="regular">Regular Items</option>
                <option value="extra">Extra Items</option>
              </Form.Select>
            </Col>
          </Row>

          {/* Menu Items Grid */}
          {filteredMenuItems.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-inbox" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
              <h4 className="mt-3 text-muted">No Menu Items Found</h4>
              <p className="text-muted">
                {searchTerm || categoryFilter !== 'all' 
                  ? 'Try adjusting your search or filter settings.' 
                  : 'No menu items available.'
                }
              </p>
              {(searchTerm || categoryFilter !== 'all') && (
                <Button 
                  variant="primary" 
                  onClick={() => { setSearchTerm(''); setCategoryFilter('all'); }}
                >
                  <i className="bi bi-arrow-clockwise me-2"></i>
                  Clear Filters
                </Button>
              )}
            </div>
          ) : (
            <Row className="g-3">
              {filteredMenuItems.map((item) => (
                <Col key={item.id} xs={12} md={6} lg={4}>
                  <Card className="h-100 ada-shadow-sm border-0" style={{ transition: 'all 0.2s ease' }}>
                    <Card.Body className="d-flex flex-column">
                      {/* Header with name and type */}
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <div className="flex-grow-1">
                          <h5 className="card-title mb-2 fw-bold text-dark">{item.name}</h5>
                          <div className="d-flex gap-2 align-items-center">
                            <Badge 
                              bg={item.item_type === 'regular' ? 'primary' : 'info'}
                              className="text-capitalize"
                              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                            >
                              {item.item_type || 'Regular'}
                            </Badge>
                            <Badge 
                              bg={item.is_available ? 'success' : 'danger'}
                              className="d-flex align-items-center"
                              style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                            >
                              <i className={`bi ${item.is_available ? 'bi-check-circle' : 'bi-x-circle'} me-1`}></i>
                              {item.is_available ? 'Available' : 'Unavailable'}
                            </Badge>
                          </div>
                        </div>
                        <div className="text-end">
                          <div className="h5 mb-0 text-success fw-bold">₵{parseFloat(item.price || 0).toFixed(2)}</div>
                        </div>
                      </div>
                      
                      {/* Description */}
                      {item.description && (
                        <p className="text-muted small mb-3 flex-grow-1" style={{ lineHeight: '1.4' }}>
                          {item.description.length > 80 
                            ? `${item.description.substring(0, 80)}...` 
                            : item.description
                          }
                        </p>
                      )}
                      
                      {/* Actions */}
                      <div className="mt-auto">
                        <div className="d-flex justify-content-end">
                          <Button
                            variant={item.is_available ? 'outline-warning' : 'outline-success'}
                            size="sm"
                            onClick={() => toggleAvailability(item.id, item.is_available)}
                            className="d-flex align-items-center"
                            style={{ minWidth: '90px' }}
                          >
                            <i className={`bi ${item.is_available ? 'bi-eye-slash' : 'bi-eye'} me-1`}></i>
                            {item.is_available ? 'Disable' : 'Enable'}
                          </Button>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Card.Body>
      </Card>
      </Container>
  );
};

export default ViewMenuPage;

