# JOB-PATH (React + TypeScript)

## Dependencies
Install Node.js 
https://nodejs.org/

and git:
https://git-scm.com/

If you havent

## Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/jobpath.git
cd jobpath
```

## Set Up Environment Variables

Inside the `/backend` folder, create a `.env` file:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
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
