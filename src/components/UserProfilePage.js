import React from 'react';
import { Button, Container, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';

const UserProfilePage = ({ userData }) => {
    const formatKey = (key) => {
      return key
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
    };

  return (
    <Container className="mt-4">
      <Button as={Link} to="/dashboard" variant="secondary" className="mb-3 d-flex align-items-center" style={{ width: 'fit-content' }}>
        <i className="bi bi-arrow-left me-2"></i>
        Return to Dashboard
      </Button>
      
      <Card>
        <Card.Header>Profile</Card.Header>
        <Card.Body>
          {userData && Object.entries(userData).map(([key, value]) => (
            <div key={key} className="mb-2">
              <strong>{formatKey(key)}:</strong> {typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)}
            </div>
          ))}
        </Card.Body>
      </Card>
    </Container>
  );
};

export default UserProfilePage;
