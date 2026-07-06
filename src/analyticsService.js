function round(value, digits = 2) {
  return Number(Number(value || 0).toFixed(digits));
}

function getMonth(dateText) {
  return dateText ? dateText.slice(0, 7) : 'Unknown';
}

function sum(rows, key) {
  return rows.reduce((total, item) => total + Number(item[key] || 0), 0);
}

function groupBy(rows, key) {
  return rows.reduce((map, item) => {
    const value = item[key] || 'Unknown';
    if (!map[value]) map[value] = [];
    map[value].push(item);
    return map;
  }, {});
}

function buildSummary(rows) {
  const totalRevenue = sum(rows.filter((item) => item.status !== 'Refunded'), 'sales_amount');
  const totalProfit = sum(rows, 'profit');
  const totalOrders = rows.length;
  const totalQuantity = sum(rows, 'quantity');
  const avgOrderValue = totalOrders === 0 ? 0 : totalRevenue / totalOrders;
  const profitMargin = totalRevenue === 0 ? 0 : (totalProfit / totalRevenue) * 100;
  const refundCount = rows.filter((item) => item.status === 'Refunded').length;

  return {
    totalRevenue: round(totalRevenue),
    totalProfit: round(totalProfit),
    totalOrders,
    totalQuantity,
    avgOrderValue: round(avgOrderValue),
    profitMargin: round(profitMargin),
    refundRate: totalOrders === 0 ? 0 : round((refundCount / totalOrders) * 100)
  };
}

function buildMonthlyTrend(rows) {
  const monthly = rows.reduce((map, item) => {
    const month = getMonth(item.date);
    if (!map[month]) {
      map[month] = { month, revenue: 0, profit: 0, orders: 0 };
    }
    if (item.status !== 'Refunded') map[month].revenue += Number(item.sales_amount || 0);
    map[month].profit += Number(item.profit || 0);
    map[month].orders += 1;
    return map;
  }, {});

  return Object.values(monthly)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((item) => ({
      month: item.month,
      revenue: round(item.revenue),
      profit: round(item.profit),
      orders: item.orders
    }));
}

function buildGroupMetrics(rows, key) {
  return Object.entries(groupBy(rows, key))
    .map(([name, items]) => ({
      name,
      revenue: round(sum(items.filter((item) => item.status !== 'Refunded'), 'sales_amount')),
      profit: round(sum(items, 'profit')),
      orders: items.length,
      quantity: sum(items, 'quantity')
    }))
    .sort((a, b) => b.revenue - a.revenue);
}

function buildTopProducts(rows) {
  return buildGroupMetrics(rows, 'product').slice(0, 8);
}

function buildOrderTable(rows, page = 1, pageSize = 12) {
  const sorted = [...rows].sort((a, b) => b.date.localeCompare(a.date));
  const total = sorted.length;
  const start = (page - 1) * pageSize;
  return {
    total,
    page,
    pageSize,
    records: sorted.slice(start, start + pageSize)
  };
}

function getDataHealth(rows) {
  const missingRows = rows.filter((row) => !row.order_id || !row.date || !row.region || !row.category).length;
  const duplicateOrderIds = rows.length - new Set(rows.map((row) => row.order_id)).size;
  return {
    totalRows: rows.length,
    missingRows,
    duplicateOrderIds,
    completedRows: rows.filter((row) => row.status === 'Completed').length,
    refundedRows: rows.filter((row) => row.status === 'Refunded').length,
    pendingRows: rows.filter((row) => row.status === 'Pending').length
  };
}

module.exports = {
  buildSummary,
  buildMonthlyTrend,
  buildGroupMetrics,
  buildTopProducts,
  buildOrderTable,
  getDataHealth
};
