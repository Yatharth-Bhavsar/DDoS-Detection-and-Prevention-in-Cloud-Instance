
const express = require('express');
const fs = require('fs');
const path = require('path');
const morgan = require('morgan');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Create logs directory if it doesn't exist
const logDirectory = path.join(__dirname, 'logs');
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);

// Create a write stream for logging
const accessLogStream = fs.createWriteStream(
  path.join(logDirectory, 'access.log'),
  { flags: 'a' }
);

// Custom morgan format that includes more details
morgan.token('host', (req) => req.hostname);
morgan.token('body', (req) => JSON.stringify(req.body));
morgan.token('user-agent', (req) => req.headers['user-agent']);

// Setup middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Log all requests to the log file with custom format
app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] ":referrer" ":user-agent" :body', { stream: accessLogStream }));

// Log requests to console during development
app.use(morgan('dev'));

// Serve static files
app.use(express.static(path.join(__dirname, '../public')));

// API endpoint to get logs
app.get('/api/logs', (req, res) => {
  try {
    const logFile = path.join(logDirectory, 'access.log');
    
    // Check if the log file exists
    if (!fs.existsSync(logFile)) {
      return res.status(404).json({ error: 'Log file not found' });
    }
    
    // Read the log file
    const logs = fs.readFileSync(logFile, 'utf8')
      .split('\n')
      .filter(line => line.trim() !== '')
      .map((line, index) => {
        try {
          // Parse each log line and add an ID
          const parts = line.match(/^(.*?) - (.*?) \[(.*?)\] "(.*?)" (\d+) (\d+|-) "(.*?)" "(.*?)"(.*)$/);
          if (!parts) return { id: index, raw: line };
          
          const [, ip, user, dateStr, request, status, size, referrer, userAgent, body] = parts;
          
          return {
            id: index,
            timestamp: new Date(dateStr.replace('/', ' ')),
            ip,
            user: user === '-' ? 'anonymous' : user,
            request,
            status: parseInt(status),
            size: size === '-' ? 0 : parseInt(size),
            referrer: referrer === '-' ? '' : referrer,
            userAgent,
            body: body ? body.trim() : '',
            raw: line
          };
        } catch (err) {
          return { id: index, raw: line, error: 'Parse error' };
        }
      })
      .reverse(); // Most recent logs first
    
    res.json({ logs });
  } catch (error) {
    console.error('Error reading logs:', error);
    res.status(500).json({ error: 'Failed to retrieve logs' });
  }
});

// Example route that will be logged
app.post('/api/message', (req, res) => {
  console.log('Received message:', req.body);
  res.json({ success: true, message: 'Message received' });
});

// Catch-all route to return the main page for any unmatched frontend routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

module.exports = app;