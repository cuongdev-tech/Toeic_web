"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const question_controller_1 = require("../controllers/question.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.verifyToken, auth_middleware_1.isAdmin);
// Lưu ý: Endpoint /random phải đặt TRƯỚC /:id để Express Router không nhầm lẫn chữ 'random' là 1 cái ID
router.get('/random', question_controller_1.QuestionController.getRandomQuestions);
router.post('/', question_controller_1.QuestionController.createQuestion);
router.get('/', question_controller_1.QuestionController.getAllQuestions);
router.put('/:id', question_controller_1.QuestionController.updateQuestion);
router.delete('/:id', question_controller_1.QuestionController.deleteQuestion);
exports.default = router;
