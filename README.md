# RemoteIQ Mobile App

A mobile-first web application for visualizing IoT device data from the RemoteIQ platform.

## Features

- **Login** — Secure authentication with RemoteIQ credentials
- **Device List** — View all connected devices with online/offline status
- **Device Detail** — Real-time metrics: engine, power, fuel, location
- **Auto-refresh** — Data updates every 30 seconds

## Getting Started

1. Open `index.html` in a browser (or serve via local web server)
2. Login with your RemoteIQ experience user credentials
3. View your devices and their telemetry data

## Project Structure

```
RemoteIQ-Mobile-App/
├── index.html          # Login page
├── dashboard.html      # Device list
├── device.html         # Device detail
├── css/
│   └── styles.css      # Mobile-first dark theme
├── js/
│   ├── api.js          # RemoteIQ API wrapper
│   └── app.js          # Application logic
└── README.md
```

## API Endpoints

- `POST /api/login` — Authenticate and get JWT token
- `GET /api/last_value_query` — Fetch device telemetry
- `POST /api/command` — Send commands to devices

## Tech Stack

- Vanilla HTML, CSS, JavaScript (no frameworks)
- Mobile-first responsive design
- Dark mode with teal accents
