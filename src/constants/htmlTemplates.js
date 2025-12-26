export const htmlTemplates = [
  {
    id: 'chart-plotly',
    name: 'Plotly Chart',
    category: 'visualization',
    description: 'Interactive Plotly.js chart template',
    template: `<div id="chart"></div>
<script src="https://cdn.plot.ly/plotly-2.27.0.min.js"></script>
<script>
  var data = [{
    x: [1, 2, 3, 4, 5],
    y: [1, 6, 3, 6, 1],
    type: 'scatter',
    mode: 'lines+markers',
    marker: { color: '#14B8A6', size: 10 }
  }];

  var layout = {
    title: 'Your Chart Title',
    xaxis: { title: 'X Axis' },
    yaxis: { title: 'Y Axis' }
  };

  Plotly.newPlot('chart', data, layout);
</script>`,
  },
  {
    id: 'chart-d3',
    name: 'D3.js Visualization',
    category: 'visualization',
    description: 'D3.js data visualization template',
    template: `<div id="d3-chart"></div>
<script src="https://d3js.org/d3.v7.min.js"></script>
<script>
  const width = 600;
  const height = 400;
  const data = [30, 86, 168, 281, 303, 365];

  const svg = d3.select("#d3-chart")
    .append("svg")
    .attr("width", width)
    .attr("height", height);

  svg.selectAll("rect")
    .data(data)
    .enter()
    .append("rect")
    .attr("x", (d, i) => i * 70)
    .attr("y", d => height - d)
    .attr("width", 65)
    .attr("height", d => d)
    .attr("fill", "#14B8A6");
</script>`,
  },
  {
    id: 'svg-chart',
    name: 'SVG Chart',
    category: 'visualization',
    description: 'Static SVG chart template',
    template: `<svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
  <rect x="50" y="100" width="80" height="200" fill="#14B8A6" />
  <rect x="150" y="150" width="80" height="150" fill="#8B5CF6" />
  <rect x="250" y="80" width="80" height="220" fill="#EC4899" />
  <text x="300" y="30" font-size="20" fill="#15171A">Your Chart Title</text>
</svg>`,
  },
  {
    id: 'stat-card',
    name: 'Statistics Card',
    category: 'stats',
    description: 'Styled statistics display card',
    template: `<div style="max-width: 600px; padding: 24px; background: linear-gradient(135deg, #14B8A6 0%, #8B5CF6 100%); border-radius: 12px; color: white; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
  <h3 style="margin: 0 0 16px 0; font-size: 24px; font-weight: 600;">Urban Data Insight</h3>
  <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-top: 20px;">
    <div style="background: rgba(255,255,255,0.1); padding: 16px; border-radius: 8px; backdrop-filter: blur(10px);">
      <div style="font-size: 32px; font-weight: 700;">1,234</div>
      <div style="opacity: 0.9; font-size: 14px; margin-top: 4px;">Population</div>
    </div>
    <div style="background: rgba(255,255,255,0.1); padding: 16px; border-radius: 8px; backdrop-filter: blur(10px);">
      <div style="font-size: 32px; font-weight: 700;">56%</div>
      <div style="opacity: 0.9; font-size: 14px; margin-top: 4px;">Growth Rate</div>
    </div>
    <div style="background: rgba(255,255,255,0.1); padding: 16px; border-radius: 8px; backdrop-filter: blur(10px);">
      <div style="font-size: 32px; font-weight: 700;">89</div>
      <div style="opacity: 0.9; font-size: 14px; margin-top: 4px;">Density</div>
    </div>
  </div>
</div>`,
  },
  {
    id: 'code-snippet',
    name: 'Code Block',
    category: 'content',
    description: 'Syntax-highlighted code snippet',
    template: `<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css">
<script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
<pre><code class="language-python">
import pandas as pd
import matplotlib.pyplot as plt

# Load urban data
data = pd.read_csv('urban_stats.csv')

# Create visualization
plt.figure(figsize=(10, 6))
plt.plot(data['year'], data['population'])
plt.title('Urban Population Growth')
plt.show()
</code></pre>
<script>hljs.highlightAll();</script>`,
  },
  {
    id: 'map-leaflet',
    name: 'Interactive Map',
    category: 'visualization',
    description: 'Leaflet.js interactive map',
    template: `<div id="map" style="height: 400px; border-radius: 8px;"></div>
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
  var map = L.map('map').setView([51.505, -0.09], 13);

  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);

  L.marker([51.5, -0.09]).addTo(map)
    .bindPopup('Your location marker')
    .openPopup();
</script>`,
  },
  {
    id: 'table-styled',
    name: 'Data Table',
    category: 'content',
    description: 'Styled data table',
    template: `<div style="overflow-x: auto; border-radius: 8px; border: 1px solid #E5E7EB;">
  <table style="width: 100%; border-collapse: collapse; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;">
    <thead style="background: #F9FAFB;">
      <tr>
        <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #15171A;">Metric</th>
        <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #15171A;">Value</th>
        <th style="padding: 12px 16px; text-align: left; font-weight: 600; color: #15171A;">Change</th>
      </tr>
    </thead>
    <tbody>
      <tr style="border-top: 1px solid #E5E7EB;">
        <td style="padding: 12px 16px;">Population Density</td>
        <td style="padding: 12px 16px;">2,500/km²</td>
        <td style="padding: 12px 16px; color: #10B981;">+5.2%</td>
      </tr>
      <tr style="border-top: 1px solid #E5E7EB;">
        <td style="padding: 12px 16px;">Housing Units</td>
        <td style="padding: 12px 16px;">45,600</td>
        <td style="padding: 12px 16px; color: #10B981;">+2.1%</td>
      </tr>
      <tr style="border-top: 1px solid #E5E7EB;">
        <td style="padding: 12px 16px;">Green Space</td>
        <td style="padding: 12px 16px;">12.3%</td>
        <td style="padding: 12px 16px; color: #EF4444;">-1.5%</td>
      </tr>
    </tbody>
  </table>
</div>`,
  },
];

export const getTemplatesByCategory = (category) => {
  return htmlTemplates.filter(template => template.category === category);
};

export const getTemplateById = (id) => {
  return htmlTemplates.find(template => template.id === id);
};
