// Global variables
let allLogs = [];
let currentPage = 1;
let logsPerPage = 10;
let searchTerm = '';

// DOM Elements

// Config
const LOCAL_SERVER = 'http://13.49.67.37:3000';  // Your dashboard server
const REMOTE_SERVER = 'http://54.83.113.89';     // The server you want to monitor
const logsTable = document.getElementById('logs-table');
const logsBody = document.getElementById('logs-body');
const emptyState = document.getElementById('empty-state');
const loading = document.getElementById('loading');
const totalRequestsEl = document.getElementById('total-requests');
const errorRequestsEl = document.getElementById('error-requests');
const successRateEl = document.getElementById('success-rate');
const lastRequestEl = document.getElementById('last-request');
const refreshBtn = document.getElementById('refresh-btn');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const pageInfoEl = document.getElementById('page-info');
const searchInput = document.getElementById('search-input');
const searchBtn = document.getElementById('search-btn');
const testRequestBtn = document.getElementById('test-request-btn');
const modal = document.getElementById('log-modal');
const modalClose = document.querySelector('.modal-content .close');

// Initialize the dashboard
document.addEventListener('DOMContentLoaded', () => {
    fetchLogs();
    
    // Event listeners
    refreshBtn.addEventListener('click', fetchLogs);
    prevPageBtn.addEventListener('click', () => changePage(-1));
    nextPageBtn.addEventListener('click', () => changePage(1));
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    testRequestBtn.addEventListener('click', sendTestRequest);
    modalClose.addEventListener('click', () => modal.style.display = 'none');
    window.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });
});
// Fetch logs from local server
app.get('/api/logs', (req, res) => {
  try {
    // Read and return logs from your local log file
    const logsData = fs.readFileSync('./request-logs.json', 'utf8');
    const logs = JSON.parse(logsData);
    res.json(logs);
  } catch (error) {
    console.error('Error retrieving logs:', error);
    res.status(500).json({
      error: 'Failed to retrieve logs',
      message: error.message
    });
  }
});

// Fetch and display logs from remote server
app.get('/api/remote-logs', async (req, res) => {
  try {
    // Fetch logs from the remote server
    const response = await axios.get(`${REMOTE_SERVER}/api/logs`, {
      timeout: 5000 // 5 second timeout
    });
    
    res.json({
      source: REMOTE_SERVER,
      logs: response.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching remote logs:', error);
    res.status(500).json({
      error: 'Failed to fetch remote logs',
      message: error.message,
      server: REMOTE_SERVER
    });
  }
});

// Check remote server status
app.get('/api/remote-status', async (req, res) => {
  try {
    // Simple ping to check if remote server is up
    const response = await axios.get(`${REMOTE_SERVER}/api/ping`, {
      timeout: 3000
    });
    
    res.json({
      status: 'online',
      server: REMOTE_SERVER,
      responseTime: response.data.timestamp ? 
        new Date().getTime() - new Date(response.data.timestamp).getTime() : null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error checking remote server status:', error);
    res.json({
      status: 'offline',
      server: REMOTE_SERVER,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Simple ping endpoint
app.get('/api/ping', (req, res) => {
  res.json({
    status: 'ok',
    server: LOCAL_SERVER,
    timestamp: new Date().toISOString()
  });
});

// Send test request to remote server
app.post('/api/send-test-request', async (req, res) => {
  try {
    const response = await axios.post(`${REMOTE_SERVER}/api/test-endpoint`, {
      source: LOCAL_SERVER,
      message: 'Test request from monitoring dashboard',
      timestamp: new Date().toISOString()
    }, {
      timeout: 5000
    });
    
    res.json({
      success: true,
      response: response.data,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error sending test request:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      server: REMOTE_SERVER
    });
  }
});

// Test endpoint to receive test requests
app.post('/api/test-endpoint', (req, res) => {
  console.log('Received test request:', req.body);
  res.json({
    status: 'received',
    timestamp: new Date().toISOString(),
    body: req.body
  });
});
// Fetch logs from the API
async function fetchLogs() {
    try {
        showLoading(true);

        const response = await fetch('/api/logs');
        const data = await response.json();
        
        if (data.logs && Array.isArray(data.logs)) {
            allLogs = data.logs;
            updateStats();
            handleSearch(); // This will filter and display the logs based on current search term
        } else {
            showEmptyState(true);
        }
    } catch (error) {
        console.error('Error fetching logs:', error);
        showEmptyState(true, 'Failed to load logs. Please try again.');
    } finally {
        showLoading(false);
    }
}

// Add page to view remote logs
app.get('/remote-logs', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'remote-logs.html'));
});

// Update dashboard statistics
function updateStats() {
    if (allLogs.length === 0) {
        totalRequestsEl.textContent = '0';
        errorRequestsEl.textContent = '0';
        successRateEl.textContent = '0%';
        lastRequestEl.textContent = 'Never';
        return;
    }

    const totalRequests = allLogs.length;
    const errorRequests = allLogs.filter(log => log.status >= 400).length;
    const successRate = totalRequests > 0 
        ? Math.round(((totalRequests - errorRequests) / totalRequests) * 100) 
        : 0;
    
    // Format the most recent timestamp
    const lastRequestTime = allLogs[0]?.timestamp 
        ? new Date(allLogs[0].timestamp).toLocaleString() 
        : 'Never';

    totalRequestsEl.textContent = totalRequests;
    errorRequestsEl.textContent = errorRequests;
    successRateEl.textContent = `${successRate}%`;
    lastRequestEl.textContent = lastRequestTime;
}

// Handle search functionality
function handleSearch() {
    searchTerm = searchInput.value.toLowerCase().trim();
    currentPage = 1; // Reset to first page when searching
    displayLogs();
}

// Display logs with pagination and search filtering
function displayLogs() {
    // Filter logs based on search term
    const filteredLogs = searchTerm 
        ? allLogs.filter(log => 
            (log.raw && log.raw.toLowerCase().includes(searchTerm)) ||
            (log.request && log.request.toLowerCase().includes(searchTerm)) ||
            (log.ip && log.ip.toLowerCase().includes(searchTerm)) ||
            (log.status && log.status.toString().includes(searchTerm))
          )
        : allLogs;
    
    // Calculate pagination
    const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
    const startIndex = (currentPage - 1) * logsPerPage;
    const endIndex = startIndex + logsPerPage;
    const currentLogs = filteredLogs.slice(startIndex, endIndex);
    
    // Update pagination controls
    pageInfoEl.textContent = `Page ${currentPage} of ${totalPages || 1}`;
    prevPageBtn.disabled = currentPage <= 1;
    nextPageBtn.disabled = currentPage >= totalPages;
    
    // Clear table body
    logsBody.innerHTML = '';
    
    // Show empty state if no logs
    if (currentLogs.length === 0) {
        showEmptyState(true, searchTerm ? 'No logs match your search criteria.' : 'No logs found.');
        logsTable.style.display = 'none';
        return;
    }
    
    // Show table and hide empty state
    showEmptyState(false);
    logsTable.style.display = 'table';
    
    // Populate table with current page logs
    currentLogs.forEach(log => {
        const tr = document.createElement('tr');
        
        // Parse request string to get method and path
        let method = 'Unknown';
        let path = '-';
        if (log.request) {
            const reqParts = log.request.split(' ');
            if (reqParts.length >= 2) {
                method = reqParts[0];
                path = reqParts[1];
            }
        }
        
        // Get status code class (2xx, 3xx, 4xx, 5xx)
        const statusClass = log.status ? `status-${Math.floor(log.status / 100)}xx` : '';
        
        // Format timestamp
        const timestamp = log.timestamp ? new Date(log.timestamp).toLocaleString() : '-';
        
        // Truncate user agent for display
        const userAgent = log.userAgent && log.userAgent.length > 30 
            ? log.userAgent.substring(0, 30) + '...' 
            : (log.userAgent || '-');
        
        tr.innerHTML = `
            <td>${timestamp}</td>
            <td><span class="method-badge method-${method}">${method}</span></td>
            <td>${path}</td>
            <td><span class="status-badge ${statusClass}">${log.status || '-'}</span></td>
            <td>${log.ip || '-'}</td>
            <td title="${log.userAgent || ''}">${userAgent}</td>
            <td><button class="action-btn" data-id="${log.id}">View Details</button></td>
        `;
        
        // Add event listener to the View Details button
        const detailsBtn = tr.querySelector('.action-btn');
        detailsBtn.addEventListener('click', () => showLogDetails(log));
        
        logsBody.appendChild(tr);
    });
}

// Change page for pagination
function changePage(direction) {
    currentPage += direction;
    displayLogs();
}

// Show loading state
function showLoading(isLoading) {
    loading.style.display = isLoading ? 'flex' : 'none';
}

// Show empty state with optional message
function showEmptyState(isEmpty, message = 'No logs found. Start making requests to see them appear here.') {
    if (isEmpty) {
        emptyState.style.display = 'flex';
        emptyState.querySelector('p').textContent = message;
    } else {
        emptyState.style.display = 'none';
    }
}

// Send a test request to generate a log entry
async function sendTestRequest() {
    try {
        showLoading(true);
        const timestamp = new Date().toISOString();
        
        const response = await fetch('/api/message', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Test message sent at ${timestamp}`,
                source: 'dashboard'
            })
        });
        
        if (response.ok) {
            // Wait a moment to ensure the log is written before refreshing
            setTimeout(fetchLogs, 500);
        } else {
            alert('Failed to send test request. Please try again.');
        }
    } catch (error) {
        console.error('Error sending test request:', error);
        alert('Error sending test request. Please check your connection.');
    } finally {
        showLoading(false);
    }
}

// Show log details in modal
function showLogDetails(log) {
    const detailContainer = document.querySelector('.log-detail-container');
    
    // Format timestamp
    const timestamp = log.timestamp ? new Date(log.timestamp).toLocaleString() : '-';
    
    // Parse request string to get method, path, and HTTP version
    let method = 'Unknown';
    let path = '-';
    let httpVersion = '-';
    if (log.request) {
        const reqParts = log.request.split(' ');
        if (reqParts.length >= 3) {
            method = reqParts[0];
            path = reqParts[1];
            httpVersion = reqParts[2];
        }
    }
    
    // Create HTML for details
    detailContainer.innerHTML = `
        <div class="detail-item">
            <h4>Timestamp</h4>
            <p>${timestamp}</p>
        </div>
        <div class="detail-item">
            <h4>IP Address</h4>
            <p>${log.ip || '-'}</p>
        </div>
        <div class="detail-item">
            <h4>User</h4>
            <p>${log.user || '-'}</p>
        </div>
        <div class="detail-item">
            <h4>Method</h4>
            <p>${method}</p>
        </div>
        <div class="detail-item">
            <h4>Path</h4>
            <p>${path}</p>
        </div>
        <div class="detail-item">
            <h4>HTTP Version</h4>
            <p>${httpVersion}</p>
        </div>
        <div class="detail-item">
            <h4>Status Code</h4>
            <p>${log.status || '-'}</p>
        </div>
        <div class="detail-item">
            <h4>Response Size</h4>
            <p>${log.size || '-'} bytes</p>
        </div>
        <div class="detail-item">
            <h4>Referrer</h4>
            <p>${log.referrer || '-'}</p>
        </div>
        <div class="detail-item">
            <h4>User Agent</h4>
            <p>${log.userAgent || '-'}</p>
        </div>
        <div class="detail-item">
            <h4>Request Body</h4>
            <p>${log.body || '-'}</p>
        </div>
        <div class="detail-item raw-log">
            <h4>Raw Log</h4>
            <pre>${log.raw || '-'}</pre>
        </div>
    `;
    
    // Show modal
    modal.style.display = 'block';
}

// Auto-refresh logs every minute
setInterval(fetchLogs, 60000);