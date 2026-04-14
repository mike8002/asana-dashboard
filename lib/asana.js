const ASANA_TOKEN = process.env.ASANA_TOKEN;
const BASE_URL = 'https://app.asana.com/api/1.0';

async function asanaFetch(endpoint) {
  const res = await fetch(BASE_URL + endpoint, {
    headers: { Authorization: `Bearer ${ASANA_TOKEN}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    console.error(`Asana error [${endpoint}]: ${res.status}`);
    return null;
  }
  return res.json();
}

async function fetchAllTasks(projectGid) {
  const tasks = [];
  let offset = null;
  const fields = [
    'name', 'assignee.name', 'assignee.email',
    'memberships.section.name', 'memberships.project.gid',
    'completed', 'completed_at', 'created_at', 'due_on',
    'start_on', 'tags.name', 'parent.gid',
    'custom_fields.name', 'custom_fields.display_value',
    'actual_time_minutes', 'modified_at',
  ].join(',');

  do {
    const url = `/tasks?project=${projectGid}&limit=100&opt_fields=${fields}${offset ? '&offset=' + offset : ''}`;
    const json = await asanaFetch(url);
    if (!json) break;
    tasks.push(...(json.data || []));
    offset = json.next_page?.offset || null;
  } while (offset);

  return tasks;
}

async function fetchProject(projectGid) {
  const json = await asanaFetch(
    `/projects/${projectGid}?opt_fields=name,owner.name,current_status_update.text,start_on,due_on,modified_at`
  );
  return json?.data;
}

async function fetchSections(projectGid) {
  const json = await asanaFetch(`/projects/${projectGid}/sections?opt_fields=name`);
  return json?.data || [];
}

function getWeekKey(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d.toISOString().substring(0, 10);
}

export async function fetchAllData() {
  const projectGids = (process.env.ASANA_PROJECT_GIDS || '').split(',').map(g => g.trim()).filter(Boolean);
  const today = new Date().toISOString().substring(0, 10);
  const now = new Date();

  const allTasks = [];
  const projects = [];

  for (const gid of projectGids) {
    const [tasks, project, sections] = await Promise.all([
      fetchAllTasks(gid),
      fetchProject(gid),
      fetchSections(gid),
    ]);

    const projectName = project?.name || gid;
    let completed = 0, overdue = 0;

    const processed = tasks.map((task) => {
      if (task.completed) completed++;

      let status = 'In progress';
      if (task.completed) status = 'Completed';
      else if (task.due_on && task.due_on < today) { status = 'Overdue'; overdue++; }

      let urgency = 'No date';
      if (task.due_on && !task.completed) {
        const days = Math.ceil((new Date(task.due_on) - now) / 86400000);
        if (days < 0) urgency = 'Overdue';
        else if (days <= 7) urgency = 'Due soon';
        else urgency = 'Upcoming';
      } else if (task.completed) urgency = 'Completed';

      let section = '';
      if (task.memberships?.length) {
        for (const m of task.memberships) {
          if (m.section && m.project?.gid === gid) { section = m.section.name; break; }
        }
      }

      let turnaroundDays = null;
      if (task.completed && task.completed_at && task.created_at) {
        turnaroundDays = Math.max(1, Math.ceil(
          (new Date(task.completed_at) - new Date(task.created_at)) / 86400000
        ));
      }

      let onTime = null;
      if (task.completed && task.due_on && task.completed_at) {
        onTime = task.completed_at.substring(0, 10) <= task.due_on;
      }

      return {
        id: task.gid,
        name: task.name,
        assignee: task.assignee?.name || 'Unassigned',
        email: task.assignee?.email || '',
        project: projectName,
        projectGid: gid,
        section, status, urgency,
        createdAt: task.created_at?.substring(0, 10) || '',
        dueDate: task.due_on || '',
        startDate: task.start_on || '',
        completedAt: task.completed_at?.substring(0, 10) || '',
        isSubtask: !!task.parent,
        turnaroundDays, onTime,
        timeMinutes: task.actual_time_minutes || 0,
        completedWeek: task.completed && task.completed_at ? getWeekKey(new Date(task.completed_at)) : null,
        createdWeek: task.created_at ? getWeekKey(new Date(task.created_at)) : null,
      };
    });

    allTasks.push(...processed);
    projects.push({
      id: gid, name: projectName,
      owner: project?.owner?.name || '—',
      totalTasks: tasks.length, completedTasks: completed,
      overdueTasks: overdue, remainingTasks: tasks.length - completed,
      completionPct: tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0,
      overdueRate: tasks.length > 0 ? Math.round((overdue / tasks.length) * 100) : 0,
      sections: (sections || []).map(s => s.name),
    });
  }

  const funnelMap = {};
  allTasks.forEach(t => {
    if (t.section && t.status !== 'Completed') {
      funnelMap[t.section] = (funnelMap[t.section] || 0) + 1;
    }
  });

  return {
    tasks: allTasks,
    projects,
    funnel: Object.entries(funnelMap).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    fetchedAt: new Date().toISOString(),
  };
}
