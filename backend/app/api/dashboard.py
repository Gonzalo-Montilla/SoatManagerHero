from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, date
from app.core.database import get_db
from app.models.models import Bolsa, SoatExpedido, Recarga, Usuario
from app.schemas.schemas import DashboardStats
from app.api.auth import get_current_admin

router = APIRouter()


@router.get("/stats", response_model=DashboardStats)
def get_dashboard_stats(
    current_user: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Obtener estadísticas del dashboard.
    Solo para administradores.
    """
    # Saldo actual
    bolsa = db.query(Bolsa).first()
    saldo_actual = bolsa.saldo_actual if bolsa else 0
    
    # Total SOATs expedidos
    total_soats_expedidos = db.query(func.count(SoatExpedido.id)).scalar()
    
    # Total comisiones generadas
    total_comisiones = db.query(func.sum(SoatExpedido.comision)).scalar() or 0
    
    # Total recargas (monto)
    total_recargas = db.query(func.sum(Recarga.monto)).scalar() or 0
    
    # SOATs expedidos hoy
    hoy = date.today()
    soats_hoy = db.query(func.count(SoatExpedido.id)).filter(
        func.date(SoatExpedido.fecha_expedicion) == hoy
    ).scalar()
    
    return {
        "saldo_actual": saldo_actual,
        "total_soats_expedidos": total_soats_expedidos or 0,
        "total_comisiones_generadas": total_comisiones,
        "total_recargas": total_recargas,
        "soats_hoy": soats_hoy or 0
    }
