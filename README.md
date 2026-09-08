# TOEIC Master — Nền tảng luyện thi TOEIC trực tuyến

TOEIC Master là web luyện thi TOEIC gồm đề thi thử tính giờ, chấm điểm Listening/Reading,
xem lại bài làm kèm giải thích, theo dõi tiến độ học tập và bộ công cụ quản trị dành cho admin.

## 1. Tính năng chi tiết

### Dành cho học viên

- **Thi thử tính giờ** (`/tests`, `/tests/:id/room`): làm đề theo từng Part, hết giờ hệ thống
  tự động nộp bài. Thời gian do server kiểm soát (ưu tiên `deadlineAt`), client không thể
  gian lận giờ làm bài; số lần cảnh báo cheat chỉ tăng chứ không giảm được.
- **Xem lại bài làm** (`/tests/review/:attemptId`, `/transcript`): đối chiếu từng câu,
  đáp án đúng, giải thích và transcript các đoạn nghe.
- **Theo dõi tiến trình** (`/student-dashboard`, `/analytics`, `/mistakes`, `/achievements`):
  biểu đồ điểm theo thời gian, phân tích điểm yếu theo Part, sổ tay câu sai,
  huy hiệu thành tích và streak ngày học liên tục.
- **Luyện tập bổ trợ** (`/practice`, `/vocab`): luyện theo bộ câu hỏi, học từ vựng theo
  chủ đề với flashcard và chấm ôn tập, sao chép từ vựng mẫu về sổ tay cá nhân.
- **Tài khoản** (`/login`, `/register`, `/forgot-password`, `/profile`): xác thực JWT
  (access token 1 giờ + refresh token 7 ngày, tự động refresh), đổi mật khẩu,
  đặt mục tiêu điểm, quên mật khẩu qua email với token dùng một lần hiệu lực 30 phút,
  giới hạn 10 lần thử đăng nhập mỗi 15 phút để chống brute-force.

### Dành cho admin (`/dashboard`, `/admin`, `/admin/users`, `/admin/vocab`, `/admin/audit-logs`)

- Quản lý đề thi, câu hỏi, nhóm câu hỏi (tạo/sửa/xóa, sắp xếp thứ tự câu trong đề,
  xem trước đề, thống kê tỉ lệ đúng theo từng câu).
- Import hàng loạt câu hỏi từ file Excel, upload audio/ảnh minh họa cho nhóm câu hỏi.
- Quản lý người dùng: xem chi tiết, khóa/mở tài khoản, reset mật khẩu.
- Dashboard thống kê hệ thống và nhật ký audit ghi lại thao tác quản trị.

## 2. Công nghệ sử dụng

| Tầng | Công nghệ |
| --- | --- |
| Backend | Node.js 22, Express 5, TypeScript, Prisma ORM 6, PostgreSQL 16 |
| Xác thực | JSON Web Token (access + refresh), bcrypt |
| Media/Email | Multer, Cloudinary, Nodemailer, xlsx (import Excel) |
| Frontend | React 19, Vite, TailwindCSS 4, React Router 7, Recharts (lazy-load) |
| Kiểm thử/CI | node:test + tsx, GitHub Actions |

## 3. Yêu cầu môi trường

- Node.js 22 trở lên.
- PostgreSQL 16 (cài sẵn, hoặc dùng Docker Compose để khỏi cài).
- Khuyên dùng 2 terminal riêng cho backend và frontend khi chạy dev.

## 4. Chạy local

### Bước 1 — Chuẩn bị biến môi trường

```powershell
Copy-Item .env.example .env
```

Mở `.env` và cập nhật ít nhất 2 biến bắt buộc: `DATABASE_URL` (chuỗi kết nối PostgreSQL
tới database `toeic_db`) và `JWT_SECRET` (chuỗi bí mật dài, dùng ký JWT).

### Bước 2 — Cài dependencies và migrate database

```powershell
npm install
npx prisma generate
npx prisma migrate deploy
```

### Bước 3 — Seed dữ liệu mẫu (tùy chọn nhưng nên làm)

```powershell
npx prisma db seed
```

Lệnh này chạy `tsx prisma/seed.ts`, tạo đề thi mẫu bao phủ các Part 2–7, kho từ vựng
theo chủ đề, lịch sử thi demo và tài khoản mẫu để đăng nhập thử. Chi tiết đầy đủ
nằm trong file `prisma/seed.ts`.

### Bước 4 — Chạy backend và frontend

Terminal 1 (API):

```powershell
npm run dev
```

Terminal 2 (giao diện):

```powershell
npm run fe
```

| Dịch vụ | Địa chỉ |
| --- | --- |
| Giao diện | http://localhost:5173 |
| API health check | http://localhost:5000/api/health |
| API base URL | http://localhost:5000/api/v1 |

Lưu ý: luôn mở giao diện bằng `http://localhost:5173`. Nếu đăng nhập báo lỗi
không kết nối được tới API, kiểm tra theo thứ tự: backend có đang chạy không,
`VITE_API_BASE_URL` có đúng không, và có đang mở đúng địa chỉ localhost không.

### Các script hay dùng

| Script | Tác dụng |
| --- | --- |
| `npm run dev` | Chạy API ở chế độ watch (tsx) |
| `npm run fe` | Chạy frontend dev (Vite) |
| `npm run build` | Generate Prisma client + biên dịch backend ra `dist/` |
| `npm run build:fe` | Build production cho frontend ra `FE/dist/` |
| `npm test` | Chạy toàn bộ test backend |
| `npm start` | Chạy backend production từ `dist/` (cần build trước) |

## 5. Kiểm thử

```powershell
npm test
npx tsc --noEmit
npm run build:fe
```

Hiện có 14 test backend (`src/utils/*.test.ts`, `src/app.test.ts`): health check,
route 404, chặn truy cập khi thiếu token, forgot-password không lộ email tồn tại,
logic deadline/cheat-count khi nộp bài, quy đổi điểm Listening/Reading và tính streak.
Workflow CI trên GitHub chạy đúng 3 lệnh trên cho mỗi push và pull request.

## 6. Chạy bằng Docker

Cần Docker và Docker Compose:

```powershell
docker compose up --build
```

Compose dựng 3 service: `db` (PostgreSQL :5432), `api` (backend :5000) và `web`
(frontend qua nginx :80). Chế độ này dùng PostgreSQL riêng trong container,
không dùng PostgreSQL cài sẵn trên máy.

## 7. Cấu trúc thư mục

```text
├── src/                    # Backend (Express + TypeScript)
│   ├── app.ts              # Khởi tạo app, CORS, route /api/health
│   ├── server.ts           # Lắng nghe cổng, graceful shutdown
│   ├── routes/             # Định nghĩa endpoint /api/v1/...
│   ├── controllers/        # Xử lý nghiệp vụ
│   ├── middlewares/        # Auth, phân quyền admin, rate-limit, upload, error
│   ├── utils/              # Tính điểm, streak, timing (+ test)
│   ├── config/             # Prisma client
│   └── types/
├── FE/src/                 # Frontend (React + Vite)
│   ├── pages/              # Landing, Login, Tests, TestRoom, Dashboard, Admin...
│   ├── components/         # Navbar, Flashcard, charts...
│   └── lib/api.ts          # Fetch API tập trung + tự refresh token
├── prisma/
│   ├── schema.prisma       # Schema database
│   ├── migrations/         # Lịch sử migrate
│   └── seed.ts             # Dữ liệu mẫu
├── Dockerfile              # Build backend
├── FE/Dockerfile           # Build frontend + serve bằng nginx
├── docker-compose.yml      # Dev/prod local với Docker
└── render.yaml             # Cấu hình deploy Render
```

## 8. API tổng quan

Base URL: `/api/v1` (kèm `GET /api/health` kiểm tra API + database).

| Nhóm | Prefix | Chức năng |
| --- | --- | --- |
| Auth | `/auth` | Đăng ký, đăng nhập, refresh token, quên/đặt lại mật khẩu, hồ sơ |
| Đề thi | `/tests` | Danh sách đề, đề luyện tập, chi tiết đề |
| Làm bài | `/tests/attempts` | Bắt đầu, đồng bộ, nộp bài, xem lại, lịch sử của tôi |
| Từ vựng | `/vocab` | Chủ đề, từ vựng, sao chép mẫu, chấm ôn tập |
| Phân tích | `/users/analytics`, `/analytics` | Tổng quan, điểm yếu, câu sai, huy hiệu |
| Dashboard | `/admin/dashboard`, `/admin/dashboard/stats` | Thống kê học viên và hệ thống |
| Quản trị | `/admin` | Đề thi, người dùng, audit logs, import Excel, media |

Mọi endpoint quản trị đều yêu cầu đăng nhập và vai trò `ADMIN`; frontend cũng chặn
ở tầng giao diện nhưng backend mới là lớp bảo vệ quyết định.

## 9. Biến môi trường

| Biến | Bắt buộc | Mô tả |
| --- | --- | --- |
| `DATABASE_URL` | Có | Chuỗi kết nối PostgreSQL |
| `JWT_SECRET` | Có | Khóa ký JWT, dùng chuỗi ngẫu nhiên dài ở production |
| `PORT` | Không | Cổng backend (mặc định 5000) |
| `FRONTEND_URL` | Không | Origin frontend cho CORS, cách nhau bằng dấu phẩy |
| `VITE_API_BASE_URL` | Không | Base URL API cho frontend (mặc định `http://localhost:5000/api/v1`) |
| `SMTP_HOST/PORT/USER/PASSWORD/FROM` | Không | Gửi email quên mật khẩu; thiếu thì chỉ log token ở dev |
| `CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET` | Không | Lưu trữ media production; thiếu thì dùng `public/uploads` local |

Lưu ý quan trọng: `VITE_API_BASE_URL` được "nướng" vào bundle lúc build frontend,
đổi giá trị sau khi build thì phải build lại mới có hiệu lực.

## 10. Deploy

- CI (`ci.yml`) validate, test và build mỗi push; CD (`deploy.yml`) bắn deploy hook
  khi push lên `main`.
- Thêm secret `RENDER_DEPLOY_HOOK_URL` hoặc `RAILWAY_DEPLOY_HOOK_URL` trong
  GitHub Actions để kích hoạt deploy. File `render.yaml` đã sẵn cho Render.
- `DATABASE_URL` và các secret production nhập trực tiếp trên dashboard nhà cung cấp,
  không commit file `.env`.
- Backend production tự chạy `prisma migrate deploy` khi khởi động, nên migration mới
  sẽ áp dụng tự động — backup database production trước các đợt thay đổi schema lớn.
- Thư mục `dist/` và `FE/dist/` là output build, đã ignore khỏi git và luôn được
  build lại từ source trên CI/Docker.
