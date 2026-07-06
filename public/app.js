const state = {
  token: localStorage.getItem('sales_dashboard_token') || '',
  user: JSON.parse(localStorage.getItem('sales_dashboard_user') || 'null'),
  dashboard: null
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

function money(value) {
  return `$${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

function percent(value) {
  return `${Number(value || 0).toFixed(2)}%`;
}

async function apiFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(state.token ? { Authorization: `Bearer ${state.token}` } : {})
    }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Request failed.');
  }
  return data;
}

function getFilters() {
  return {
    dateFrom: $('#dateFrom').value,
    dateTo: $('#dateTo').value,
    region: $('#regionFilter').value,
    category: $('#categoryFilter').value,
    channel: $('#channelFilter').value,
    status: $('#statusFilter').value
  };
}

function buildQuery(filters) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value && value !== 'All') params.set(key, value);
  });
  return params.toString();
}

function showApp() {
  $('#loginView').classList.add('hidden');
  $('#appView').classList.remove('hidden');
  $('#userName').textContent = state.user?.name || 'User';
  $('#userRole').textContent = state.user?.role || '';
}

function showLogin() {
  $('#loginView').classList.remove('hidden');
  $('#appView').classList.add('hidden');
}

async function login() {
  $('#loginError').textContent = '';
  try {
    const result = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({
        email: $('#email').value.trim(),
        password: $('#password').value.trim()
      })
    });

    state.token = result.token;
    state.user = result.user;
    localStorage.setItem('sales_dashboard_token', state.token);
    localStorage.setItem('sales_dashboard_user', JSON.stringify(state.user));
    showApp();
    await initDashboard();
  } catch (error) {
    $('#loginError').textContent = error.message;
  }
}

function logout() {
  state.token = '';
  state.user = null;
  localStorage.removeItem('sales_dashboard_token');
  localStorage.removeItem('sales_dashboard_user');
  showLogin();
}

async function initMetadata() {
  const metadata = await apiFetch('/api/metadata');
  fillSelect('#regionFilter', metadata.regions);
  fillSelect('#categoryFilter', metadata.categories);
  fillSelect('#channelFilter', metadata.channels);
  fillSelect('#statusFilter', metadata.statuses);
  $('#dateFrom').value = metadata.minDate;
  $('#dateTo').value = metadata.maxDate;
}

function fillSelect(selector, values) {
  const select = $(selector);
  select.innerHTML = values.map((item) => `<option value="${item}">${item}</option>`).join('');
}

async function initDashboard() {
  await initMetadata();
  await loadDashboard();
}

async function loadDashboard() {
  const query = buildQuery(getFilters());
  const [dashboard, orders] = await Promise.all([
    apiFetch(`/api/dashboard?${query}`),
    apiFetch(`/api/orders?${query}`)
  ]);

  state.dashboard = dashboard;
  renderSummary(dashboard.summary);
  renderTrend(dashboard.trend);
  renderBars('#categoryChart', dashboard.categories, 'revenue');
  renderBars('#regionChart', dashboard.regions, 'revenue');
  renderDataHealth(dashboard.dataHealth);
  renderOrders(orders);
}

function renderSummary(summary) {
  $('#totalRevenue').textContent = money(summary.totalRevenue);
  $('#totalProfit').textContent = money(summary.totalProfit);
  $('#totalOrders').textContent = summary.totalOrders.toLocaleString();
  $('#profitMargin').textContent = percent(summary.profitMargin);
}

function renderTrend(trend) {
  const container = $('#trendChart');
  if (!trend.length) {
    container.innerHTML = '<p class="muted-text">No trend data available.</p>';
    return;
  }

  const width = 760;
  const height = 280;
  const padding = 42;
  const maxRevenue = Math.max(...trend.map((item) => item.revenue), 1);
  const maxProfit = Math.max(...trend.map((item) => item.profit), 1);
  const maxValue = Math.max(maxRevenue, maxProfit);
  const stepX = trend.length === 1 ? 0 : (width - padding * 2) / (trend.length - 1);

  const points = trend.map((item, index) => {
    const x = padding + stepX * index;
    const y = height - padding - (item.revenue / maxValue) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  const profitPoints = trend.map((item, index) => {
    const x = padding + stepX * index;
    const y = height - padding - (item.profit / maxValue) * (height - padding * 2);
    return `${x},${y}`;
  }).join(' ');

  const labels = trend.map((item, index) => {
    const x = padding + stepX * index;
    return `<text x="${x}" y="${height - 10}" text-anchor="middle" font-size="11" fill="#64748b">${item.month.slice(2)}</text>`;
  }).join('');

  container.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" role="img" aria-label="Monthly trend chart">
      <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#e2e8f0" />
      <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#e2e8f0" />
      <polyline fill="none" stroke="#2563eb" stroke-width="4" points="${points}" />
      <polyline fill="none" stroke="#14b8a6" stroke-width="4" points="${profitPoints}" />
      ${labels}
      <text x="${width - 170}" y="26" font-size="12" fill="#2563eb">Revenue</text>
      <text x="${width - 90}" y="26" font-size="12" fill="#14b8a6">Profit</text>
    </svg>
  `;
}

function renderBars(selector, rows, metric) {
  const container = $(selector);
  const items = rows.slice(0, 6);
  const max = Math.max(...items.map((item) => item[metric]), 1);

  container.innerHTML = items.map((item) => {
    const width = Math.max(5, (item[metric] / max) * 100);
    return `
      <div class="bar-row">
        <div class="bar-label">
          <span>${item.name}</span>
          <span>${money(item[metric])}</span>
        </div>
        <div class="bar-track"><div class="bar-fill" style="width:${width}%"></div></div>
      </div>
    `;
  }).join('');
}

function renderDataHealth(health) {
  $('#dataHealth').innerHTML = [
    ['数据行数', health.totalRows],
    ['已完成订单', health.completedRows],
    ['退款订单', health.refundedRows],
    ['待处理订单', health.pendingRows],
    ['重复订单号', health.duplicateOrderIds],
    ['缺失关键字段', health.missingRows]
  ].map(([label, value]) => `
    <div class="health-item">
      <span>${label}</span>
      <strong>${Number(value).toLocaleString()}</strong>
    </div>
  `).join('');
}

function renderOrders(data) {
  $('#orderTotal').textContent = `${data.total} orders`;
  $('#ordersTable').innerHTML = data.records.map((item) => `
    <tr>
      <td>${item.order_id}</td>
      <td>${item.date}</td>
      <td>${item.region}</td>
      <td>${item.category}</td>
      <td>${item.product}</td>
      <td>${money(item.sales_amount)}</td>
      <td>${money(item.profit)}</td>
      <td><span class="status ${item.status}">${item.status}</span></td>
    </tr>
  `).join('');
}

async function generateReport() {
  $('#reportList').innerHTML = '<div class="report-item">正在生成报告...</div>';
  showSection('reportSection');

  try {
    const result = await apiFetch('/api/report/ai', {
      method: 'POST',
      body: JSON.stringify({ filters: getFilters() })
    });
    $('#reportMode').textContent = result.mode;
    $('#reportList').innerHTML = result.report.map((item) => `<div class="report-item">${item}</div>`).join('');
  } catch (error) {
    $('#reportList').innerHTML = `<div class="report-item">${error.message}</div>`;
  }
}

async function uploadCsv() {
  const file = $('#csvFileInput').files[0];
  if (!file) {
    $('#importResult').textContent = '请先选择 CSV 文件。';
    return;
  }

  const csvText = await file.text();
  try {
    const result = await apiFetch('/api/import/csv', {
      method: 'POST',
      body: JSON.stringify({ csvText })
    });
    $('#importResult').textContent = `${result.message}\nImported rows: ${result.importedRows}`;
    await loadDashboard();
  } catch (error) {
    $('#importResult').textContent = error.message;
  }
}

function showSection(sectionId) {
  $$('.section').forEach((section) => section.classList.remove('active-section'));
  $(`#${sectionId}`).classList.add('active-section');
  $$('.nav-item').forEach((item) => item.classList.toggle('active', item.dataset.section === sectionId));
}

function bindEvents() {
  $('#loginButton').addEventListener('click', login);
  $('#password').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') login();
  });
  $('#logoutButton').addEventListener('click', logout);
  $('#refreshButton').addEventListener('click', loadDashboard);
  $('#applyFilterButton').addEventListener('click', loadDashboard);
  $('#generateReportButton').addEventListener('click', generateReport);
  $('#aiReportQuickButton').addEventListener('click', generateReport);
  $('#uploadCsvButton').addEventListener('click', uploadCsv);
  $$('.nav-item').forEach((button) => {
    button.addEventListener('click', () => showSection(button.dataset.section));
  });
}

bindEvents();

if (state.token && state.user) {
  showApp();
  initDashboard().catch(logout);
} else {
  showLogin();
}
