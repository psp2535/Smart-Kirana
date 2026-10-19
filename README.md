# BizNova (Smart Kirana) – AI-Integrated Retail Platform

A full-stack MERN platform that helps small kirana (grocery) shop owners run their business: inventory, sales, expenses, profit reports, and an AI assistant that answers questions from the shop's own data.

**Live demo:** https://smart-kirana-beta.vercel.app
**Backend API:** https://smart-kirana-backend-7qlq.onrender.com/health

> The backend runs on Render's free tier, so the first request after a period of inactivity can take 30–60 seconds while it wakes up.

---

## Features

### For retailers(shop owners)
- **Dashboard** – today's sales, profit, low-stock alerts and charts
- **Inventory, sales and expenses** – full tracking with automatic stock deduction on every sale
- **Profit analytics** – daily trends, top products, sales by category and month-over-month comparison
- **AI business assistant** – ask "what were my sales today?" or "which items are running low?" and get answers based on your real data
- **AI bill scanner** – upload a photo of a purchase bill; items are read by Gemini Vision and added to inventory
- **Voice and text commands** – "add 10 kg rice" or "sold 2 milk packets" in English, Hindi or Telugu, with a confirmation step before anything is written to the database
- **Business Health Score (0–100)** – rates the shop on profit margin, stock health, sales consistency and inventory efficiency, with tips to improve
- **Festival demand alerts** – finds the next upcoming festival and flags items to restock based on past sales and current stock
- **Smart discounts** – suggests discounts for items that are close to expiry or selling slowly, and publishes them as "Hot Deals"

### For customers
- Find nearby shops by location
- Browse deals and place orders through a shop's AI chat assistant

### For wholesalers
- List products and receive orders from retailers
- Track orders through Requested → Accepted → Packed → Dispatched → Delivered, with payment status

---

## Tech Stack

| Layer | Technologies |
| --- | --- |
| Frontend | React 18, Tailwind CSS, Recharts, i18next (EN / HI / TE), ZXing barcode scanning |
| Backend | Node.js, Express.js, JWT, bcrypt, express-rate-limit, express-validator, Multer, Nodemailer |
| Database | MongoDB Atlas with Mongoose (13 collections, compound and geospatial indexes) |
| AI | Google Gemini 2.5 Flash (assistant, insights, vision); OpenAI gpt-4o-mini (conversational commands) |
| Hosting | Vercel (frontend), Render (backend), MongoDB Atlas (database) |

---

## How It Works

```
React (Vercel)  ──HTTPS + JWT──▶  Express API (Render)  ──▶  MongoDB Atlas
                                        │
                                        └──▶  Gemini / OpenAI APIs
```

- **Authentication:** users log in with phone number and password. The backend issues a JWT, and middleware checks the user's role (retailer, customer or wholesaler) on protected routes. Login and password-reset routes are rate-limited.
- **AI assistant:** when a retailer asks a question, the backend loads their inventory, sales, expenses, health score and festival forecast in parallel (`Promise.all`), builds a prompt from that data, and sends it to Gemini.
- **Safe AI actions:** for commands that change data, the AI first returns a structured action. The app shows a confirmation ("Add 10 kg rice?") and only writes to the database after the user says yes.
- **Reports:** sales and profit reports use MongoDB aggregation pipelines, backed by compound indexes such as `{ user_id: 1, date: -1 }`.

---

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- Google Gemini API key

### Installation

```bash
git clone https://github.com/psp2535/Smart-Kirana.git
cd Smart-Kirana
npm run install-all
```

### Environment variables

Copy the example files and fill in your values:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

**backend/.env** (required)

| Variable | Description |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_SECRET` | Any long random string |
| `GEMINI_API_KEY` | Google Gemini API key |
| `FRONTEND_URL` | Frontend URL allowed by CORS, e.g. `http://localhost:3000` |

Optional: `OPENAI_API_KEY` (conversational commands), `EMAIL_*` (password-reset emails). See `backend/.env.example` for the full list.

**frontend/.env**

| Variable | Description |
| --- | --- |
| `REACT_APP_API_URL` | Backend URL without `/api`, e.g. `http://localhost:5000` |

### Run locally

```bash
npm run dev
```

Frontend runs on http://localhost:3000 and backend on http://localhost:5000.

---

## Key API Endpoints

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/api/auth/register`, `/api/auth/login` | Retailer sign-up and login |
| GET / POST | `/api/inventory` | List and add products |
| POST | `/api/inventory/parse-bill` | Read items from a bill photo (Gemini Vision) |
| GET / POST | `/api/sales` | List and record sales (updates stock) |
| GET | `/api/profit-analytics/top-products` | Best-selling products |
| GET | `/api/profit-analytics/time-series` | Sales vs. expenses over time |
| POST | `/api/chatbot/chat` | Retailer AI assistant |
| POST | `/api/conversational/parse` → `/execute` | Voice/text command with confirmation |
| GET | `/api/campaigns/recommendations` | Smart discount suggestions |
| GET | `/api/wholesalers/nearby` | Find nearby wholesalers (`$near` geo-query) |
| POST | `/api/wholesalers/orders` | Place an order with a wholesaler |
| GET | `/health` | Health check |

---

## Project Structure

```
Smart-Kirana/
├── backend/
│   ├── src/
│   │   ├── config/        # MongoDB connection
│   │   ├── controllers/   # Request handlers (sales, inventory, AI, bill scan, ...)
│   │   ├── middleware/    # JWT auth, rate limiting, validation
│   │   ├── models/        # Mongoose schemas
│   │   ├── routes/        # API routes
│   │   ├── services/      # Gemini, health score, festival forecast, discounts
│   │   └── server.js      # App entry point
│   └── smartkirana_festival_dataset_150.csv
├── frontend/
│   ├── public/locales/    # Translations (en, hi, te)
│   └── src/
│       ├── components/    # Chatbots, charts, POS, notifications
│       ├── pages/         # Retailer, customer and wholesaler dashboards
│       ├── services/      # API client
│       └── contexts/      # Auth and theme state
├── render.yaml            # Render backend config
└── DEPLOYMENT.md          # Deployment guide
```

---

## Deployment

- **Backend:** Render, configured by `render.yaml`. Set the secret environment variables in the Render dashboard.
- **Frontend:** Vercel, with Root Directory set to `frontend`. Set `REACT_APP_API_URL` to the Render backend URL.
- **Database:** MongoDB Atlas. Allow network access from `0.0.0.0/0`, since Render's IP addresses change.

After deploying the frontend, set `FRONTEND_URL` on Render to the Vercel URL so CORS allows it.

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the detailed guide.

---

## Team

Built by a team of three:

| Name | GitHub | LinkedIn |
| --- | --- | --- |
| Pathange Sai Pranav | [@psp2535](https://github.com/psp2535) | [LinkedIn](https://www.linkedin.com/in/pathangesaipranav/) |
| Surendra Chakali | [@suri5790](https://github.com/suri5790) | [LinkedIn](https://www.linkedin.com/in/surendrachakali/) |
| Duppala Satwik | [@Satwik2529](https://github.com/Satwik2529) | [LinkedIn](https://www.linkedin.com/in/satwik2529dsk/) |

---

## License

mit
