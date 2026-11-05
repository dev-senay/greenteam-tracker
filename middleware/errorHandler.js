export function errorHandler(err, req, res, next) {
    let status = err.statusCode || 500;
    if (err.name === 'MulterError') status = 400;
    if (status === 500) console.error(err);
    res.status(status).json({
        message: status === 500 ? 'Something went wrong' : err.message
    });
}