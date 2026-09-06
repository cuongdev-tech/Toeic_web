"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const transcript_controller_1 = require("../controllers/transcript.controller");
const auth_middleware_1 = require("../middlewares/auth.middleware");
const router = (0, express_1.Router)();
router.patch('/admin/question-groups/:groupId/transcript', auth_middleware_1.verifyToken, auth_middleware_1.isAdmin, transcript_controller_1.TranscriptController.updateTranscript);
// 2. API Lấy chi tiết Transcript
router.get('/question-groups/:groupId/transcript', auth_middleware_1.verifyToken, transcript_controller_1.TranscriptController.getTranscript);
exports.default = router;
