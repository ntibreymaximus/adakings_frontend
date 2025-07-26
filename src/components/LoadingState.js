import React from 'react';
import { Spinner, Container, Row, Col } from 'react-bootstrap';

/**
 * Centralized Loading State Component
 * Provides consistent, centered loading states with optional context
 * 
 * @param {Object} props
 * @param {string} [props.message] - Loading message to display
 * @param {string} [props.context] - Context information (e.g., "Loading orders...")
 * @param {string} [props.variant] - Spinner variant (primary, secondary, etc.)
 * @param {string} [props.size] - Spinner size (sm, lg, or default)
 * @param {boolean} [props.fullHeight] - Whether to use full viewport height
 * @param {boolean} [props.minimal] - Minimal loading state without container
 * @param {string} [props.className] - Additional CSS classes
 * @param {Object} [props.style] - Additional inline styles
 */
const LoadingState = ({
  message = "Loading...",
  context = null,
  variant = "primary",
  size = null,
  fullHeight = false,
  minimal = false,
  className = "",
  style = {}
}) => {
  // For minimal loading states (used within cards/components)
  if (minimal) {
    return (
      <div 
        className={`d-flex flex-column align-items-center justify-content-center py-4 ${className}`}
        style={style}
      >
        <Spinner 
          animation="border" 
          variant={variant} 
          size={size}
          className="mb-3"
          role="status"
          aria-label={context || message}
        />
        {context && (
          <div className="text-center">
            <div className="fw-semibold text-muted mb-1">{context}</div>
            <small className="text-muted">{message}</small>
          </div>
        )}
        {!context && (
          <span className="text-muted fw-semibold">{message}</span>
        )}
      </div>
    );
  }

  // Full page loading state
  const containerHeight = fullHeight ? 'min-vh-100' : 'vh-75';
  
  return (
    <Container 
      fluid 
      className={`d-flex align-items-center justify-content-center ${containerHeight} ${className}`}
      style={style}
    >
      <Row className="justify-content-center">
        <Col xs={12} sm={8} md={6} lg={4} className="text-center">
          <div className="ada-loading-container">
            {/* Main spinner */}
            <div className="ada-loading-spinner mb-4">
              <Spinner 
                animation="border" 
                variant={variant} 
                size={size || "lg"}
                role="status"
                aria-label={context || message}
                style={{ 
                  width: '3rem', 
                  height: '3rem',
                  borderWidth: '0.3em'
                }}
              />
            </div>
            
            {/* Loading context and message */}
            <div className="ada-loading-content">
              {context && (
                <h5 className="ada-loading-context text-primary fw-bold mb-2">
                  {context}
                </h5>
              )}
              <p className="ada-loading-message text-muted mb-0 fw-semibold">
                {message}
              </p>
            </div>
            
            {/* Optional loading dots animation */}
            <div className="ada-loading-dots mt-3">
              <span className="dot"></span>
              <span className="dot"></span>
              <span className="dot"></span>
            </div>
          </div>
        </Col>
      </Row>
    </Container>
  );
};

/**
 * Page Loading Component
 * Specialized loading state for full page loads with consistent branding
 */
export const PageLoadingState = ({ 
  pageName = null, 
  message = "Please wait...",
  ...props 
}) => {
  const context = pageName ? `Loading ${pageName}` : "Loading Page";
  
  return (
    <LoadingState
      context={context}
      message={message}
      fullHeight={true}
      variant="primary"
      size="lg"
      {...props}
    />
  );
};

/**
 * Card Loading Component
 * Specialized loading state for cards and smaller components
 */
export const CardLoadingState = ({ 
  context = null,
  message = "Loading...",
  ...props 
}) => {
  return (
    <LoadingState
      context={context}
      message={message}
      minimal={true}
      variant="primary"
      size="sm"
      {...props}
    />
  );
};

/**
 * Modal Loading Component
 * Specialized loading state for modals
 */
export const ModalLoadingState = ({ 
  context = null,
  message = "Loading...",
  ...props 
}) => {
  return (
    <div className="text-center py-5">
      <LoadingState
        context={context}
        message={message}
        minimal={true}
        variant="primary"
        {...props}
      />
    </div>
  );
};

/**
 * Table Loading Component
 * Specialized loading state for tables and data grids
 */
export const TableLoadingState = ({ 
  context = "Loading data",
  message = "Fetching records...",
  colSpan = 5,
  ...props 
}) => {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center py-5">
        <LoadingState
          context={context}
          message={message}
          minimal={true}
          variant="primary"
          {...props}
        />
      </td>
    </tr>
  );
};

/**
 * Inline Loading Component
 * Small loading indicator for buttons and inline elements
 */
export const InlineLoadingState = ({ 
  message = "Loading...",
  size = "sm",
  variant = "primary",
  className = "",
  ...props 
}) => {
  return (
    <div className={`d-inline-flex align-items-center ${className}`} {...props}>
      <Spinner 
        animation="border" 
        size={size}
        variant={variant}
        className="me-2"
        role="status"
        aria-label={message}
      />
      <span className="fw-semibold">{message}</span>
    </div>
  );
};

export default LoadingState;
