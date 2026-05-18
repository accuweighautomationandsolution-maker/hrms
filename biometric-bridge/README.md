# Accuweigh HRMS — Biometric Bridge Server

A local Node.js server that connects to your **Identix X2008** biometric terminal and supplies real punch-in/punch-out data to the HRMS web application.

---

## Prerequisites

- **Node.js** v16 or later — [Download here](https://nodejs.org)
- The biometric machine must be on the **same network/LAN** as your PC
- Machine IP: `192.168.1.202`, Port: `4370`

---

## Setup (One-time)

Open a Command Prompt or PowerShell in this folder and run:

```bash
npm install
```

---

## Running the Bridge

```bash
node server.js
```

You should see:
```
╔════════════════════════════════════════════════════╗
║     Accuweigh HRMS — Biometric Bridge Server       ║
║     Running on http://localhost:9000               ║
╚════════════════════════════════════════════════════╝

  Device Target : 192.168.1.202:4370 (Identix X2008)
  Waiting for pull requests from HRMS...
```

**Keep this window open** while using the HRMS Attendance page.

---

## How It Works

1. Admin opens HRMS Attendance page and clicks **"Pull Hardware Data"**
2. HRMS sends a request to `http://localhost:9000/api/pull`
3. The bridge connects to the Identix X2008 terminal via TCP
4. All punch records are read from the machine's memory
5. The bridge processes them into In/Out pairs and returns JSON to HRMS
6. HRMS displays the actual biometric times and saves them to Supabase

---

## Troubleshooting

| Error | Solution |
|---|---|
| `ECONNREFUSED` | Machine is off or IP is wrong — check the machine's `Comm` settings |
| `ETIMEDOUT` | Firewall blocking port 4370 — add a Windows Firewall exception |
| Bridge won't start | Run `npm install` again, or check Node.js is installed |
| HRMS shows "Bridge not responding" | The `node server.js` window was closed — reopen it |
