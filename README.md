# Biometrics Attendance System

A modern HR and attendance management web application built with React, Vite, Tailwind CSS, PHP, and a small fingerprint bridge service. The system includes employee management, attendance reporting, leave tracking, shift configuration, and a dashboard for monitoring staff activity.

## Features

- Employee and attendance overview dashboard
- Clock-in/clock-out logging and reporting
- Leave management and shift configuration
- Responsive UI built with React and Tailwind CSS
- Backend API layer powered by PHP
- Fingerprint bridge service for biometric integration

## Project Structure

- frontend app: React + Vite in the root project
- backend API: PHP files under `backend/`
- fingerprint bridge: Node.js service under `fingerprint-bridge/`

## Prerequisites

- Node.js 18+
- PHP 8.1+
- Composer
- Git

## Installation

1. Clone the repository
   ```bash
   git clone https://github.com/jliza009/Biometrics_Attendance_System.git
   cd Biometrics_Attendance_System
   ```

2. Install frontend dependencies
   ```bash
   npm install
   ```

3. Install backend dependencies
   ```bash
   cd backend
   composer install
   cd ..
   ```

4. Install fingerprint bridge dependencies
   ```bash
   cd fingerprint-bridge
   npm install
   cd ..
   ```

## Environment Configuration

Create a local environment file for the PHP backend if needed:

```bash
cp backend/.env.example backend/.env
```

Update the values in `backend/.env` with your local database and mail settings.

## Running the Application

Start the frontend app:

```bash
npm run dev
```

Start the PHP backend API:

```bash
npm run dev:api
```

Start the fingerprint bridge service:

```bash
npm run dev:fp
```

The frontend will typically run on `http://localhost:5173`, the PHP API on `http://127.0.0.1:8888`, and the fingerprint bridge on the configured port from the Node service.

## Build for Production

```bash
npm run build
```

## Notes

- Sensitive configuration values should remain in local environment files and are ignored by Git.
- The project currently uses mock data for parts of the UI and can be extended with real attendance and biometric integrations.

## License

This project is for educational and internal business use. Please adjust the license terms as needed for your organization.
