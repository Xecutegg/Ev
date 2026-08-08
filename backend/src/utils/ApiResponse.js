class ApiResponse {
    constructor(statusCode, message, data = null) {
        this.success = statusCode >= 200 && statusCode < 300;
        this.statusCode = statusCode;
        this.message = message;
        this.data = data;
    }

    static success(res, message, data = null, statusCode = 200) {
        return res.status(statusCode).json(new ApiResponse(statusCode, message, data));
    }

    static created(res, message, data = null) {
        return res.status(201).json(new ApiResponse(201, message, data));
    }

    static error(res, message, statusCode = 500, errors = null) {
        return res.status(statusCode).json({
            success: false,
            statusCode,
            message,
            errors,
        });
    }
}

export default ApiResponse;
