# Terminal 1 — Infrastructure
npm run docker:up
# Wait 30 seconds for all services to start

# Terminal 2 — Database setup
cd aold/packages/database
npx prisma generate
npx prisma migrate dev --name init
npx ts-node src/seeds/index.ts

# Terminal 3 — API Gateway (port 3000)
cd aold/apps/api-gateway && npm run dev
npm run dev

# Terminal 4 — Auth Service (port 3001)
cd aold/apps/auth-service && npm run dev
npm run dev

# Terminal 5 — File Service (port 3002)
cd aold/apps/file-service && npm run dev
npm run dev

# Terminal 6 — Search Service (port 3003)
cd aold/apps/search-service && npm run dev
npm run dev

# Terminal 7 — Insights Service (port 3004)
cd aold/apps/insights-service && npm run dev
npm run dev

# Terminal 8 — Notification Service (port 3005)
cd aold/apps/notification-service && npm run dev
npm run dev

# Terminal 9 — Frontend (port 3002... wait)
# NOTE: File service bhi 3002 use kar raha tha
# Web ko 3006 pe move karo ya file service 3007 pe
cd aold/apps/web && npm run dev
npm run dev
# Opens at http://localhost:3002

# Terminal 10 — Python AI Service (port 8000)
cd aold/services/ai-processing
source .venv/Scripts/activate
uvicorn src.main:app --reload --port 8000