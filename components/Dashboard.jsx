'use client';
import { useState } from 'react';
import { signOut } from 'next-auth/react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer,
} from 'recharts';

// ── Status badge component ──────────────────────────────
function StatusBadge({ status }) {
  const styles = {
    Completed: 'bg-emerald-950/60 text-emerald-400 border border-emerald-800/40',
    'In progress': 'bg-blue-950/60 text-blue-400 border border-blue-800/40',
    Overdue: 'bg-red-950/60 text-red-400 border border-red-800/40',
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] || 'bg-neutral-800 text-neutral-400'}`}>
      {status}
    </span>
  );
}

// ── Scorecard component ─────────────────────────────────
function Scorecard({ label, value, color = 'text-white', sub }) {
  return (
    <div className="bg-[#141414] rounded-xl p-5 border border-[#1e1e1e]">
      <p className="text-xs text-neutral-500 mb-1.5 uppercase tracking-wider">{label}</p>
      <p className={`text-3xl font-semibold tracking-tight ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-neutral-600 mt-1">{sub}</p>}
    </div>
  );
}

// ── Horizontal bar component ────────────────────────────
function HorizontalBar({ name, value, maxValue, color = '#7F77DD', suffix = '' }) {
  const pct = maxValue > 0 ? (value / maxValue) * 100 : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-neutral-500 w-20 text-right truncate">{name}</span>
      <div className="flex-1 bg-[#1a1a1a] rounded h-5 overflow-hidden">
        <div
          className="h-full rounded transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
      <span className="text-xs text-neutral-500 w-10 text-right">{value}{suffix}</span>
    </div>
  );
}

// ── Progress bar for projects ───────────────────────────
function ProjectProgress({ name, pct }) {
  const color = pct >= 70 ? '#1D9E75' : pct >= 40 ? '#EF9F27' : '#E24B4A';
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <span className="text-xs text-neutral-400">{name}</span>
        <span className="text-xs text-neutral-500">{pct}%</span>
      </div>
      <div className="bg-[#1a1a1a] rounded h-2.5 overflow-hidden">
        <div
          className="h-full rounded transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

// ── Chart card wrapper ──────────────────────────────────
function ChartCard({ title, children }) {
  return (
    <div className="bg-[#141414] rounded-xl p-5 border border-[#1e1e1e]">
      <h3 className="text-sm font-medium text-neutral-300 mb-4">{title}</h3>
      {children}
    </div>
  );
}

// ── Pie chart colours ───────────────────────────────────
const PIE_COLORS = {
  Completed: '#1D9E75',
  'In progress': '#378ADD',
  Overdue: '#E24B4A',
};

// ── Format date for display ─────────────────────────────
function formatDate(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// ══════════════════════════════════════════════════════════
// MAIN DASHBOARD
// ══════════════════════════════════════════════════════════
export default function Dashboard({ data, error, userName, userImage }) {
  const [filter, setFilter] = useState('all');

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-center">
          <p className="text-red-400 mb-2">Failed to load dashboard</p>
          <p className="text-sm text-neutral-500">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
        <div className="text-neutral-500">Loading...</div>
      </div>
    );
  }

  const { summary, tasks, projects, workload } = data;

  // Filter tasks by assignee
  const filteredTasks = filter === 'all'
    ? tasks
    : tasks.filter((t) => t.assignee === filter);

  // Status breakdown for pie chart
  const statusCounts = {};
  filteredTasks.forEach((t) => {
    statusCounts[t.status] = (statusCounts[t.status] || 0) + 1;
  });
  const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

  // Max tasks for bar scaling
  const maxTasks = workload.length > 0 ? workload[0].total : 1;
  const maxHours = workload.length > 0
    ? Math.max(...workload.map((w) => w.hoursLogged))
    : 1;

  // Unique assignees for filter
  const assignees = [...new Set(tasks.map((t) => t.assignee))].filter(
    (a) => a !== 'Unassigned'
  ).sort();

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-200">
      {/* ── Header ─────────────────────────────────────── */}
      <header className="border-b border-[#1e1e1e] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold text-white tracking-tight">
              Project Hub
            </h1>
            <p className="text-xs text-neutral-600 mt-0.5">
              UM MENAT — Dubai & Lebanon
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* Assignee filter */}
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="bg-[#141414] border border-[#262626] rounded-lg px-3 py-1.5
                         text-xs text-neutral-400 cursor-pointer
                         focus:outline-none focus:border-[#333]"
            >
              <option value="all">All team members</option>
              {assignees.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>

            {/* User avatar & sign out */}
            <div className="flex items-center gap-2">
              {userImage && (
                <img
                  src={userImage}
                  alt=""
                  className="w-7 h-7 rounded-full"
                />
              )}
              <button
                onClick={() => signOut()}
                className="text-xs text-neutral-600 hover:text-neutral-400 transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* ── Dashboard content ──────────────────────────── */}
      <main className="max-w-7xl mx-auto px-6 py-6 space-y-6">

        {/* Row 1: Scorecards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Scorecard label="Total tasks" value={summary.totalTasks} />
          <Scorecard label="Completed" value={summary.completed} color="text-emerald-400" />
          <Scorecard label="Overdue" value={summary.overdue} color="text-red-400" />
          <Scorecard
            label="Hours logged"
            value={summary.hoursLogged > 0 ? `${summary.hoursLogged}h` : '—'}
            sub={summary.hoursLogged === 0 ? 'Requires Asana Business' : ''}
          />
        </div>

        {/* Row 2: Pie chart + Tasks per member */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ChartCard title="Tasks by status">
            <div className="flex items-center justify-center gap-6">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%" cy="50%"
                    innerRadius={42} outerRadius={70}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {pieData.map((entry) => (
                      <Cell key={entry.name} fill={PIE_COLORS[entry.name] || '#555'} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      background: '#1a1a1a', border: '1px solid #262626',
                      borderRadius: '8px', fontSize: '12px', color: '#ccc',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 text-xs text-neutral-400">
                {pieData.map((entry) => (
                  <div key={entry.name} className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-sm inline-block"
                      style={{ background: PIE_COLORS[entry.name] || '#555' }}
                    />
                    {entry.name} ({entry.value})
                  </div>
                ))}
              </div>
            </div>
          </ChartCard>

          <ChartCard title="Tasks per team member">
            <div className="space-y-2.5">
              {workload
                .filter((w) => w.name !== 'Unassigned')
                .slice(0, 8)
                .map((w) => (
                  <HorizontalBar
                    key={w.name}
                    name={w.name}
                    value={w.total}
                    maxValue={maxTasks}
                    color="#7F77DD"
                  />
                ))}
            </div>
          </ChartCard>
        </div>

        {/* Row 3: Project completion + Hours logged */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ChartCard title="Project completion">
            <div className="space-y-4">
              {projects.map((p) => (
                <ProjectProgress
                  key={p.id}
                  name={p.name}
                  pct={p.completionPct}
                />
              ))}
            </div>
          </ChartCard>

          <ChartCard title="Hours logged by team member">
            {maxHours > 0 ? (
              <div className="space-y-2.5">
                {workload
                  .filter((w) => w.name !== 'Unassigned' && w.hoursLogged > 0)
                  .sort((a, b) => b.hoursLogged - a.hoursLogged)
                  .slice(0, 8)
                  .map((w) => (
                    <HorizontalBar
                      key={w.name}
                      name={w.name}
                      value={Math.round(w.hoursLogged)}
                      maxValue={Math.round(maxHours)}
                      color="#5DCAA5"
                      suffix="h"
                    />
                  ))}
              </div>
            ) : (
              <p className="text-xs text-neutral-600 py-8 text-center">
                No time tracking data — requires Asana Business plan
              </p>
            )}
          </ChartCard>
        </div>

        {/* Row 4: Task detail table */}
        <div className="bg-[#141414] rounded-xl border border-[#1e1e1e] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#1e1e1e]">
            <h3 className="text-sm font-medium text-neutral-300">Task details</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1e1e1e]">
                  <th className="text-left px-5 py-3 text-neutral-500 font-medium">Task name</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">Assignee</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">Section</th>
                  <th className="text-left px-4 py-3 text-neutral-500 font-medium">Status</th>
                  <th className="text-right px-5 py-3 text-neutral-500 font-medium">Due date</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.slice(0, 50).map((task) => (
                  <tr
                    key={task.id}
                    className="border-b border-[#1a1a1a] hover:bg-[#1a1a1a] transition-colors"
                  >
                    <td className="px-5 py-3 text-neutral-300 max-w-xs truncate">
                      {task.name}
                    </td>
                    <td className="px-4 py-3 text-neutral-500">{task.assignee}</td>
                    <td className="px-4 py-3 text-neutral-500">{task.section || '—'}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={task.status} />
                    </td>
                    <td className={`px-5 py-3 text-right ${
                      task.status === 'Overdue' ? 'text-red-400' : 'text-neutral-500'
                    }`}>
                      {formatDate(task.dueDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {filteredTasks.length > 50 && (
            <div className="px-5 py-3 text-xs text-neutral-600 border-t border-[#1e1e1e]">
              Showing 50 of {filteredTasks.length} tasks
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="text-[11px] text-neutral-700 text-center pb-4">
          Data refreshes every 5 minutes · Powered by Asana API
        </p>
      </main>
    </div>
  );
}
