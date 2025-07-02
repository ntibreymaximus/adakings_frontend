import React from 'react';
import { Container, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import CreateOrderForm from '../pages/CreateOrderForm'; // Import the form

const CreateOrderPage = () => {
  return (
    <Container className="mt-4">
      <CreateOrderForm />
      <div className="mt-4 d-flex justify-content-center">
        <Button
          as={Link}
          to="/dashboard"
          variant="secondary"
          className="d-flex align-items-center ada-shadow-sm"
        >
          <i className="bi bi-arrow-left me-2"></i>
          Return to Dashboard
        </Button>
      </div>
    </Container>
  );
};

export default CreateOrderPage;
