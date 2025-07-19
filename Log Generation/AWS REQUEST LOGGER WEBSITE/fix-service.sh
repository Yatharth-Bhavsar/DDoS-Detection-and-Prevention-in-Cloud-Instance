#!/bin/bash

# First, let's create an .nvmrc file to specify the Node version
echo "16" > ~/app/.nvmrc

# Next, let's create a better startup script that properly sources NVM
cat > ~/app/start.sh << 'EOL'
#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"  # This loads nvm
cd ~/app
node server/app.js
EOL

chmod +x ~/app/start.sh

# Now, let's create an improved systemd service that uses the full path to node
cat > /tmp/request-logger.service << 'EOL'
[Unit]
Description=Request Logger Web Application
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/home/ec2-user/app
ExecStart=/bin/bash /home/ec2-user/app/start.sh
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOL

# Apply the service file and restart
sudo mv /tmp/request-logger.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl restart request-logger.service
sudo systemctl status request-logger.service