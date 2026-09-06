"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const test_controller_1 = require("../controllers/test.controller");
const router = (0, express_1.Router)();
// Áp dụng middleware kiểm tra token cho tất cả các route bên dưới
router.use(auth_middleware_1.verifyToken);
// [GET] /api/v1/tests - Lấy danh sách toàn bộ đề thi
router.get('/', test_controller_1.TestController.getAllTests);
// [GET] /api/v1/tests/:id - Lấy chi tiết một đề thi cụ thể
router.get('/:id', test_controller_1.TestController.getTestById);
exports.default = router;
