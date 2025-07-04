# 🧪 Scripts de Teste - EPI Backend Production

## 📋 Scripts Disponíveis

### 1. 🚀 **Teste Rápido**
```bash
./scripts/quick-test.sh
```
**Executa em ~10 segundos**:
- ✅ Health check básico
- ✅ Documentação API (Swagger)
- ✅ Endpoints principais (almoxarifados, tipos-epi, colaboradores)

### 2. 🔬 **Teste Completo**
```bash
./scripts/test-production-deploy.sh
```
**Executa em ~30-60 segundos**:
- 🏥 Health checks (basic, database, redis)
- 📖 API documentation
- 🔧 Core endpoints
- 📊 Reports endpoints
- 🧪 Functionality tests (POST validation)
- 🌐 CORS and security headers
- 📊 Performance tests (response time)
- 🎯 Final summary

### 3. 🔴 **Teste Redis/Upstash**
```bash
./scripts/test-redis.sh
```
**Executa em ~5 segundos**:
- 🔗 Conexão direta com redis-cli
- 📝 Teste SET/GET
- 🌐 Teste via API do backend

## 🎯 **Quando Usar Cada Script**

| Situação | Script Recomendado |
|----------|-------------------|
| **Deploy acabou de terminar** | `quick-test.sh` |
| **Validação completa** | `test-production-deploy.sh` |
| **Problemas com cache** | `test-redis.sh` |
| **CI/CD pipeline** | `test-production-deploy.sh` |
| **Monitoramento contínuo** | `quick-test.sh` |

## 📊 **Interpretação dos Resultados**

### ✅ **Sucesso**
```bash
✅ Basic Health Check - Status: 200
✅ Database Health Check - Status: 200  
✅ Redis Connection - PONG received
🎉 DEPLOYMENT SUCCESS - Backend is operational!
```

### ❌ **Problemas Comuns**

#### Database Connection
```bash
❌ Database Health Check - Status: 500
```
**Solução**: Verificar `DATABASE_URL` no Render Dashboard

#### Redis Connection
```bash
❌ Redis Connection - No PONG response
```
**Solução**: Verificar `REDIS_URL` no Render Dashboard

#### Build Errors
```bash
❌ Basic Health Check - Status: 503
```
**Solução**: Verificar logs no Render Dashboard

## 🔧 **Personalização**

### Alterar URL do Backend
Edite a variável `BASE_URL` nos scripts:
```bash
BASE_URL="https://seu-backend.onrender.com"
```

### Alterar URL do Redis
Edite a variável `REDIS_URL` no `test-redis.sh`:
```bash
REDIS_URL="redis://sua-url-redis"
```

## 📞 **Suporte**

Para problemas específicos:

1. **Health check falha**: Verificar logs do Render
2. **Database connection**: Verificar PostgreSQL status
3. **Redis connection**: Verificar Upstash dashboard
4. **API endpoints 404**: Verificar build logs
5. **Performance lenta**: Considerar upgrade do plano

## 🚀 **Automação**

### GitHub Actions
```yaml
- name: Test Production Deploy
  run: ./scripts/test-production-deploy.sh
```

### Monitoramento Contínuo
```bash
# Executar a cada 5 minutos
*/5 * * * * /path/to/quick-test.sh
```