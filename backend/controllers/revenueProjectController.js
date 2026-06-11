import mongoose from 'mongoose';
import RevenueProject from '../models/revenueProjectModel.js';
import Task from '../models/taskModel.js';

const USER_FIELDS = 'firstName lastName fullName email avatar position role unitSector';
const toId = (value) => String(value?._id || value || '').trim();

const sortPhases = (phases = []) => (
  [...phases].sort((left, right) => {
    const leftOrder = Number.isFinite(Number(left?.order)) ? Number(left.order) : 0;
    const rightOrder = Number.isFinite(Number(right?.order)) ? Number(right.order) : 0;
    if (leftOrder !== rightOrder) return leftOrder - rightOrder;
    return String(left?.title || '').localeCompare(String(right?.title || ''));
  })
);

const buildPhaseMap = (phases = []) => {
  const map = new Map();
  sortPhases(phases).forEach((phase, index) => {
    map.set(toId(phase), {
      ...phase,
      order: Number.isFinite(Number(phase?.order)) ? Number(phase.order) : index,
    });
  });
  return map;
};

const decorateProject = (project, viewerId = '') => {
  const phases = sortPhases(project?.phases || []);
  const phaseMap = buildPhaseMap(phases);
  const tasks = [...(project?.tasks || [])]
    .map((task) => {
      const phase = phaseMap.get(toId(task?.revenueProject?.phaseId));
      return {
        ...task,
        revenueProject: {
          ...(task?.revenueProject || {}),
          phaseTitle: task?.revenueProject?.phaseTitle || phase?.title || '',
          phaseOrder: Number.isFinite(Number(task?.revenueProject?.phaseOrder))
            ? Number(task.revenueProject.phaseOrder)
            : Number(phase?.order || 0),
          phaseCompletionUnlocked: task?.revenueProject?.phaseCompletionUnlocked ?? Boolean(phase?.completed),
        },
      };
    })
    .sort((left, right) => {
      const leftPhaseOrder = Number.isFinite(Number(left?.revenueProject?.phaseOrder)) ? Number(left.revenueProject.phaseOrder) : 0;
      const rightPhaseOrder = Number.isFinite(Number(right?.revenueProject?.phaseOrder)) ? Number(right.revenueProject.phaseOrder) : 0;
      if (leftPhaseOrder !== rightPhaseOrder) return leftPhaseOrder - rightPhaseOrder;
      return new Date(left?.createdAt || 0).getTime() - new Date(right?.createdAt || 0).getTime();
    });

  const completedPhases = phases.filter((phase) => phase?.completed).length;
  const completedTasks = tasks.filter((task) => task?.completed).length;
  const myTasks = viewerId ? tasks.filter((task) => toId(task?.owner) === viewerId) : [];
  const releasedTasks = tasks.filter((task) => task?.revenueProject?.phaseCompletionUnlocked).length;

  return {
    ...project,
    phases,
    tasks,
    metrics: {
      totalPhases: phases.length,
      completedPhases,
      phaseProgress: phases.length ? Math.round((completedPhases / phases.length) * 100) : 0,
      totalTasks: tasks.length,
      completedTasks,
      taskProgress: tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0,
      allPhasesCompleted: phases.length > 0 && completedPhases === phases.length,
      releasedTasks,
      members: Array.isArray(project?.members) ? project.members.length : 0,
      myTasks: myTasks.length,
      myOpenTasks: myTasks.filter((task) => !task?.completed).length,
    },
  };
};

const populateProject = (query) => (
  query
    .populate('createdBy', USER_FIELDS)
    .populate('members', USER_FIELDS)
    .populate({
      path: 'tasks',
      select: 'title description priority dueDate completed checklist submissionStatus submittedAt reviewedAt reviewedBy owner createdByAdmin assignedBy revenueProject createdAt',
      populate: [
        { path: 'owner', select: USER_FIELDS },
        { path: 'assignedBy', select: USER_FIELDS },
        { path: 'reviewedBy', select: USER_FIELDS },
      ],
    })
    .populate('phases.completedBy', USER_FIELDS)
);

const buildUserProjectQuery = async (userId, { search = '', status = '' } = {}) => {
  const linkedTaskIds = await Task.find({
    owner: userId,
    'revenueProject.projectId': { $ne: null },
  }).select('_id').lean();

  const query = {
    $or: [
      { members: userId },
      { tasks: { $in: linkedTaskIds.map((task) => task._id) } },
    ],
  };

  if (search) {
    query.$and = [
      ...(query.$and || []),
      {
        $or: [
          { name: { $regex: search, $options: 'i' } },
          { description: { $regex: search, $options: 'i' } },
          { clientName: { $regex: search, $options: 'i' } },
          { assetName: { $regex: search, $options: 'i' } },
          { location: { $regex: search, $options: 'i' } },
        ],
      },
    ];
  }

  if (status) {
    query.status = status;
  }

  return query;
};

export const getRevenueProjects = async (req, res) => {
  try {
    const query = await buildUserProjectQuery(req.user._id, req.query);
    const projects = await populateProject(RevenueProject.find(query).sort({ updatedAt: -1, createdAt: -1 })).lean();
    res.json({
      success: true,
      projects: projects.map((project) => decorateProject(project, toId(req.user._id))),
    });
  } catch (error) {
    console.error('getRevenueProjects error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch revenue projects' });
  }
};

export const getRevenueProjectById = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid revenue project ID' });
    }

    const query = await buildUserProjectQuery(req.user._id);
    const project = await populateProject(RevenueProject.findOne({ _id: req.params.id, ...query })).lean();
    if (!project) {
      return res.status(404).json({ success: false, message: 'Revenue project not found' });
    }

    res.json({ success: true, project: decorateProject(project, toId(req.user._id)) });
  } catch (error) {
    console.error('getRevenueProjectById error:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch revenue project' });
  }
};



