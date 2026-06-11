import Project from '../models/projectModel.js';
import Task from '../models/taskModel.js';

// ── Get all projects ──────────────────────────────────────────────────────────
export const getProjects = async (req, res) => {
  try {
    const query = {};
    if (req.teamMemberIds) {
      query.$or = [
        { createdBy: { $in: req.teamMemberIds } },
        { members: { $in: req.teamMemberIds } },
      ];
    }
    const { search, status } = req.query;
    if (search) query.name = { $regex: search, $options: 'i' };
    if (status) query.status = status;

    const projects = await Project.find(query)
      .populate('createdBy', 'firstName lastName email avatar')
      .populate('members', 'firstName lastName email avatar position')
      .populate('tasks', 'title completed priority dueDate owner checklist submissionStatus')
      .sort({ createdAt: -1 })
      .lean();

    res.json({ success: true, projects, total: projects.length });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch projects' });
  }
};

// ── Get project by ID (full detail for dashboard) ─────────────────────────────
export const getProjectById = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id)
      .populate('createdBy', 'firstName lastName email avatar')
      .populate('members', 'firstName lastName email avatar position unitSector')
      .populate({
        path: 'tasks',
        select: 'title completed priority dueDate owner checklist submissionStatus description createdAt assignedBy',
        populate: [
          { path: 'owner', select: 'firstName lastName email avatar' },
          { path: 'assignedBy', select: 'firstName lastName email' },
        ],
      })
      .populate('goals', 'title subGoals timeframe startDate endDate owner')
      .lean();

    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, project });
  } catch (err) {
    console.error('getProjectById error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch project' });
  }
};

// ── Create project ────────────────────────────────────────────────────────────
export const createProject = async (req, res) => {
  try {
    const { name, description, status, priority, startDate, endDate, members, tags } = req.body;
    if (!name?.trim()) return res.status(400).json({ success: false, message: 'Project name is required' });

    const project = new Project({
      name: name.trim(),
      description: description || '',
      status: status || 'planning',
      priority: priority || 'Medium',
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      createdBy: req.user._id,
      members: members || [],
      tags: tags || [],
    });

    await project.save();
    const populated = await Project.findById(project._id)
      .populate('createdBy', 'firstName lastName email avatar')
      .populate('members', 'firstName lastName email avatar')
      .lean();

    res.status(201).json({ success: true, project: populated });
  } catch (err) {
    console.error('createProject error:', err.message);
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── Update project (including tasks array) ────────────────────────────────────
export const updateProject = async (req, res) => {
  try {
    const data = { ...req.body };
    if (data.startDate) data.startDate = new Date(data.startDate);
    if (data.endDate) data.endDate = new Date(data.endDate);

    const updated = await Project.findByIdAndUpdate(req.params.id, data, { returnDocument: 'after', runValidators: true })
      .populate('createdBy', 'firstName lastName email avatar')
      .populate('members', 'firstName lastName email avatar')
      .populate('tasks', 'title completed priority dueDate owner checklist')
      .lean();

    if (!updated) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, project: updated });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// ── Delete project ────────────────────────────────────────────────────────────
export const deleteProject = async (req, res) => {
  try {
    const deleted = await Project.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, message: 'Project deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to delete project' });
  }
};

// ── Update project members ────────────────────────────────────────────────────
export const updateProjectMembers = async (req, res) => {
  try {
    const { members } = req.body;
    const project = await Project.findByIdAndUpdate(
      req.params.id, { members }, { returnDocument: 'after' }
    ).populate('members', 'firstName lastName email avatar').lean();
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });
    res.json({ success: true, project });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to update members' });
  }
};

// ── Add task to project ───────────────────────────────────────────────────────
export const addTaskToProject = async (req, res) => {
  try {
    const { taskId } = req.body;
    if (!taskId) return res.status(400).json({ success: false, message: 'taskId required' });

    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    if (!project.tasks.map(String).includes(String(taskId))) {
      project.tasks.push(taskId);
      await project.save();
    }

    const populated = await Project.findById(project._id)
      .populate('tasks', 'title completed priority dueDate owner checklist')
      .lean();

    res.json({ success: true, project: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to add task' });
  }
};

// ── Remove task from project ──────────────────────────────────────────────────
export const removeTaskFromProject = async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ success: false, message: 'Project not found' });

    project.tasks = project.tasks.filter(t => String(t) !== String(req.params.taskId));
    await project.save();

    res.json({ success: true, message: 'Task removed from project' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to remove task' });
  }
};
