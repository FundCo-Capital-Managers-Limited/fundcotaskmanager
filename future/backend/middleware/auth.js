import User from '../models/userModel.js';
import { verifyPlatformToken } from '../config/security.js';

export default async function authMiddleware(req, res, next) {
    // GRAB THE BEARER TOKEN FROM AUTHORIZATION HEADER
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401)
            .json({ success: false, message: "Not Authorized, token missing" });
    }

    const token = authHeader.split(' ')[1];

    // VERIFY AND ATTACH USER OBJECT

    try {
        const { payload } = verifyPlatformToken(token);
        const user = await User.findById(payload.id).select('-password');

        if (!user){
            return res.status(401).json({success:false, message: "User not found"});
        }
        if (!user.isActive) {
            return res.status(403).json({ success: false, message: 'Account is deactivated' });
        }

        req.user = user;
        next();

    }
    catch (err){
        console.log("JWT verification failed", err);
        return res.status(401).json({success: false, message: "Token invalid or expired"});
    }

}



