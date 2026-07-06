require('dotenv').config();

const express = require('express');
const path = require('path');
const {
  parseCsv,
  loadSalesData,
  appendSalesData,
  filterSalesData,
  uniqueValues
} = require('./src/dataService');
const {
  buildSummary,
  buildMonthlyTrend,
  buildGroupMetrics,
  buildTopProducts,
  buildOrderTable,
  getDataHealth
} = require('./src/analyticsService');
const { login, requireAuth, requireRole, users } = require('./src/authService');
const { buildAiReport } = require('./src/reportService');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json({ limit: '4mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function getFilters(req) {
  return {
    dateFrom: req.query.dateFrom,
    dateTo: req.query.dateTo,
    region: req.query.region,
    category: req.query.category,
    channel: req.query.channel,
    status: req.query.status
  };
}

function getFilteredRows(req) {
  const rows = loadSalesData();
  return filterSalesData(rows, getFilters(req));
}

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', project: 'Sales Analytics Dashboard' });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const result = login(email, password);

  if (!result) {
    return res.status(401).json({ message: 'Invalid email or password.' });
  }

  return res.json(result);
});

app.get('/api/auth/demo-users', (req, res) => {
  res.json(
    users.map((user) => ({
      email: user.email,
      password: user.password,
      role: user.role,
      name: user.name
    }))
  );
});

app.get('/api/metadata', requireAuth, (req, res) => {
  const rows = loadSalesData();
  res.json({
    regions: ['All', ...uniqueValues(rows, 'region')],
    categories: ['All', ...uniqueValues(rows, 'category')],
    channels: ['All', ...uniqueValues(rows, 'channel')],
    statuses: ['All', ...uniqueValues(rows, 'status')],
    minDate: rows.map((row) => row.date).sort()[0],
    maxDate: rows.map((row) => row.date).sort().at(-1)
  });
});

app.get('/api/dashboard', requireAuth, (req, res) => {
  const rows = getFilteredRows(req);
  res.json({
    summary: buildSummary(rows),
    trend: buildMonthlyTrend(rows),
    categories: buildGroupMetrics(rows, 'category'),
    regions: buildGroupMetrics(rows, 'region'),
    channels: buildGroupMetrics(rows, 'channel'),
    topProducts: buildTopProducts(rows),
    dataHealth: getDataHealth(rows)
  });
});

app.get('/api/orders', requireAuth, (req, res) => {
  const rows = getFilteredRows(req);
  const page = Number(req.query.page || 1);
  const pageSize = Number(req.query.pageSize || 12);
  res.json(buildOrderTable(rows, page, pageSize));
});

app.post('/api/report/ai', requireAuth, async (req, res) => {
  const rows = filterSalesData(loadSalesData(), req.body.filters || {});
  const report = await buildAiReport(rows, req.body.filters || {});
  res.json(report);
});

app.post('/api/import/csv', requireAuth, requireRole(['sales_manager', 'data_analyst']), (req, res, next) => {
  try {
    const csvText = req.body.csvText || '';
    const rows = parseCsv(csvText);

    if (rows.length === 0) {
      return res.status(400).json({ message: 'No valid data rows found in CSV.' });
    }

    const count = appendSalesData(rows);
    return res.json({ message: 'CSV data imported successfully.', importedRows: count });
  } catch (error) {
    return next(error);
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((error, req, res, next) => {
  const status = error.status || 500;
  res.status(status).json({ message: error.message || 'Internal server error.' });
});

app.listen(PORT, () => {
  console.log(`Sales Analytics Dashboard running at http://localhost:${PORT}`);
});
