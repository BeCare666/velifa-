# VELIFA SaaS Enterprise

Plateforme SaaS d'audit de performance web — Next.js + NestJS + TiDB + BullMQ

---

## Structure

```
velifa/
├── backend/          # NestJS API + Worker
├── frontend/         # Next.js App Router
├── docker-compose.yml
└── render.yaml
```

---

## Prérequis

- Node.js 20+
- npm 10+
- Docker (pour Redis en local)
- Git

---

## Installation locale

### 1. Cloner et configurer

```bash
git clone https://github.com/ton-compte/velifa.git
cd velifa
```

### 2. Services externes à créer (gratuits)

| Service | URL | Variable |
|---|---|---|
| TiDB Cloud | https://tidbcloud.com | DATABASE_URL |
| Upstash Redis | https://upstash.com | REDIS_URL |
| Google Cloud Console | https://console.cloud.google.com | PAGESPEED_API_KEY |
| Browserless.io | https://browserless.io | BROWSERLESS_API_KEY |
| Cloudinary | https://cloudinary.com | CLOUDINARY_* |
| Brevo | https://app.brevo.com | BREVO_* |
| Cloudflare Turnstile | https://dash.cloudflare.com | TURNSTILE_* |

### 3. Variables d'environnement

```bash
cd backend
cp .env.example .env
# Remplir toutes les valeurs dans .env

cd ../frontend
cp .env.example .env.local
# Remplir NEXT_PUBLIC_API_URL et NEXT_PUBLIC_TURNSTILE_SITE_KEY
```

### 4. Redis local (Docker)

```bash
# Depuis la racine
docker-compose up -d redis
```

### 5. Backend

```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:push     # Crée les tables dans TiDB Cloud
npm run start:dev       # http://localhost:3001
```

### 6. Frontend

```bash
cd frontend
npm install
npm run dev             # http://localhost:3000
```

---

## Tests de base

```bash
# Vérifier que l'API répond
curl http://localhost:3001/api/v1/health

# Soumettre une analyse
curl -X POST http://localhost:3001/api/v1/analyses \
  -H "Content-Type: application/json" \
  -d '{"url":"https://example.com","email":"test@test.com","cfTurnstileToken":"dev-bypass"}'
```

---

## Déploiement

### Backend → Render.com

1. Créer un compte sur https://render.com
2. "New Web Service" → connecter votre repo GitHub
3. Root Directory: `backend`
4. Build: `npm install && npm run prisma:generate && npm run build`
5. Start: `node dist/main`
6. Renseigner toutes les variables d'env dans le dashboard Render

### Frontend → Vercel

1. Créer un compte sur https://vercel.com
2. "New Project" → importer votre repo GitHub
3. Root Directory: `frontend`
4. Renseigner `NEXT_PUBLIC_API_URL` = URL de votre backend Render

---

## Architecture des modules NestJS

```
src/
├── main.ts                    # Bootstrap, Helmet, CORS, ValidationPipe
├── app.module.ts              # Root module
├── config/configuration.ts   # Config typée + validation Joi
├── prisma/                    # Service BDD (singleton)
├── redis/                     # BullMQ + Redis setup
├── common/
│   ├── filters/               # GlobalExceptionFilter
│   ├── interceptors/          # TransformInterceptor
│   ├── validators/            # URL validator + hashUrl
│   └── decorators/            # @ClientIp()
├── analyses/
│   ├── analyses.controller.ts # POST /analyses, GET /:id, SSE /:id/stream
│   ├── analyses.service.ts    # Logique métier + cache < 24h
│   ├── analyses.worker.ts     # BullMQ worker (retry 3x + DLQ)
│   └── dto/                   # CreateAnalysisDto (validated)
├── pagespeed/                 # Google PageSpeed API
├── screenshot/                # Browserless.io
├── cloudinary/                # Upload screenshots
├── brevo/                     # Emails transactionnels
└── sse/                       # Server-Sent Events (temps réel)
```

---

## Sécurité

- Helmet (headers HTTP)
- CORS restreint au domaine frontend
- ValidationPipe (whitelist + forbidNonWhitelisted)
- ThrottlerModule (10/min, 30/h, 100/jour)
- Cloudflare Turnstile CAPTCHA
- Validation URL stricte (blacklist IPs privées, HTTPS only)
- IP masquée avant stockage (RGPD)
- Soft delete (deletedAt)
