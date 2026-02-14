
export const errorHandler = (err, req, res, next) => {
    console.error(`[GlobalErrorHandler] ${req.method} ${req.url}`, err);

    const statusCode = err.status || err.statusCode || 500;
    const message = err.message || 'Internal Server Error';
    const code = err.code || 'INTERNAL_SERVER_ERROR';
    const details = err.details || err.response?.data || null;

    res.status(statusCode).json({
        success: false,
        code,
        message,
        details
    });
};
