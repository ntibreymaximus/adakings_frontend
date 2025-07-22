/**
 * Debug utility for refund calculations
 * This helps diagnose why refunds are showing 0 when there are overpayments
 */

export const debugRefundCalculations = (transactions, dateRange) => {
  console.log('🔍 DEBUG REFUND CALCULATIONS');
  console.log('==========================');
  console.log(`Date Range: ${dateRange.startDate} to ${dateRange.endDate}`);
  console.log(`Total Transactions: ${transactions.length}`);
  
  const today = new Date().toISOString().split('T')[0];
  console.log(`Today's Date: ${today}`);
  
  // Filter transactions for date range
  const filteredTransactions = transactions.filter(transaction => {
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
    
    return matchesDateRange || matchesUTCRange || matchesLocalRange;
  });
  
  console.log(`Filtered Transactions: ${filteredTransactions.length}`);
  
  // Debug overpaid transactions
  const overpaidTransactions = filteredTransactions.filter(t => 
    t.status?.toLowerCase() === 'overpaid'
  );
  
  console.log(`\nOVERPAID TRANSACTIONS: ${overpaidTransactions.length}`);
  overpaidTransactions.forEach((transaction, index) => {
    const amount = parseFloat(transaction.amount) || 0;
    const orderTotal = parseFloat(transaction.order_total) || 0;
    const overpaidAmount = amount - orderTotal;
    
    console.log(`\n${index + 1}. Transaction ID: ${transaction.transaction_id || transaction.id}`);
    console.log(`   Order Number: ${transaction.order_number}`);
    console.log(`   Date: ${transaction.created_at || transaction.date}`);
    console.log(`   Status: ${transaction.status}`);
    console.log(`   Amount Paid: ₵${amount.toFixed(2)}`);
    console.log(`   Order Total: ₵${orderTotal.toFixed(2)}`);
    console.log(`   Overpaid Amount: ₵${overpaidAmount.toFixed(2)}`);
    console.log(`   Payment Type: ${transaction.payment_type}`);
  });
  
  // Debug explicit refund transactions
  const refundTransactions = filteredTransactions.filter(t => 
    t.payment_type === 'Refund' || 
    t.payment_type === 'refund' || 
    (t.payment_type && t.payment_type.toLowerCase() === 'refund') ||
    (parseFloat(t.amount) || 0) < 0
  );
  
  console.log(`\nEXPLICIT REFUND TRANSACTIONS: ${refundTransactions.length}`);
  refundTransactions.forEach((transaction, index) => {
    const amount = parseFloat(transaction.amount) || 0;
    
    console.log(`\n${index + 1}. Transaction ID: ${transaction.transaction_id || transaction.id}`);
    console.log(`   Order Number: ${transaction.order_number}`);
    console.log(`   Date: ${transaction.created_at || transaction.date}`);
    console.log(`   Status: ${transaction.status}`);
    console.log(`   Amount: ₵${Math.abs(amount).toFixed(2)}`);
    console.log(`   Payment Type: ${transaction.payment_type}`);
  });
  
  // Calculate totals
  let pendingRefunds = 0;
  let completedRefunds = 0;
  let pendingRefundsCount = 0;
  let completedRefundsCount = 0;
  
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
  
  console.log('\n📊 REFUND SUMMARY');
  console.log('==================');
  console.log(`Pending Refunds: ₵${pendingRefunds.toFixed(2)} (${pendingRefundsCount} transactions)`);
  console.log(`Completed Refunds: ₵${completedRefunds.toFixed(2)} (${completedRefundsCount} transactions)`);
  console.log(`Total Refunds: ₵${(pendingRefunds + completedRefunds).toFixed(2)}`);
  
  return {
    pendingRefunds,
    pendingRefundsCount,
    completedRefunds,
    completedRefundsCount,
    overpaidTransactions,
    refundTransactions,
    filteredTransactions
  };
};

// Export a function to be called from console for debugging
window.debugRefunds = (dateRange = null) => {
  const today = new Date().toISOString().split('T')[0];
  const range = dateRange || { startDate: today, endDate: today };
  
  // Try to get transactions from the ViewTransactionsPage or StatsPage
  const transactionsFromState = window.__DEBUG_TRANSACTIONS__ || [];
  
  if (transactionsFromState.length === 0) {
    console.error('No transactions found. Make sure you are on ViewTransactionsPage or StatsPage.');
    return;
  }
  
  return debugRefundCalculations(transactionsFromState, range);
};
