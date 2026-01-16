from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional
from app.models.models import RolEnum, TipoMotoCCEnum


# ========== Usuario Schemas ==========
class UsuarioBase(BaseModel):
    email: EmailStr
    nombre_completo: str
    rol: RolEnum


class UsuarioCreate(UsuarioBase):
    password: str


class UsuarioResponse(UsuarioBase):
    id: int
    activo: int
    fecha_creacion: datetime
    
    class Config:
        from_attributes = True


class UsuarioLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str
    usuario: UsuarioResponse


# ========== Bolsa Schemas ==========
class BolsaResponse(BaseModel):
    id: int
    saldo_actual: int
    fecha_actualizacion: datetime
    
    class Config:
        from_attributes = True


# ========== Recarga Schemas ==========
class RecargaCreate(BaseModel):
    monto: int
    referencia: Optional[str] = None
    observaciones: Optional[str] = None


class RecargaResponse(BaseModel):
    id: int
    monto: int
    referencia: Optional[str]
    observaciones: Optional[str]
    documento_comprobante: Optional[str]
    fecha_recarga: datetime
    usuario_registro_id: int
    
    class Config:
        from_attributes = True


# ========== SOAT Expedido Schemas ==========
class SoatExpedidoCreate(BaseModel):
    placa: str
    cedula: Optional[str] = None
    nombre_propietario: Optional[str] = None
    tipo_moto: TipoMotoCCEnum
    observaciones: Optional[str] = None


class SoatExpedidoUpdate(BaseModel):
    placa: Optional[str] = None
    cedula: Optional[str] = None
    nombre_propietario: Optional[str] = None
    tipo_moto: Optional[TipoMotoCCEnum] = None
    observaciones: Optional[str] = None


class SoatExpedidoResponse(BaseModel):
    id: int
    placa: str
    cedula: Optional[str]
    nombre_propietario: Optional[str]
    tipo_moto: TipoMotoCCEnum
    valor_soat: int
    comision: int
    total: int
    observaciones: Optional[str]
    documento_factura: Optional[str]
    documento_soat: Optional[str]
    documento_poliza: Optional[str]
    fecha_expedicion: datetime
    usuario_registro_id: int
    
    class Config:
        from_attributes = True


# ========== Dashboard Schemas ==========
class DashboardStats(BaseModel):
    saldo_actual: int
    total_soats_expedidos: int
    total_comisiones_generadas: int
    total_recargas: int
    soats_hoy: int
