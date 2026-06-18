# ShopSphere Deployment

## Render Backend

Build Command:

```bash
python -m pip install -r requirements.txt
```

Start Command:

```bash
python -m uvicorn backend.main:app --host 0.0.0.0 --port $PORT
```

Required environment variable:

```text
DATABASE_URL=your Supabase PostgreSQL connection string
```

Set `DATABASE_URL` in the Render dashboard. Do not commit the actual database URL or password.

## Vercel Frontend

Framework Preset: Other

Build Command: empty

Output Directory: `.`

Frontend API URL should point to `https://shopsphere-zqm5.onrender.com`.
