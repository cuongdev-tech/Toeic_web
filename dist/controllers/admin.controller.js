"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLogs = exports.updateUserStatus = exports.getUsers = exports.updateTestStatus = exports.getAdminTests = exports.getAdminStats = exports.addQuestionToTest = exports.createTest = void 0;
const prisma_1 = require("../config/prisma");
const client_1 = require("@prisma/client");
const createTest = async (req, res) => {
    try {
        const { title, description, duration } = req.body;
        if (!title) {
            return res.status(400).json({ success: false, message: 'Tiêu đề đề thi là bắt buộc' });
        }
        const test = await prisma_1.prisma.test.create({
            data: {
                title,
                description: description || '',
                duration: Number(duration) || 120,
            }
        });
        return res.status(201).json({
            success: true,
            message: 'Tạo đề thi thành công',
            data: { test }
        });
    }
    catch (error) {
        console.error('Lỗi tạo đề thi:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.createTest = createTest;
const addQuestionToTest = async (req, res) => {
    try {
        const testId = String(req.params.testId);
        const { groupId, partNumber, questionText, options, correctAnswer, explanation, difficulty, tags } = req.body;
        const test = await prisma_1.prisma.test.findUnique({ where: { id: testId } });
        if (!test) {
            return res.status(404).json({ success: false, message: 'Không tìm thấy đề thi' });
        }
        if (!questionText || !correctAnswer || !Array.isArray(options)) {
            return res.status(400).json({ success: false, message: 'Thiếu nội dung, đáp án hoặc lựa chọn câu hỏi' });
        }
        if (groupId) {
            const group = await prisma_1.prisma.questionGroup.findFirst({ where: { id: String(groupId), testId } });
            if (!group)
                return res.status(400).json({ success: false, message: 'Question Group không thuộc đề thi này' });
        }
        const question = await prisma_1.prisma.$transaction(async (tx) => {
            const createdQuestion = await tx.question.create({
                data: {
                    groupId: groupId ? String(groupId) : null,
                    partNumber: Number(partNumber) || 1,
                    questionText,
                    options,
                    correctAnswer,
                    explanation: explanation || null,
                    difficulty: difficulty || 'MEDIUM',
                    tags: Array.isArray(tags) ? tags : [],
                }
            });
            const lastQuestion = await tx.testQuestion.findFirst({
                where: { testId },
                orderBy: { orderIndex: 'desc' },
                select: { orderIndex: true },
            });
            await tx.testQuestion.create({
                data: {
                    testId,
                    questionId: createdQuestion.id,
                    orderIndex: (lastQuestion?.orderIndex || 0) + 1,
                },
            });
            return createdQuestion;
        });
        return res.status(201).json({
            success: true,
            message: 'Thêm câu hỏi thành công',
            data: { question }
        });
    }
    catch (error) {
        console.error('Lỗi thêm câu hỏi:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.addQuestionToTest = addQuestionToTest;
const getAdminStats = async (req, res) => {
    try {
        const [totalStudents, activeStudents, totalTests, totalAttempts, submittedAttempts, scoreAggregate, allAttempts, wrongAnswers] = await Promise.all([
            prisma_1.prisma.user.count({
                where: { role: client_1.Role.STUDENT },
            }),
            prisma_1.prisma.user.count({ where: { role: client_1.Role.STUDENT, isActive: true } }),
            prisma_1.prisma.test.count(),
            prisma_1.prisma.testAttempt.count(),
            prisma_1.prisma.testAttempt.count({ where: { status: 'SUBMITTED' } }),
            prisma_1.prisma.testAttempt.aggregate({ where: { status: 'SUBMITTED' }, _avg: { totalScore: true } }),
            prisma_1.prisma.testAttempt.findMany({
                select: {
                    startedAt: true,
                },
            }),
            prisma_1.prisma.attemptAnswer.groupBy({
                by: ['questionId'],
                where: { isCorrect: false },
                _count: { questionId: true },
                orderBy: { _count: { questionId: 'desc' } },
                take: 5,
            }),
        ]);
        const wrongQuestionIds = wrongAnswers.map((item) => item.questionId);
        const wrongQuestions = await prisma_1.prisma.question.findMany({ where: { id: { in: wrongQuestionIds } }, select: { id: true, questionText: true, partNumber: true } });
        const wrongQuestionMap = new Map(wrongQuestions.map((question) => [question.id, question]));
        // Tạo template 7 ngày gần nhất (YYYY-MM-DD)
        const last7DaysTemplate = Array.from({ length: 7 }).map((_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - (6 - i));
            return d.toISOString().split('T')[0];
        });
        // Lọc và đếm số lượt thi trong 7 ngày qua bằng JavaScript thuần (tránh lỗi SQL dialect)
        const chartData = last7DaysTemplate.map((dateStr) => {
            const count = allAttempts.filter((att) => {
                if (!att.startedAt)
                    return false;
                const attDate = new Date(att.startedAt).toISOString().split('T')[0];
                return attDate === dateStr;
            }).length;
            return {
                date: dateStr,
                count,
            };
        });
        return res.status(200).json({
            success: true,
            message: 'Lấy dữ liệu thống kê Admin thành công',
            data: {
                overview: {
                    totalStudents,
                    totalTests,
                    totalAttempts,
                    activeStudents,
                    completionRate: totalAttempts ? Math.round((submittedAttempts / totalAttempts) * 100) : 0,
                    averageScore: Math.round(scoreAggregate._avg.totalScore || 0),
                },
                chartData: {
                    last7DaysAttempts: chartData,
                },
                mostMissedQuestions: wrongAnswers.map((item) => ({ ...wrongQuestionMap.get(item.questionId), wrongCount: item._count.questionId })),
            },
        });
    }
    catch (error) {
        console.error('[Admin Dashboard Error]:', error);
        return res.status(500).json({
            success: false,
            message: 'Lỗi server khi tính toán số liệu thống kê Admin.',
            error: error.message,
        });
    }
};
exports.getAdminStats = getAdminStats;
const getAdminTests = async (_req, res) => {
    try {
        const tests = await prisma_1.prisma.test.findMany({ orderBy: { createdAt: 'desc' } });
        return res.status(200).json({ success: true, data: tests });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
exports.getAdminTests = getAdminTests;
const updateTestStatus = async (req, res) => {
    try {
        const status = req.body.status;
        if (status !== 'DRAFT' && status !== 'PUBLISHED') {
            return res.status(400).json({ success: false, message: 'Trạng thái đề thi không hợp lệ.' });
        }
        const test = await prisma_1.prisma.test.update({ where: { id: String(req.params.testId) }, data: { status } });
        await prisma_1.prisma.auditLog.create({ data: { actorId: req.user.id, action: `TEST_${status}`, entity: 'Test', entityId: test.id, metadata: { status } } });
        return res.json({ success: true, data: { test } });
    }
    catch (error) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy đề thi.' });
    }
};
exports.updateTestStatus = updateTestStatus;
const getUsers = async (_req, res) => {
    try {
        const users = await prisma_1.prisma.user.findMany({
            where: { role: client_1.Role.STUDENT },
            select: { id: true, email: true, fullName: true, isActive: true, createdAt: true, _count: { select: { testAttempts: true } } },
            orderBy: { createdAt: 'desc' },
        });
        return res.json({ success: true, data: { users } });
    }
    catch (error) {
        return res.status(500).json({ success: false, message: 'Không thể tải danh sách học viên.' });
    }
};
exports.getUsers = getUsers;
const updateUserStatus = async (req, res) => {
    try {
        const user = await prisma_1.prisma.user.update({ where: { id: String(req.params.userId) }, data: { isActive: Boolean(req.body.isActive) }, select: { id: true, isActive: true } });
        await prisma_1.prisma.auditLog.create({ data: { actorId: req.user.id, action: user.isActive ? 'USER_UNBLOCKED' : 'USER_BLOCKED', entity: 'User', entityId: user.id, metadata: { isActive: user.isActive } } });
        return res.json({ success: true, data: { user } });
    }
    catch (error) {
        return res.status(404).json({ success: false, message: 'Không tìm thấy học viên.' });
    }
};
exports.updateUserStatus = updateUserStatus;
const getAuditLogs = async (_req, res) => {
    try {
        const logs = await prisma_1.prisma.auditLog.findMany({ include: { actor: { select: { email: true, fullName: true } } }, orderBy: { createdAt: 'desc' }, take: 100 });
        return res.json({ success: true, data: { logs } });
    }
    catch {
        return res.status(500).json({ success: false, message: 'Không thể tải audit log.' });
    }
};
exports.getAuditLogs = getAuditLogs;
