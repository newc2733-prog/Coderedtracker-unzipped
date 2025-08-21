# CodeRed Tracker - NHS Blood Product Management System

A specialized web application designed for NHS hospitals to manage multiple simultaneous massive transfusion (Code Red) events with real-time coordination between clinical areas, labs, and runners.

## Features

- **Multi-Code Red Support**: Handle multiple simultaneous massive transfusion events
- **Real-time Tracking**: Live pack status updates and countdown timers
- **Role-based Interface**: Specialized views for Lab, Runner, and Clinician roles
- **Database Persistence**: PostgreSQL database for reliable data storage
- **Responsive Design**: Optimized for medical staff under high-stress conditions

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Node.js + Express
- **Database**: PostgreSQL with Drizzle ORM
- **UI**: Tailwind CSS + Shadcn/ui components
- **Deployment**: Vercel + Neon Database

## Quick Start

### Prerequisites

- Node.js 18+
- PostgreSQL database

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd codred-tracker
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your database connection string
```

4. Push database schema:
```bash
npm run db:push
```

5. Start development server:
```bash
npm run dev
```

### Production Deployment

1. Build the application:
```bash
npm run build
```

2. Start production server:
```bash
npm start
```

## Environment Variables

- `DATABASE_URL`: PostgreSQL connection string
- `NODE_ENV`: Environment (development/production)

## Database

The application automatically detects the environment:
- **Development**: Uses in-memory storage for fast testing
- **Production**: Uses PostgreSQL database for data persistence

## License

Medical software for NHS use. All rights reserved.