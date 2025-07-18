const express = require('express');
const path = require('path');
const { CloudWatchClient, GetMetricDataCommand } = require('@aws-sdk/client-cloudwatch');
const { CloudWatchLogsClient, FilterLogEventsCommand } = require('@aws-sdk/client-cloudwatch-logs');
const { EC2Client, DescribeInstancesCommand } = require('@aws-sdk/client-ec2');

const app = express();
const port = process.env.PORT || 3000;

// Set up AWS SDK clients
const region = process.env.AWS_REGION || 'us-east-1';
const cloudwatchClient = new CloudWatchClient({ region });
const cloudwatchLogsClient = new CloudWatchLogsClient({ region });
const ec2Client = new EC2Client({ region });

// Enable CORS for all routes
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// Middleware to parse JSON
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Debug endpoint to check configuration
app.get('/api/debug', async (req, res) => {
  try {
    const instanceId = process.env.EC2_INSTANCE_ID || 'not-set';
    const awsRegion = process.env.AWS_REGION || 'not-set';
    
    // Try to get instance information
    let instanceInfo = null;
    if (instanceId !== 'not-set') {
      try {
        const instanceCommand = new DescribeInstancesCommand({
          InstanceIds: [instanceId]
        });
        const instanceData = await ec2Client.send(instanceCommand);
        instanceInfo = instanceData.Reservations[0]?.Instances[0];
      } catch (error) {
        console.error('Error fetching instance info:', error.message);
      }
    }
    
    res.json({
      status: 'debug-info',
      timestamp: new Date().toISOString(),
      config: {
        region: awsRegion,
        instanceId: instanceId,
        nodeEnv: process.env.NODE_ENV || 'development',
        port: port
      },
      instanceInfo: instanceInfo ? {
        state: instanceInfo.State?.Name,
        type: instanceInfo.InstanceType,
        publicIp: instanceInfo.PublicIpAddress,
        privateIp: instanceInfo.PrivateIpAddress,
        launchTime: instanceInfo.LaunchTime
      } : 'Instance information not available'
    });
  } catch (error) {
    console.error('Debug endpoint error:', error);
    res.status(500).json({ 
      error: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

// API endpoint to fetch CloudWatch metrics
app.get('/api/metrics', async (req, res) => {
  try {
    const instanceId = process.env.EC2_INSTANCE_ID;
    
    if (!instanceId) {
      return res.status(400).json({ 
        error: 'EC2_INSTANCE_ID environment variable not set' 
      });
    }
    
    console.log('Fetching metrics for instance:', instanceId);
    console.log('Using region:', region);
    
    const endTime = new Date();
    const startTime = new Date(endTime - 30 * 60 * 1000); // Last 30 minutes
    
    const params = {
      MetricDataQueries: [
        {
          Id: 'cpuUtilization',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/EC2',
              MetricName: 'CPUUtilization',
              Dimensions: [
                {
                  Name: 'InstanceId',
                  Value: instanceId
                }
              ]
            },
            Period: 300, // 5 minutes
            Stat: 'Average'
          },
          ReturnData: true
        },
        {
          Id: 'networkIn',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/EC2',
              MetricName: 'NetworkIn',
              Dimensions: [
                {
                  Name: 'InstanceId',
                  Value: instanceId
                }
              ]
            },
            Period: 300,
            Stat: 'Sum'
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
                  Value: instanceId
                }
              ]
            },
            Period: 300,
            Stat: 'Sum'
          },
          ReturnData: true
        },
        {
          Id: 'networkPacketsIn',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/EC2',
              MetricName: 'NetworkPacketsIn',
              Dimensions: [
                {
                  Name: 'InstanceId',
                  Value: instanceId
                }
              ]
            },
            Period: 300,
            Stat: 'Sum'
          },
          ReturnData: true
        },
        {
          Id: 'networkPacketsOut',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/EC2',
              MetricName: 'NetworkPacketsOut',
              Dimensions: [
                {
                  Name: 'InstanceId',
                  Value: instanceId
                }
              ]
            },
            Period: 300,
            Stat: 'Sum'
          },
          ReturnData: true
        },
        {
          Id: 'statusCheckFailed',
          MetricStat: {
            Metric: {
              Namespace: 'AWS/EC2',
              MetricName: 'StatusCheckFailed',
              Dimensions: [
                {
                  Name: 'InstanceId',
                  Value: instanceId
                }
              ]
            },
            Period: 300,
            Stat: 'Maximum'
          },
          ReturnData: true
        }
      ],
      StartTime: startTime,
      EndTime: endTime
    };

    const command = new GetMetricDataCommand(params);
    const metricData = await cloudwatchClient.send(command);
    
    console.log('Metrics fetched successfully');
    console.log('Number of metric queries returned:', metricData.MetricDataResults?.length || 0);
    
    // Add some basic anomaly detection
    const processedData = {
      ...metricData,
      anomalies: detectAnomalies(metricData.MetricDataResults)
    };
    
    res.json(processedData);
  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({ 
      error: error.message,
      code: error.code || 'UnknownError',
      timestamp: new Date().toISOString()
    });
  }
});

// API endpoint to fetch recent log events
app.get('/api/logs', async (req, res) => {
  try {
    const logGroupName = req.query.logGroup || 'ddos-demo-access-logs';
    const limit = parseInt(req.query.limit) || 100;
    
    const params = {
      logGroupName: logGroupName,
      startTime: Date.now() - (30 * 60 * 1000), // Last 30 minutes
      endTime: Date.now(),
      limit: limit
    };

    const command = new FilterLogEventsCommand(params);
    const logData = await cloudwatchLogsClient.send(command);
    
    res.json(logData);
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ 
      error: error.message,
      code: error.code || 'UnknownError'
    });
  }
});

// API endpoint to get instance information
app.get('/api/instance', async (req, res) => {
  try {
    const instanceId = process.env.EC2_INSTANCE_ID;
    
    if (!instanceId) {
      return res.status(400).json({ 
        error: 'EC2_INSTANCE_ID environment variable not set' 
      });
    }
    
    const command = new DescribeInstancesCommand({
      InstanceIds: [instanceId]
    });
    
    const instanceData = await ec2Client.send(command);
    const instance = instanceData.Reservations[0]?.Instances[0];
    
    if (!instance) {
      return res.status(404).json({ 
        error: 'Instance not found' 
      });
    }
    
    res.json({
      instanceId: instance.InstanceId,
      instanceType: instance.InstanceType,
      state: instance.State?.Name,
      publicIpAddress: instance.PublicIpAddress,
      privateIpAddress: instance.PrivateIpAddress,
      launchTime: instance.LaunchTime,
      availabilityZone: instance.Placement?.AvailabilityZone,
      securityGroups: instance.SecurityGroups,
      tags: instance.Tags
    });
  } catch (error) {
    console.error('Error fetching instance information:', error);
    res.status(500).json({ 
      error: error.message,
      code: error.code || 'UnknownError'
    });
  }
});

// Simple anomaly detection function
function detectAnomalies(metricResults) {
  const anomalies = [];
  
  try {
    // Check each metric for anomalies
    metricResults.forEach(metric => {
      if (metric.Values && metric.Values.length > 0) {
        const values = metric.Values;
        const average = values.reduce((sum, val) => sum + val, 0) / values.length;
        const latest = values[values.length - 1];
        
        // Simple threshold-based anomaly detection
        let threshold = 0;
        let anomalyType = '';
        
        switch (metric.Id) {
          case 'cpuUtilization':
            threshold = 80; // 80% CPU usage
            anomalyType = 'High CPU Usage';
            break;
          case 'networkIn':
            threshold = average * 3; // 3x average network traffic
            anomalyType = 'High Network Traffic (Inbound)';
            break;
          case 'networkPacketsIn':
            threshold = average * 3; // 3x average packet rate
            anomalyType = 'High Packet Rate (Inbound)';
            break;
          case 'statusCheckFailed':
            threshold = 0.5; // Any failed status checks
            anomalyType = 'Instance Health Issues';
            break;
        }
        
        if (latest > threshold) {
          anomalies.push({
            metric: metric.Id,
            type: anomalyType,
            value: latest,
            threshold: threshold,
            severity: latest > threshold * 2 ? 'high' : 'medium',
            timestamp: metric.Timestamps[metric.Timestamps.length - 1]
          });
        }
      }
    });
  } catch (error) {
    console.error('Error in anomaly detection:', error);
  }
  
  return anomalies;
}

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  res.status(500).json({ 
    error: 'Internal server error',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    path: req.path,
    timestamp: new Date().toISOString()
  });
});

// Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`DDoS Dashboard Server started successfully!`);
  console.log(`Server running on port ${port}`);
  console.log(`Access the dashboard at: http://localhost:${port}`);
  console.log(`AWS Region: ${region}`);
  console.log(`Target Instance ID: ${process.env.EC2_INSTANCE_ID || 'NOT SET'}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Process ID: ${process.pid}`);
  console.log('Server is listening on all network interfaces (0.0.0.0)');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

module.exports = app;
