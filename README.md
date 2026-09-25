# Dhairya Shukla – MERN Portfolio
## Run
```
cd server && npm i && cp .env.example .env && npm run dev   # API on :5000
cd client && npm i && npm run dev                            # site on :5173
```
Edit all your content in `client/src/data.js`. Contact messages save to MongoDB (`Message` model).
Deploy: client -> Netlify/Vercel (set `VITE_API_URL`), server -> Render (set `MONGO_URI`, `CLIENT_URL`).
