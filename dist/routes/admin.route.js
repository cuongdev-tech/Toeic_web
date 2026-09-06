"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_controller_1 = require("../controllers/admin.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.verifyToken, auth_middleware_1.isAdmin);
router.get('/dashboard/stats', admin_controller_1.getAdminStats); // Thêm dòng này để nhận request từ Admin Dashboard
router.get('/tests', admin_controller_1.getAdminTests);
router.patch('/tests/:testId/status', admin_controller_1.updateTestStatus);
router.get('/users', admin_controller_1.getUsers);
router.patch('/users/:userId/status', admin_controller_1.updateUserStatus);
router.get('/audit-logs', admin_controller_1.getAuditLogs);
router.post('/tests', admin_controller_1.createTest);
router.post('/tests/:testId/questions', admin_controller_1.addQuestionToTest);
exports.default = router;
