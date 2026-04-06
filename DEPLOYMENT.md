# 🚀 Smart Kirana Deployment Guide

## Quick Deployment (Free Hosting)

### Option 1: Vercel + Render (Recommended)

#### Step 1: Deploy Backend to Render

1. **Create Render Account**
   - Go to [render.com](https://render.com)
   - Sign up with GitHub

2. **Create MongoDB Atlas Database** (Free)
   - Go to [mongodb.com/cloud/atlas](https://mongodb.com/cloud/atlas)
   - Create free cluster
   - Get connection string: `mongodb+srv://username:password@cluster.mongodb.net/smartkirana`

3. **Deploy Backend**
   - Click "New +" → "Web Service"
   - Connect your GitHub repo: `psp2535/Smart-Kirana`
   - Settings:
     - Name: `smart-kirana-backend`
     - Root Directory: `backend`
     - Build Command: `npm install`
     - Start Command: `npm start`
   
4. **Add Environment Variables**
   ```
   MONGODB_URI=mongodb+srv://your-connection-string
   JWT_SECRET=your_random_secret_key_here
   NODE_ENV=production
   PORT=5000
   FRONTEND_URL=https://your-frontend-url.vercel.app
   GEMINI_API_KEY=your_gemini_key (optional)
   OPENAI_API_KEY=your_openai_key (optional)
   ```

5. **Deploy** - Click "Create Web Service"
   - Your backend will be at: `https://smart-kirana-backend.onrender.com`

#### Step 2: Deploy Frontend to Vercel

1. **Create Vercel Account**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub

2. **Import Project**
   - Click "Add New" → "Project"
   - Import `psp2535/Smart-Kirana`
   - Framework Preset: Create React App
   - Root Directory: `frontend`

3. **Configure Build Settings**
   - Build Command: `npm run build`
   - Output Directory: `build`
   - Install Command: `npm install`

4. **Add Environment Variable**
   ```
   REACT_APP_API_URL=https://smart-kirana-backend.onrender.com
   ```

5. **Deploy** - Click "Deploy"
   - Your frontend will be at: `https://smart-kirana.vercel.app`

6. **Update Backend FRONTEND_URL**
   - Go back to Render dashboard
   - Update `FRONTEND_URL` to your Vercel URL
   - Redeploy backend

---

### Option 2: Railway (All-in-One)

1. **Create Railway Account**
   - Go to [railway.app](https://railway.app)
   - Sign up with GitHub

2. **Deploy Backend**
   - New Project → Deploy from GitHub
   - Select `Smart-Kirana` repo
   - Add MongoDB plugin
   - Set environment variables (same as above)

3. **Deploy Frontend**
   - Add new service
   - Deploy from same repo
   - Set root directory to `frontend`

---

### Option 3: Netlify + Render

Similar to Vercel + Render, but use Netlify for frontend:

1. **Netlify Settings**
   - Build command: `cd frontend && npm install && npm run build`
   - Publish directory: `frontend/build`
   - Environment: `REACT_APP_API_URL`

---

## MongoDB Atlas Setup (Required)

1. **Create Cluster**
   - Go to MongoDB Atlas
   - Create free M0 cluster (512MB)
   - Choose region closest to your backend

2. **Database Access**
   - Create database user
   - Username: `smartkirana`
   - Password: Generate secure password

3. **Network Access**
   - Add IP: `0.0.0.0/0` (allow from anywhere)
   - Or add Render's IP addresses

4. **Get Connection String**
   - Click "Connect" → "Connect your application"
   - Copy connection string
   - Replace `<password>` with your password
   - Replace `<dbname>` with `smartkirana`

---

## Environment Variables Reference

### Backend (.env)
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/smartkirana
PORT=5000
NODE_ENV=production
JWT_SECRET=your_random_secret_key_minimum_32_characters
FRONTEND_URL=https://your-frontend-url.vercel.app

# Optional AI Features
GEMINI_API_KEY=your_gemini_api_key
OPENAI_API_KEY=your_openai_api_key
IMAGE_API_KEY=your_gemini_api_key

# Optional Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-gmail-app-password
```

### Frontend (.env)
```env
REACT_APP_API_URL=https://smart-kirana-backend.onrender.com
```

---

## Post-Deployment Checklist

- [ ] Backend health check: `https://your-backend.onrender.com/health`
- [ ] Frontend loads: `https://your-frontend.vercel.app`
- [ ] Can register new user
- [ ] Can login
- [ ] Can add inventory items
- [ ] Can record sales
- [ ] MongoDB connection working

---

## Troubleshooting

### Backend Issues

**"Cannot connect to MongoDB"**
- Check MongoDB Atlas IP whitelist
- Verify connection string
- Check username/password

**"CORS Error"**
- Update `FRONTEND_URL` in backend env
- Redeploy backend

**"Module not found"**
- Check build command includes `npm install`
- Verify all dependencies in package.json

### Frontend Issues

**"API calls failing"**
- Check `REACT_APP_API_URL` is correct
- Verify backend is running
- Check browser console for errors

**"Build failed"**
- Check Node version (use 18.x)
- Verify all dependencies installed
- Check for syntax errors

---

## Free Tier Limits

**Render Free Tier:**
- 750 hours/month
- Sleeps after 15 min inactivity
- First request takes ~30 seconds (cold start)

**Vercel Free Tier:**
- 100 GB bandwidth/month
- Unlimited deployments
- Always on (no cold starts)

**MongoDB Atlas Free Tier:**
- 512 MB storage
- Shared CPU
- No credit card required

---

## Upgrade Options

For production use:
- Render: $7/month (no sleep, better performance)
- MongoDB Atlas: $9/month (dedicated cluster)
- Vercel: Free tier is usually sufficient

---

## Support

If you face issues:
1. Check deployment logs in Render/Vercel dashboard
2. Verify all environment variables
3. Test backend health endpoint
4. Check MongoDB Atlas connection

---

**Your Smart Kirana app will be live in ~10 minutes! 🎉**
