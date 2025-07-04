# 🚀 Guia de Deploy - EPI Backend

Este guia detalha como fazer deploy do backend EPI no **Render** como serviço web.

## 📋 Pré-requisitos

### 1. Contas Necessárias
- ✅ **GitHub Account**: Para versionamento do código
- ✅ **Render Account**: Para hosting ([render.com](https://render.com))
- ✅ **Upstash Account**: Para Redis ([upstash.com](https://upstash.com)) - FREE tier disponível

### 2. Repositório GitHub
- ✅ Código commitado em: `https://github.com/costarafael/epi35`
- ✅ Branch principal: `main`
- ✅ Arquivo `render.yaml` configurado

## 🎯 Opções de Deploy

### Opção 1: Deploy Automático via render.yaml ⭐ (Recomendado)
### Opção 2: Deploy Manual via Dashboard
### Opção 3: Deploy via Render CLI

---

## 🚀 Opção 1: Deploy Automático (render.yaml)

### Passo 1: Configurar Redis (Upstash)

1. **Criar conta no Upstash**: https://upstash.com
2. **Criar Redis Database**:
   ```
   Database Name: epi-redis
   Region: US-East-1 (mais próximo do Render Oregon)
   Plan: Free (10,000 commands/day)
   ```
3. **Copiar Redis URL**: 
   ```
   redis://username:password@host:port
   ```

### Passo 2: Deploy no Render

1. **Conectar GitHub**: 
   - Login no Render → Connect GitHub → Autorizar repositório `epi35`

2. **Criar Novo Serviço**:
   ```
   New → Blueprint → Connect Repository: costarafael/epi35
   ```

3. **Render detectará automaticamente o `render.yaml`**

4. **Configurar Variáveis de Ambiente** (na UI do Render):
   ```bash
   # Redis Configuration
   REDIS_URL=redis://username:password@host:port  # Do Upstash
   
   # Security (gerar nova chave)
   JWT_SECRET=sua-chave-super-secreta-aqui
   
   # Business (opcional - já tem defaults)
   PERMITIR_ESTOQUE_NEGATIVO=false
   PERMITIR_AJUSTES_FORCADOS=false
   ```

5. **Deploy Automático**: 
   - Render fará deploy automático do banco PostgreSQL + Web Service
   - Aguarde ~10-15 minutos para primeiro deploy

### Passo 3: Verificar Deploy

1. **Health Check**: `https://epi-backend.onrender.com/health`
2. **API Docs**: `https://epi-backend.onrender.com/api/docs` (se habilitado)
3. **Logs**: Render Dashboard → Service → Logs

---

## 🛠️ Opção 2: Deploy Manual

### Passo 1: Criar PostgreSQL Database

1. **Render Dashboard** → New → PostgreSQL
   ```
   Database Name: epi-database
   Database User: epi_user
   Region: Oregon (US-West)
   PostgreSQL Version: 15
   Plan: Free ($0/month - 1GB storage)
   ```

2. **Aguardar criação** (~5 minutos)
3. **Copiar Connection String**: 
   ```
   postgresql://username:password@host:port/database
   ```

### Passo 2: Criar Web Service

1. **Render Dashboard** → New → Web Service
2. **Connect GitHub Repository**: `costarafael/epi35`
3. **Configurar Build**:
   ```bash
   Root Directory: epi-backend
   Runtime: Node
   Build Command: npm ci && npm run build && npx prisma generate
   Start Command: npm run start:prod
   ```

4. **Configurar Environment Variables**:
   ```bash
   NODE_ENV=production
   PORT=3000
   DATABASE_URL=postgresql://username:password@host:port/database
   REDIS_URL=redis://username:password@host:port
   JWT_SECRET=sua-chave-super-secreta
   PERMITIR_ESTOQUE_NEGATIVO=false
   PERMITIR_AJUSTES_FORCADOS=false
   LOG_LEVEL=info
   ```

5. **Deploy**: Render iniciará o build automaticamente

### Passo 3: Aplicar Migrations

1. **Acessar Shell do Serviço** (Render Dashboard):
   ```bash
   npx prisma migrate deploy
   ```

2. **Ou via GitHub Action** (adicionar ao repositório):
   ```yaml
   # .github/workflows/deploy.yml
   - name: Run Migrations
     run: npx prisma migrate deploy
     env:
       DATABASE_URL: ${{ secrets.DATABASE_URL }}
   ```

---

## 🔧 Configurações Avançadas

### Health Check

```typescript
// Já configurado em src/main.ts
app.use('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version 
  });
});
```

### CORS para Frontend

```bash
# .env production
CORS_ORIGINS="https://epi-frontend.onrender.com,https://yourdomain.com"
```

### Monitoramento

```bash
# Environment Variables para APM
ENABLE_PERFORMANCE_MONITORING=true
LOG_LEVEL=info

# Opcional: New Relic, DataDog, etc.
# NEW_RELIC_LICENSE_KEY=your-key
```

---

## 📊 Custos Estimados

| Serviço | Plan | Custo/Mês | Recursos |
|---------|------|-----------|----------|
| **Render Web Service** | Free | $0 | 512MB RAM, Sleep após 15min inativo |
| **Render PostgreSQL** | Free | $0 | 1GB storage, 90 dias retenção |
| **Upstash Redis** | Free | $0 | 10K commands/day, 256MB |
| **Total Free Tier** | | **$0** | Suficiente para desenvolvimento/teste |

### Para Produção:
| Serviço | Plan | Custo/Mês | Recursos |
|---------|------|-----------|----------|
| **Render Web Service** | Starter | $7 | Sempre ativo, 512MB RAM |
| **Render PostgreSQL** | Starter | $7 | 1GB storage, backups automáticos |
| **Upstash Redis** | Pay-as-you-go | ~$1-5 | Baseado no uso |
| **Total Produção** | | **~$15** | Sistema 24/7 com backups |

---

## 🚨 Troubleshooting

### Deploy Falha

1. **Verificar Logs**:
   ```bash
   # Render Dashboard → Service → Logs
   # Procurar por erros de build ou runtime
   ```

2. **Problemas Comuns**:
   ```bash
   # Prisma não encontrado
   npm ci && npx prisma generate
   
   # Migrations não aplicadas
   npx prisma migrate deploy
   
   # Variáveis de ambiente
   echo $DATABASE_URL  # Verificar se está definida
   ```

### Conexão Database

```bash
# Testar conexão local
npm run prisma:studio  # Abre interface gráfica

# Testar queries diretas
npm run prisma:db:seed  # Executar seeds
```

### Performance

```bash
# Monitorar via logs
LOG_LEVEL=debug  # Temporariamente para debug

# Health check detalhado
curl https://epi-backend.onrender.com/health
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions (Opcional)

```yaml
# .github/workflows/deploy.yml
name: Deploy to Render

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test
      
      - name: Build application
        run: npm run build
      
      # Render deploy automático via webhook
      - name: Trigger Render Deploy
        run: |
          curl -X POST ${{ secrets.RENDER_DEPLOY_HOOK }}
```

---

## 📞 Suporte

### Links Úteis
- **Render Docs**: https://render.com/docs
- **Upstash Docs**: https://docs.upstash.com
- **Prisma Deploy**: https://www.prisma.io/docs/guides/deployment

### Comandos de Debug
```bash
# Verificar status
curl https://epi-backend.onrender.com/health

# Logs em tempo real
# Via Render Dashboard → Logs

# Testar migrations
npx prisma migrate status
```

**🎉 Deployment Concluído!** Seu backend EPI está rodando em produção no Render.