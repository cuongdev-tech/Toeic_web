"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const analytics_controller_1 = require("../controllers/analytics.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.verifyToken);
router.get('/overview', analytics_controller_1.AnalyticsController.getOverview); // Thêm route tổng quan
router.get('/weaknesses', analytics_controller_1.AnalyticsController.getWeaknesses); // Route phân tích điểm yếu hiện tại
exports.default = router;
