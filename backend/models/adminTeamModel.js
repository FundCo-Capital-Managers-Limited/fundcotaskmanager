import mongoose from 'mongoose';

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
