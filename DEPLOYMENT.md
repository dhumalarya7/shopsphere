# ShopSphere Deployment

## Render Backend

Build Command:

```bash
pip install -r requirements.txt
```

Start Command:

```bash
uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

Required environment variable:

```text
DATABASE_URL=Supabase PostgreSQL connection string
```

Set `DATABASE_URL` in the Render dashboard. Do not commit the actual database URL or password.

## Vercel Frontend

Framework: Other

Build command: leave empty

Output directory: `.`

The frontend JavaScript uses `https://shopsphere-zqm5.onrender.com` as the API backend.
