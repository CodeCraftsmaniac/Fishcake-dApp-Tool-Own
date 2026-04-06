# Fishcake Backend Hosting Guide

## Best Free/Low-Cost Hosting Options for Node.js Backend

### 🏆 Recommended Options (Ranked by Suitability)

---

## 1. Railway (⭐ BEST CHOICE)
**Free Tier:** $5 credit/month (enough for light usage)
**Why Best:** Native Node.js support, easy deployment, built-in database

### Pros:
- One-click deploy from GitHub
- Free PostgreSQL/MySQL database
- Auto-deploy on git push
- Built-in environment variables
- Sleep prevention (stays awake)
- WebSocket support
- Good for long-running processes (schedulers)

### Cons:
- $5/month credit limit on free tier
- May need to upgrade for heavy usage

### Deploy Steps:
```bash
# 1. Install Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Initialize project
cd backend
railway init

# 4. Deploy
railway up

# 5. Add environment variables
railway variables set NODE_ENV=production
railway variables set PORT=3001
```

---

## 2. Render
**Free Tier:** 750 hours/month (enough for 1 service 24/7)
**Why Good:** Simple, reliable, good free tier

### Pros:
- Free PostgreSQL database (90 days)
- Auto-deploy from GitHub
- Custom domains (free SSL)
- WebSocket support
- Docker support

### Cons:
- Free tier services sleep after 15 min inactivity
- Cold starts can be slow (~30 seconds)
- Not ideal for schedulers (sleep issue)

### Deploy Steps:
```bash
# 1. Connect GitHub repo to Render
# 2. Create new Web Service
# 3. Set build command: npm install && npm run build
# 4. Set start command: npm start
# 5. Add environment variables in dashboard
```

---

## 3. Fly.io
**Free Tier:** 3 shared VMs, 3GB storage
**Why Good:** Global edge deployment, persistent volumes

### Pros:
- True container deployment
- Persistent volumes (data survives restarts)
- Global edge locations
- Good for 24/7 services
- WebSocket support

### Cons:
- More complex setup
- Requires Dockerfile
- CLI-focused

### Deploy Steps:
```bash
# 1. Install Fly CLI
curl -L https://fly.io/install.sh | sh

# 2. Login
fly auth login

# 3. Create app
fly launch

# 4. Deploy
fly deploy

# 5. Set secrets
fly secrets set NODE_ENV=production
```

---

## 4. Vercel (Serverless Functions)
**Free Tier:** Unlimited serverless function calls (with limits)
**Why Consider:** Already using for frontend

### Pros:
- Already have account
- Easy integration with Next.js
- Auto-scaling
- Free SSL

### Cons:
- ❌ NOT suitable for long-running processes
- ❌ 10-second execution limit (free)
- ❌ Cannot run schedulers
- ❌ Stateless (no persistent DB connections)

**Verdict:** NOT recommended for this backend (needs scheduler)

---

## 5. Deta Space
**Free Tier:** Completely free (generous limits)
**Why Consider:** No credit card required

### Pros:
- Completely free
- Built-in database (Deta Base)
- Python & Node.js support
- No sleep/cold starts

### Cons:
- Less mainstream
- Limited documentation
- May have scaling limits

---

## 6. Cyclic.sh
**Free Tier:** 100,000 requests/month
**Why Consider:** Simple, always-on

### Pros:
- No cold starts
- AWS-backed infrastructure
- Simple deployment
- Free tier is generous

### Cons:
- Newer platform
- Limited features compared to others

---

## 7. Koyeb
**Free Tier:** 2 nano services
**Why Consider:** Good European option

### Pros:
- No cold starts on free tier
- Global edge deployment
- Docker support
- Good free tier

### Cons:
- Smaller community
- Less documentation

---

## 📊 Comparison Table

| Platform | Free Tier | Sleep? | Scheduler OK? | Database | Best For |
|----------|-----------|--------|---------------|----------|----------|
| **Railway** | $5/mo credit | No | ✅ Yes | ✅ Free | **This project** |
| Render | 750 hrs/mo | Yes | ❌ No | ✅ 90 days | Simple APIs |
| Fly.io | 3 VMs | No | ✅ Yes | ❌ Paid | Global apps |
| Vercel | Unlimited | N/A | ❌ No | ❌ No | Serverless only |
| Deta | Unlimited | No | ⚠️ Maybe | ✅ Free | Small projects |
| Cyclic | 100K req | No | ✅ Yes | ❌ No | APIs |
| Koyeb | 2 services | No | ✅ Yes | ❌ No | Edge apps |

---

## 🎯 Final Recommendation: Railway

### Why Railway is Best for Fishcake Backend:

1. **Scheduler Support:** Can run background jobs 24/7
2. **Database Included:** Free PostgreSQL/MySQL
3. **No Sleep:** Services stay awake
4. **Easy Deploy:** One command deployment
5. **GitHub Integration:** Auto-deploy on push
6. **Environment Variables:** Easy secrets management
7. **Logs:** Real-time log viewing
8. **Scaling:** Easy to upgrade when needed

---

## 🚀 Quick Start: Deploy to Railway

### Step 1: Prepare Backend
```bash
cd backend

# Ensure package.json has:
# "scripts": {
#   "start": "node dist/server.js",
#   "build": "tsc"
# }
```

### Step 2: Create railway.json (optional)
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### Step 3: Deploy
```bash
# Install CLI
npm i -g @railway/cli

# Login
railway login

# Initialize
railway init

# Link to existing project (if any)
railway link

# Deploy
railway up

# Open dashboard
railway open
```

### Step 4: Set Environment Variables
```bash
railway variables set NODE_ENV=production
railway variables set PORT=3001
railway variables set FRONTEND_URLS=https://your-vercel-app.vercel.app
railway variables set JWT_SECRET=your-secret-key
railway variables set RPC_ALCHEMY=https://polygon-mainnet.g.alchemy.com/v2/YOUR_KEY
```

### Step 5: Get Public URL
```bash
railway domain
# This gives you: https://your-app.up.railway.app
```

### Step 6: Update Frontend
```bash
# In Web-App/.env.local
NEXT_PUBLIC_API_URL=https://your-app.up.railway.app
```

---

## 🔒 Security Checklist

- [ ] Never commit .env files
- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS only
- [ ] Set proper CORS origins
- [ ] Use strong JWT secrets
- [ ] Rotate API keys periodically
- [ ] Enable rate limiting

---

## 📈 Scaling Path

When you outgrow free tier:

1. **Railway Pro:** $20/month - More resources
2. **Render Pro:** $7/month per service
3. **Fly.io Pro:** Pay-as-you-go
4. **DigitalOcean:** $5/month VPS
5. **AWS/GCP/Azure:** Enterprise scale

---

## 🆘 Troubleshooting

### Common Issues:

**Build Fails:**
- Check Node.js version in package.json
- Ensure all dependencies are in package.json
- Check build logs for errors

**App Crashes:**
- Check environment variables are set
- Verify database connection string
- Check logs: `railway logs`

**CORS Errors:**
- Add frontend URL to FRONTEND_URLS env var
- Verify CORS middleware is configured

**Database Connection:**
- Use connection string from Railway dashboard
- Check SSL settings for production

---

## 📚 Resources

- [Railway Docs](https://docs.railway.app/)
- [Railway CLI Reference](https://docs.railway.app/develop/cli)
- [Render Docs](https://render.com/docs)
- [Fly.io Docs](https://fly.io/docs/)

---

*Last Updated: April 2026*
*Recommended: Railway for Fishcake Backend*
