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
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [exportFormat, setExportFormat] = useState('excel');

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
        ['Total Revenue', `₦${stats.totalRevenue.toLocaleString()}`],
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
            `₦${p.revenue.toLocaleString()}`
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
          `₦${order.total.toLocaleString()}`,
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

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'top',
      },
    },
  };

  const revenueChartData = {
    labels: stats.monthlyData?.map(d => d.month) || [],
    datasets: [
      {
        label: 'Revenue',
        data: stats.monthlyData?.map(d => d.revenue) || [],
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        tension: 0.1,
        fill: true,
      },
    ],
  };

  const orderStatusChartData = {
    labels: Object.keys(stats.ordersByStatus || {}),
    datasets: [
      {
        data: Object.values(stats.ordersByStatus || {}),
        backgroundColor: [
          'rgba(255, 206, 86, 0.8)',
          'rgba(75, 192, 192, 0.8)',
          'rgba(255, 99, 132, 0.8)',
          'rgba(54, 162, 235, 0.8)',
        ],
      },
    ],
  };

  const hourlyOrdersData = {
    labels: stats.hourlyOrders?.map(h => `${h.hour}:00`) || [],
    datasets: [
      {
        label: 'Orders per Hour',
        data: stats.hourlyOrders?.map(h => h.count) || [],
        backgroundColor: 'rgba(54, 162, 235, 0.8)',
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

  return (
    <Container className="py-4">
      <Row className="mb-4">
        <Col>
          <h2 className="ada-text-primary">
            Statistics Dashboard
            {userData.role === 'superadmin' && (
              <Badge bg="danger" className="ms-2">Super Admin</Badge>
            )}
          </h2>
        </Col>
      </Row>

      {/* Date Range Filter */}
      <Row className="mb-4">
        <Col md={3}>
          <Form.Group>
            <Form.Label>Start Date</Form.Label>
            <Form.Control
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({ ...dateRange, startDate: e.target.value })}
            />
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group>
            <Form.Label>End Date</Form.Label>
            <Form.Control
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({ ...dateRange, endDate: e.target.value })}
            />
          </Form.Group>
        </Col>
        <Col md={3}>
          <Form.Group>
            <Form.Label>Export Format</Form.Label>
            <Form.Select
              value={exportFormat}
              onChange={(e) => setExportFormat(e.target.value)}
            >
              <option value="excel">Excel</option>
              <option value="csv">CSV</option>
              <option value="pdf">PDF</option>
            </Form.Select>
          </Form.Group>
        </Col>
        <Col md={3} className="d-flex align-items-end">
          <Button variant="primary" onClick={() => fetchStats()}>
            <i className="bi bi-arrow-clockwise me-2"></i>
            Refresh
          </Button>
        </Col>
      </Row>

      {/* Summary Cards */}
      <Row className="mb-4">
        <Col xs={12} sm={6} lg={3} className="mb-3">
          <Card className="h-100 text-center">
            <Card.Body>
              <h5 className="text-muted">Total Orders</h5>
              <h2 className="ada-text-primary">{stats.totalOrders}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={3} className="mb-3">
          <Card className="h-100 text-center">
            <Card.Body>
              <h5 className="text-muted">Total Revenue</h5>
              <h2 className="ada-text-primary">₦{stats.totalRevenue.toLocaleString()}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={3} className="mb-3">
          <Card className="h-100 text-center">
            <Card.Body>
              <h5 className="text-muted">Today's Revenue</h5>
              <h2 className="ada-text-primary">₦{stats.todayRevenue.toLocaleString()}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={3} className="mb-3">
          <Card className="h-100 text-center">
            <Card.Body>
              <h5 className="text-muted">Total Customers</h5>
              <h2 className="ada-text-primary">{stats.totalCustomers}</h2>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      {/* Order Status Cards */}
      <Row className="mb-4">
        <Col xs={12} sm={6} lg={3} className="mb-3">
          <Card className="h-100 text-center border-warning">
            <Card.Body>
              <h5 className="text-warning">Pending Orders</h5>
              <h2>{stats.pendingOrders}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={3} className="mb-3">
          <Card className="h-100 text-center border-success">
            <Card.Body>
              <h5 className="text-success">Completed Orders</h5>
              <h2>{stats.completedOrders}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={3} className="mb-3">
          <Card className="h-100 text-center border-danger">
            <Card.Body>
              <h5 className="text-danger">Cancelled Orders</h5>
              <h2>{stats.cancelledOrders}</h2>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} lg={3} className="mb-3">
          <Card className="h-100 text-center border-info">
            <Card.Body>
              <h5 className="text-info">New Customers</h5>
              <h2>{stats.newCustomers}</h2>
            </Card.Body>
          </Card>
        </Col>
      </Row>

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
                      <td>₦{product.revenue.toLocaleString()}</td>
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
                      <td>₦{order.total.toLocaleString()}</td>
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
                        <td>₦{data.total?.toLocaleString() || 0}</td>
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
                        ₦{(stats.totalRevenue / (stats.totalOrders || 1)).toFixed(2)}
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
                      <td className="text-end">₦{stats.monthlyRevenue?.toLocaleString() || 0}</td>
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

      {/* Export Actions */}
      <Row className="mb-4">
        <Col className="text-center">
          <Button variant="primary" size="lg" className="me-2" onClick={() => exportData('stats')}>
            <i className="bi bi-bar-chart me-2"></i>
            Export Statistics
          </Button>
          <Button variant="success" size="lg" className="me-2" onClick={() => exportData('orders')}>
            <i className="bi bi-cart me-2"></i>
            Export Orders
          </Button>
          {userData.role === 'superadmin' && (
            <Button variant="info" size="lg" onClick={() => exportData('customers')}>
              <i className="bi bi-people me-2"></i>
              Export Customers
            </Button>
          )}
        </Col>
      </Row>
    </Container>
  );
};

export default StatsPage;
