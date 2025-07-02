import React from 'react';
import { Card } from 'react-bootstrap';
import { AdaCard, AdaCardHeader } from '../components/theme/ThemeComponents';

// Test component to verify all card header text is visible
const CardHeaderVisibilityTest = () => {
  return (
    <div className="container mt-4">
      <h2>Card Header Text Visibility Test</h2>
      
      {/* Test 1: Standard AdaCardHeader */}
      <div className="row mb-4">
        <div className="col-md-6">
          <AdaCard>
            <AdaCardHeader>
              <h5 className="mb-0">
                <i className="bi bi-plus-circle me-2"></i>
                Standard AdaCardHeader Test
              </h5>
            </AdaCardHeader>
            <Card.Body>
              <p>This tests the standard AdaCardHeader component with white text on primary background.</p>
            </Card.Body>
          </AdaCard>
        </div>
      </div>

      {/* Test 2: Card with ada-bg-primary class */}
      <div className="row mb-4">
        <div className="col-md-6">
          <Card className="ada-shadow-md">
            <Card.Header className="ada-bg-primary text-white py-3">
              <h5 className="mb-0">
                <i className="bi bi-receipt me-2"></i>
                Primary Background Header
              </h5>
            </Card.Header>
            <Card.Body className="p-4">
              <p>This tests a card header with ada-bg-primary class and text-white.</p>
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Test 3: Card with ada-bg-secondary class */}
      <div className="row mb-4">
        <div className="col-md-6">
          <Card className="ada-shadow-md">
            <Card.Header className="ada-bg-secondary text-white py-3">
              <h6 className="mb-0">
                <i className="bi bi-star me-2"></i>
                Secondary Background Header
              </h6>
            </Card.Header>
            <Card.Body className="p-3">
              <p>This tests a card header with ada-bg-secondary class and text-white.</p>
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Test 4: Default Bootstrap card header */}
      <div className="row mb-4">
        <div className="col-md-6">
          <Card>
            <Card.Header>
              <h5 className="mb-0">
                <i className="bi bi-info-circle me-2"></i>
                Default Bootstrap Header
              </h5>
            </Card.Header>
            <Card.Body>
              <p>This tests the default Bootstrap card header styling.</p>
            </Card.Body>
          </Card>
        </div>
      </div>

      {/* Test 5: Complex header with multiple elements */}
      <div className="row mb-4">
        <div className="col-md-12">
          <AdaCard className="border-0">
            <AdaCardHeader>
              <div className="d-flex justify-content-between align-items-center flex-wrap">
                <h5 className="mb-0 me-2">
                  <i className="bi bi-list-ul me-2"></i>
                  Complex Header Layout Test
                </h5>
                <div className="d-flex align-items-center mt-2 mt-sm-0">
                  <span className="me-2 mb-0 small">Additional Info:</span>
                  <span className="badge bg-light text-dark">Active</span>
                </div>
              </div>
            </AdaCardHeader>
            <Card.Body>
              <p>This tests a complex header layout with multiple elements to ensure all text remains visible.</p>
            </Card.Body>
          </AdaCard>
        </div>
      </div>

      {/* Visibility checklist */}
      <div className="row">
        <div className="col-12">
          <div className="alert alert-info">
            <h6><i className="bi bi-check-circle me-2"></i>Visibility Checklist:</h6>
            <ul className="mb-0">
              <li>All header text should be clearly visible against background colors</li>
              <li>Icons should be visible and properly colored</li>
              <li>White text on primary/secondary backgrounds should have sufficient contrast</li>
              <li>Dark text on light backgrounds should be readable</li>
              <li>Complex layouts should maintain text hierarchy and visibility</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardHeaderVisibilityTest;
