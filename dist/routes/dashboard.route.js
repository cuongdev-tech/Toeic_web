"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const dashboard_controller_1 = require("../controllers/dashboard.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.get('/student', auth_middleware_1.verifyToken, dashboard_controller_1.DashboardController.getStudentDashboard);
router.get('/', auth_middleware_1.verifyToken, auth_middleware_1.isAdmin, dashboard_controller_1.DashboardController.getDashboardStats);
exports.default = router;
