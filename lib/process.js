import { HUB_MAP, DEFAULT_HUB, WEEKLY_CAPACITY, TREND_WEEKS } from './config';

export function getHub(assignee) {
  return HUB_MAP[assignee] || DEFAULT_HUB;
}

export function getSummary(tasks) {
  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'Completed').length;
  const overdue = tasks.filter(t => t.status === 'Overdue').length;
  const hours = Math.round(tasks.reduce((s, t) => s + t.timeMinutes, 0) / 60);
  return { total, completed, overdue, inProgress: total - completed - overdue, hours };
}

export function getMemberStats(tasks) {
  const map = {};
  tasks.forEach(t => {
    if (t.assignee === 'Unassigned') return;
    if (!map[t.assignee]) map[t.assignee] = {
      name: t.assignee, hub: getHub(t.assignee),
      total: 0, completed: 0, overdue: 0, dueSoon: 0, upcoming: 0, noDate: 0,
      onTimeCount: 0, lateCount: 0, daysTotal: 0, daysCount: 0,
      hours: 0, subtasks: 0, topLevel: 0, weeklyCompleted: {},
    };
    const m = map[t.assignee];
    m.total++;
    if (t.status === 'Completed') m.completed++;
    if (t.urgency === 'Overdue') m.overdue++;
    if (t.urgency === 'Due soon') m.dueSoon++;
    if (t.urgency === 'Upcoming') m.upcoming++;
    if (t.urgency === 'No date' && t.status !== 'Completed') m.noDate++;
    if (t.onTime === true) m.onTimeCount++;
    if (t.onTime === false) m.lateCount++;
    if (t.turnaroundDays) { m.daysTotal += t.turnaroundDays; m.daysCount++; }
    m.hours += t.timeMinutes / 60;
    if (t.isSubtask) m.subtasks++; else m.topLevel++;
    if (t.completedWeek) {
      m.weeklyCompleted[t.completedWeek] = (m.weeklyCompleted[t.completedWeek] || 0) + 1;
    }
  });

  return Object.values(map).map(m => ({
    ...m,
    hours: Math.round(m.hours),
    onTimeRate: (m.onTimeCount + m.lateCount) > 0
      ? Math.round((m.onTimeCount / (m.onTimeCount + m.lateCount)) * 100) : null,
    avgTurnaround: m.daysCount > 0 ? Math.round(m.daysTotal / m.daysCount) : null,
  })).sort((a, b) => b.total - a.total);
}

export function getTimingSplit(tasks) {
  const open = tasks.filter(t => t.status !== 'Completed');
  const counts = { Overdue: 0, 'Due soon': 0, Upcoming: 0, 'No date': 0 };
  open.forEach(t => { if (counts[t.urgency] !== undefined) counts[t.urgency]++; });
  return Object.entries(counts).map(([name, value]) => ({ name, value }));
}

function getActivityWeeks(tasks, count = TREND_WEEKS) {
  const activeWeeks = new Set();
  tasks.forEach(t => {
    if (t.completedWeek) activeWeeks.add(t.completedWeek);
    if (t.createdWeek) activeWeeks.add(t.createdWeek);
  });

  if (activeWeeks.size === 0) return getLastNWeeks(count);

  const sortedWeeks = [...activeWeeks].sort();
  const latestActive = sortedWeeks[sortedWeeks.length - 1];
  const todayWeek = getCurrentWeekKey();
  const anchor = latestActive > todayWeek ? latestActive : todayWeek;

  const anchorDate = new Date(anchor);
  const weeks = [];
  for (let i = count - 1; i >= 0; i--) {
    const w = new Date(anchorDate);
    w.setDate(w.getDate() - i * 7);
    weeks.push(w.toISOString().substring(0, 10));
  }
  return weeks;
}

export function getWeeklyTrend(tasks) {
  const weeks = getActivityWeeks(tasks);
  return weeks.map(w => ({
    week: formatWeekLabel(w), weekKey: w,
    completed: tasks.filter(t => t.completedWeek === w).length,
    created: tasks.filter(t => t.createdWeek === w).length,
  }));
}

export function getBacklogTrend(tasks) {
  const weeks = getActivityWeeks(tasks);
  let running = tasks.filter(t =>
    t.status !== 'Completed' && (!t.createdWeek || t.createdWeek < weeks[0])
  ).length;

  return weeks.map(w => {
    const created = tasks.filter(t => t.createdWeek === w).length;
    const completed = tasks.filter(t => t.completedWeek === w).length;
    running = running + created - completed;
    return { week: formatWeekLabel(w), weekKey: w, backlog: Math.max(0, running), created, completed };
  });
}

export function getSubtaskSplit(tasks) {
  const sub = tasks.filter(t => t.isSubtask).length;
  return [
    { name: 'Subtasks', value: sub },
    { name: 'Top-level', value: tasks.length - sub },
  ];
}

export function getHubWeekly(tasks, members) {
  const weeks = getActivityWeeks(tasks);
  const dubaiMembers = new Set(members.filter(m => m.hub === 'Dubai').map(m => m.name));
  const lebanonMembers = new Set(members.filter(m => m.hub === 'Lebanon').map(m => m.name));

  return weeks.map(w => ({
    week: formatWeekLabel(w),
    Dubai: tasks.filter(t => t.completedWeek === w && dubaiMembers.has(t.assignee)).length,
    Lebanon: tasks.filter(t => t.completedWeek === w && lebanonMembers.has(t.assignee)).length,
  }));
}

export function getHubTurnaround(members) {
  const hubs = {};
  members.forEach(m => {
    if (!hubs[m.hub]) hubs[m.hub] = { days: 0, count: 0 };
    if (m.avgTurnaround) {
      hubs[m.hub].days += m.avgTurnaround * m.daysCount;
      hubs[m.hub].count += m.daysCount;
    }
  });
  return Object.entries(hubs).map(([hub, d]) => ({
    hub, avgDays: d.count > 0 ? Math.round(d.days / d.count) : 0,
  }));
}

export function getProjectHealth(project) {
  if (project.overdueRate > 20 || project.completionPct < 30) return 'red';
  if (project.overdueRate > 10 || project.completionPct < 60) return 'amber';
  return 'green';
}

export function getHeatmapData(tasks) {
  const now = new Date();
  const start = new Date(now); start.setDate(start.getDate() - 14);
  const end = new Date(now); end.setDate(end.getDate() + 28);

  const days = [];
  const d = new Date(start);
  while (d <= end) {
    const key = d.toISOString().substring(0, 10);
    days.push({
      date: key, day: d.getDate(),
      dayName: d.toLocaleDateString('en', { weekday: 'short' }),
      month: d.toLocaleDateString('en', { month: 'short' }),
      count: tasks.filter(t => t.dueDate === key && t.status !== 'Completed').length,
      isWeekend: d.getDay() === 0 || d.getDay() === 6,
      isPast: d < now,
    });
    d.setDate(d.getDate() + 1);
  }
  return days;
}

export function getGanttData(tasks) {
  return tasks
    .filter(t => t.dueDate && t.status !== 'Completed')
    .map(t => ({
      name: t.name.length > 30 ? t.name.substring(0, 30) + '…' : t.name,
      assignee: t.assignee, start: t.startDate || t.createdAt,
      end: t.dueDate, status: t.status, url: t.url,
    }))
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 20);
}

export function getVelocityData(members, tasks) {
  const weeks = tasks ? getActivityWeeks(tasks, 7) : getLastNWeeks(7);
  return weeks.map(w => {
    const row = { week: formatWeekLabel(w) };
    members.forEach(m => {
      if (m.name !== 'Unassigned') row[m.name] = m.weeklyCompleted[w] || 0;
    });
    return row;
  });
}

export function getRadarScores(members, hubName) {
  const hubMembers = members.filter(m => m.hub === hubName);
  if (hubMembers.length === 0) return [];

  const avg = (arr) => arr.length > 0 ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

  const volume = Math.min(100, avg(hubMembers.map(m => Math.min(100, (m.completed / Math.max(1, WEEKLY_CAPACITY * 4)) * 100))));
  const onTime = avg(hubMembers.filter(m => m.onTimeRate !== null).map(m => m.onTimeRate));
  const speed = avg(hubMembers.filter(m => m.avgTurnaround).map(m => Math.max(0, 100 - m.avgTurnaround * 5)));
  const coverage = avg(hubMembers.map(m => m.total > 0 ? Math.round(((m.total - m.noDate) / m.total) * 100) : 0));
  const weeks = getLastNWeeks(4);
  const weeklyOutputs = weeks.map(w => hubMembers.reduce((s, m) => s + (m.weeklyCompleted[w] || 0), 0));
  const avgOutput = avg(weeklyOutputs);
  const variance = weeklyOutputs.length > 0
    ? Math.sqrt(weeklyOutputs.reduce((s, v) => s + Math.pow(v - avgOutput, 2), 0) / weeklyOutputs.length) : 0;
  const consistency = Math.max(0, Math.round(100 - variance * 10));

  return [
    { metric: 'Volume', score: volume },
    { metric: 'On-time', score: onTime || 50 },
    { metric: 'Speed', score: speed || 50 },
    { metric: 'Coverage', score: coverage },
    { metric: 'Consistency', score: consistency },
  ];
}

export function getCompositeScore(members) {
  const byHub = {};
  members.forEach(m => {
    if (!byHub[m.hub]) byHub[m.hub] = [];
    byHub[m.hub].push(m);
  });

  return Object.entries(byHub).map(([hub]) => {
    const radar = getRadarScores(members, hub);
    const composite = radar.length > 0
      ? Math.round(radar.reduce((s, r) => s + r.score, 0) / radar.length) : 0;
    return { hub, scores: radar, composite };
  });
}

function getBreakdown(tasks, field) {
  const map = {};
  tasks.forEach(t => {
    if (!t[field]) return;
    const values = String(t[field]).split(',').map(v => v.trim()).filter(Boolean);
    values.forEach(v => {
      if (!map[v]) map[v] = { name: v, total: 0, completed: 0, overdue: 0 };
      map[v].total++;
      if (t.status === 'Completed') map[v].completed++;
      if (t.status === 'Overdue') map[v].overdue++;
    });
  });
  return Object.values(map).sort((a, b) => b.total - a.total);
}

export function getBrandBreakdown(tasks) { return getBreakdown(tasks, 'brand'); }
export function getMarketBreakdown(tasks) { return getBreakdown(tasks, 'market'); }
export function getCampaignBreakdown(tasks) { return getBreakdown(tasks, 'campaign'); }

export function getMilestones(tasks) {
  return tasks
    .filter(t => t.isMilestone)
    .map(t => ({
      name: t.name, assignee: t.assignee, dueDate: t.dueDate,
      status: t.status, url: t.url,
    }))
    .sort((a, b) => (a.dueDate || 'z').localeCompare(b.dueDate || 'z'));
}

export function getBlockedTasks(tasks) {
  const taskMap = {};
  tasks.forEach(t => { taskMap[t.id] = t; });

  return tasks
    .filter(t => t.isBlocked && t.status !== 'Completed')
    .map(t => ({
      name: t.name, assignee: t.assignee, dueDate: t.dueDate,
      status: t.status, url: t.url,
      blockers: t.dependencies
        .map(depId => taskMap[depId])
        .filter(Boolean)
        .map(dep => ({
          name: dep.name,
          completed: dep.status === 'Completed',
          url: dep.url,
        })),
      blockersResolved: t.dependencies.every(depId => taskMap[depId]?.status === 'Completed'),
    }))
    .sort((a, b) => Number(a.blockersResolved) - Number(b.blockersResolved));
}

// ═══════════════════════════════════════════════════════════
// BUDGET / NUMBER FIELD AGGREGATION
// For each number-type custom field, sum across three buckets:
// total / in-flight (incomplete) / spent (completed)
// Also breaks down by brand, market, campaign, assignee
// ═══════════════════════════════════════════════════════════
export function getBudgetSummaries(tasks, fieldNames) {
  if (!fieldNames || fieldNames.length === 0) return [];

  return fieldNames.map(field => {
    let total = 0, inFlight = 0, spent = 0;
    const byBrand = {};
    const byMarket = {};
    const byCampaign = {};

    tasks.forEach(t => {
      const value = t.numberFields?.[field];
      if (typeof value !== 'number') return;

      total += value;
      if (t.status === 'Completed') spent += value;
      else inFlight += value;

      // Breakdowns (skip if value or dimension missing)
      if (t.brand) byBrand[t.brand] = (byBrand[t.brand] || 0) + value;
      if (t.market) byMarket[t.market] = (byMarket[t.market] || 0) + value;
      if (t.campaign) byCampaign[t.campaign] = (byCampaign[t.campaign] || 0) + value;
    });

    return {
      field,
      total: Math.round(total * 100) / 100,
      inFlight: Math.round(inFlight * 100) / 100,
      spent: Math.round(spent * 100) / 100,
      byBrand: Object.entries(byBrand)
        .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
        .sort((a, b) => b.value - a.value),
      byMarket: Object.entries(byMarket)
        .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
        .sort((a, b) => b.value - a.value),
      byCampaign: Object.entries(byCampaign)
        .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
        .sort((a, b) => b.value - a.value),
    };
  });
}

function getCurrentWeekKey() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().substring(0, 10);
}

function getLastNWeeks(n) {
  const weeks = [];
  const d = new Date(); d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  for (let i = n - 1; i >= 0; i--) {
    const w = new Date(d); w.setDate(w.getDate() - i * 7);
    weeks.push(w.toISOString().substring(0, 10));
  }
  return weeks;
}

function formatWeekLabel(weekKey) {
  const d = new Date(weekKey);
  return d.toLocaleDateString('en', { day: 'numeric', month: 'short' });
}
