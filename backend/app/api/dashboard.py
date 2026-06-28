from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.core.database import get_db
from app.core.config import settings
from app.core.finanzas import calcular_conciliacion_saldo
from app.models.models import Bolsa, SoatExpedido, Recarga, Usuario, TipoMotoCCEnum
from app.schemas.schemas import DashboardStats, DashboardMetricsResponse, DashboardClientMetricsResponse
from app.api.auth import get_current_admin, get_current_user

router = APIRouter()

MAX_RANGE_DAYS = 365


def _resolve_date_range(
    preset: str,
    start_date: date | None,
    end_date: date | None
) -> tuple[str, date, date]:
    tz = ZoneInfo(settings.APP_TIMEZONE)
    today = datetime.now(tz).date()

    if start_date or end_date:
        if not start_date or not end_date:
            raise HTTPException(status_code=400, detail="Para rango personalizado debes enviar start_date y end_date")
        if start_date > end_date:
            raise HTTPException(status_code=400, detail="start_date no puede ser mayor que end_date")
        if (end_date - start_date).days > MAX_RANGE_DAYS:
            raise HTTPException(status_code=400, detail=f"El rango máximo permitido es de {MAX_RANGE_DAYS} días")
        return "custom", start_date, end_date

    normalized = preset.lower()
    if normalized == "today":
        return "today", today, today
    if normalized == "week":
        start = today - timedelta(days=today.weekday())
        return "week", start, today
    if normalized == "month":
        start = today.replace(day=1)
        return "month", start, today
    if normalized == "last30":
        start = today - timedelta(days=29)
        return "last30", start, today

    raise HTTPException(status_code=400, detail="Preset inválido. Usa: today, week, month, last30")


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
    
    # SOATs expedidos hoy en la zona horaria de negocio
    soats_hoy = db.query(func.count(SoatExpedido.id)).filter(
        func.date(func.timezone(settings.APP_TIMEZONE, SoatExpedido.fecha_expedicion))
        == func.date(func.timezone(settings.APP_TIMEZONE, func.now()))
    ).scalar()
    
    return {
        "saldo_actual": saldo_actual,
        "total_soats_expedidos": total_soats_expedidos or 0,
        "total_comisiones_generadas": total_comisiones,
        "total_recargas": total_recargas,
        "soats_hoy": soats_hoy or 0
    }


@router.get("/metrics", response_model=DashboardMetricsResponse)
def get_dashboard_metrics(
    preset: str = Query("month"),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    current_user: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    resolved_preset, start, end = _resolve_date_range(preset, start_date, end_date)

    soat_local_date = func.date(func.timezone(settings.APP_TIMEZONE, SoatExpedido.fecha_expedicion))
    recarga_local_date = func.date(func.timezone(settings.APP_TIMEZONE, Recarga.fecha_recarga))

    soat_summary = db.query(
        func.count(SoatExpedido.id),
        func.coalesce(func.sum(SoatExpedido.comision), 0),
        func.coalesce(func.sum(SoatExpedido.total), 0),
        func.coalesce(func.sum(SoatExpedido.valor_soat), 0)
    ).filter(
        soat_local_date >= start,
        soat_local_date <= end
    ).one()

    recargas_total = db.query(
        func.coalesce(func.sum(Recarga.monto), 0)
    ).filter(
        recarga_local_date >= start,
        recarga_local_date <= end
    ).scalar() or 0

    soats_count = int(soat_summary[0] or 0)
    comisiones = int(soat_summary[1] or 0)
    consumo_total = int(soat_summary[2] or 0)
    valor_soat_total = int(soat_summary[3] or 0)
    ticket_promedio = round((consumo_total / soats_count), 2) if soats_count > 0 else 0.0

    by_type_rows = db.query(
        SoatExpedido.tipo_moto.label("tipo_moto"),
        func.count(SoatExpedido.id).label("cantidad"),
        func.coalesce(func.sum(SoatExpedido.valor_soat), 0).label("valor_soat"),
        func.coalesce(func.sum(SoatExpedido.comision), 0).label("comision"),
        func.coalesce(func.sum(SoatExpedido.total), 0).label("total")
    ).filter(
        soat_local_date >= start,
        soat_local_date <= end
    ).group_by(
        SoatExpedido.tipo_moto
    ).all()

    by_type_map = {
        row.tipo_moto: {
            "tipo_moto": row.tipo_moto,
            "cantidad": int(row.cantidad or 0),
            "valor_soat": int(row.valor_soat or 0),
            "comision": int(row.comision or 0),
            "total": int(row.total or 0),
        }
        for row in by_type_rows
    }

    by_type = []
    for tipo in TipoMotoCCEnum:
        by_type.append(
            by_type_map.get(
                tipo,
                {
                    "tipo_moto": tipo,
                    "cantidad": 0,
                    "valor_soat": 0,
                    "comision": 0,
                    "total": 0,
                }
            )
        )

    soat_daily_rows = db.query(
        soat_local_date.label("fecha"),
        func.count(SoatExpedido.id).label("soats_expedidos"),
        func.coalesce(func.sum(SoatExpedido.comision), 0).label("comisiones"),
        func.coalesce(func.sum(SoatExpedido.total), 0).label("consumo")
    ).filter(
        soat_local_date >= start,
        soat_local_date <= end
    ).group_by(
        soat_local_date
    ).all()

    recarga_daily_rows = db.query(
        recarga_local_date.label("fecha"),
        func.coalesce(func.sum(Recarga.monto), 0).label("recargas")
    ).filter(
        recarga_local_date >= start,
        recarga_local_date <= end
    ).group_by(
        recarga_local_date
    ).all()

    daily_map = {}
    current_day = start
    while current_day <= end:
        daily_map[current_day] = {
            "fecha": current_day,
            "soats_expedidos": 0,
            "comisiones": 0,
            "consumo": 0,
            "recargas": 0,
        }
        current_day += timedelta(days=1)

    for row in soat_daily_rows:
        day = row.fecha
        if day in daily_map:
            daily_map[day]["soats_expedidos"] = int(row.soats_expedidos or 0)
            daily_map[day]["comisiones"] = int(row.comisiones or 0)
            daily_map[day]["consumo"] = int(row.consumo or 0)

    for row in recarga_daily_rows:
        day = row.fecha
        if day in daily_map:
            daily_map[day]["recargas"] = int(row.recargas or 0)

    serie_diaria = [daily_map[day] for day in sorted(daily_map.keys())]

    return {
        "preset": resolved_preset,
        "start_date": start,
        "end_date": end,
        "resumen": {
            "soats_expedidos": soats_count,
            "comisiones_generadas": comisiones,
            "recargas_total": int(recargas_total),
            "consumo_total": consumo_total,
            "valor_soat_total": valor_soat_total,
            "ticket_promedio": ticket_promedio,
        },
        "por_tipo": by_type,
        "serie_diaria": serie_diaria,
    }


@router.get("/metrics-client", response_model=DashboardClientMetricsResponse)
def get_dashboard_metrics_client(
    preset: str = Query("month"),
    start_date: date | None = Query(None),
    end_date: date | None = Query(None),
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    resolved_preset, start, end = _resolve_date_range(preset, start_date, end_date)

    soat_local_date = func.date(func.timezone(settings.APP_TIMEZONE, SoatExpedido.fecha_expedicion))
    recarga_local_date = func.date(func.timezone(settings.APP_TIMEZONE, Recarga.fecha_recarga))

    soat_summary = db.query(
        func.count(SoatExpedido.id),
        func.coalesce(func.sum(SoatExpedido.total), 0)
    ).filter(
        soat_local_date >= start,
        soat_local_date <= end
    ).one()

    recargas_total = db.query(
        func.coalesce(func.sum(Recarga.monto), 0)
    ).filter(
        recarga_local_date >= start,
        recarga_local_date <= end
    ).scalar() or 0

    soats_count = int(soat_summary[0] or 0)
    consumo_total = int(soat_summary[1] or 0)
    ticket_promedio = round((consumo_total / soats_count), 2) if soats_count > 0 else 0.0

    by_type_rows = db.query(
        SoatExpedido.tipo_moto.label("tipo_moto"),
        func.count(SoatExpedido.id).label("cantidad"),
        func.coalesce(func.sum(SoatExpedido.total), 0).label("total")
    ).filter(
        soat_local_date >= start,
        soat_local_date <= end
    ).group_by(
        SoatExpedido.tipo_moto
    ).all()

    by_type_map = {
        row.tipo_moto: {
            "tipo_moto": row.tipo_moto,
            "cantidad": int(row.cantidad or 0),
            "total": int(row.total or 0),
        }
        for row in by_type_rows
    }

    by_type = []
    for tipo in TipoMotoCCEnum:
        by_type.append(
            by_type_map.get(
                tipo,
                {
                    "tipo_moto": tipo,
                    "cantidad": 0,
                    "total": 0,
                }
            )
        )

    soat_daily_rows = db.query(
        soat_local_date.label("fecha"),
        func.count(SoatExpedido.id).label("soats_expedidos"),
        func.coalesce(func.sum(SoatExpedido.total), 0).label("consumo")
    ).filter(
        soat_local_date >= start,
        soat_local_date <= end
    ).group_by(
        soat_local_date
    ).all()

    recarga_daily_rows = db.query(
        recarga_local_date.label("fecha"),
        func.coalesce(func.sum(Recarga.monto), 0).label("recargas")
    ).filter(
        recarga_local_date >= start,
        recarga_local_date <= end
    ).group_by(
        recarga_local_date
    ).all()

    daily_map = {}
    current_day = start
    while current_day <= end:
        daily_map[current_day] = {
            "fecha": current_day,
            "soats_expedidos": 0,
            "consumo": 0,
            "recargas": 0,
        }
        current_day += timedelta(days=1)

    for row in soat_daily_rows:
        day = row.fecha
        if day in daily_map:
            daily_map[day]["soats_expedidos"] = int(row.soats_expedidos or 0)
            daily_map[day]["consumo"] = int(row.consumo or 0)

    for row in recarga_daily_rows:
        day = row.fecha
        if day in daily_map:
            daily_map[day]["recargas"] = int(row.recargas or 0)

    serie_diaria = [daily_map[day] for day in sorted(daily_map.keys())]

    return {
        "preset": resolved_preset,
        "start_date": start,
        "end_date": end,
        "resumen": {
            "soats_expedidos": soats_count,
            "recargas_total": int(recargas_total),
            "consumo_total": consumo_total,
            "ticket_promedio": ticket_promedio,
        },
        "por_tipo": by_type,
        "serie_diaria": serie_diaria,
    }


@router.get("/conciliacion")
def get_conciliacion_saldo(
    current_user: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Verifica si el saldo guardado en bolsa cuadra contra:
    sum(recargas) - sum(consumos SOAT).
    Solo para administradores.
    """
    return calcular_conciliacion_saldo(db)
