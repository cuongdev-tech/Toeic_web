"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const admin_test_controller_1 = require("../controllers/admin.test.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
// Yêu cầu quyền Admin cho toàn bộ các route quản trị
router.use(auth_middleware_1.verifyToken, auth_middleware_1.isAdmin);
router.get('/tests/:testId/details', admin_test_controller_1.AdminTestController.getTestDetails);
router.put('/tests/:testId/questions/order', admin_test_controller_1.AdminTestController.reorderQuestions);
router.post('/question-groups', admin_test_controller_1.AdminTestController.createQuestionGroup);
router.post('/questions', admin_test_controller_1.AdminTestController.createQuestion);
exports.default = router;
