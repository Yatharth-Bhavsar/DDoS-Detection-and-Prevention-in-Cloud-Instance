/**
 * Simple request logger middleware for Express
 */
function requestLogger(req, res, next) {
  const timestamp = new Date().toISOString();
  const method = req.method;
  const url = req.originalUrl || req.url;
  const ip = req.ip || req.connection.remoteAddress;
  
  console.log(`[${timestamp}] ${method} ${url} - IP: ${ip}`);
  
  // Call next middleware
  next();
}

module.exports = requestLogger;
[ec2-user@ip-172-31-47-30 ~]$ cat request-logger.js
const fs = require('fs');
const path = require('path');

// Initialize empty logs array if no file exists
if (!fs.existsSync('./request-logs.json')) {
  fs.writeFileSync('./request-logs.json', '[]', 'utf8');
}

// Read existing logs
function getLogs() {
  try {
    const logsData = fs.readFileSync('./request-logs.json', 'utf8');
    return JSON.parse(logsData);
  } catch (error) {
    console.error('Error reading logs:', error);
    return [];
  }
}

// Save logs to file
function saveLogs(logs) {
  try {
    fs.writeFileSync('./request-logs.json', JSON.stringify(logs, null, 2), 'utf8');
  } catch (error) {
    console.error('Error saving logs:', error);
  }
}

// Request logger middleware
const requestLogger = (req, res, next) => {
  // Skip logging for static assets to reduce log size
  if (req.path.startsWith('/css/') || req.path.startsWith('/js/') || req.path.startsWith('/images/')) {
    return next();
  }

  const start = Date.now();
  
  // Capture the original end method
  const originalEnd = res.end;
  
  // Override the end method
  res.end = function(chunk, encoding) {
    // Calculate response time
    const responseTime = Date.now() - start;
    
    // Create log entry
    const logEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.originalUrl || req.url,
      status: res.statusCode,
      ip: req.ip || req.connection.remoteAddress,
      userAgent: req.get('User-Agent') || 'Unknown',
      responseTime: responseTime,
      headers: req.headers
    };
    
    // Get current logs
    const logs = getLogs();
    
    // Add new log to the beginning of the array
    logs.unshift(logEntry);
    
    // Limit logs to 1000 entries to prevent file size issues
    const trimmedLogs = logs.slice(0, 1000);
    
    // Save updated logs
    saveLogs(trimmedLogs);
    
    // Call original end method
    originalEnd.apply(res, arguments);
  };
  
  next();
};

module.exports = requestLogger;