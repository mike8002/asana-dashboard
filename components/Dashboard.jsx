'use client';
import { useState, useMemo, useEffect } from 'react';
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
    teal: theme === 'light' ? '#14b8a6' : '#2dd4bf',
    blue: theme === 'light' ? '#3b82f6' : '#60a5fa',
    red: theme === 'light' ? '#e11d48' : '#f43f5e',
    purple: theme === 'light' ? '#8b5cf6' : '#a78bfa',
    amber: theme === 'light' ? '#ea580c' : '#fb923c',
    pink: theme === 'light' ? '#ec4899' : '#f472b6',
    gray: theme === 'light' ? '#737373' : '#525252',
    grid: theme === 'light' ? '#e5e5e5' : '#1c1c1c',
    tick: theme === 'light' ? '#a3a3a3' : '#525252',
    tooltipBg: theme === 'light' ? '#ffffff' : '#1a1a1a',
    tooltipBorder: theme === 'light' ? '#e5e5e5' : '#262626',
    tooltipText: theme === 'light' ? '#171717' : '#e5e5e5',
  };
}

function InfoTooltip({ text }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex" style={{ marginLeft: 6 }}>
      <button
        type="button"
        aria-label="What is this?"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen(!open)}
        className="rounded-full flex items-center justify-center transition-colors cursor-help"
        style={{
          width: 14, height: 14,
          background: 'var(--surface-3)',
          border: '1px solid var(--border-strong)',
          color: 'var(--text-dim)',
          fontSize: 9, fontWeight: 600, lineHeight: 1,
        }}
      >?</button>
      {open && (
        <span role="tooltip"
          className="absolute z-50 p-3 rounded-lg text-xs leading-relaxed whitespace-pre-line"
          style={{
            bottom: 'calc(100% + 6px)', left: '50%',
            transform: 'translateX(-50%)', width: 260,
            background: 'var(--surface)', border: '1px solid var(--border-strong)',
            color: 'var(--text-muted)',
            boxShadow: '0 4px 16px rgba(0,0,0,.3)',
            pointerEvents: 'none',
          }}>
          {text}
        </span>
      )}
    </span>
  );
}

function Card({ title, info, children, className = '' }) {
  return (
    <div className={`rounded-xl p-5 ${className}`} style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      {title && (
        <h3 className="text-sm font-medium mb-4 flex items-center" style={{ color: 'var(--text-muted)' }}>
          {title}
          {info && <InfoTooltip text={info} />}
        </h3>
      )}
      {children}
    </div>
  );
}

function Metric({ label, value, color, sub, info }) {
  return (
    <div className="rounded-xl p-5" style={{ background: 'var(--surface)', border: '1px solid var(--border)' }}>
      <p className="text-[11px] uppercase tracking-wider mb-1 flex items-center" style={{ color: 'var(--text-faint)' }}>
        {label}
        {info && <InfoTooltip text={info} />}
      </p>
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

function RefreshButton({ userName, selectStyle }) {
  const [state, setState] = useState({ loading: true, locked: false, nextAvailable: null, lastRefreshedBy: null });
  const [pressing, setPressing] = useState(false);
  const [countdown, setCountdown] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch('/api/refresh');
        const data = await res.json();
        setState({ loading: false, locked: data.locked, nextAvailable: data.nextAvailable, lastRefreshedBy: data.lastRefreshedBy });
      } catch {
        setState({ loading: false, locked: false, nextAvailable: null });
      }
    })();
  }, []);

  useEffect(() => {
    if (!state.locked || !state.nextAvailable) { setCountdown(''); return; }
    const update = () => {
      const remaining = state.nextAvailable - Date.now();
      if (remaining <= 0) {
        setState(s => ({ ...s, locked: false, nextAvailable: null }));
        return;
      }
      const hours = Math.floor(remaining / 3600000);
      const mins = Math.floor((remaining % 3600000) / 60000);
      setCountdown(hours > 0 ? `${hours}h ${mins}m` : `${mins}m`);
    };
    update();
    const id = setInterval(update, 60000);
    return () => clearInterval(id);
  }, [state.locked, state.nextAvailable]);

  const handleRefresh = async () => {
    if (state.locked || pressing) return;
    setPressing(true);
    try {
      const res = await fetch('/api/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userName }),
      });
      const data = await res.json();
      if (res.status === 429) {
        setState({ loading: false, locked: true, nextAvailable: data.nextAvailable, lastRefreshedBy: data.lastRefreshedBy });
        setPressing(false);
      } else {
        window.location.reload();
      }
    } catch (e) {
      setPressing(false);
    }
  };

  const disabled = state.loading || state.locked || pressing;
  const label = pressing
    ? 'Refreshing...'
    : state.locked
    ? `Next refresh in ${countdown}`
    : '↻ Refresh';

  const title = state.locked && state.lastRefreshedBy
    ? `Last refreshed by ${state.lastRefreshedBy}. Cooldown ends in ${countdown}.`
    : state.locked
    ? `Refresh cooling down. Available in ${countdown}.`
    : 'Refresh data from Asana';

  return (
    <button onClick={handleRefresh} disabled={disabled} title={title}
      className="text-xs rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      style={selectStyle}>
      {label}
    </button>
  );
}

const TABS = [
  'Overview', 'Backlog & Capacity', 'On-Time & Slippage',
  'Turnaround & Velocity', 'By Member', 'Dubai vs Lebanon',
  'Projects & Funnel', 'Timeline & Heatmap', 'Performance Radar',
  'Breakdowns', 'Milestones & Blockers', 'Budgets',
];

const INFO = {
  total: 'Every task and subtask across the selected client. Includes completed, in-progress, and overdue items.',
  completed: 'Tasks marked complete in Asana. Only counts tasks with a completion date.',
  overdue: 'Incomplete tasks whose due date has passed. The higher this number, the more slippage.',
  hours: 'Total actual hours logged across all tasks. Only available on Asana Business plans with time tracking enabled.',
  taskLoad: 'Horizontal stacked bars showing each person\'s workload broken down by urgency. Red = overdue, amber = due within 7 days, blue = upcoming, grey = no due date. Bigger bar = more open work.',
  timingSplit: 'Donut chart showing the urgency mix of all open tasks. A healthy team has mostly blue (upcoming) and small slivers of red (overdue).',
  weeklyTrend: 'Bar chart of completed tasks each week. Use this to spot whether the team is shipping consistently or in bursts.',
  backlogTrend: 'Three lines showing the flow of work:\n• Created (amber): new tasks coming in\n• Completed (teal): tasks shipped\n• Open backlog (red): running total of unfinished work\n\nIf created stays above completed for long, the backlog grows.',
  capacity: 'Expected output (grey) vs actual completions (teal). Capacity is calculated as team size × 8 tasks/week. If actual is consistently below capacity, there\'s a throughput issue.',
  subtaskSplit: 'How much of the work is top-level tasks vs subtasks. Heavy subtask use often indicates complex projects broken into steps.',
  onTimeRank: 'Percentage of each person\'s completed tasks that shipped on or before the due date. Green ≥85%, amber 75-84%, red <75%.',
  onTimeVsLate: 'For each person: number of tasks shipped on time (teal) vs late (red). Shows both the rate AND the volume.',
  turnaround: 'Average days from task creation to completion per person. Green ≤7 days, amber 8-14, red >14. Lower is better.',
  velocity: 'Line chart tracking each person\'s weekly task completions. Use this to spot who\'s accelerating, plateauing, or slowing down.',
  hubOutput: 'Weekly completion count split by hub. Shows which hub is carrying more delivery load week to week.',
  hubTurnaround: 'Average task turnaround per hub. Compare to see which hub ships faster.',
  funnel: 'Where incomplete work is stuck, by Asana section. Helps identify process bottlenecks — if one section is piled up, that stage is blocking flow.',
  projectHealth: 'Per-project health based on completion % and overdue rate.\n• Green: healthy pace\n• Amber: slipping\n• Red: seriously off track',
  heatmap: 'Calendar view of tasks due per day. Teal = upcoming tasks due. Darker teal = more tasks. Grey = past or weekend. Use this to spot workload spikes before they happen.',
  gantt: 'Timeline bars showing when tasks start and end. Blue = on track, red = overdue. Each row is one task, grouped by assignee.',
  radarDubai: 'Radar chart scoring Dubai hub across 5 dimensions (0-100):\n• Volume: output vs capacity\n• On-time: deadline reliability\n• Speed: turnaround time\n• Coverage: % tasks with due dates\n• Consistency: weekly output steadiness\n\nThe more filled-in the shape, the stronger the hub.',
  radarLebanon: 'Same five dimensions as Dubai, scored for Lebanon hub. Compare the two shapes side by side to see relative strengths.',
  composite: 'Average of all 5 radar scores per hub. Green ≥70, amber 50-69, red <50. A quick single-number health score.',
  brands: 'Task volume split by the Brand custom field. Shows which brand is generating the most work. Bars split: teal = completed, purple = in progress, red = overdue.',
  markets: 'Task volume by market/country. Useful for planning geographic workload distribution.',
  campaigns: 'Task volume by campaign. Helps identify which campaigns are running hot.',
  milestones: 'Tasks specifically flagged as milestones in Asana (key delivery points). Use this tab to prep for upcoming deliverables.',
  blocked: 'Tasks with dependencies that aren\'t yet complete. "Waiting" means blockers still open, "Ready to start" means all dependencies just cleared.',
  budgets: 'Auto-detects all numeric custom fields in Asana (like "Total Digital Budget"). Shows total committed, in-flight (incomplete), and spent (completed). Breaks budget down by brand, market, and campaign.',
};

export default function Dashboard({ data, error, userName, userImage, clients, activeClient }) {
  const router = useRouter();
  const C = useChartColors();
  const [tab, setTab] = useState(0);
  const [filter, setFilter] = useState('all');

  const URGENCY_COLORS = { Overdue: C.red, 'Due soon': C.amber, Upcoming: C.blue, 'No date': C.gray };
  const TT_STYLE = {
    contentStyle: { background: C.tooltipBg, border: `1px solid ${C.tooltipBorder}`, borderRadius: 8, fontSize: 12, color: C.tooltipText },
    cursor: { fill: 'rgba(128,128,128,.05)' },
  };

  const handleClientChange = (e) => { router.push(`/?client=${e.target.value}`); };

  // ═══════════════════════════════════════════════════════════
  // FILTERED DATA — the key change.
  // When a specific member is selected, we filter data.tasks
  // BEFORE running all the aggregations. This means every chart
  // automatically reflects the selected person's data.
  // ═══════════════════════════════════════════════════════════
  const filteredData = useMemo(() => {
    if (!data) return null;
    if (filter === 'all') return data;
    return {
      ...data,
      tasks: data.tasks.filter(t => t.assignee === filter),
    };
  }, [data, filter]);

  const processed = useMemo(() => {
    if (!filteredData) return null;
    // Note: memberStats uses the FILTERED tasks, so it only contains the selected person
    const members = getMemberStats(filteredData.tasks);
    // BUT for the "By Member" tab and filter dropdown, we need the full unfiltered member list
    const allMembers = getMemberStats(data.tasks);

    return {
      summary: getSummary(filteredData.tasks),
      members,
      allMembers,
      timing: getTimingSplit(filteredData.tasks),
      weekly: getWeeklyTrend(filteredData.tasks),
      backlog: getBacklogTrend(filteredData.tasks),
      subtaskSplit: getSubtaskSplit(filteredData.tasks),
      hubWeekly: getHubWeekly(filteredData.tasks, members),
      hubTurnaround: getHubTurnaround(members),
      heatmap: getHeatmapData(filteredData.tasks),
      gantt: getGanttData(filteredData.tasks),
      velocity: getVelocityData(members, filteredData.tasks),
      radarDubai: getRadarScores(members, 'Dubai'),
      radarLebanon: getRadarScores(members, 'Lebanon'),
      composite: getCompositeScore(members),
      brands: getBrandBreakdown(filteredData.tasks),
      markets: getMarketBreakdown(filteredData.tasks),
      campaigns: getCampaignBreakdown(filteredData.tasks),
      milestones: getMilestones(filteredData.tasks),
      blocked: getBlockedTasks(filteredData.tasks),
      budgets: getBudgetSummaries(filteredData.tasks, data.numberFieldNames),
    };
  }, [filteredData, data]);

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
      <p style={{ color: 'var(--text-dim)' }}>Loading dashboard...</p>
    </div>
  );

  const { summary, members, allMembers } = processed;
  const assignees = allMembers.map(m => m.name).filter(n => n !== 'Unassigned');
  const isFiltered = filter !== 'all';

  const selectStyle = { background: 'var(--surface-2)', border: '1px solid var(--border-strong)', color: 'var(--text-muted)' };

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <header className="px-4 py-3 sticky top-0 z-30 backdrop-blur"
        style={{ borderBottom: '1px solid var(--border)', background: 'color-mix(in srgb, var(--bg) 95%, transparent)' }}>
        <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <img src="/UM-logo.webp" alt="UM" className="h-6 w-auto" />
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
              className="rounded-lg px-3 py-1.5 text-xs focus:outline-none cursor-pointer"
              style={{ ...selectStyle, color: isFiltered ? 'var(--text)' : 'var(--text-muted)', borderColor: isFiltered ? C.blue : 'var(--border-strong)' }}
              title="Filter the entire dashboard to a single person's data">
              <option value="all">All members</option>
              {assignees.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <RefreshButton userName={userName} selectStyle={selectStyle} />
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

      {/* Filter banner — shown when a member is selected */}
      {isFiltered && (
        <div className="px-4 py-2" style={{
          background: 'var(--accent-blue-bg)',
          borderBottom: '1px solid var(--accent-blue-border)',
        }}>
          <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-3">
            <p className="text-xs" style={{ color: 'var(--accent-blue-text)' }}>
              <span style={{ fontWeight: 500 }}>Viewing data for {filter} only.</span>
              <span style={{ marginLeft: 8, opacity: 0.75 }}>All charts below are filtered to this person.</span>
            </p>
            <button onClick={() => setFilter('all')}
              className="text-xs px-2 py-0.5 rounded-md transition-colors"
              style={{
                background: 'var(--surface)',
                border: '1px solid var(--border-strong)',
                color: 'var(--text-muted)',
              }}>
              Clear filter
            </button>
          </div>
        </div>
      )}

      <main className="max-w-[1400px] mx-auto px-4 py-5 space-y-4">
        {tab === 0 && <TabOverview d={processed} C={C} URGENCY_COLORS={URGENCY_COLORS} TT_STYLE={TT_STYLE} isFiltered={isFiltered} />}
        {tab === 1 && <TabBacklog d={processed} C={C} TT_STYLE={TT_STYLE} isFiltered={isFiltered} />}
        {tab === 2 && <TabOnTime d={processed} C={C} />}
        {tab === 3 && <TabVelocity d={processed} C={C} TT_STYLE={TT_STYLE} />}
        {tab === 4 && <TabMembers d={processed} />}
        {tab === 5 && <TabHubs d={processed} C={C} TT_STYLE={TT_STYLE} />}
        {tab === 6 && <TabProjects projects={data.projects} funnel={data.funnel} filteredFunnel={buildFunnelFromTasks(filteredData.tasks)} isFiltered={isFiltered} C={C} />}
        {tab === 7 && <TabTimeline d={processed} C={C} />}
        {tab === 8 && <TabRadar d={processed} C={C} />}
        {tab === 9 && <TabBreakdowns d={processed} C={C} />}
        {tab === 10 && <TabMilestonesBlockers d={processed} />}
        {tab === 11 && <TabBudgets d={processed} C={C} />}

        <p className="text-[11px] text-center pt-2 pb-4" style={{ color: 'var(--text-fainter)' }}>
          {activeClient.name} · Last synced {new Date(data.fetchedAt).toLocaleString()} · Refresh limited to once every 12 hours
        </p>
      </main>
    </div>
  );
}

// Helper to rebuild funnel from filtered tasks
function buildFunnelFromTasks(tasks) {
  const map = {};
  tasks.forEach(t => {
    if (t.section && t.status !== 'Completed') {
      map[t.section] = (map[t.section] || 0) + 1;
    }
  });
  return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
}

function TabOverview({ d, C, URGENCY_COLORS, TT_STYLE, isFiltered }) {
  const { summary, members, timing, weekly } = d;
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Total tasks" value={summary.total} info={INFO.total} />
        <Metric label="Completed" value={summary.completed} color={C.teal} info={INFO.completed} />
        <Metric label="Overdue" value={summary.overdue} color={C.red} info={INFO.overdue} />
        <Metric label="Hours logged" value={summary.hours > 0 ? `${summary.hours}h` : '0h'}
          sub={summary.hours === 0 ? 'Requires Asana Business' : ''} info={INFO.hours} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {!isFiltered && (
          <Card title="Task load by member" info={INFO.taskLoad}>
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
        )}

        {/* When filtered to one person, show their individual stats card instead */}
        {isFiltered && members[0] && (
          <Card title={`${members[0].name} overview`}>
            <div className="grid grid-cols-4 gap-2 text-center">
              <div className="rounded-lg p-3" style={{ background: 'var(--surface-4)' }}>
                <p className="text-xl font-semibold" style={{ color: C.red }}>{members[0].overdue}</p>
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-faint)' }}>Overdue</p>
              </div>
              <div className="rounded-lg p-3" style={{ background: 'var(--surface-4)' }}>
                <p className="text-xl font-semibold" style={{ color: C.amber }}>{members[0].dueSoon}</p>
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-faint)' }}>Due soon</p>
              </div>
              <div className="rounded-lg p-3" style={{ background: 'var(--surface-4)' }}>
                <p className="text-xl font-semibold" style={{ color: C.blue }}>{members[0].upcoming}</p>
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-faint)' }}>Upcoming</p>
              </div>
              <div className="rounded-lg p-3" style={{ background: 'var(--surface-4)' }}>
                <p className="text-xl font-semibold" style={{ color: 'var(--text-dim)' }}>{members[0].noDate}</p>
                <p className="text-[10px] mt-1" style={{ color: 'var(--text-faint)' }}>No date</p>
              </div>
            </div>
            <div className="mt-4 pt-4 space-y-2 text-xs" style={{ borderTop: '1px solid var(--border)', color: 'var(--text-dim)' }}>
              <div className="flex justify-between"><span>Hub</span><span>{members[0].hub}</span></div>
              {members[0].onTimeRate !== null && (
                <div className="flex justify-between"><span>On-time rate</span>
                  <span style={{ color: members[0].onTimeRate >= 85 ? C.teal : members[0].onTimeRate >= 75 ? C.amber : C.red }}>
                    {members[0].onTimeRate}%
                  </span>
                </div>
              )}
              {members[0].avgTurnaround && (<div className="flex justify-between"><span>Avg turnaround</span><span>{members[0].avgTurnaround} days</span></div>)}
              {members[0].hours > 0 && (<div className="flex justify-between"><span>Hours logged</span><span>{members[0].hours}h</span></div>)}
            </div>
          </Card>
        )}

        <Card title="Task timing split" info={INFO.timingSplit}>
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

      <Card title="Weekly output trend" info={INFO.weeklyTrend}>
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

function TabBacklog({ d, C, TT_STYLE, isFiltered }) {
  const { backlog, subtaskSplit, members, weekly } = d;
  const memberCount = isFiltered ? 1 : members.filter(m => m.name !== 'Unassigned').length;
  const capacityData = weekly.map(w => ({
    week: w.week,
    capacity: memberCount * WEEKLY_CAPACITY,
    actual: w.completed,
  }));

  return (
    <>
      <Card title="Backlog trend: created vs completed" info={INFO.backlogTrend}>
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
        <Card title="Capacity vs actual output" info={INFO.capacity}>
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

        <Card title="Subtask vs top-level split" info={INFO.subtaskSplit}>
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
      <Card title="On-time rate ranking" info={INFO.onTimeRank}>
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

      <Card title="On-time vs late task count" info={INFO.onTimeVsLate}>
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
      <Card title="Average turnaround by member" info={INFO.turnaround}>
        <p className="text-[11px] mb-3" style={{ color: 'var(--text-faint)' }}>Days from creation to completion, lower is better</p>
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

      <Card title="Task velocity: weekly completions per member" info={INFO.velocity}>
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
  // By Member tab always shows ALL members, regardless of filter
  const { allMembers } = d;
  const C = useChartColors();
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {allMembers.filter(m => m.name !== 'Unassigned').map(m => (
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
          <Metric key={hub} label={`${hub} tasks`} value={s.total} sub={`${s.members} members · ${s.overdue} overdue`} />
        ))}
      </div>

      <Card title="Weekly output: Dubai vs Lebanon" info={INFO.hubOutput}>
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

      <Card title="Turnaround: hub comparison" info={INFO.hubTurnaround}>
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

function TabProjects({ projects, funnel, filteredFunnel, isFiltered, C }) {
  const funnelData = isFiltered ? filteredFunnel : funnel;
  const maxFunnel = funnelData.length > 0 ? funnelData[0].count : 1;
  return (
    <>
      <Card title={isFiltered ? 'Task stages (filtered)' : 'Task stage funnel across all projects'} info={INFO.funnel}>
        {funnelData.length === 0 ? (
          <p className="text-xs py-4 text-center" style={{ color: 'var(--text-faint)' }}>No sectioned tasks for this view</p>
        ) : (
          <div className="space-y-2.5">
            {funnelData.slice(0, 12).map(f => (<HBar key={f.name} name={f.name} value={f.count} max={maxFunnel} color={C.purple} />))}
          </div>
        )}
      </Card>

      <Card title="Project health scorecard" info={INFO.projectHealth}>
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

  function getDayStyle(day, intensity) {
    const L = theme === 'light';
    if (day.isPast) return { bg: L ? '#f3f4f6' : '#1f1f1f', dayNum: L ? '#9ca3af' : '#525252', dayLabel: L ? '#9ca3af' : '#525252', countColor: null };
    if (day.isWeekend) return { bg: L ? '#fafafa' : '#0e0e0e', dayNum: L ? '#9ca3af' : '#525252', dayLabel: L ? '#9ca3af' : '#525252', countColor: null };
    if (day.count === 0) return { bg: L ? '#ffffff' : '#141414', dayNum: L ? '#374151' : '#a3a3a3', dayLabel: L ? '#9ca3af' : '#737373', countColor: null };
    if (intensity < 0.33) return { bg: L ? '#ccfbf1' : '#134e4a', dayNum: L ? '#0f766e' : '#5eead4', dayLabel: L ? '#0d9488' : '#2dd4bf', countColor: L ? '#0f766e' : '#ccfbf1' };
    if (intensity < 0.66) return { bg: L ? '#14b8a6' : '#0d9488', dayNum: '#ffffff', dayLabel: L ? '#ccfbf1' : '#ecfeff', countColor: '#ffffff' };
    return { bg: L ? '#0f766e' : '#2dd4bf', dayNum: '#ffffff', dayLabel: L ? '#99f6e4' : '#ffffff', countColor: '#ffffff' };
  }

  return (
    <>
      <Card title="Workload heatmap: tasks due per day" info={INFO.heatmap}>
        <p className="text-[11px] mb-3" style={{ color: 'var(--text-faint)' }}>Each cell is a day. Teal = tasks due. Grey = past or weekend.</p>
        <div className="space-y-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex gap-1">
              {week.map(day => {
                const intensity = day.count / maxCount;
                const style = getDayStyle(day, intensity);
                return (
                  <div key={day.date}
                    title={`${day.date}: ${day.count} ${day.count === 1 ? 'task' : 'tasks'} due`}
                    className="flex-1 h-14 rounded flex flex-col items-center justify-center relative"
                    style={{ background: style.bg }}>
                    <span className="text-[9px] font-medium leading-none mb-0.5" style={{ color: style.dayLabel }}>
                      {day.dayName}
                    </span>
                    <span className="text-[13px] font-semibold leading-none" style={{ color: style.dayNum }}>
                      {day.day}
                    </span>
                    {day.count > 0 && style.countColor && (
                      <span className="absolute top-1 right-1.5 text-[10px] font-bold px-1 rounded"
                        style={{
                          color: style.countColor,
                          background: theme === 'light' ? 'rgba(255,255,255,.5)' : 'rgba(0,0,0,.25)',
                        }}>
                        {day.count}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3 mt-4 text-[10px]" style={{ color: 'var(--text-faint)' }}>
          <span>Task volume:</span>
          <div className="flex gap-1 items-center">
            <div className="w-5 h-4 rounded" style={{ background: theme === 'light' ? '#ffffff' : '#141414', border: '1px solid var(--border)' }} />
            <span>None</span>
            <div className="w-5 h-4 rounded ml-2" style={{ background: theme === 'light' ? '#ccfbf1' : '#134e4a' }} />
            <div className="w-5 h-4 rounded" style={{ background: theme === 'light' ? '#14b8a6' : '#0d9488' }} />
            <div className="w-5 h-4 rounded" style={{ background: theme === 'light' ? '#0f766e' : '#2dd4bf' }} />
            <span>High</span>
          </div>
          <span style={{ marginLeft: 'auto' }}>Grey = past · faint = weekend</span>
        </div>
      </Card>

      <Card title="Gantt-style task timeline" info={INFO.gantt}>
        {gantt.length === 0 ? (
          <p className="text-xs py-4 text-center" style={{ color: 'var(--text-faint)' }}>No upcoming dated tasks</p>
        ) : (
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
        )}
      </Card>
    </>
  );
}

function TabRadar({ d, C }) {
  const { radarDubai, radarLebanon, composite } = d;
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card title="Performance radar: Dubai" info={INFO.radarDubai}>
          {radarDubai.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarDubai}>
                <PolarGrid stroke={C.grid} />
                <PolarAngleAxis dataKey="metric" tick={{ fill: C.tick, fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: C.tick, fontSize: 10 }} />
                <Radar name="Dubai" dataKey="score" stroke={C.blue} fill={C.blue} fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          ) : <p className="text-xs py-10 text-center" style={{ color: 'var(--text-faint)' }}>No Dubai members in view</p>}
        </Card>

        <Card title="Performance radar: Lebanon" info={INFO.radarLebanon}>
          {radarLebanon.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarLebanon}>
                <PolarGrid stroke={C.grid} />
                <PolarAngleAxis dataKey="metric" tick={{ fill: C.tick, fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: C.tick, fontSize: 10 }} />
                <Radar name="Lebanon" dataKey="score" stroke={C.amber} fill={C.amber} fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          ) : <p className="text-xs py-10 text-center" style={{ color: 'var(--text-faint)' }}>No Lebanon members in view</p>}
        </Card>
      </div>

      <Card title="Full performance scorecard" info={INFO.composite}>
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

function BreakdownBlock({ title, data, color, C, info }) {
  if (!data || data.length === 0) {
    return (
      <Card title={title} info={info}>
        <p className="text-xs py-4 text-center" style={{ color: 'var(--text-faint)' }}>No data, ensure this custom field is populated in Asana</p>
      </Card>
    );
  }
  const max = data[0]?.total || 1;
  return (
    <Card title={title} info={info}>
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
      <BreakdownBlock title="Task breakdown by brand" data={d.brands} color={C.purple} C={C} info={INFO.brands} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <BreakdownBlock title="Task breakdown by market" data={d.markets} color={C.blue} C={C} info={INFO.markets} />
        <BreakdownBlock title="Task breakdown by campaign" data={d.campaigns} color={C.amber} C={C} info={INFO.campaigns} />
      </div>
    </>
  );
}

function TabMilestonesBlockers({ d }) {
  const C = useChartColors();
  const { milestones, blocked } = d;

  return (
    <>
      <Card title={`Upcoming milestones (${milestones.length})`} info={INFO.milestones}>
        {milestones.length === 0 ? (
          <p className="text-xs py-4 text-center" style={{ color: 'var(--text-faint)' }}>No milestone tasks for this view</p>
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
                      <td className="py-2.5 text-right" style={{ color: m.status === 'Overdue' ? C.red : 'var(--text-dim)' }}>{m.dueDate || ''}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title={`Blocked tasks (${blocked.length})`} info={INFO.blocked}>
        {blocked.length === 0 ? (
          <p className="text-xs py-4 text-center" style={{ color: 'var(--text-faint)' }}>No blocked tasks for this view</p>
        ) : (
          <div className="space-y-3">
            {blocked.map((b, i) => (
              <div key={i} className="rounded-lg p-3" style={{ background: 'var(--surface-4)', border: '1px solid var(--border)' }}>
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <TaskLink url={b.url}><span className="text-sm" style={{ color: 'var(--text)' }}>{b.name}</span></TaskLink>
                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--text-faint)' }}>{b.assignee} · Due {b.dueDate || 'not set'}</p>
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

function formatCurrency(value) {
  if (value === 0) return '0';
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
      <Card info={INFO.budgets}>
        <p className="text-xs py-8 text-center" style={{ color: 'var(--text-faint)' }}>
          No number-type custom fields detected in your Asana project.<br />
          Add numeric fields (like &ldquo;Total Digital Budget&rdquo; or &ldquo;Fees&rdquo;) to tasks to track them here.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {budgets.map((b, i) => (
        <div key={b.field} className="space-y-3">
          <h2 className="text-sm font-medium uppercase tracking-wider flex items-center" style={{ color: 'var(--text-muted)' }}>
            {b.field}
            {i === 0 && <InfoTooltip text={INFO.budgets} />}
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
