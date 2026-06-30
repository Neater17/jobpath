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
FRONTEND_URL=https://app.jobpath.com,http://localhost:5173
MONGO_DNS_SERVER=1.1.1.1
ML_SERVICE_URL=https://ml.jobpath.com/ml
ML_SERVICE_URL=http://127.0.0.1:8000/ml
RECOMMENDER_FEEDBACK_PATH=./data/recommendation-feedback.jsonl
NODE_ENV=development
```

Notes:

- `MONGO_CONNECTION_STRING` is the primary variable currently used by the backend.
- `MONGO_URI` is also supported as a fallback if you already use that name.
- `JWT_SECRET` should be long, random, and private, especially in production.
- `FRONTEND_URL` can be a comma-separated list of allowed frontend origins.
- Local development origins `http://localhost:5173` and `http://127.0.0.1:5173` are allowed automatically by the backend.
- `MONGO_DNS_SERVER` is optional and helps in restrictive network environments.
- `ML_SERVICE_URL` should point to the recommendation routes exposed by the shared FastAPI service, for example `https://ml.jobpath.com/ml`.
- `RECOMMENDER_FEEDBACK_PATH` stores recommendation feedback rows written by the backend.
- `NODE_ENV=production` will make auth cookies use `secure: true`.

### Frontend
Inside the `/frontend` folder, create a `.env` file:

```env
VITE_API_URL=https://jobpath-api.onrender.com
VITE_PASSWORD_API_URL=https://jobpath.onrender.com
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

## Export Synthetic Skill Profiles

If you want to inspect a small sample of the synthetic recommendation-training profiles, use the helpers in `Python/app/training_dataset.py`:

- `build_synthetic_profile_rows(...)`: returns rows in memory
- `export_synthetic_profile_rows(...)`: returns rows and can also write them to a CSV file

From the `Python` folder, run:

```powershell
python -c "from app.catalog import build_career_profiles, COMPETENCY_ORDER; from app.training_dataset import export_synthetic_profile_rows; profiles = build_career_profiles(); rows = export_synthetic_profile_rows(profiles=profiles, competency_order=COMPETENCY_ORDER, max_rows=50, csv_path='synthetic_profiles_50.csv'); print(f'exported {len(rows)} rows')"
```

If you prefer to paste multiple lines, start the Python interpreter first:

```powershell
python
```

Then paste:

```python
from app.catalog import build_career_profiles, COMPETENCY_ORDER
from app.training_dataset import export_synthetic_profile_rows

profiles = build_career_profiles()

rows = export_synthetic_profile_rows(
    profiles=profiles,
    competency_order=COMPETENCY_ORDER,
    max_rows=50,
    csv_path="synthetic_profiles_50.csv",
)

print(f"exported {len(rows)} rows")
```

Notes:

- Change `max_rows` to control how many rows are exported, for example `20`, `50`, or `100`.
- Change `csv_path` to control the output file name or location, for example `"synthetic_profiles_100.csv"` or `"exports/synthetic_profiles_100.csv"`.
- Do not paste the raw Python snippet directly into PowerShell without running `python` first, because PowerShell will try to parse `from ... import ...` as PowerShell syntax.
- Each exported row includes metadata such as `profileKey`, `careerName`, `representativeLevel`, `archetype`, `peerRelationship`, and `hardTags`.
- Each competency in `COMPETENCY_ORDER` is flattened into its own CSV column.
- If you only want the rows in memory and do not want to write a CSV, use `build_synthetic_profile_rows(...)` instead.

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

## Generate Sample Assessment Questions

You can export the generated assessment question set for a specific career as `json` or `csv`.

Run this from the `backend` folder:

```powershell
cd backend
npm install
```

Export by career ID:

```powershell
npm run export:questions -- --career-id DSC --format json --out ..\data-scientist-questions.json
npm run export:questions -- --career-id DSC --format csv --out ..\data-scientist-questions.csv
```

Export by career title:

```powershell
npm run export:questions -- --career "Data Scientist" --format json
```

Supported options:

- `--career-id <ID>`: export by career ID from `backend/data/PSF-AAI-Career-Map.json`
- `--career "<Title>"`: export by career title
- `--path <pathKey>`: optional disambiguation if the title exists in more than one path
- `--format json|csv`: output format
- `--out <file>`: optional output file path

Notes:

- `csv` can be opened directly in Excel.
- `json` includes the selected career metadata plus the full generated question list.
- If a career title matches multiple entries, use `--career-id` or add `--path`.

## Validate Industry Skill Response Forms

You can validate Google Forms Excel response exports against a specific JobPath role without training a new model.

This is useful for industry validation forms that only ask the skills for one role, such as Senior Data Engineer. The validator checks the respondent against the selected role and the skills present in the form, instead of comparing the response against every competency in the full model.

From the project root, run:

```powershell
python Python\scripts\excel_response_to_payload.py `
  --xlsx "C:\path\to\responses.xlsx" `
  --selected-path-key data_engineering `
  --selected-career-name "Senior Data Engineer" `
  --out-dir artifacts\role-validation
```

To validate only one worksheet row, pass the 1-based Excel row number:

```powershell
python Python\scripts\excel_response_to_payload.py `
  --xlsx "C:\path\to\responses.xlsx" `
  --selected-path-key data_engineering `
  --selected-career-name "Senior Data Engineer" `
  --row 2
```

To also export `/ml/score` payloads that can be passed to the existing model CLI/API, add `--export-payloads`:

```powershell
python Python\scripts\excel_response_to_payload.py `
  --xlsx "C:\path\to\responses.xlsx" `
  --selected-path-key data_engineering `
  --selected-career-name "Senior Data Engineer" `
  --out-dir artifacts\role-validation `
  --export-payloads
```

The validator writes:

- `*-validation-summary.csv`: one row per respondent, ready to open in Excel
- `*-validation-summary.json`: structured summary for backend or analysis use
- `*-validation-details.json`: full per-skill validation details
- `*-validation-report.md`: readable report with decisions, strengths, and gaps
- `payloads/row-*-score-payload.json`: optional model score payloads when `--export-payloads` is used

The summary includes the target role, job title, years of experience, evidence strength score, expected proficiency match score, coverage rate, answered skill count, decision, top strengths, and top gaps.

Score meanings:

- `fitScore`: evidence strength across the skills in the role form, weighted by role skill importance
- `requirementMatchScore`: whether the respondent met or exceeded each expected role proficiency, weighted by role skill importance

Use different target roles by changing `--selected-path-key` and `--selected-career-name`, for example:

```powershell
python Python\scripts\excel_response_to_payload.py `
  --xlsx "C:\path\to\data-scientist-responses.xlsx" `
  --selected-path-key data_science `
  --selected-career-name "Data Scientist"
```

Use one path key with one career name from the same row.

| Path key | Path name | Career names |
| --- | --- | --- |
| `business_intelligence` | Business Intelligence & Strategy | Associate Data Analyst; Data Analyst; BI Analyst; Senior BI Analyst; Business Analytics Manager; Business Analytics Director; Chief Business Function Officer |
| `data_stewardship` | Data Stewardship | Associate Data Analyst; Data Analyst; BI Analyst; Data Quality Specialist; Data Governance Manager; Data Governance Officer; Chief Data Officer |
| `data_engineering` | Data Engineering | Associate Data Analyst; Associate Data Engineer; Data Engineer; Senior Data Engineer; Data Architech; Chief Data Architech; Chief Information Officer |
| `data_science` | Data Science | Associate Data Analyst; Associate Data Engineer; Machine Learning Engineer; Data Scientist; Senior Data Scientist; Chief Data Scientist; Chief Analytics Officer |
| `ai_engineering` | AI Engineering | Associate Data Analyst; Associate Data Engineer; Machine Learning Engineer; AI Engineer; Senior AI Engineer; Chief AI Engineering; Chief Technology Officer |
| `applied_research` | Applied Research | Associate Data Analyst; Associate Data Engineer; Applied Data/AI Researcher; Senior Applied Data/AI Researcher; Research Manager; Director of Research; Chief Scientific Officer |

Notes:

- Form skill headers should use the same PSF-AAI skill names as the JobPath catalog.
- Blank skill answers in the form count as `0.0` by default for role validation.
- Use `--blank-score <number>` if you want blank skill answers to receive a different score.
- The script reads `.xlsx` files directly and does not require `pandas` or `openpyxl`.

## Visualize The Recommendation Model

You can export both:

- post-training model evaluation data
- training-oriented dataset and split data
- gradient boosting per-iteration retraining traces
- synthetic-data learning-curve diagnostics

Then open the included notebook to render charts.

### Files

- Export script: `Python/scripts/export_visualization_data.py`
- Notebook: `notebooks/recommendation_model_visualizations.ipynb`
- Default export folder: `artifacts/model-viz`

### Step 1. Install Notebook Packages

If you only want the notebook visuals, install these packages in the Python environment you will use for Jupyter:

```powershell
python -m pip install jupyter pandas matplotlib seaborn
```

If you also want the project ML environment:

```powershell
cd Python
python -m pip install -r requirements.txt
cd ..
python -m pip install jupyter pandas matplotlib seaborn
```

### Step 2. Export Visualization Data

From the project root:

```powershell
python Python\scripts\export_visualization_data.py --out-dir artifacts\model-viz
```

If you want the new per-iteration retraining traces and synthetic learning-curve files, retrain first:

```powershell
python Python\scripts\train.py
python Python\scripts\export_visualization_data.py --out-dir artifacts\model-viz
```

This creates files such as:

- `feature_importances.csv`
- `evaluation_metrics.csv`
- `calibration_bins.csv`
- `per_class_metrics.csv`
- `test_ensemble_confusion_matrix.csv`
- `training_profile_debug.csv`
- `training_split_class_distribution.csv`
- `training_split_archetype_distribution.csv`
- `gradient_boosting_iteration_trace.csv`
- `synthetic_learning_curve.csv`
- `training_summary.json`
- `visualization_bundle.json`

If you want to rebuild the training-side summaries from a specific dataset file instead of the synthetic fallback:

```powershell
python Python\scripts\export_visualization_data.py --dataset-path C:\path\to\your-dataset.json --out-dir artifacts\model-viz
```

### Step 3. Start Jupyter

From the project root:

```powershell
jupyter notebook
```

Or:

```powershell
jupyter lab
```

### Step 4. Open The Notebook

Open:

```text
notebooks/recommendation_model_visualizations.ipynb
```

### Step 5. Run The Cells Top To Bottom

The notebook is structured in this order:

1. Load the exported CSV and JSON files from `artifacts/model-viz`
2. Plot top feature importances
3. Compare model metrics across splits
4. Plot confidence calibration
5. Show weakest per-class F1 scores
6. Render the test confusion matrix
7. Plot training profile spread using `avgDistanceToBase`
8. Show archetype mix and hard-validation tag distributions
9. Plot gradient boosting per-iteration validation/test traces
10. Plot a synthetic-data learning curve using increasing training set sizes

### How It Works

The export script reads the saved recommendation model artifacts and flattens them into notebook-friendly tables.

Post-training outputs come from:

- `backend/data/recommendation-model.v3.json`
- `backend/data/recommendation-model.v3.evaluation.json`

Training-oriented outputs come from:

- the rebuilt training dataset in `Python/app/training_dataset.py`
- the split and hard-validation logic in `Python/app/training_models.py`

This means the notebook can show both final model performance and how the training dataset was shaped.
