# 🎓 EduBuddy AI
## A Dual-Purpose Classroom Robot for Academic Support and Emotional Wellbeing of Primary School Students

EduBuddy is an intelligent educational learning companion designed to provide primary school students with personalized academic assistance and emotional support.

It combines Artificial Intelligence, Machine Learning, Natural Language Processing and Computer Vision to understand students' learning needs, monitor academic progress and recognize emotional patterns.

The platform provides dedicated dashboards for administrators, teachers and students, creating a supportive and personalized educational environment.

---

## 🌟 Key Features

### 👩‍🎓 Student Dashboard

- Personalized learning assistance.
- AI-powered educational chatbot.
- Subject-specific learning support using uploaded notes.
- Academic performance tracking.
- Text-based emotion detection.
- Facial emotion recognition using a camera.
- AI-powered emotional support through a 3D robot assistant.
- Voice-based interaction and speech transcription.

### 👩‍🏫 Teacher Dashboard

- View assigned classes and students.
- Monitor individual student progress.
- Access academic performance reports.
- Predict students' expected grades using XGBoost.
- View emotional insights and wellbeing alerts.
- Identify students who may need additional support.
- Upload and manage learning materials.

### 👨‍💻 Admin Dashboard

- Manage teachers and students.
- Create and manage classes.
- Add subjects.
- Assign teachers to subjects.
- Enroll students into classes.

### 🧠 Artificial Intelligence & Machine Learning

**1. Text Emotion Detection**
- Uses a fine-tuned DistilBERT model.
- Analyzes students' written messages.
- Identifies emotional categories.
- Supports emotionally aware responses.

**2. Facial Emotion Recognition**
- Uses face-api.js and computer vision.
- Analyzes facial expressions in the browser.
- Supports camera-based emotional check-ins.

**3. Academic Performance Prediction**
- Uses XGBoost.
- Analyzes student performance data.
- Predicts expected academic grades.
- Helps identify students who may need additional academic support.

**4. AI Emotional Support Assistant**
- Provides conversational support.
- Uses Groq-powered AI chat.
- Supports voice interaction through Whisper speech transcription.
- Can surface concerning emotional patterns to teachers.

**5. Personalized Academic Assistance**
- Uses Retrieval-Augmented Generation (RAG).
- Creates embeddings from uploaded educational notes using Gemini.
- Provides subject-specific answers.
- Adapts academic assistance to student performance levels.

---

## 🏗️ System Architecture

EduBuddy consists of two main services:

```text
                STUDENT / TEACHER
                       |
                       v
              NEXT.JS WEB APPLICATION
                  Port 3000
                       |
          +------------+------------+
          |            |            |
          v            v            v
       SQLite       Groq API     Gemini API
       Database     AI Chat      Embeddings
          |
          |
          v
       PYTHON ML SERVICE
          Port 5000
          |
       +--+----------------+
       |                   |
       v                   v
   XGBoost              DistilBERT
   Grade Prediction     Text Emotion
```

Facial emotion recognition runs separately in the student's browser using face-api.js.

---

## 🛠️ Technology Stack

| Component | Technologies |
|---|---|
| Frontend | Next.js 14, React |
| Backend | Next.js API Routes |
| Programming Languages | JavaScript, Python |
| Database | SQLite |
| Authentication | JWT, bcrypt |
| AI Chat | Groq API |
| Speech Recognition | Whisper |
| AI Embeddings | Google Gemini |
| Text Emotion Detection | DistilBERT |
| Facial Emotion Recognition | face-api.js |
| Academic Prediction | XGBoost |
| 3D Robot | Three.js |
| Python API | FastAPI / configured Python service |
| Version Control | Git and GitHub |
| Development Environment | Visual Studio Code |

---

## 📁 Project Structure

```text
edubuddy-ai/
│
├── distilbert_emotion/
│   ├── config.json
│   ├── tokenizer.json
│   └── tokenizer_config.json
│
├── ml-service/
│   ├── models/
│   ├── app.py
│   ├── config.py
│   ├── emotion.py
│   ├── grade.py
│   ├── train_grade.py
│   └── requirements.txt
│
├── performance_prediction/
│   └── Student_performance_data.csv
│
├── public/
│   ├── models/
│   ├── robot/
│   └── vendor/
│
├── scripts/
│   └── seed.mjs
│
├── src/
│   ├── app/
│   │   ├── admin/
│   │   ├── api/
│   │   ├── login/
│   │   ├── student/
│   │   └── teacher/
│   │
│   ├── components/
│   └── lib/
│
├── .env.example
├── .gitignore
├── package.json
├── package-lock.json
├── next.config.mjs
└── README.md
```

---

## ⚙️ Installation and Setup

### Prerequisites

- Node.js 22 or later.
- Python 3.11 or a compatible supported version.
- npm.
- Groq API key.
- Google Gemini API key.

### 1. Clone the Repository

```bash
git clone https://github.com/hamna321/edubuddy-ai.git
cd edubuddy-ai
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root.

Add the environment variables required by your application:

```env
JWT_SECRET=your_secure_secret
ML_SERVICE_KEY=your_internal_secret
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.3-70b-versatile
GROQ_STT_MODEL=whisper-large-v3-turbo
GEMINI_API_KEY=your_gemini_api_key
ML_SERVICE_URL=http://localhost:5000
```

Use your actual credentials in `.env.local`.

**Never upload API keys, passwords or private credentials to GitHub.**

### 4. Start the Next.js Application

```bash
npm run dev
```

Open your browser:

http://localhost:3000

### 5. Set Up the Python ML Service

Open a second terminal:

```powershell
cd ml-service
```

Create a virtual environment:

```powershell
python -m venv venv
```

Activate it:

```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```powershell
pip install -r requirements.txt
```

Start the ML service:

```powershell
python app.py
```

The ML service is configured to run at:

http://localhost:5000

The web application can run without the ML service, but grade prediction and text emotion features require the service to be available.

---

## 📊 Machine Learning Modules

| Module | Model / Technology | Purpose |
|---|---|---|
| Text Emotion Detection | DistilBERT | Understands students' emotional expressions through text |
| Facial Emotion Recognition | face-api.js | Analyzes facial expressions |
| Academic Performance Prediction | XGBoost | Predicts expected student grades |
| Personalized Learning | Gemini Embeddings + RAG | Answers subject-specific academic questions |
| AI Emotional Support | Groq + Llama | Provides conversational emotional support |
| Speech Transcription | Whisper | Converts voice into text |

---

## 🎯 Project Objectives

1. Improve personalized learning experiences.
2. Support students through AI-powered educational assistance.
3. Monitor academic progress and identify learning difficulties.
4. Recognize emotional patterns using AI.
5. Encourage communication between students and teachers.
6. Provide teachers with useful academic and wellbeing insights.
7. Create a more supportive and engaging digital learning environment.

---

## ☁️ Deployment Architecture

EduBuddy currently uses a local-first architecture with SQLite and a separate Python ML service.

The planned cloud deployment includes:

| Service | Purpose |
|---|---|
| Vercel | Next.js web application hosting |
| Render / Railway | Python machine-learning API hosting |
| Turso / PostgreSQL | Hosted database |
| Cloud Blob Storage | Uploaded notes and documents |

**Important deployment considerations:**

- Vercel's serverless filesystem is not suitable for persistent SQLite database storage.
- SQLite should be replaced with a suitable hosted database or hosted separately.
- The Python ML service must be deployed separately.
- Uploaded files need persistent cloud storage.
- Production environment variables must be configured securely.

---

## 🔐 Privacy and Responsible AI

EduBuddy is designed to support educational activities and student wellbeing.

- Student information should be protected.
- API credentials must be stored securely.
- Emotion recognition should be treated as an approximate prediction, not a psychological diagnosis.
- Emotional insights should support teachers, not replace professional judgement.
- Student information and camera data should be handled responsibly.
- Teacher notifications should only be reported as delivered when successfully confirmed.

---

## 🔮 Future Improvements

- Advanced personalized recommendation systems.
- Improved multilingual AI support.
- Real-time teacher notification system.
- Enhanced facial emotion recognition.
- Learning analytics and interactive reports.
- Mobile application integration.
- Improved AI-based academic recommendations.

---

## 👩‍💻 Project Information

**Project Name:** EduBuddy: A Dual-Purpose Classroom Robot for Academic Support and Emotional Wellbeing of Primary School Students

**Category:** Artificial Intelligence | Educational Technology | Machine Learning

**Purpose:** AI-powered personalized learning and emotional support.

**GitHub Repository:** https://github.com/hamna321/edubuddy-ai

---

*EduBuddy AI — Making Learning Smarter, More Personal, and More Caring. 💜*
