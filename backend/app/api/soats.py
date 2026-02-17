from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import datetime
import os
import shutil
from pathlib import Path
from app.core.database import get_db
from app.core.finanzas import calcular_detalle_soat
from app.models.models import SoatExpedido, Bolsa, Usuario, TipoMotoCCEnum
from app.schemas.schemas import SoatExpedidoCreate, SoatExpedidoResponse, SoatExpedidoUpdate
from app.api.auth import get_current_user, get_current_admin, get_current_user_from_request

router = APIRouter()


def _get_upload_size(file: UploadFile) -> int:
    file.file.seek(0, os.SEEK_END)
    size = file.file.tell()
    file.file.seek(0)
    return size


def _validar_pdf(file: UploadFile, field_name: str):
    if file.content_type != "application/pdf":
        raise HTTPException(status_code=400, detail=f"El documento de {field_name} debe ser un PDF")

    size = _get_upload_size(file)
    if size > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"El documento de {field_name} no debe superar 10MB")

    header = file.file.read(5)
    file.file.seek(0)
    if header != b"%PDF-":
        raise HTTPException(status_code=400, detail=f"El archivo PDF de {field_name} es inválido")


@router.post("/", response_model=SoatExpedidoResponse)
async def expedir_soat(
    placa: str = Form(...),
    cedula: Optional[str] = Form(None),
    nombre_propietario: Optional[str] = Form(None),
    tipo_moto: TipoMotoCCEnum = Form(...),
    observaciones: Optional[str] = Form(None),
    documento_factura: UploadFile = File(...),
    documento_soat: UploadFile = File(...),
    current_user: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Expedir un nuevo SOAT con documentos PDF.
    Solo para administradores.
    """
    # Validar que los archivos sean PDFs válidos
    _validar_pdf(documento_factura, "factura")
    _validar_pdf(documento_soat, "SOAT")
    
    try:
        valor_soat, comision, total = calcular_detalle_soat(tipo_moto)
    except ValueError:
        raise HTTPException(status_code=400, detail="Tipo de moto inválido")
    
    # Verificar saldo en bolsa
    bolsa = db.query(Bolsa).first()
    if not bolsa:
        raise HTTPException(status_code=400, detail="No hay bolsa inicializada")
    
    # Operación atómica: saldo + registro + archivos
    factura_path = None
    soat_path = None
    try:
        # Descontar de la bolsa
        bolsa.saldo_actual -= total

        # Crear registro de SOAT expedido
        db_soat = SoatExpedido(
            placa=placa.upper(),
            cedula=cedula.upper() if cedula else None,
            nombre_propietario=nombre_propietario.upper() if nombre_propietario else None,
            tipo_moto=tipo_moto,
            valor_soat=valor_soat,
            comision=comision,
            total=total,
            observaciones=observaciones,
            usuario_registro_id=current_user.id
        )

        db.add(db_soat)
        db.flush()

        # Guardar archivos PDF
        upload_dir = Path("uploads/soats")
        upload_dir.mkdir(parents=True, exist_ok=True)

        timestamp = int(datetime.now().timestamp())

        factura_filename = f"{db_soat.id}_factura_{timestamp}.pdf"
        factura_path = upload_dir / factura_filename
        with factura_path.open("wb") as buffer:
            shutil.copyfileobj(documento_factura.file, buffer)

        soat_filename = f"{db_soat.id}_soat_{timestamp}.pdf"
        soat_path = upload_dir / soat_filename
        with soat_path.open("wb") as buffer:
            shutil.copyfileobj(documento_soat.file, buffer)

        db_soat.documento_factura = str(factura_path)
        db_soat.documento_soat = str(soat_path)

        db.commit()
        db.refresh(db_soat)
        return db_soat
    except Exception:
        db.rollback()
        for file_path in (factura_path, soat_path):
            if file_path and file_path.exists():
                try:
                    file_path.unlink()
                except OSError:
                    pass
        raise


@router.get("/", response_model=List[SoatExpedidoResponse])
def listar_soats(
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Listar todos los SOATs expedidos.
    Disponible para admin y cliente.
    """
    soats = db.query(SoatExpedido).order_by(SoatExpedido.fecha_expedicion.desc()).all()
    return soats


@router.get("/{soat_id}", response_model=SoatExpedidoResponse)
def obtener_soat(
    soat_id: int,
    current_user: Usuario = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Obtener un SOAT específico por ID.
    Disponible para admin y cliente.
    """
    soat = db.query(SoatExpedido).filter(SoatExpedido.id == soat_id).first()
    if not soat:
        raise HTTPException(status_code=404, detail="SOAT no encontrado")
    return soat


@router.put("/{soat_id}", response_model=SoatExpedidoResponse)
def actualizar_soat(
    soat_id: int,
    soat_data: SoatExpedidoUpdate,
    current_user: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Actualizar datos de un SOAT expedido.
    Solo para administradores.
    Ajusta automáticamente el saldo de la bolsa si cambia el tipo de moto.
    """
    # Buscar SOAT
    soat = db.query(SoatExpedido).filter(SoatExpedido.id == soat_id).first()
    if not soat:
        raise HTTPException(status_code=404, detail="SOAT no encontrado")
    
    # Obtener bolsa
    bolsa = db.query(Bolsa).first()
    if not bolsa:
        raise HTTPException(status_code=400, detail="No hay bolsa inicializada")
    
    # Si cambia el tipo de moto, recalcular valores y ajustar bolsa
    if soat_data.tipo_moto and soat_data.tipo_moto != soat.tipo_moto:
        try:
            nuevo_valor_soat, nueva_comision, nuevo_total = calcular_detalle_soat(soat_data.tipo_moto)
        except ValueError:
            raise HTTPException(status_code=400, detail="Tipo de moto inválido")
        
        # Calcular diferencia
        diferencia = nuevo_total - soat.total
        
        # Ajustar bolsa
        if diferencia > 0:
            # Se necesita descontar más de la bolsa (puede quedar en negativo)
            bolsa.saldo_actual -= diferencia
        else:
            # Se devuelve dinero a la bolsa
            bolsa.saldo_actual += abs(diferencia)
        
        # Actualizar valores del SOAT
        soat.tipo_moto = soat_data.tipo_moto
        soat.valor_soat = nuevo_valor_soat
        soat.comision = nueva_comision
        soat.total = nuevo_total
    
    # Actualizar otros campos
    if soat_data.placa is not None:
        soat.placa = soat_data.placa.upper()
    if soat_data.cedula is not None:
        soat.cedula = soat_data.cedula.upper() if soat_data.cedula else None
    if soat_data.nombre_propietario is not None:
        soat.nombre_propietario = soat_data.nombre_propietario.upper() if soat_data.nombre_propietario else None
    if soat_data.observaciones is not None:
        soat.observaciones = soat_data.observaciones
    
    db.commit()
    db.refresh(soat)
    
    return soat


@router.put("/{soat_id}/reemplazar-factura", response_model=SoatExpedidoResponse)
async def reemplazar_factura(
    soat_id: int,
    documento_factura: UploadFile = File(...),
    current_user: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Reemplazar documento de factura de un SOAT expedido.
    Solo para administradores.
    Elimina el archivo anterior y guarda el nuevo.
    """
    # Buscar SOAT
    soat = db.query(SoatExpedido).filter(SoatExpedido.id == soat_id).first()
    if not soat:
        raise HTTPException(status_code=404, detail="SOAT no encontrado")
    
    # Validar que sea PDF
    _validar_pdf(documento_factura, "factura")
    
    # Eliminar archivo anterior si existe
    if soat.documento_factura and os.path.exists(soat.documento_factura):
        try:
            os.remove(soat.documento_factura)
        except Exception:
            pass  # Si no se puede eliminar, continuar
    
    # Guardar nuevo archivo
    upload_dir = Path("uploads/soats")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = int(datetime.now().timestamp())
    factura_filename = f"{soat_id}_factura_{timestamp}.pdf"
    factura_path = upload_dir / factura_filename
    
    with factura_path.open("wb") as buffer:
        shutil.copyfileobj(documento_factura.file, buffer)
    
    # Actualizar BD
    soat.documento_factura = str(factura_path)
    db.commit()
    db.refresh(soat)
    
    return soat


@router.put("/{soat_id}/reemplazar-soat", response_model=SoatExpedidoResponse)
async def reemplazar_soat(
    soat_id: int,
    documento_soat: UploadFile = File(...),
    current_user: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Reemplazar documento SOAT de un SOAT expedido.
    Solo para administradores.
    Elimina el archivo anterior y guarda el nuevo.
    """
    # Buscar SOAT
    soat = db.query(SoatExpedido).filter(SoatExpedido.id == soat_id).first()
    if not soat:
        raise HTTPException(status_code=404, detail="SOAT no encontrado")
    
    # Validar que sea PDF
    _validar_pdf(documento_soat, "SOAT")
    
    # Eliminar archivo anterior si existe
    if soat.documento_soat and os.path.exists(soat.documento_soat):
        try:
            os.remove(soat.documento_soat)
        except Exception:
            pass  # Si no se puede eliminar, continuar
    
    # Guardar nuevo archivo
    upload_dir = Path("uploads/soats")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = int(datetime.now().timestamp())
    soat_filename = f"{soat_id}_soat_{timestamp}.pdf"
    soat_path = upload_dir / soat_filename
    
    with soat_path.open("wb") as buffer:
        shutil.copyfileobj(documento_soat.file, buffer)
    
    # Actualizar BD
    soat.documento_soat = str(soat_path)
    db.commit()
    db.refresh(soat)
    
    return soat


@router.post("/{soat_id}/upload-poliza", response_model=SoatExpedidoResponse)
async def upload_poliza(
    soat_id: int,
    documento_poliza: UploadFile = File(...),
    current_user: Usuario = Depends(get_current_admin),
    db: Session = Depends(get_db)
):
    """
    Subir PDF de póliza a un SOAT expedido.
    Solo para administradores.
    """
    # Buscar SOAT
    soat = db.query(SoatExpedido).filter(SoatExpedido.id == soat_id).first()
    if not soat:
        raise HTTPException(status_code=404, detail="SOAT no encontrado")
    
    # Validar que sea PDF
    _validar_pdf(documento_poliza, "póliza")
    
    # Guardar archivo
    upload_dir = Path("uploads/soats")
    upload_dir.mkdir(parents=True, exist_ok=True)
    
    timestamp = int(datetime.now().timestamp())
    poliza_filename = f"{soat_id}_poliza_{timestamp}.pdf"
    poliza_path = upload_dir / poliza_filename
    
    with poliza_path.open("wb") as buffer:
        shutil.copyfileobj(documento_poliza.file, buffer)
    
    # Actualizar BD
    soat.documento_poliza = str(poliza_path)
    db.commit()
    db.refresh(soat)
    
    return soat


@router.get("/{soat_id}/documento-factura")
def descargar_factura(
    soat_id: int,
    current_user: Usuario = Depends(get_current_user_from_request),
    db: Session = Depends(get_db)
):
    """
    Descargar PDF de factura de un SOAT.
    Disponible para admin y cliente.
    """
    soat = db.query(SoatExpedido).filter(SoatExpedido.id == soat_id).first()
    if not soat:
        raise HTTPException(status_code=404, detail="SOAT no encontrado")
    
    if not soat.documento_factura or not os.path.exists(soat.documento_factura):
        raise HTTPException(status_code=404, detail="Documento de factura no encontrado")
    
    return FileResponse(
        path=soat.documento_factura,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename=factura_soat_{soat_id}.pdf"
        }
    )


@router.get("/{soat_id}/documento-soat")
def descargar_soat(
    soat_id: int,
    current_user: Usuario = Depends(get_current_user_from_request),
    db: Session = Depends(get_db)
):
    """
    Descargar PDF del SOAT expedido.
    Disponible para admin y cliente.
    """
    soat = db.query(SoatExpedido).filter(SoatExpedido.id == soat_id).first()
    if not soat:
        raise HTTPException(status_code=404, detail="SOAT no encontrado")
    
    if not soat.documento_soat or not os.path.exists(soat.documento_soat):
        raise HTTPException(status_code=404, detail="Documento SOAT no encontrado")
    
    return FileResponse(
        path=soat.documento_soat,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename=soat_{soat_id}.pdf"
        }
    )


@router.get("/{soat_id}/documento-poliza")
def descargar_poliza(
    soat_id: int,
    current_user: Usuario = Depends(get_current_user_from_request),
    db: Session = Depends(get_db)
):
    """
    Descargar PDF de póliza de un SOAT.
    Disponible para admin y cliente.
    """
    soat = db.query(SoatExpedido).filter(SoatExpedido.id == soat_id).first()
    if not soat:
        raise HTTPException(status_code=404, detail="SOAT no encontrado")
    
    if not soat.documento_poliza or not os.path.exists(soat.documento_poliza):
        raise HTTPException(status_code=404, detail="Documento de póliza no encontrado")
    
    return FileResponse(
        path=soat.documento_poliza,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"inline; filename=poliza_soat_{soat_id}.pdf"
        }
    )
