from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .ml_api import router as ml_router
from .password_checker import router as password_router


app = FastAPI(title="JOB-PATH Python Services", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://jobpath.onrender.com",
        "https://jobpath-graymen.vercel.app",
        "https://jobpath-hyf4gfjsn-neater17s-projects.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok"}

app.include_router(password_router)
app.include_router(ml_router)
