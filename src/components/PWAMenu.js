import React, { useState, useEffect } from 'react';
import ReactModal from 'react-modal';
import { toast } from 'react-toastify';
import '../styles/mobile-native.css';

// Set the app element for ReactModal
ReactModal.setAppElement('#root');

const PWAMenu = () => {
  const [loading, setLoading] = useState(true);
  const [menuItems, setMenuItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [categories, setCategories] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchMenuItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [menuItems, searchTerm, selectedCategory]);

  const fetchMenuItems = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Authentication token not found');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:8000/api/menu/items/', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch menu items');
      }

      const data = await response.json();
      const items = data.results || data.items || data.data || [];

      setMenuItems(Array.isArray(items) ? items : []);
      
      // Extract unique categories
      const uniqueCategories = [...new Set(items.map(item => item.category).filter(Boolean))];
      setCategories(['all', ...uniqueCategories]);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = Array.isArray(menuItems) ? menuItems : [];

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Filter by category
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    setFilteredItems(filtered);
  };

  const formatPrice = (price) => {
    return `GH₵ ${parseFloat(price).toFixed(2)}`;
  };

  const getAvailabilityStatus = (isAvailable) => {
    return isAvailable ? 'Available' : 'Out of Stock';
  };

  const getAvailabilityColor = (isAvailable) => {
    return isAvailable ? '#4caf50' : '#f44336';
  };

  const showItemDetailsModal = (item) => {
    setSelectedItem(item);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedItem(null);
  };

  const toggleAvailability = async (itemId) => {
    const token = localStorage.getItem('token');
    if (!token) {
      toast.error('Authentication token not found');
      return;
    }

    try {
      // Find the current item to get its current availability status
      const currentItem = menuItems.find(item => item.id === itemId);
      if (!currentItem) {
        toast.error('Menu item not found');
        return;
      }

      const newAvailabilityStatus = !currentItem.is_available;

      const response = await fetch(`http://localhost:8000/api/menu/items/${itemId}/`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_available: newAvailabilityStatus
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update item availability');
      }

      // Update the local state
      setMenuItems(prevItems => 
        prevItems.map(item => 
          item.id === itemId 
            ? { ...item, is_available: newAvailabilityStatus }
            : item
        )
      );

      // Update the selected item if it's the one being updated
      if (selectedItem && selectedItem.id === itemId) {
        setSelectedItem(prev => ({ ...prev, is_available: newAvailabilityStatus }));
      }

      toast.success(`Item ${newAvailabilityStatus ? 'made available' : 'marked as unavailable'}`);
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return (
      <div className="pwa-content">
        <div className="pwa-loading">
          <div className="pwa-spinner"></div>
          <div className="pwa-loading-text">Loading menu...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="pwa-content">

      {/* Menu Stats */}
      <div className="pwa-card">
        <div className="pwa-card-title" style={{ marginBottom: '16px', fontSize: '1.1rem' }}>Menu Overview</div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#2196F3' }}>
              {filteredItems.length}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>
              {searchTerm || selectedCategory !== 'all' ? 'Filtered' : 'Total'} Items
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', fontWeight: '700', color: '#4CAF50' }}>
              {filteredItems.filter(item => item.is_available).length}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#666' }}>Available</div>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      {filteredItems.length === 0 ? (
        <div className="pwa-empty">
          <div className="pwa-empty-icon">
            <i className="bi bi-cup-straw"></i>
          </div>
          <div className="pwa-empty-title">No Menu Items Found</div>
          <div className="pwa-empty-subtitle">
            {searchTerm || selectedCategory !== 'all' 
              ? 'Try adjusting your search or filter criteria'
              : 'No menu items available at the moment'
            }
          </div>
        </div>
      ) : (
        <div className="pwa-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
            <div className="pwa-card-title" style={{ margin: 0, fontSize: '1.1rem' }}>
              Menu Items ({filteredItems.length})
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              {/* Category Buttons */}
              {categories.map(category => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  style={{
                    padding: '4px 8px',
                    fontSize: '0.75rem',
                    border: 'none',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    transition: 'all 0.2s ease',
                    backgroundColor: selectedCategory === category ? '#2196F3' : '#f1f3f4',
                    color: selectedCategory === category ? 'white' : '#666'
                  }}
                >
                  {category === 'all' ? 'All' : category}
                </button>
              ))}
              
              {/* Search Button */}
              <button
                onClick={() => {
                  const term = prompt('Search menu items:', searchTerm);
                  if (term !== null) setSearchTerm(term);
                }}
                style={{
                  padding: '6px 10px',
                  fontSize: '0.8rem',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  backgroundColor: searchTerm ? '#4CAF50' : '#f1f3f4',
                  color: searchTerm ? 'white' : '#666',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <i className="bi bi-search"></i>
                {searchTerm ? 'Clear' : 'Search'}
              </button>
            </div>
          </div>
          
          <div className="pwa-list">
            {filteredItems.map((item) => (
              <div 
                key={item.id} 
                className="pwa-list-item"
                onClick={() => showItemDetailsModal(item)}
                style={{ cursor: 'pointer' }}
              >
                <div 
                  className="pwa-list-icon" 
                  style={{ 
                    background: getAvailabilityColor(item.is_available),
                    color: 'white'
                  }}
                >
                  <i className="bi bi-cup-hot"></i>
                </div>
                <div className="pwa-list-content">
                  <div className="pwa-list-title">{item.name}</div>
                  {item.description && (
                    <div className="pwa-list-subtitle">
                      {item.description}
                    </div>
                  )}
                  
                  {/* Item Details */}
                  <div style={{ 
                    display: 'flex', 
                    justifyContent: 'space-between', 
                    alignItems: 'center',
                    marginTop: '8px'
                  }}>
                    <div className="pwa-status" style={{
                      background: `${getAvailabilityColor(item.is_available)}20`,
                      color: getAvailabilityColor(item.is_available)
                    }}>
                      {getAvailabilityStatus(item.is_available)}
                    </div>
                    <div style={{ 
                      fontWeight: '600', 
                      color: '#1a1a1a',
                      fontSize: '1rem'
                    }}>
                      {formatPrice(item.price)}
                    </div>
                  </div>

{/* Item Type and Category Section */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '8px'
                  }}>

                    {/* Item Type Indicator */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <span style={{
                        fontSize: '0.7rem',
                        padding: '2px 6px',
                        borderRadius: '8px',
                        backgroundColor: item.type?.toLowerCase() === 'extra' ? '#fff3cd' : '#d1f2eb',
                        color: item.type?.toLowerCase() === 'extra' ? '#856404' : '#155724',
                        border: `1px solid ${item.type?.toLowerCase() === 'extra' ? '#ffeaa7' : '#c3e6cb'}`,
                        fontWeight: '500'
                      }}>
                        {item.type ? item.type.toUpperCase() : 'REGULAR'}
                      </span>
                    </div>
                  </div>

                  {/* Category Badge */}
                  {item.category && (
                    <div style={{ 
                      marginTop: '8px',
                      fontSize: '0.75rem',
                      color: '#999',
                      background: '#f1f3f4',
                      padding: '2px 8px',
                      borderRadius: '12px',
                      display: 'inline-block'
                    }}>
                      {item.category}
                    </div>
                  )}
                </div>
                <div className="pwa-list-action">
                  <i className="bi bi-info-circle"></i>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Item Details Modal */}
      <ReactModal
        isOpen={isModalOpen}
        onRequestClose={closeModal}
        style={{
          overlay: {
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 1000
          },
          content: {
            top: '50%',
            left: '50%',
            right: 'auto',
            bottom: 'auto',
            marginRight: '-50%',
            transform: 'translate(-50%, -50%)',
            maxWidth: '90vw',
            maxHeight: '90vh',
            width: '400px',
            padding: '0',
            border: 'none',
            borderRadius: '12px',
            overflow: 'hidden'
          }
        }}
      >
        {selectedItem && (
          <div style={{ padding: '20px' }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
              paddingBottom: '15px',
              borderBottom: '1px solid #eee'
            }}>
              <h2 style={{
                margin: '0',
                fontSize: '1.25rem',
                fontWeight: '600',
                color: '#333'
              }}>
                {selectedItem.name}
              </h2>
              <button
                onClick={closeModal}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  cursor: 'pointer',
                  color: '#999',
                  padding: '0',
                  width: '30px',
                  height: '30px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            {/* Item Details */}
            <div style={{ marginBottom: '20px' }}>
              {selectedItem.description && (
                <div style={{ marginBottom: '15px' }}>
                  <label style={{
                    display: 'block',
                    fontWeight: '600',
                    marginBottom: '5px',
                    color: '#555'
                  }}>
                    Description:
                  </label>
                  <p style={{
                    margin: '0',
                    color: '#666',
                    lineHeight: '1.5'
                  }}>
                    {selectedItem.description}
                  </p>
                </div>
              )}

              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '15px',
                marginBottom: '15px'
              }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontWeight: '600',
                    marginBottom: '5px',
                    color: '#555'
                  }}>
                    Price:
                  </label>
                  <div style={{
                    fontSize: '1.25rem',
                    fontWeight: '700',
                    color: '#2196F3'
                  }}>
                    {formatPrice(selectedItem.price)}
                  </div>
                </div>

                <div>
                  <label style={{
                    display: 'block',
                    fontWeight: '600',
                    marginBottom: '5px',
                    color: '#555'
                  }}>
                    Status:
                  </label>
                  <div style={{
                    padding: '4px 8px',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    background: `${getAvailabilityColor(selectedItem.is_available)}20`,
                    color: getAvailabilityColor(selectedItem.is_available),
                    display: 'inline-block'
                  }}>
                    {getAvailabilityStatus(selectedItem.is_available)}
                  </div>
                </div>
              </div>

              {selectedItem.category && (
                <div style={{ marginBottom: '15px' }}>
                  <label style={{
                    display: 'block',
                    fontWeight: '600',
                    marginBottom: '5px',
                    color: '#555'
                  }}>
                    Category:
                  </label>
                  <div style={{
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '0.85rem',
                    background: '#f1f3f4',
                    color: '#666',
                    display: 'inline-block'
                  }}>
                    {selectedItem.category}
                  </div>
                </div>
              )}

              <div style={{ marginBottom: '15px' }}>
                <label style={{
                  display: 'block',
                  fontWeight: '600',
                  marginBottom: '5px',
                  color: '#555'
                }}>
                  Type:
                </label>
                <div style={{
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '0.85rem',
                  fontWeight: '600',
                  backgroundColor: selectedItem.type?.toLowerCase() === 'extra' ? '#fff3cd' : '#d1f2eb',
                  color: selectedItem.type?.toLowerCase() === 'extra' ? '#856404' : '#155724',
                  border: `1px solid ${selectedItem.type?.toLowerCase() === 'extra' ? '#ffeaa7' : '#c3e6cb'}`,
                  display: 'inline-block'
                }}>
                  {selectedItem.type ? selectedItem.type.toUpperCase() : 'REGULAR'}
                </div>
              </div>

              {selectedItem.id && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{
                    display: 'block',
                    fontWeight: '600',
                    marginBottom: '5px',
                    color: '#555'
                  }}>
                    Item ID:
                  </label>
                  <div style={{
                    fontSize: '0.85rem',
                    color: '#999',
                    fontFamily: 'monospace'
                  }}>
                    #{selectedItem.id}
                  </div>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              gap: '10px',
              paddingTop: '15px',
              borderTop: '1px solid #eee'
            }}>
              <button
                onClick={() => toggleAvailability(selectedItem.id)}
                style={{
                  flex: '1',
                  padding: '12px',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  backgroundColor: selectedItem.is_available ? '#f44336' : '#4caf50',
                  color: 'white'
                }}
              >
                {selectedItem.is_available ? 'Mark Unavailable' : 'Mark Available'}
              </button>
              <button
                onClick={closeModal}
                style={{
                  flex: '1',
                  padding: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  backgroundColor: 'white',
                  color: '#666'
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </ReactModal>

      {/* Category Summary */}
      {categories.length > 2 && (
        <div className="pwa-card">
          <div className="pwa-card-title" style={{ marginBottom: '16px' }}>
            Categories
          </div>
          
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', 
            gap: '8px' 
          }}>
            {categories.filter(cat => cat !== 'all').map(category => {
              const categoryCount = (menuItems || []).filter(item => item.category === category).length;
              return (
                <button
                  key={category}
                  className={`pwa-btn ${selectedCategory === category ? 'pwa-btn-primary' : 'pwa-btn-secondary'}`}
                  onClick={() => setSelectedCategory(category)}
                  style={{ 
                    padding: '8px 12px', 
                    fontSize: '0.8rem',
                    textAlign: 'center'
                  }}
                >
                  <div>{category}</div>
                  <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>({categoryCount})</div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default PWAMenu;
