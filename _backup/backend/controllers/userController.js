// controllers/userController.js — UPDATED: accepts 'executive' role
import User from '../models/userModel.js';
import validator from 'validator';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_here';
const TOKEN_EXPIRES = '24h';
const createToken = (userId) => jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: TOKEN_EXPIRES });

// UPDATED: valid roles now include 'executive'
const VALID_ROLES = ['standard', 'team-lead', 'executive', 'admin'];

// Register user - DISABLED: Admin creates accounts manually
export async function registerUser(req, res) {
    return res.status(403).json({
        success: false,
        message: 'Self-registration is currently disabled. Please contact your Administrator to have your account created.',
    });
}

// Login user
export async function loginUser(req, res) {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ success: false, message: 'Email and password required' });
    }
    try {
        const user = await User.findOne({ email });
        if (!user || !user.isActive) {
            return res.status(401).json({ success: false, message: 'Invalid credentials or inactive account' });
        }
        const matched = await bcrypt.compare(password, user.password);
        if (!matched) {
            return res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
        const now = new Date();
        user.lastLogin = now;
        user.lastActive = now;
        user.activityLogs.push({ action: 'login', details: `User logged in from IP ${req.ip}` });
        await user.save();

        const token = createToken(user._id);
        res.json({
            success: true,
            token,
            user: {
                id: user._id, firstName: user.firstName, lastName: user.lastName,
                otherName: user.otherName, fullName: user.fullName,
                position: user.position, unitSector: user.unitSector,
                email: user.email, role: user.role
            },
        });
    } catch (err) {
        console.error('Error logging in:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}

// Get current user
export async function getCurrentUser(req, res) {
    try {
        const user = await User.findById(req.user.id).select('firstName lastName otherName position unitSector email role preferences pushToken fullName');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }
        res.json({ success: true, user });
    } catch (err) {
        console.error('Error fetching user:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}

// Update user profile
export async function updateProfile(req, res) {
    const { firstName, lastName, otherName, position, unitSector, email, role } = req.body;
    if (!firstName || !lastName || !email || !validator.isEmail(email)) {
        return res.status(400).json({ success: false, message: 'Valid first name, last name and email required' });
    }
    if (role && !VALID_ROLES.includes(role)) {
        return res.status(400).json({ success: false, message: 'Invalid role' });
    }
    try {
        const exists = await User.findOne({ email, _id: { $ne: req.user.id } });
        if (exists) {
            return res.status(409).json({ success: false, message: 'Email already in use by another account' });
        }
        const updateData = { firstName, lastName, otherName, position, unitSector, email };
        if (role) updateData.role = role;

        const user = await User.findByIdAndUpdate(
            req.user.id, updateData,
            { new: true, runValidators: true }
        ).select('firstName lastName otherName position unitSector email role fullName');

        if (role && role !== req.user.role) {
            user.activityLogs.push({ action: 'role_change', details: `Role changed to ${role} from IP ${req.ip}` });
            await user.save();
        }
        res.json({ success: true, user });
    } catch (err) {
        console.error('Error updating profile:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}

// Update password
export async function updatePassword(req, res) {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword || newPassword.length < 8) {
        return res.status(400).json({ success: false, message: 'Current password and new password (min 8 characters) are required' });
    }
    try {
        const user = await User.findById(req.user.id).select('password');
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        const match = await bcrypt.compare(currentPassword, user.password);
        if (!match) return res.status(401).json({ success: false, message: 'Current password is incorrect' });
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await User.findByIdAndUpdate(req.user.id, {
            $set: { password: hashedPassword },
            $push: { activityLogs: { action: 'password_change', details: `Password changed from IP ${req.ip}` } }
        });
        res.json({ success: true, message: 'Password changed successfully' });
    } catch (err) {
        console.error('Error updating password:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}

// Update push token
export async function updatePushToken(req, res) {
    const { pushToken } = req.body;
    if (!pushToken) return res.status(400).json({ success: false, message: 'Push token is required' });
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        user.pushToken = pushToken;
        user.activityLogs.push({ action: 'push_token_update', details: `Push token updated from IP ${req.ip}` });
        await user.save();
        res.json({ success: true, message: 'Push token updated' });
    } catch (err) {
        console.error('Error updating push token:', err.message);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}
