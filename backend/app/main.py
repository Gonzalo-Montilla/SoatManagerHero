from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import engine, Base
from app.api import auth, bolsa, recargas, soats, dashboard, usuarios

# Crear tablas
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    debug=settings.DEBUG
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Incluir routers
app.include_router(auth.router, prefix="/api/auth", tags=["Autenticación"])
app.include_router(bolsa.router, prefix="/api/bolsa", tags=["Bolsa"])
app.include_router(recargas.router, prefix="/api/recargas", tags=["Recargas"])
app.include_router(soats.router, prefix="/api/soats", tags=["SOATs"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Dashboard"])
app.include_router(usuarios.router, prefix="/api/usuarios", tags=["Usuarios"])


@app.get("/")
def read_root():
    return {
        "app": settings.APP_NAME,
        "status": "running"
    }


@app.get("/api/health")
def health_check():
    return {"status": "ok"}
