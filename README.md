# TOEIC Master

## Chay local voi PostgreSQL co san

1. Copy `.env.example` thanh `.env` va cap nhat `DATABASE_URL`, `JWT_SECRET`.
2. Cai dependencies:

```powershell
npm install
npx prisma generate
npx prisma migrate deploy
```

3. Chay API:

```powershell
npm run dev
```

4. Chay frontend o terminal khac:

```powershell
npm run fe
```

- Frontend: http://localhost:5173
- API health: http://localhost:5000/api/health

## Kiem tra

```powershell
npm test
npx tsc --noEmit
npm run build:fe
```

## Docker

Can Docker va Docker Compose:

```powershell
docker compose up --build
```

Docker Compose se chay PostgreSQL rieng trong container, khong dung PostgreSQL local. Neu dung PostgreSQL da cai san, chay theo huong dan local o tren.

## Cloudinary media production

Tao Cloudinary account, sau do them cac bien sau vao environment production:

```env
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

Khi co du ba bien nay, audio/image Admin upload se luu tren Cloudinary. Khi thieu, development dung `public/uploads`.

## CI/CD deploy

Workflow `deploy.yml` se validate, test va build moi push vao `main`. De trigger deploy:

- Them GitHub Actions secret `RENDER_DEPLOY_HOOK_URL`, hoac
- Them GitHub Actions secret `RAILWAY_DEPLOY_HOOK_URL`.

File `render.yaml` da san sang cho Render. DATABASE_URL va cac secret production phai duoc nhap trong dashboard nha cung cap.
