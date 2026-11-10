# 🎓 EduBuddy — Smart School Portal

A role-based school platform with three logins — **Admin**, **Teacher**, **Student** — that combines a clean web app with real AI:

- **Admin** enrolls teachers & students, builds classes, adds subjects, and assigns each subject to a teacher.
- **Teacher** sees their classes & students, uploads PDF/PPT/DOC notes (auto text-extracted + embedded), predicts each student's **expected grade** (XGBoost), and reviews **wellbeing alerts**.
- **Student** gets two things:
  - **Academic Help** — chat with the teacher's notes (RAG over **Gemini embeddings**), answered by a friendly 3D robot and tuned to the student's performance level.
  - **Emotional Support** — a **camera check-in** (in-browser computer vision) *or* a voice/text chat whose emotion is read by a fine-tuned **DistilBERT** model. Concerning emotions are quietly surfaced to the relevant teacher.

---

## 🧱 Architecture

```
┌────────────────────────────┐        ┌──────────────────────────────┐
│  web/  (Next.js, port 3000)│  HTTP  │ ml-service/ (FastAPI :5000)  │
│  • Auth (JWT) + SQLite     │ ─────▶ │  • XGBoost  → grade band     │
│  • Admin / Teacher / Student│        │  • DistilBERT → text emotion │
│  • Notes RAG (Gemini embed)│        └──────────────────────────────┘
│  • Groq chat + Whisper STT │
│  • face-api.js camera CV   │ (runs in the student's browser)
└────────────────────────────┘
```

| Concern | Tech |
|---|---|
| Web framework | Next.js 14 (App Router, JavaScript) |
| Database | **SQLite** via Node's built-in `node:sqlite` (no native build) |
| Auth | JWT in an HttpOnly cookie, bcrypt password hashing |
| Note embeddings / RAG | **Google Gemini** `gemini-embedding-001` |
| Robot chat + voice | **Groq** (Llama chat + Whisper transcription) |
| Grade prediction | **XGBoost** (trained on `performance_prediction/`) |
| Text emotion | fine-tuned **DistilBERT** (in `distilbert_emotion/`) |
| Camera emotion | **face-api.js** (fully client-side, vendored offline) |
| 3D robot | Three.js (in `web/public/robot/`) |

---

## ✅ Prerequisites

- **Node.js 22+** (this project is tested on Node 24 — `node:sqlite` needs ≥ 22)
- **Python 3.11–3.14** for the ML service
- A **Groq** API key (already configured in `web/.env.local`)
- A **Google Gemini** API key — <https://aistudio.google.com/apikey>

---

## 🚀 Run it (two terminals)

### 1) Web app

```bash
cd web
npm install
cp .env.example .env.local      # then fill in GROQ_API_KEY and GEMINI_API_KEY
npm run seed                    # optional: demo teacher/students/class
npm run dev
```

Open <http://localhost:3000>.

### 2) ML service (grades + text emotion)

```bash
cd ml-service
pip install -r requirements.txt
python train_grade.py           # trains XGBoost -> models/grade_xgb.json
python calibrate_emotion.py     # recovers the DistilBERT label names (one-time)
python app.py                   # serves on http://localhost:5000
```

> The web app still runs without the ML service — grade prediction and text-emotion
> just show a friendly "ML service offline" message until it's up.

---

## 🔑 Demo accounts (after `npm run seed`)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@edubuddy.local` | `admin123` |
| Teacher | `sara@edubuddy.local` | `teach123` |
| Student | `ali@edubuddy.local` | `learn123` |

*(The admin account is auto-created on first launch even without seeding.)*

---

## 🧭 Feature walkthrough

1. **Admin** → *Teachers/Students* enroll people (a temp password is shown to share);
   *Classes* → create a class → add subjects → assign a teacher → enroll students.
2. **Teacher** → open a subject → **Notes** tab: upload a PDF/PPT/DOC (text is extracted,
   chunked, embedded). **Students & Grades** tab: click *Predict* to run XGBoost on a
   student's profile. **Wellbeing Alerts**: emotion signals from students.
3. **Student** → **Academic Help**: pick a subject, ask questions — answers come from the
   uploaded notes and adapt to your predicted level. **Emotional Support**: do a camera
   check-in or just chat; if you seem to be struggling, the right teacher is notified.

---

## ⚙️ Environment variables (`web/.env.local`)

| Var | Purpose |
|---|---|
| `JWT_SECRET` | Signs session cookies |
| `GROQ_API_KEY` | Robot chat + voice transcription |
| `GEMINI_API_KEY` | Note embeddings for RAG |
| `GEMINI_EMBED_MODEL` | `gemini-embedding-001` (default) |
| `ML_SERVICE_URL` | `http://localhost:5000` |
| `DATA_DIR` / `UPLOAD_DIR` | Where SQLite + uploads live |

---

## ☁️ Deploying

This build is **local-first** (SQLite + a local Python ML service). To put it online:

- **Web app on Vercel** works, but Vercel's filesystem is ephemeral — swap SQLite for a
  hosted database (e.g. Turso/libSQL, Postgres) and move uploads to blob storage.
- **ML service** (DistilBERT + XGBoost) can't run inside a Vercel function; host it on
  Render / Railway / a HuggingFace Space and point `ML_SERVICE_URL` at it.
- The **camera** emotion runs entirely in the browser, so it needs no server.

---
## Run the project using It.
-----------------------------
cd web 
npm run dev
-----------------------------



-----------------------------

cd ml-service 
pip install -r requirements.txt
python app.py

-----------------------------
