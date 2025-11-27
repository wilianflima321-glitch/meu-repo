# Docker Setup Guide

Complete Docker setup for Aethel AI IDE Platform.

## Quick Start

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

## Services

### PostgreSQL Database
- **Port:** 5432
- **User:** aethel
- **Password:** aethel_dev_password
- **Database:** aethel_db

### Redis Cache
- **Port:** 6379
- Used for session storage and caching

### Cloud Web App
- **Port:** 3000
- Next.js application with API routes
- **URL:** http://localhost:3000

### Nginx (Production Profile)
- **Ports:** 80, 443
- Reverse proxy for production deployments
- Enable with: `docker-compose --profile production up -d`

## Environment Variables

Create `.env` file in project root:

```env
# Database
DATABASE_URL=postgresql://aethel:aethel_dev_password@postgres:5432/aethel_db

# Redis
REDIS_URL=redis://redis:6379

# JWT
JWT_SECRET=your-secret-key-change-in-production

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=production
```

## Database Setup

```bash
# Run migrations
docker-compose exec web npm run db:migrate

# Seed database with demo data
docker-compose exec web npm run db:seed

# Open Prisma Studio
docker-compose exec web npm run db:studio
```

## Development Workflow

```bash
# Start services
docker-compose up -d postgres redis

# Run web app locally (hot reload)
cd cloud-web-app/web
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## Production Deployment

### Build Image

```bash
cd cloud-web-app/web
docker build -t aethel-web:latest .
```

### Push to Registry

```bash
docker tag aethel-web:latest your-registry/aethel-web:latest
docker push your-registry/aethel-web:latest
```

### Deploy with Docker Compose

```bash
# Production mode with Nginx
docker-compose --profile production up -d

# Scale web service
docker-compose up -d --scale web=3
```

## Health Checks

```bash
# Check service health
curl http://localhost:3000/api/health

# Check database
docker-compose exec postgres pg_isready -U aethel

# Check Redis
docker-compose exec redis redis-cli ping
```

## Troubleshooting

### Database Connection Issues

```bash
# Check database logs
docker-compose logs postgres

# Restart database
docker-compose restart postgres

# Reset database
docker-compose down -v
docker-compose up -d postgres
docker-compose exec web npm run db:push
```

### Web App Issues

```bash
# Check logs
docker-compose logs web

# Rebuild image
docker-compose build web
docker-compose up -d web

# Clear Next.js cache
docker-compose exec web rm -rf .next
docker-compose restart web
```

### Port Conflicts

```bash
# Check what's using port 3000
lsof -i :3000

# Use different port
docker-compose -f docker-compose.yml -e WEB_PORT=3001 up -d
```

## Monitoring

### Resource Usage

```bash
# View resource usage
docker stats

# View specific service
docker stats aethel-web
```

### Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f web

# Last 100 lines
docker-compose logs --tail=100 web
```

## Backup & Restore

### Database Backup

```bash
# Backup
docker-compose exec postgres pg_dump -U aethel aethel_db > backup.sql

# Restore
docker-compose exec -T postgres psql -U aethel aethel_db < backup.sql
```

### Volume Backup

```bash
# Backup volumes
docker run --rm -v aethel_postgres_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/postgres_backup.tar.gz /data

# Restore volumes
docker run --rm -v aethel_postgres_data:/data -v $(pwd):/backup \
  alpine tar xzf /backup/postgres_backup.tar.gz -C /
```

## Security

### Production Checklist

- [ ] Change default passwords
- [ ] Set strong JWT_SECRET
- [ ] Enable HTTPS with SSL certificates
- [ ] Configure firewall rules
- [ ] Set up log rotation
- [ ] Enable database backups
- [ ] Configure rate limiting
- [ ] Set up monitoring and alerts

### SSL Setup (Nginx)

```bash
# Generate self-signed certificate (development)
mkdir -p ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem

# Production: Use Let's Encrypt
certbot certonly --standalone -d your-domain.com
```

## Performance Tuning

### PostgreSQL

Edit `docker-compose.yml`:

```yaml
postgres:
  command: postgres -c shared_buffers=256MB -c max_connections=200
```

### Redis

```yaml
redis:
  command: redis-server --maxmemory 256mb --maxmemory-policy allkeys-lru
```

### Web App

```yaml
web:
  environment:
    NODE_OPTIONS: --max-old-space-size=4096
  deploy:
    resources:
      limits:
        cpus: '2'
        memory: 4G
```

## CI/CD Integration

### GitHub Actions

See `.github/workflows/cloud-web-app.yml` for automated:
- Testing
- Building
- Docker image creation
- Deployment

### Manual Deploy

```bash
# Pull latest image
docker pull your-registry/aethel-web:latest

# Update services
docker-compose pull
docker-compose up -d

# Zero-downtime deployment
docker-compose up -d --no-deps --build web
```
