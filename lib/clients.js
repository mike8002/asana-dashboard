// lib/clients.js
// ═══════════════════════════════════════════════════════════
// CLIENT REGISTRY
// Add a new client here whenever you set up a new Asana project
// ═══════════════════════════════════════════════════════════
//
// HOW TO ADD A NEW CLIENT:
// 1. Get the Asana project GID from the URL:
//    https://app.asana.com/1/WORKSPACE/project/PROJECT_GID/list/...
// 2. Add a new entry to the CLIENTS array below
// 3. Commit & push — the dashboard auto-updates
//
// FIELDS:
// - id          unique slug used internally (no spaces, lowercase)
// - name        display name shown in the dropdown
// - projectGids array of Asana project GIDs (one client can have multiple projects)
// - color       accent colour for this client (optional — picks from palette)
//
// ═══════════════════════════════════════════════════════════

export const CLIENTS = [
  {
    id: 'project-hub',
    name: 'Project Hub',
    projectGids: ['1213523346795620'],
    color: '#7F77DD',
  },
  // Example entries — uncomment and edit when you add new clients:
  //
  // {
  //   id: 'emirates',
  //   name: 'Emirates',
  //   projectGids: ['1234567890123456'],
  //   color: '#E24B4A',
  // },
  // {
  //   id: 'etihad',
  //   name: 'Etihad',
  //   projectGids: ['2345678901234567'],
  //   color: '#EF9F27',
  // },
  // {
  //   id: 'dyson',
  //   name: 'Dyson',
  //   projectGids: ['3456789012345678'],
  //   color: '#378ADD',
  // },
];

// Default client shown on first load (matches the id above)
export const DEFAULT_CLIENT = 'project-hub';

// Helper to get a client by id
export function getClient(clientId) {
  return CLIENTS.find(c => c.id === clientId) || CLIENTS[0];
}
