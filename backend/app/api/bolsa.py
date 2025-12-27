from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.models import Bolsa, Usuario
from app.schemas.schemas import BolsaResponse
from app.api.auth import get_current_user

router = APIRouter()


@router.get("/saldo", response_model=BolsaResponse)
def get_saldo(current_user: Usuario = Depends(get_current_user), db: Session = Depends(get_db)):
    """
    Obtener el saldo actual de la bolsa.
    Disponible para admin y cliente.
    """
    bolsa = db.query(Bolsa).first()
    
    if not bolsa:
        # Inicializar bolsa si no existe
        bolsa = Bolsa(saldo_actual=0)
        db.add(bolsa)
        db.commit()
        db.refresh(bolsa)
    
    return bolsa
