# Testando com Banco de Dados Real 🐘

Este guia explica como executar testes usando banco de dados PostgreSQL real ao invés de mocks, proporcionando testes mais realistas e confiáveis.

## ✅ Configuração Rápida

### 1. Pré-requisitos
- Docker e Docker Compose instalados
- Node.js 18+ e npm

### 2. Iniciar o Ambiente
```bash
# Iniciar apenas banco de teste e Redis
npm run docker:test

# Ou iniciar todos os serviços (dev + test)
npm run docker:up
```

### 3. Executar Testes
```bash
# Todos os testes com banco real (recomendado)
npm run test:db

# Apenas testes unitários
npm run test:db:unit

# Apenas testes de integração
npm run test:db:integration

# Apenas testes E2E
npm run test:db:e2e
```

## 🐋 Configuração Docker

### Serviços Disponíveis

| Serviço | Container | Porta | Banco | Uso |
|---------|-----------|--------|-------|-----|
| `db` | `epi_db_dev_v35` | 5435 | `epi_db_v35` | Desenvolvimento |
| `db_test` | `epi_db_test_v35` | 5436 | `epi_test_db_v35` | **Testes** |
| `redis` | `epi_redis` | 6379 | - | Cache (opcional) |

### URLs de Conexão
```bash
# Desenvolvimento
DATABASE_URL="postgresql://postgres:postgres@localhost:5435/epi_db_v35?schema=public"

# Testes  
DATABASE_URL="postgresql://postgres:postgres@localhost:5436/epi_test_db_v35?schema=public"
```

## 🧪 Tipos de Teste

### 1. Testes Unitários (`test:db:unit`)
- Testam lógica isolada dos use cases
- Usam mocks para repositórios
- **Mais rápidos**, ideais para TDD

### 2. Testes de Integração (`test:db:integration`)
- Testam fluxos completos com banco real
- Seed automático de dados de teste
- **Mais realistas**, detectam problemas de SQL

### 3. Testes E2E (`test:db:e2e`)
- Testam API completa (HTTP + banco)
- Simulam uso real do sistema
- **Mais demorados**, mas maior confiabilidade

## 📊 Dados de Teste (Seeds)

O sistema automaticamente popula o banco de teste com:

### Usuários
- **Admin Teste** (`admin@test.com`)
- **Operador Teste** (`operador@test.com`)  
- **Supervisor Teste** (`supervisor@test.com`)

### Unidades e Almoxarifados
- **Unidade Central** → Almoxarifado Central
- **Unidade Filial** → Almoxarifado Filial

### Tipos de EPI
| EPI | CA | Vida Útil | Status |
|-----|-------|-----------|--------|
| Capacete de Segurança | CA-12345 | 365 dias | ATIVO |
| Luva de Proteção | CA-67890 | 180 dias | ATIVO |
| Óculos de Proteção | CA-11111 | 270 dias | ATIVO |
| Bota de Segurança | CA-22222 | 540 dias | ATIVO |
| EPI Descontinuado | CA-99999 | 90 dias | DESCONTINUADO |

### Colaboradores
- 10 colaboradores de teste com nomes realistas
- Fichas de EPI já criadas para alguns
- Entregas de exemplo já processadas

### Estoque
- Quantidades realistas (50-149 unidades)
- Alguns itens em `AGUARDANDO_INSPECAO`
- Custos variados (R$ 10-60)

## 🔄 Gerenciamento do Banco

### Comandos Úteis
```bash
# Ver logs dos containers
npm run docker:logs

# Parar containers
npm run docker:down

# Limpar volumes (⚠️ perde dados)
npm run docker:clean

# Aplicar migrations no banco de teste
npm run prisma:test:deploy

# Reset completo do banco de teste
npm run prisma:test:reset
```

### Ferramentas de Desenvolvimento
```bash
# Prisma Studio para visualizar dados
npm run prisma:studio

# Conectar diretamente ao banco de teste
docker exec -it epi_db_test_v35 psql -U postgres -d epi_test_db_v35
```

## 📝 Criando Testes de Integração

### Exemplo Básico
```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestSetup, setupIntegrationTestSuite } from '../../setup/integration-test-setup';
import { MeuUseCase } from '@application/use-cases/meu-use-case';

describe('MeuUseCase - Integration', () => {
  const { createTestSetup } = setupIntegrationTestSuite();
  let testSetup: IntegrationTestSetup;
  let useCase: MeuUseCase;

  beforeEach(async () => {
    testSetup = await createTestSetup({
      providers: [MeuUseCase],
    });
    
    useCase = testSetup.app.get<MeuUseCase>(MeuUseCase);
    await testSetup.resetTestData(); // Reset dados para cada teste
  });

  it('deve funcionar com dados reais', async () => {
    // Arrange - usar helpers do testSetup
    const usuario = await testSetup.findUser('admin@test.com');
    const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');
    
    // Act
    const resultado = await useCase.execute({ /* ... */ });
    
    // Assert
    expect(resultado).toBeDefined();
    
    // Verificar diretamente no banco se necessário
    const dadosBanco = await testSetup.prismaService.tabela.findFirst(/* ... */);
    expect(dadosBanco).toBeDefined();
  });
});
```

### Helpers Disponíveis
```typescript
// Buscar entidades por critérios comuns
await testSetup.findUser('admin@test.com');
await testSetup.findAlmoxarifado('Almoxarifado Central');
await testSetup.findTipoEpi('CA-12345');
await testSetup.findColaborador('João Silva Santos');
await testSetup.getEstoqueDisponivel(almoxarifadoId, tipoEpiId);

// Acesso direto ao Prisma
testSetup.prismaService.tabela.create(/* ... */);
```

## 🚀 Scripts Automáticos

### Script Principal: `./scripts/test-with-db.sh`

O script automaticamente:
1. ✅ Verifica se Docker está rodando
2. 📥 Baixa imagens necessárias se não existirem  
3. 🚀 Inicia containers de teste
4. ⏳ Aguarda banco estar pronto
5. 🔄 Aplica migrations
6. 🌱 Executa seed de dados
7. 🧪 Roda os testes
8. 🧹 Limpa ambiente (opcional)

### Variáveis de Ambiente
```bash
# Manter containers rodando após testes
KEEP_CONTAINERS=true npm run test:db

# Exemplo para desenvolvimento contínuo
KEEP_CONTAINERS=true npm run test:db:integration
```

## ⚡ Performance

### Otimizações Implementadas
- **Health checks** para garantir que serviços estejam prontos
- **Reset inteligente** apenas das tabelas necessárias
- **Seed incremental** reutiliza dados quando possível
- **Conexão pooling** do Prisma otimizada para testes

### Tempos Esperados
- **Setup inicial**: ~10-15 segundos
- **Testes unitários**: ~2-5 segundos  
- **Testes integração**: ~10-30 segundos
- **Testes E2E**: ~30-60 segundos

## 🔍 Troubleshooting

### Problemas Comuns

#### 1. "Database connection error"
```bash
# Verificar se containers estão rodando
docker ps | grep epi_db

# Verificar logs
npm run docker:logs

# Reiniciar containers
npm run docker:down && npm run docker:test
```

#### 2. "Port already in use"
```bash
# Verificar o que está usando as portas
lsof -i :5436
lsof -i :6379

# Parar processos conflitantes ou alterar portas no docker-compose.yml
```

#### 3. "Migration failed"
```bash
# Reset completo do banco de teste
npm run prisma:test:reset

# Aplicar migrations novamente
npm run prisma:test:deploy
```

#### 4. "Timeout waiting for database"
```bash
# Verificar se PostgreSQL iniciou corretamente
docker exec epi_db_test_v35 pg_isready -U postgres

# Verificar logs do container
docker logs epi_db_test_v35
```

### Logs Úteis
```bash
# Logs em tempo real
docker-compose logs -f db_test

# Logs específicos de um container
docker logs epi_db_test_v35 --tail 50
```

## 🎯 Melhores Práticas

### 1. **Isolamento de Testes**
- Sempre use `beforeEach` com `resetTestData()`
- Não dependa de ordem de execução dos testes
- Use dados únicos quando necessário

### 2. **Performance**  
- Use `KEEP_CONTAINERS=true` durante desenvolvimento
- Evite reset desnecessário em testes que só leem dados
- Agrupe testes relacionados no mesmo arquivo

### 3. **Debugging**
- Use Prisma Studio para visualizar dados: `npm run prisma:studio`
- Adicione logs nos testes para entender fluxo
- Use breakpoints no VS Code (funciona com banco real)

### 4. **CI/CD**
- Testes de integração são ideais para CI
- Testes E2E apenas em builds principais
- Use cache do Docker para acelerar builds

---

## 📚 Próximos Passos

1. **Execute os testes**: `npm run test:db`
2. **Explore o Prisma Studio**: `npm run prisma:studio` 
3. **Veja exemplo de integração**: `test/integration/fichas/criar-entrega-ficha.integration.spec.ts`
4. **Crie seus próprios testes** seguindo os exemplos

**🎉 Agora você tem testes confiáveis com banco de dados real!**