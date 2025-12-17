# main.py
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import uvicorn
import os
from datetime import datetime, timezone
from app.routers import collaborators

# Import routers
from .routers import mindmaps, nodes, votes

# Import database
from .core.database import engine, Base


# Create tables on startup
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    Base.metadata.create_all(bind=engine)
    yield
    # Shutdown
    pass


# Initialize FastAPI app
app = FastAPI(
    title="MindMap Collaborative API",
    description="Backend API for collaborative idea mapping and theme tracking",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# CORS middleware - simplified

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Global error handlers
@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "detail": exc.detail,
            "status_code": exc.status_code,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "path": str(request.url)
        }
    )


@app.exception_handler(500)
async def internal_server_error_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal server error",
            "status_code": 500,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "path": str(request.url)
        }
    )


# Include routers
app.include_router(mindmaps.router)
app.include_router(nodes.router)
app.include_router(votes.router)

app.include_router(collaborators.router)


# Root endpoints
@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "message": "MindMap Collaborative API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "endpoints": {
            "mindmaps": "/api/mindmaps",
            "nodes": "/api/nodes",
            "votes": "/api/votes"
        }
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for monitoring"""
    return {
        "status": "healthy",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "service": "mindmap-api"
    }


@app.get("/version")
async def get_version():
    """Get API version"""
    return {
        "version": "1.0.0",
        "api_name": "MindMap Collaborative API"
    }


# Debug endpoints
@app.get("/debug/routes")
async def list_routes():
    """Debug endpoint to list all available routes"""
    routes = []
    for route in app.routes:
        if hasattr(route, 'methods') and hasattr(route, 'path'):
            routes.append({
                "path": route.path,
                "methods": list(route.methods)
            })
    return {"routes": routes}


@app.get("/debug/db")
async def debug_database():
    """Debug endpoint to check database connection"""
    try:
        from .core.database import SessionLocal
        db = SessionLocal()
        db.execute("SELECT 1")
        db.close()
        return {"database": "connected", "status": "healthy"}
    except Exception as e:
        return {"database": "error", "message": str(e)}


# Run server
if __name__ == "__main__":
    config = {
        "host": "0.0.0.0",
        "port": int(os.getenv("PORT", 8000)),
        "reload": True,
        "log_level": "info"
    }

    uvicorn.run("main:app", **config)