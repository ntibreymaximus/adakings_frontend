import React, { useState, useEffect } from 'react';
import { useTransactionData } from '../hooks/useTransactionData';
import transactionDataService from '../services/transactionDataService';

const StatsDebugger = () => {
  const [debugData, setDebugData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  const {
    transactions: allTransactions,
    getTransactionsByDate,
    getTransactionStats
  } = useTransactionData({
    autoRefresh: false
  });

  useEffect(() => {
    const runDiagnostics = async () => {
      try {
        const today = new Date().toISOString().split('T')[0];
        
        // Get today's transactions using the unified service
        const todayTransactions = getTransactionsByDate(today);
        const todayStats = getTransactionStats(todayTransactions);
        
        // Manual calculation for comparison
        const manualStats = {
          total: todayTransactions.length,
          totalAmount: 0,
          successful: 0,
          refunds: []
        };
        
        todayTransactions.forEach(transaction => {
          const amount = parseFloat(transaction.amount) || 0;
          const isRefund = transaction.payment_type === 'refund' || 
                          transaction.payment_type === 'Refund' || 
                          transaction.type === 'refund' ||
                          (transaction.amount && parseFloat(transaction.amount) < 0);
          
          if (isRefund) {
            manualStats.refunds.push({
              id: transaction.id,
              amount,
              type: transaction.payment_type,
              order: transaction.order_number
            });
          } else {
            manualStats.totalAmount += amount;
          }
          
          const status = transaction.status?.toLowerCase() || '';
          if (['paid', 'overpaid', 'success', 'completed'].includes(status) && !isRefund) {
            manualStats.successful++;
          }
        });
        
        // Get raw API data for comparison
        const token = localStorage.getItem('token');
        const apiResponse = await fetch('http://localhost:8000/api/payments/transaction-table/', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const rawApiData = await apiResponse.json();
        
        setDebugData({
          today,
          todayTransactions: todayTransactions.length,
          unifiedServiceStats: todayStats,
          manualCalculation: manualStats,
          rawApiResponse: {
            isArray: Array.isArray(rawApiData),
            hasTransactions: !!rawApiData.transactions,
            hasData: !!rawApiData.data,
            hasResults: !!rawApiData.results,
            totalCount: Array.isArray(rawApiData) ? rawApiData.length : 
                       (rawApiData.transactions?.length || rawApiData.data?.length || rawApiData.results?.length || 0)
          },
          allTransactionsCount: allTransactions?.length || 0,
          sampleTransactions: todayTransactions.slice(0, 3).map(t => ({
            id: t.id,
            amount: t.amount,
            payment_type: t.payment_type,
            status: t.status,
            order_number: t.order_number,
            date: t.created_at || t.date,
            isRefund: t.payment_type === 'refund' || 
                     t.payment_type === 'Refund' || 
                     t.type === 'refund' ||
                     (t.amount && parseFloat(t.amount) < 0)
          }))
        });
        
      } catch (error) {
        console.error('Debug diagnostics error:', error);
        setDebugData({ error: error.message });
      } finally {
        setLoading(false);
      }
    };
    
    if (allTransactions && allTransactions.length > 0) {
      runDiagnostics();
    } else if (!loading) {
      setLoading(false);
    }
  }, [allTransactions, getTransactionsByDate, getTransactionStats]);

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading diagnostics...</div>;
  }

  if (!debugData) {
    return <div style={{ padding: '20px' }}>No debug data available</div>;
  }

  if (debugData.error) {
    return <div style={{ padding: '20px', color: 'red' }}>Error: {debugData.error}</div>;
  }

  return (
    <div style={{ 
      padding: '20px', 
      fontFamily: 'monospace', 
      fontSize: '12px', 
      maxHeight: '80vh', 
      overflow: 'auto',
      background: '#f5f5f5',
      border: '1px solid #ccc'
    }}>
      <h3>PWA Dashboard Stats Debugger</h3>
      
      <div style={{ marginBottom: '20px' }}>
        <h4>Date & Transaction Counts</h4>
        <div>Today: {debugData.today}</div>
        <div>Today's Transactions: {debugData.todayTransactions}</div>
        <div>All Transactions Loaded: {debugData.allTransactionsCount}</div>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h4>Unified Service Stats</h4>
        <pre>{JSON.stringify(debugData.unifiedServiceStats, null, 2)}</pre>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h4>Manual Calculation</h4>
        <pre>{JSON.stringify(debugData.manualCalculation, null, 2)}</pre>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h4>Raw API Response Analysis</h4>
        <pre>{JSON.stringify(debugData.rawApiResponse, null, 2)}</pre>
      </div>
      
      <div style={{ marginBottom: '20px' }}>
        <h4>Sample Today's Transactions</h4>
        <pre>{JSON.stringify(debugData.sampleTransactions, null, 2)}</pre>
      </div>
      
      <div style={{ marginTop: '20px' }}>
        <button 
          onClick={() => window.location.reload()} 
          style={{ 
            padding: '8px 16px', 
            background: '#007bff', 
            color: 'white', 
            border: 'none', 
            borderRadius: '4px' 
          }}
        >
          Refresh Diagnostics
        </button>
      </div>
    </div>
  );
};

export default StatsDebugger;
