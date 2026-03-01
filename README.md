# JOB-PATH (React + TypeScript)

## Dependencies
Install Node.js 
https://nodejs.org/

and git:
https://git-scm.com/

If you havent

## Clone the Repository

```bash
git clone https://github.com/Neater17/jobpath.git
cd jobpath
```

## Set Up Environment Variables

Inside the `/backend` folder, create a `.env` file:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
FRONTEND_URL=http://localhost:5173
RECOMMENDER_MODEL_PATH=./data/recommendation-model.v3.json
RECOMMENDER_FEEDBACK_PATH=./data/recommendation-feedback.jsonl
# Optional: only if Atlas SRV DNS lookup fails on your network
# MONGO_DNS_SERVER=8.8.8.8
```

Inside the `/frontend` folder, create a `.env` file:

```env
VITE_API_URL=http://localhost:5000
```

## Create a New Branch
Before making changes, always create your own feature branch:

```bash
git checkout -b feature/your-feature-name
```

Example:

```bash
git checkout -b feature/add-login-api
```

Commit and Push Your Changes

```bash
git add .
git commit -m "Add: short description of feature"
git push origin feature/your-feature-name
```

Then:
1. Go to GitHub
2. Open a **Pull Request**
3. Request a review before merging


## Run
From Jobpath Folder

```bash
cd backend
npm install
npm run dev
```

```bash
cd frontend
npm install
npm run dev
```

## Build
```bash
npm run build
npm run preview
```

## Recommendation Model Endpoints
- `GET /api/recommendations/model-info`: returns model version, split/evaluation metrics, and data-source quality.
- `POST /api/recommendations/retrain`: force retrains and persists a new recommendation model.
- `POST /api/recommendations/feedback`: logs user feedback for future dataset improvement.
- `POST /api/recommendations`: supports optional `explainabilityMethod` = `auto | shap | lime`; response now includes explanation factors and method comparison.

## Optional: ML Training Pipeline (MNIST CNN)
Use this if you want reproducible training outside notebooks.

1. Create and activate a Python virtual environment:
```bash
python3 -m venv .venv
source .venv/bin/activate
```

2. Install Python dependencies:
```bash
pip install tensorflow numpy scikit-learn joblib
```

3. Train and save model artifacts (CNN + ensemble trees):
```bash
python3 ml/train.py
```

4. Run predictions from saved artifacts:
```bash
python3 ml/predict.py --mode both --num-samples 10
```

5. Optional prediction modes:
```bash
python3 ml/predict.py --mode cnn --num-samples 10
python3 ml/predict.py --mode ensemble --num-samples 10
```
