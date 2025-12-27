from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os
import shutil
from pathlib import Path
from app.core.database import get_db
from app.models.models import Recarga, Bolsa, Usuario
from app.schemas.schemas import RecargaCreate, RecargaResponse
from app.api.auth import get_current_admin, get_current_user

router = APIRouter()


@router.post("/", response_model=RecargaResponse)
async def crear_recarga(
    monto: int = Form(...),
    referencia: Optional[str] = Form(None),
    observaciones: Optional[str] = Form(None),
    documento_comprobante: Optional[UploadFile] = File(None),
    current_user: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Registrar una nueva recarga de bolsa con comprobante opcional.
    Solo para administradores.
    """
    # Validar archivo si se proporcionó
    documento_path = None
    if documento_comprobante:
        # Validar tipo de archivo (PDF o imágenes)
        allowed_types = ["application/pdf", "image/jpeg", "image/jpg", "image/png"]
        if documento_comprobante.content_type not in allowed_types:
            raise HTTPException(status_code=400, detail="El archivo debe ser PDF, JPG o PNG")
        
        # Validar tamaño (10MB max)
        if documento_comprobante.size and documento_comprobante.size > 10 * 1024 * 1024:
            raise HTTPException(status_code=400, detail="El archivo no debe superar 10MB")
    
    # Obtener o crear bolsa
    bolsa = db.query(Bolsa).first()
    if not bolsa:
        bolsa = Bolsa(saldo_actual=0)
        db.add(bolsa)
        db.commit()
        db.refresh(bolsa)
    
    # Actualizar saldo de la bolsa
    bolsa.saldo_actual += monto
    
    # Crear registro de recarga
    db_recarga = Recarga(
        monto=monto,
        referencia=referencia,
        observaciones=observaciones,
        usuario_registro_id=current_user.id
    )
    
    db.add(db_recarga)
    db.commit()
    db.refresh(db_recarga)
    
    # Guardar archivo si existe
    if documento_comprobante:
        upload_dir = Path("uploads/recargas")
        upload_dir.mkdir(parents=True, exist_ok=True)
        
        timestamp = int(datetime.now().timestamp())
        extension = documento_comprobante.filename.split('.')[-1]
        filename = f"{db_recarga.id}_comprobante_{timestamp}.{extension}"
        file_path = upload_dir / filename
        
        with file_path.open("wb") as buffer:
            shutil.copyfileobj(documento_comprobante.file, buffer)
        
        db_recarga.documento_comprobante = str(file_path)
        db.commit()
        db.refresh(db_recarga)
    
    return db_recarga


@router.get("/", response_model=List[RecargaResponse])
def listar_recargas(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Listar todas las recargas.
    Disponible para admin y cliente.
    """
    recargas = db.query(Recarga).order_by(Recarga.fecha_recarga.desc()).all()
    return recargas


@router.get("/{recarga_id}/documento-comprobante")
def descargar_comprobante(
    recarga_id: int,
    token: str = None,
    db: Session = Depends(get_db)
):
    """
    Descargar/visualizar comprobante de una recarga.
    Disponible para administradores.
    """
    # Validar token
    if not token:
        raise HTTPException(status_code=401, detail="Token requerido")
    
    from app.core.security import decode_access_token
    payload = decode_access_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Token inválido")
    
    recarga = db.query(Recarga).filter(Recarga.id == recarga_id).first()
    if not recarga:
        raise HTTPException(status_code=404, detail="Recarga no encontrada")
    
    if not recarga.documento_comprobante or not os.path.exists(recarga.documento_comprobante):
        raise HTTPException(status_code=404, detail="Comprobante no encontrado")
    
    # Determinar tipo de archivo
    extension = recarga.documento_comprobante.split('.')[-1].lower()
    if extension == 'pdf':
        media_type = "application/pdf"
    elif extension in ['jpg', 'jpeg']:
        media_type = "image/jpeg"
    elif extension == 'png':
        media_type = "image/png"
    else:
        media_type = "application/octet-stream"
    
    return FileResponse(
        path=recarga.documento_comprobante,
        media_type=media_type,
        headers={
            "Content-Disposition": f"inline; filename=comprobante_recarga_{recarga_id}.{extension}"
        }
    )
