import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Table, Button, Form, Spinner, Badge } from 'react-bootstrap';
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
    completedOrders: 0,
    cancelledOrders: 0,
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
  });
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setDate(new Date().getDate() - 30)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [exportFormat, setExportFormat] = useState('excel');
  const [activeTab, setActiveTab] = useState('overview');

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
        ['Completed Orders', stats.completedOrders.toString()],
        ['Pending Orders', stats.pendingOrders.toString()],
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
    labels: ['Pending', 'Completed', 'Cancelled', 'Processing'],
    datasets: [
      {
        data: [
          stats.pendingOrders || 0,
          stats.completedOrders || 0,
          stats.cancelledOrders || 0,
          (stats.totalOrders - stats.completedOrders - stats.cancelledOrders - stats.pendingOrders) || 0
        ],
        backgroundColor: [
          '#ffc107', // warning
          '#28a745', // success
          '#dc3545', // danger
          '#17a2b8', // info
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

  // Calculate percentage changes
  const calculatePercentageChange = (current, previous) => {
    if (!previous || previous === 0) return 0;
    return ((current - previous) / previous * 100).toFixed(1);
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

      {/* Page Title */}
      <div className="mb-4">
        <h2 className="ada-text-primary mb-2">
          <i className="bi bi-bar-chart-line-fill me-2"></i>
          Statistics Dashboard
        </h2>
        <p className="text-muted mb-0">
          Comprehensive analytics and insights for your restaurant
          {userData.role === 'superadmin' && (
            <Badge bg="danger" className="ms-2 align-middle">Super Admin</Badge>
          )}
        </p>
      </div>

      {/* Filters and Actions Card */}
      <Card className="ada-shadow-sm mb-4">
        <Card.Body>
          <h5 className="mb-4 d-flex align-items-center">
            <i className="bi bi-funnel me-2"></i>
            Filters & Export Options
          </h5>
          
          {/* Date Range Section */}
          <div className="mb-4">
            <h6 className="text-muted mb-3">Date Range</h6>
            <Row className="g-3">
              <Col xs={12} sm={6} md={4} lg={3}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">Start Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={dateRange.startDate}
                    onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
                    className="ada-form-control"
                  />
                </Form.Group>
              </Col>
              <Col xs={12} sm={6} md={4} lg={3}>
                <Form.Group>
                  <Form.Label className="small fw-semibold">End Date</Form.Label>
                  <Form.Control
                    type="date"
                    value={dateRange.endDate}
                    onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
                    className="ada-form-control"
                  />
                </Form.Group>
              </Col>
              <Col xs={12} sm={12} md={4} lg={3}>
                <Form.Group>
                  <Form.Label className="small fw-semibold d-block mb-2">Actions</Form.Label>
                  <Button 
                    variant="primary" 
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="w-100 d-flex align-items-center justify-content-center"
                    style={{ minHeight: '38px' }}
                  >
                    {refreshing ? (
                      <>
                        <Spinner size="sm" animation="border" className="me-2" />
                        <span>Refreshing...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-arrow-clockwise me-2"></i>
                        <span>Refresh Data</span>
                      </>
                    )}
                  </Button>
                </Form.Group>
              </Col>
            </Row>
          </div>

          <hr className="my-4" />

          {/* Export Section */}
          <div>
            <h6 className="text-muted mb-3">Export Options</h6>
            <Row className="g-3">
              <Col xs={12} lg={5}>
                <div className="p-3 bg-light rounded">
                  <p className="small fw-semibold mb-2">Export Format</p>
                  <div className="btn-group w-100" role="group" aria-label="Export format">
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
                      <i className="bi bi-file-earmark-excel me-2"></i>
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
                      <i className="bi bi-filetype-csv me-2"></i>
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
                      <i className="bi bi-file-earmark-pdf me-2"></i>
                      PDF
                    </label>
                  </div>
                </div>
              </Col>
              <Col xs={12} lg={7}>
                <div className="p-3 bg-light rounded">
                  <p className="small fw-semibold mb-2">Export Data</p>
                  <div className="d-flex gap-2 flex-wrap">
                    <Button 
                      variant="primary" 
                      onClick={() => exportData('stats')}
                      className="flex-fill d-flex align-items-center justify-content-center"
                      style={{ minWidth: '120px' }}
                    >
                      <i className="bi bi-graph-up-arrow me-2"></i>
                      <span>Export Stats</span>
                    </Button>
                    <Button 
                      variant="success" 
                      onClick={() => exportData('orders')}
                      className="flex-fill d-flex align-items-center justify-content-center"
                      style={{ minWidth: '120px' }}
                    >
                      <i className="bi bi-receipt-cutoff me-2"></i>
                      <span>Export Orders</span>
                    </Button>
                    {userData.role === 'superadmin' && (
                      <Button 
                        variant="info" 
                        onClick={() => exportData('customers')}
                        className="flex-fill d-flex align-items-center justify-content-center text-white"
                        style={{ minWidth: '140px' }}
                      >
                        <i className="bi bi-people-fill me-2"></i>
                        <span>Export Customers</span>
                      </Button>
                    )}
                  </div>
                  <p className="text-muted small mb-0 mt-2">
                    <i className="bi bi-info-circle me-1"></i>
                    Export data for the selected date range in {exportFormat.toUpperCase()} format
                  </p>
                </div>
              </Col>
            </Row>
          </div>
        </Card.Body>
      </Card>

      {/* Summary Stats Cards */}
      <div className="mb-4">
        <h4 className="mb-3">Overview</h4>
        <Row className="g-3">
          <Col xs={12} sm={6} lg={3}>
            <Card className="ada-stats-card ada-stats-primary h-100">
              <Card.Body>
                <Row className="align-items-center">
                  <Col>
                    <p className="ada-stats-title text-muted mb-1">Total Orders</p>
                    <h2 className="ada-stats-value">{stats.totalOrders.toLocaleString()}</h2>
                    <p className="ada-stats-change text-success mb-0">
                      <i className="bi bi-graph-up-arrow me-1"></i>
                      +12% from last month
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
                    <p className="ada-stats-change text-success mb-0">
                      <i className="bi bi-graph-up-arrow me-1"></i>
                      +8% from last month
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
            <Card className="ada-stats-card ada-stats-success h-100">
              <Card.Body>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <p className="ada-stats-title text-muted mb-1">Completed Orders</p>
                    <h3 className="ada-stats-value mb-0">{stats.completedOrders}</h3>
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
          <Col xs={12} sm={6} lg={3}>
            <Card className="ada-stats-card ada-stats-info h-100">
              <Card.Body>
                <div className="d-flex align-items-center justify-content-between">
                  <div>
                    <p className="ada-stats-title text-muted mb-1">Processing</p>
                    <h3 className="ada-stats-value mb-0">
                      {stats.totalOrders - stats.completedOrders - stats.cancelledOrders - stats.pendingOrders}
                    </h3>
                  </div>
                  <div className="ada-stats-icon text-info">
                    <i className="bi bi-arrow-repeat" style={{fontSize: '2rem'}}></i>
                  </div>
                </div>
              </Card.Body>
            </Card>
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
