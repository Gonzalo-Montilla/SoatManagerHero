"""
Script de auditoría rápida para validar consistencia de saldo.

Uso:
  python auditar_saldo.py
"""
import sys

from app.core.database import SessionLocal
from app.core.finanzas import calcular_conciliacion_saldo


def main():
    db = SessionLocal()
    try:
        data = calcular_conciliacion_saldo(db)
        print("=== Auditoría de Saldo ===")
        print(f"Saldo actual (tabla bolsa): {data['saldo_actual']}")
        print(f"Total recargas:            {data['total_recargas']}")
        print(f"Total consumo SOAT:        {data['total_consumo_soat']}")
        print(f"Saldo esperado:            {data['saldo_esperado']}")
        print(f"Diferencia:                {data['diferencia']}")
        print(f"Estado:                    {'CUADRADO' if data['cuadrado'] else 'DESCUADRADO'}")
        if not data["cuadrado"]:
            # Código de salida != 0 para frenar despliegues automáticos/manuales
            sys.exit(1)
    finally:
        db.close()


if __name__ == "__main__":
    main()
