# 🚀 Deployment Guide for PROPZY

This project is built using **Next.js 15.2.8 (App Router)**, **MongoDB Atlas**, and **Cloudinary**. Follow this guide to deploy it to production seamlessly.

---

## 📋 Required Environment Variables

When deploying to any cloud platform (e.g., Vercel, Netlify, Railway), configure the following environment variables in your project settings:

| Environment Variable | Required | Description | Example / Recommended Value |
| :--- | :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | Yes | Public production domain URL | `https://your-domain.vercel.app` |
| `MONGODB_URI` | Yes | Production MongoDB Atlas connection string | `mongodb+srv://<user>:<password>@cluster.mongodb.net/propzy?retryWrites=true&w=majority` |
| `JWT_SECRET` | Yes | Secret key for signing HS256 JWT auth tokens | Any long random 32+ char string (e.g. `c98a3f7e21b44e59...`) |
| `NEXTAUTH_SECRET` | Optional | Alternative alias fallback for `JWT_SECRET` | Same as `JWT_SECRET` |
| `ADMIN_ID` | Yes | Master Admin email for portal access | `admin@propzy.com` |
| `ADMIN_PASSWORD` | Yes | Master Admin portal password | Strong custom password |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` | Yes | Cloudinary Cloud Name for client direct uploads | `your_cloudinary_cloud_name` |
| `CLOUDINARY_API_KEY` | Yes | Cloudinary API Key for generating upload signatures | `123456789012345` |
| `CLOUDINARY_API_SECRET` | Yes | Cloudinary API Secret for secure backend operations | `abcdefghijklmnopqrstuvwxyz0123` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Yes | Google OAuth 2.0 Web Client ID | `78772276826-...apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | Yes | Google OAuth 2.0 Client Secret | `GOCSPX-...` |

---

## 🌐 Deploying to Vercel (Recommended)

Vercel is the official platform for Next.js applications and provides zero-config deployment.

### Option A: Via Vercel Dashboard (GitHub Integration)
1. Push your code to GitHub (`git push origin main`).
2. Go to [Vercel Dashboard](https://vercel.com/dashboard) and click **Add New** → **Project**.
3. Import your **PROPZY** (`letsrentz-app`) repository.
4. Set the **Root Directory** to `letsrentz-app` if deploying from a monorepo or parent directory.
5. Expand **Environment Variables** and add all variables listed above.
6. Click **Deploy**.

### Option B: Via Vercel CLI
```bash
cd letsrentz-app
npm install -g vercel
vercel login
vercel --prod
```

---

## 🍃 MongoDB Atlas Setup

1. Create a free or production cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas).
2. Under **Network Access**, add IP `0.0.0.0/0` (Allow Access from Anywhere) to permit serverless edge/lambda connections from your deployment platform.
3. Under **Database Access**, create a user with read/write access (`readWriteAnyDatabase` or scoped to the target database).
4. Copy the SRV connection string and set `MONGODB_URI` in your host's environment variables.
5. (Optional) Seed demo data after initial deployment:
   ```bash
   curl -X GET https://<your-deployed-domain>/api/seed
   ```

---

## ☁️ Cloudinary Setup

1. Create a free account at [Cloudinary](https://cloudinary.com/).
2. From the Cloudinary Dashboard, copy your **Cloud Name**, **API Key**, and **API Secret**.
3. Set `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` in your hosting provider's environment settings.
4. Property owners will now be able to upload property photos directly to the `letsrentz/properties` folder on Cloudinary.

---

## 🛠 Pre-Deployment Checklist

- [x] Production build passes cleanly (`npm run build`).
- [x] TypeScript validation succeeds without errors.
- [x] All 8 required Environment Variables configured on host platform.
- [x] Database IP whitelist configured on MongoDB Atlas (`0.0.0.0/0`).
- [x] Cloudinary credentials active and verified.
