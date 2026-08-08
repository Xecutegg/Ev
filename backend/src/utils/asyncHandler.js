/**
 * Wraps async route handlers to catch errors and forward to Express error handler.
 * Eliminates the need for try-catch in every controller.
 */
const asyncHandler = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};

export default asyncHandler;
