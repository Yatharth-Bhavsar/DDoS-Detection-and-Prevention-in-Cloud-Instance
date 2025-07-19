const express = require('express');
const fs = require('fs');
const app = express();
const port = 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  // Once the response is finished
  res.on('finish', () => {
    const duration = Date.now() - start;
    const log = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      responseTime: duration,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('user-agent'),
      headers: req.headers
    };
    
    console.log(`${log.method} ${log.path} ${log.status} ${log.responseTime}ms`);
    
    // Save the log
    try {
      let logs = [];
      if (fs.existsSync('./request-logs.json')) {
        const logsData = fs.readFileSync('./request-logs.json', 'utf8');
        logs = JSON.parse(logsData);
      }
      
      logs.push(log);
      
      // Keep only the latest 1000 logs
      if (logs.length > 1000) {
        logs = logs.slice(logs.length - 1000);
      }
      
      fs.writeFileSync('./request-logs.json', JSON.stringify(logs, null, 2));
    } catch (error) {
      console.error('Error saving log:', error);
    }
  });
  
  next();
});

// Create logs file if it doesn't exist
if (!fs.existsSync('./request-logs.json')) {
  fs.writeFileSync('./request-logs.json', '[]');
}

// API endpoint to get logs
app.get('/api/logs', (req, res) => {
  try {
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

// Simple ping endpoint
app.get('/api/ping', (req, res) => {
  res.json({
    status: 'ok',
    server: 'http://54.83.113.89',
    timestamp: new Date().toISOString()
  });
});