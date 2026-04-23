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
FRONTEND_URL=https://app.jobpath.com
MONGO_DNS_SERVER=1.1.1.1
ML_SERVICE_URL=https://ml.jobpath.com/ml
RECOMMENDER_FEEDBACK_PATH=./data/recommendation-feedback.jsonl
NODE_ENV=development
```

Notes:

- `MONGO_CONNECTION_STRING` is the primary variable currently used by the backend.
- `MONGO_URI` is also supported as a fallback if you already use that name.
- `JWT_SECRET` should be long, random, and private, especially in production.
- `FRONTEND_URL` should match your deployed frontend origin, for example `https://app.jobpath.com`.
- `MONGO_DNS_SERVER` is optional and helps in restrictive network environments.
- `ML_SERVICE_URL` should point to the recommendation routes exposed by the shared FastAPI service, for example `https://ml.jobpath.com/ml`.
- `RECOMMENDER_FEEDBACK_PATH` stores recommendation feedback rows written by the backend.
- `NODE_ENV=production` will make auth cookies use `secure: true`.

### Frontend
Inside the `/frontend` folder, create a `.env` file:

```env
VITE_API_URL=https://api.jobpath.com
VITE_PASSWORD_API_URL=https://ml.jobpath.com
```

Notes:

- `VITE_API_URL` points to the Express backend, for example `https://api.jobpath.com`.
- `VITE_PASSWORD_API_URL` points to the FastAPI password checker, for example `https://ml.jobpath.com`.


## Python Service
The password checker and recommendation ML routes run from the same shared FastAPI service inside `/Python` using `app.main:app` on port `8000`.

Set up and run the Python service with:

1. Install Python 3.11 or newer from https://www.python.org/downloads/
2. Open a terminal in the project root
3. Go to the Python service folder
4. Create a virtual environment if `.venv` does not exist yet
5. Activate the virtual environment
6. Install the Python dependencies into that virtual environment
7. Start the FastAPI service

If you do not have a `.venv` inside `/Python` yet, create one first:

```bash
cd Python
python -m venv .venv
```

If `.venv` already exists, you can skip the creation step and just activate it.

PowerShell:

```powershell
cd Python
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

## Build

```bash
cd frontend
npm run build
npm run preview
```

If `npm run build` fails in a restricted sandboxed environment, try running it in your normal local terminal instead. The frontend also type-checks with:

```bash
cd frontend
npx tsc -b
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

## Train The Recommendation Model

The Python recommendation model is stored at:

```text
backend/data/recommendation-model.v3.json
```

Starting the Python API with `uvicorn app.main:app --reload --port 8000` does **not** train a new model. It only loads the latest saved model file from `backend/data`.

To train and update the active recommendation model file, run from the project root:

```powershell
python Python\scripts\train.py
```

This will train a new model and overwrite:

```text
backend/data/recommendation-model.v3.json
```

If you want to train from a dataset file instead of the synthetic fallback, run:

```powershell
python Python\scripts\train.py --dataset-path C:\path\to\your-dataset.json
```

To inspect the currently saved model without retraining:

```powershell
python Python\scripts\train.py --summary-only
```

If the Python API is already running and you want it to retrain and reload the model in memory immediately, call:

```powershell
curl -X POST http://127.0.0.1:8000/ml/retrain -H "Content-Type: application/json" -d "{}"
```

Or with a dataset path:

```powershell
curl -X POST http://127.0.0.1:8000/ml/retrain -H "Content-Type: application/json" -d "{\"datasetPath\":\"C:\\path\\to\\your-dataset.json\"}"
```

Notes:

- Running `python Python\scripts\train.py` updates the saved model file on disk.
- A running Python API process will keep using the model already loaded in memory until you restart it or call `/ml/retrain`.
- The next time the Python API starts, it will load the latest saved model automatically from `backend/data/recommendation-model.v3.json`.

## Access Model Evaluation

Training also saves a separate evaluation file next to the model:

```text
backend/data/recommendation-model.v3.evaluation.json
```

This file includes:

- confusion matrices
- per-class precision
- per-class recall
- per-class F1

To print the saved evaluation JSON without retraining:

```powershell
python Python\scripts\train.py --evaluation-only
```

If the Python API is running, you can also read the saved evaluation through:

```powershell
curl http://127.0.0.1:8000/ml/evaluation
```

The confusion matrices are available at:

- `evaluation.logistic.confusionMatrix`
- `evaluation.randomForest.confusionMatrix`
- `evaluation.gradientBoosting.confusionMatrix`
- `evaluation.ensemble.confusionMatrix`

The per-class metrics are available at:

- `evaluation.logistic.perClass`
- `evaluation.randomForest.perClass`
- `evaluation.gradientBoosting.perClass`
- `evaluation.ensemble.perClass`

If the evaluation file does not exist yet, train the model once first:

```powershell
python Python\scripts\train.py
```
