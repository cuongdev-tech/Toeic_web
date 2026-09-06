"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TranscriptController = void 0;
const prisma_1 = require("../config/prisma");
exports.TranscriptController = {
    /**
     * PATCH /api/admin/question-groups/:groupId/transcript
     * Cập nhật JSON Transcript cho một nhóm câu hỏi (Ví dụ: đoạn hội thoại Part 3)
     */
    updateTranscript: async (req, res) => {
        try {
            const groupId = req.params.groupId;
            const { transcript } = req.body;
            // 1. Validate đầu vào: Bắt buộc phải là một mảng JSON
            if (!transcript || !Array.isArray(transcript)) {
                return res.status(400).json({
                    success: false,
                    message: 'Dữ liệu transcript không hợp lệ. Vui lòng cung cấp một mảng (Array) các đoạn thoại.'
                });
            }
            // Có thể thêm bước validate sâu hơn ở đây (kiểm tra startTime, endTime, text của từng object)
            // nếu bạn muốn chặt chẽ tuyệt đối, nhưng Array.isArray là đủ để DB không báo lỗi.
            // 2. Kiểm tra Group có tồn tại không
            const group = await prisma_1.prisma.questionGroup.findUnique({
                where: { id: groupId }
            });
            if (!group) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy Question Group.' });
            }
            // 3. Cập nhật vào Database
            const updatedGroup = await prisma_1.prisma.questionGroup.update({
                where: { id: groupId },
                data: {
                    transcript: transcript // Prisma tự động ép kiểu thành JSONB trong Postgres
                },
                select: {
                    id: true,
                    transcript: true
                }
            });
            return res.status(200).json({
                success: true,
                message: 'Cập nhật Transcript đồng bộ âm thanh thành công.',
                data: updatedGroup,
            });
        }
        catch (error) {
            console.error('[Transcript Update Error]:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server khi cập nhật Transcript.',
                error: error.message
            });
        }
    },
    /**
     * GET /api/question-groups/:groupId/transcript
     * Lấy chi tiết đoạn văn, audio và Transcript để Frontend render giao diện Karaoke Sync
     */
    getTranscript: async (req, res) => {
        try {
            const groupId = req.params.groupId;
            const groupData = await prisma_1.prisma.questionGroup.findUnique({
                where: { id: groupId },
                select: {
                    id: true,
                    passageText: true,
                    audioUrl: true,
                    transcript: true,
                }
            });
            if (!groupData) {
                return res.status(404).json({ success: false, message: 'Không tìm thấy Question Group.' });
            }
            // Nếu chưa có transcript, trả về mảng rỗng thay vì null để Frontend không bị lỗi khi dùng .map()
            const responseData = {
                ...groupData,
                transcript: groupData.transcript || [],
            };
            return res.status(200).json({
                success: true,
                message: 'Lấy dữ liệu Transcript thành công.',
                data: responseData,
            });
        }
        catch (error) {
            console.error('[Transcript Get Error]:', error);
            return res.status(500).json({
                success: false,
                message: 'Lỗi server khi lấy dữ liệu Transcript.',
                error: error.message
            });
        }
    }
};
