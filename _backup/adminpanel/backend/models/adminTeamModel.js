import mongoose from 'mongoose';

// ── Admin Team Model ──────────────────────────────────────────────────────────
// Stores the "My Team" selection for each admin user.
// Team Leads and Executives configure which users belong to their team.
// Super Admin always sees all users, so they don't need this.
// ──────────────────────────────────────────────────────────────────────────────
const adminTeamSchema = new mongoose.Schema(
  {
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
      required: true,
      unique: true,
      index: true,
    },
    members: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user',
    }],
    name: {
      type: String,
      trim: true,
      default: 'My Team',
    },
  },
  { timestamps: true }
);

const AdminTeam = mongoose.models.AdminTeam || mongoose.model('AdminTeam', adminTeamSchema);
export default AdminTeam;
