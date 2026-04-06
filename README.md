# 🚀 Smart Kirana - AI-Powered Retail Operating System

> **Empowering small retailers with the intelligence of Google Gemini.**  
> Smart Kirana is a comprehensive, AI-driven platform designed to modernize inventory, sales, and customer engagement for small businesses.

---

## 🎯 Overview

Smart Kirana transforms traditional retail into a data-driven business. By leveraging **Google Gemini AI**, the platform automates manual tasks like bill scanning, provides deep business insights, and offers personalized experiences for customers and wholesalers alike.

## ✨ Key Features

### 🤖 AI Capabilities (Powered by Google Gemini)
- **Smart Bill Scanner**: Instant inventory and sales entry via vision-based scanning.
- **Retailer AI Copilot**: A conversational assistant for managing tasks, checking stock, and getting business advice.
- **Customer AI Assistant**: Personalized product discovery and query resolution for shoppers.
- **AI Business Insights**: Automated analysis of sales trends, profit margins, and inventory forecasting.
- **Conversational Actions**: Execute complex business operations using natural language.

### 🏢 Retailer Management
- **Dashboard**: Real-time metrics including total sales, profits, and low-stock alerts.
- **Inventory Control**: Comprehensive tracking with automated updates and historical logs.
- **Sales & POS**: Integrated point-of-sale with QR/Barcode scanning (ZXing).
- **Expense Tracking**: Detailed categorization and spending analysis.
- **Campaign Manager**: Create and manage AI-driven discount campaigns and "Hot Deals."

### 🛍️ Customer Experience
- **Personalized Dashboards**: Shoppers can track purchases, discover deals, and find nearby shops.
- **Interactive Discovery**: AI-powered search and recommendation engine.
- **Loyalty & Deals**: Real-time notifications for store-specific offers and campaigns.

### 🤝 Wholesaler Ecosystem
- **Wholesaler Discovery**: Help retailers find and connect with suppliers.
- **Seamless Ordering**: Integrated order management and inventory synchronization.
- **Supplier Analytics**: AI-driven inventory and order predictions for wholesalers.

---

## 🛠️ Tech Stack

### AI Engine
- **Google Gemini 2.5 Flash**: Core vision and natural language processing engine.
- **OpenAI**: Secondary/Fallback engine for specialized tasks.

### Frontend
- **React 18**: Component-based UI architecture.
- **Tailwind CSS**: Modern, responsive styling.
- **Recharts**: Rich data visualization and analytics charts.
- **i18next**: Multi-language support (i18n).
- **Lucide React**: Premium icon set.
- **ZXing**: Vision-based QR and Barcode scanning.

### Backend
- **Node.js + Express**: Robust and scalable API foundation.
- **MongoDB + Mongoose**: Flexible NoSQL data modeling.
- **JWT + bcrypt**: Secure authentication and data protection.
- **Multer & Nodemailer**: Handle media uploads and communication.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (Local instance or Atlas)
- Google AI (Gemini) API Key

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/psp2535/Smart-Kirana.git
   cd Smart-Kirana
   ```

2. Install all dependencies:
   ```bash
   # From root
   npm install
   # Backend dependencies
   cd backend && npm install
   # Frontend dependencies
   cd ../frontend && npm install
   ```

3. Configure Environment Variables:
   - Create `.env` in the `backend/` directory with: `MONGODB_URI`, `GEMINI_API_KEY`, `PORT`, `JWT_SECRET`.
   - Create `.env` in the `frontend/` directory with: `REACT_APP_API_URL`.

4. Start Development Servers:
   ```bash
   # From root
   npm run dev
   ```

---

## 📁 Project Structure

```
Smart-Kirana/
├── backend/
│   ├── src/
│   │   ├── controllers/    # Request handlers (AI, BillScan, Chatbot, etc.)
│   │   ├── services/       # Core business logic (Gemini integration, etc.)
│   │   ├── models/         # MongoDB schemas (User, Product, Sale, Expense)
│   │   ├── routes/         # API endpoints (ai, auth, inventory, sales)
│   │   └── server.js       # Main server entry point
├── frontend/
│   ├── src/
│   │   ├── components/     # UI components (AI Chatbots, Charts, POS)
│   │   ├── pages/          # Full-page views (Dashboard, Insights, WholesalerHub)
│   │   ├── services/       # Frontend API communication
│   │   └── contexts/       # Global state management (Auth, Theme)
└── package.json
```

---

## 🔑 Core API Endpoints

### 🤖 AI & Vision
- `POST /api/vision/scan` - Process bill images via Gemini.
- `POST /api/chatbot/query` - Interact with the Retailer AI assistant.
- `GET /api/ai-insights` - Retrieve AI-generated business analytics.

### 📦 Commerce
- `GET /api/inventory` - Manage products and stock levels.
- `POST /api/sales` - Record transactions and update inventory.
- `GET /api/wholesalers` - Discover and interact with wholesalers.

---

## 🤝 Contributing & Team

Developed with ❤️ by the **Smart Kirana Team**. This project is part of a mission to digitize and empower small retailers globally.


---

## 🌐 Deployment

### Quick Deploy (Free Hosting)

Deploy Smart Kirana to production in minutes using free tier services:

**Backend:** Render.com (Free)  
**Frontend:** Vercel (Free)  
**Database:** MongoDB Atlas (Free)

#### Quick Steps:

1. **Deploy Backend to Render**
   - Connect GitHub repo
   - Set environment variables (MongoDB URI, JWT Secret, etc.)
   - Deploy from `backend` folder

2. **Deploy Frontend to Vercel**
   - Import GitHub repo
   - Set `REACT_APP_API_URL` to your Render backend URL
   - Deploy from `frontend` folder

3. **Setup MongoDB Atlas**
   - Create free cluster
   - Whitelist IP: `0.0.0.0/0`
   - Get connection string

📖 **Detailed Guide:** See [DEPLOYMENT.md](./DEPLOYMENT.md) for step-by-step instructions.

🔍 **Pre-deployment Check:**
```bash
node deploy-check.js
```

---

## 📄 License

MIT License - See [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Google Gemini AI for powering intelligent features
- MongoDB Atlas for reliable database hosting
- Vercel & Render for seamless deployment
- Open source community for amazing tools and libraries

---

**Built for hackathons. Ready for production. 🚀**
