# JOB-PATH (React + TypeScript)

## Dependencies
Install:

- Node.js: https://nodejs.org/
- Git: https://git-scm.com/
- Python 3.11+ if you want to run the FastAPI services

## Clone The Repository

```bash
git clone https://github.com/Neater17/jobpath.git
cd jobpath
```

## Set Up Environment Variables

### Backend
Inside the `/backend` folder, create a `.env` file:

```env
PORT=5000
MONGO_CONNECTION_STRING=your_mongodb_connection_string
JWT_SECRET=replace_this_with_a_long_random_secret
FRONTEND_URL=http://localhost:5173
MONGO_DNS_SERVER=1.1.1.1
ML_SERVICE_URL=http://127.0.0.1:8001
RECOMMENDER_FEEDBACK_PATH=./data/recommendation-feedback.jsonl
NODE_ENV=development
```

Notes:

- `MONGO_CONNECTION_STRING` is the primary variable currently used by the backend.
- `MONGO_URI` is also supported as a fallback if you already use that name.
- `JWT_SECRET` should be long, random, and private, especially in production.
- `FRONTEND_URL` should match your frontend dev server URL.
- `MONGO_DNS_SERVER` is optional and helps in restrictive network environments.
- `ML_SERVICE_URL` should point to the recommendation routes exposed by the shared FastAPI service.
- `RECOMMENDER_FEEDBACK_PATH` stores recommendation feedback rows written by the backend.
- `NODE_ENV=production` will make auth cookies use `secure: true`.

### Frontend
Inside the `/frontend` folder, create a `.env` file:

```env
VITE_API_URL=http://localhost:5000
VITE_PASSWORD_API_URL=http://localhost:8000
```

Notes:

- `VITE_API_URL` points to the Express backend.
- `VITE_PASSWORD_API_URL` points to the FastAPI password checker.

## FastAPI Password Checker
If you want password strength checking, set up the shared FastAPI service in `/Python`:

```bash
cd Python
python -m venv .venv
```

PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Python Service
The password checker and recommendation ML routes now run from the same FastAPI service inside `/Python` on port `8000`.

Install the combined Python dependencies from the shared Python folder:

```bash
cd Python
python -m venv .venv
```

PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

## Run The App
From the project root, run each service in its own terminal.

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Python Service

```bash
cd Python
```

PowerShell:

```powershell
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000
```

The shared Python service exposes:

- password checker routes such as `/password-strength`
- recommendation ML routes under `/ml/*` such as `/ml/model-info`, `/ml/recommend`, and `/ml/explainability/stream`

## Build

```bash
cd frontend
npm run build
npm run preview
```

## Create A New Branch
Before making changes, create your own feature branch:

```bash
git checkout -b feature/your-feature-name
```

Example:

```bash
git checkout -b feature/add-login-api
```

Commit and push your changes:

```bash
git add .
git commit -m "Add: short description of feature"
git push origin feature/your-feature-name
```

Then:

1. Go to GitHub
2. Open a **Pull Request**
3. Request a review before merging
