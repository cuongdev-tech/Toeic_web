import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('⏳ Đang bơm bộ full mock 200 câu Part 1-7 (Seeding)...');

  // 1. Dọn dẹp dữ liệu cũ
  await prisma.attemptAnswer.deleteMany({});
  await prisma.testAttempt.deleteMany({});
  await prisma.testQuestion.deleteMany({});
  await prisma.question.deleteMany({});
  await prisma.questionGroup.deleteMany({});
  await prisma.test.deleteMany({});

  // 2. Danh sách 12 đề thi
  const testsData = [
    { title: "TOEIC Full Mock - Practice 1", description: "Bộ đề luyện tập tự biên soạn, đủ 200 câu theo cấu trúc TOEIC.", duration: 120, status: 'PUBLISHED' as const },
    { title: "TOEIC Full Mock - Practice 2", description: "Bộ đề luyện tập tự biên soạn, đủ 200 câu theo cấu trúc TOEIC.", duration: 120, status: 'PUBLISHED' as const },
    { title: "TOEIC Full Mock - Practice 3", description: "Bộ đề luyện tập tự biên soạn, đủ 200 câu theo cấu trúc TOEIC.", duration: 120, status: 'PUBLISHED' as const },
    { title: "Hacker TOEIC 3 - Đề số 1", description: "Đề thi thử từ sách Hacker TOEIC 3. Mức độ khó cao hơn đề thi thật khoảng 10-15%.", duration: 120, status: 'PUBLISHED' as const },
    { title: "Hacker TOEIC 3 - Đề số 2", description: "Đề thi thử từ sách Hacker TOEIC 3. Thử thách bản thân với các bẫy ngữ pháp tinh vi.", duration: 120, status: 'PUBLISHED' as const },
    { title: "Economy TOEIC Vol 5 - Test 1", description: "Bộ đề kinh điển Economy Vol 5. Rất tốt để luyện tập tốc độ đọc hiểu.", duration: 120, status: 'PUBLISHED' as const },
    { title: "Mini Test: Listening Part 3 & 4", description: "Bài kiểm tra ngắn 45 phút tập trung kỹ năng Nghe hiểu đoạn hội thoại.", duration: 45, status: 'PUBLISHED' as const },
    { title: "Mini Test: Reading Part 5 & 6", description: "Luyện tập ngữ pháp và điền từ vào đoạn văn trong thời gian áp lực.", duration: 30, status: 'PUBLISHED' as const },
    { title: "Speed Test: Reading Part 7", description: "Bài test 54 câu hỏi Part 7. Rèn luyện kỹ năng Skimming & Scanning.", duration: 55, status: 'PUBLISHED' as const },
    { title: "TOEIC Mock Test 2026 - Đề số 1", description: "Đề thi thử sát với cấu trúc đề thi thật năm 2026. Phù hợp cho mục tiêu 600+.", duration: 120, status: 'PUBLISHED' as const },
    { title: "TOEIC Mock Test 2026 - Đề số 2", description: "Đề thi thử có độ khó cao, tập trung vào Part 7. Dành cho học viên nhắm mục tiêu 800+.", duration: 120, status: 'PUBLISHED' as const },
    { title: "Mini Test - Listening Part 1 & 2", description: "Bài kiểm tra ngắn 30 phút tập trung kỹ năng Nghe.", duration: 30, status: 'PUBLISHED' as const }
  ];

  const createdTests = [];
  for (const testData of testsData) {
    const test = await prisma.test.create({ data: testData });
    createdTests.push(test);
  }

  // 3. Tạo nhóm câu hỏi cho Part 5
  const groupReading = await prisma.questionGroup.create({
    data: {
      partNumber: 5,
      passageText: 'Directions: A word or phrase is missing in each of the sentences below. Four answer choices are given below each sentence. Select the best answer to complete the sentence.',
    },
  });

  // 4. Sinh tự động 30 câu hỏi
  const generatedQuestions = [];
  const correctAnswersPool = ['A', 'B', 'C', 'D'];

  for (let i = 1; i <= 30; i++) {
    // Quay vòng đáp án đúng A, B, C, D cho phong phú
    const correct = correctAnswersPool[(i - 1) % 4];
    
    const q = await prisma.question.create({
      data: {
        questionText: `${i}. This is a simulated TOEIC question number ${i} designed to test your grammar and vocabulary skills under pressure.`,
        options: JSON.stringify([
          'A. representative', 
          'B. representation', 
          'C. represent', 
          'D. representing'
        ]),
        correctAnswer: correct,
        partNumber: 5,
        groupId: groupReading.id,
      }
    });
    generatedQuestions.push(q);
  }

  // Original practice data covering the official part distribution, not ETS content.
  const allPartQuestions = [...generatedQuestions];
  const partCounts: Record<number, number> = { 1: 6, 2: 25, 3: 39, 4: 30, 6: 16, 7: 54 };
  for (const [partKey, count] of Object.entries(partCounts)) {
    const partNumber = Number(partKey);
    const group = await prisma.questionGroup.create({
      data: {
        partNumber,
        audioUrl: [3, 4].includes(partNumber) ? 'https://cdn.example.com/toeic-demo.mp3' : null,
        imageUrl: partNumber === 1 ? 'https://cdn.example.com/toeic-demo.jpg' : null,
        passageText: [6, 7].includes(partNumber) ? `Demo passage for TOEIC Part ${partNumber}.` : null,
      },
    });
    for (let index = 1; index <= count; index++) {
      const question = await prisma.question.create({
        data: {
          groupId: group.id,
          partNumber,
          questionText: `Original TOEIC practice Part ${partNumber} question ${index}`,
          options: JSON.stringify(['A. Option one', 'B. Option two', 'C. Option three', 'D. Option four']),
          correctAnswer: correctAnswersPool[(index - 1) % 4],
          explanation: `Demo explanation for Part ${partNumber}, question ${index}.`,
          tags: partNumber === 5 ? ['Grammar'] : ['Vocabulary'],
        },
      });
      allPartQuestions.push(question);
    }
  }

  // 5. Gắn đủ 30 câu hỏi này vào TẤT CẢ 12 đề thi
  for (const test of createdTests) {
    for (let i = 0; i < allPartQuestions.length; i++) {
      await prisma.testQuestion.create({
        data: {
          testId: test.id,
          questionId: allPartQuestions[i].id,
          orderIndex: i + 1 
        }
      });
    }
  }

  console.log(`✅ Đã tạo thành công ${allPartQuestions.length} câu hỏi và gắn vào ${createdTests.length} đề thi.`);
  console.log('🎉 BƠM FULL MOCK 200 CÂU THÀNH CÔNG!');
}

main()
  .catch((e) => {
    console.error('❌ Lỗi khi seed data:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });