'use client';
import { useState, useMemo } from 'react';
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
  getMilestones, getBlockedTasks,
} from '../lib/process';
import { WEEKLY_CAPACITY } from '../lib/config';

const C = {
  bg: '#0a0a0a', card: '#111', cardBorder: '#1c1c1c',
  teal: '#1D9E75', blue: '#378ADD', red: '#E24B4A', purple: '#7F77DD',
  amber: '#EF9F27', pink: '#D4537E', gray: '#555',
};

const URGENCY_COLORS = { Overdue: C.red, 'Due soon': C.amber, Upcoming: C.blue, 'No date': C.gray };
const RAG = { green: C.teal, amber: C.amber, red: C.red };
const BRAND_COLORS = [C.purple, C.teal, C.blue, C.amber, C.pink, C.red, '#5DCAA5', '#B5D4F4'];

function Card({ title, children, className = '' }) {
  return (
    <div className={`bg-[#111] rounded-xl border border-[#1c1c1c] p-5 ${className}`}>
      {title && <h3 className="text-sm font-medium text-neutral-400 mb-4">{title}</h3>}
      {children}
    </div>
  );
}

function Metric({ label, value, color = 'text-white', sub }) {
  return (
    <div className="bg-[#111] rounded-xl border border-[#1c1c1c] p-5">
      <p className="text-[11px] text-neutral-600 uppercase tracking-wider mb-1">{label}</p>
      <p className={`text-2xl font-semibold tracking-tight ${color}`}>{value}</p>
      {sub && <p className="text-[11px] text-neutral-700 mt-1">{sub}</p>}
    </div>
  );
}

function RagDot({ level }) {
  return <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: RAG[level] }} />;
}

function HBar({ name, value, max, color = C.purple, suffix = '' }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-xs text-neutral-500 w-28 text-right truncate">{name}</span>
      <div className="flex-1 bg-[#1a1a1a] rounded h-4 overflow-hidden">
        <div className="h-full rounded" style={{ width: `${pct}%`, background: color, transition: 'width .4s' }} />
      </div>
      <span className="text-xs text-neutral-500 w-12 text-right">{value}{suffix}</span>
    </div>
  );
}

function TaskLink({ url, children }) {
  if (!url) return <span>{children}</span>;
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
       className="text-neutral-300 hover:text-white hover:underline">{children}</a>
  );
}

const TT_STYLE = {
  contentStyle: { background: '#1a1a1a', border: '1px solid #262626', borderRadius: 8, fontSize: 12, color: '#ccc' },
  cursor: { fill: 'rgba(255,255,255,.03)' },
};

const TABS = [
  'Overview', 'Backlog & Capacity', 'On-Time & Slippage',
  'Turnaround & Velocity', 'By Member', 'Dubai vs Lebanon',
  'Projects & Funnel', 'Timeline & Heatmap', 'Performance Radar',
  'Breakdowns', 'Milestones & Blockers',
];

export default function Dashboard({ data, error, userName, userImage }) {
  const [tab, setTab] = useState(0);
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/refresh', { method: 'POST' });
      window.location.reload();
    } catch (e) { setRefreshing(false); }
  };

  const processed = useMemo(() => {
    if (!data) return null;
    const members = getMemberStats(data.tasks);
    return {
      summary: getSummary(data.tasks),
      members,
      timing: getTimingSplit(data.tasks),
      weekly: getWeeklyTrend(data.tasks),
      backlog: getBacklogTrend(data.tasks),
      subtaskSplit: getSubtaskSplit(data.tasks),
      hubWeekly: getHubWeekly(data.tasks, members),
      hubTurnaround: getHubTurnaround(members),
      heatmap: getHeatmapData(data.tasks),
      gantt: getGanttData(data.tasks),
      velocity: getVelocityData(members),
      radarDubai: getRadarScores(members, 'Dubai'),
      radarLebanon: getRadarScores(members, 'Lebanon'),
      composite: getCompositeScore(members),
      brands: getBrandBreakdown(data.tasks),
      markets: getMarketBreakdown(data.tasks),
      campaigns: getCampaignBreakdown(data.tasks),
      milestones: getMilestones(data.tasks),
      blocked: getBlockedTasks(data.tasks),
    };
  }, [data]);

  if (error) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <div className="text-center">
        <p className="text-red-400 mb-2">Failed to load</p>
        <p className="text-sm text-neutral-500">{error}</p>
      </div>
    </div>
  );

  if (!data || !processed) return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0a0a]">
      <p className="text-neutral-600">Loading dashboard…</p>
    </div>
  );

  const { summary, members } = processed;
  const assignees = members.map(m => m.name).filter(n => n !== 'Unassigned');
  const filteredTasks = filter === 'all' ? data.tasks : data.tasks.filter(t => t.assignee === filter);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-neutral-300">
      <header className="border-b border-[#1c1c1c] px-4 py-3 sticky top-0 z-30 bg-[#0a0a0a]/95 backdrop-blur">
        <div className="max-w-[1400px] mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-base font-semibold text-white tracking-tight">Team Utilisation</span>
            <span className="text-[11px] text-neutral-600">Project Hub</span>
            <span className="text-[10px] bg-emerald-950/50 text-emerald-400 border border-emerald-800/30 px-2 py-0.5 rounded-full">Live</span>
          </div>
          <div className="flex items-center gap-3">
            <select value={filter} onChange={e => setFilter(e.target.value)}
              className="bg-[#141414] border border-[#262626] rounded-lg px-3 py-1.5 text-xs text-neutral-400 focus:outline-none">
              <option value="all">All members</option>
              {assignees.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <button onClick={handleRefresh} disabled={refreshing}
              className="text-xs text-neutral-500 hover:text-white bg-[#141414] border border-[#262626] rounded-lg px-3 py-1.5 transition-colors disabled:opacity-50">
              {refreshing ? 'Refreshing…' : '↻ Refresh'}
            </button>
            <div className="flex items-center gap-2">
              {userImage && <img src={userImage} alt="" className="w-6 h-6 rounded-full" />}
              <button onClick={() => signOut()} className="text-xs text-neutral-600 hover:text-neutral-400">Sign out</button>
            </div>
          </div>
        </div>
      </header>

      <nav className="border-b border-[#1c1c1c] px-4 overflow-x-auto">
        <div className="max-w-[1400px] mx-auto flex gap-0">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              className={`px-4 py-2.5 text-xs whitespace-nowrap border-b-2 transition-colors ${
                tab === i ? 'border-white text-white' : 'border-transparent text-neutral-600 hover:text-neutral-400'
              }`}>{t}</button>
          ))}
        </div>
      </nav>

      <main className="max-w-[1400px] mx-auto px-4 py-5 space-y-4">
        {tab === 0 && <TabOverview d={processed} tasks={filteredTasks} />}
        {tab === 1 && <TabBacklog d={processed} />}
        {tab === 2 && <TabOnTime d={processed} />}
        {tab === 3 && <TabVelocity d={processed} />}
        {tab === 4 && <TabMembers d={processed} />}
        {tab === 5 && <TabHubs d={processed} />}
        {tab === 6 && <TabProjects projects={data.projects} funnel={data.funnel} />}
        {tab === 7 && <TabTimeline d={processed} />}
        {tab === 8 && <TabRadar d={processed} />}
        {tab === 9 && <TabBreakdowns d={processed} />}
        {tab === 10 && <TabMilestonesBlockers d={processed} />}

        <p className="text-[11px] text-neutral-700 text-center pt-2 pb-4">
          Last synced {new Date(data.fetchedAt).toLocaleString()} · Cache refreshes every 2 days
        </p>
      </main>
    </div>
  );
}

function TabOverview({ d, tasks }) {
  const { summary, members, timing, weekly } = d;
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Metric label="Total tasks" value={summary.total} />
        <Metric label="Completed" value={summary.completed} color="text-emerald-400" />
        <Metric label="Overdue" value={summary.overdue} color="text-red-400" />
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
                  <span className="text-xs text-neutral-500 w-24 text-right truncate">{m.name}</span>
                  <div className="flex-1 flex h-4 rounded overflow-hidden bg-[#1a1a1a]">
                    {m.overdue > 0 && <div style={{ width: `${(m.overdue/max)*100}%`, background: C.red }} />}
                    {m.dueSoon > 0 && <div style={{ width: `${(m.dueSoon/max)*100}%`, background: C.amber }} />}
                    {m.upcoming > 0 && <div style={{ width: `${(m.upcoming/max)*100}%`, background: C.blue }} />}
                    {m.noDate > 0 && <div style={{ width: `${(m.noDate/max)*100}%`, background: C.gray }} />}
                  </div>
                  <span className="text-xs text-neutral-500 w-8 text-right">{m.total - m.completed}</span>
                </div>
              );
            })}
            <div className="flex gap-4 mt-3 text-[10px] text-neutral-600">
              {Object.entries(URGENCY_COLORS).map(([k, c]) => (
                <span key={k} className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-sm" style={{ background: c }} />{k}
                </span>
              ))}
            </div>
          </div>
        </Card>

        <Card title="Task timing split">
          <div className="flex items-center justify-center gap-6">
            <ResponsiveContainer width={150} height={150}>
              <PieChart>
                <Pie data={timing} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                  paddingAngle={2} dataKey="value" stroke="none">
                  {timing.map(e => <Cell key={e.name} fill={URGENCY_COLORS[e.name] || C.gray} />)}
                </Pie>
                <Tooltip {...TT_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 text-xs text-neutral-500">
              {timing.map(e => (
                <div key={e.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: URGENCY_COLORS[e.name] }} />
                  {e.name} ({e.value})
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>

      <Card title="Weekly output trend">
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={weekly}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1c" />
            <XAxis dataKey="week" tick={{ fill: '#555', fontSize: 11 }} />
            <YAxis tick={{ fill: '#555', fontSize: 11 }} />
            <Tooltip {...TT_STYLE} />
            <Bar dataKey="completed" fill={C.teal} radius={[3, 3, 0, 0]} name="Completed" />
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </>
  );
}

function TabBacklog({ d }) {
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
            <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1c" />
            <XAxis dataKey="week" tick={{ fill: '#555', fontSize: 11 }} />
            <YAxis tick={{ fill: '#555', fontSize: 11 }} />
            <Tooltip {...TT_STYLE} />
            <Line type="monotone" dataKey="created" stroke={C.amber} strokeWidth={2} dot={false} name="Created" />
            <Line type="monotone" dataKey="completed" stroke={C.teal} strokeWidth={2} dot={false} name="Completed" />
            <Line type="monotone" dataKey="backlog" stroke={C.red} strokeWidth={2} dot={false} name="Open backlog" />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex gap-5 mt-2 text-[10px] text-neutral-600">
          <span className="flex items-center gap-1"><span className="w-3 h-0.5" style={{ background: C.amber }} />Created</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5" style={{ background: C.teal }} />Completed</span>
          <span className="flex items-center gap-1"><span className="w-3 h-0.5" style={{ background: C.red }} />Open backlog</span>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card title="Capacity vs actual output">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={capacityData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1c" />
              <XAxis dataKey="week" tick={{ fill: '#555', fontSize: 11 }} />
              <YAxis tick={{ fill: '#555', fontSize: 11 }} />
              <Tooltip {...TT_STYLE} />
              <Bar dataKey="capacity" fill="#333" radius={[3, 3, 0, 0]} name="Capacity" />
              <Bar dataKey="actual" fill={C.teal} radius={[3, 3, 0, 0]} name="Actual" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Subtask vs top-level split">
          <div className="flex items-center justify-center gap-6">
            <ResponsiveContainer width={150} height={150}>
              <PieChart>
                <Pie data={subtaskSplit} cx="50%" cy="50%" innerRadius={40} outerRadius={65}
                  paddingAngle={2} dataKey="value" stroke="none">
                  <Cell fill={C.purple} />
                  <Cell fill={C.blue} />
                </Pie>
                <Tooltip {...TT_STYLE} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 text-xs text-neutral-500">
              {subtaskSplit.map((e, i) => (
                <div key={e.name} className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: i === 0 ? C.purple : C.blue }} />
                  {e.name} ({e.value})
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </>
  );
}

function TabOnTime({ d }) {
  const { members } = d;
  const rated = members.filter(m => m.onTimeRate !== null && m.name !== 'Unassigned');
  const maxOnTimeLate = Math.max(...rated.map(m => m.onTimeCount + m.lateCount), 1);

  return (
    <>
      <Card title="On-time rate ranking">
        {rated.length === 0 ? (
          <p className="text-xs text-neutral-600 py-4 text-center">No tasks with both due dates and completion dates</p>
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
          <p className="text-xs text-neutral-600 py-4 text-center">No data available</p>
        ) : (
          <>
            <div className="space-y-2.5">
              {rated.map(m => (
                <div key={m.name} className="flex items-center gap-2.5">
                  <span className="text-xs text-neutral-500 w-24 text-right truncate">{m.name}</span>
                  <div className="flex-1 flex h-4 rounded overflow-hidden bg-[#1a1a1a]">
                    <div style={{ width: `${(m.onTimeCount / maxOnTimeLate) * 100}%`, background: C.teal }} />
                    <div style={{ width: `${(m.lateCount / maxOnTimeLate) * 100}%`, background: C.red }} />
                  </div>
                  <span className="text-xs text-neutral-500 w-16 text-right">{m.onTimeCount}✓ {m.lateCount}✗</span>
                </div>
              ))}
            </div>
            <div className="flex gap-4 mt-3 text-[10px] text-neutral-600">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: C.teal }} />On-time</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: C.red }} />Late</span>
            </div>
          </>
        )}
      </Card>
    </>
  );
}

function TabVelocity({ d }) {
  const { members, velocity } = d;
  const withTurnaround = members.filter(m => m.avgTurnaround && m.name !== 'Unassigned');
  const maxDays = Math.max(...withTurnaround.map(m => m.avgTurnaround), 1);
  const memberNames = members.filter(m => m.name !== 'Unassigned').slice(0, 6).map(m => m.name);
  const lineColors = [C.purple, C.teal, C.blue, C.amber, C.pink, C.red];

  return (
    <>
      <Card title="Average turnaround by member">
        <p className="text-[11px] text-neutral-600 mb-3">Days from creation to completion — lower is better</p>
        {withTurnaround.length === 0 ? (
          <p className="text-xs text-neutral-600 py-4 text-center">No completed tasks with creation dates</p>
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
            <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1c" />
            <XAxis dataKey="week" tick={{ fill: '#555', fontSize: 11 }} />
            <YAxis tick={{ fill: '#555', fontSize: 11 }} />
            <Tooltip {...TT_STYLE} />
            {memberNames.map((name, i) => (
              <Line key={name} type="monotone" dataKey={name} stroke={lineColors[i % lineColors.length]}
                strokeWidth={1.5} dot={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
        <div className="flex flex-wrap gap-3 mt-2 text-[10px] text-neutral-600">
          {memberNames.map((name, i) => (
            <span key={name} className="flex items-center gap-1">
              <span className="w-3 h-0.5" style={{ background: lineColors[i % lineColors.length] }} />{name}
            </span>
          ))}
        </div>
      </Card>
    </>
  );
}

function TabMembers({ d }) {
  const { members } = d;
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      {members.filter(m => m.name !== 'Unassigned').map(m => (
        <Card key={m.name}>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-[#1a1a1a] flex items-center justify-center text-xs font-medium text-neutral-400">
              {m.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
            </div>
            <div>
              <p className="text-sm font-medium text-neutral-200">{m.name}</p>
              <p className="text-[11px] text-neutral-600">{m.hub}</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-[#0a0a0a] rounded-lg p-2.5">
              <p className="text-lg font-semibold text-white">{m.total}</p>
              <p className="text-[10px] text-neutral-600">Total</p>
            </div>
            <div className="bg-[#0a0a0a] rounded-lg p-2.5">
              <p className="text-lg font-semibold text-emerald-400">{m.completed}</p>
              <p className="text-[10px] text-neutral-600">Done</p>
            </div>
            <div className="bg-[#0a0a0a] rounded-lg p-2.5">
              <p className={`text-lg font-semibold ${m.overdue > 0 ? 'text-red-400' : 'text-neutral-500'}`}>{m.overdue}</p>
              <p className="text-[10px] text-neutral-600">Overdue</p>
            </div>
          </div>
          <div className="mt-3 space-y-1.5 text-xs text-neutral-500">
            {m.onTimeRate !== null && (
              <div className="flex justify-between">
                <span>On-time rate</span>
                <span className={m.onTimeRate >= 85 ? 'text-emerald-400' : m.onTimeRate >= 75 ? 'text-amber-400' : 'text-red-400'}>
                  {m.onTimeRate}%
                </span>
              </div>
            )}
            {m.avgTurnaround && (
              <div className="flex justify-between">
                <span>Avg turnaround</span><span>{m.avgTurnaround} days</span>
              </div>
            )}
            {m.hours > 0 && (
              <div className="flex justify-between">
                <span>Hours logged</span><span>{m.hours}h</span>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function TabHubs({ d }) {
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
            <CartesianGrid strokeDasharray="3 3" stroke="#1c1c1c" />
            <XAxis dataKey="week" tick={{ fill: '#555', fontSize: 11 }} />
            <YAxis tick={{ fill: '#555', fontSize: 11 }} />
            <Tooltip {...TT_STYLE} />
            <Bar dataKey="Dubai" fill={C.blue} radius={[3, 3, 0, 0]} />
            <Bar dataKey="Lebanon" fill={C.amber} radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card title="Turnaround — hub comparison">
        <div className="space-y-2.5">
          {hubTurnaround.map(h => (
            <HBar key={h.hub} name={h.hub} value={h.avgDays}
              max={Math.max(...hubTurnaround.map(x => x.avgDays), 1)}
              color={h.hub === 'Dubai' ? C.blue : C.amber} suffix=" days" />
          ))}
        </div>
      </Card>
    </>
  );
}

function TabProjects({ projects, funnel }) {
  const maxFunnel = funnel.length > 0 ? funnel[0].count : 1;
  return (
    <>
      <Card title="Task stage funnel — all projects">
        <div className="space-y-2.5">
          {funnel.slice(0, 12).map(f => (
            <HBar key={f.name} name={f.name} value={f.count} max={maxFunnel} color={C.purple} />
          ))}
        </div>
      </Card>

      <Card title="Project health scorecard">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1c1c1c]">
                <th className="text-left py-2.5 text-neutral-500 font-medium">Project</th>
                <th className="text-center py-2.5 text-neutral-500 font-medium">Health</th>
                <th className="text-right py-2.5 text-neutral-500 font-medium">Completion</th>
                <th className="text-right py-2.5 text-neutral-500 font-medium">Overdue</th>
                <th className="text-right py-2.5 text-neutral-500 font-medium">Total</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(p => {
                const health = getProjectHealth(p);
                return (
                  <tr key={p.id} className="border-b border-[#141414]">
                    <td className="py-2.5 text-neutral-300">{p.name}</td>
                    <td className="py-2.5 text-center"><RagDot level={health} /></td>
                    <td className="py-2.5 text-right text-neutral-400">{p.completionPct}%</td>
                    <td className="py-2.5 text-right text-red-400">{p.overdueTasks}</td>
                    <td className="py-2.5 text-right text-neutral-500">{p.totalTasks}</td>
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

function TabTimeline({ d }) {
  const { heatmap, gantt } = d;
  const maxCount = Math.max(...heatmap.map(h => h.count), 1);
  const weeks = [];
  for (let i = 0; i < heatmap.length; i += 7) weeks.push(heatmap.slice(i, i + 7));

  const ganttDates = gantt.flatMap(g => [g.start, g.end]).filter(Boolean).sort();
  const ganttStart = ganttDates[0] || new Date().toISOString().substring(0, 10);
  const ganttEnd = ganttDates[ganttDates.length - 1] || ganttStart;
  const ganttRange = Math.max(1, Math.ceil((new Date(ganttEnd) - new Date(ganttStart)) / 86400000));

  return (
    <>
      <Card title="Workload heatmap — tasks due per day">
        <p className="text-[11px] text-neutral-600 mb-3">Darker green = more tasks due that day</p>
        <div className="space-y-1">
          {weeks.map((week, wi) => (
            <div key={wi} className="flex gap-1">
              {week.map(day => {
                const intensity = day.count / maxCount;
                let bg = '#141414';
                if (day.isWeekend) bg = '#0e0e0e';
                else if (day.isPast) bg = '#181818';
                else if (day.count > 0) {
                  const r = Math.round(29 + intensity * 100);
                  const g = Math.round(158 + intensity * (-60));
                  const b = Math.round(117 + intensity * (-40));
                  bg = `rgb(${r}, ${g}, ${b})`;
                }
                return (
                  <div key={day.date} title={`${day.date}: ${day.count} tasks`}
                    className="flex-1 h-10 rounded flex flex-col items-center justify-center text-[9px]"
                    style={{ background: bg }}>
                    <span className="text-neutral-600">{day.dayName}</span>
                    <span className={day.count > 0 ? 'text-white font-medium' : 'text-neutral-700'}>{day.day}</span>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </Card>

      <Card title="Gantt-style task timeline">
        <p className="text-[11px] text-neutral-600 mb-3">Click a bar to open the task in Asana</p>
        <div className="space-y-1.5">
          {gantt.map((g, i) => {
            const startOffset = Math.max(0, Math.ceil((new Date(g.start) - new Date(ganttStart)) / 86400000));
            const duration = Math.max(1, Math.ceil((new Date(g.end) - new Date(g.start)) / 86400000));
            const left = (startOffset / ganttRange) * 100;
            const width = Math.max(2, (duration / ganttRange) * 100);
            const color = g.status === 'Overdue' ? C.red : C.blue;

            const Bar = (
              <div className="flex-1 relative h-5 bg-[#0e0e0e] rounded">
                <div className="absolute h-full rounded flex items-center px-1.5"
                  title={`${g.name} (${g.start} → ${g.end})`}
                  style={{ left: `${left}%`, width: `${width}%`, background: color, minWidth: 4 }}>
                  <span className="text-[9px] text-white truncate">{g.name}</span>
                </div>
              </div>
            );

            return (
              <div key={i} className="flex items-center gap-2">
                <span className="text-[10px] text-neutral-600 w-20 text-right truncate">{g.assignee}</span>
                {g.url
                  ? <a href={g.url} target="_blank" rel="noopener noreferrer" className="flex-1">{Bar}</a>
                  : Bar}
              </div>
            );
          })}
        </div>
      </Card>
    </>
  );
}

function TabRadar({ d }) {
  const { radarDubai, radarLebanon, composite } = d;
  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Card title="Performance radar — Dubai">
          {radarDubai.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarDubai}>
                <PolarGrid stroke="#222" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#777', fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#444', fontSize: 10 }} />
                <Radar name="Dubai" dataKey="score" stroke={C.blue} fill={C.blue} fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          ) : <p className="text-xs text-neutral-600 py-10 text-center">No Dubai members mapped</p>}
        </Card>

        <Card title="Performance radar — Lebanon">
          {radarLebanon.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={radarLebanon}>
                <PolarGrid stroke="#222" />
                <PolarAngleAxis dataKey="metric" tick={{ fill: '#777', fontSize: 11 }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fill: '#444', fontSize: 10 }} />
                <Radar name="Lebanon" dataKey="score" stroke={C.amber} fill={C.amber} fillOpacity={0.15} strokeWidth={2} />
              </RadarChart>
            </ResponsiveContainer>
          ) : <p className="text-xs text-neutral-600 py-10 text-center">No Lebanon members mapped</p>}
        </Card>
      </div>

      <Card title="Full performance scorecard">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[#1c1c1c]">
                <th className="text-left py-2.5 text-neutral-500 font-medium">Hub</th>
                <th className="text-center py-2.5 text-neutral-500 font-medium">Volume</th>
                <th className="text-center py-2.5 text-neutral-500 font-medium">On-time</th>
                <th className="text-center py-2.5 text-neutral-500 font-medium">Speed</th>
                <th className="text-center py-2.5 text-neutral-500 font-medium">Coverage</th>
                <th className="text-center py-2.5 text-neutral-500 font-medium">Consistency</th>
                <th className="text-center py-2.5 text-neutral-500 font-medium">Composite</th>
              </tr>
            </thead>
            <tbody>
              {composite.map(c => {
                const rag = c.composite >= 70 ? 'green' : c.composite >= 50 ? 'amber' : 'red';
                return (
                  <tr key={c.hub} className="border-b border-[#141414]">
                    <td className="py-2.5 text-neutral-300 font-medium">{c.hub}</td>
                    {c.scores.map(s => (
                      <td key={s.metric} className="py-2.5 text-center text-neutral-400">{s.score}</td>
                    ))}
                    <td className="py-2.5 text-center font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <RagDot level={rag} />{c.composite}
                      </span>
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

// ═══════════════════════════════════════════════════════════
// TAB 9: BREAKDOWNS (Brand / Market / Campaign)
// ═══════════════════════════════════════════════════════════
function BreakdownBlock({ title, data, color = C.purple }) {
  if (!data || data.length === 0) {
    return (
      <Card title={title}>
        <p className="text-xs text-neutral-600 py-4 text-center">No data — ensure this custom field is populated in Asana</p>
      </Card>
    );
  }
  const max = data[0]?.total || 1;
  return (
    <Card title={title}>
      <div className="space-y-2.5">
        {data.slice(0, 10).map((item, i) => (
          <div key={item.name}>
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-neutral-400 w-28 text-right truncate">{item.name}</span>
              <div className="flex-1 flex h-5 rounded overflow-hidden bg-[#1a1a1a]">
                <div style={{ width: `${(item.completed / max) * 100}%`, background: C.teal }} />
                <div style={{ width: `${((item.total - item.completed - item.overdue) / max) * 100}%`, background: color }} />
                <div style={{ width: `${(item.overdue / max) * 100}%`, background: C.red }} />
              </div>
              <span className="text-xs text-neutral-500 w-10 text-right">{item.total}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-4 mt-3 text-[10px] text-neutral-600">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: C.teal }} />Completed</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: color }} />In progress</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{ background: C.red }} />Overdue</span>
      </div>
    </Card>
  );
}

function TabBreakdowns({ d }) {
  const { brands, markets, campaigns } = d;
  return (
    <>
      <BreakdownBlock title="Task breakdown by brand" data={brands} color={C.purple} />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <BreakdownBlock title="Task breakdown by market" data={markets} color={C.blue} />
        <BreakdownBlock title="Task breakdown by campaign" data={campaigns} color={C.amber} />
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════
// TAB 10: MILESTONES & BLOCKERS
// ═══════════════════════════════════════════════════════════
function TabMilestonesBlockers({ d }) {
  const { milestones, blocked } = d;

  return (
    <>
      <Card title={`Upcoming milestones (${milestones.length})`}>
        {milestones.length === 0 ? (
          <p className="text-xs text-neutral-600 py-4 text-center">No milestone tasks — mark tasks as milestones in Asana to track key delivery dates</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[#1c1c1c]">
                  <th className="text-left py-2.5 text-neutral-500 font-medium">Milestone</th>
                  <th className="text-left py-2.5 text-neutral-500 font-medium">Owner</th>
                  <th className="text-center py-2.5 text-neutral-500 font-medium">Status</th>
                  <th className="text-right py-2.5 text-neutral-500 font-medium">Due</th>
                </tr>
              </thead>
              <tbody>
                {milestones.map((m, i) => (
                  <tr key={i} className="border-b border-[#141414] hover:bg-[#141414]">
                    <td className="py-2.5">
                      <TaskLink url={m.url}>{m.name}</TaskLink>
                    </td>
                    <td className="py-2.5 text-neutral-500">{m.assignee}</td>
                    <td className="py-2.5 text-center">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] ${
                        m.status === 'Completed' ? 'bg-emerald-950/50 text-emerald-400' :
                        m.status === 'Overdue' ? 'bg-red-950/50 text-red-400' :
                        'bg-blue-950/50 text-blue-400'
                      }`}>{m.status}</span>
                    </td>
                    <td className={`py-2.5 text-right ${m.status === 'Overdue' ? 'text-red-400' : 'text-neutral-500'}`}>
                      {m.dueDate || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card title={`Blocked tasks (${blocked.length})`}>
        <p className="text-[11px] text-neutral-600 mb-3">Tasks waiting on dependencies — click to open in Asana</p>
        {blocked.length === 0 ? (
          <p className="text-xs text-neutral-600 py-4 text-center">No blocked tasks — great flow!</p>
        ) : (
          <div className="space-y-3">
            {blocked.map((b, i) => (
              <div key={i} className="bg-[#0e0e0e] rounded-lg p-3 border border-[#1a1a1a]">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1">
                    <TaskLink url={b.url}>
                      <span className="text-sm text-neutral-200">{b.name}</span>
                    </TaskLink>
                    <p className="text-[11px] text-neutral-600 mt-0.5">
                      {b.assignee} · Due {b.dueDate || '—'}
                    </p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full whitespace-nowrap ${
                    b.blockersResolved
                      ? 'bg-emerald-950/50 text-emerald-400'
                      : 'bg-amber-950/50 text-amber-400'
                  }`}>
                    {b.blockersResolved ? 'Ready to start' : 'Waiting'}
                  </span>
                </div>
                <div className="pl-3 border-l-2 border-[#262626] space-y-0.5">
                  <p className="text-[10px] text-neutral-600 mb-1">Dependencies:</p>
                  {b.blockers.map((blk, j) => (
                    <div key={j} className="flex items-center gap-2 text-[11px]">
                      <span className={blk.completed ? 'text-emerald-400' : 'text-neutral-500'}>
                        {blk.completed ? '✓' : '○'}
                      </span>
                      <TaskLink url={blk.url}>
                        <span className={blk.completed ? 'text-neutral-500 line-through' : 'text-neutral-400'}>
                          {blk.name}
                        </span>
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
