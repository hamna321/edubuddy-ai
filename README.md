**EduBuddy: A Dual-Purpose Classroom Robot for Academic Support and Emotional Wellbeing of Primary School Students**

EduBuddy AI is an intelligent learning companion designed to create a supportive and personalized educational experience for students. It uses Artificial Intelligence and Machine Learning to understand students' learning needs, monitor academic progress, and recognize emotional states.

The platform provides dedicated dashboards for students and teachers, helping improve learning outcomes while supporting students' emotional well-being.

---

## 🌟 Key Features

### 👩‍🎓 Student Dashboard

- Personalized learning assistance.
- AI-powered educational chatbot.
- Subject-specific learning support.
- Upload and access learning notes.
- Academic performance tracking.
- Text-based emotion detection.
- Facial emotion recognition.
- AI-powered emotional support through a robot assistant.

### 👩‍🏫 Teacher Dashboard

- View assigned classes and students.
- Monitor individual student progress.
- Access student academic performance reports.
- View emotional insights and trends.
- Identify students who may need additional support.
- Support personalized teaching strategies.

### 🧠 Artificial Intelligence & Machine Learning

EduBuddy integrates machine-learning technologies to provide intelligent educational support.

**Text Emotion Detection**
- Analyzes student messages.
- Identifies emotional categories.
- Generates supportive responses.

**Facial Emotion Recognition**
- Uses computer vision to analyze facial expressions.
- Recognizes emotional patterns.
- Supports emotional awareness.

**Academic Performance Prediction**
- Analyzes student performance data.
- Predicts academic outcomes.
- Helps identify students who may need additional academic support.

**AI Emotional Support Assistant**
- Provides empathetic conversational responses.
- Offers supportive interactions.
- Can trigger teacher-support workflows.

---

## 🛠️ Technology Stack

| Component | Technologies |
|---|---|
| Frontend | Next.js, React |
| Backend | Next.js API Routes |
| Programming Languages | JavaScript, Python |
| Machine Learning | TensorFlow, Scikit-learn, XGBoost |
| AI Integration | Groq API |
| Database | SQLite (local development) |
| Python API | FastAPI/Uvicorn or Flask, according to service configuration |
| Development Environment | Visual Studio Code |
| Version Control | Git and GitHub |

---

## 📁 Project Structure

```text
edubuddy-ai/
│
├── src/
│   └── app/
│       └── api/
│           ├── student/
│           └── robot/
│
├── public/
│
├── data/
│   └── edubuddy.db
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
├── package.json
├── package-lock.json
├── .gitignore
└── README.md
```

---

## ⚙️ Installation and Setup

### 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
cd edubuddy-ai
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root.

Add the environment variables required by your application.

Example:

```env
JWT_SECRET=your_secure_secret
GROQ_API_KEY=your_groq_api_key
ML_API_URL=http://localhost:5000
```

Never upload API keys, passwords, or private credentials to GitHub.

### 4. Start the Next.js Application

```bash
npm run dev
```

Open your browser:

http://localhost:3000

### 5. Set Up the Python ML Service

Open a second terminal:

```bash
cd ml-service
```

Create a Python virtual environment:

```bash
python -m venv venv
```

Activate it on Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the ML service:

```bash
python app.py
```

The ML service is expected to run on:

http://localhost:5000

---

## 📊 Machine Learning Modules

| Module | Purpose |
|---|---|
| Text Emotion Detection | Understands students' emotional expressions through text |
| Facial Emotion Recognition | Analyzes facial expressions using computer vision |
| Academic Performance Prediction | Estimates student academic performance |
| AI Emotional Support | Provides empathetic AI-based conversations |

---

## 🚀 Deployment Architecture

The planned cloud deployment architecture includes:

- **Vercel:** Next.js application hosting.
- **Render:** Python machine-learning API hosting.
- **Supabase:** PostgreSQL database and file storage.

Deployment configuration and environment variables will be added as the application moves to production.

---

## 🎯 Project Objectives

1. Improve personalized learning experiences.
2. Support students through AI-powered educational assistance.
3. Monitor academic progress and identify learning difficulties.
4. Recognize emotional patterns using AI.
5. Encourage communication between students and teachers.
6. Create a more supportive and engaging digital learning environment.

---

## 🔮 Future Improvements

- Advanced personalized recommendation systems.
- Improved multilingual AI support.
- Real-time teacher notification system.
- Enhanced facial emotion recognition.
- Learning analytics and interactive reports.
- Mobile application integration.

---

## 🔐 Privacy and Responsible AI

EduBuddy is designed to support educational activities and student well-being.

- Student information should be protected.
- API credentials must be stored securely.
- Emotion recognition should be treated as an approximate prediction, not a psychological diagnosis.
- Teacher notifications should only be reported as delivered when successfully confirmed.

---

## 👩‍💻 Project Information

**Project Name:** EduBuddy: A Dual-Purpose Classroom Robot for Academic Support and Emotional Wellbeing of Primary School Students

**Category:** Artificial Intelligence | Educational Technology | Machine Learning

**Purpose:** AI-powered personalized learning and emotional support.

---

*EduBuddy AI – Making Learning Smarter, More Personal, and More Caring. 💜*
