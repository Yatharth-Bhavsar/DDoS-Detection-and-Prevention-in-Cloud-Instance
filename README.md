
# 🚨 DDoS Detection and Prevention in Cloud Instance

A modular and scalable real-time DDoS detection and mitigation system hosted on AWS EC2 Free Tier using Node.js, Express.js, Bash, and a live dashboard with secure communication.

---

## 🧠 Key Features

- **Live Traffic Monitoring** with real-time socket updates.
- **Interactive Dashboard** to view logs and traffic patterns.
- **Admin Tools** for blocking suspicious IP addresses.
- **Secure Bash Automation** for log forwarding.
- **Nginx Reverse Proxy** with SSL support.
- **Resilient Server Ops** with PM2 process monitoring.
- **Input Validation** & **Secure Communication**.

---

## 📈 System Architecture

- **Web Server EC2 Instance**: Simulates traffic and logs HTTP requests.
- **Dashboard EC2 Instance**: Collects and visualizes logs; allows mitigation actions.
- **Secure Bash Scripts**: Automate log extraction and forwarding.
- **Socket.io**: Delivers logs in real time to the frontend.

---

## 🔒 Security Highlights

- **HTTPS + SSH** for secure communication.
- **Strict input validation** and **log sanitization**.
- **Isolated EC2 instances** with limited access.
- Planned integration of **user authentication** and **geo-based IP analysis**.

---

## 🛠 Tech Stack

**Frontend:**
- ![HTML](https://img.shields.io/badge/-HTML5-E34F26?logo=html5&logoColor=white)
- ![CSS](https://img.shields.io/badge/-CSS3-1572B6?logo=css3&logoColor=white)
- ![JavaScript](https://img.shields.io/badge/-JavaScript-F7DF1E?logo=javascript&logoColor=black)

**Backend:**
- ![Node.js](https://img.shields.io/badge/-Node.js-339933?logo=node.js&logoColor=white)
- ![Express.js](https://img.shields.io/badge/-Express.js-000000?logo=express&logoColor=white)
- ![Socket.io](https://img.shields.io/badge/-Socket.io-010101?logo=socket.io&logoColor=white)
- ![PM2](https://img.shields.io/badge/-PM2-2B037A?logo=pm2&logoColor=white)

**DevOps & Cloud:**
- ![AWS EC2](https://img.shields.io/badge/-AWS_EC2-FF9900?logo=amazon-ec2&logoColor=white)
- ![Bash](https://img.shields.io/badge/-Bash-4EAA25?logo=gnubash&logoColor=white)
- ![Nginx](https://img.shields.io/badge/-Nginx-269539?logo=nginx&logoColor=white)

**Security & Tools:**
- ![HTTPS](https://img.shields.io/badge/-HTTPS-0052CC?logo=letsencrypt&logoColor=white)
- ![SSH](https://img.shields.io/badge/-SSH-333333?logo=openssh&logoColor=white)

---

## 🚀 Future Enhancements

- **Machine Learning**-based anomaly detection.
- **Geo-IP** based threat scoring and traffic maps.
- **Auto IP blocking** using dynamic thresholds.
- **Email/SMS alert system**.
- **Third-party security tool integration** (e.g., Cloudflare, Fail2Ban).

---

## 📷 Sample Screenshots

- 📸 Hosted Website Interface
- 📊 Monitoring Dashboard with Live Logs
- 🧪 Malicious & Regular Traffic Examples
- ✉️ Email Alert Notifications

---

## 👥 Contributors

- Yatharth Bhavsar (202202626010004)
- Nirali Patel (202202626010030)
- Manan Upadhyay (202202626010054)
- Devvrat Solanki (202202626010091)

**Under the guidance of Dr. Madhuri Chopade, Assistant Professor, GLS University**

---

## 🔐 Secure. 💡 Scalable. ⚙️ Deployable.

A full-stack solution that bridges the gap between academic cybersecurity theory and practical cloud security engineering.
