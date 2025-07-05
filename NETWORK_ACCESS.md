# Network Access for React Development Server

This document explains how to access your React app from other devices on your network.

## Quick Start

### Method 1: Using npm script (Recommended)
```bash
npm run start:network
```

### Method 2: Using .env.local file
1. Open `.env.local` file
2. Uncomment these lines:
   ```
   HOST=0.0.0.0
   WDS_SOCKET_HOST=0.0.0.0
   WDS_SOCKET_PORT=3000
   ```
3. Run: `npm start`

## Finding Your Network IP Address

### Windows (PowerShell/Command Prompt)
```bash
ipconfig
```
Look for "IPv4 Address" under your active network adapter.

### Alternative Windows method
```bash
ipconfig | findstr /i "IPv4"
```

## Accessing Your App

Once the server is running with network access:

1. **Local access**: `http://localhost:3000`
2. **Network access**: `http://[YOUR-IP-ADDRESS]:3000`

Example: If your IP is `192.168.1.100`, access via `http://192.168.1.100:3000`

## Security Note

When using network access (`HOST=0.0.0.0`), your development server will be accessible to any device on your network. This is intended for development and testing purposes only.

## Troubleshooting

### Issue: Can't access from other devices
- Ensure Windows Firewall allows connections on port 3000
- Check that both devices are on the same network
- Verify your IP address is correct

### Issue: Hot reload not working on network
- Make sure `WDS_SOCKET_HOST` is set to `0.0.0.0` in your environment
- Check that WebSocket connections are not blocked by firewall

### Windows Firewall Configuration
If you can't access the app from other devices, you may need to allow the connection through Windows Firewall:

1. Open Windows Security
2. Go to Firewall & network protection
3. Click "Allow an app through firewall"
4. Add Node.js or allow port 3000

## Available Scripts

- `npm start` - Runs on localhost only
- `npm run start:network` - Runs with network access (HOST=0.0.0.0)
