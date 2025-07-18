
# DDoS Detection and Prevention in Cloud Instance

A real-time, cost-effective, and lightweight system to detect and mitigate Distributed Denial of Service (DDoS) attacks on cloud-hosted applications, specifically optimized for the **AWS Free Tier** environment.

## 📌 Project Overview

This capstone project demonstrates a scalable and modular approach to cloud-based security by deploying two Amazon EC2 instances:

- One simulates a **vulnerable web server** to receive traffic.
- The other hosts a **Monitoring Dashboard** to visualize, analyze, and mitigate potential DDoS threats in real time.

The system is designed to help small-scale organizations and individual developers monitor HTTP traffic, identify suspicious behaviors, and react promptly—all while operating within minimal cloud resources.

## 🔧 Tech Stack

| Component       | Technology                        |
|----------------|------------------------------------|
| Backend         | Node.js, Express.js                |
| Frontend        | HTML, CSS, JavaScript              |
| Real-Time Logs  | Socket.io                          |
| Server Hosting  | AWS EC2 (Free Tier)                |
| Log Automation  | Bash Scripts                       |
| Reverse Proxy   | Nginx                              |
| Process Manager | PM2                                |
| Communication   | HTTPS, SSH                         |

## 🧠 Key Features

- **Live Traffic Monitoring** with real-time socket updates.
- **Interactive Dashboard** to view logs and traffic patterns.
- **Admin Tools** for blocking suspicious IP addresses.
- **Secure Bash Automation** for log forwarding.
- **Nginx Reverse Proxy** with SSL support.
- **Resilient Server Ops** with PM2 process monitoring.
- **Input Validation & Secure Communication**.

## 📈 System Architecture

- **Web Server EC2 Instance**: Simulates traffic and logs HTTP requests.
- **Dashboard EC2 Instance**: Collects and visualizes logs; allows mitigation actions.
- **Secure Bash Scripts**: Automate log extraction and forwarding.
- **Socket.io**: Delivers logs in real time to the frontend.

## 🔒 Security Highlights

- HTTPS + SSH for secure communication.
- Strict input validation and log sanitization.
- Isolated EC2 instances with limited access.
- Planned integration of user authentication and geo-based IP analysis.

## 🚀 Future Enhancements

- Machine Learning-based anomaly detection.
- Geo-IP based threat scoring and traffic maps.
- Auto IP blocking using dynamic thresholds.
- Email/SMS alert system.
- Third-party security tool integration (e.g., Cloudflare, Fail2Ban).

## 📷 Sample Screenshots

- Hosted Website Interface  
- Monitoring Dashboard with Live Logs  
- Malicious & Regular Traffic Examples  
- Email Alert Notifications

## 👥 Contributors

- Yatharth Bhavsar (202202626010004)  
- Nirali Patel (202202626010030)  
- Manan Upadhyay (202202626010054)  
- Devvrat Solanki (202202626010091)

Under the guidance of **Dr. Madhuri Chopade**, Assistant Professor, GLS University.

---

**🔐 Secure. 💡 Scalable. ⚙️ Deployable.**  
A full-stack solution that bridges the gap between academic cybersecurity theory and practical cloud security engineering.
