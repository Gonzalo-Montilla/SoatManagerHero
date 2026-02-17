from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.models import Bolsa, Recarga, SoatExpedido, TipoMotoCCEnum


def calcular_valor_soat_por_tipo(tipo_moto: TipoMotoCCEnum) -> int:
    if tipo_moto == TipoMotoCCEnum.HASTA_99CC:
        return settings.TARIFA_MOTO_HASTA_99CC
    if tipo_moto == TipoMotoCCEnum.DE_100_200CC:
        return settings.TARIFA_MOTO_100_200CC
    raise ValueError("Tipo de moto inválido")


def calcular_detalle_soat(tipo_moto: TipoMotoCCEnum) -> tuple[int, int, int]:
    valor_soat = calcular_valor_soat_por_tipo(tipo_moto)
    comision = settings.COMISION_FIJA
    total = valor_soat + comision
    return valor_soat, comision, total


def calcular_conciliacion_saldo(db: Session) -> dict:
    bolsa = db.query(Bolsa).first()
    saldo_actual = bolsa.saldo_actual if bolsa else 0

    total_recargas = db.query(func.coalesce(func.sum(Recarga.monto), 0)).scalar() or 0
    total_consumo_soat = db.query(func.coalesce(func.sum(SoatExpedido.total), 0)).scalar() or 0
    saldo_esperado = total_recargas - total_consumo_soat
    diferencia = saldo_actual - saldo_esperado

    return {
        "saldo_actual": saldo_actual,
        "total_recargas": total_recargas,
        "total_consumo_soat": total_consumo_soat,
        "saldo_esperado": saldo_esperado,
        "diferencia": diferencia,
        "cuadrado": diferencia == 0,
    }
