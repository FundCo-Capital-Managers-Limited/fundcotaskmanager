import AdminTeam from '../models/adminTeamModel.js';

// ── Team filter middleware ─────────────────────────────────────────────────────
// Attaches req.teamMemberIds — the array of user IDs this admin can see.
// Super Admins see everything (teamMemberIds = null means "no filter").
// Team Leads and Executives see only their configured team.
// ──────────────────────────────────────────────────────────────────────────────
export const teamFilter = async (req, res, next) => {
  try {
    // Super Admin sees everything
    if (req.user.role === 'admin') {
      req.teamMemberIds = null; // null = no filter, show all
      return next();
    }

    // For team-lead and executive, find their configured team
    const team = await AdminTeam.findOne({ admin: req.user._id });
    if (!team || !team.members.length) {
      // No team configured — they can only see their own data
      req.teamMemberIds = [req.user._id];
    } else {
      // Include admin themselves plus their team members
      const memberIds = team.members.map(m => m.toString());
      if (!memberIds.includes(req.user._id.toString())) {
        memberIds.push(req.user._id.toString());
      }
      req.teamMemberIds = memberIds;
    }

    next();
  } catch (err) {
    console.error('Team filter error:', err.message);
    next();
  }
};

// Helper: builds a MongoDB query filter based on teamMemberIds
// ownerField is the field name in the collection (e.g., 'owner', 'user')
export const buildTeamQuery = (teamMemberIds, ownerField = 'owner') => {
  if (teamMemberIds === null) return {}; // Super Admin — no filter
  return { [ownerField]: { $in: teamMemberIds } };
};
