# Backend - SOAT Manager Hero

API REST con FastAPI para gestión de pólizas SOAT.

## Requisitos
- Python 3.8+
- PostgreSQL 12+

## Instalación Local

### 1. Crear entorno virtual
```bash
python -m venv venv
```

### 2. Activar entorno virtual
**Windows:**
```bash
venv\Scripts\activate
```

**Linux/Mac:**
```bash
source venv/bin/activate
```

### 3. Instalar dependencias
```bash
pip install -r requirements.txt
```

### 4. Configurar variables de entorno
Copiar `.env.example` a `.env` y configurar:
```bash
cp .env.example .env
```

Editar `.env` con tus datos:
```
DATABASE_URL=postgresql://usuario:password@localhost:5432/soat_manager_hero
SECRET_KEY=genera-un-key-seguro-aqui
```

### 5. Inicializar base de datos
```bash
python init_db.py
```

### 6. Ejecutar servidor
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

La API estará disponible en: `http://localhost:8000`
Documentación Swagger: `http://localhost:8000/docs`

## Usuarios por Defecto

Después de ejecutar `init_db.py`:

- **Administrador:**
  - Email: `admin@soat.com`
  - Password: `admin123`

- **Cliente (Holding Group - Hero):**
  - Email: `hero@holding.com`
  - Password: `hero123`

## Estructura de la API

### Autenticación
- `POST /api/auth/register` - Registrar usuario
- `POST /api/auth/login` - Iniciar sesión
- `GET /api/auth/me` - Obtener usuario actual

### Bolsa
- `GET /api/bolsa/saldo` - Ver saldo actual

### Recargas (Solo Admin)
- `POST /api/recargas/` - Registrar recarga
- `GET /api/recargas/` - Listar recargas

### SOATs
- `POST /api/soats/` - Expedir SOAT (Solo Admin)
- `GET /api/soats/` - Listar SOATs
- `GET /api/soats/{id}` - Obtener SOAT específico

### Dashboard (Solo Admin)
- `GET /api/dashboard/stats` - Estadísticas generales

## Deployment en Producción

### 1. Crear base de datos PostgreSQL
```sql
CREATE DATABASE soat_manager_hero;
CREATE USER soat_user WITH PASSWORD 'password_seguro';
GRANT ALL PRIVILEGES ON DATABASE soat_manager_hero TO soat_user;
```

### 2. Configurar servicio systemd
Crear archivo `/etc/systemd/system/soat-backend.service`:
```ini
[Unit]
Description=SOAT Manager Hero Backend
After=network.target postgresql.service

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/var/www/soat-manager-hero/backend
Environment="PATH=/var/www/soat-manager-hero/backend/venv/bin"
Environment="DATABASE_URL=postgresql://soat_user:password@localhost:5432/soat_manager_hero"
ExecStart=/var/www/soat-manager-hero/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8002
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
```

### 3. Habilitar y ejecutar servicio
```bash
sudo systemctl enable soat-backend
sudo systemctl start soat-backend
sudo systemctl status soat-backend
```

## Tarifas Configuradas

- Moto hasta 99cc: **$243,700**
- Moto 100-200cc: **$326,600**
- Comisión fija: **$30,000**
