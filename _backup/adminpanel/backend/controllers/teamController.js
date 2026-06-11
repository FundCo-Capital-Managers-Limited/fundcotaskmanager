import AdminTeam from '../models/adminTeamModel.js';
import User from '../models/userModel.js';

const getManageableRoles = (managerRole) => {
  if (managerRole === 'admin') return null;
  if (managerRole === 'executive') return ['standard', 'team-lead'];
  if (managerRole === 'team-lead') return ['standard', 'team-lead'];
  return ['standard'];
};

const assertManageableMembers = async (req, memberIds = []) => {
  if (req.user?.role === 'admin' || !memberIds.length) return;

  const uniqueMemberIds = [...new Set(memberIds.map(String))];
  const manageableRoles = getManageableRoles(req.user?.role) || [];
  const members = await User.find({ _id: { $in: uniqueMemberIds } })
    .select('role')
    .lean();

  if (members.length !== uniqueMemberIds.length) {
    const error = new Error('One or more selected users could not be found');
    error.statusCode = 404;
    throw error;
  }

  const invalidMember = members.find((member) => !manageableRoles.includes(member.role));
  if (invalidMember) {
    const error = new Error('You can only manage standard users and team leads');
    error.statusCode = 403;
    throw error;
  }
};

// ── Get my team ───────────────────────────────────────────────────────────────
export const getMyTeam = async (req, res) => {
  try {
    let team = await AdminTeam.findOne({ admin: req.user._id })
      .populate('members', 'firstName lastName otherName email role position unitSector isActive avatar lastActive points level')
      .lean();

    if (!team) {
      team = { admin: req.user._id, members: [], name: 'My Team' };
    }

    res.json({ success: true, team });
  } catch (err) {
    console.error('getMyTeam error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to fetch team' });
  }
};

// ── Update my team members ────────────────────────────────────────────────────
export const updateMyTeam = async (req, res) => {
  const { members, name } = req.body;

  if (!Array.isArray(members)) {
    return res.status(400).json({ success: false, message: 'Members must be an array of user IDs' });
  }

  try {
    await assertManageableMembers(req, members);

    let team = await AdminTeam.findOne({ admin: req.user._id });
    if (!team) {
      team = new AdminTeam({ admin: req.user._id, members: [], name: name || 'My Team' });
    }

    team.members = members;
    if (name) team.name = name;
    await team.save();

    const populated = await AdminTeam.findById(team._id)
      .populate('members', 'firstName lastName otherName email role position unitSector isActive avatar lastActive points level')
      .lean();

    res.json({ success: true, team: populated });
  } catch (err) {
    console.error('updateMyTeam error:', err.message);
    res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Failed to update team' });
  }
};

// ── Add member to team ────────────────────────────────────────────────────────
export const addTeamMember = async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ success: false, message: 'userId required' });

  try {
    await assertManageableMembers(req, [userId]);

    let team = await AdminTeam.findOne({ admin: req.user._id });
    if (!team) team = new AdminTeam({ admin: req.user._id, members: [] });

    if (!team.members.map(m => m.toString()).includes(userId)) {
      team.members.push(userId);
      await team.save();
    }

    const populated = await AdminTeam.findById(team._id)
      .populate('members', 'firstName lastName otherName email role position unitSector isActive avatar lastActive')
      .lean();

    res.json({ success: true, team: populated });
  } catch (err) {
    res.status(err.statusCode || 500).json({ success: false, message: err.message || 'Failed to add member' });
  }
};

// ── Remove member from team ───────────────────────────────────────────────────
export const removeTeamMember = async (req, res) => {
  const { userId } = req.params;
  try {
    const team = await AdminTeam.findOne({ admin: req.user._id });
    if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

    team.members = team.members.filter(m => m.toString() !== userId);
    await team.save();

    const populated = await AdminTeam.findById(team._id)
      .populate('members', 'firstName lastName otherName email role position unitSector isActive avatar lastActive')
      .lean();

    res.json({ success: true, team: populated });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to remove member' });
  }
};

// ── Get all available users to add to team ────────────────────────────────────
export const getAvailableUsers = async (req, res) => {
  try {
    const query = { isActive: true };
    const manageableRoles = getManageableRoles(req.user?.role);
    if (manageableRoles) {
      query.role = { $in: manageableRoles };
    }

    const users = await User.find(query)
      .select('firstName lastName otherName email role position unitSector avatar')
      .sort({ firstName: 1 })
      .lean();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Failed to fetch users' });
  }
};
