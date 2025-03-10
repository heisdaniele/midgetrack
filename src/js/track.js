// track.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Replace with your actual Supabase credentials
const SUPABASE_URL = 'https://nauwlyivjdzbuqarrxmf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hdXdseWl2amR6YnVxYXJyeG1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2NjI2OTUsImV4cCI6MjA1NDIzODY5NX0.YxqnVIauv2LWUIEWtBi7lSluUqTy6P2BwereAYNHgF8';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let locationChart, deviceChart, trendChart;

// A larger color palette for charts.
const colorPalette = [
  '#4CAF50', '#2196F3', '#FFC107', '#FF5722', '#9C27B0', '#009688',
  '#673AB7', '#795548', '#E91E63', '#00BCD4', '#8BC34A', '#03A9F4',
  '#F44336', '#607D8B', '#9E9E9E', '#3F51B5', '#CDDC39', '#FF9800',
  '#8E24AA', '#AD1457'
];

document.getElementById('trackButton').addEventListener('click', async () => {
  const button = document.getElementById('trackButton');
  const originalText = button.innerHTML;
  button.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Tracking...`;
  button.disabled = true;

  try {
    // 1. Get the user’s short URL input
    const shortUrlInput = document.getElementById('shortUrlInput');
    const shortUrl = shortUrlInput.value.trim();
    if (!shortUrl) throw new Error('Please enter a URL');

    // 2. Extract the alias from the URL (last segment)
    const alias = shortUrl.split('/').pop();

    // 3. Look up the URL record in main_urls
    const { recordId } = await findUrlRecord(alias);
    if (!recordId) throw new Error('URL not found');

    // 4. Fetch click-event data for this URL
    const clicksData = await fetchClickData(recordId);

    // 5. Update summary (total clicks, unique clicks, average interval)
    updateSummary(clicksData);

    // 6. Render or update Chart.js charts
    await renderCharts(clicksData);

    // Reveal summary and chart sections if hidden
    document.getElementById('summary').classList.remove('hidden');
    document.getElementById('charts').classList.remove('hidden');
  } catch (error) {
    alert(error.message);
    document.getElementById('summary').classList.add('hidden');
    document.getElementById('charts').classList.add('hidden');
  } finally {
    button.innerHTML = originalText;
    button.disabled = false;
  }
});

// Look up the URL record in main_urls by alias
async function findUrlRecord(alias) {
  const { data, error } = await supabase
    .from('main_urls')
    .select('id')
    .eq('short_url', alias)
    .single();

  return data ? { recordId: data.id } : { recordId: null };
}

// Fetch click-events from click_events table by URL id
async function fetchClickData(recordId) {
  const { data, error } = await supabase
    .from('click_events')
    .select('*')
    .eq('url_id', recordId);

  if (error) throw new Error('Failed to fetch click data');
  return data;
}

// Update summary information on the page
function updateSummary(clicksData) {
  // Total clicks
  document.getElementById('clickCount').textContent = clicksData.length;

  // Unique clicks (by IP)
  const uniqueIPs = new Set(clicksData.map(click => click.ip_address));
  document.getElementById('uniqueClickCount').textContent = uniqueIPs.size;

  // Average interval between clicks
  document.getElementById('avgInterval').textContent = calculateAverageInterval(clicksData);
}

// Compute average interval between clicks
function calculateAverageInterval(clicksData) {
  if (clicksData.length < 2) return 'Not enough data';
  const timestamps = clicksData
    .map(click => new Date(click.created_at).getTime())
    .sort((a, b) => a - b);
  let totalDiff = 0;
  for (let i = 1; i < timestamps.length; i++) {
    totalDiff += timestamps[i] - timestamps[i - 1];
  }
  const avgMs = totalDiff / (timestamps.length - 1);
  return formatInterval(avgMs);
}

// Format milliseconds into a friendly string
function formatInterval(ms) {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes} minute${minutes !== 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
}

// Render charts using Chart.js
async function renderCharts(clicksData) {
  // Destroy existing charts if they exist
  if (locationChart) locationChart.destroy();
  if (deviceChart) deviceChart.destroy();
  if (trendChart) trendChart.destroy();

  // Aggregate click data
  const aggregated = clicksData.reduce((acc, click) => {
    const loc = click.location || 'Unknown';
    const dev = click.device || 'Unknown';
    const dateStr = new Date(click.created_at).toLocaleDateString();

    acc.locations[loc] = (acc.locations[loc] || 0) + 1;
    acc.devices[dev] = (acc.devices[dev] || 0) + 1;
    acc.dates[dateStr] = (acc.dates[dateStr] || 0) + 1;
    return acc;
  }, { locations: {}, devices: {}, dates: {} });

  // Allow time for container resizing
  await new Promise(resolve => setTimeout(resolve, 300));

  // 1) Location Chart (Doughnut)
  locationChart = createChart('locationChart', 'doughnut', {
    labels: Object.keys(aggregated.locations),
    data: Object.values(aggregated.locations),
    backgroundColor: Object.keys(aggregated.locations).map((_, i) => colorPalette[i % colorPalette.length]),
    title: 'Clicks by Location'
  });

  // 2) Device Chart (Bar)
  deviceChart = createChart('deviceChart', 'bar', {
    labels: Object.keys(aggregated.devices),
    data: Object.values(aggregated.devices),
    backgroundColor: Object.keys(aggregated.devices).map((_, i) => colorPalette[i % colorPalette.length]),
    title: 'Clicks by Device'
  });

  // 3) Trend Chart (Line)
  trendChart = createChart('trendChart', 'line', {
    labels: Object.keys(aggregated.dates),
    data: Object.values(aggregated.dates),
    borderColor: '#FF5722',
    backgroundColor: '#FFCCBC',
    title: 'Clicks Over Time'
  });

  // Trigger a resize event to force charts to reflow
  setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
}

// Helper to create a Chart.js instance
function createChart(canvasId, chartType, { labels, data, backgroundColor, borderColor, title }) {
  const ctx = document.getElementById(canvasId);
  return new Chart(ctx, {
    type: chartType,
    data: {
      labels,
      datasets: [{
        label: title,
        data,
        backgroundColor: backgroundColor || undefined,
        borderColor: borderColor || undefined,
        fill: chartType === 'line',
        tension: chartType === 'line' ? 0.3 : undefined
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom' },
        title: { display: true, text: title }
      },
      animation: { duration: 300 }
    }
  });
}
