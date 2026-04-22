# LOUREX — Professional B2B Sourcing & Operations Platform

LOUREX is a production-grade B2B sourcing and operations platform designed for managing complex trade flows. It connects customers with a centralized operations team to handle purchase requests, deal conversion, shipment tracking, and financial management.

The product is built as a single-page React application (Vite + TypeScript + Tailwind + shadcn/ui) backed by Supabase for authentication, database, storage, and real-time features.

---

## Core Architecture & Roles

Lourex uses a strict Role-Based Access Control (RBAC) model combined with Supabase Row Level Security (RLS) to ensure data isolation.

### User Roles
- **Owner**: Full platform access, internal reporting, and administrative controls.
- **Operations Employee**: Manages day-to-day business flows, handles requests, updates tracking, and manages accounting.
- **Saudi Partner**: Regional internal role with access to operational dashboards and tracking.
- **Customer**: External user role. Customers can submit purchase requests, view their own deals, and track shipments.

### Data Isolation
- **Internal/External Separation**: The application maintains a strict split between the Internal Dashboard (`/dashboard`) and the Customer Portal (`/customer-portal`).
- **RLS Enforcement**: Every database query is governed by Supabase RLS policies. Customers can only see data explicitly owned by them. Internal users have broader access defined by their specific internal role.

---

## Key Features

- **Operational Workflow**: End-to-end management from initial Purchase Request to Deal conversion and Shipment delivery.
- **Real-time Tracking**: Granular shipment status updates with customer-visible progress indicators.
- **Advanced Reporting**: Aggregated financial and operational analytics for internal users (Owner/Operations).
- **In-app Notifications**: Role-aware notification system for critical events (e.g., new requests, status changes).
- **PDF Export**: Professional export of financial and operational reports.
- **Accounting**: Management of financial entries linked to specific deals or customers.

---

## Tech Stack

- **Frontend**: React 18, Vite 5, TypeScript, Tailwind CSS 3, shadcn/ui, Framer Motion, React Router.
- **Backend**: Supabase (PostgreSQL + RLS, Auth, Storage, Edge Functions).
- **State Management**: TanStack Query (React Query).
- **i18n**: Full English and Arabic (RTL) support.
- **Exports**: Client-side PDF generation via `jspdf`.

---

## Getting Started

### Prerequisites
- Node.js (v18+)
- npm or bun

### Local Setup

1. **Clone the repository**
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables**:
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. **Run development server**:
   ```bash
   npm run dev
   ```

### Scripts

| Script | Purpose |
| ------ | ------- |
| `npm run dev`         | Start the Vite dev server |
| `npm run build`       | Production build |
| `npm run preview`     | Preview the production build |
| `npm run lint`        | Run ESLint |
| `npm run test`        | Run tests |

---

## Project Structure

```
src/
  components/        Reusable UI + Layout components
  features/          Feature-specific logic (Auth, Reports, Notifications)
  pages/             Route components (Internal Dashboard, Customer Portal, Public)
  lib/               Domain logic, i18n, utilities, and loaders
  integrations/      Supabase client + generated types
  hooks/             Reusable React hooks
supabase/
  migrations/        SQL migrations (RBAC, RLS, Functions)
```
