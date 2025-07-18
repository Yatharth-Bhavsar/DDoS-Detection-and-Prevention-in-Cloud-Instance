// app.js - Main Express application
const express = require('express');
const path = require('path');
const AWS = require('aws-sdk');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// Configure AWS
AWS.config.update({
  region: process.env.AWS_REGION || 'us-east-1'
});

const cloudwatch = new AWS.CloudWatch();
const cloudwatchLogs = new AWS.CloudWatchLogs();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Blocked IPs store (for simulation)
const blockedIPs = new Set();

// API endpoints
app.get('/api/metrics/cpu', async (req, res) => {
  try {
    const result = await cloudwatch.getMetricData({
      MetricDataQueries: [
        {
          Id: 'cpu',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/EC2',
              MetricName: 'CPUUtilization',
              Dimensions: [
                {
                  Name: 'InstanceId',
                  Value: process.env.TARGET_INSTANCE_ID
                }
              ]
            },
            Period: 60,
            Stat: 'Average'
          },
          ReturnData: true
        }
      ],
      StartTime: new Date(Date.now() - 3600000), // Last hour
      EndTime: new Date()
    }).promise();
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching CPU metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/metrics/network', async (req, res) => {
  try {
    const result = await cloudwatch.getMetricData({
      MetricDataQueries: [
        {
          Id: 'networkIn',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/EC2',
              MetricName: 'NetworkIn',
              Dimensions: [
                {
                  Name: 'InstanceId',
                  Value: process.env.TARGET_INSTANCE_ID
                }
              ]
            },
            Period: 60,
            Stat: 'Average'
          },
          ReturnData: true
        },
        {
          Id: 'networkOut',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/EC2',
              MetricName: 'NetworkOut',
              Dimensions: [
                {
                  Name: 'InstanceId',
                  Value: process.env.TARGET_INSTANCE_ID
                }
              ]
            },
            Period: 60,
            Stat: 'Average'
          },
          ReturnData: true
        }
      ],
      StartTime: new Date(Date.now() - 3600000), // Last hour
      EndTime: new Date()
    }).promise();
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching network metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/metrics/packets', async (req, res) => {
  try {
    const result = await cloudwatch.getMetricData({
      MetricDataQueries: [
        {
          Id: 'packetsIn',
          MetricStat: {
            Metric: {
              Namespace: 'CWAgent',
              MetricName: 'packets_recv',
              Dimensions: [
                {
                  Name: 'InstanceId',
                  Value: process.env.TARGET_INSTANCE_ID
                },
                {
                  Name: 'interface',
                  Value: 'eth0'
                }
              ]
            },
            Period: 60,
            Stat: 'Sum'
          },
          ReturnData: true
        },
        {
          Id: 'packetsOut',
          MetricStat: {
            Metric: {
              Namespace: 'CWAgent',
              MetricName: 'packets_sent',
              Dimensions: [
                {
                  Name: 'InstanceId',
                  Value: process.env.TARGET_INSTANCE_ID
                },
                {
                  Name: 'interface',
                  Value: 'eth0'
                }
              ]
            },
            Period: 60,
            Stat: 'Sum'
          },
          ReturnData: true
        }
      ],
      StartTime: new Date(Date.now() - 3600000), // Last hour
      EndTime: new Date()
    }).promise();
    
    res.json(result);
  } catch (error) {
    console.error('Error fetching packet metrics:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/logs', async (req, res) => {
  try {
    // Get logs from CloudWatch Logs
    const logGroups = ['httpd-access-logs'];
    let logEvents = [];

    for (const logGroup of logGroups) {
      const logStreams = await cloudwatchLogs.describeLogStreams({
        logGroupName: logGroup,
        orderBy: 'LastEventTime',
        descending: true,
        limit: 1
      }).promise();

      if (logStreams.logStreams && logStreams.logStreams.length > 0) {
        const logStreamName = logStreams.logStreams[0].logStreamName;
        
        const events = await cloudwatchLogs.getLogEvents({
          logGroupName: logGroup,
          logStreamName: logStreamName,
          limit: 50,
          startFromHead: false
        }).promise();
        
        if (events.events) {
          // Parse Apache logs to extract IP, timestamp, and request type
          logEvents = events.events.map(event => {
            const logMessage = event.message;
            // Simple regex to extract IP address, might need adjustment based on log format
            const ipMatch = logMessage.match(/^(\d+\.\d+\.\d+\.\d+)/);
            const ip = ipMatch ? ipMatch[1] : 'Unknown';
            
            // Extract HTTP method (GET, POST, etc.)
            const methodMatch = logMessage.match(/"([A-Z]+) /);
            const method = methodMatch ? methodMatch[1] : 'Unknown';
            
            return {
              timestamp: event.timestamp,
              message: event.message,
              ip,
              method,
              blocked: blockedIPs.has(ip)
            };
          });
        }
      }
    }
    
    res.json(logEvents);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/alarms', async (req, res) => {
  try {
    const result = await cloudwatch.describeAlarms({
      AlarmNames: ['HighCPUUsage', 'HighNetworkTraffic']
    }).promise();
    
    res.json(result.MetricAlarms);
  } catch (error) {
    console.error('Error fetching alarms:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/block-ip', (req, res) => {
  const { ip } = req.body;
  
  if (!ip) {
    return res.status(400).json({ error: 'IP address is required' });
  }
  
  // Add IP to blocked list (simulation only)
  blockedIPs.add(ip);
  console.log(`Blocked IP: ${ip}`);
  
  // Update clients with new blocked IP list
  io.emit('blocked-ips-updated', Array.from(blockedIPs));
  
  res.json({ success: true, message: `IP ${ip} has been blocked`, blocked: Array.from(blockedIPs) });
});

app.get('/api/blocked-ips', (req, res) => {
  res.json(Array.from(blockedIPs));
});

// Socket.io connection
io.on('connection', (socket) => {
  console.log('Client connected');
  
  // Send initial blocked IPs
  socket.emit('blocked-ips-updated', Array.from(blockedIPs));
  
  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Periodic data updates
const fetchAndSendMetrics = async () => {
  try {
    // Fetch and send CPU metrics
    const cpuData = await cloudwatch.getMetricData({
      MetricDataQueries: [
        {
          Id: 'cpu',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/EC2',
              MetricName: 'CPUUtilization',
              Dimensions: [
                {
                  Name: 'InstanceId',
                  Value: process.env.TARGET_INSTANCE_ID
                }
              ]
            },
            Period: 60,
            Stat: 'Average'
          },
          ReturnData: true
        }
      ],
      StartTime: new Date(Date.now() - 1800000), // Last 30 minutes
      EndTime: new Date()
    }).promise();
    
    io.emit('cpu-metrics', cpuData);
    
    // Fetch and send network metrics
    const networkData = await cloudwatch.getMetricData({
      MetricDataQueries: [
        {
          Id: 'networkIn',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/EC2',
              MetricName: 'NetworkIn',
              Dimensions: [
                {
                  Name: 'InstanceId',
                  Value: process.env.TARGET_INSTANCE_ID
                }
              ]
            },
            Period: 60,
            Stat: 'Average'
          },
          ReturnData: true
        },
        {
          Id: 'networkOut',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/EC2',
              MetricName: 'NetworkOut',
              Dimensions: [
                {
                  Name: 'InstanceId',
                  Value: process.env.TARGET_INSTANCE_ID
                }
              ]
            },
            Period: 60,
            Stat: 'Average'
          },
          ReturnData: true
        }
      ],
      StartTime: new Date(Date.now() - 1800000), // Last 30 minutes
      EndTime: new Date()
    }).promise();
    
    io.emit('network-metrics', networkData);
    
    // Fetch and send packets metrics
    const packetsData = await cloudwatch.getMetricData({
      MetricDataQueries: [
        {
          Id: 'packetsIn',
          MetricStat: {
            Metric: {
              Namespace: 'CWAgent',
              MetricName: 'packets_recv',
              Dimensions: [
                {
                  Name: 'InstanceId',
                  Value: process.env.TARGET_INSTANCE_ID
                },
                {
                  Name: 'interface',
                  Value: 'eth0'
                }
              ]
            },
            Period: 60,
            Stat: 'Sum'
          },
          ReturnData: true
        },
        {
          Id: 'packetsOut',
          MetricStat: {
            Metric: {
              Namespace: 'CWAgent',
              MetricName: 'packets_sent',
              Dimensions: [
                {
                  Name: 'InstanceId',
                  Value: process.env.TARGET_INSTANCE_ID
                },
                {
                  Name: 'interface',
                  Value: 'eth0'
                }
              ]
            },
            Period: 60,
            Stat: 'Sum'
          },
          ReturnData: true
        }
      ],
      StartTime: new Date(Date.now() - 1800000), // Last 30 minutes
      EndTime: new Date()
    }).promise();
    
    io.emit('packets-metrics', packetsData);
    
    // Fetch and send alarms
    const alarms = await cloudwatch.describeAlarms({
      AlarmNames: ['HighCPUUsage', 'HighNetworkTraffic']
    }).promise();
    
    io.emit('alarms-update', alarms.MetricAlarms);
    
    // Fetch and send logs
    const logGroups = ['httpd-access-logs'];
    let logEvents = [];

    for (const logGroup of logGroups) {
      const logStreams = await cloudwatchLogs.describeLogStreams({
        logGroupName: logGroup,
        orderBy: 'LastEventTime',
        descending: true,
        limit: 1
      }).promise();

      if (logStreams.logStreams && logStreams.logStreams.length > 0) {
        const logStreamName = logStreams.logStreams[0].logStreamName;
        
        const events = await cloudwatchLogs.getLogEvents({
          logGroupName: logGroup,
          logStreamName: logStreamName,
          limit: 50,
          startFromHead: false
        }).promise();
        
        if (events.events) {
          // Parse Apache logs to extract IP, timestamp, and request type
          logEvents = events.events.map(event => {
            const logMessage = event.message;
            // Simple regex to extract IP address, might need adjustment based on log format
            const ipMatch = logMessage.match(/^(\d+\.\d+\.\d+\.\d+)/);
            const ip = ipMatch ? ipMatch[1] : 'Unknown';
            
            // Extract HTTP method (GET, POST, etc.)
            const methodMatch = logMessage.match(/"([A-Z]+) /);
            const method = methodMatch ? methodMatch[1] : 'Unknown';
            
            return {
              timestamp: event.timestamp,
              message: event.message,
              ip,
              method,
              blocked: blockedIPs.has(ip)
            };
          });
          
          io.emit('logs-update', logEvents);
        }
      }
    }
  } catch (error) {
    console.error('Error fetching and sending metrics:', error);
  }
};

// Update metrics every 10 seconds
setInterval(fetchAndSendMetrics, 10000);

// Default route
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 3000;
server.listen(PORT,'0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});