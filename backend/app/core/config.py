from pydantic_settings import BaseSettings
from typing import List


class Settings(BaseSettings):
    # Database
    DATABASE_URL: str
    
    # Security
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 43200  # 30 días
    
    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:5173"
    
    # App
    APP_NAME: str = "SOAT Manager Hero"
    DEBUG: bool = False
    
    # Tarifas SOAT Holding Group Hero - 2026
    TARIFA_MOTO_HASTA_99CC: int = 256200
    TARIFA_MOTO_100_200CC: int = 343300
    COMISION_FIJA: int = 30000
    
    @property
    def allowed_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]
    
    class Config:
        env_file = ".env"
        case_sensitive = True


settings = Settings()
