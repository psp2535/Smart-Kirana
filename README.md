# Smart Kirana - AI-Powered Business Management

> Smart retail management with AI automation for small businesses

## 🎯 Overview

Smart Kirana is an AI-powered platform designed for small retailers to manage inventory, sales, and customer operations efficiently. Built with modern web technologies to provide a seamless experience.

## ✨ Features

- 🔐 User Authentication (JWT-based)
- 📦 Inventory Management (Add, Update, Delete items)
- 💰 Sales Tracking with auto inventory updates
- 📊 Real-time Dashboard with business metrics
- 🔔 Low stock alerts
- 📱 Responsive design for mobile and desktop

## 🛠️ Tech Stack

### Frontend
- React 18
- Tailwind CSS
- React Router
- Axios
- Lucide Icons

### Backend
- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- bcrypt for password hashing

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)

### Installation

1. Clone the repository
```bash
git clone https://github.com/psp2535/Smart-Kirana.git
cd Smart-Kirana
```

2. Install dependencies
```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

3. Configure environment variables

Backend (.env):
```env
MONGODB_URI=mongodb://localhost:27017/smartkirana
PORT=5000
JWT_SECRET=your_secret_key_here
NODE_ENV=development
```

Frontend (.env):
```env
REACT_APP_API_URL=http://localhost:5000
```

4. Start the application

```bash
# From root directory - runs both frontend and backend
npm run dev

# Or run separately:
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm start
```

5. Access the application
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 📁 Project Structure

```
Smart-Kirana/
├── backend/
│   ├── src/
│   │   ├── config/         # Database configuration
│   │   ├── controllers/    # Request handlers
│   │   ├── middleware/     # Auth middleware
│   │   ├── models/         # MongoDB models
│   │   ├── routes/         # API routes
│   │   └── server.js       # Express app
│   └── package.json
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/     # Reusable components
│   │   ├── contexts/       # React contexts
│   │   ├── pages/          # Page components
│   │   ├── services/       # API services
│   │   └── App.jsx
│   └── package.json
└── package.json
```

## 🔑 API Endpoints

### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - Login user
- GET `/api/auth/profile` - Get user profile

### Inventory
- GET `/api/inventory` - Get all items
- POST `/api/inventory` - Add new item
- PUT `/api/inventory/:id` - Update item
- DELETE `/api/inventory/:id` - Delete item
- GET `/api/inventory/low-stock` - Get low stock items

### Sales
- GET `/api/sales` - Get all sales
- POST `/api/sales` - Create new sale
- GET `/api/sales/today` - Get today's sales
- DELETE `/api/sales/:id` - Delete sale

## 🤝 Contributing

This project was developed for a hackathon. Contributions are welcome!

## 📄 License

MIT License

## 👥 Team

Developed with ❤️ by Smart Kirana Team
