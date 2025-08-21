# Replit.md

## Overview
This project is a medical blood product tracking application designed for managing Code Red (massive transfusion protocol) events in hospital settings. Its primary purpose is to provide real-time visibility and management of blood product packs from order to delivery, crucial for medical staff during critical situations. The system aims for medical-grade reliability, real-time data updates, robust error prevention with undo capabilities, and an intuitive user experience tailored for high-stress clinical environments.

## User Preferences
Preferred communication style: Simple, everyday language.

## System Architecture
### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Framework**: Shadcn/ui (built on Radix UI)
- **Styling**: Tailwind CSS with a custom medical-grade color scheme
- **Routing**: Wouter
- **State Management**: TanStack Query (React Query) for server state

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Development**: TSX
- **Build**: ESBuild for production bundling

### Data Storage Solutions
- **Database**: PostgreSQL (configured via Drizzle ORM)
- **ORM**: Drizzle ORM with Zod schema validation
- **Database Provider**: Neon Database (serverless PostgreSQL)
- **Session Storage**: PostgreSQL sessions via `connect-pg-simple`
- **Development Storage**: In-memory storage implementation

### Key Features and Design Decisions
- **Real-time Updates**: Achieved via 5-second polling for dashboard updates.
- **Code Red Workflow**: Supports activation, pack creation (standardized A/B packs, individual products), 6-stage pack tracking (Order received to Product arrived), real-time monitoring, and deactivation.
- **Multi-Code Red Support**: Allows for multiple simultaneous Code Red events, with users selecting the relevant event.
- **Critical Security Workflow**: All users must access Code Red events only through the Home Screen. Lab technicians cannot create new Code Red events from within the lab view to maintain proper event selection safety.
- **Multi-Event Warning System**: Orange warning banners appear AFTER Code Red selection (not before) to reduce information overload. When multiple Code Reds are active, the clinician dashboard's red banner splits into separate sections (Code Red Active 1, Code Red Active 2) with white divider lines.
- **Button Functionality Clarity**: "Stand Down Code Red" ends protocol with audit trail preservation; "Delete Code Red (Error)" removes error activations without audit records.
- **Unified Interfaces**: Merged actions and streamlined views (e.g., Lab interface) to reduce complexity.
- **Time Estimation**: Integrated arrival time estimates across all views (runner, lab, clinician) with visual countdowns.
- **Error Prevention & Undo**: Comprehensive undo functionality for pack stages and actions, individual pack deletion, emergency reset, and warning dialogs for destructive actions.
- **Location Tracking**: Enhanced Code Red schema to include exact location and patient MRN, with location history tracking and audit trails.
- **UI/UX**: Prioritizes clear, large, and simple elements, especially in high-stress runner and lab views. Employs color-coding for status indicators and uses Lucide React for icons.

## External Dependencies
### UI and Styling
- **Radix UI**: Accessible UI primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.
- **Class Variance Authority**: For component variant management.

### Data Management
- **TanStack Query**: Server state management.
- **React Hook Form**: Form handling with Zod validation.
- **Date-fns**: Date/time manipulation.

### Development Tools
- **Replit Integration**: Development environment optimizations.
- **Vite Plugins**: Runtime error overlay and development cartographer.