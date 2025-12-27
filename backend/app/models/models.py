from sqlalchemy import Column, Integer, String, DateTime, Enum, Text, BigInteger
from sqlalchemy.sql import func
from datetime import datetime
import enum
try:
    from app.core.database import Base
except ImportError:
    from core.database import Base


class RolEnum(str, enum.Enum):
    ADMIN = "admin"
    CLIENTE = "cliente"


class TipoMotoCCEnum(str, enum.Enum):
    HASTA_99CC = "hasta_99cc"
    DE_100_200CC = "100_200cc"


class Usuario(Base):
    __tablename__ = "usuarios"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    nombre_completo = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    rol = Column(Enum(RolEnum), nullable=False, default=RolEnum.CLIENTE)
    activo = Column(Integer, default=1)  # 1 = activo, 0 = inactivo
    fecha_creacion = Column(DateTime(timezone=True), server_default=func.now())
    fecha_actualizacion = Column(DateTime(timezone=True), onupdate=func.now())


class Bolsa(Base):
    __tablename__ = "bolsa"
    
    id = Column(Integer, primary_key=True, index=True)
    saldo_actual = Column(BigInteger, nullable=False, default=0)
    fecha_actualizacion = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class Recarga(Base):
    __tablename__ = "recargas"
    
    id = Column(Integer, primary_key=True, index=True)
    monto = Column(BigInteger, nullable=False)
    referencia = Column(String(255))
    observaciones = Column(Text)
    documento_comprobante = Column(String(500))  # Ruta al PDF/imagen del comprobante
    fecha_recarga = Column(DateTime(timezone=True), server_default=func.now())
    usuario_registro_id = Column(Integer, nullable=False)  # ID del admin que registró


class SoatExpedido(Base):
    __tablename__ = "soats_expedidos"
    
    id = Column(Integer, primary_key=True, index=True)
    placa = Column(String(20), nullable=False, index=True)
    cedula = Column(String(20), nullable=False)
    nombre_propietario = Column(String(255), nullable=False)
    tipo_moto = Column(Enum(TipoMotoCCEnum), nullable=False)
    valor_soat = Column(Integer, nullable=False)
    comision = Column(Integer, nullable=False)
    total = Column(Integer, nullable=False)  # valor_soat + comision
    observaciones = Column(Text)
    documento_factura = Column(String(500))  # Ruta al PDF de factura/documentos
    documento_soat = Column(String(500))  # Ruta al PDF del SOAT expedido
    documento_poliza = Column(String(500))  # Ruta al PDF de la póliza (se sube después)
    fecha_expedicion = Column(DateTime(timezone=True), server_default=func.now())
    usuario_registro_id = Column(Integer, nullable=False)  # ID del admin que registró
