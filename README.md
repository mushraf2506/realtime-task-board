# Real-Time Collaborative Task Board

A production-quality Kanban board supporting real-time multi-user collaboration, conflict resolution, and offline support.

## Features

- **Real-time sync** via Socket.IO — changes propagate to all clients in < 200ms
- **Conflict resolution** for all 3 concurrent-edit scenarios
- **Drag-and-drop** reordering with O(1) fractional indexing
- **Offline support** — actions queue in IndexedDB and replay on reconnect
- **Presence indicators** — see who else is on the board
- **Optimistic UI** — instant response, reconciles with server state

## Quick Start

```bash
docker compose up
```

Open [http://localhost:5173](http://localhost:5173). The board is ready.

## Development

### Prerequisites
- Node.js 20+
- PostgreSQL 15+ (or use Docker)

### Backend

```bash
cd packages/backend
npm install
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/taskboard npm run dev
```

### Frontend

```bash
cd packages/frontend
npm install
npm run dev
```

### Tests

```bash
# Unit tests (no DB needed)
cd packages/backend && npm test

# Integration tests (requires DB)
cd packages/backend && RUN_INTEGRATION=1 npm test

# Frontend tests
cd packages/frontend && npm test
```

## Deployment

**Live URL:** _Add after deploying to Railway/Render_

### Deploying to Railway

1. Push to GitHub
2. Create a new Railway project
3. Add a PostgreSQL database plugin
4. Deploy the backend service with env var `DATABASE_URL` from Railway
5. Deploy the frontend with `VITE_BACKEND_URL` pointing to the backend URL

### Cold Start Note

Free tier instances spin down after 15 minutes of inactivity. Expect a ~30-second cold start on first request. The PostgreSQL data persists across cold starts.

## Architecture

See [DESIGN.md](./DESIGN.md) for the conflict resolution strategy, ordering approach, and trade-offs.

```
packages/
├── backend/        Node.js + Fastify + Socket.IO + TypeScript
└── frontend/       React 18 + dnd-kit + Zustand + TypeScript
```
