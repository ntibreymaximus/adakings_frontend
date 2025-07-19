import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Spinner, Badge, Modal } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { API_BASE_URL } from '../utils/api';
import optimizedToast from '../utils/toastUtils';
import { useAuth } from '../contexts/AuthContext';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import '../styles/stats-dashboard.css';

// Register ChartJS components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const StatsPage = () => {
  const navigate = useNavigate();
  const { userData, checkTokenValidity } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [stats, setStats] = useState({
    totalOrders: 0,
    pendingOrders: 0,
    processingOrders: 0,
    fulfilledOrders: 0,
    cancelledOrders: 0,
    completedOrders: 0, // Keep for backward compatibility
    totalRevenue: 0,
    todayRevenue: 0,
    monthlyRevenue: 0,
    totalCustomers: 0,
    newCustomers: 0,
    topProducts: [],
    recentOrders: [],
    monthlyData: [],
    ordersByStatus: {},
    paymentMethods: {},
    hourlyOrders: [],
    deliveryStats: {},
    ordersPercentageChange: 0,
    revenuePercentageChange: 0,
  });
  const today = new Date().toISOString().split('T')[0];
  const [dateRange, setDateRange] = useState({
    startDate: today,
    endDate: today
  });
  const [exportFormat, setExportFormat] = useState('excel');
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedRange, setSelectedRange] = useState('today');
  const [showFiltersModal, setShowFiltersModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  useEffect(() => {
    if (!userData || (userData.role !== 'admin' && userData.role !== 'superadmin')) {
      optimizedToast.error('Unauthorized access');
      navigate('/dashboard');
      return;
    }
    fetchStats();
  }, [userData, navigate, dateRange]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const isValid = await checkTokenValidity();
      if (!isValid) return;

      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/stats/dashboard/?start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch statistics');
      }

      const data = await response.json();
      setStats(data);
    } catch (error) {
      optimizedToast.error(error.message || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const exportData = async (type) => {
    try {
      const isValid = await checkTokenValidity();
      if (!isValid) return;

      const token = localStorage.getItem('token');
      let endpoint = '';
      
      switch (type) {
        case 'orders':
          endpoint = `/orders/export/?format=${exportFormat}&start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`;
          break;
        case 'stats':
          endpoint = `/stats/export/?format=${exportFormat}&start_date=${dateRange.startDate}&end_date=${dateRange.endDate}`;
          break;
        case 'customers':
          endpoint = `/customers/export/?format=${exportFormat}`;
          break;
        default:
          return;
      }

      if (exportFormat === 'pdf') {
        generatePDF(type);
        return;
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_${new Date().toISOString().split('T')[0]}.${exportFormat === 'excel' ? 'xlsx' : 'csv'}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      optimizedToast.success(`${type} exported successfully`);
    } catch (error) {
      optimizedToast.error(error.message || 'Export failed');
    }
  };

  const generatePDF = (type) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Add header
    doc.setFontSize(20);
    doc.text('Ada Restaurant Management System', pageWidth / 2, 20, { align: 'center' });
    doc.setFontSize(16);
    doc.text(`${type.charAt(0).toUpperCase() + type.slice(1)} Report`, pageWidth / 2, 30, { align: 'center' });
    doc.setFontSize(12);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, pageWidth / 2, 40, { align: 'center' });
    doc.text(`Period: ${dateRange.startDate} to ${dateRange.endDate}`, pageWidth / 2, 48, { align: 'center' });

    if (type === 'stats') {
      // Summary stats
      doc.setFontSize(14);
      doc.text('Summary Statistics', 20, 65);
      
      const summaryData = [
        ['Metric', 'Value'],
        ['Total Orders', stats.totalOrders.toString()],
        ['Total Revenue', `₵${stats.totalRevenue.toLocaleString()}`],
        ['Pending Orders', stats.pendingOrders.toString()],
        ['Processing Orders', (stats.processingOrders || 0).toString()],
        ['Fulfilled Orders', (stats.fulfilledOrders || stats.completedOrders || 0).toString()],
        ['Cancelled Orders', stats.cancelledOrders.toString()],
        ['Total Customers', stats.totalCustomers.toString()],
        ['New Customers', stats.newCustomers.toString()],
      ];

      doc.autoTable({
        head: [summaryData[0]],
        body: summaryData.slice(1),
        startY: 75,
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202] },
      });

      // Top products
      if (stats.topProducts && stats.topProducts.length > 0) {
        const topProductsY = doc.lastAutoTable.finalY + 20;
        doc.setFontSize(14);
        doc.text('Top Products', 20, topProductsY);
        
        const productData = [
          ['Product', 'Quantity Sold', 'Revenue'],
          ...stats.topProducts.map(p => [
            p.name,
            p.quantity.toString(),
            `₵${p.revenue.toLocaleString()}`
          ])
        ];

        doc.autoTable({
          head: [productData[0]],
          body: productData.slice(1),
          startY: topProductsY + 10,
          theme: 'grid',
          headStyles: { fillColor: [66, 139, 202] },
        });
      }
    } else if (type === 'orders') {
      // Recent orders
      doc.setFontSize(14);
      doc.text('Recent Orders', 20, 65);
      
      const ordersData = [
        ['Order ID', 'Customer', 'Total', 'Status', 'Date'],
        ...stats.recentOrders.map(order => [
          order.id.toString(),
          order.customer_name || 'Guest',
          `₵${order.total.toLocaleString()}`,
          order.status,
          new Date(order.created_at).toLocaleDateString()
        ])
      ];

      doc.autoTable({
        head: [ordersData[0]],
        body: ordersData.slice(1),
        startY: 75,
        theme: 'grid',
        headStyles: { fillColor: [66, 139, 202] },
      });
    }

    doc.save(`${type}_report_${new Date().toISOString().split('T')[0]}.pdf`);
  };

  // Chart configuration with theme colors
  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
        labels: {
          font: {
            family: 'Poppins',
            size: 12
          },
          padding: 15,
          usePointStyle: true,
          pointStyle: 'circle'
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        titleFont: {
          family: 'Poppins',
          size: 14
        },
        bodyFont: {
          family: 'Poppins',
          size: 13
        },
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
        mode: 'index',
        intersect: false
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        },
        ticks: {
          font: {
            family: 'Poppins',
            size: 11
          }
        }
      },
      y: {
        grid: {
          borderDash: [5, 5],
          color: 'rgba(0, 0, 0, 0.05)'
        },
        ticks: {
          font: {
            family: 'Poppins',
            size: 11
          }
        }
      }
    }
  };

  const revenueChartData = {
    labels: stats.monthlyData?.map(d => d.month) || [],
    datasets: [
      {
        label: 'Revenue',
        data: stats.monthlyData?.map(d => d.revenue) || [],
        borderColor: '#1e40af', // ada-primary
        backgroundColor: 'rgba(30, 64, 175, 0.1)',
        tension: 0.4,
        fill: true,
        pointRadius: 4,
        pointHoverRadius: 6,
        pointBackgroundColor: '#1e40af',
        pointBorderColor: '#fff',
        pointBorderWidth: 2
      },
    ],
  };

  const orderStatusChartData = {
    labels: ['Pending', 'Processing', 'Fulfilled', 'Cancelled'],
    datasets: [
      {
        data: [
          stats.pendingOrders || 0,
          stats.processingOrders || 0,
          stats.fulfilledOrders || stats.completedOrders || 0,
          stats.cancelledOrders || 0
        ],
        backgroundColor: [
          '#ffc107', // warning - Pending
          '#17a2b8', // info - Processing
          '#28a745', // success - Fulfilled
          '#dc3545', // danger - Cancelled
        ],
        borderWidth: 0,
        hoverOffset: 4
      },
    ],
  };

  const hourlyOrdersData = {
    labels: stats.hourlyOrders?.map(h => `${h.hour}:00`) || [],
    datasets: [
      {
        label: 'Orders per Hour',
        data: stats.hourlyOrders?.map(h => h.count) || [],
        backgroundColor: 'rgba(30, 64, 175, 0.8)', // ada-primary
        borderColor: '#1e40af',
        borderWidth: 1,
        borderRadius: 8,
        hoverBackgroundColor: '#1e3a8a'
      },
    ],
  };

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" role="status" variant="primary">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const handleRangeChange = (range) => {
    setSelectedRange(range);
    const today = new Date();
    let startDate, endDate;

    switch (range) {
      case 'today':
        startDate = endDate = today.toISOString().split('T')[0];
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = endDate = yesterday.toISOString().split('T')[0];
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        startDate = weekAgo.toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
        break;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 30);
        startDate = monthAgo.toISOString().split('T')[0];
        endDate = today.toISOString().split('T')[0];
        break;
      case 'custom':
        // Keep current dates for custom range
        return;
      default:
        startDate = endDate = today.toISOString().split('T')[0];
    }

    setDateRange({ startDate, endDate });
  };

  // Calculate percentage changes
  const calculatePercentageChange = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
  };

  // Get comparison period text based on selected range
  const getComparisonText = () => {
    if (dateRange.startDate === dateRange.endDate) {
      // Single day comparison
      const selectedDate = new Date(dateRange.startDate);
      if (selectedRange === 'today') {
        return 'from yesterday';
      } else if (selectedRange === 'yesterday') {
        return 'from previous day';
      } else {
        return 'from previous day';
      }
    } else {
      // Multi-day comparison
      const startDate = new Date(dateRange.startDate);
      const endDate = new Date(dateRange.endDate);
      const duration = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
      
      if (selectedRange === 'week') {
        return 'from previous 7 days';
      } else if (selectedRange === 'month') {
        return 'from previous 30 days';
      } else {
        return `from previous ${duration} days`;
      }
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

      {/* Filters and Export Modals */}
      <Modal show={showFiltersModal} onHide={() => setShowFiltersModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Filter Options</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Date Range Section */}
          <h6 className="mb-3">Select Date Range</h6>
          <Row className="g-3">
            <Col xs={12}>
              <div className="btn-group w-100" role="group" aria-label="Date range selection">
                <input
                  type="radio"
                  className="btn-check"
                  name="dateRange"
                  id="rangeToday"
                  value="today"
                  checked={selectedRange === 'today'}
                  onChange={() => handleRangeChange('today')}
                />
                <label className="btn btn-outline-primary m-1" htmlFor="rangeToday">
                  Today
                </label>
                <input
                  type="radio"
                  className="btn-check"
                  name="dateRange"
                  id="rangeYesterday"
                  value="yesterday"
                  checked={selectedRange === 'yesterday'}
                  onChange={() => handleRangeChange('yesterday')}
                />
                <label className="btn btn-outline-primary m-1" htmlFor="rangeYesterday">
                  Yesterday
                </label>
                <input
                  type="radio"
                  className="btn-check"
                  name="dateRange"
                  id="rangeWeek"
                  value="week"
                  checked={selectedRange === 'week'}
                  onChange={() => handleRangeChange('week')}
                />
                <label className="btn btn-outline-primary m-1" htmlFor="rangeWeek">
                  Last 7 Days
                </label>
                <input
                  type="radio"
                  className="btn-check"
                  name="dateRange"
                  id="rangeMonth"
                  value="month"
                  checked={selectedRange === 'month'}
                  onChange={() => handleRangeChange('month')}
                />
                <label className="btn btn-outline-primary m-1" htmlFor="rangeMonth">
                  Last 30 Days
                </label>
                <input
                  type="radio"
                  className="btn-check"
                  name="dateRange"
                  id="rangeCustom"
                  value="custom"
                  checked={selectedRange === 'custom'}
                  onChange={() => handleRangeChange('custom')}
                />
                <label className="btn btn-outline-primary m-1" htmlFor="rangeCustom">
                  Custom Range
                </label>
              </div>
            </Col>
            {selectedRange === 'custom' && (
              <Col xs={12} className="mt-3">
                <Row className="g-2">
                  <Col xs={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold">Start Date</Form.Label>
                      <Form.Control
                        type="date"
                        value={dateRange.startDate}
                        onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                        placeholder="Start Date..."
                      />
                    </Form.Group>
                  </Col>
                  <Col xs={6}>
                    <Form.Group>
                      <Form.Label className="small fw-semibold">End Date</Form.Label>
                      <Form.Control
                        type="date"
                        value={dateRange.endDate}
                        onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                        placeholder="End Date..."
                      />
                    </Form.Group>
                  </Col>
                </Row>
              </Col>
            )}
          </Row>
          <Button 
            variant="primary" 
            className="mt-3" 
            onClick={() => {
              handleRefresh();
              setShowFiltersModal(false);
            }}
          >
            Apply Filter
          </Button>
        </Modal.Body>
      </Modal>

      <Modal show={showExportModal} onHide={() => setShowExportModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Export Options</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <h6 className="mb-3">Select Export Format</h6>
          <div className="btn-group w-100 mb-3" role="group" aria-label="Export format selection">
            <input 
              type="radio" 
              className="btn-check" 
              name="exportFormat" 
              id="exportExcel"
              value="excel"
              checked={exportFormat === 'excel'}
              onChange={(e) => setExportFormat(e.target.value)}
            />
            <label className="btn btn-outline-primary" htmlFor="exportExcel">
              Excel
            </label>
            <input 
              type="radio" 
              className="btn-check" 
              name="exportFormat" 
              id="exportCSV"
              value="csv"
              checked={exportFormat === 'csv'}
              onChange={(e) => setExportFormat(e.target.value)}
            />
            <label className="btn btn-outline-primary" htmlFor="exportCSV">
              CSV
            </label>
            <input 
              type="radio" 
              className="btn-check" 
              name="exportFormat" 
              id="exportPDF"
              value="pdf"
              checked={exportFormat === 'pdf'}
              onChange={(e) => setExportFormat(e.target.value)}
            />
            <label className="btn btn-outline-primary" htmlFor="exportPDF">
              PDF
            </label>
          </div>
          <Button variant="success" onClick={() => exportData('stats')}>
            Export Data
          </Button>
        </Modal.Body>
      </Modal>


      {/* Summary Stats Cards */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-center mb-2">
          <h4 className="mb-0">Overview</h4>
          <div>
            <Button 
              variant="outline-primary" 
              size="sm"
              onClick={() => setShowFiltersModal(true)} 
              className="me-2"
            >
              <i className="bi bi-funnel me-1"></i>
              Filters
            </Button>
            <Button 
              variant="outline-success" 
              size="sm"
              onClick={() => setShowExportModal(true)}
            >
              <i className="bi bi-download me-1"></i>
              Export
            </Button>
          </div>
        </div>
        {/* Display selected date range info */}
        <div className="mb-3">
          <p className="text-muted small mb-0">
            <i className="bi bi-info-circle me-1"></i>
            Showing data from <strong>{new Date(dateRange.startDate).toLocaleDateString()}</strong>
            {dateRange.startDate !== dateRange.endDate && (
              <> to <strong>{new Date(dateRange.endDate).toLocaleDateString()}</strong></>
            )}
          </p>
        </div>
        <Row className="g-3">
          <Col xs={12} sm={6} lg={3}>
            <Card className="ada-stats-card ada-stats-primary h-100">
              <Card.Body>
                <Row className="align-items-center">
                  <Col>
                    <p className="ada-stats-title text-muted mb-1">Total Orders</p>
                    <h2 className="ada-stats-value">{stats.totalOrders.toLocaleString()}</h2>
                    <p className={`ada-stats-change mb-0 ${
                      stats.ordersPercentageChange >= 0 ? 'text-success' : 'text-danger'
                    }`}>
                      <i className={`bi ${stats.ordersPercentageChange >= 0 ? 'bi-graph-up-arrow' : 'bi-graph-down-arrow'} me-1`}></i>
                      {stats.ordersPercentageChange >= 0 ? '+' : ''}{stats.ordersPercentageChange}% {getComparisonText()}
                    </p>
                  </Col>
                  <Col xs="auto">
                    <div className="ada-stats-icon">
                      <i className="bi bi-cart-check-fill" style={{fontSize: '2.5rem'}}></i>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <Card className="ada-stats-card ada-stats-success h-100">
              <Card.Body>
                <Row className="align-items-center">
                  <Col>
                    <p className="ada-stats-title text-muted mb-1">Total Revenue</p>
                    <h2 className="ada-stats-value">₵{stats.totalRevenue.toLocaleString()}</h2>
                    <p className={`ada-stats-change mb-0 ${
                      stats.revenuePercentageChange >= 0 ? 'text-success' : 'text-danger'
                    }`}>
                      <i className={`bi ${stats.revenuePercentageChange >= 0 ? 'bi-graph-up-arrow' : 'bi-graph-down-arrow'} me-1`}></i>
                      {stats.revenuePercentageChange >= 0 ? '+' : ''}{stats.revenuePercentageChange}% {getComparisonText()}
                    </p>
                  </Col>
                  <Col xs="auto">
                    <div className="ada-stats-icon">
                      <i className="bi bi-currency-exchange" style={{fontSize: '2.5rem'}}></i>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <Card className="ada-stats-card ada-stats-info h-100">
              <Card.Body>
                <Row className="align-items-center">
                  <Col>
                    <p className="ada-stats-title text-muted mb-1">Today's Revenue</p>
                    <h2 className="ada-stats-value">₵{stats.todayRevenue.toLocaleString()}</h2>
                    <p className="ada-stats-change text-info mb-0">
                      <i className="bi bi-clock-history me-1"></i>
                      Last 24 hours
                    </p>
                  </Col>
                  <Col xs="auto">
                    <div className="ada-stats-icon">
                      <i className="bi bi-calendar-check" style={{fontSize: '2.5rem'}}></i>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <Card className="ada-stats-card ada-stats-warning h-100">
              <Card.Body>
                <Row className="align-items-center">
                  <Col>
                    <p className="ada-stats-title text-muted mb-1">Total Customers</p>
                    <h2 className="ada-stats-value">{stats.totalCustomers.toLocaleString()}</h2>
                    <p className="ada-stats-change text-success mb-0">
                      <i className="bi bi-person-plus-fill me-1"></i>
                      +{stats.newCustomers} new
                    </p>
                  </Col>
                  <Col xs="auto">
                    <div className="ada-stats-icon">
                      <i className="bi bi-people-fill" style={{fontSize: '2.5rem'}}></i>
                    </div>
                  </Col>
                </Row>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Order Status Section */}
      <div className="mb-4">
        <h4 className="mb-3">Order Status</h4>
        <Row className="g-3">
          <Col xs={12} sm={6} lg={3}>
            <Card className="ada-stats-card ada-stats-warning h-100">
              <Card.Body>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <p className="ada-stats-title text-muted mb-1">Pending Orders</p>
                    <h3 className="ada-stats-value mb-0">{stats.pendingOrders}</h3>
                  </div>
                  <div className="ada-stats-icon text-warning">
                    <i className="bi bi-hourglass-split" style={{fontSize: '2rem'}}></i>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <Card className="ada-stats-card ada-stats-info h-100">
              <Card.Body>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <p className="ada-stats-title text-muted mb-1">Processing</p>
                    <h3 className="ada-stats-value mb-0">
                      {stats.processingOrders || 0}
                    </h3>
                  </div>
                  <div className="ada-stats-icon text-info">
                    <i className="bi bi-arrow-repeat" style={{fontSize: '2rem'}}></i>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <Card className="ada-stats-card ada-stats-success h-100">
              <Card.Body>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <p className="ada-stats-title text-muted mb-1">Fulfilled Orders</p>
                    <h3 className="ada-stats-value mb-0">{stats.fulfilledOrders || stats.completedOrders || 0}</h3>
                  </div>
                  <div className="ada-stats-icon text-success">
                    <i className="bi bi-check-circle-fill" style={{fontSize: '2rem'}}></i>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <Card className="ada-stats-card ada-stats-danger h-100">
              <Card.Body>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <p className="ada-stats-title text-muted mb-1">Cancelled Orders</p>
                    <h3 className="ada-stats-value mb-0">{stats.cancelledOrders}</h3>
                  </div>
                  <div className="ada-stats-icon text-danger">
                    <i className="bi bi-x-circle-fill" style={{fontSize: '2rem'}}></i>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Payment Methods Section */}
      <div className="mb-4">
        <h4 className="mb-3">Payment Methods</h4>
        <Row className="g-3">
          {Object.entries(stats.paymentMethods || {}).map(([method, data], index) => {
            // Special handling for refunds
            const isRefund = method.includes('REFUNDS');
            const isPendingRefund = method === 'PENDING_REFUNDS';
            const isCompletedRefund = method === 'COMPLETED_REFUNDS';
            
            // Get display name
            let displayName = method;
            if (isPendingRefund) {
              displayName = 'Pending Refunds';
            } else if (isCompletedRefund) {
              displayName = 'Completed Refunds';
            }
            
            // Get appropriate colors and icons
            let colorClass, icon, textColor;
            if (isPendingRefund) {
              colorClass = 'ada-stats-warning';
              icon = 'bi bi-arrow-counterclockwise';
              textColor = 'text-warning';
            } else if (isCompletedRefund) {
              colorClass = 'ada-stats-success';
              icon = 'bi bi-check-circle-fill';
              textColor = 'text-success';
            } else {
              // Regular payment methods
              const colorClasses = [
                'ada-stats-primary',
                'ada-stats-success', 
                'ada-stats-info',
                'ada-stats-warning',
                'ada-stats-danger'
              ];
              const icons = [
                'bi bi-credit-card-fill',
                'bi bi-cash-coin',
                'bi bi-phone-fill',
                'bi bi-wallet2',
                'bi bi-bank'
              ];
              colorClass = colorClasses[index % colorClasses.length];
              icon = icons[index % icons.length];
              textColor = 'text-success';
            }
            
            return (
              <Col xs={12} sm={6} lg={3} key={method}>
                <Card className={`ada-stats-card ${colorClass} h-100`}>
                  <Card.Body>
                    <div className="d-flex align-items-center justify-content-between">
                      <div>
                        <p className="ada-stats-title text-muted mb-1">{displayName}</p>
                        <h3 className="ada-stats-value mb-0">₵{(data.total || 0).toLocaleString()}</h3>
                        <p className={`ada-stats-change ${textColor} mb-0`}>
                          <i className="bi bi-hash me-1"></i>
                          {data.count || 0} transactions
                        </p>
                      </div>
                      <div className="ada-stats-icon">
                        <i className={icon} style={{fontSize: '2rem'}}></i>
                      </div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      </div>

      {/* Delivery & Pickup Stats Section */}
      <div className="mb-4">
        <h4 className="mb-3">Delivery & Pickup Statistics</h4>
        <Row className="g-3">
          <Col xs={12} sm={6} lg={3}>
            <Card className="ada-stats-card ada-stats-success h-100">
              <Card.Body>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <p className="ada-stats-title text-muted mb-1">Completed Pickups</p>
                    <h3 className="ada-stats-value mb-0">{stats.deliveryStats?.completedPickups || 0}</h3>
                  </div>
                  <div className="ada-stats-icon text-success">
                    <i className="bi bi-bag-check-fill" style={{fontSize: '2rem'}}></i>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} lg={3}>
            <Card className="ada-stats-card ada-stats-primary h-100">
              <Card.Body>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <p className="ada-stats-title text-muted mb-1">Completed Deliveries</p>
                    <h3 className="ada-stats-value mb-0">{stats.deliveryStats?.completedDeliveries || 0}</h3>
                  </div>
                  <div className="ada-stats-icon text-primary">
                    <i className="bi bi-truck-flatbed" style={{fontSize: '2rem'}}></i>
                  </div>
                </div>
              </Card.Body>
            </Card>
          </Col>
          <Col xs={12} sm={6} lg={3}>
            {stats.deliveryStats?.topDeliveryLocations?.length > 0 ? (
              <Card className="ada-stats-card ada-stats-info h-100">
                <Card.Body>
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <p className="ada-stats-title text-muted mb-1">Top Delivery Location</p>
                      <h3 className="ada-stats-value mb-0">{stats.deliveryStats.topDeliveryLocations[0].location}</h3>
                      <p className="ada-stats-change text-success mb-0">
                        <i className="bi bi-box-seam me-1"></i>
                        {stats.deliveryStats.topDeliveryLocations[0].orders.toLocaleString()} orders
                      </p>
                    </div>
                    <div className="ada-stats-icon text-info">
                      <i className="bi bi-geo-alt-fill" style={{fontSize: '2rem'}}></i>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            ) : (
              <Card className="ada-stats-card ada-stats-secondary h-100">
                <Card.Body>
                  <div className="d-flex align-items-center justify-content-between">
                    <div>
                      <p className="ada-stats-title text-muted mb-1">Top Delivery Location</p>
                      <h3 className="ada-stats-value mb-0">No Data</h3>
                    </div>
                    <div className="ada-stats-icon text-muted">
                      <i className="bi bi-geo-alt-fill" style={{fontSize: '2rem'}}></i>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            )}
          </Col>
        </Row>
      </div>

      {/* Charts */}
      <Row className="mb-4">
        <Col lg={8} className="mb-3">
          <Card>
            <Card.Header>
              <h5 className="mb-0">Revenue Trend</h5>
            </Card.Header>
            <Card.Body>
              <div style={{ height: '300px' }}>
                <Line data={revenueChartData} options={chartOptions} />
              </div>
            </Card.Body>
          </Card>
        </Col>
        <Col lg={4} className="mb-3">
          <Card>
            <Card.Header>
              <h5 className="mb-0">Order Status Distribution</h5>
            </Card.Header>
            <Card.Body>
              <div style={{ height: '300px' }}>
                <Doughnut data={orderStatusChartData} options={chartOptions} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Row className="mb-4">
        <Col lg={12}>
          <Card>
            <Card.Header>
              <h5 className="mb-0">Orders by Hour</h5>
            </Card.Header>
            <Card.Body>
              <div style={{ height: '250px' }}>
                <Bar data={hourlyOrdersData} options={chartOptions} />
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Top Products */}
      <Row className="mb-4">
        <Col lg={6} className="mb-3">
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Top Products</h5>
              <Button size="sm" variant="outline-primary" onClick={() => exportData('stats')}>
                <i className="bi bi-download me-1"></i>Export
              </Button>
            </Card.Header>
            <Card.Body>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Quantity</th>
                    <th>Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.topProducts?.slice(0, 10).map((product, index) => (
                    <tr key={index}>
                      <td>{product.name}</td>
                      <td>{product.quantity}</td>
                      <td>₵{product.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>

        {/* Recent Orders */}
        <Col lg={6} className="mb-3">
          <Card>
            <Card.Header className="d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Recent Orders</h5>
              <Button size="sm" variant="outline-primary" onClick={() => exportData('orders')}>
                <i className="bi bi-download me-1"></i>Export
              </Button>
            </Card.Header>
            <Card.Body>
              <Table responsive hover>
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders?.slice(0, 10).map((order) => (
                    <tr key={order.id}>
                      <td>#{order.id}</td>
                      <td>{order.customer_name || 'Guest'}</td>
                      <td>₵{order.total.toLocaleString()}</td>
                      <td>
                        <Badge bg={
                          order.status === 'completed' ? 'success' :
                          order.status === 'pending' ? 'warning' :
                          order.status === 'cancelled' ? 'danger' : 'secondary'
                        }>
                          {order.status}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Super Admin Additional Stats */}
      {userData.role === 'superadmin' && (
        <Row className="mb-4">
          <Col lg={6} className="mb-3">
            <Card>
              <Card.Header>
                <h5 className="mb-0">Payment Methods</h5>
              </Card.Header>
              <Card.Body>
                <Table responsive hover>
                  <thead>
                    <tr>
                      <th>Method</th>
                      <th>Count</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(stats.paymentMethods || {}).map(([method, data]) => (
                      <tr key={method}>
                        <td>{method}</td>
                        <td>{data.count}</td>
                        <td>₵{data.total?.toLocaleString() || 0}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>

          <Col lg={6} className="mb-3">
            <Card>
              <Card.Header className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">System Statistics</h5>
                <Button size="sm" variant="outline-primary" onClick={() => exportData('customers')}>
                  <i className="bi bi-download me-1"></i>Export Customers
                </Button>
              </Card.Header>
              <Card.Body>
                <Table responsive>
                  <tbody>
                    <tr>
                      <td>Average Order Value</td>
                      <td className="text-end">
                        ₵{(stats.totalRevenue / (stats.totalOrders || 1)).toFixed(2)}
                      </td>
                    </tr>
                    <tr>
                      <td>Order Completion Rate</td>
                      <td className="text-end">
                        {((stats.completedOrders / (stats.totalOrders || 1)) * 100).toFixed(1)}%
                      </td>
                    </tr>
                    <tr>
                      <td>Monthly Revenue</td>
                      <td className="text-end">₵{stats.monthlyRevenue?.toLocaleString() || 0}</td>
                    </tr>
                    <tr>
                      <td>Active Delivery Riders</td>
                      <td className="text-end">{stats.deliveryStats?.activeRiders || 0}</td>
                    </tr>
                  </tbody>
                </Table>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      )}

    </Container>
  );
};

export default StatsPage;
