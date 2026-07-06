const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '..', 'data', 'sales.csv');

const REQUIRED_COLUMNS = [
  'order_id',
  'date',
  'region',
  'city',
  'category',
  'product',
  'customer_type',
  'sales_amount',
  'quantity',
  'discount',
  'profit',
  'channel',
  'status'
];

function parseCsvLine(line) {
  const result = [];
  let current = '';
  let insideQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"' && insideQuotes && next === '"') {
      current += '"';
      i += 1;
    } else if (char === '"') {
      insideQuotes = !insideQuotes;
    } else if (char === ',' && !insideQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current);
  return result;
}

function escapeCsv(value) {
  const text = String(value ?? '');
  if (text.includes(',') || text.includes('"') || text.includes('\n')) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function parseCsv(csvText) {
  const lines = csvText.trim().split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]).map((header) => header.trim());
  const missing = REQUIRED_COLUMNS.filter((column) => !headers.includes(column));

  if (missing.length > 0) {
    const error = new Error(`CSV missing required columns: ${missing.join(', ')}`);
    error.status = 400;
    throw error;
  }

  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const item = {};
    headers.forEach((header, index) => {
      item[header] = values[index] ?? '';
    });
    return normalizeRow(item);
  });
}

function normalizeRow(row) {
  return {
    order_id: String(row.order_id || '').trim(),
    date: String(row.date || '').trim(),
    region: String(row.region || '').trim(),
    city: String(row.city || '').trim(),
    category: String(row.category || '').trim(),
    product: String(row.product || '').trim(),
    customer_type: String(row.customer_type || '').trim(),
    sales_amount: Number(row.sales_amount || 0),
    quantity: Number(row.quantity || 0),
    discount: Number(row.discount || 0),
    profit: Number(row.profit || 0),
    channel: String(row.channel || '').trim(),
    status: String(row.status || '').trim()
  };
}

function loadSalesData() {
  const csvText = fs.readFileSync(DATA_FILE, 'utf-8');
  return parseCsv(csvText);
}

function appendSalesData(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return 0;

  const csvLines = rows.map((row) => REQUIRED_COLUMNS.map((column) => escapeCsv(row[column])).join(','));
  fs.appendFileSync(DATA_FILE, `\n${csvLines.join('\n')}`, 'utf-8');
  return rows.length;
}

function filterSalesData(rows, filters = {}) {
  return rows.filter((item) => {
    if (filters.dateFrom && item.date < filters.dateFrom) return false;
    if (filters.dateTo && item.date > filters.dateTo) return false;
    if (filters.region && filters.region !== 'All' && item.region !== filters.region) return false;
    if (filters.category && filters.category !== 'All' && item.category !== filters.category) return false;
    if (filters.channel && filters.channel !== 'All' && item.channel !== filters.channel) return false;
    if (filters.status && filters.status !== 'All' && item.status !== filters.status) return false;
    return true;
  });
}

function uniqueValues(rows, key) {
  return [...new Set(rows.map((row) => row[key]).filter(Boolean))].sort();
}

module.exports = {
  REQUIRED_COLUMNS,
  parseCsv,
  loadSalesData,
  appendSalesData,
  filterSalesData,
  uniqueValues
};
