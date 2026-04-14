// lib/asana.js
// Server-side only — Asana token never reaches the browser

const ASANA_TOKEN = process.env.ASANA_TOKEN;
const BASE_URL = 'https://app.asana.com/api/1.0';

async function asanaGet(endpoint, params = {}) {
  const url = new URL(BASE_URL + endpoint);
  Object.entries(params).forEach(([key, val]) => {
    url.searchParams.set(key, Array.isArray(val) ? val.join(',') : val);
  });

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${ASANA_TOKEN}` },
    next: { revalidate: 300 }, // Cache for 5 minutes
  });

  const json = await res.json();
  if (json.errors) {
    console.error('Asana API error:', json.errors);
    return [];
  }
  return json.data || [];
}

// Fetch all tasks with pagination
async function fetchAllTasks(projectGid) {
  const tasks = [];
  let offset = null;

  do {
    const params = {
      project: projectGid,
      limit: '100',
      opt_fields: [
        'name', 'assignee.name', 'assignee.email',
        'memberships.section.name', 'completed', 'completed_at',
        'created_at', 'due_on', 'tags.name',
        'custom_fields.name', 'custom_fields.display_value',
        'actual_time_minutes',
      ].join(','),
    };
    if (offset) params.offset = offset;

    const url = new URL(`${BASE_URL}/tasks`);
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${ASANA_TOKEN}` },
    });
    const json = await res.json();
    const data = json.data || [];
    tasks.push(...data);
    offset = json.next_page ? json.next_page.offset : null;
  } while (offset);

  return tasks;
}

// Get project details
async function fetchProject(projectGid) {
  const res = await fetch(
    `${BASE_URL}/projects/${projectGid}?opt_fields=name,owner.name,current_status_update.text,start_on,due_on,modified_at`,
    { headers: { Authorization: `Bearer ${ASANA_TOKEN}` } }
  );
  const json = await res.json();
  return json.data;
}

// Process raw tasks into dashboard-ready data
export async function getDashboardData() {
  const projectGids = process.env.ASANA_PROJECT_GIDS.split(',');
  const today = new Date().toISOString().substring(0, 10);

  const now = new Date();
  const endOfWeek = new Date(now);
  endOfWeek.setDate(now.getDate() + (7 - now.getDay()));
  const endOfNextWeek = new Date(endOfWeek);
  endOfNextWeek.setDate(endOfNextWeek.getDate() + 7);

  const allTasks = [];
  const projects = [];

  for (const gid of projectGids) {
    const [tasks, project] = await Promise.all([
      fetchAllTasks(gid.trim()),
      fetchProject(gid.trim()),
    ]);

    const projectName = project?.name || gid;
    let completed = 0;
    let total = tasks.length;

    const processed = tasks.map((task) => {
      if (task.completed) completed++;

      // Determine status
      let status = 'In progress';
      if (task.completed) {
        status = 'Completed';
      } else if (task.due_on && task.due_on < today) {
        status = 'Overdue';
      }

      // Get section
      let section = '';
      if (task.memberships?.length > 0) {
        task.memberships.forEach((m) => {
          if (m.section) section = m.section.name;
        });
      }

      return {
        id: task.gid,
        name: task.name,
        assignee: task.assignee?.name || 'Unassigned',
        assigneeEmail: task.assignee?.email || '',
        project: projectName,
        section,
        status,
        createdAt: task.created_at?.substring(0, 10) || '',
        dueDate: task.due_on || '',
        completedAt: task.completed_at?.substring(0, 10) || '',
        tags: (task.tags || []).map((t) => t.name),
        timeMinutes: task.actual_time_minutes || 0,
      };
    });

    allTasks.push(...processed);

    projects.push({
      id: project?.gid || gid,
      name: projectName,
      owner: project?.owner?.name || 'No owner',
      status: project?.current_status_update?.text || 'No status',
      startDate: project?.start_on || '',
      dueDate: project?.due_on || '',
      totalTasks: total,
      completedTasks: completed,
      completionPct: total > 0 ? Math.round((completed / total) * 100) : 0,
    });
  }

  // Build team workload from tasks
  const memberMap = {};
  allTasks.forEach((task) => {
    const name = task.assignee;
    if (!memberMap[name]) {
      memberMap[name] = {
        email: task.assigneeEmail,
        total: 0, completed: 0, overdue: 0,
        thisWeek: 0, nextWeek: 0, hoursLogged: 0,
      };
    }
    memberMap[name].total++;
    if (task.status === 'Completed') memberMap[name].completed++;
    if (task.status === 'Overdue') memberMap[name].overdue++;
    if (task.dueDate) {
      if (task.dueDate >= today && task.dueDate <= endOfWeek.toISOString().substring(0, 10)) {
        memberMap[name].thisWeek++;
      }
      if (task.dueDate > endOfWeek.toISOString().substring(0, 10) &&
          task.dueDate <= endOfNextWeek.toISOString().substring(0, 10)) {
        memberMap[name].nextWeek++;
      }
    }
    memberMap[name].hoursLogged += Math.round((task.timeMinutes / 60) * 100) / 100;
  });

  const workload = Object.entries(memberMap)
    .map(([name, data]) => ({
      name,
      ...data,
      completionRate: data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // Summary stats
  const summary = {
    totalTasks: allTasks.length,
    completed: allTasks.filter((t) => t.status === 'Completed').length,
    overdue: allTasks.filter((t) => t.status === 'Overdue').length,
    hoursLogged: Math.round(allTasks.reduce((sum, t) => sum + t.timeMinutes, 0) / 60),
  };

  return { summary, tasks: allTasks, projects, workload };
}
