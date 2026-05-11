# 🌍 EeezTrip — AI-Powered Mood-Based Travel Planner

<div align="center">

![EeezTrip Banner](https://img.shields.io/badge/EeezTrip-AI%20Travel%20Planner-blue?style=for-the-badge)

![React](https://img.shields.io/badge/Frontend-React%2018-61DAFB?style=flat&logo=react)
![TypeScript](https://img.shields.io/badge/Language-TypeScript-3178C6?style=flat&logo=typescript)
![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688?style=flat&logo=fastapi)
![MongoDB](https://img.shields.io/badge/Database-MongoDB-47A248?style=flat&logo=mongodb)
![Ollama](https://img.shields.io/badge/AI-Ollama-black?style=flat)
![TailwindCSS](https://img.shields.io/badge/UI-TailwindCSS-38B2AC?style=flat&logo=tailwind-css)
![Vite](https://img.shields.io/badge/Bundler-Vite-646CFF?style=flat&logo=vite)

### ✨ Discover Trips Based on Your Mood, Budget & Travel Style

**EeezTrip** is a premium AI-powered travel planning platform that creates personalized travel itineraries using local LLMs, real-time pricing systems, and mood-driven recommendations.

From romantic getaways to foodie adventures, EeezTrip transforms travel planning into an intelligent and immersive experience.

</div>

---

# 🚀 Features

## 🧠 AI Itinerary Engine

Generate curated **2–14 day travel itineraries** powered by local LLMs using **Ollama**.

### Features
- Smart destination recommendations
- Day-by-day trip planning
- Estimated cost breakdowns
- Transportation & hotel suggestions
- Adaptive responses based on user preferences

### Supported Models
- Gemma
- Mistral
- Other Ollama-compatible LLMs

---

## 🎯 Mood Discovery System

A visually interactive recommendation engine where users choose their travel “vibe”.

### Supported Moods
- 🌴 Relaxed
- 🧗 Adventure
- 💖 Romantic
- 🍜 Foodie
- 🎉 Party
- 🏕 Nature
- 🏛 Cultural
- 💼 Luxury

The system analyzes mood, budget, duration, and interests to recommend ideal destinations.

---

## 🔥 Deep Mode

A high-precision itinerary generation mode for:

- Multi-city travel
- Budget optimization
- Complex requirements
- Group travel constraints
- Detailed scheduling

Deep Mode performs extended reasoning and enhanced itinerary generation for premium planning quality.

---

## 💰 Real-Time Pricing Engine

Integrated scraping and search systems fetch live pricing data in **INR** for:

- ✈ Flights
- 🏨 Hotels
- 🚖 Cabs & Local Transport

### Powered By
- SerpApi
- Custom scraping utilities
- Google Search extraction pipelines

---

## 👥 Group Sync

Collaborative travel planning system that allows multiple users to:

- Join shared planning sessions
- Vote on destinations
- Collaboratively build itineraries
- Sync travel preferences
- Share bookings and schedules

---

## 🎤 Voice ChatBot Assistant

AI-powered travel assistant with:

- Voice input
- Voice transcription
- Conversational trip planning
- Natural language itinerary modifications

### Built Using
- Web Speech API
- FastAPI transcription endpoints

---

## 📊 User Dashboard

Centralized dashboard for users to manage:

- Saved itineraries
- Active bookings
- Travel reviews
- Group sessions
- Trip history
- Preferences

---

# 🏗 Architecture Overview

```text
┌──────────────────────────┐
│        Frontend          │
│ React + TypeScript + UI │
└────────────┬─────────────┘
             │ REST API
             ▼
┌──────────────────────────┐
│        FastAPI API       │
│  Authentication Layer    │
│  AI Generation Engine    │
│  Pricing Services        │
│  Voice Processing        │
└────────────┬─────────────┘
             │
   ┌─────────┼─────────┐
   ▼         ▼         ▼
Ollama   MongoDB   External APIs
(Local)   Atlas     (SerpApi,
                      Images)
```

---

# 🖥 Frontend Architecture

## ⚛ Frontend Stack

| Technology | Purpose |
|---|---|
| React 18 | Component-based UI |
| TypeScript | Type safety |
| Vite | Fast build tooling |
| Tailwind CSS | Styling system |
| tripStore | Custom state management |

---

## 📁 Frontend Structure

```bash
frontend/
├── src/
│   ├── components/
│   ├── pages/
│   ├── routes/
│   ├── services/
│   ├── hooks/
│   ├── store/
│   ├── utils/
│   └── assets/
├── public/
└── package.json
```

---

## 🔄 Frontend Routing

| Route | Description |
|---|---|
| `/` | Landing page |
| `/discover` | Mood discovery flow |
| `/planner` | AI itinerary generator |
| `/dashboard` | User dashboard |
| `/group-sync` | Collaborative planning |
| `/voice-assistant` | Voice chatbot |
| `/saved-trips` | Stored itineraries |

---

# ⚙ Backend Architecture

## 🐍 Backend Stack

| Technology | Purpose |
|---|---|
| FastAPI | REST API backend |
| Python 3.14+ | Core backend language |
| Motor | Async MongoDB driver |
| Ollama | Local LLM execution |
| MongoDB Atlas | Cloud database |

---

## 📁 Backend Structure

```bash
backend/
├── app/
│   ├── api/
│   ├── services/
│   ├── models/
│   ├── schemas/
│   ├── database/
│   ├── ai/
│   └── utils/
├── requirements.txt
└── main.py
```

---

## 🔌 API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/generate-trip` | POST | Generate AI itinerary |
| `/deep-mode` | POST | Advanced itinerary generation |
| `/pricing/flights` | GET | Fetch flight pricing |
| `/pricing/hotels` | GET | Fetch hotel pricing |
| `/voice/transcribe` | POST | Voice transcription |
| `/group/create` | POST | Create group session |
| `/dashboard/trips` | GET | Fetch user trips |

---

# 🤖 AI System

## Ollama Integration

EeezTrip uses **local LLMs** through Ollama to ensure:

- Faster response times
- Privacy-focused AI execution
- Offline capability
- Lower operational cost
- Full customization of prompts

### Supported Models

```bash
ollama run gemma
ollama run mistral
```

---

# 🗄 Database Design

## MongoDB Collections

```text
users
trips
bookings
reviews
group_sessions
pricing_cache
voice_logs
```

---

# 🛠 Installation & Setup

# 1️⃣ Clone Repository

```bash
git clone https://github.com/your-username/eeeztrip.git

cd eeeztrip
```

---

# 2️⃣ Setup Backend

## Create Virtual Environment

```bash
cd backend

python -m venv venv
```

### Activate Environment

#### Windows

```bash
venv\Scripts\activate
```

#### Linux / macOS

```bash
source venv/bin/activate
```

---

## Install Dependencies

```bash
pip install -r requirements.txt
```

---

# 3️⃣ Install & Run Ollama

## Install Ollama

Visit:
https://ollama.com/download

---

## Pull Required Models

```bash
ollama pull gemma
ollama pull mistral
```

---

## Start Ollama

```bash
ollama serve
```

---

# 4️⃣ Setup Frontend

```bash
cd frontend

npm install
```

---

# 5️⃣ Configure Environment Variables

Create a `.env` file in both frontend and backend.

---

## Backend `.env`

```env
MONGODB_URI=your_mongodb_connection_string

SERPAPI_API_KEY=your_serpapi_key

OLLAMA_MODEL=gemma

OLLAMA_BASE_URL=http://localhost:11434

DATABASE_NAME=eeeztrip

SECRET_KEY=your_secret_key
```

---

## Frontend `.env`

```env
VITE_API_BASE_URL=http://localhost:8000

VITE_APP_NAME=EeezTrip
```

---

# 6️⃣ Start Backend Server

```bash
uvicorn main:app --reload
```

Backend runs on:

```text
http://localhost:8000
```

---

# 7️⃣ Start Frontend

```bash
npm run dev
```

Frontend runs on:

```text
http://localhost:5173
```

---

# 🌐 External Integrations

| Service | Purpose |
|---|---|
| SerpApi | Real-time search pricing |
| Unsplash | Destination imagery |
| Pexels | Travel photos |
| Web Speech API | Voice input |
| Ollama | Local AI generation |

---

# 🔒 Security & Performance

## Security
- Environment variable protection
- Secure API handling
- MongoDB Atlas authentication
- Local AI inference support

## Performance
- Async FastAPI endpoints
- Optimized AI prompts
- Cached pricing results
- Efficient frontend rendering
- Lazy-loaded pages

---

# 📈 Future Roadmap

## 🚀 Planned Features

- 🌍 Multi-language support
- 📱 Mobile application
- 🧳 AI packing assistant
- 🛰 Offline itinerary access
- 🧠 Personalized memory-based recommendations
- 🛂 Visa & documentation assistant
- 📊 AI travel analytics
- 🏨 Direct booking integration
- 🧭 Smart navigation assistant
- 🎟 Event & festival recommendations

---

# 🧪 Development Goals

- Improve itinerary realism
- Faster pricing aggregation
- Enhanced AI reasoning
- Better collaborative planning
- Smarter recommendation ranking

---

# 🤝 Contributing

Contributions are welcome!

```bash
# Fork the repository
# Create a feature branch
git checkout -b feature/amazing-feature

# Commit your changes
git commit -m "Add amazing feature"

# Push to branch
git push origin feature/amazing-feature
```

---

# 📄 License

This project is licensed under the MIT License.

---

# 💡 Vision

EeezTrip aims to redefine travel planning by combining:

- Artificial Intelligence
- Real-time travel intelligence
- Mood-based personalization
- Collaborative planning
- Voice-first interaction

into one seamless travel ecosystem.

---

<div align="center">

## ✈️ Travel Smarter with AI

### Built with ❤️ using React, FastAPI, Ollama & MongoDB

</div>
