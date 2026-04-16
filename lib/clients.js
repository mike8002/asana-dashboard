// lib/clients.js
// ═══════════════════════════════════════════════════════════
// CLIENT REGISTRY
// Add a new client whenever you set up a new Asana project.
// The "All clients" master view only appears when you have
// 2+ individual clients — avoiding redundancy when there's
// only one client (since the master view would just duplicate it).
// ═══════════════════════════════════════════════════════════
//
// HOW TO ADD A NEW CLIENT:
// 1. Get the Asana project GID from the URL:
//    https://app.asana.com/1/WORKSPACE/project/PROJECT_GID/list/...
// 2. Add a new entry to the INDIVIDUAL_CLIENTS array below
// 3. Commit & push — the master view appears automatically
//    once you have 2+ clients
//
// ═══════════════════════════════════════════════════════════

// Individual clients — add entries here as you onboard them
const INDIVIDUAL_CLIENTS = [
  {
    id: 'project-hub',
    name: 'Project Hub',
    projectGids: ['1213523346795620'],
    color: '#7F77DD',
  },
  // ── Add new clients below this line ───────────────────────
  //
  // {
  //   id: 'emirates',
  //   name: 'Emirates',
  //   projectGids: ['PASTE_GID_HERE'],
  //   color: '#E24B4A',
  // },
  // {
  //   id: 'etihad',
  //   name: 'Etihad',
  //   projectGids: ['PASTE_GID_HERE'],
  //   color: '#EF9F27',
  // },
  // {
  //   id: 'dyson',
  //   name: 'Dyson',
  //   projectGids: ['PASTE_GID_HERE'],
  //   color: '#378ADD',
  // },
  // {
  //   id: 'modon',
  //   name: 'Modon Properties',
  //   projectGids: ['PASTE_GID_HERE'],
  //   color: '#1D9E75',
  // },
  // {
  //   id: 'omniyat',
  //   name: 'OMNIYAT',
  //   projectGids: ['PASTE_GID_HERE'],
  //   color: '#D4537E',
  // },
];

// ═══════════════════════════════════════════════════════════
// MASTER VIEW — only shown when there are 2+ individual clients
// When only one client exists, showing "All clients" alongside it
// is redundant (they'd display identical data), so we hide it.
// ═══════════════════════════════════════════════════════════
const ALL_CLIENTS_VIEW = {
  id: 'all',
  name: 'All clients',
  projectGids: INDIVIDUAL_CLIENTS.flatMap(c => c.projectGids),
  color: '#7F77DD',
  isMaster: true,
};

// Final exported list
// Only include the master view when there are multiple clients
export const CLIENTS = INDIVIDUAL_CLIENTS.length > 1
  ? [ALL_CLIENTS_VIEW, ...INDIVIDUAL_CLIENTS]
  : INDIVIDUAL_CLIENTS;

// Default client shown on first load
// If 'all' isn't available (single client), fall back to the first individual one
export const DEFAULT_CLIENT = INDIVIDUAL_CLIENTS.length > 1
  ? 'all'
  : INDIVIDUAL_CLIENTS[0]?.id || 'project-hub';

// Helper to get a client by id
export function getClient(clientId) {
  return CLIENTS.find(c => c.id === clientId) || CLIENTS[0];
}
