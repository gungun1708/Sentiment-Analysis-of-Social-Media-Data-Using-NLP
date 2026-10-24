import logging

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.routes.router import router
from app.core.config import settings
from app.core.logging import configure_logging
from app.database.session import Base, engine
from app.models import Analysis  # noqa: F401

configure_logging()
logger = logging.getLogger(__name__)
Base.metadata.create_all(bind=engine)

app = FastAPI(title=settings.app_name, version="1.0.0", description="NLP-powered social media sentiment analysis API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def unexpected_error_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled request error at %s", request.url.path)
    return JSONResponse(status_code=500, content={"detail": "An unexpected server error occurred"})


app.include_router(router)
