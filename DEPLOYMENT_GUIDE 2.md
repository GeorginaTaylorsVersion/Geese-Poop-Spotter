# 🚀 Deployment Guide - Geese Poop Spotter

This guide will help you deploy your app with the **frontend on Vercel** and the **backend on Render** (both have free tiers).

## 📋 Overview

We'll deploy in two parts:
1. **Backend (API)** → Render (free)
2. **Frontend (React app)** → Vercel (free)

---

## Part 1: Deploy Backend to Render

### Step 1: Create a GitHub Repository

1. **Initialize Git** (if not already done):
   ```bash
   cd /Users/georgina/Documents/Geese-Poop-Spotter
   git init
   git add .
   git commit -m "Initial commit"
   ```

2. **Create a new repository on GitHub**:
   - Go to [github.com](https://github.com) and sign in
   - Click the "+" icon → "New repository"
   - Name it: `geese-poop-spotter`
   - Don't initialize with README (we already have files)
   - Click "Create repository"

3. **Push to GitHub**:
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/geese-poop-spotter.git
   git branch -M main
   git push -u origin main
   ```

### Step 2: Deploy Backend on Render

1. **Go to [Render.com](https://render.com)** and sign up/sign in with GitHub

2. **Create a New Web Service**:
   - Click "New +" → "Web Service"
   - Connect your GitHub account if prompted
   - Select the `geese-poop-spotter` repository

3. **Configure the service**:
   ```
   Name: geese-poop-spotter-api
   Region: Oregon (US West)
   Branch: main
   Root Directory: (leave blank)
   Runtime: Node
   Build Command: cd server && npm install
   Start Command: cd server && npm start
   ```

4. **Select the Free plan**

5. **Add Environment Variables**:
   - Click "Advanced"
   - Add environment variable:
     - Key: `NODE_ENV`
     - Value: `production`

6. **Click "Create Web Service"**

7. **Wait for deployment** (takes 2-5 minutes)

8. **Copy your backend URL** - it will look like:
   ```
   https://geese-poop-spotter-api.onrender.com
   ```
   
   ⚠️ **IMPORTANT**: Save this URL! You'll need it for the frontend.

### Step 3: Test Your Backend

Once deployed, test it by visiting:
```
https://your-backend-url.onrender.com/api/health
```

You should see: `{"status":"ok"}`

---

## Part 2: Deploy Frontend to Vercel

### Step 1: Update Frontend to Use Backend URL

1. **Create a `.env.production` file** in the `client` folder:
   ```bash
   cd client
   ```

2. Create the file with your backend URL:
   ```bash
   echo "REACT_APP_API_URL=https://your-backend-url.onrender.com/api" > .env.production
   ```
   
   Replace `your-backend-url` with your actual Render URL!

3. **Commit the changes**:
   ```bash
   cd ..
   git add .
   git commit -m "Add production environment config"
   git push
   ```

### Step 2: Deploy to Vercel

1. **Go to [Vercel.com](https://vercel.com)** and sign up/sign in with GitHub

2. **Import your project**:
   - Click "Add New..." → "Project"
   - Select your `geese-poop-spotter` repository
   - Click "Import"

3. **Configure the project**:
   ```
   Framework Preset: Create React App
   Root Directory: client
   Build Command: npm run build
   Output Directory: build
   Install Command: npm install
   ```

4. **Add Environment Variable**:
   - Click "Environment Variables"
   - Add:
     - Name: `REACT_APP_API_URL`
     - Value: `https://your-backend-url.onrender.com/api`
   - Select all environments (Production, Preview, Development)

5. **Click "Deploy"**

6. **Wait for deployment** (takes 1-3 minutes)

7. **Your app is live!** Vercel will give you a URL like:
   ```
   https://geese-poop-spotter.vercel.app
   ```

---

## 🎉 You're Done!

Your app is now live:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://your-api.onrender.com`

---

## 🔄 Making Updates

### Update Backend:
```bash
# Make your changes to server files
git add .
git commit -m "Update backend"
git push
```
Render will automatically redeploy.

### Update Frontend:
```bash
# Make your changes to client files
git add .
git commit -m "Update frontend"
git push
```
Vercel will automatically redeploy.

---

## ⚠️ Important Notes

### Free Tier Limitations

**Render Free Tier**:
- ✅ Free forever
- ⚠️ Spins down after 15 minutes of inactivity
- ⚠️ First request after spin-down takes 30-60 seconds
- ✅ 750 hours/month (enough for one service)

**Vercel Free Tier**:
- ✅ Free forever
- ✅ Always on (no spin-down)
- ✅ Unlimited bandwidth for personal projects

### File Uploads

⚠️ **Important**: Uploaded images are stored in memory on Render's free tier and will be lost when the service restarts or spins down.

**Solutions**:
1. Use cloud storage (AWS S3, Cloudinary) - recommended for production
2. Upgrade to Render's paid plan with persistent disk
3. Use a database to store images as base64 (not recommended for many images)

---

## 🐛 Troubleshooting

### Frontend can't connect to backend

**Check:**
1. Backend URL is correct in Vercel environment variables
2. Backend is running: visit `https://your-backend.onrender.com/api/health`
3. No typos in the URL (should end with `/api`)

**Fix:**
- Go to Vercel project settings → Environment Variables
- Update `REACT_APP_API_URL`
- Redeploy: Deployments → Click "..." → "Redeploy"

### Backend is slow on first request

This is normal on Render's free tier. The service spins down after 15 minutes of inactivity.

**Solutions**:
1. Accept the delay (30-60 seconds on first request)
2. Use a service like [UptimeRobot](https://uptimerobot.com) to ping your backend every 14 minutes
3. Upgrade to Render's paid plan ($7/month)

### CORS errors

If you see CORS errors in the browser console:

1. **Update server CORS settings** in `server/index.js`:
   ```javascript
   app.use(cors({
     origin: [
       'http://localhost:3000',
       'https://your-app.vercel.app'
     ]
   }));
   ```

2. **Commit and push**:
   ```bash
   git add .
   git commit -m "Update CORS settings"
   git push
   ```

### Build fails on Vercel

**Check:**
1. Root directory is set to `client`
2. Framework preset is "Create React App"
3. Environment variable `REACT_APP_API_URL` is set

**Fix:**
- Go to Project Settings → General
- Verify all settings match the configuration above
- Try redeploying

---

## 🔐 Security Best Practices

1. **Never commit sensitive data**:
   - `.env` files are in `.gitignore`
   - Use environment variables for secrets

2. **CORS Configuration**:
   - Only allow your frontend domain
   - Don't use `*` in production

3. **Rate Limiting** (future enhancement):
   - Add rate limiting to prevent abuse
   - Use packages like `express-rate-limit`

---

## 📊 Monitoring

### Check Backend Status:
```
https://your-backend.onrender.com/api/health
```

### View Logs:
- **Render**: Dashboard → Your Service → Logs
- **Vercel**: Dashboard → Your Project → Deployments → View Function Logs

---

## 💰 Cost Breakdown

| Service | Free Tier | Paid Tier |
|---------|-----------|-----------|
| **Render** | Free (with spin-down) | $7/month (always on) |
| **Vercel** | Free (always on) | $20/month (pro features) |
| **Total** | **$0/month** | $7-27/month |

For a personal/student project, the free tier is perfect!

---

## 🎓 Next Steps

1. **Custom Domain** (optional):
   - Buy a domain from Namecheap, Google Domains, etc.
   - Add it in Vercel project settings
   - Update CORS settings in backend

2. **Database** (when needed):
   - MongoDB Atlas (free tier)
   - PostgreSQL on Render (free tier)
   - Supabase (free tier)

3. **Analytics** (optional):
   - Google Analytics
   - Vercel Analytics (built-in)

---

## 🆘 Need Help?

If you run into issues:
1. Check the logs in Render/Vercel dashboards
2. Verify environment variables are set correctly
3. Test the backend API directly in your browser
4. Check browser console for errors

---

**Happy Deploying! 🦢💩🚀**
