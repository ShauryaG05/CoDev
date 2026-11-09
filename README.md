# CoDev — Real-time Collaborative Code Editor (Prototype)

A high-concurrency, real-time collaborative code editor built on **React, Node.js/Express, Socket.IO, MongoDB, and Yjs CRDT**.

Every **Project** is an independent, first-class workspace with its own ID, file tree, members, permissions, and storage. Each user has a **Cloud Directory**—a live, derived view displaying both owned projects (*My Projects*) and collaborated projects (*Shared with me*).

---

## Architecture & Key Highlights

- **Conflict-Free Replicated Data Types (Yjs CRDT)**:
  - Concurrent edits merge without central transformation locks.
  - Sub-100ms propagation with guaranteed convergence.
  - Per-user colored cursor presence and selection tracking.
- **Independent Project Model**:
  - Projects exist as standalone entities. Ownership can be transferred, shared, or revoked independently of any individual user record.
- **Live Cloud Directory**:
  - Socket.IO personal room (`user:{userId}`) delivers instantaneous updates when invited to or removed from a project without requiring page refreshes.
- **Granular Role Enforcement**:
  - `owner`: full project management, invite generation, member role updates, and project deletion.
  - `editor`: read/write file edits, node additions, renames, and deletions.
  - `viewer`: read-only access with server-side enforcement rejecting write payloads.
- **Debounced Snapshots & Compaction**:
  - Doc Manager caches active `Y.Doc` instances in memory, debounces incremental updates to MongoDB, compacts into periodic snapshots, and unloads idle files.

---

## Project Structure

```
CoDev/
├── package.json                 # Monorepo orchestration scripts
├── docker-compose.yml           # Local MongoDB & Redis containers
├── .env.example                 # Root environment template
├── requirements.md              # Requirements specification
├── design.md                    # Architecture & protocol design
├── tasks.md                     # Roadmap and milestone tracking
├── server/                      # Node.js + Express + Socket.IO + Yjs Backend
│   ├── .env                     # Local environment configuration (MongoDB URI)
│   ├── .env.example             # Server environment template
│   ├── src/
│   │   ├── config/              # MongoDB connection & environment loader
│   │   ├── models/              # Mongoose models: User, Project, Membership, Node, YUpdate, YSnapshot, Invite, Activity
│   │   ├── middleware/          # JWT auth & role permission guards
│   │   ├── controllers/         # Auth, Directory, Project, Node, and Invite controllers
│   │   ├── routes/              # Express REST API routes
│   │   ├── services/            # Yjs Doc Manager (caching, loading, compaction, persistence)
│   │   ├── sockets/             # Socket.IO Realtime Gateway (handshake, rooms, presence, CRDT relay)
│   │   └── index.ts             # Server entry point with graceful shutdown
│   └── tsconfig.json
└── client/                      # React + Vite + Monaco + Tailwind Frontend
    ├── src/
    │   ├── components/          # Cloud Directory, IDE Workspace, Monaco Editor, File Tree, Members Drawer
    │   ├── context/             # AuthContext & SocketContext
    │   ├── services/            # Axios API client with token refresh
    │   └── types/               # TypeScript interface contracts
    ├── vite.config.ts           # Proxy configuration for /api and /socket.io
    └── tailwind.config.js       # Dark IDE theme styling
```

---

## Environment Setup & MongoDB Configuration

The application includes `.env` and `.env.example` pre-configured in both the project root and `server/`.

### 1. Configure MongoDB Connection

Open `server/.env` (or root `.env`):
```bash
# For local MongoDB (default):
MONGO_URI=mongodb://localhost:27017/codev

# For MongoDB Atlas (replace credentials when ready):
# MONGO_URI=mongodb+srv://<username>:<password>@cluster0.mongodb.net/codev?retryWrites=true&w=majority
```

### 2. Optional: Local MongoDB with Docker

If you don't have MongoDB running natively, start it via Docker Compose:
```bash
docker compose up -d mongo
```

---

## Running the Application

### Option A: Install All and Run Concurrently (Recommended)

From the project root directory:
```bash
npm run install:all
npm run dev
```

This starts:
- **Backend API & Gateway**: `http://localhost:4000`
- **Frontend Web Client**: `http://localhost:5173`

### Option B: Run Individually

**Terminal 1 — Backend Server:**
```bash
cd server
npm install
npm run dev
```

**Terminal 2 — Frontend Client:**
```bash
cd client
npm install
npm run dev
```

---

## Pair Programming & Real-time Verification

1. **User 1 (Alice)**:
   - Open `http://localhost:5173` in Browser 1.
   - Click **"Fill Alice"** on the Sign In screen and log in.
   - Click **"New Project"**, name it `pair-programming-demo`, and open it.
   - Click **"Invite"** in the top bar, choose **"Editor"**, and copy the generated link (e.g. `http://localhost:5173/#invite=<token>`).

2. **User 2 (Bob)**:
   - Open an Incognito Window (or Browser 2) and paste the invite link.
   - Click **"Fill Bob"** and sign in.
   - Notice the project instantly loads, appearing under **"Shared with me"** in Bob's Cloud Directory.
   - Open the same file (e.g., `index.js`).

3. **Real-time Collaboration**:
   - Both users will see each other's colored cursor movements and selections in Monaco.
   - Edits synchronize instantaneously via Yjs CRDT with zero merge conflicts.
   - Adding or deleting files/folders in the file tree propagates across all active members within milliseconds.
