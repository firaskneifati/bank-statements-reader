import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import upload, export

app = FastAPI(title="Bank Statement Reader", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(upload.router, prefix="/api/v1")
app.include_router(export.router, prefix="/api/v1")

os.makedirs(settings.upload_dir, exist_ok=True)


@app.get("/")
async def health_check():
    return {"status": "ok"}
