import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import { calculateSectionScores } from '../src/utils/scoring';

const prisma = new PrismaClient();

/* RNG có seed để mỗi lần chạy seed cho ra cùng một bộ lịch sử demo. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type QDef = {
  part: number;
  text: string;
  // Part 2 chỉ có 3 lựa chọn (A/B/C), các Part khác có 4 — nên để mảng thường.
  options: string[];
  correct: string;
  explanation: string;
  tags: string[];
  difficulty?: 'EASY' | 'MEDIUM' | 'HARD';
};

type GroupDef = {
  part: number;
  title: string;
  passage?: string;
  transcript?: { startTime: number; endTime: number; text: string }[];
  questions: QDef[];
};

const fmt = (letter: string, text: string) => `${letter}. ${text}`;

/* Đề 1: Sprint ngắn, đủ mặt Part 2/3/5/6/7 để luyện toàn diện trong 30 phút. */
const TEST1_GROUPS: GroupDef[] = [
  {
    part: 3,
    title: 'Hội thoại ở văn phòng',
    passage: 'M: Hi Lisa, have you finished the sales figures for the quarterly meeting?\nW: Almost. I just need the numbers from the Da Nang branch.\nM: I will email them to you right after lunch.',
    transcript: [
      { startTime: 0.5, endTime: 3.0, text: 'Hi Lisa, have you finished the sales figures for the quarterly meeting?' },
      { startTime: 3.2, endTime: 6.0, text: 'Almost. I just need the numbers from the Da Nang branch.' },
      { startTime: 6.2, endTime: 8.5, text: 'I will email them to you right after lunch.' },
    ],
    questions: [
      {
        part: 3, text: 'What are the speakers discussing?',
        options: [fmt('A', 'Sales figures for a meeting'), fmt('B', 'A lunch menu'), fmt('C', 'A branch opening'), fmt('D', 'Travel plans')],
        correct: 'A', explanation: 'Người đàn ông hỏi về "sales figures for the quarterly meeting".',
        tags: ['Detail'], difficulty: 'EASY',
      },
      {
        part: 3, text: 'What does the woman still need?',
        options: [fmt('A', 'A new laptop'), fmt('B', 'Numbers from the Da Nang branch'), fmt('C', 'A meeting room'), fmt('D', 'Lunch reservations')],
        correct: 'B', explanation: 'Cô ấy nói còn thiếu số liệu từ chi nhánh Đà Nẵng.',
        tags: ['Detail'], difficulty: 'EASY',
      },
      {
        part: 3, text: 'What will the man do after lunch?',
        options: [fmt('A', 'Call a client'), fmt('B', 'Book a flight'), fmt('C', 'Email the figures'), fmt('D', 'Visit Da Nang')],
        correct: 'C', explanation: 'Anh ấy hứa gửi email số liệu ngay sau bữa trưa.',
        tags: ['Inference'], difficulty: 'MEDIUM',
      },
    ],
  },
  {
    part: 6,
    title: 'Email nội bộ',
    passage: 'To: All staff\nSubject: Office relocation\n\nPlease note that our office will move to the 12th floor (1) ---- next Monday. All departments should pack their documents (2) ---- Friday afternoon. If you have questions, contact Ms. Hoa (3) ---- extension 204. We appreciate your (4) ---- during this transition.',
    questions: [
      {
        part: 6, text: '(1)',
        options: [fmt('A', 'on'), fmt('B', 'at'), fmt('C', 'by'), fmt('D', 'for')],
        correct: 'A', explanation: '"on Monday": ngày cụ thể trong tuần dùng giới từ on.',
        tags: ['Grammar'], difficulty: 'EASY',
      },
      {
        part: 6, text: '(2)',
        options: [fmt('A', 'until'), fmt('B', 'by'), fmt('C', 'during'), fmt('D', 'from')],
        correct: 'B', explanation: '"by Friday afternoon" = hạn chót trước chiều thứ Sáu.',
        tags: ['Grammar'], difficulty: 'MEDIUM',
      },
      {
        part: 6, text: '(3)',
        options: [fmt('A', 'at'), fmt('B', 'to'), fmt('C', 'for'), fmt('D', 'with')],
        correct: 'A', explanation: '"contact someone at extension..." là cụm cố định.',
        tags: ['Vocabulary'], difficulty: 'MEDIUM',
      },
      {
        part: 6, text: '(4)',
        options: [fmt('A', 'cooperate'), fmt('B', 'cooperation'), fmt('C', 'cooperative'), fmt('D', 'cooperatively')],
        correct: 'B', explanation: 'Sau tính từ sở hữu "your" cần danh từ: cooperation.',
        tags: ['Grammar'], difficulty: 'MEDIUM',
      },
    ],
  },
  {
    part: 7,
    title: 'Thông báo cửa hàng',
    passage: 'NOTICE: GreenMart will close early at 6 p.m. this Saturday for inventory inspection. Online orders placed before 4 p.m. will still be delivered on Sunday. We apologize for any inconvenience.',
    questions: [
      {
        part: 7, text: 'Why will GreenMart close early?',
        options: [fmt('A', 'For a holiday sale'), fmt('B', 'For inventory inspection'), fmt('C', 'For staff training'), fmt('D', 'For renovation')],
        correct: 'B', explanation: 'Thông báo ghi rõ "for inventory inspection".',
        tags: ['Detail'], difficulty: 'EASY',
      },
      {
        part: 7, text: 'What time will the store close on Saturday?',
        options: [fmt('A', '4 p.m.'), fmt('B', '5 p.m.'), fmt('C', '6 p.m.'), fmt('D', '8 p.m.')],
        correct: 'C', explanation: '"close early at 6 p.m. this Saturday".',
        tags: ['Detail'], difficulty: 'EASY',
      },
      {
        part: 7, text: 'What can be inferred about online orders?',
        options: [fmt('A', 'They are cancelled on Saturdays'), fmt('B', 'Orders before 4 p.m. arrive on Sunday'), fmt('C', 'They cost extra on weekends'), fmt('D', 'They stop at 6 p.m.')],
        correct: 'B', explanation: 'Đơn đặt trước 4 giờ chiều vẫn được giao vào Chủ nhật.',
        tags: ['Inference'], difficulty: 'MEDIUM',
      },
    ],
  },
];

const TEST1_SOLO: QDef[] = [
  {
    part: 2, text: 'When will the marketing report be finished?',
    options: [fmt('A', 'By Friday afternoon.'), fmt('B', 'In the marketing department.'), fmt('C', 'Yes, it is quite long.')],
    correct: 'A', explanation: 'Hỏi "when" → đáp án chỉ thời gian: By Friday afternoon.',
    tags: ['Detail'], difficulty: 'EASY',
  },
  {
    part: 2, text: 'Who is in charge of the client presentation?',
    options: [fmt('A', 'At the main office.'), fmt('B', 'Ms. Carter is.'), fmt('C', 'Next Thursday.')],
    correct: 'B', explanation: 'Hỏi "who" → đáp án chỉ người: Ms. Carter.',
    tags: ['Detail'], difficulty: 'EASY',
  },
  {
    part: 2, text: 'Why was the morning train delayed?',
    options: [fmt('A', 'Because of heavy rain.'), fmt('B', 'On platform two.'), fmt('C', 'A round-trip ticket.')],
    correct: 'A', explanation: 'Hỏi "why" → đáp án chỉ lý do: because of heavy rain.',
    tags: ['Detail'], difficulty: 'MEDIUM',
  },
  {
    part: 5, text: 'The new manager is highly ---- by all team members.',
    options: [fmt('A', 'respect'), fmt('B', 'respects'), fmt('C', 'respected'), fmt('D', 'respectful')],
    correct: 'C', explanation: 'Bị động "is respected": được tôn trọng.',
    tags: ['Grammar'], difficulty: 'MEDIUM',
  },
  {
    part: 5, text: 'Please submit the invoice ---- the end of this week.',
    options: [fmt('A', 'by'), fmt('B', 'until'), fmt('C', 'during'), fmt('D', 'for')],
    correct: 'A', explanation: '"by the end of" = hạn chót.',
    tags: ['Grammar'], difficulty: 'EASY',
  },
  {
    part: 5, text: 'The company decided to ---- its product line to attract younger customers.',
    options: [fmt('A', 'expand'), fmt('B', 'expansion'), fmt('C', 'expansive'), fmt('D', 'expanded')],
    correct: 'A', explanation: 'Sau "to" cần động từ nguyên mẫu: expand.',
    tags: ['Vocabulary'], difficulty: 'MEDIUM',
  },
  {
    part: 5, text: '---- the bad weather, the outdoor event attracted over 500 people.',
    options: [fmt('A', 'Despite'), fmt('B', 'Because'), fmt('C', 'Unless'), fmt('D', 'If')],
    correct: 'A', explanation: '"Despite + N/V-ing" = mặc dù.',
    tags: ['Grammar'], difficulty: 'MEDIUM',
  },
  {
    part: 5, text: 'Ms. Lan will be responsible ---- training the new interns.',
    options: [fmt('A', 'about'), fmt('B', 'with'), fmt('C', 'for'), fmt('D', 'to')],
    correct: 'C', explanation: 'Cụm cố định "responsible for + V-ing".',
    tags: ['Grammar'], difficulty: 'MEDIUM',
  },
  {
    part: 5, text: 'The merger is expected to be completed ---- the third quarter.',
    options: [fmt('A', 'on'), fmt('B', 'in'), fmt('C', 'at'), fmt('D', 'to')],
    correct: 'B', explanation: 'Quý/năm/tháng dùng giới từ "in".',
    tags: ['Grammar'], difficulty: 'EASY',
  },
];

/* Đề 2: Nghe hiểu — mỗi group có transcript để vừa nghe vừa đối chiếu. */
const TEST2_GROUPS: GroupDef[] = [
  {
    part: 3,
    title: 'Đặt phòng họp',
    passage: 'W: Good morning, I would like to reserve the conference room for Thursday afternoon.\nM: Certainly. How many people will attend?\nW: About twenty. We will need a projector as well.',
    transcript: [
      { startTime: 0.5, endTime: 3.5, text: 'Good morning, I would like to reserve the conference room for Thursday afternoon.' },
      { startTime: 3.7, endTime: 5.5, text: 'Certainly. How many people will attend?' },
      { startTime: 5.7, endTime: 8.0, text: 'About twenty. We will need a projector as well.' },
    ],
    questions: [
      {
        part: 3, text: 'What does the woman want to do?',
        options: [fmt('A', 'Reserve a conference room'), fmt('B', 'Cancel a meeting'), fmt('C', 'Buy a projector'), fmt('D', 'Invite twenty guests')],
        correct: 'A', explanation: 'Cô ấy muốn đặt phòng họp cho chiều thứ Năm.',
        tags: ['Detail'], difficulty: 'EASY',
      },
      {
        part: 3, text: 'When does she need the room?',
        options: [fmt('A', 'Thursday morning'), fmt('B', 'Thursday afternoon'), fmt('C', 'Friday morning'), fmt('D', 'Friday afternoon')],
        correct: 'B', explanation: '"for Thursday afternoon".',
        tags: ['Detail'], difficulty: 'EASY',
      },
      {
        part: 3, text: 'What extra equipment is requested?',
        options: [fmt('A', 'A microphone'), fmt('B', 'A whiteboard'), fmt('C', 'A projector'), fmt('D', 'A laptop')],
        correct: 'C', explanation: '"We will need a projector as well."',
        tags: ['Detail'], difficulty: 'EASY',
      },
    ],
  },
  {
    part: 3,
    title: 'Giao hàng trễ',
    passage: 'M: This package was supposed to arrive yesterday. Our customer is waiting.\nW: I apologize. The courier had a problem with the address.\nM: Please make sure it goes out today by express delivery.',
    transcript: [
      { startTime: 0.5, endTime: 3.5, text: 'This package was supposed to arrive yesterday. Our customer is waiting.' },
      { startTime: 3.7, endTime: 6.5, text: 'I apologize. The courier had a problem with the address.' },
      { startTime: 6.7, endTime: 9.5, text: 'Please make sure it goes out today by express delivery.' },
    ],
    questions: [
      {
        part: 3, text: 'What is the problem?',
        options: [fmt('A', 'A package arrived late'), fmt('B', 'A customer cancelled'), fmt('C', 'An address is missing'), fmt('D', 'A payment failed')],
        correct: 'A', explanation: 'Kiện hàng đáng lẽ đến hôm qua mà chưa đến.',
        tags: ['Inference'], difficulty: 'MEDIUM',
      },
      {
        part: 3, text: 'What caused the delay?',
        options: [fmt('A', 'Bad weather'), fmt('B', 'A wrong address'), fmt('C', 'A strike'), fmt('D', 'Heavy traffic')],
        correct: 'B', explanation: 'Người giao hàng gặp vấn đề với địa chỉ.',
        tags: ['Detail'], difficulty: 'MEDIUM',
      },
      {
        part: 3, text: 'What does the man request?',
        options: [fmt('A', 'A refund'), fmt('B', 'Express delivery today'), fmt('C', 'A new order'), fmt('D', 'A phone call')],
        correct: 'B', explanation: '"make sure it goes out today by express delivery".',
        tags: ['Detail'], difficulty: 'MEDIUM',
      },
    ],
  },
  {
    part: 4,
    title: 'Thông báo sân bay',
    passage: 'Attention passengers on flight VN214 to Singapore. Boarding will begin in ten minutes at gate 12. Please have your boarding passes ready. We remind you that large luggage must be checked in.',
    transcript: [
      { startTime: 0.5, endTime: 4.0, text: 'Attention passengers on flight VN214 to Singapore.' },
      { startTime: 4.2, endTime: 7.0, text: 'Boarding will begin in ten minutes at gate 12.' },
      { startTime: 7.2, endTime: 11.0, text: 'Please have your boarding passes ready. Large luggage must be checked in.' },
    ],
    questions: [
      {
        part: 4, text: 'Where is this announcement made?',
        options: [fmt('A', 'At a train station'), fmt('B', 'At an airport'), fmt('C', 'At a hotel'), fmt('D', 'At a port')],
        correct: 'B', explanation: 'Nhắc đến chuyến bay, cổng lên máy bay → sân bay.',
        tags: ['Inference'], difficulty: 'EASY',
      },
      {
        part: 4, text: 'At which gate will passengers board?',
        options: [fmt('A', 'Gate 10'), fmt('B', 'Gate 12'), fmt('C', 'Gate 20'), fmt('D', 'Gate 21')],
        correct: 'B', explanation: '"at gate 12".',
        tags: ['Detail'], difficulty: 'EASY',
      },
      {
        part: 4, text: 'What must passengers with large luggage do?',
        options: [fmt('A', 'Pay extra now'), fmt('B', 'Check it in'), fmt('C', 'Leave it behind'), fmt('D', 'Carry it on board')],
        correct: 'B', explanation: '"large luggage must be checked in".',
        tags: ['Detail'], difficulty: 'MEDIUM',
      },
    ],
  },
];

const TEST2_SOLO: QDef[] = [
  {
    part: 2, text: 'Have you met the new accountant yet?',
    options: [fmt('A', 'Yes, this morning.'), fmt('B', 'In the finance office.'), fmt('C', 'A monthly salary.')],
    correct: 'A', explanation: 'Câu hỏi Yes/No → đáp án Yes/No.',
    tags: ['Detail'], difficulty: 'EASY',
  },
  {
    part: 2, text: 'Where should I put these files?',
    options: [fmt('A', 'On the top shelf.'), fmt('B', 'Yesterday afternoon.'), fmt('C', 'About five files.')],
    correct: 'A', explanation: 'Hỏi "where" → đáp án chỉ nơi chốn.',
    tags: ['Detail'], difficulty: 'EASY',
  },
  {
    part: 2, text: 'Would you like tea or coffee?',
    options: [fmt('A', 'Coffee, please.'), fmt('B', 'At three o’clock.'), fmt('C', 'Yes, I like drinks.')],
    correct: 'A', explanation: 'Câu hỏi lựa chọn → đáp án nêu lựa chọn.',
    tags: ['Detail'], difficulty: 'EASY',
  },
  {
    part: 2, text: 'The seminar starts at nine, doesn’t it?',
    options: [fmt('A', 'Yes, in room 301.'), fmt('B', 'No, it is free.'), fmt('C', 'On the first floor.')],
    correct: 'A', explanation: 'Câu hỏi đuôi xác nhận → Yes + thông tin bổ sung.',
    tags: ['Detail'], difficulty: 'HARD',
  },
];

/* Đề 3: Đọc hiểu — Part 5/6/7 thuần văn bản, đáp án phân bố đều A-D. */
const TEST3_GROUPS: GroupDef[] = [
  {
    part: 6,
    title: 'Thư mời hội thảo',
    passage: 'Dear partners,\n\nYou are invited to the annual trade workshop (1) ---- March 14 at the Riverside Center. This year we will focus (2) ---- digital exports. Registration is free but seats are (3) ----, so please reply (4) ---- February 28.',
    questions: [
      {
        part: 6, text: '(1)',
        options: [fmt('A', 'in'), fmt('B', 'on'), fmt('C', 'at'), fmt('D', 'for')],
        correct: 'B', explanation: 'Ngày cụ thể "March 14" dùng "on".',
        tags: ['Grammar'], difficulty: 'EASY',
      },
      {
        part: 6, text: '(2)',
        options: [fmt('A', 'at'), fmt('B', 'to'), fmt('C', 'on'), fmt('D', 'with')],
        correct: 'C', explanation: '"focus on" là cụm cố định.',
        tags: ['Vocabulary'], difficulty: 'MEDIUM',
      },
      {
        part: 6, text: '(3)',
        options: [fmt('A', 'limit'), fmt('B', 'limited'), fmt('C', 'limiting'), fmt('D', 'limits')],
        correct: 'B', explanation: 'Sau "are" cần tính từ: limited (có hạn).',
        tags: ['Grammar'], difficulty: 'MEDIUM',
      },
      {
        part: 6, text: '(4)',
        options: [fmt('A', 'by'), fmt('B', 'until'), fmt('C', 'during'), fmt('D', 'within')],
        correct: 'A', explanation: '"reply by February 28" = hạn chót phản hồi.',
        tags: ['Grammar'], difficulty: 'MEDIUM',
      },
    ],
  },
  {
    part: 7,
    title: 'Email đổi lịch họp',
    passage: 'From: David Park\nTo: Project team\nSubject: Meeting moved\n\nTomorrow’s budget review is moved from 10 a.m. to 2 p.m. because the director is visiting a factory in the morning. The venue is unchanged (Room 402). Please bring printed copies of your slides.',
    questions: [
      {
        part: 7, text: 'What is the purpose of the email?',
        options: [fmt('A', 'To cancel a meeting'), fmt('B', 'To change a meeting time'), fmt('C', 'To invite new members'), fmt('D', 'To share slides')],
        correct: 'B', explanation: 'Email báo giờ họp chuyển từ 10 giờ sáng sang 2 giờ chiều.',
        tags: ['Inference'], difficulty: 'EASY',
      },
      {
        part: 7, text: 'Why was the meeting moved?',
        options: [fmt('A', 'Room 402 is busy'), fmt('B', 'Slides are not ready'), fmt('C', 'The director visits a factory'), fmt('D', 'Half the team is absent')],
        correct: 'C', explanation: 'Giám đốc đi thăm nhà máy vào buổi sáng.',
        tags: ['Detail'], difficulty: 'MEDIUM',
      },
      {
        part: 7, text: 'What should attendees bring?',
        options: [fmt('A', 'Printed slides'), fmt('B', 'Laptops'), fmt('C', 'ID cards'), fmt('D', 'Lunch')],
        correct: 'A', explanation: '"Please bring printed copies of your slides."',
        tags: ['Detail'], difficulty: 'EASY',
      },
    ],
  },
  {
    part: 7,
    title: 'Đánh giá nhà hàng',
    passage: 'Review: We waited 40 minutes for our food at Sunny Bistro last night, but the grilled fish was worth it — fresh and well seasoned. Prices are reasonable, though the room was noisy when full. I will return on a weekday.',
    questions: [
      {
        part: 7, text: 'What is the reviewer’s overall opinion?',
        options: [fmt('A', 'Mostly positive'), fmt('B', 'Entirely negative'), fmt('C', 'Neutral'), fmt('D', 'Mixed about price only')],
        correct: 'A', explanation: 'Dù chờ lâu và ồn, món ngon, giá hợp lý và sẽ quay lại → nhìn chung tích cực.',
        tags: ['Inference'], difficulty: 'HARD',
      },
      {
        part: 7, text: 'How long did they wait for food?',
        options: [fmt('A', '14 minutes'), fmt('B', '40 minutes'), fmt('C', 'One hour'), fmt('D', 'All evening')],
        correct: 'B', explanation: '"We waited 40 minutes for our food".',
        tags: ['Detail'], difficulty: 'EASY',
      },
      {
        part: 7, text: 'When will the reviewer probably return?',
        options: [fmt('A', 'On a weekend'), fmt('B', 'On a weekday'), fmt('C', 'Next month'), fmt('D', 'Never')],
        correct: 'B', explanation: '"I will return on a weekday" (tránh đông ồn ào).',
        tags: ['Inference'], difficulty: 'MEDIUM',
      },
    ],
  },
];

const TEST3_SOLO: QDef[] = [
  {
    part: 5, text: 'All employees must wear ID badges ---- entering the building.',
    options: [fmt('A', 'when'), fmt('B', 'during'), fmt('C', 'while'), fmt('D', 'as')],
    correct: 'A', explanation: '"when entering" = khi vào tòa nhà (rút gọn mệnh đề).',
    tags: ['Grammar'], difficulty: 'MEDIUM',
  },
  {
    part: 5, text: 'The IT department will ---- the new software next Monday.',
    options: [fmt('A', 'install'), fmt('B', 'installation'), fmt('C', 'installed'), fmt('D', 'installs')],
    correct: 'A', explanation: 'Sau "will" dùng động từ nguyên mẫu.',
    tags: ['Grammar'], difficulty: 'EASY',
  },
  {
    part: 5, text: 'Our latest survey shows high customer ---- with delivery speed.',
    options: [fmt('A', 'satisfy'), fmt('B', 'satisfaction'), fmt('C', 'satisfied'), fmt('D', 'satisfying')],
    correct: 'B', explanation: 'Sau tính từ "high" cần danh từ: satisfaction.',
    tags: ['Vocabulary'], difficulty: 'MEDIUM',
  },
  {
    part: 5, text: 'Neither the manager nor the assistants ---- aware of the error.',
    options: [fmt('A', 'was'), fmt('B', 'were'), fmt('C', 'is'), fmt('D', 'has been')],
    correct: 'B', explanation: '"Neither... nor" chia theo chủ ngữ gần nhất (assistants, số nhiều).',
    tags: ['Grammar'], difficulty: 'HARD',
  },
  {
    part: 5, text: 'The conference room on the third floor can ---- up to 100 people.',
    options: [fmt('A', 'accommodate'), fmt('B', 'accommodation'), fmt('C', 'accommodating'), fmt('D', 'accommodated')],
    correct: 'A', explanation: 'Sau "can" dùng động từ nguyên mẫu.',
    tags: ['Vocabulary'], difficulty: 'MEDIUM',
  },
  {
    part: 5, text: 'Please keep all receipts for your business ----.',
    options: [fmt('A', 'expenses'), fmt('B', 'expensive'), fmt('C', 'expensively'), fmt('D', 'expense account')],
    correct: 'A', explanation: '"business expenses" = chi phí công tác (danh từ số nhiều).',
    tags: ['Vocabulary'], difficulty: 'MEDIUM',
  },
  {
    part: 5, text: 'The CEO will announce the results ---- the press conference.',
    options: [fmt('A', 'during'), fmt('B', 'while'), fmt('C', 'for'), fmt('D', 'until')],
    correct: 'A', explanation: '"during + N" = trong suốt buổi họp báo.',
    tags: ['Grammar'], difficulty: 'EASY',
  },
  {
    part: 5, text: 'We need someone ---- can speak both English and Japanese.',
    options: [fmt('A', 'who'), fmt('B', 'which'), fmt('C', 'whose'), fmt('D', 'whom')],
    correct: 'A', explanation: 'Đại từ quan hệ chỉ người làm chủ ngữ: who.',
    tags: ['Grammar'], difficulty: 'EASY',
  },
];

async function createTestWithContent(
  testData: { title: string; description: string; duration: number },
  solo: QDef[],
  groups: GroupDef[],
) {
  const test = await prisma.test.create({ data: { ...testData, status: 'PUBLISHED' } });
  let order = 0;
  const link = async (questionId: string) => {
    order += 1;
    await prisma.testQuestion.create({ data: { testId: test.id, questionId, orderIndex: order } });
  };
  for (const q of solo) {
    const created = await prisma.question.create({
      data: {
        groupId: null, partNumber: q.part, questionText: q.text, options: q.options,
        correctAnswer: q.correct, explanation: q.explanation, difficulty: q.difficulty || 'MEDIUM', tags: q.tags,
      },
    });
    await link(created.id);
  }
  for (const g of groups) {
    const group = await prisma.questionGroup.create({
      data: {
        testId: test.id, title: g.title, partNumber: g.part,
        passageText: g.passage || null, transcript: g.transcript || [],
      },
    });
    for (const q of g.questions) {
      const created = await prisma.question.create({
        data: {
          groupId: group.id, partNumber: q.part, questionText: q.text, options: q.options,
          correctAnswer: q.correct, explanation: q.explanation, difficulty: q.difficulty || 'MEDIUM', tags: q.tags,
        },
      });
      await link(created.id);
    }
  }
  return test;
}

async function main() {
  console.log('Dang seed du lieu TOEIC thuc te (3 de rieng biet + tai khoan demo)...');

  // 1. Dọn bảng thi (giữ users/vocab; user demo bên dưới được tạo lại sạch).
  await prisma.attemptAnswer.deleteMany({});
  await prisma.testAttempt.deleteMany({});
  await prisma.testQuestion.deleteMany({});
  await prisma.question.deleteMany({});
  await prisma.questionGroup.deleteMany({});
  await prisma.test.deleteMany({});

  // 2. Tài khoản demo (idempotent: xóa trước theo email).
  const demoEmails = ['admin@toeic.local', 'an@toeic.local', 'binh@toeic.local', 'chi@toeic.local'];
  await prisma.user.deleteMany({ where: { email: { in: demoEmails } } });
  const [admin, an, binh, chi] = await Promise.all([
    prisma.user.create({
      data: { email: 'admin@toeic.local', password: await bcrypt.hash('Admin123!', 10), fullName: 'Quản trị viên', role: 'ADMIN', targetScore: 990 },
    }),
    prisma.user.create({
      data: { email: 'an@toeic.local', password: await bcrypt.hash('Student123!', 10), fullName: 'Nguyễn Văn An', role: 'STUDENT', targetScore: 800 },
    }),
    prisma.user.create({
      data: { email: 'binh@toeic.local', password: await bcrypt.hash('Student123!', 10), fullName: 'Trần Thị Bình', role: 'STUDENT', targetScore: 850 },
    }),
    prisma.user.create({
      data: { email: 'chi@toeic.local', password: await bcrypt.hash('Student123!', 10), fullName: 'Lê Thị Chi', role: 'STUDENT', targetScore: 600 },
    }),
  ]);

  // 3. Ba đề thi, mỗi đề sở hữu riêng bộ câu hỏi (không dùng chung).
  const test1 = await createTestWithContent(
    { title: 'TOEIC Sprint 30 — Luyện đề ngắn', description: 'Đề ngắn 30 phút, phủ Part 2/3/5/6/7. Phù hợp luyện hằng ngày giữ streak.', duration: 30 },
    TEST1_SOLO, TEST1_GROUPS,
  );
  const test2 = await createTestWithContent(
    { title: 'TOEIC Listening Focus 45', description: 'Luyện Nghe Part 2/3/4, mỗi đoạn hội thoại kèm transcript để đối chiếu.', duration: 45 },
    TEST2_SOLO, TEST2_GROUPS,
  );
  const test3 = await createTestWithContent(
    { title: 'TOEIC Reading Focus 60', description: 'Luyện Đọc Part 5/6/7 với giải thích ngữ pháp chi tiết từng câu.', duration: 60 },
    TEST3_SOLO, TEST3_GROUPS,
  );
  const tests = [test1, test2, test3];
  void admin;

  // 4. Lịch sử thi demo rải 7 ngày qua để dashboard/leaderboard/analytics có dữ liệu thật.
  const rand = mulberry32(20260907);
  const day = 24 * 60 * 60 * 1000;
  const todayNoon = new Date();
  todayNoon.setHours(12, 0, 0, 0);
  const plans: { userId: string; testIdx: number; daysAgo: number; accuracy: number }[] = [
    { userId: an.id, testIdx: 0, daysAgo: 6, accuracy: 0.55 },
    { userId: an.id, testIdx: 1, daysAgo: 4, accuracy: 0.62 },
    { userId: an.id, testIdx: 2, daysAgo: 2, accuracy: 0.68 },
    { userId: an.id, testIdx: 0, daysAgo: 0, accuracy: 0.74 },
    { userId: binh.id, testIdx: 0, daysAgo: 5, accuracy: 0.8 },
    { userId: binh.id, testIdx: 2, daysAgo: 1, accuracy: 0.85 },
    { userId: chi.id, testIdx: 1, daysAgo: 3, accuracy: 0.5 },
  ];

  for (const plan of plans) {
    const test = tests[plan.testIdx];
    const links = await prisma.testQuestion.findMany({
      where: { testId: test.id },
      include: { question: true },
      orderBy: { orderIndex: 'asc' },
    });
    const submittedAt = new Date(todayNoon.getTime() - plan.daysAgo * day);
    const startedAt = new Date(submittedAt.getTime() - Math.round(test.duration * 0.7) * 60 * 1000);
    let listeningCorrect = 0;
    let listeningTotal = 0;
    let readingCorrect = 0;
    let readingTotal = 0;
    const partStats: Record<string, { correct: number; total: number }> = {};
    const answerRows: { questionId: string; selectedOption: string | null; isCorrect: boolean }[] = [];

    for (const link of links) {
      const q = link.question;
      const hit = rand() < plan.accuracy;
      const letters = ['A', 'B', 'C', 'D'];
      const selected = hit ? q.correctAnswer : letters[Math.floor(rand() * 4)];
      const isCorrect = selected === q.correctAnswer;
      const section = [1, 2, 3, 4].includes(q.partNumber) ? 'listening' : 'reading';
      if (section === 'listening') {
        listeningTotal += 1;
        if (isCorrect) listeningCorrect += 1;
      } else {
        readingTotal += 1;
        if (isCorrect) readingCorrect += 1;
      }
      const part = `Part ${q.partNumber}`;
      partStats[part] = partStats[part] || { correct: 0, total: 0 };
      partStats[part].total += 1;
      if (isCorrect) partStats[part].correct += 1;
      answerRows.push({ questionId: q.id, selectedOption: selected, isCorrect });
    }

    const { listeningScore, readingScore, totalScore } = calculateSectionScores(
      listeningCorrect, listeningTotal, readingCorrect, readingTotal,
    );
    const attempt = await prisma.testAttempt.create({
      data: {
        userId: plan.userId, testId: test.id, status: 'SUBMITTED', timeRemaining: 0,
        deadlineAt: new Date(startedAt.getTime() + test.duration * 60 * 1000),
        cheatWarningCount: rand() < 0.2 ? 1 : 0,
        listeningScore, readingScore, totalScore, skillAnalytics: partStats,
        startedAt, submittedAt,
      },
    });
    await prisma.attemptAnswer.createMany({
      data: answerRows.map((row) => ({ ...row, attemptId: attempt.id })),
    });
  }

  const questionCount = await prisma.question.count();
  console.log(`Seed xong: 4 tai khoan demo (admin@toeic.local / an,binh,chi@toeic.local, mat khau trong code), 3 de thi, ${questionCount} cau hoi rieng biet, ${plans.length} luot thi lich su.`);

  // 5. Kho từ vựng chung theo chủ đề (idempotent theo tiêu đề).
  const topicSeeds: { title: string; description: string; words: { word: string; meaning: string; example: string }[] }[] = [
    {
      title: 'Văn phòng & Công việc',
      description: 'Từ vựng nơi công sở: cuộc họp, deadline, đồng nghiệp.',
      words: [
        { word: 'deadline', meaning: 'hạn chót', example: 'The deadline for the report is Friday.' },
        { word: 'meeting', meaning: 'cuộc họp', example: 'We have a meeting at 9 a.m.' },
        { word: 'colleague', meaning: 'đồng nghiệp', example: 'My colleagues are very supportive.' },
        { word: 'overtime', meaning: 'làm thêm giờ', example: 'She worked overtime to finish the proposal.' },
        { word: 'promotion', meaning: 'sự thăng chức', example: 'He got a promotion last month.' },
        { word: 'resign', meaning: 'từ chức', example: 'She resigned due to health issues.' },
        { word: 'efficient', meaning: 'hiệu quả', example: 'The new system is more efficient.' },
        { word: 'postpone', meaning: 'hoãn lại', example: 'The meeting was postponed until Monday.' },
        { word: 'workload', meaning: 'khối lượng công việc', example: 'His workload doubled this quarter.' },
        { word: 'intern', meaning: 'thực tập sinh', example: 'The interns assist with data entry.' },
      ],
    },
    {
      title: 'Du lịch công tác',
      description: 'Sân bay, khách sạn, đặt chỗ cho chuyến công tác.',
      words: [
        { word: 'boarding pass', meaning: 'thẻ lên máy bay', example: 'Please have your boarding pass ready.' },
        { word: 'reservation', meaning: 'đặt chỗ trước', example: 'I made a hotel reservation online.' },
        { word: 'itinerary', meaning: 'lịch trình', example: 'Send me your itinerary before Friday.' },
        { word: 'delay', meaning: 'trì hoãn', example: 'The flight was delayed by fog.' },
        { word: 'luggage', meaning: 'hành lý', example: 'Large luggage must be checked in.' },
        { word: 'aisle', meaning: 'lối đi (giữa các hàng ghế)', example: 'I prefer an aisle seat on long flights.' },
        { word: 'reception', meaning: 'quầy lễ tân', example: 'Check in at the reception desk.' },
        { word: 'shuttle', meaning: 'xe đưa đón', example: 'A free shuttle runs to the airport.' },
        { word: 'extend', meaning: 'gia hạn, kéo dài', example: 'They extended their stay by two days.' },
        { word: 'refund', meaning: 'hoàn tiền', example: 'You can request a full refund.' },
      ],
    },
    {
      title: 'Tài chính & Kinh doanh',
      description: 'Hợp đồng, ngân sách, doanh thu trong đề Part 5/6/7.',
      words: [
        { word: 'invoice', meaning: 'hóa đơn', example: 'Please submit the invoice by Friday.' },
        { word: 'budget', meaning: 'ngân sách', example: 'The project stayed within budget.' },
        { word: 'revenue', meaning: 'doanh thu', example: 'Revenue grew 12 percent this year.' },
        { word: 'contract', meaning: 'hợp đồng', example: 'Both sides signed the contract.' },
        { word: 'negotiate', meaning: 'đàm phán', example: 'They negotiated a better price.' },
        { word: 'merger', meaning: 'sáp nhập', example: 'The merger created 200 new jobs.' },
        { word: 'quarterly', meaning: 'hằng quý', example: 'Quarterly profits beat forecasts.' },
        { word: 'deficit', meaning: 'thâm hụt', example: 'The firm posted a small deficit.' },
        { word: 'reimburse', meaning: 'hoàn trả chi phí', example: 'Travel costs will be reimbursed.' },
        { word: 'fluctuate', meaning: 'dao động', example: 'Prices fluctuate with demand.' },
      ],
    },
  ];
  await prisma.vocabTopic.deleteMany({ where: { title: { in: topicSeeds.map((t) => t.title) } } });
  for (const t of topicSeeds) {
    await prisma.vocabTopic.create({
      data: {
        title: t.title,
        description: t.description,
        words: { create: t.words },
      },
    });
  }
  console.log(`Seed xong kho tu vung: ${topicSeeds.length} chu de, ${topicSeeds.reduce((n, t) => n + t.words.length, 0)} tu.`);

  // 6. Gắn từ vào câu hỏi mẫu để demo gợi ý bài từ theo Part yếu.
  const linkSpecs = [
    { part: 5, topicTitle: 'Văn phòng & Công việc', takeQuestions: 6, takeWords: 4 },
    { part: 6, topicTitle: 'Tài chính & Kinh doanh', takeQuestions: 4, takeWords: 4 },
    { part: 3, topicTitle: 'Du lịch công tác', takeQuestions: 6, takeWords: 4 },
  ];
  let linkCount = 0;
  for (const spec of linkSpecs) {
    const topicRef = await prisma.vocabTopic.findFirst({ where: { title: spec.topicTitle }, select: { id: true } });
    if (!topicRef) continue;
    const [questions, topic] = await Promise.all([
      prisma.question.findMany({ where: { partNumber: spec.part }, select: { id: true }, take: spec.takeQuestions }),
      prisma.vocabTopic.findUnique({ where: { id: topicRef.id }, include: { words: { select: { id: true }, take: spec.takeWords } } }),
    ]);
    if (!topic) continue;
    const rows = questions.flatMap((q) => topic.words.map((w) => ({ questionId: q.id, wordId: w.id })));
    if (rows.length) {
      const created = await prisma.questionWord.createMany({ data: rows, skipDuplicates: true });
      linkCount += created.count;
    }
  }
  console.log(`Seed xong gan tu vao cau hoi: ${linkCount} lien ket.`);
}

main()
  .catch((e) => {
    console.error('Loi khi seed data:', e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
