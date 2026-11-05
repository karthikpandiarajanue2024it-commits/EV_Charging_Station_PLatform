# ⚡ EVCharge IQ – Intelligent EV Charging Platform

Welcome to **EVCharge IQ**, a modern, full-stack application built to solve EV range anxiety by providing real-time visibility, predictive wait times, and comprehensive fleet analytics.

This guide will explain exactly how to run the project locally for an interviewer, presentation, or demonstration.

---

## 🛠️ Prerequisites
Before running the application, ensure you have the following installed on your machine:
1. **Node.js** (v16.0 or higher)
2. **MongoDB** (Running locally on port `27017`)
3. **Git Bash or PowerShell / Terminal**

---

## 🚀 How to Run the Project (Step-by-Step)

You need to run two separate servers simultaneously: the **Backend API** and the **Frontend Web App**.

### Step 1: Open the Project
Open your terminal (PowerShell or VS Code terminal) and navigate to the root directory where this project is stored:
```bash
cd c:\Users\KARTHIK\db_project\ev-charging-platform
```

### Step 2: Seed the Database (One-time Setup)
If your database is empty, you need to format it with dummy stations, users, and charging sessions so there is data to present.
Open a terminal inside the `backend` folder and run the seed script:
```bash
cd backend
npm install
node utils/seed.js
```
*(You should see a success message that stations, users, and sessions were created.)*

### Step 3: Start the Backend Server
In that same `backend` terminal, start the Node.js / Express server:
```bash
npm run dev
```
*(Leave this terminal open and running. You should see "✅ MongoDB Connected" and "🚀 Server running on http://localhost:5000")*

### Step 4: Start the Frontend Application
Open a **NEW** terminal window, navigate to the `frontend` folder, and start the React (Vite) server:
```bash
cd c:\Users\KARTHIK\db_project\ev-charging-platform\frontend
npm install
npm run dev
```
*(Leave this terminal running. You should see a message saying "VITE ready in... Local: http://localhost:5173/")*

### Step 5: Open the App in Your Browser
Now simply open your web browser (Chrome, Edge, etc.) and go to:
👉 **[http://localhost:5173](http://localhost:5173)**

---

## 👤 Presentation Demo Accounts

When presenting, you can use these seeded credentials to instantly log into the platform. You don't have to register a new account.

**Admin / Operator View**
*(Has access to the Admin Dashboard, Station Management, and system Analytics)*
- **Email:** `admin@evcharging.in`
- **Password:** `Admin@123`

**Regular EV Owner View**
*(Has access to find stations, view map, and see their own sessions)*
- **Email:** `arjun@test.in`
- **Password:** `User@123`

---

## 🌟 Key Features to Highlight in Your Presentation

1. **The Interactive Map (`/map`)**
   - Click the Map View.
   - Show how users can set a search radius (e.g., 5km) and filter by charger type (e.g., CCS vs Type2) to find stations dynamically.
2. **Real-time Occupancy & Availability**
   - Head to a Station's detail page. Emphasize that slot updates and faults stream live to the UI via **WebSockets (Socket.io)** without needing to refresh the page.
3. **AI Wait-Time Prediction Engine**
   - On the Station detail page, point out the "Predicted Wait" block. Explain that the backend performs a heavy MongoDB Aggregation across hundreds of past sessions to recommend "Best Charging Times".
4. **Platform Analytics (`/analytics`)**
   - If logged in as Admin, navigate to the Analytics tab.
   - Reveal the `Chart.js` visual data showcasing complex insights like the "Peak Hours Heatmap", "Day-wise Trends", and "Weather Impact on Charging".
5. **Admin Station Management (`/admin`)**
   - In the Admin Panel, show how operators can dynamically add new stations to the city with custom charger configurations and resolve active fault tickets seamlessly.
