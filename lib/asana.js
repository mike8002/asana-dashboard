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

const TASK_FIELDS = [
  'name', 'assignee.name', 'assignee.email',
  'memberships.section.name', 'memberships.project.gid',
  'completed', 'completed_at', 'created_at', 'due_on',
  'start_on', 'tags.name', 'parent.gid',
  'custom_fields.name', 'custom_fields.display_value',
  'custom_fields.type', 'custom_fields.number_value',
  'actual_time_minutes', 'modified_at', 'num_subtasks',
  'resource_subtype', 'permalink_url', 'dependencies', 'num_likes',
  'followers.name',
].join(',');

async function fetchAllTasks(projectGid) {
  const tasks = [];
  let offset = null;
  do {
    const url = `/tasks?project=${projectGid}&limit=100&opt_fields=${TASK_FIELDS}${offset ? '&offset=' + offset : ''}`;
    const json = await asanaFetch(url);
    if (!json) break;
    tasks.push(...(json.data || []));
    offset = json.next_page?.offset || null;
  } while (offset);
  return tasks;
}

async function fetchSubtasks(taskGid) {
  const subtasks = [];
  let offset = null;
  do {
    const url = `/tasks/${taskGid}/subtasks?limit=100&opt_fields=${TASK_FIELDS}${offset ? '&offset=' + offset : ''}`;
    const json = await asanaFetch(url);
    if (!json) break;
    subtasks.push(...(json.data || []));
    offset = json.next_page?.offset || null;
  } while (offset);
  return subtasks;
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

function getCustomField(task, fieldName) {
  if (!task.custom_fields) return null;
  const target = fieldName.toLowerCase().replace(/[^a-z]/g, '');
  const field = task.custom_fields.find(f =>
    f.name && f.name.toLowerCase().replace(/[^a-z]/g, '').startsWith(target)
  );
  return field?.display_value || null;
}

// Extract all number-type custom fields from a task as { fieldName: value }
function getNumberFields(task) {
  const result = {};
  if (!task.custom_fields) return result;
  task.custom_fields.forEach(f => {
    if (f.type === 'number' && f.number_value !== null && f.number_value !== undefined) {
      result[f.name] = f.number_value;
    }
  });
  return result;
}

export async function fetchAllData(projectGids) {
  const gids = projectGids && projectGids.length > 0
    ? projectGids
    : (process.env.ASANA_PROJECT_GIDS || '').split(',').map(g => g.trim()).filter(Boolean);

  const today = new Date().toISOString().substring(0, 10);
  const now = new Date();

  const allTasks = [];
  const projects = [];
  const numberFieldNames = new Set();

  for (const gid of gids) {
    const [topTasks, project, sections] = await Promise.all([
      fetchAllTasks(gid),
      fetchProject(gid),
      fetchSections(gid),
    ]);

    const projectName = project?.name || gid;

    const tasksWithSubtasks = topTasks.filter(t => t.num_subtasks > 0);
    const subtasksArrays = await Promise.all(
      tasksWithSubtasks.map(t => fetchSubtasks(t.gid))
    );

    const allSubtasks = [];
    tasksWithSubtasks.forEach((parent, i) => {
      const parentSection = parent.memberships?.find(m => m.project?.gid === gid)?.section?.name || '';
      const parentBrand = getCustomField(parent, 'Brand');
      const parentSubBrand = getCustomField(parent, 'Sub Brand');
      const parentCampaign = getCustomField(parent, 'Campaign');
      const parentMarket = getCustomField(parent, 'Market') || getCustomField(parent, 'Country');
      const parentTeamAccount = getCustomField(parent, 'Team Account');
      const parentNumberFields = getNumberFields(parent);

      subtasksArrays[i].forEach(sub => {
        if (!sub.memberships?.length) sub._inheritedSection = parentSection;
        sub._parentBrand = parentBrand;
        sub._parentSubBrand = parentSubBrand;
        sub._parentCampaign = parentCampaign;
        sub._parentMarket = parentMarket;
        sub._parentTeamAccount = parentTeamAccount;
        sub._parentNumberFields = parentNumberFields;
        allSubtasks.push(sub);
      });
    });

    const allProjectTasks = [...topTasks, ...allSubtasks];
    let completed = 0, overdue = 0;

    const processed = allProjectTasks.map((task) => {
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

      let section = task._inheritedSection || '';
      if (!section && task.memberships?.length) {
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

      const brand = getCustomField(task, 'Brand') || task._parentBrand || null;
      const subBrand = getCustomField(task, 'Sub Brand') || task._parentSubBrand || null;
      const campaign = getCustomField(task, 'Campaign') || task._parentCampaign || null;
      const market = getCustomField(task, 'Market') || getCustomField(task, 'Country') || task._parentMarket || null;
      const teamAccount = getCustomField(task, 'Team Account') || task._parentTeamAccount || null;

      // Number fields — use task's own, fallback to parent's for subtasks
      const ownNumberFields = getNumberFields(task);
      const numberFields = task.isSubtask && Object.keys(ownNumberFields).length === 0
        ? (task._parentNumberFields || {})
        : ownNumberFields;

      // Track all unique number field names
      Object.keys(numberFields).forEach(n => numberFieldNames.add(n));

      const dependencies = (task.dependencies || []).map(d => d.gid);
      const isBlocked = dependencies.length > 0 && !task.completed;

      return {
        id: task.gid,
        name: task.name,
        url: task.permalink_url || null,
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
        isMilestone: task.resource_subtype === 'milestone',
        turnaroundDays, onTime,
        timeMinutes: task.actual_time_minutes || 0,
        completedWeek: task.completed && task.completed_at ? getWeekKey(new Date(task.completed_at)) : null,
        createdWeek: task.created_at ? getWeekKey(new Date(task.created_at)) : null,
        brand, subBrand, campaign, market, teamAccount,
        numberFields,
        dependencies, isBlocked,
        followers: (task.followers || []).length,
        likes: task.num_likes || 0,
      };
    });

    allTasks.push(...processed);
    projects.push({
      id: gid, name: projectName,
      owner: project?.owner?.name || '—',
      totalTasks: allProjectTasks.length,
      completedTasks: completed,
      overdueTasks: overdue,
      remainingTasks: allProjectTasks.length - completed,
      completionPct: allProjectTasks.length > 0 ? Math.round((completed / allProjectTasks.length) * 100) : 0,
      overdueRate: allProjectTasks.length > 0 ? Math.round((overdue / allProjectTasks.length) * 100) : 0,
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
    numberFieldNames: [...numberFieldNames].sort(),
    fetchedAt: new Date().toISOString(),
  };
}
