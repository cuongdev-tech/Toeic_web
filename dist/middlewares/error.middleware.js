"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const errorHandler = (err, req, res, next) => {
    console.error(`[Lỗi Hệ Thống]: ${err.message}`);
    if (process.env.NODE_ENV === 'development') {
        console.error(err.stack);
    }
    const statusCode = err.statusCode || 500;
    const message = process.env.NODE_ENV === 'development'
        ? (err.message || 'Lỗi hệ thống nội bộ!')
        : 'Lỗi hệ thống nội bộ!';
    res.status(statusCode).json({
        status: 'error',
        message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
};
exports.errorHandler = errorHandler;
