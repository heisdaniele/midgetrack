// track.js

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Replace with your actual Supabase credentials
const SUPABASE_URL = 'https://nauwlyivjdzbuqarrxmf.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5hdXdseWl2amR6YnVxYXJyeG1mIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mzg2NjI2OTUsImV4cCI6MjA1NDIzODY5NX0.YxqnVIauv2LWUIEWtBi7lSluUqTy6P2BwereAYNHgF8'; // shortened for clarity
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let locationChart, deviceChart, trendChart;

// A larger color palette (feel free to add/remove colors).
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

    // 2. Extract the alias from the last path segment
    const alias = shortUrl.split('/').pop();

    // 3. Look up which table & record (custom_urls or main_urls) belongs to that alias
    const { recordId, urlType } = await findUrlRecord(alias);
    if (!recordId) throw new Error('URL not found');

    // 4. Fetch click-event data
    const clicksData = await fetchClickData(recordId, urlType);

    // 5. Update summary (like total clicks, average intervals, etc.)
    updateSummary(clicksData);

    // 6. Render or update Chart.js charts
    await renderCharts(clicksData);

    // Show the summary & chart sections if hidden
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

// Looks in custom_urls first, then main_urls
async function findUrlRecord(alias) {
  // Check custom_urls
  const { data: customData } = await supabase
    .from('custom_urls')
    .select('id')
    .eq('custom_alias', alias)
    .single();

  if (customData) {
    return { recordId: customData.id, urlType: 'custom' };
  }

  // Otherwise check main_urls
  const { data: mainData } = await supabase
    .from('main_urls')
    .select('id')
    .eq('short_url', alias)
    .single();

  return mainData ? { recordId: mainData.id, urlType: 'main' } : { recordId: null };
}

// Fetch click-events from Supabase
async function fetchClickData(recordId, urlType) {
  const { data, error } = await supabase
    .from('click_events')
    .select('*')
    .eq('url_id', recordId)
    .eq('url_type', urlType);

  if (error) throw new Error('Failed to fetch data');
  return data;
}

// Show total clicks & average intervals
function updateSummary(clicksData) {
  document.getElementById('clickCount').textContent = clicksData.length;
  document.getElementById('avgInterval').textContent = calculateAverageInterval(clicksData);
}

// Compute average interval between clicks
function calculateAverageInterval(clicksData) {
  if (clicksData.length < 2) return 'Not enough data';

  const timestamps = clicksData
    .map(click => new Date(click.timestamp).getTime())
    .sort((a, b) => a - b);

  let totalDiff = 0;
  for (let i = 1; i < timestamps.length; i++) {
    totalDiff += (timestamps[i] - timestamps[i - 1]);
  }
  const avgMs = totalDiff / (timestamps.length - 1);
  return formatInterval(avgMs);
}

// Convert milliseconds into a friendly “X min Y seconds” string
function formatInterval(ms) {
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds} second${seconds !== 1 ? 's' : ''}`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes} minute${minutes !== 1 ? 's' : ''} ${remainingSeconds} second${remainingSeconds !== 1 ? 's' : ''}`;
}

// Create or update the Chart.js charts
async function renderCharts(clicksData) {
  // Destroy existing charts if they already exist
  if (locationChart) locationChart.destroy();
  if (deviceChart) deviceChart.destroy();
  if (trendChart) trendChart.destroy();

  // Tally data
  const { locations, devices, dates } = clicksData.reduce((acc, click) => {
    const loc = click.location || 'Unknown';
    const dev = click.device_type || 'Unknown';
    const dateStr = new Date(click.timestamp).toLocaleDateString();

    acc.locations[loc] = (acc.locations[loc] || 0) + 1;
    acc.devices[dev] = (acc.devices[dev] || 0) + 1;
    acc.dates[dateStr] = (acc.dates[dateStr] || 0) + 1;
    return acc;
  }, { locations: {}, devices: {}, dates: {} });

  // Give containers a short moment to size themselves
  await new Promise(resolve => setTimeout(resolve, 300));

  // 1) Location Chart with large palette
  const locationLabels = Object.keys(locations);
  const locationData = Object.values(locations);
  const locationColors = locationLabels.map((_, i) => colorPalette[i % colorPalette.length]);

  locationChart = createChart('locationChart', 'doughnut', {
    labels: locationLabels,
    data: locationData,
    backgroundColor: locationColors,
    title: 'Clicks by Location'
  });

  // 2) Device Chart with large palette
  const deviceLabels = Object.keys(devices);
  const deviceData = Object.values(devices);
  const deviceColors = deviceLabels.map((_, i) => colorPalette[i % colorPalette.length]);

  deviceChart = createChart('deviceChart', 'bar', {
    labels: deviceLabels,
    data: deviceData,
    backgroundColor: deviceColors,
    title: 'Clicks by Device Type'
  });

  // 3) Trend Chart - single dataset color
  // For line charts, typically a single color is enough
  trendChart = createChart('trendChart', 'line', {
    labels: Object.keys(dates),
    data: Object.values(dates),
    borderColor: '#FF5722',
    backgroundColor: '#FFCCBC',
    title: 'Clicks Over Time'
  });

  // Force a window resize so the charts reflow properly
  setTimeout(() => window.dispatchEvent(new Event('resize')), 300);
}

// Helper to create a single Chart.js instance
function createChart(canvasId, chartType, { labels, data, backgroundColor, borderColor, title }) {
  const ctx = document.getElementById(canvasId);
  return new Chart(ctx, {
    type: chartType,
    data: {
      labels,
      datasets: [{
        label: title,
        data,
        backgroundColor,
        borderColor,
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
      animation: {
        duration: 300
      }
    }
  });
}
