'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { signOut } from 'next-auth/react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import {
  getSummary, getMemberStats, getTimingSplit, getWeeklyTrend,
  getBacklogTrend, getSubtaskSplit, getHubWeekly, getHubTurnaround,
  getProjectHealth, getHeatmapData, getGanttData, getVelocityData,
  getRadarScores, getCompositeScore,
  getBrandBreakdown, getMarketBreakdown, getCampaignBreakdown,
  getMilestones, getBlockedTasks, getBudgetSummaries,
} from '../lib/process';
import { WEEKLY_CAPACITY } from '../lib/config';
import { useTheme } from './ThemeProvider';

function useChartColors() {
  const { theme } = useTheme();
  return {
    teal: theme === 'light' ? '#059669' : '#1D9E75',
    blue: theme === 'light' ? '#2563eb' : '#378ADD',
    red: theme === 'light' ? '#dc2626' : '#E24B4A',
    purple: theme === 'light' ? '#7c3aed' : '#7F77DD',
    amber: theme === 'light' ? '#d97706' : '#EF9F27',
    pink: theme === 'light' ? '#db2777' : '#D4537E',
    gray: theme === 'light' ? '#737373' : '#555',
    grid: theme === 'light' ? '#e5e5e5' : '#1c1c1c',
    tick: theme === 'light' ? '#a3a3a3' : '#555',
    tooltipBg: theme === 'light' ? '#ffffff' : '#1a1a1a',
    tooltipBorder: theme === 'light' ? '#e5e5e5' : '#262626',
    tooltipText: theme === 'light' ? '#171717' : '#ccc',
  };
}

function Card({ title, children, className = '' }) {
  return (
    <div className={`rounded-xl p-5 ${className}`} style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      {title && <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-muted)' }}>{title}</h3>}
      {children}
    </div>
  );
}

function Metric({ label, value, color, sub }) {
  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <p className="text-[11px] uppercase tracking-wider mb-1" style={{ color: 'var(--text-faint)' }}>{label}</p>
      <p className="text-2xl font-semibold tracking-tight" style={{ color: color || 'var(--text)' }}>{value}</p>
      {sub && <p className="text-[11px] mt-1" style={{ color: 'var(--text-fainter)' }}>{sub}</p>}
    </div>
  );
}

function RagDot({ level }) {
  const C = useChartColors();
  const colors = { green: C.teal, amber: C.amber, red: C.red };
  return <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: colors[level] }} />;
}

function HBar({ name, value, max, color, suffix = '', displayValue }) {
  const C = useChartColors();
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-xs w-28 text-right truncate" style={{ color: 'var(--text-dim)' }}>{name}</span>
      <div className="flex-1 rounded h-4 overflow-hidden" style={{ background: 'var(--surface-3)' }}>
        <div className="h-full rounded" style={{ width: `${pct}%`, background: color || C.purple, transition: 'width .4s' }} />
      </div>
      <span className="text-xs w-16 text-right" style={{ color: 'var(--text-dim)' }}>{displayValue !== undefined ? displayValue : value}{suffix}</span>
    </div>
  );
}

function TaskLink({ url, children }) {
  if (!url) return <span>{children}</span>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: 'var(--text)' }}>{children}</a>
  );
}

function ThemeToggle() {
  const { theme, toggleTheme, mounted } = useTheme();
  if (!mounted) return <div className="w-7 h-7" />;

  return (
    <button onClick={toggleTheme} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className="rounded-lg p-1.5 transition-colors"
      style={{ background: 'var(--surface-2)', border: '1px solid var(--border-strong)', color: 'var(--text-dim)' }}>
      {theme === 'dark' ? (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4"/>
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>
        </svg>
      ) : (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
}

const TABS = [
  'Overview', 'Backlog & Capacity', 'On-Time & Slippage',
  'Turnaround & Velocity', 'By Member', 'Dubai vs Lebanon',
  'Projects & Funnel', 'Timeline & Heatmap', 'Performance Radar',
  'Breakdowns', 'Milestones & Blockers', 'Budgets',
];

export default function Dashboard({ data, error, userName, userImage, clients, activeClient }) {
  const router = useRouter();
  const C = useChartColors();
  const [tab, setTab] = useState(0);
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const URGENCY_COLORS = { Overdue: C.red, 'Due soon': C.amber, Upcoming: C.blue, 'No date': C.gray };
  const TT_STYLE = {
    contentStyle: { background: C.tooltipBg, border: `1px solid ${C.tooltipBorder}`, borderRadius: 8, fontSize: 12, color: C.tooltipText },
    cursor: { fill: 'rgba(128,128,128,.05)' },
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/refresh', { method: 'POST' });
      window.location.reload();
    } catch (e) { setRefreshing(false); }
  };

  const handleClientChange = (e) => {
    router.push(`/?client=${e.target.value}`);
  };

  const processed = useMemo(() => {
    if (!data) return null;
    const members = getMemberStats(data.tasks);
    return {
      summary: getSummary(data.tasks), members,
      timing: getTimingSplit(data.tasks),
      weekly: getWeeklyTrend(data.tasks),
      backlog: getBacklogTrend(data.tasks),
      subtaskSplit: getSubtaskSplit(data.tasks),
      hubWeekly: getHubWeekly(data.tasks, members),
      hubTurnaround: getHubTurnaround(members),
      heatmap: getHeatmapData(data.tasks),
      gantt: getGanttData(data.tasks),
      velocity: getVelocityData(members, data.tasks),
      radarDubai: getRadarScores(members, 'Dubai'),
      radarLebanon: getRadarScores(members, 'Lebanon'),
      composite: getCompositeScore(members),
      brands: getBrandBreakdown(data.tasks),
      markets: getMarketBreakdown(data.tasks),
      campaigns: getCampaignBreakdown(data.tasks),
      milestones: getMilestones(data.tasks),
      blocked: getBlockedTasks(data.tasks),
      budgets: getBudgetSummaries(data.tasks, data.numberFieldNames),
    };
  }, [data]);

  if (error) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <div className="text-center">
        <p className="mb-2" style={{ color: C.red }}>Failed to load</p>
        <p className="text-sm" style={{ color: 'var(--text-dim)' }}>{error}</p>
      </div>
    </div>
  );

  if (!data || !processed) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'var(--bg)' }}>
      <p style={{ color: 'var(--text-dim)' }}>Loading dashboard…</p>
    </div>
  );

  const { summary, members } = processed;
  const assignees = members.map(m => m.name).filter(n => n !== 'Unassigned');
  const filteredTasks = filter === 'all' ? data.tasks : data.tasks.filter(t => t.assignee === filter);

  const selectStyle = { background: 'var(--surface-2)', border: '1px solid var(--border-strong)', color: 'var(--text-muted)' };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <header className="px-4 py-3 sticky top-0 z-30 backdrop-blur"
        style={{ borderBottom: '1px solid var(--border)', background: 'color-mix(in srgb, var(--bg) 95%, transparent)' }}>
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold tracking-tight" style={{ color: 'var(--text)' }}>Team Utilisation</span>
            <span className="w-px h-4" style={{ background: 'var(--border-strong)' }}></span>
            <select value={activeClient.id} onChange={handleClientChange}
              className="rounded-lg px-3 py-1.5 text-xs font-medium focus:outline-none cursor-pointer"
              style={{ ...selectStyle, color: 'var(--text)' }}>
              {clients.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
            </select>
            <span className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: 'var(--accent-teal-bg)', color: 'var(--accent-teal-text)', border: '1px solid var(--accent-teal-border)' }}>Live</span>
          </div>
          <div className="flex items-center gap-3">
            <select value={filter} onChange={e => setFilter(e.target.value)}
              className="rounded-lg px-3 py-1.5 text-xs focus:outline-none" style={selectStyle}>
              <option value="all">All members</option>
              {assignees.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <button onClick={handleRefresh} disabled={refreshing}
              className="text-xs rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50" style={selectStyle}>
              {refreshing ? 'Refreshing…' : '↻ Refresh'}
            </button>
            <ThemeToggle />
            <div className="flex items-center gap-2">
              {userImage && <img src={userImage} alt="" className="w-6 h-6 rounded-full" />}
              <button onClick={() => signOut()} className="text-xs transition-colors" style={{ color: 'var(--text-faint)' }}>Sign out</button>
            </div>
          </div>
        </div>
      </header>

      <nav className="px-4 overflow-x-auto" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-[1400px] mx-auto flex gap-0">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)} className="px-4 py-2.5 text-xs whitespace-nowrap transition-colors"
              style={{
                borderBottom: tab === i ? '2px solid var(--text)' : '2px solid transparent',
                color: tab === i ? 'var(--text)' : 'var(--text-faint)',
              }}>{t}</button>
          ))}
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto px-4 py-5 space-y-4">
        {tab === 0 && <TabOverview d={processed} tasks={filteredTasks} C={C} URGENCY_COLORS={URGENCY_COLORS} TT_STYLE={TT_STYLE} />}
        {tab === 1 && <TabBacklog d={processed} C={C} TT_STYLE={TT_STYLE} />}
        {tab === 2 && <TabOnTime d={processed} C={C} />}
        {tab === 3 && <TabVelocity d={processed} C={C} TT_STYLE={TT_STYLE} />}
        {tab === 4 && <TabMembers d={processed} />}
        {tab === 5 && <TabHubs d={processed} C={C} TT_STYLE={TT_STYLE} />}
        {tab === 6 && <TabProjects projects={data.projects} funnel={data.funnel} C={C} />}
        {tab === 7 && <TabTimeline d={processed} C={C} />}
        {tab === 8 && <TabRadar d={processed} C={C} />}
        {tab === 9 && <TabBreakdowns d={processed} C={C} />}
        {tab === 10 && <TabMilestonesBlockers d={processed} />}
        {tab === 11 && <TabBudgets d={processed} C={C} />}

        <p className="text-[11px] text-center pt-2 pb-4" style={{ color: 'var(--text-fainter)' }}>
          {activeClient.name} · Last synced {new Date(data.fetchedAt).toLocaleString()} · Cache refreshes every 2 days
        </p>
      </main>
    </div>
  );
}

function TabOverview({ d, tasks, C, URGENCY_COLORS, TT_STYLE }) {
  const { summary, members, timing, weekly } = d;
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Total tasks" value={summary.total} />
        <Metric label="Completed" value={summary.completed} color={C.teal} />
        <Metric label="Overdue" value={summary.overdue} color={C.red} />
        <Metric label="Hours logged" value={summary.hours > 0 ? `${summary.hours}h` : '—'}
          sub={summary.hours === 0 ? 'Requires Asana Business' : ''} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card title="Task load by member">
          <div className="space-y-2">
            {members.filter(m => m.name !== 'Unassigned').slice(0, 10).map(m => {
              const max = Math.max(1, m.overdue + m.dueSoon + m.upcoming + m.noDate);
              return (
                <div key={m.name} className="flex items-center gap-2.5">
                  <span className="text-xs w-24 text-right truncate" style={{ color: 'var(--text-dim)' }}>{m.name}</span>
                  <div className="flex-1 flex h-4 rounded overflow-hidden" style={{ background: 'var(--surface-3)' }}>
                    {m.overdue > 0 && <div style={{ width: `${(m.overdue/max)*100}%`, background: C.red }} />}
                    {m.dueSoon > 0 && <div style={{ width: `${(m.dueSoon/max)*100}%`, background: C.amber }} />}
                    {m.upcoming > 0 && <div style={{ width: `${(m.upcoming/max)*100}%`, background: C.blue }} />}
                    {m.noDate > 0 && <div style={{ width: `${(m.noDate/max)*100}%`, background: C.gray }} />}
                  </div>
                  <span className="text-xs w-8 text-right" style={{ color: 'var(--text-dim)' }}>{m.total - m.completed}</span>
                </div>
              );
            })}
            <div className="flex gap-4 mt-3 text-[10px]" style={{ color: 'var(--text-faint)' }}>
              {Object.entries(URGENCY_COLORS).map(([k, c]) => (
                <span key={k} className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: c }} />{k}</span>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Task timing split">
          <div className="flex items-center justify-center gap-6">
            <ResponsiveContainer width={150} height={150}>
              <PieChart>
                <Pie data={timing} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value" stroke="none">
                  {timing.map(e => <Cell key={e.name} fill={URGENCY_COLORS[e.name] || C.gray} />)}
                </Pie>
                <Tooltip {...TT_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 text-xs" style={{ color: 'var(--text-dim)' }}>
              {timing.map(e => (
                <div key={e.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: URGENCY_COLORS[e.name] }} />{e.name} ({e.value})
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card title="Weekly output trend">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weekly}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
            <XAxis dataKey="week" tick={{ fill: C.tick, fontSize: 11 }} />
            <YAxis tick={{ fill: C.tick, fontSize: 11 }} />
            <Tooltip {...TT_STYLE} />
            <Bar dataKey="completed" fill={C.teal} radius={[3, 3, 0, 0]} name="Completed" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </>
  );
}

function TabBacklog({ d, C, TT_STYLE }) {
  const { backlog, subtaskSplit, members, weekly } = d;
  const capacityData = weekly.map(w => ({
    week: w.week,
    capacity: members.filter(m => m.name !== 'Unassigned').length * WEEKLY_CAPACITY,
    actual: w.completed,
  }));

  return (
    <>
      <Card title="Backlog trend — created vs completed">
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={backlog}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
            <XAxis dataKey="week" tick={{ fill: C.tick, fontSize: 11 }} />
            <YAxis tick={{ fill: C.tick, fontSize: 11 }} />
            <Tooltip {...TT_STYLE} />
            <Line type="monotone" dataKey="created" stroke={C.amber} strokeWidth={2} dot={false} name="Created" />
            <Line type="monotone" dataKey="completed" stroke={C.teal} strokeWidth={2} dot={false} name="Completed" />
            <Line type="monotone" dataKey="backlog" stroke={C.red} strokeWidth={2} dot={false} name="Open backlog" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card title="Capacity vs actual output">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={capacityData}>
              <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
              <XAxis dataKey="week" tick={{ fill: C.tick, fontSize: 11 }} />
              <YAxis tick={{ fill: C.tick, fontSize: 11 }} />
              <Tooltip {...TT_STYLE} />
              <Bar dataKey="capacity" fill={C.gray} radius={[3, 3, 0, 0]} name="Capacity" />
              <Bar dataKey="actual" fill={C.teal} radius={[3, 3, 0, 0]} name="Actual" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Subtask vs top-level split">
          <div className="flex items-center justify-center gap-6">
            <ResponsiveContainer width={150} height={150}>
              <PieChart>
                <Pie data={subtaskSplit} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={2} dataKey="value" stroke="none">
                  <Cell fill={C.purple} /><Cell fill={C.blue} />
                </Pie>
                <Tooltip {...TT_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 text-xs" style={{ color: 'var(--text-dim)' }}>
              {subtaskSplit.map((e, i) => (
                <div key={e.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: i === 0 ? C.purple : C.blue }} />{e.name} ({e.value})
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

function TabOnTime({ d, C }) {
  const { members } = d;
  const rated = members.filter(m => m.onTimeRate !== null && m.name !== 'Unassigned');
  const maxOnTimeLate = Math.max(...rated.map(m => m.onTimeCount + m.lateCount), 1);

  return (
    <>
      <Card title="On-time rate ranking">
        {rated.length === 0 ? (
          <p className="text-xs py-4 text-center" style={{ color: 'var(--text-faint)' }}>No tasks with both due dates and completion dates</p>
        ) : (
          <div className="space-y-2.5">
            {rated.sort((a, b) => b.onTimeRate - a.onTimeRate).map(m => {
              const color = m.onTimeRate >= 85 ? C.teal : m.onTimeRate >= 75 ? C.amber : C.red;
              return <HBar key={m.name} name={m.name} value={m.onTimeRate} max={100} color={color} suffix="%" />;
            })}
          </div>
        )}
      </Card>

      <Card title="On-time vs late — task count">
        {rated.length === 0 ? (
          <p className="text-xs py-4 text-center" style={{ color: 'var(--text-faint)' }}>No data available</p>
        ) : (
          <div className="space-y-2.5">
            {rated.map(m => (
              <div key={m.name} className="flex items-center gap-2.5">
                <span className="text-xs w-24 text-right truncate" style={{ color: 'var(--text-dim)' }}>{m.name}</span>
                <div className="flex-1 flex h-4 rounded overflow-hidden" style={{ background: 'var(--surface-3)' }}>
                  <div style={{ width: `${(m.onTimeCount / maxOnTimeLate) * 100}%`, background: C.teal }} />
                  <div style={{ width: `${(m.lateCount / maxOnTimeLate) * 100}%`, background: C.red }} />
                </div>
                <span className="text-xs w-16 text-right" style={{ color: 'var(--text-dim)' }}>{m.onTimeCount}✓ {m.lateCount}✗</span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

function TabVelocity({ d, C, TT_STYLE }) {
  const { members, velocity } = d;
  const withTurnaround = members.filter(m => m.avgTurnaround && m.name !== 'Unassigned');
  const maxDays = Math.max(...withTurnaround.map(m => m.avgTurnaround), 1);
  const memberNames = members.filter(m => m.name !== 'Unassigned').slice(0, 6).map(m => m.name);
  const lineColors = [C.purple, C.teal, C.blue, C.amber, C.pink, C.red];

  return (
    <>
      <Card title="Average turnaround by member">
        <p className="text-[11px] mb-3" style={{ color: 'var(--text-faint)' }}>Days from creation to completion — lower is better</p>
        {withTurnaround.length === 0 ? (
          <p className="text-xs py-4 text-center" style={{ color: 'var(--text-faint)' }}>No completed tasks with creation dates</p>
        ) : (
          <div className="space-y-2.5">
            {withTurnaround.sort((a, b) => a.avgTurnaround - b.avgTurnaround).map(m => (
              <HBar key={m.name} name={m.name} value={m.avgTurnaround} max={maxDays}
                color={m.avgTurnaround <= 7 ? C.teal : m.avgTurnaround <= 14 ? C.amber : C.red} suffix="d" />
            ))}
          </div>
        )}
      </Card>

      <Card title="Task velocity — weekly completions per member">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={velocity}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
            <XAxis dataKey="week" tick={{ fill: C.tick, fontSize: 11 }} />
            <YAxis tick={{ fill: C.tick, fontSize: 11 }} />
            <Tooltip {...TT_STYLE} />
            {memberNames.map((name, i) => (
              <Line key={name} type="monotone" dataKey={name} stroke={lineColors[i % lineColors.length]} strokeWidth={1.5} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Card>
    </>
  );
}

function TabMembers({ d }) {
  const { members } = d;
  const C = useChartColors();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {members.filter(m => m.name !== 'Unassigned').map(m => (
        <Card key={m.name}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium"
              style={{ background: 'var(--surface-3)', color: 'var(--text-muted)' }}>
              {m.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
            </div>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--text)' }}>{m.name}</p>
              <p className="text-[11px]" style={{ color: 'var(--text-faint)' }}>{m.hub}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-lg p-2.5" style={{ background: 'var(--surface-4)' }}>
              <p className="text-lg font-semibold" style={{ color: 'var(--text)' }}>{m.total}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>Total</p>
            </div>
            <div className="rounded-lg p-2.5" style={{ background: 'var(--surface-4)' }}>
              <p className="text-lg font-semibold" style={{ color: C.teal }}>{m.completed}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>Done</p>
            </div>
            <div className="rounded-lg p-2.5" style={{ background: 'var(--surface-4)' }}>
              <p className="text-lg font-semibold" style={{ color: m.overdue > 0 ? C.red : 'var(--text-dim)' }}>{m.overdue}</p>
              <p className="text-[10px]" style={{ color: 'var(--text-faint)' }}>Overdue</p>
            </div>
          </div>
          <div className="mt-3 space-y-1.5 text-xs" style={{ color: 'var(--text-dim)' }}>
            {m.onTimeRate !== null && (
              <div className="flex justify-between">
                <span>On-time rate</span>
                <span style={{ color: m.onTimeRate >= 85 ? C.teal : m.onTimeRate >= 75 ? C.amber : C.red }}>{m.onTimeRate}%</span>
              </div>
            )}
            {m.avgTurnaround && (<div className="flex justify-between"><span>Avg turnaround</span><span>{m.avgTurnaround} days</span></div>)}
            {m.hours > 0 && (<div className="flex justify-between"><span>Hours logged</span><span>{m.hours}h</span></div>)}
          </div>
        </Card>
      ))}
    </div>
  );
}

function TabHubs({ d, C, TT_STYLE }) {
  const { hubWeekly, hubTurnaround, members } = d;
  const hubSummary = {};
  members.forEach(m => {
    if (!hubSummary[m.hub]) hubSummary[m.hub] = { total: 0, completed: 0, overdue: 0, members: 0 };
    hubSummary[m.hub].total += m.total;
    hubSummary[m.hub].completed += m.completed;
    hubSummary[m.hub].overdue += m.overdue;
    hubSummary[m.hub].members++;
  });

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(hubSummary).map(([hub, s]) => (
          <Metric key={hub} label={`${hub} — tasks`} value={s.total} sub={`${s.members} members · ${s.overdue} overdue`} />
        ))}
      </div>

      <Card title="Weekly output — Dubai vs Lebanon">
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={hubWeekly}>
            <CartesianGrid strokeDasharray="3 3" stroke={C.grid} />
            <XAxis dataKey="week" tick={{ fill: C.tick, fontSize: 11 }} />
            <YAxis tick={{ fill: C.tick, fontSize: 11 }} />
            <Tooltip {...TT_STYLE} />
            <Bar dataKey="Dubai" fill={C.blue} radius={[3, 3, 0, 0]} />
            <Bar dataKey="Lebanon" fill={C.amber} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Turnaround — hub comparison">
        <div className="space-y-2.5">
          {hubTurnaround.map(h => (
            <HBar key={h.hub} name={h.hub} value={h.avgDays} max={Math.max(...hubTurnaround.map(x => x.avgDays), 1)}
              color={h.hub === 'Dubai' ? C.blue : C.amber} suffix=" days" />
          ))}
        </div>
      </Card>
    </>
  );
}

function TabProjects({ projects, funnel, C }) {
  const maxFunnel = funnel.length > 0 ? funnel[0].count : 1;
  return (
    <>
      <Card title="Task stage funnel — all projects">
        <div className="space-y-2.5">
          {funnel.slice(0, 12).map(f => (<HBar key={f.name} name={f.name} value={f.count} max={maxFunnel} color={C.purple} />))}
        </div>
      </Card>

      <Card title="Project health scorecard">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="text-left py-2.5 font-medium" style={{ color: 'var(--text-dim)' }}>Project</th>
                <th className="text-center py-2.5 font-medium" style={{ color: 'var(--text-dim)' }}>Health</th>
                <th className="text-right py-2.5 font-medium" style={{ color: 'var(--text-dim)' }}>Completion</th>
                <th className="text-right py-2.5 font-medium" style={{ color: 'var(--text-dim)' }}>Overdue</th>
                <th className="text-right py-2.5 font-medium" style={{ color: 'var(--text-dim)' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => {
                const health = getProjectHealth(p);
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="py-2.5" style={{ color: 'var(--text)' }}>{p.name}</td>
                    <td className="py-2.5 text-center"><RagDot level={health} /></td>
                    <td className="py-2.5 text-right" style={{ color: 'var(--text-muted)' }}>{p.completionPct}%</td>
                    <td className="py-2.5 text-right" style={{ color: C.red }}>{p.overdueTasks}</td>
                    <td className="py-2.5 text-right" style={{ color: 'var(--text-dim)' }}>{p.totalTasks}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function TabTimeline({ d, C }) {
  const { theme } = useTheme();
  const { heatmap, gantt } = d;
  const maxCount = Math.max(...heatmap.map(h => h.count), 1);
  const weeks = [];
  for (let i = 0; i < heatmap.length; i += 7) weeks.push(heatmap.slice(i, i + 7));

  const ganttDates = gantt.flatMap(g => [g.start, g.end]).filter(Boolean).sort();
  const ganttStart = ganttDates[0] || new Date().toISOString().substring(0, 10);
  const ganttEnd = ganttDates[ganttDates.length - 1] || ganttStart;
  const ganttRange = Math.max(1, Math.ceil((new Date(ganttEnd) - new Date(ganttStart)) / 86400000));

  function getDayBg(day, intensity) {
    if (theme === 'light') {
      if (day.isWeekend) return '#f5f5f5';
      if (day.isPast) return '#eeeeee';
      if (day.count === 0) return '#fafafa';
      const r = Math.round(220 - intensity * 180);
      const g = Math.round(252 - intensity * 100);
      const b = Math.round(231 - intensity * 130);
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      if (day.isWeekend) return '#0e0e0e';
      if (day.isPast) return '#181818';
      if (day.count === 0) return '#141414';
      const r = Math.round(29 + intensity * 100);
      const g = Math.round(158 + intensity * (-60));
      const b = Math.round(117 + intensity * (-40));
      return `rgb(${r}, ${g}, ${b})`;
    }
  }

  return (
    <>
      <Card title="Workload heatmap — tasks due per day">
        <div className="space-y-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex gap-1">
              {week.map(day => {
                const intensity = day.count / maxCount;
                return (
                  <div key={day.date} title={`${day.date}: ${day.count} tasks`}
                    className="flex-1 h-10 rounded flex flex-col items-center justify-center text-[9px]"
                    style={{ background: getDayBg(day, intensity) }}>
                    <span style={{ color: 'var(--text-faint)' }}>{day.dayName}</span>
                    <span style={{ color: day.count > 0 ? (theme === 'light' ? '#171717' : '#fff') : 'var(--text-fainter)', fontWeight: day.count > 0 ? 500 : 400 }}>{day.day}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </Card>

      <Card title="Gantt-style task timeline">
        <div className="space-y-1.5">
          {gantt.map((g, i) => {
            const startOffset = Math.max(0, Math.ceil((new Date(g.start) - new Date(ganttStart)) / 86400000));
            const duration = Math.max(1, Math.ceil((new Date(g.end) - new Date(g.start)) / 86400000));
            const left = (startOffset / ganttRange) * 100;
            const width = Math.max(2, (duration / ganttRange) * 100);
            const color = g.status === 'Overdue' ? C.red : C.blue;

            const Bar = (
              <div className="flex-1 relative h-5 rounded" style={{ background: 'var(--surface-4)' }}>
                <div className="absolute h-full rounded flex items-center px-1.5"
                  style={{ left: `${left}%`, width: `${width}%`, background: color, minWidth: 4 }}>
                  <span className="text-[9px] text-white truncate">{g.name}</span>
                </div>
              </div>
            );

            return (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] w-20 text-right truncate" style={{ color: 'var(--text-faint)' }}>{g.assignee}</span>
                {g.url ? <a href={g.url} target="_blank" rel="noopener noreferrer" className="flex-1">{Bar}</a> : Bar}
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}

function TabRadar({ d, C }) {
  const { radarDubai, radarLebanon, composite } = d;
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card title="Performance radar — Dubai">
          {radarDubai.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarDubai}>
                <PolarGrid stroke={C.grid} />
                <PolarAngleAxis dataKey="metric" tick={{ fill: C.tick, fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: C.tick, fontSize: 10 }} />
                <Radar name="Dubai" dataKey="score" stroke={C.blue} fill={C.blue} fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          ) : <p className="text-xs py-10 text-center" style={{ color: 'var(--text-faint)' }}>No Dubai members mapped</p>}
        </Card>

        <Card title="Performance radar — Lebanon">
          {radarLebanon.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarLebanon}>
                <PolarGrid stroke={C.grid} />
                <PolarAngleAxis dataKey="metric" tick={{ fill: C.tick, fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: C.tick, fontSize: 10 }} />
                <Radar name="Lebanon" dataKey="score" stroke={C.amber} fill={C.amber} fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          ) : <p className="text-xs py-10 text-center" style={{ color: 'var(--text-faint)' }}>No Lebanon members mapped</p>}
        </Card>
      </div>

      <Card title="Full performance scorecard">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                <th className="text-left py-2.5 font-medium" style={{ color: 'var(--text-dim)' }}>Hub</th>
                <th className="text-center py-2.5 font-medium" style={{ color: 'var(--text-dim)' }}>Volume</th>
                <th className="text-center py-2.5 font-medium" style={{ color: 'var(--text-dim)' }}>On-time</th>
                <th className="text-center py-2.5 font-medium" style={{ color: 'var(--text-dim)' }}>Speed</th>
                <th className="text-center py-2.5 font-medium" style={{ color: 'var(--text-dim)' }}>Coverage</th>
                <th className="text-center py-2.5 font-medium" style={{ color: 'var(--text-dim)' }}>Consistency</th>
                <th className="text-center py-2.5 font-medium" style={{ color: 'var(--text-dim)' }}>Composite</th>
              </tr>
            </thead>
            <tbody>
              {composite.map(c => {
                const rag = c.composite >= 70 ? 'green' : c.composite >= 50 ? 'amber' : 'red';
                return (
                  <tr key={c.hub} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="py-2.5 font-medium" style={{ color: 'var(--text)' }}>{c.hub}</td>
                    {c.scores.map(s => (<td key={s.metric} className="py-2.5 text-center" style={{ color: 'var(--text-muted)' }}>{s.score}</td>))}
                    <td className="py-2.5 text-center font-medium">
                      <span className="inline-flex items-center gap-1.5"><RagDot level={rag} />{c.composite}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </>
  );
}

function BreakdownBlock({ title, data, color, C }) {
  if (!data || data.length === 0) {
    return (
      <Card title={title}>
        <p className="text-xs py-4 text-center" style={{ color: 'var(--text-faint)' }}>No data — ensure this custom field is populated in Asana</p>
      </Card>
    );
  }
  const max = data[0]?.total || 1;
  return (
    <Card title={title}>
      <div className="space-y-2.5">
        {data.slice(0, 10).map(item => (
          <div key={item.name} className="flex items-center gap-2.5">
            <span className="text-xs w-28 text-right truncate" style={{ color: 'var(--text-muted)' }}>{item.name}</span>
            <div className="flex-1 flex h-5 rounded overflow-hidden" style={{ background: 'var(--surface-3)' }}>
              <div style={{ width: `${(item.completed / max) * 100}%`, background: C.teal }} />
              <div style={{ width: `${((item.total - item.completed - item.overdue) / max) * 100}%`, background: color }} />
              <div style={{ width: `${(item.overdue / max) * 100}%`, background: C.red }} />
            </div>
            <span className="text-xs w-10 text-right" style={{ color: 'var(--text-dim)' }}>{item.total}</span>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-3 text-[10px]" style={{ color: 'var(--text-faint)' }}>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: C.teal }} />Completed</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: color }} />In progress</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: C.red }} />Overdue</span>
      </div>
    </Card>
  );
}

function TabBreakdowns({ d, C }) {
  return (
    <>
      <BreakdownBlock title="Task breakdown by brand" data={d.brands} color={C.purple} C={C} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <BreakdownBlock title="Task breakdown by market" data={d.markets} color={C.blue} C={C} />
        <BreakdownBlock title="Task breakdown by campaign" data={d.campaigns} color={C.amber} C={C} />
      </div>
    </>
  );
}

function TabMilestonesBlockers({ d }) {
  const C = useChartColors();
  const { milestones, blocked } = d;

  return (
    <>
      <Card title={`Upcoming milestones (${milestones.length})`}>
        {milestones.length === 0 ? (
          <p className="text-xs py-4 text-center" style={{ color: 'var(--text-faint)' }}>No milestone tasks — mark tasks as milestones in Asana</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  <th className="text-left py-2.5 font-medium" style={{ color: 'var(--text-dim)' }}>Milestone</th>
                  <th className="text-left py-2.5 font-medium" style={{ color: 'var(--text-dim)' }}>Owner</th>
                  <th className="text-center py-2.5 font-medium" style={{ color: 'var(--text-dim)' }}>Status</th>
                  <th className="text-right py-2.5 font-medium" style={{ color: 'var(--text-dim)' }}>Due</th>
                </tr>
              </thead>
              <tbody>
                {milestones.map((m, i) => {
                  const statusStyle = m.status === 'Completed'
                    ? { background: 'var(--accent-teal-bg)', color: 'var(--accent-teal-text)' }
                    : m.status === 'Overdue'
                    ? { background: 'var(--accent-red-bg)', color: 'var(--accent-red-text)' }
                    : { background: 'var(--accent-blue-bg)', color: 'var(--accent-blue-text)' };
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="py-2.5"><TaskLink url={m.url}>{m.name}</TaskLink></td>
                      <td className="py-2.5" style={{ color: 'var(--text-dim)' }}>{m.assignee}</td>
                      <td className="py-2.5 text-center">
                        <span className="inline-block px-2 py-0.5 rounded-full text-[10px]" style={statusStyle}>{m.status}</span>
                      </td>
                      <td className="py-2.5 text-right" style={{ color: m.status === 'Overdue' ? C.red : 'var(--text-dim)' }}>{m.dueDate || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title={`Blocked tasks (${blocked.length})`}>
        {blocked.length === 0 ? (
          <p className="text-xs py-4 text-center" style={{ color: 'var(--text-faint)' }}>No blocked tasks — great flow!</p>
        ) : (
          <div className="space-y-3">
            {blocked.map((b, i) => (
              <div key={i} className="rounded-lg p-3" style={{ background: 'var(--surface-4)', border: '1px solid var(--border)' }}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <TaskLink url={b.url}><span className="text-sm" style={{ color: 'var(--text)' }}>{b.name}</span></TaskLink>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-faint)' }}>{b.assignee} · Due {b.dueDate || '—'}</p>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap"
                    style={b.blockersResolved
                      ? { background: 'var(--accent-teal-bg)', color: 'var(--accent-teal-text)' }
                      : { background: 'var(--accent-amber-bg)', color: 'var(--accent-amber-text)' }}>
                    {b.blockersResolved ? 'Ready to start' : 'Waiting'}
                  </span>
                </div>
                <div className="pl-3 space-y-0.5" style={{ borderLeft: '2px solid var(--border-strong)' }}>
                  <p className="text-[10px] mb-1" style={{ color: 'var(--text-faint)' }}>Dependencies:</p>
                  {b.blockers.map((blk, j) => (
                    <div key={j} className="flex items-center gap-2 text-[11px]">
                      <span style={{ color: blk.completed ? C.teal : 'var(--text-dim)' }}>{blk.completed ? '✓' : '○'}</span>
                      <TaskLink url={blk.url}>
                        <span style={{ color: blk.completed ? 'var(--text-dim)' : 'var(--text-muted)', textDecoration: blk.completed ? 'line-through' : 'none' }}>{blk.name}</span>
                      </TaskLink>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB 11: BUDGETS — sums of all number-type custom fields
// ═══════════════════════════════════════════════════════════
function formatCurrency(value) {
  if (value === 0) return '—';
  return Math.round(value).toLocaleString('en-US');
}

function BudgetBreakdown({ title, items, color }) {
  if (!items || items.length === 0) return null;
  const max = items[0]?.value || 1;
  return (
    <Card title={title}>
      <div className="space-y-2">
        {items.slice(0, 8).map(item => {
          const pct = (item.value / max) * 100;
          return (
            <div key={item.name} className="flex items-center gap-2.5">
              <span className="text-xs w-24 text-right truncate" style={{ color: 'var(--text-dim)' }}>{item.name}</span>
              <div className="flex-1 rounded h-4 overflow-hidden" style={{ background: 'var(--surface-3)' }}>
                <div className="h-full rounded" style={{ width: `${pct}%`, background: color, transition: 'width .4s' }} />
              </div>
              <span className="text-xs w-20 text-right" style={{ color: 'var(--text-dim)' }}>{formatCurrency(item.value)}</span>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function TabBudgets({ d, C }) {
  const { budgets } = d;

  if (!budgets || budgets.length === 0) {
    return (
      <Card>
        <p className="text-xs py-8 text-center" style={{ color: 'var(--text-faint)' }}>
          No number-type custom fields detected in your Asana project.<br />
          Add numeric fields (like &ldquo;Total Digital Budget&rdquo; or &ldquo;Fees&rdquo;) to tasks to track them here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {budgets.map(b => (
        <div key={b.field} className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {b.field}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Metric label="Total" value={formatCurrency(b.total)} />
            <Metric label="In-flight (incomplete)" value={formatCurrency(b.inFlight)} color={C.blue} />
            <Metric label="Spent (completed)" value={formatCurrency(b.spent)} color={C.teal} />
          </div>

          {(b.byBrand.length > 0 || b.byMarket.length > 0 || b.byCampaign.length > 0) && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <BudgetBreakdown title="By brand" items={b.byBrand} color={C.purple} />
              <BudgetBreakdown title="By market" items={b.byMarket} color={C.blue} />
              <BudgetBreakdown title="By campaign" items={b.byCampaign} color={C.amber} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
