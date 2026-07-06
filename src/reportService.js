const { buildSummary, buildGroupMetrics, buildMonthlyTrend, getDataHealth } = require('./analyticsService');

function formatMoney(value) {
  return `$${Number(value || 0).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}

function buildLocalReport(rows) {
  const summary = buildSummary(rows);
  const categories = buildGroupMetrics(rows, 'category');
  const regions = buildGroupMetrics(rows, 'region');
  const channels = buildGroupMetrics(rows, 'channel');
  const trend = buildMonthlyTrend(rows);
  const health = getDataHealth(rows);

  const topCategory = categories[0];
  const topRegion = regions[0];
  const topChannel = channels[0];
  const latestMonth = trend[trend.length - 1];
  const previousMonth = trend[trend.length - 2];

  let monthInsight = 'Not enough monthly data to compare recent performance.';
  if (latestMonth && previousMonth) {
    const diff = latestMonth.revenue - previousMonth.revenue;
    const direction = diff >= 0 ? 'increased' : 'decreased';
    monthInsight = `Latest monthly revenue ${direction} by ${formatMoney(Math.abs(diff))} compared with the previous month.`;
  }

  return [
    `Total revenue reached ${formatMoney(summary.totalRevenue)} with ${summary.totalOrders} orders and a profit margin of ${summary.profitMargin}%.`,
    topCategory ? `The strongest category is ${topCategory.name}, contributing ${formatMoney(topCategory.revenue)} in revenue.` : 'No category data is available.',
    topRegion ? `The strongest region is ${topRegion.name}, contributing ${formatMoney(topRegion.revenue)} in revenue.` : 'No region data is available.',
    topChannel ? `The leading sales channel is ${topChannel.name}, with ${formatMoney(topChannel.revenue)} in revenue.` : 'No channel data is available.',
    monthInsight,
    `Data quality check: ${health.totalRows} rows loaded, ${health.duplicateOrderIds} duplicate order IDs, ${health.missingRows} rows with key missing fields.`,
    'Suggested action: focus on high-profit categories, review refunded orders, and compare regional performance before setting next month targets.'
  ];
}

async function buildAiReport(rows, filters = {}) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const apiUrl = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions';
  const localReport = buildLocalReport(rows);

  if (!apiKey) {
    return {
      mode: 'local-rule-based',
      report: localReport
    };
  }

  const summary = buildSummary(rows);
  const categories = buildGroupMetrics(rows, 'category').slice(0, 5);
  const regions = buildGroupMetrics(rows, 'region').slice(0, 5);
  const trend = buildMonthlyTrend(rows).slice(-6);

  const prompt = `You are a business data analyst. Generate a concise sales analytics report in Chinese. Data summary: ${JSON.stringify({ summary, categories, regions, trend, filters })}. Provide 5 bullet points: performance overview, key growth point, risk, data quality, next action.`;

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: 'You are an enterprise business intelligence analyst.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3
      })
    });

    if (!response.ok) {
      return { mode: 'local-rule-based', report: localReport, warning: 'AI API request failed. Local report returned.' };
    }

    const data = await response.json();
    const content = data?.choices?.[0]?.message?.content || '';
    return {
      mode: 'deepseek-api',
      report: content.split(/\n+/).map((line) => line.replace(/^[-*]\s*/, '').trim()).filter(Boolean)
    };
  } catch (error) {
    return {
      mode: 'local-rule-based',
      report: localReport,
      warning: 'AI API unavailable. Local report returned.'
    };
  }
}

module.exports = {
  buildAiReport,
  buildLocalReport
};
