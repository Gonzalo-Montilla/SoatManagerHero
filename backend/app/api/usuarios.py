from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.core.database import get_db
from app.models.models import Usuario
from app.schemas.schemas import UsuarioCreate, UsuarioResponse
from app.api.auth import get_current_admin
from app.core.security import get_password_hash

router = APIRouter()


@router.get("/", response_model=List[UsuarioResponse])
def listar_usuarios(
    current_user: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Listar todos los usuarios.
    Solo para administradores.
    """
    usuarios = db.query(Usuario).order_by(Usuario.fecha_creacion.desc()).all()
    return usuarios


@router.post("/", response_model=UsuarioResponse)
def crear_usuario(
    usuario_data: UsuarioCreate,
    current_user: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Crear un nuevo usuario.
    Solo para administradores.
    """
    # Verificar si el email ya existe
    existing_user = db.query(Usuario).filter(Usuario.email == usuario_data.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    # Crear usuario
    hashed_password = get_password_hash(usuario_data.password)
    db_usuario = Usuario(
        email=usuario_data.email,
        nombre_completo=usuario_data.nombre_completo,
        rol=usuario_data.rol,
        password_hash=hashed_password,
        activo=1
    )
    
    db.add(db_usuario)
    db.commit()
    db.refresh(db_usuario)
    
    return db_usuario


@router.put("/{usuario_id}/toggle-activo", response_model=UsuarioResponse)
def toggle_usuario_activo(
    usuario_id: int,
    current_user: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Activar/desactivar un usuario.
    Solo para administradores.
    """
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    # No permitir desactivarse a sí mismo
    if usuario.id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes desactivarte a ti mismo")
    
    usuario.activo = 0 if usuario.activo == 1 else 1
    db.commit()
    db.refresh(usuario)
    
    return usuario


@router.put("/{usuario_id}/reset-password")
def reset_password(
    usuario_id: int,
    new_password: str,
    current_user: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Resetear contraseña de un usuario.
    Solo para administradores.
    """
    usuario = db.query(Usuario).filter(Usuario.id == usuario_id).first()
    if not usuario:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    
    usuario.password_hash = get_password_hash(new_password)
    db.commit()
    
    return {"message": "Contraseña actualizada exitosamente"}
