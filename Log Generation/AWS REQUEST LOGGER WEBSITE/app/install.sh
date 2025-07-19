#!/bin/bash

# EC2 Complete Installation Script
echo "Starting server setup..."

# Update system packages
sudo yum update -y

# Install Node.js and npm
echo "Installing Node.js..."
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
source ~/.bashrc
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install 16
nvm use 16

# Install Git
echo "Installing Git..."
sudo yum install git -y

# Create project directory structure
echo "Creating project structure..."
mkdir -p ~/app/public/css
mkdir -p ~/app/public/js
mkdir -p ~/app/server/logs
mkdir -p ~/app/server/routes

# Set up Node.js project
cd ~/app
npm init -y
npm install express cors morgan mongoose dotenv

# Create necessary files with content
echo "Creating server files..."

# Create .env file
cat > ~/app/.env << 'EOL'
PORT=3000
MONGODB_URI=mongodb://localhost:27017/requestLogger
EOL

# Create server app.js
cat > ~/app/server/app.js << 'EOL'
const express = require('express');
const path = require('path');
const fs = require('fs');
const morgan = require('morgan');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Create a write stream for logging
const accessLogStream = fs.createWriteStream(
  path.join(logsDir, 'access.log'), 
  { flags: 'a' }
);

// Setup middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('combined', { stream: accessLogStream }));

// Additional custom logging middleware
app.use((req, res, next) => {
  const logEntry = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    referrer: req.get('Referrer') || '',
  };
  
  // Write to a JSON log file
  const logFilePath = path.join(logsDir, 'requests.json');
  
  // Read existing logs or create new array
  let logs = [];
  if (fs.existsSync(logFilePath)) {
    try {
      const fileContent = fs.readFileSync(logFilePath, 'utf8');
      logs = JSON.parse(fileContent);
    } catch (e) {
      console.error('Error reading log file:', e);
    }
  }
  
  // Add new log and write back
  logs.push(logEntry);
  fs.writeFileSync(logFilePath, JSON.stringify(logs, null, 2));
  
  next();
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.get('/api/logs', (req, res) => {
  const logFilePath = path.join(logsDir, 'requests.json');
  
  if (fs.existsSync(logFilePath)) {
    try {
      const logs = JSON.parse(fs.readFileSync(logFilePath, 'utf8'));
      res.json(logs);
    } catch (e) {
      res.status(500).json({ error: 'Error reading logs' });
    }
  } else {
    res.json([]);
  }
});

// Catch-all route to serve the frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
EOL

# Create HTML file
echo "Creating frontend files..."
cat > ~/app/public/index.html << 'EOL'
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Request Logger Dashboard</title>
  <link rel="stylesheet" href="/css/styles.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
</head>
<body>
  <header>
    <div class="container">
      <h1><i class="fas fa-server"></i> Request Logger Dashboard</h1>
      <p>Real-time monitoring of all requests to your AWS EC2 server</p>
    </div>
  </header>
  
  <nav>
    <div class="container">
      <ul>
        <li><a href="#" class="active"><i class="fas fa-chart-line"></i> Dashboard</a></li>
        <li><a href="#"><i class="fas fa-cog"></i> Settings</a></li>
        <li><a href="#"><i class="fas fa-question-circle"></i> Help</a></li>
      </ul>
      <div class="refresh-container">
        <button id="refresh-btn" class="refresh-btn">
          <i class="fas fa-sync-alt"></i> Refresh Logs
        </button>
        <span class="last-updated">Last updated: Never</span>
      </div>
    </div>
  </nav>
  
  <main class="container">
    <div class="dashboard">
      <section class="stats-section">
        <div class="stat-card">
          <h3>Total Requests</h3>
          <p id="total-requests">0</p>
        </div>
        <div class="stat-card">
          <h3>GET Requests</h3>
          <p id="get-requests">0</p>
        </div>
        <div class="stat-card">
          <h3>POST Requests</h3>
          <p id="post-requests">0</p>
        </div>
        <div class="stat-card">
          <h3>Unique IPs</h3>
          <p id="unique-ips">0</p>
        </div>
      </section>

      <section class="filters-section">
        <h2>Request Logs</h2>
        <div class="filter-controls">
          <div class="search-box">
            <input type="text" id="search-input" placeholder="Search logs...">
            <button id="search-btn"><i class="fas fa-search"></i></button>
          </div>
          <div class="filter-dropdown">
            <select id="method-filter">
              <option value="all">All Methods</option>
              <option value="GET">GET</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="DELETE">DELETE</option>
            </select>
          </div>
        </div>
      </section>

      <section class="logs-section">
        <div class="table-container">
          <table id="logs-table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Method</th>
                <th>URL</th>
                <th>IP Address</th>
                <th>User Agent</th>
              </tr>
            </thead>
            <tbody id="logs-body">
              <!-- Logs will be loaded here -->
              <tr class="no-logs">
                <td colspan="5">No logs found. Generate some traffic to your server!</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="pagination">
          <button id="prev-page" disabled><i class="fas fa-chevron-left"></i> Previous</button>
          <span id="page-info">Page 1 of 1</span>
          <button id="next-page" disabled>Next <i class="fas fa-chevron-right"></i></button>
        </div>
      </section>
    </div>
  </main>

  <footer>
    <div class="container">
      <p>&copy; 2025 Request Logger Dashboard | Running on AWS EC2</p>
    </div>
  </footer>

  <script src="/js/main.js"></script>
</body>
</html>
EOL

# Create CSS file
cat > ~/app/public/css/styles.css << 'EOL'
/* Reset and Base Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

:root {
  --primary-color: #3498db;
  --secondary-color: #2c3e50;
  --accent-color: #e74c3c;
  --light-bg: #f8f9fa;
  --dark-bg: #343a40;
  --text-color: #333;
  --light-text: #f8f9fa;
  --success-color: #2ecc71;
  --warning-color: #f39c12;
  --danger-color: #e74c3c;
  --border-radius: 4px;
  --shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
  --transition: all 0.3s ease;
}

body {
  font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  line-height: 1.6;
  color: var(--text-color);
  background-color: #f0f2f5;
}

.container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 15px;
}

/* Header Styles */
header {
  background-color: var(--primary-color);
  color: white;
  padding: 20px 0;
  box-shadow: var(--shadow);
}

header h1 {
  font-size: 28px;
  font-weight: 500;
  margin-bottom: 5px;
  display: flex;
  align-items: center;
}

header h1 i {
  margin-right: 10px;
}

header p {
  font-size: 16px;
  opacity: 0.9;
}

/* Navigation Styles */
nav {
  background-color: white;
  box-shadow: var(--shadow);
  margin-bottom: 20px;
}

nav .container {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

nav ul {
  display: flex;
  list-style: none;
}

nav ul li a {
  display: flex;
  align-items: center;
  color: var(--text-color);
  text-decoration: none;
  padding: 15px 20px;
  transition: var(--transition);
}

nav ul li a i {
  margin-right: 8px;
}

nav ul li a:hover, nav ul li a.active {
  color: var(--primary-color);
  background-color: rgba(52, 152, 219, 0.1);
}

.refresh-container {
  display: flex;
  align-items: center;
}

.refresh-btn {
  display: flex;
  align-items: center;
  background-color: var(--primary-color);
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: var(--border-radius);
  cursor: pointer;
  transition: var(--transition);
}

.refresh-btn i {
  margin-right: 8px;
}

.refresh-btn:hover {
  background-color: #2980b9;
}

.last-updated {
  margin-left: 15px;
  font-size: 14px;
  color: #666;
}

/* Dashboard Styles */
.dashboard {
  background-color: white;
  border-radius: 8px;
  box-shadow: var(--shadow);
  margin-bottom: 30px;
  overflow: hidden;
}

/* Stats Section */
.stats-section {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 20px;
  padding: 20px;
  background-color: #f8f9fa;
  border-bottom: 1px solid #e9ecef;
}

.stat-card {
  background-color: white;
  padding: 20px;
  border-radius: var(--border-radius);
  box-shadow: var(--shadow);
  text-align: center;
  transition: var(--transition);
}

.stat-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
}

.stat-card h3 {
  font-size: 16px;
  color: #666;
  margin-bottom: 10px;
}

.stat-card p {
  font-size: 32px;
  font-weight: 600;
  color: var(--primary-color);
}

/* Filters Section */
.filters-section {
  padding: 20px;
  border-bottom: 1px solid #e9ecef;
}

.filters-section h2 {
  margin-bottom: 15px;
  font-size: 20px;
  color: var(--secondary-color);
}

.filter-controls {
  display: flex;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 15px;
}

.search-box {
  display: flex;
  flex: 1;
  max-width: 400px;
}

.search-box input {
  flex: 1;
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: var(--border-radius) 0 0 var(--border-radius);
  outline: none;
}

.search-box button {
  background-color: var(--primary-color);
  color: white;
  border: none;
  padding: 0 15px;
  border-radius: 0 var(--border-radius) var(--border-radius) 0;
  cursor: pointer;
}

.filter-dropdown select {
  padding: 10px 15px;
  border: 1px solid #ddd;
  border-radius: var(--border-radius);
  background-color: white;
  outline: none;
  cursor: pointer;
}

/* Logs Section */
.logs-section {
  padding: 0 20px 20px;
}

.table-container {
  overflow-x: auto;
  margin-bottom: 20px;
}

table {
  width: 100%;
  border-collapse: collapse;
}

table th, table td {
  padding: 12px 15px;
  text-align: left;
  border-bottom: 1px solid #e9ecef;
}

table th {
  background-color: #f8f9fa;
  font-weight: 500;
  color: var(--secondary-color);
}

table tbody tr:hover {
  background-color: rgba(52, 152, 219, 0.05);
}

.no-logs {
  text-align: center;
  color: #666;
  font-style: italic;
}

/* HTTP Method Styles */
.method {
  display: inline-block;
  padding: 5px 10px;
  border-radius: var(--border-radius);
  font-weight: 500;
}

.method-get {
  background-color: rgba(46, 204, 113, 0.2);
  color: #27ae60;
}

.method-post {
  background-color: rgba(52, 152, 219, 0.2);
  color: #2980b9;
}

.method-put {
  background-color: rgba(243, 156, 18, 0.2);
  color: #d35400;
}

.method-delete {
  background-color: rgba(231, 76, 60, 0.2);
  color: #c0392b;
}

/* Pagination */
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
}

.pagination button {
  background-color: white;
  border: 1px solid #ddd;
  padding: 8px 15px;
  border-radius: var(--border-radius);
  cursor: pointer;
  display: flex;
  align-items: center;
  transition: var(--transition);
}

.pagination button:hover:not(:disabled) {
  background-color: var(--primary-color);
  color: white;
  border-color: var(--primary-color);
}

.pagination button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.pagination button i {
  margin: 0 5px;
}

/* Footer */
footer {
  background-color: var(--secondary-color);
  color: white;
  padding: 20px 0;
  text-align: center;
  margin-top: 40px;
}

/* Responsive Adjustments */
@media (max-width: 768px) {
  .stats-section {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .filter-controls {
    flex-direction: column;
  }
  
  .search-box {
    max-width: 100%;
  }
}

@media (max-width: 576px) {
  .stats-section {
    grid-template-columns: 1fr;
  }
  
  nav .container {
    flex-direction: column;
    padding: 10px 0;
  }
  
  .refresh-container {
    margin-top: 10px;
    width: 100%;
    justify-content: space-between;
    padding: 0 20px 10px;
  }
}
EOL

# Create JavaScript file
cat > ~/app/public/js/main.js << 'EOL'
document.addEventListener('DOMContentLoaded', function() {
  // DOM Elements
  const logsTable = document.getElementById('logs-body');
  const refreshBtn = document.getElementById('refresh-btn');
  const lastUpdated = document.querySelector('.last-updated');
  const totalRequests = document.getElementById('total-requests');
  const getRequests = document.getElementById('get-requests');
  const postRequests = document.getElementById('post-requests');
  const uniqueIps = document.getElementById('unique-ips');
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');
  const methodFilter = document.getElementById('method-filter');
  const prevPageBtn = document.getElementById('prev-page');
  const nextPageBtn = document.getElementById('next-page');
  const pageInfo = document.getElementById('page-info');
  
  // Pagination state
  let currentPage = 1;
  let itemsPerPage = 10;
  let totalPages = 1;
  let filteredLogs = [];
  
  // Fetch logs from server
  async function fetchLogs() {
    try {
      const response = await fetch('/api/logs');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const logs = await response.json();
      return logs.reverse(); // Show newest logs first
    } catch (error) {
      console.error('Error fetching logs:', error);
      return [];
    }
  }
  
  // Format date for display
  function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString();
  }
  
  // Update statistics
  function updateStats(logs) {
    totalRequests.textContent = logs.length;
    
    const getMethods = logs.filter(log => log.method === 'GET').length;
    getRequests.textContent = getMethods;
    
    const postMethods = logs.filter(log => log.method === 'POST').length;
    postRequests.textContent = postMethods;
    
    const uniqueIpCount = new Set(logs.map(log => log.ip)).size;
    uniqueIps.textContent = uniqueIpCount;
  }
  
  // Apply method CSS class
  function getMethodClass(method) {
    switch(method.toUpperCase()) {
      case 'GET': return 'method-get';
      case 'POST': return 'method-post';
      case 'PUT': return 'method-put';
      case 'DELETE': return 'method-delete';
      default: return '';
    }
  }
  
  // Filter logs based on search and method filter
  function filterLogs(logs) {
    const searchTerm = searchInput.value.toLowerCase();
    const methodValue = methodFilter.value;
    
    return logs.filter(log => {
      // Apply method filter
      if (methodValue !== 'all' && log.method !== methodValue) {
        return false;
      }
      
      // Apply search filter to multiple fields
      if (searchTerm) {
        return (
          log.url.toLowerCase().includes(searchTerm) ||
          log.ip.toLowerCase().includes(searchTerm) ||
          log.method.toLowerCase().includes(searchTerm) ||
          log.userAgent.toLowerCase().includes(searchTerm)
        );
      }
      
      return true;
    });
  }
  
  // Update pagination controls
  function updatePagination() {
    totalPages = Math.ceil(filteredLogs.length / itemsPerPage);
    if (currentPage > totalPages && totalPages > 0) {
      currentPage = totalPages;
    }
    
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
    
    pageInfo.textContent = `Page ${currentPage} of ${totalPages}`;
  }
  
  // Render logs to table
  function renderLogs(logs) {
    // Apply filters
    filteredLogs = filterLogs(logs);
    
    // Update pagination
    updatePagination();
    
    // Clear table
    logsTable.innerHTML = '';
    
    // Calculate slice for current page
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageSlice = filteredLogs.slice(startIndex, endIndex);
    
    // If no logs after filtering
    if (pageSlice.length === 0) {
      logsTable.innerHTML = `
        <tr class="no-logs">
          <td colspan="5">No logs found matching your criteria.</td>
        </tr>
      `;
      return;
    }
    
    // Add logs to table
    pageSlice.forEach(log => {
      const row = document.createElement('tr');
      
      row.innerHTML = `
        <td>${formatDate(log.timestamp)}</td>
        <td><span class="method ${getMethodClass(log.method)}">${log.method}</span></td>
        <td>${log.url}</td>
        <td>${log.ip}</td>
        <td>${log.userAgent}</td>
      `;
      
      logsTable.appendChild(row);
    });
  }
  
  // Load logs and update UI
  async function loadLogs() {
    const logs = await fetchLogs();
    updateStats(logs);
    renderLogs(logs);
    
    // Update last updated text
    const now = new Date();
    lastUpdated.textContent = `Last updated: ${now.toLocaleString()}`;
    
    // Add rotation animation during fetch
    refreshBtn.querySelector('i').classList.remove('fa-spin');
  }
  
  // Event Listeners
  refreshBtn.addEventListener('click', function() {
    refreshBtn.querySelector('i').classList.add('fa-spin');
    loadLogs();
  });
  
  searchBtn.addEventListener('click', function() {
    currentPage = 1;
    loadLogs();
  });
  
  searchInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      currentPage = 1;
      loadLogs();
    }
  });
  
  methodFilter.addEventListener('change', function() {
    currentPage = 1;
    loadLogs();
  });
  
  prevPageBtn.addEventListener('click', function() {
    if (currentPage > 1) {
      currentPage--;
      loadLogs();
    }
  });
  
  nextPageBtn.addEventListener('click', function() {
    if (currentPage < totalPages) {
      currentPage++;
      loadLogs();
    }
  });
  
  // Initial load
  loadLogs();
  
  // Set up automatic refresh every 30 seconds
  setInterval(loadLogs, 30000);
});
EOL

# Create a startup script
cat > ~/app/start.sh << 'EOL'
#!/bin/bash
cd ~/app
node server/app.js
EOL

chmod +x ~/app/start.sh

# Create a systemd service for auto-start
cat > /tmp/request-logger.service << 'EOL'
[Unit]
Description=Request Logger Web Application
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/app
ExecStart=/home/ec2-user/.nvm/nvm-exec node server/app.js
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOL

sudo mv /tmp/request-logger.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable request-logger.service
sudo systemctl start request-logger.service

# Configure security group (port 3000)
echo "NOTE: Make sure to open port 3000 in your EC2 security group!"
echo "You can do this in the EC2 Console under Security Groups."

echo "Installation complete! Your application is running at http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3000"