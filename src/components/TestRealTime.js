import React from 'react';
import { useRealTimeOrders, useRealTimeTransactions, useRealTimeDashboardStats } from '../hooks/useRealTimeData';

const TestRealTime = () => {
  const ordersData = useRealTimeOrders(10000); // 10 second refresh for testing
  const transactionsData = useRealTimeTransactions(10000); // 10 second refresh for testing
  const dashboardData = useRealTimeDashboardStats(15000); // 15 second refresh for testing

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>Real-Time Data Test</h1>
      
      <div style={{ marginBottom: '30px' }}>
        <h2>Orders Data</h2>
        <p>Loading: {ordersData.loading ? 'Yes' : 'No'}</p>
        <p>Error: {ordersData.error || 'None'}</p>
        <p>Last Updated: {ordersData.lastUpdated?.toLocaleTimeString() || 'Never'}</p>
        <p>Auto-refresh: {ordersData.isAutoRefreshEnabled ? 'Enabled' : 'Disabled'}</p>
        <p>Orders Count: {ordersData.data?.length || 0}</p>
        <button onClick={ordersData.refreshData}>Refresh Now</button>
        
        {ordersData.data?.slice(0, 3).map(order => (
          <div key={order.id} style={{ 
            border: '1px solid #ccc', 
            padding: '10px', 
            margin: '10px 0',
            borderRadius: '5px' 
          }}>
            <p><strong>Order #{order.order_number}</strong></p>
            <p>Status: {order.status}</p>
            <p>Time Ago: <strong>{order.time_ago || 'No time_ago field'}</strong></p>
            <p>Created: {new Date(order.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>Transactions Data</h2>
        <p>Loading: {transactionsData.loading ? 'Yes' : 'No'}</p>
        <p>Error: {transactionsData.error || 'None'}</p>
        <p>Last Updated: {transactionsData.lastUpdated?.toLocaleTimeString() || 'Never'}</p>
        <p>Auto-refresh: {transactionsData.isAutoRefreshEnabled ? 'Enabled' : 'Disabled'}</p>
        <p>Transactions Count: {transactionsData.data?.length || 0}</p>
        <button onClick={transactionsData.refreshData}>Refresh Now</button>
        
        {transactionsData.data?.slice(0, 3).map(transaction => (
          <div key={transaction.id} style={{ 
            border: '1px solid #ccc', 
            padding: '10px', 
            margin: '10px 0',
            borderRadius: '5px' 
          }}>
            <p><strong>Transaction #{transaction.id}</strong></p>
            <p>Status: {transaction.status}</p>
            <p>Time Ago: <strong>{transaction.time_ago || 'No time_ago field'}</strong></p>
            <p>Created: {new Date(transaction.created_at).toLocaleString()}</p>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '30px' }}>
        <h2>Dashboard Data</h2>
        <p>Loading: {dashboardData.loading ? 'Yes' : 'No'}</p>
        <p>Error: {dashboardData.error || 'None'}</p>
        <p>Last Updated: {dashboardData.lastUpdated?.toLocaleTimeString() || 'Never'}</p>
        <p>Auto-refresh: {dashboardData.isAutoRefreshEnabled ? 'Enabled' : 'Disabled'}</p>
        <p>Total Orders: {dashboardData.data?.totalOrders || 0}</p>
        <p>Total Revenue: ₵{dashboardData.data?.totalRevenue?.toFixed(2) || '0.00'}</p>
        <button onClick={dashboardData.refreshData}>Refresh Now</button>
        
        <h3>Recent Activity:</h3>
        {dashboardData.data?.recentActivity?.slice(0, 3).map((activity, index) => (
          <div key={activity.id || index} style={{ 
            border: '1px solid #ccc', 
            padding: '10px', 
            margin: '10px 0',
            borderRadius: '5px' 
          }}>
            <p><strong>{activity.title}</strong></p>
            <p>Time Ago: <strong>{activity.timeAgo}</strong></p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TestRealTime;
