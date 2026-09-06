"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const test_attempt_controller_1 = require("../controllers/test-attempt.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware"); // Đổi tên middleware
const router = (0, express_1.Router)();
router.use(auth_middleware_1.verifyToken); // Dùng verifyToken
router.post('/start', test_attempt_controller_1.TestAttemptController.startTest);
router.patch('/:attemptId/sync', test_attempt_controller_1.TestAttemptController.syncAttempt);
router.post('/:attemptId/submit', test_attempt_controller_1.TestAttemptController.submitTest);
router.get('/:attemptId/review', test_attempt_controller_1.TestAttemptController.getAttemptReview);
router.get('/my-history', auth_middleware_1.verifyToken, test_attempt_controller_1.TestAttemptController.getMyHistory);
exports.default = router;
