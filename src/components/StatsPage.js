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

  // Add state for transactions to calculate refunds properly
  const [transactions, setTransactions] = useState([]);
  const [refundStats, setRefundStats] = useState({
    pendingRefunds: 0,
    pendingRefundsCount: 0,
    completedRefunds: 0,
    completedRefundsCount: 0
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
  const [selectedExportSections, setSelectedExportSections] = useState({
    summaryStats: true,
    orderStatus: true,
    paymentMethods: true,
    refundStats: true,
    deliveryStats: true,
    topProducts: true,
    recentOrders: true,
    systemStats: true,
    hourlyOrders: true
  });

  useEffect(() => {
    if (!userData || (userData.role !== 'admin' && userData.role !== 'superadmin')) {
      optimizedToast.error('Unauthorized access');
      navigate('/dashboard');
      return;
    }
    fetchStats();
    fetchTransactions();
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

  // Fetch transactions to calculate refunds properly
  const fetchTransactions = async () => {
    try {
      const isValid = await checkTokenValidity();
      if (!isValid) return;

      const token = localStorage.getItem('token');
      const response = await fetch(
        `${API_BASE_URL}/payments/transaction-table/`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch transactions');
      }

      const data = await response.json();
      let transactionsArray = [];
      if (Array.isArray(data)) {
        transactionsArray = data;
      } else if (data.transactions && Array.isArray(data.transactions)) {
        transactionsArray = data.transactions;
      } else if (data.data && Array.isArray(data.data)) {
        transactionsArray = data.data;
      } else if (data.results && Array.isArray(data.results)) {
        transactionsArray = data.results;
      }
      
      setTransactions(transactionsArray);
      calculateRefundsFromTransactions(transactionsArray);
    } catch (error) {
      console.warn('Failed to fetch transactions for refund calculation:', error);
      // Don't show error toast for this as it's supplementary data
    }
  };

  // Calculate refunds using the same logic as ViewTransactionsPage
  const calculateRefundsFromTransactions = (transactionsArray) => {
    let pendingRefunds = 0;
    let completedRefunds = 0;
    let pendingRefundsCount = 0;
    let completedRefundsCount = 0;

    console.log(`📋 Stats Dashboard: Filtering ${transactionsArray.length} transactions for date range: ${dateRange.startDate} to ${dateRange.endDate}`);

    // Filter transactions for the current date range with robust timezone handling
    const filteredTransactions = transactionsArray.filter(transaction => {
      const transactionDate = new Date(transaction.created_at || transaction.date);
      
      // Get the transaction date in multiple formats to handle timezone issues
      const transactionDateUTC = transactionDate.toISOString().split('T')[0];
      const transactionDateLocal = transactionDate.toLocaleDateString('en-CA'); // YYYY-MM-DD format
      
      // Check if transaction falls within date range using multiple methods
      const startDate = new Date(dateRange.startDate + 'T00:00:00');
      const endDate = new Date(dateRange.endDate + 'T23:59:59');
      
      const matchesDateRange = transactionDate >= startDate && transactionDate <= endDate;
      const matchesUTCRange = transactionDateUTC >= dateRange.startDate && transactionDateUTC <= dateRange.endDate;
      const matchesLocalRange = transactionDateLocal >= dateRange.startDate && transactionDateLocal <= dateRange.endDate;
      
      const matches = matchesDateRange || matchesUTCRange || matchesLocalRange;
      
      if (matches) {
        console.log(`✅ Stats Dashboard: Transaction ${transaction.transaction_id || transaction.id} matches date filter`);
      }
      
      return matches;
    });
    
    console.log(`📊 Stats Dashboard: Found ${filteredTransactions.length} transactions in date range`);

    filteredTransactions.forEach(transaction => {
      const amount = parseFloat(transaction.amount) || 0;
      const status = transaction.status?.toLowerCase();
      const orderTotal = parseFloat(transaction.order_total) || 0;
      
      // Check if this is an explicit refund transaction
      const isExplicitRefund = transaction.payment_type === 'Refund' || 
                             transaction.payment_type === 'refund' || 
                             (transaction.payment_type && transaction.payment_type.toLowerCase() === 'refund') ||
                             amount < 0;
      
      if (isExplicitRefund) {
        // Explicit refund transactions
        completedRefunds += Math.abs(amount);
        completedRefundsCount += 1;
      } else if (status === 'overpaid' && orderTotal > 0) {
        // Overpaid orders - calculate pending refund as difference between amount paid and order total
        const overpaidAmount = amount - orderTotal;
        if (overpaidAmount > 0) {
          pendingRefunds += overpaidAmount;
          pendingRefundsCount += 1;
        }
      }
    });

    setRefundStats({
      pendingRefunds,
      pendingRefundsCount,
      completedRefunds,
      completedRefundsCount
    });
  };

  const exportData = async (type) => {
    try {
      const isValid = await checkTokenValidity();
      if (!isValid) return;

      const token = localStorage.getItem('token');
      
      if (exportFormat === 'pdf') {
        generatePDF(type);
        return;
      }

      // Try server-side export first
      try {
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
            throw new Error('Invalid export type');
        }

        const response = await fetch(`${API_BASE_URL}${endpoint}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        });

        if (response.ok) {
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
          return;
        }
      } catch (serverError) {
        console.warn('Server-side export failed, trying client-side export:', serverError);
      }

      // Fallback to client-side export
      generateClientSideExport(type);
    } catch (error) {
      optimizedToast.error(error.message || 'Export failed');
    }
  };

const generateClientSideExport = (type) => {
    try {
      let data = [];
      let filename = `${type}_${new Date().toISOString().split('T')[0]}`;
      
      switch (type) {
        case 'stats':
          // Start with header
          data = [['Section', 'Metric', 'Value']];
          
          // Export current statistics based on selected sections
          if (selectedExportSections.summaryStats) {
            data.push(['Summary Statistics', 'Total Orders', stats.totalOrders.toString()]);
            data.push(['Summary Statistics', 'Total Revenue', `GHS ${parseFloat(stats.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]);
            data.push(['Summary Statistics', 'Today\'s Revenue', `GHS ${parseFloat(stats.todayRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]);
            data.push(['Summary Statistics', 'Monthly Revenue', `GHS ${parseFloat(stats.monthlyRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]);
            data.push(['Summary Statistics', 'Total Customers', stats.totalCustomers.toString()]);
            data.push(['Summary Statistics', 'New Customers', stats.newCustomers.toString()]);
            data.push(['', '', '']); // Separator
          }

          if (selectedExportSections.orderStatus) {
            data.push(['Order Status', 'Pending Orders', stats.pendingOrders.toString()]);
            data.push(['Order Status', 'Processing Orders', (stats.processingOrders || 0).toString()]);
            data.push(['Order Status', 'Fulfilled Orders', (stats.fulfilledOrders || stats.completedOrders || 0).toString()]);
            data.push(['Order Status', 'Cancelled Orders', stats.cancelledOrders.toString()]);
            data.push(['', '', '']); // Separator
          }

          if (selectedExportSections.paymentMethods && stats.paymentMethods) {
            Object.entries(stats.paymentMethods).forEach(([method, methodData]) => {
              data.push(['Payment Methods', method, `GHS ${parseFloat(methodData.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${methodData.count || 0} transactions)`]);
            });
            data.push(['', '', '']); // Separator
          }

          if (selectedExportSections.refundStats) {
            data.push(['Refund Statistics', 'Pending Refunds', `GHS ${parseFloat(refundStats.pendingRefunds || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${refundStats.pendingRefundsCount || 0} transactions)`]);
            data.push(['Refund Statistics', 'Completed Refunds', `GHS ${parseFloat(refundStats.completedRefunds || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} (${refundStats.completedRefundsCount || 0} transactions)`]);
            data.push(['', '', '']); // Separator
          }

          if (selectedExportSections.deliveryStats && stats.deliveryStats) {
            data.push(['Delivery Statistics', 'Completed Pickups', (stats.deliveryStats.completedPickups || 0).toString()]);
            data.push(['Delivery Statistics', 'Completed Deliveries', (stats.deliveryStats.completedDeliveries || 0).toString()]);
            if (stats.deliveryStats.topDeliveryLocations?.length > 0) {
              data.push(['Delivery Statistics', 'Top Delivery Location', `${stats.deliveryStats.topDeliveryLocations[0].location} (${stats.deliveryStats.topDeliveryLocations[0].orders} orders)`]);
            }
            data.push(['', '', '']); // Separator
          }

          if (selectedExportSections.topProducts && stats.topProducts && stats.topProducts.length > 0) {
            // Add header for products section
            data.push(['Top Products', 'Product Name', 'Quantity Sold | Revenue']);
            stats.topProducts.forEach(product => {
              data.push(['Top Products', product.name, `${product.quantity} | GHS ${parseFloat(product.revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`]);
            });
            data.push(['', '', '']); // Separator
          }

          if (selectedExportSections.recentOrders && stats.recentOrders && stats.recentOrders.length > 0) {
            // Add header for orders section
            data.push(['Recent Orders', 'Order ID | Customer', 'Total | Status | Date']);
            stats.recentOrders.slice(0, 10).forEach(order => {
              data.push(['Recent Orders', `#${order.id} | ${order.customer_name || 'Guest'}`, `GHS ${parseFloat(order.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} | ${order.status} | ${new Date(order.created_at).toLocaleDateString()}`]);
            });
            data.push(['', '', '']); // Separator
          }

          if (selectedExportSections.hourlyOrders && stats.hourlyOrders && stats.hourlyOrders.length > 0) {
            data.push(['Hourly Orders', 'Hour', 'Order Count']);
            stats.hourlyOrders.forEach(hourData => {
              data.push(['Hourly Orders', `${hourData.hour}:00`, hourData.count.toString()]);
            });
            data.push(['', '', '']); // Separator
          }

          if (selectedExportSections.systemStats && userData?.role === 'superadmin') {
            data.push(['System Statistics', 'Average Order Value', `GHS ${(stats.totalRevenue / (stats.totalOrders || 1)).toFixed(2)}`]);
            data.push(['System Statistics', 'Order Completion Rate', `${((stats.completedOrders / (stats.totalOrders || 1)) * 100).toFixed(1)}%`]);
            data.push(['System Statistics', 'Active Delivery Riders', (stats.deliveryStats?.activeRiders || 0).toString()]);
          }
          break;
          
        case 'orders':
          // Export recent orders
          data = [
            ['Order ID', 'Customer', 'Total', 'Status', 'Date']
          ];
          if (stats.recentOrders && stats.recentOrders.length > 0) {
            stats.recentOrders.forEach(order => {
              data.push([
                `#${order.id}`,
                order.customer_name || 'Guest',
                order.total,
                order.status,
                new Date(order.created_at).toLocaleDateString()
              ]);
            });
          }
          break;
          
        case 'customers':
          // Basic customer export
          data = [
            ['Customer Info', 'Value'],
            ['Total Customers', stats.totalCustomers.toString()],
            ['New Customers', stats.newCustomers.toString()]
          ];
          break;
          
        default:
          throw new Error('Invalid export type');
      }

      if (exportFormat === 'excel') {
        // Create Excel file using XLSX
        const ws = XLSX.utils.aoa_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, type.charAt(0).toUpperCase() + type.slice(1));
        XLSX.writeFile(wb, `${filename}.xlsx`);
      } else {
        // Create CSV file
        const csvContent = data.map(row => 
          row.map(field => {
            // Handle fields containing commas or quotes
            if (typeof field === 'string' && (field.includes(',') || field.includes('"') || field.includes('\n'))) {
              return `"${field.replace(/"/g, '""')}"`;
            }
            return field;
          }).join(',')
        ).join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${filename}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }

      optimizedToast.success(`${type} exported successfully (client-side)`);
    } catch (error) {
      optimizedToast.error(`Client-side export failed: ${error.message}`);
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

    let currentY = 60;

    if (type === 'stats') {
      // Build PDF content based on selected sections
      const sections = [];

      // Summary Statistics
      if (selectedExportSections.summaryStats) {
        const summaryData = [
          ['Metric', 'Value'],
          ['Total Orders', stats.totalOrders.toString()],
          ['Total Revenue', `GHS ${parseFloat(stats.totalRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
          ['Today\'s Revenue', `GHS ${parseFloat(stats.todayRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
          ['Monthly Revenue', `GHS ${parseFloat(stats.monthlyRevenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
          ['Total Customers', stats.totalCustomers.toString()],
          ['New Customers', stats.newCustomers.toString()],
        ];
        sections.push({ title: 'Summary Statistics', data: summaryData });
      }

      // Order Status
      if (selectedExportSections.orderStatus) {
        const orderStatusData = [
          ['Status', 'Count'],
          ['Pending Orders', stats.pendingOrders.toString()],
          ['Processing Orders', (stats.processingOrders || 0).toString()],
          ['Fulfilled Orders', (stats.fulfilledOrders || stats.completedOrders || 0).toString()],
          ['Cancelled Orders', stats.cancelledOrders.toString()],
        ];
        sections.push({ title: 'Order Status', data: orderStatusData });
      }

      // Payment Methods
      if (selectedExportSections.paymentMethods && stats.paymentMethods) {
        const paymentData = [
          ['Method', 'Total', 'Transactions'],
          ...Object.entries(stats.paymentMethods).map(([method, methodData]) => [
            method,
            `GHS ${parseFloat(methodData.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            (methodData.count || 0).toString()
          ])
        ];
        sections.push({ title: 'Payment Methods', data: paymentData });
      }

      // Refund Statistics
      if (selectedExportSections.refundStats) {
        const refundData = [
          ['Type', 'Amount', 'Count'],
          ['Pending Refunds', `GHS ${parseFloat(refundStats.pendingRefunds || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, refundStats.pendingRefundsCount.toString()],
          ['Completed Refunds', `GHS ${parseFloat(refundStats.completedRefunds || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, refundStats.completedRefundsCount.toString()],
        ];
        sections.push({ title: 'Refund Statistics', data: refundData });
      }

      // Delivery Statistics
      if (selectedExportSections.deliveryStats && stats.deliveryStats) {
        const deliveryData = [
          ['Metric', 'Value'],
          ['Completed Pickups', (stats.deliveryStats.completedPickups || 0).toString()],
          ['Completed Deliveries', (stats.deliveryStats.completedDeliveries || 0).toString()],
        ];
        if (stats.deliveryStats.topDeliveryLocations?.length > 0) {
          deliveryData.push(['Top Delivery Location', `${stats.deliveryStats.topDeliveryLocations[0].location} (${stats.deliveryStats.topDeliveryLocations[0].orders} orders)`]);
        }
        sections.push({ title: 'Delivery Statistics', data: deliveryData });
      }

      // Top Products
      if (selectedExportSections.topProducts && stats.topProducts && stats.topProducts.length > 0) {
        const productData = [
          ['Product', 'Quantity Sold', 'Revenue'],
          ...stats.topProducts.map(p => [
            p.name,
            p.quantity.toString(),
            `GHS ${parseFloat(p.revenue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          ])
        ];
        sections.push({ title: 'Top Products', data: productData });
      }

      // Recent Orders
      if (selectedExportSections.recentOrders && stats.recentOrders && stats.recentOrders.length > 0) {
        const ordersData = [
          ['Order ID', 'Customer', 'Total', 'Status', 'Date'],
          ...stats.recentOrders.slice(0, 10).map(order => [
            `#${order.id}`,
            order.customer_name || 'Guest',
            `GHS ${parseFloat(order.total || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            order.status,
            new Date(order.created_at).toLocaleDateString()
          ])
        ];
        sections.push({ title: 'Recent Orders (Last 10)', data: ordersData });
      }

      // Hourly Orders
      if (selectedExportSections.hourlyOrders && stats.hourlyOrders && stats.hourlyOrders.length > 0) {
        const hourlyData = [
          ['Hour', 'Order Count'],
          ...stats.hourlyOrders.map(hourData => [
            `${hourData.hour}:00`,
            hourData.count.toString()
          ])
        ];
        sections.push({ title: 'Hourly Order Distribution', data: hourlyData });
      }

      // System Statistics
      if (selectedExportSections.systemStats && userData?.role === 'superadmin') {
        const systemData = [
          ['Metric', 'Value'],
          ['Average Order Value', `GHS ${(stats.totalRevenue / (stats.totalOrders || 1)).toFixed(2)}`],
          ['Order Completion Rate', `${((stats.completedOrders / (stats.totalOrders || 1)) * 100).toFixed(1)}%`],
          ['Active Delivery Riders', (stats.deliveryStats?.activeRiders || 0).toString()],
        ];
        sections.push({ title: 'System Statistics', data: systemData });
      }

      // Add sections to PDF
      sections.forEach((section, index) => {
        if (index > 0 && currentY > 200) {
          doc.addPage();
          currentY = 20;
        }

        doc.setFontSize(14);
        doc.text(section.title, 20, currentY);
        
        doc.autoTable({
          head: [section.data[0]],
          body: section.data.slice(1),
          startY: currentY + 10,
          theme: 'grid',
          headStyles: { fillColor: [66, 139, 202] },
          margin: { left: 20, right: 20 },
        });

        currentY = doc.lastAutoTable.finalY + 15;
      });

    } else if (type === 'orders') {
      // Recent orders (not affected by section selection)
      doc.setFontSize(14);
      doc.text('Recent Orders', 20, 65);
      
      const ordersData = [
        ['Order ID', 'Customer', 'Total', 'Status', 'Date'],
        ...stats.recentOrders.map(order => [
          order.id.toString(),
          order.customer_name || 'Guest',
          `GHS ${order.total.toLocaleString()}`,
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

    console.log(`📅 Stats Dashboard: Changing date range to '${range}'`);
    console.log(`Current timezone offset: ${today.getTimezoneOffset()} minutes`);
    console.log(`Current time: ${today.toISOString()}`);
    
    // Use local date to avoid timezone issues
    const getLocalDateString = (date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    switch (range) {
      case 'today':
        startDate = endDate = getLocalDateString(today);
        break;
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        startDate = endDate = getLocalDateString(yesterday);
        break;
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(weekAgo.getDate() - 7);
        startDate = getLocalDateString(weekAgo);
        endDate = getLocalDateString(today);
        break;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setDate(monthAgo.getDate() - 30);
        startDate = getLocalDateString(monthAgo);
        endDate = getLocalDateString(today);
        break;
      case 'custom':
        // Keep current dates for custom range
        return;
      default:
        startDate = endDate = getLocalDateString(today);
    }

    console.log(`📋 Stats Dashboard: New date range - Start: ${startDate}, End: ${endDate}`);
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
          
          <h6 className="mb-3 mt-4">Select Sections to Export</h6>
          
          {/* Core Statistics Section */}
          <div className="card border-light mb-3">
            <div className="card-header bg-light py-2">
              <small className="text-muted fw-semibold">CORE STATISTICS</small>
            </div>
            <div className="card-body py-3">
              <div className="row g-2">
                <div className="col-md-6">
                  <div className="form-check">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      id="summaryStats" 
                      checked={selectedExportSections.summaryStats}
                      onChange={(e) => setSelectedExportSections({...selectedExportSections, summaryStats: e.target.checked})}
                    />
                    <label className="form-check-label" htmlFor="summaryStats">
                      Summary Statistics
                    </label>
                    <br />
                    <small className="text-muted">Orders, revenue, customers</small>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-check">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      id="orderStatus" 
                      checked={selectedExportSections.orderStatus}
                      onChange={(e) => setSelectedExportSections({...selectedExportSections, orderStatus: e.target.checked})}
                    />
                    <label className="form-check-label" htmlFor="orderStatus">
                      Order Status Breakdown
                    </label>
                    <br />
                    <small className="text-muted">Pending, completed, cancelled</small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Financial & Operations Section */}
          <div className="card border-light mb-3">
            <div className="card-header bg-light py-2">
              <small className="text-muted fw-semibold">FINANCIAL & OPERATIONS</small>
            </div>
            <div className="card-body py-3">
              <div className="row g-2">
                <div className="col-md-6">
                  <div className="form-check">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      id="paymentMethods" 
                      checked={selectedExportSections.paymentMethods}
                      onChange={(e) => setSelectedExportSections({...selectedExportSections, paymentMethods: e.target.checked})}
                    />
                    <label className="form-check-label" htmlFor="paymentMethods">
                      Payment Methods
                    </label>
                    <br />
                    <small className="text-muted">Cash, mobile money, card</small>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-check">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      id="refundStats" 
                      checked={selectedExportSections.refundStats}
                      onChange={(e) => setSelectedExportSections({...selectedExportSections, refundStats: e.target.checked})}
                    />
                    <label className="form-check-label" htmlFor="refundStats">
                      Refund Statistics
                    </label>
                    <br />
                    <small className="text-muted">Pending and completed refunds</small>
                  </div>
                </div>
                <div className="col-md-6 mt-3">
                  <div className="form-check">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      id="deliveryStats" 
                      checked={selectedExportSections.deliveryStats}
                      onChange={(e) => setSelectedExportSections({...selectedExportSections, deliveryStats: e.target.checked})}
                    />
                    <label className="form-check-label" htmlFor="deliveryStats">
                      Delivery & Pickup Stats
                    </label>
                    <br />
                    <small className="text-muted">Distribution by delivery method</small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Product & Order Details Section */}
          <div className="card border-light mb-3">
            <div className="card-header bg-light py-2">
              <small className="text-muted fw-semibold">PRODUCT & ORDER DETAILS</small>
            </div>
            <div className="card-body py-3">
              <div className="row g-2">
                <div className="col-md-6">
                  <div className="form-check">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      id="topProducts" 
                      checked={selectedExportSections.topProducts}
                      onChange={(e) => setSelectedExportSections({...selectedExportSections, topProducts: e.target.checked})}
                    />
                    <label className="form-check-label" htmlFor="topProducts">
                      Top Products
                    </label>
                    <br />
                    <small className="text-muted">Best selling items</small>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="form-check">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      id="recentOrders" 
                      checked={selectedExportSections.recentOrders}
                      onChange={(e) => setSelectedExportSections({...selectedExportSections, recentOrders: e.target.checked})}
                    />
                    <label className="form-check-label" htmlFor="recentOrders">
                      Recent Orders
                    </label>
                    <br />
                    <small className="text-muted">Last 10 orders with details</small>
                  </div>
                </div>
                <div className="col-md-6 mt-3">
                  <div className="form-check">
                    <input 
                      className="form-check-input" 
                      type="checkbox" 
                      id="hourlyOrders" 
                      checked={selectedExportSections.hourlyOrders}
                      onChange={(e) => setSelectedExportSections({...selectedExportSections, hourlyOrders: e.target.checked})}
                    />
                    <label className="form-check-label" htmlFor="hourlyOrders">
                      Hourly Distribution
                    </label>
                    <br />
                    <small className="text-muted">Orders by time of day</small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* System Statistics Section (Superadmin Only) */}
          {userData?.role === 'superadmin' && (
            <div className="card border-warning mb-3">
              <div className="card-header bg-warning bg-opacity-10 py-2">
                <small className="text-warning fw-semibold">SYSTEM STATISTICS (SUPERADMIN)</small>
              </div>
              <div className="card-body py-3">
                <div className="form-check">
                  <input 
                    className="form-check-input" 
                    type="checkbox" 
                    id="systemStats" 
                    checked={selectedExportSections.systemStats}
                    onChange={(e) => setSelectedExportSections({...selectedExportSections, systemStats: e.target.checked})}
                  />
                  <label className="form-check-label" htmlFor="systemStats">
                    System Statistics
                  </label>
                  <br />
                  <small className="text-muted">Server performance and usage metrics</small>
                </div>
              </div>
            </div>
          )}
          
          <div className="d-flex gap-2 mt-4">
            <Button 
              variant="outline-secondary" 
              onClick={() => {
                const allSelected = Object.values(selectedExportSections).every(val => val === true);
                const newState = {};
                Object.keys(selectedExportSections).forEach(key => {
                  newState[key] = !allSelected;
                });
                setSelectedExportSections(newState);
              }}
              size="sm"
            >
              {Object.values(selectedExportSections).every(val => val === true) ? 'Deselect All' : 'Select All'}
            </Button>
            <Button variant="success" onClick={() => exportData('stats')} disabled={!Object.values(selectedExportSections).some(val => val === true)}>
              Export Selected Data
            </Button>
          </div>
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
          {(() => {
            // Use the calculated refund stats from transaction data
            const paymentMethodsWithRefunds = { ...stats.paymentMethods };
            
            // Add calculated refund entries using the actual refund stats
            // Only show cards if there are refunds to display
            if (refundStats.pendingRefunds > 0 || refundStats.pendingRefundsCount > 0) {
              paymentMethodsWithRefunds['PENDING_REFUNDS'] = {
                total: refundStats.pendingRefunds,
                count: refundStats.pendingRefundsCount
              };
            }
            
            if (refundStats.completedRefunds > 0 || refundStats.completedRefundsCount > 0) {
              paymentMethodsWithRefunds['COMPLETED_REFUNDS'] = {
                total: refundStats.completedRefunds,
                count: refundStats.completedRefundsCount
              };
            }
            
            const paymentMethodsData = paymentMethodsWithRefunds;
            
            return Object.entries(paymentMethodsData || {}).map(([method, data], index) => {
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
            });
          })()
          }
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
                    <div className="w-100">
                      <p className="ada-stats-title text-muted mb-1">Top Delivery Location</p>
                      <h3 className="ada-stats-value mb-0" style={{fontSize: '1.4rem'}}>{stats.deliveryStats.topDeliveryLocations[0].location}</h3>
                      <p className="ada-stats-change text-success mb-0">
                        <i className="bi bi-box-seam me-1"></i>
                        {stats.deliveryStats.topDeliveryLocations[0].orders.toLocaleString()} orders
                      </p>
                    </div>
                  </div>
                </Card.Body>
              </Card>
            ) : (
              <Card className="ada-stats-card ada-stats-secondary h-100">
                <Card.Body>
                  <div className="d-flex align-items-center justify-content-between">
                    <div className="w-100">
                      <p className="ada-stats-title text-muted mb-1">Top Delivery Location</p>
                      <h3 className="ada-stats-value mb-0">No Data</h3>
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
