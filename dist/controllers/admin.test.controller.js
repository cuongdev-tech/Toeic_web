"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminTestController = void 0;
const prisma_1 = require("../config/prisma");
exports.AdminTestController = {
    // 1. Lấy chi tiết đề thi và danh sách các nhóm câu hỏi
    getTestDetails: async (req, res) => {
        try {
            const testId = String(req.params.testId);
            const test = await prisma_1.prisma.test.findUnique({
                where: { id: testId },
            });
            if (!test) {
                res.status(404).json({ success: false, message: 'Không tìm thấy đề thi.' });
                return;
            }
            const groups = await prisma_1.prisma.questionGroup.findMany({
                where: { testId: testId },
                include: {
                    questions: true
                },
                orderBy: { createdAt: 'asc' }
            });
            res.status(200).json({ success: true, data: { test, groups } });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    // 2. Tạo mới Cụm câu hỏi (Question Group - Part 3, 4, 6, 7)
    createQuestionGroup: async (req, res) => {
        try {
            const { testId, partNumber, passageText, audioUrl, transcript } = req.body;
            if (!testId || !partNumber) {
                res.status(400).json({ success: false, message: 'Thiếu thông tin testId hoặc partNumber.' });
                return;
            }
            const newGroup = await prisma_1.prisma.questionGroup.create({
                data: {
                    test: { connect: { id: String(testId) } },
                    partNumber: Number(partNumber),
                    passageText: passageText || null,
                    audioUrl: audioUrl || null,
                    transcript: transcript || [] // Lưu mảng JSON transcript đồng bộ âm thanh
                }
            });
            res.status(201).json({ success: true, message: 'Tạo cụm câu hỏi thành công.', data: { group: newGroup } });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    // 3. Thêm câu hỏi chi tiết vào cụm câu hỏi
    createQuestion: async (req, res) => {
        try {
            const { groupId, partNumber, questionText, options, correctAnswer, explanation, difficulty, tags } = req.body;
            if (!groupId || !questionText || !options || !correctAnswer) {
                res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ thông tin câu hỏi.' });
                return;
            }
            const group = await prisma_1.prisma.questionGroup.findUnique({
                where: { id: String(groupId) },
                select: { id: true, testId: true },
            });
            if (!group) {
                res.status(404).json({ success: false, message: 'Không tìm thấy nhóm câu hỏi.' });
                return;
            }
            const newQuestion = await prisma_1.prisma.question.create({
                data: {
                    groupId: String(groupId),
                    partNumber: Number(partNumber),
                    questionText,
                    options, // Prisma tự động lưu mảng chuỗi options dưới dạng JSON
                    correctAnswer,
                    explanation: explanation || null,
                    difficulty: difficulty || 'MEDIUM',
                    tags: Array.isArray(tags) ? tags : [],
                }
            });
            const lastQuestion = await prisma_1.prisma.testQuestion.findFirst({
                where: { testId: group.testId || '' },
                orderBy: { orderIndex: 'desc' },
                select: { orderIndex: true },
            });
            if (group.testId) {
                await prisma_1.prisma.testQuestion.create({
                    data: { testId: group.testId, questionId: newQuestion.id, orderIndex: (lastQuestion?.orderIndex || 0) + 1 },
                });
            }
            res.status(201).json({ success: true, message: 'Thêm câu hỏi thành công.', data: { question: newQuestion } });
        }
        catch (error) {
            res.status(500).json({ success: false, message: error.message });
        }
    },
    reorderQuestions: async (req, res) => {
        try {
            const testId = String(req.params.testId);
            const questionIds = req.body.questionIds;
            if (!Array.isArray(questionIds) || questionIds.length === 0) {
                res.status(400).json({ success: false, message: 'questionIds phải là mảng không rỗng.' });
                return;
            }
            const links = await prisma_1.prisma.testQuestion.findMany({ where: { testId }, select: { questionId: true } });
            const allowedIds = new Set(links.map((link) => link.questionId));
            if (questionIds.some((id) => typeof id !== 'string' || !allowedIds.has(id)) || questionIds.length !== allowedIds.size || new Set(questionIds).size !== questionIds.length) {
                res.status(400).json({ success: false, message: 'Danh sách câu hỏi không thuộc đề hoặc bị trùng.' });
                return;
            }
            await prisma_1.prisma.$transaction(questionIds.map((questionId, index) => prisma_1.prisma.testQuestion.update({
                where: { testId_questionId: { testId, questionId } },
                data: { orderIndex: index + 1 },
            })));
            res.json({ success: true, message: 'Đã cập nhật thứ tự câu hỏi.' });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Không thể sắp xếp câu hỏi.' });
        }
    }
};
