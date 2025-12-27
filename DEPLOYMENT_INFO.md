# SOAT Manager Hero - Documentación de Deployment

## Información General
- **Proyecto**: Sistema de Gestión de Pólizas SOAT
- **Cliente**: Holding Group - Hero (Colombia)
- **URL Producción**: https://soatmanager.com
- **Repositorio**: https://github.com/Gonzalo-Montilla/SoatManagerHero.git

## Infraestructura VPS (Hostinger)

### Servidor
- **IP**: 31.97.144.9
- **OS**: Ubuntu 24.04 LTS
- **SSH**: `ssh root@31.97.144.9`
- **Contraseña**: Chalomontilla@1721

### Recursos
- **Disco**: 48GB (41GB libres)
- **RAM**: 3.8GB (2.7GB disponibles)
- **CPU**: 1 core
- **Carga**: Muy baja (~0%)

## Stack Tecnológico

### Backend
- **Framework**: FastAPI (Python 3.12.3)
- **WSGI Server**: Gunicorn 23.0.0 + Uvicorn Workers
- **Base de Datos**: PostgreSQL 16.11
- **Autenticación**: JWT (bcrypt 4.0.1)
- **Puerto**: 9001 (interno)
- **Workers**: 2

### Frontend
- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite 7.x
- **Styling**: Tailwind CSS
- **HTTP Client**: Axios
- **Router**: React Router v7
- **Node Version**: v20.19.6

### Web Server
- **Nginx**: 1.24.0
- **SSL**: Let's Encrypt (Certbot)
- **Certificado válido hasta**: 2026-03-27

## Estructura de Directorios

```
/var/www/soat-manager-hero/
├── backend/
│   ├── app/
│   │   ├── api/          # Endpoints
│   │   ├── core/         # Config y seguridad
│   │   ├── models/       # Modelos SQLAlchemy
│   │   ├── schemas/      # Pydantic schemas
│   │   └── main.py       # App principal
│   ├── uploads/
│   │   ├── soats/        # PDFs de SOATs
│   │   └── recargas/     # Comprobantes de recargas
│   ├── venv/             # Virtual environment
│   ├── .env              # Variables de entorno
│   ├── init_db.py        # Script inicialización DB
│   └── requirements.txt
└── frontend/
    ├── dist/             # Build de producción
    ├── src/
    │   ├── api/          # Clientes API
    │   ├── components/   # Componentes React
    │   ├── context/      # Context API
    │   ├── pages/        # Páginas
    │   ├── types/        # TypeScript types
    │   └── utils/        # Utilidades
    ├── .env.production   # Variables de producción
    └── package.json
```

## Base de Datos

### PostgreSQL
- **Database**: soat_manager_db
- **Usuario**: soat_user
- **Contraseña**: SoatHero2025
- **Host**: localhost
- **Puerto**: 5432

### Tablas
- `usuarios` - Usuarios del sistema
- `soats_expedidos` - SOATs expedidos
- `recargas` - Recargas de bolsa
- `bolsa` - Saldo actual

### Conexión
```bash
sudo -u postgres psql -d soat_manager_db
```

## Servicios Systemd

### Backend Service
**Ubicación**: `/etc/systemd/system/soat-gunicorn.service`

```ini
[Unit]
Description=gunicorn daemon for SOAT Manager Hero
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/soat-manager-hero/backend
Environment="PATH=/var/www/soat-manager-hero/backend/venv/bin"
ExecStart=/var/www/soat-manager-hero/backend/venv/bin/gunicorn \
    --workers 2 \
    --worker-class uvicorn.workers.UvicornWorker \
    --bind 127.0.0.1:9001 \
    --access-logfile - \
    --error-logfile - \
    app.main:app

[Install]
WantedBy=multi-user.target
```

**Comandos útiles**:
```bash
systemctl status soat-gunicorn.service
systemctl restart soat-gunicorn.service
systemctl stop soat-gunicorn.service
systemctl start soat-gunicorn.service
journalctl -u soat-gunicorn.service -f
```

## Configuración Nginx

**Ubicación**: `/etc/nginx/sites-available/soat-manager-hero`

```nginx
server {
    server_name soatmanager.com www.soatmanager.com;

    root /var/www/soat-manager-hero/frontend/dist;
    index index.html;

    # API Backend
    location /api/ {
        proxy_pass http://127.0.0.1:9001/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Uploads
    location /uploads/ {
        alias /var/www/soat-manager-hero/backend/uploads/;
    }

    # SPA fallback
    location / {
        try_files $uri $uri/ /index.html;
    }

    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/soatmanager.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/soatmanager.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
}

server {
    if ($host = www.soatmanager.com) {
        return 301 https://$host$request_uri;
    }

    if ($host = soatmanager.com) {
        return 301 https://$host$request_uri;
    }

    listen 80;
    server_name soatmanager.com www.soatmanager.com;
    return 404;
}
```

**Comandos útiles**:
```bash
nginx -t                    # Probar configuración
systemctl reload nginx      # Recargar configuración
systemctl restart nginx     # Reiniciar Nginx
```

## Variables de Entorno

### Backend (.env)
```env
DATABASE_URL=postgresql://soat_user:SoatHero2025@localhost/soat_manager_db
SECRET_KEY=soat-hero-secret-key-production-2025-change-this
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

### Frontend (.env.production)
```env
VITE_API_URL=https://soatmanager.com
```

## Usuarios del Sistema

### Usuarios Iniciales
1. **Administrador**
   - Email: admin@soat.com
   - Contraseña: admin123
   - Rol: admin

2. **Cliente Hero**
   - Email: hero@holding.com
   - Contraseña: hero123
   - Rol: cliente

⚠️ **IMPORTANTE**: Cambiar estas contraseñas en producción

## DNS (Hostinger)

### Registros Configurados
- **Tipo A (@)**: 31.97.144.9
- **Tipo A (www)**: 31.97.144.9
- **TTL**: 3600

## Procedimientos de Actualización

### 1. Actualizar Backend

```bash
cd /var/www/soat-manager-hero
git pull

# Si hay cambios en dependencias
cd backend
source venv/bin/activate
pip install -r requirements.txt

# Si hay cambios en base de datos
python init_db.py

# Reiniciar servicio
systemctl restart soat-gunicorn.service
```

### 2. Actualizar Frontend

```bash
cd /var/www/soat-manager-hero
git pull

cd frontend
npm install
rm -rf dist/
npm run build
chown -R www-data:www-data dist/
systemctl reload nginx
```

### 3. Actualizar Base de Datos

```bash
cd /var/www/soat-manager-hero/backend
source venv/bin/activate
python init_db.py  # Solo para recrear tablas
```

## Mantenimiento

### Ver Logs

```bash
# Logs del backend
journalctl -u soat-gunicorn.service -f
journalctl -u soat-gunicorn.service -n 100 --no-pager

# Logs de Nginx
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Logs de PostgreSQL
tail -f /var/log/postgresql/postgresql-16-main.log
```

### Backup Base de Datos

```bash
# Crear backup
sudo -u postgres pg_dump soat_manager_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Restaurar backup
sudo -u postgres psql soat_manager_db < backup_YYYYMMDD_HHMMSS.sql
```

### Renovación SSL

Certbot configura renovación automática, pero se puede forzar:
```bash
certbot renew --dry-run  # Probar renovación
certbot renew            # Forzar renovación
```

## Troubleshooting

### Backend no responde
```bash
systemctl status soat-gunicorn.service
journalctl -u soat-gunicorn.service -n 50
netstat -tlnp | grep 9001
```

### Frontend no carga
```bash
ls -la /var/www/soat-manager-hero/frontend/dist/
systemctl status nginx
nginx -t
```

### Error de Base de Datos
```bash
sudo -u postgres psql -c "\l"
sudo -u postgres psql -d soat_manager_db -c "\dt"
systemctl status postgresql
```

### Error de permisos
```bash
chown -R www-data:www-data /var/www/soat-manager-hero
chmod -R 755 /var/www/soat-manager-hero
```

## Monitoreo de Recursos

```bash
# Uso de disco
df -h

# Uso de RAM
free -h

# Procesos
top -bn1 | head -20
ps aux | grep gunicorn
ps aux | grep postgres

# Tráfico de red
netstat -tlnp
```

## Otros Proyectos en el Mismo VPS

1. **CRM Socios Comerciales**
   - URL: https://www.reportescredisensa.com
   - Puerto: 9000
   - Django

2. **CDA Piendamó**
   - URL: https://cdapiendamo.com
   - Puerto: 8001
   - API + Frontend React

## Notas Importantes

- ⚠️ El VPS no tiene swap configurado
- ✅ SSL se renueva automáticamente cada 90 días
- ✅ Los servicios se inician automáticamente al reiniciar el servidor
- ✅ Los uploads están fuera del repositorio git
- ⚠️ Cambiar SECRET_KEY en producción para mayor seguridad
- ⚠️ Cambiar contraseñas de usuarios por defecto

## Contacto y Soporte

- **Desarrollador**: Warp Agent
- **Repositorio**: https://github.com/Gonzalo-Montilla/SoatManagerHero.git
- **Fecha de Deployment**: 2025-12-27

---

**Última actualización**: 2025-12-27
