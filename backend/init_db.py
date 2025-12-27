"""
Script para inicializar la base de datos con usuarios por defecto
"""
from app.core.database import SessionLocal, engine, Base
from app.models.models import Usuario, Bolsa, RolEnum
from app.core.security import get_password_hash

def init_db():
    # Crear todas las tablas
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # Verificar si ya existen usuarios
        existing_users = db.query(Usuario).count()
        if existing_users > 0:
            print("La base de datos ya tiene usuarios. Saltando inicialización.")
            return
        
        # Crear usuario administrador
        admin = Usuario(
            email="admin@soat.com",
            nombre_completo="Administrador",
            hashed_password=get_password_hash("admin123"),
            rol=RolEnum.ADMIN,
            activo=1
        )
        db.add(admin)
        
        # Crear usuario cliente (Holding Group - Hero)
        cliente = Usuario(
            email="hero@holding.com",
            nombre_completo="Holding Group - Hero",
            hashed_password=get_password_hash("hero123"),
            rol=RolEnum.CLIENTE,
            activo=1
        )
        db.add(cliente)
        
        # Inicializar bolsa
        bolsa = Bolsa(saldo_actual=0)
        db.add(bolsa)
        
        db.commit()
        
        print("✅ Base de datos inicializada correctamente")
        print("\nUsuarios creados:")
        print("  - Administrador: admin@soat.com / admin123")
        print("  - Cliente Hero: hero@holding.com / hero123")
        print("\nBolsa inicializada con saldo: $0")
        
    except Exception as e:
        print(f"❌ Error al inicializar la base de datos: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("Inicializando base de datos...")
    init_db()
