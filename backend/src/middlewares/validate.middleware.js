import ApiError from '../utils/ApiError.js';

/**
 * Validate registration request body
 */
const validateRegister = (req, res, next) => {
    const { username, name, email, password, confirmPassword } = req.body;
    const errors = [];

    // Username
    if (!username || typeof username !== 'string' || username.trim().length === 0) {
        errors.push({ field: 'username', message: 'Username is required' });
    } else if (username.trim().length < 3) {
        errors.push({ field: 'username', message: 'Username must be at least 3 characters' });
    } else if (username.trim().length > 30) {
        errors.push({ field: 'username', message: 'Username must be at most 30 characters' });
    } else if (!/^[a-zA-Z0-9_]+$/.test(username.trim())) {
        errors.push({ field: 'username', message: 'Username can only contain letters, numbers, and underscores' });
    }

    // Name
    if (!name || typeof name !== 'string' || name.trim().length === 0) {
        errors.push({ field: 'name', message: 'Name is required' });
    } else if (name.trim().length < 2) {
        errors.push({ field: 'name', message: 'Name must be at least 2 characters' });
    } else if (name.trim().length > 50) {
        errors.push({ field: 'name', message: 'Name must be at most 50 characters' });
    }

    // Email
    if (!email || typeof email !== 'string' || email.trim().length === 0) {
        errors.push({ field: 'email', message: 'Email is required' });
    } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
        errors.push({ field: 'email', message: 'Please provide a valid email address' });
    }

    // Password
    if (!password || typeof password !== 'string') {
        errors.push({ field: 'password', message: 'Password is required' });
    } else {
        if (password.length < 8) {
            errors.push({ field: 'password', message: 'Password must be at least 8 characters' });
        }
        if (!/[A-Z]/.test(password)) {
            errors.push({ field: 'password', message: 'Password must contain at least one uppercase letter' });
        }
        if (!/[a-z]/.test(password)) {
            errors.push({ field: 'password', message: 'Password must contain at least one lowercase letter' });
        }
        if (!/[0-9]/.test(password)) {
            errors.push({ field: 'password', message: 'Password must contain at least one number' });
        }
    }

    // Confirm Password
    if (!confirmPassword || typeof confirmPassword !== 'string') {
        errors.push({ field: 'confirmPassword', message: 'Confirm password is required' });
    } else if (password !== confirmPassword) {
        errors.push({ field: 'confirmPassword', message: 'Passwords do not match' });
    }

    if (errors.length > 0) {
        throw ApiError.badRequest('Validation failed', errors);
    }

    next();
};

/**
 * Validate login request body
 */
const validateLogin = (req, res, next) => {
    const { email, password } = req.body;
    const errors = [];

    if (!email || typeof email !== 'string' || email.trim().length === 0) {
        errors.push({ field: 'email', message: 'Email is required' });
    } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
        errors.push({ field: 'email', message: 'Please provide a valid email address' });
    }

    if (!password || typeof password !== 'string') {
        errors.push({ field: 'password', message: 'Password is required' });
    }

    if (errors.length > 0) {
        throw ApiError.badRequest('Validation failed', errors);
    }

    next();
};

/**
 * Validate OTP verification request body
 */
const validateOtp = (req, res, next) => {
    const { email, otp } = req.body;
    const errors = [];

    if (!email || typeof email !== 'string' || email.trim().length === 0) {
        errors.push({ field: 'email', message: 'Email is required' });
    }

    if (!otp || typeof otp !== 'string' || otp.trim().length === 0) {
        errors.push({ field: 'otp', message: 'OTP is required' });
    } else if (!/^\d{6}$/.test(otp.trim())) {
        errors.push({ field: 'otp', message: 'OTP must be a 6-digit number' });
    }

    if (errors.length > 0) {
        throw ApiError.badRequest('Validation failed', errors);
    }

    next();
};

/**
 * Validate resend OTP request body
 */
const validateResendOtp = (req, res, next) => {
    const { email } = req.body;
    const errors = [];

    if (!email || typeof email !== 'string' || email.trim().length === 0) {
        errors.push({ field: 'email', message: 'Email is required' });
    } else if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
        errors.push({ field: 'email', message: 'Please provide a valid email address' });
    }

    if (errors.length > 0) {
        throw ApiError.badRequest('Validation failed', errors);
    }

    next();
};

export { validateRegister, validateLogin, validateOtp, validateResendOtp };
