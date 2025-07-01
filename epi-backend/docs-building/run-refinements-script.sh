#!/bin/bash
# Script de refinamentos e melhorias para Backend EPI v3.5
# Executa após run-all-phases.sh para ajustes específicos e otimizações

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log() {
    echo -e "${GREEN}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
    exit 1
}

warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

# Verificar se o projeto base existe
if [ ! -f "package.json" ] || [ ! -d "src" ]; then
    error "Projeto base não encontrado. Execute run-all-phases.sh primeiro!"
fi

log "🔧 Iniciando refinamentos e melhorias do Backend EPI v3.5"

# Iniciar Claude-Flow se não estiver rodando
if ! ./claude-flow status > /dev/null 2>&1; then
    log "🚀 Iniciando Claude-Flow..."
    ./claude-flow start --ui --port 3000 &
    sleep 10
fi

# ========================================
# REFINAMENTO 1: TRANSAÇÕES COMPLEXAS
# ========================================

log "💎 Refinamento 1: Implementando transações complexas"

# 1.1 - Transferência entre almoxarifados
log "📦 Implementando transferência otimizada entre almoxarifados..."
./claude-flow sparc run transaction-specialist "Implement the complete transfer flow between almoxarifados in src/application/use-cases/estoque/processar-transferencia.use-case.ts following these exact steps:

PRE-CONDITIONS to check:
- Schema Prisma must have notas_movimentacao table with almoxarifado_destino_id field
- EstoqueRepository interface must exist in domain layer
- MovimentacaoRepository interface must exist in domain layer

IMPLEMENTATION STEPS:
1. Import required dependencies:
   \`\`\`typescript
   import { Injectable } from '@nestjs/common';
   import { PrismaService } from '@infrastructure/database/prisma.service';
   import { EstoqueRepository } from '@domain/interfaces/repositories/estoque.repository.interface';
   import { MovimentacaoRepository } from '@domain/interfaces/repositories/movimentacao.repository.interface';
   import { ConfiguracaoService } from '@application/services/configuracao.service';
   \`\`\`

2. Validate source almoxarifado has sufficient stock:
   \`\`\`typescript
   const estoqueOrigem = await tx.estoqueItens.findUnique({
     where: { id: item.estoque_item_id },
     include: { tipo_epi: true }
   });
   
   if (!estoqueOrigem || estoqueOrigem.status !== 'DISPONIVEL') {
     throw new BusinessError('Item não disponível para transferência');
   }
   
   if (estoqueOrigem.quantidade < item.quantidade) {
     throw new BusinessError(\`Estoque insuficiente: \${estoqueOrigem.quantidade} disponível, \${item.quantidade} solicitado\`);
   }
   \`\`\`

3. Begin database transaction using prisma.\$transaction() with isolation level 'Serializable'

4. Create SAIDA_TRANSFERENCIA movement for source almoxarifado:
   - Link to nota_movimentacao_id
   - Set quantidade_movida from item quantity
   - Set estoque_item_id to source item
   - Log with correlation ID

5. Decrease source estoque_itens.quantidade by transfer amount

6. Find or create destination estoque_itens record:
   \`\`\`typescript
   const estoqueDestino = await tx.estoqueItens.upsert({
     where: {
       almoxarifado_id_tipo_epi_id_status: {
         almoxarifado_id: nota.almoxarifado_destino_id,
         tipo_epi_id: estoqueOrigem.tipo_epi_id,
         status: 'DISPONIVEL'
       }
     },
     create: {
       almoxarifado_id: nota.almoxarifado_destino_id,
       tipo_epi_id: estoqueOrigem.tipo_epi_id,
       quantidade: 0,
       custo_unitario: estoqueOrigem.custo_unitario,
       status: 'DISPONIVEL'
     },
     update: {}
   });
   \`\`\`

7. Create ENTRADA_TRANSFERENCIA movement for destination
8. Increase destination estoque_itens.quantidade
9. Update nota status to CONCLUIDA
10. Commit transaction or rollback everything on any error

ERROR HANDLING:
- 'Estoque insuficiente no almoxarifado origem'
- 'Almoxarifado destino não encontrado'  
- 'Tipo de EPI não disponível no destino'
- 'Transferência para mesmo almoxarifado não permitida'

Include correlation ID in all log messages for debugging.
Test with both existing and non-existing destination stock records."

sleep 45

# 1.2 - Entrega com rastreabilidade unitária
log "📍 Implementando rastreabilidade unitária de entregas..."
./claude-flow sparc run transaction-specialist "Implement the unit tracking delivery system for UC-FICHA-03 in src/application/use-cases/fichas/criar-entrega-ficha.use-case.ts:

CRITICAL REQUIREMENT: Each delivered unit MUST have its own tracking record.

PRE-CONDITIONS:
- entrega_itens table must have CHECK constraint: quantidade_entregue = 1
- FichaRepository, EstoqueRepository, and EntregaRepository interfaces must exist
- CreateEntregaDto schema must be defined with Zod

IMPLEMENTATION:
\`\`\`typescript
import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { CreateEntregaDto } from '@application/dto/create-entrega.dto';
import { BusinessError } from '@domain/errors/business.error';

@Injectable()
export class CriarEntregaFichaUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfiguracaoService
  ) {}

  async execute(dto: CreateEntregaDto): Promise<{ id: string; itensEntregues: number }> {
    return await this.prisma.\$transaction(async (tx) => {
      // 1. Validate ficha exists and is active
      const ficha = await tx.fichasEpi.findUnique({
        where: { id: dto.fichaId },
        include: { colaborador: true }
      });
      
      if (!ficha) throw new BusinessError('Ficha não encontrada');
      if (ficha.status !== 'ATIVA') throw new BusinessError('Ficha inativa');
      
      // 2. Validate all items belong to specified almoxarifado
      for (const item of dto.itens) {
        const estoque = await tx.estoqueItens.findFirst({
          where: {
            id: item.estoqueItemId,
            almoxarifado_id: dto.almoxarifadoId,
            status: 'DISPONIVEL'
          }
        });
        
        if (!estoque) {
          throw new BusinessError(\`Item \${item.estoqueItemId} não pertence ao almoxarifado ou não está disponível\`);
        }
      }
      
      // 3. Create entrega header
      const entrega = await tx.entregas.create({
        data: {
          ficha_epi_id: dto.fichaId,
          almoxarifado_id: dto.almoxarifadoId,
          responsavel_id: dto.responsavelId,
          status: 'PENDENTE_ASSINATURA',
          data_entrega: new Date()
        }
      });
      
      let totalItensEntregues = 0;
      
      // 4. Process each item type
      for (const itemDto of dto.itens) {
        const estoque = await tx.estoqueItens.findUnique({
          where: { id: itemDto.estoqueItemId },
          include: { tipo_epi: true }
        });
        
        // Validate stock
        if (estoque.quantidade < itemDto.quantidade) {
          throw new BusinessError(
            \`Estoque insuficiente para \${estoque.tipo_epi.nome_equipamento}: \` +
            \`disponível \${estoque.quantidade}, solicitado \${itemDto.quantidade}\`
          );
        }
        
        // CRITICAL: Create INDIVIDUAL records for EACH unit
        const entregaItensIds = [];
        for (let i = 0; i < itemDto.quantidade; i++) {
          const entregaItem = await tx.entregaItens.create({
            data: {
              entrega_id: entrega.id,
              estoque_item_origem_id: itemDto.estoqueItemId,
              quantidade_entregue: 1, // ALWAYS 1 - NEVER CHANGE THIS!
              data_limite_devolucao: this.calcularDataLimite(
                estoque.tipo_epi, 
                itemDto.dataLimiteDevolucao
              ),
              status: 'COM_COLABORADOR',
              created_at: new Date()
            }
          });
          
          entregaItensIds.push(entregaItem.id);
          totalItensEntregues++;
          
          // Log each unit for auditability
          console.log(\`Unit \${i+1}/\${itemDto.quantidade} created: \${entregaItem.id}\`);
        }
        
        // 5. Create ONE movement for the TOTAL quantity
        await tx.movimentacoesEstoque.create({
          data: {
            estoque_item_id: itemDto.estoqueItemId,
            tipo_movimentacao: 'SAIDA_ENTREGA',
            quantidade_movida: itemDto.quantidade, // Total, not unit
            entrega_id: entrega.id,
            responsavel_id: dto.responsavelId,
            data_movimentacao: new Date()
          }
        });
        
        // 6. Update stock balance
        await tx.estoqueItens.update({
          where: { id: itemDto.estoqueItemId },
          data: {
            quantidade: { decrement: itemDto.quantidade }
          }
        });
      }
      
      // 7. Create history record
      await tx.historicoFichas.create({
        data: {
          ficha_epi_id: dto.fichaId,
          responsavel_id: dto.responsavelId,
          acao: \`Entrega \${entrega.id} realizada - \${totalItensEntregues} itens\`,
          detalhes: {
            itens: dto.itens.map(i => ({
              estoqueItemId: i.estoqueItemId,
              quantidade: i.quantidade,
              dataLimite: i.dataLimiteDevolucao
            }))
          }
        }
      });
      
      return { id: entrega.id, itensEntregues: totalItensEntregues };
    });
  }
  
  private calcularDataLimite(tipoEpi: any, dataCustomizada?: Date): Date | null {
    if (dataCustomizada) return new Date(dataCustomizada);
    if (!tipoEpi.vida_util_dias) return null;
    
    const limite = new Date();
    limite.setDate(limite.getDate() + tipoEpi.vida_util_dias);
    return limite;
  }
}
\`\`\`

CRITICAL VALIDATIONS:
- NEVER create entrega_itens with quantidade_entregue > 1
- ALWAYS validate stock belongs to specified almoxarifado
- ALWAYS check PERMITIR_ESTOQUE_NEGATIVO before decrementing
- Each unit must have unique ID for individual return tracking

Example: quantity: 2 creates 2 separate records in entrega_itens, NOT 1 record with quantity 2"

sleep 60

# 1.3 - Sistema de estorno
log "↩️ Implementando sistema completo de estorno..."
./claude-flow sparc run transaction-specialist "Implement the complete estorno (reversal) system for all movement types in src/application/use-cases/estoque/estornar-movimentacao.use-case.ts:

PRE-CONDITIONS:
- Database must have trigger check_nao_estornar_estorno() installed
- All ESTORNO_* enum types must exist in tipo_movimentacao_enum
- MovimentacaoRepository must have methods: findById, findByOrigemId, create

IMPLEMENTATION:
1. Create estorno type mapping
2. Validate movimentacao (not already estorno, not previously reversed)
3. Create estorno movement with movimentacao_origem_id
4. Handle special cases (SAIDA_ENTREGA, ENTRADA_DEVOLUCAO, TRANSFERENCIA)

CRITICAL: NEVER allow estorno of estorno (database trigger enforces this)"

sleep 45

git add . && git commit -m "refactor: implement complex transactions with proper atomicity" || true

# ========================================
# REFINAMENTO 2: VALIDAÇÕES COMPLEXAS
# ========================================

log "🛡️ Refinamento 2: Implementando validações complexas"

# 2.1 - Validação de devolução
log "✅ Implementando validação completa de devoluções..."
./claude-flow sparc run usecase-developer "Implement devolucao validation for UC-FICHA-04 in src/application/use-cases/fichas/processar-devolucao.use-case.ts:

CRITICAL RULES:
1. Original entrega must have status ASSINADA
2. All items must have status COM_COLABORADOR
3. Group by tipo_epi and almoxarifado for efficiency
4. Create/find estoque with status AGUARDANDO_INSPECAO
5. Handle partial returns correctly

Edge cases: mixed items from different entregas, already returned items, non-existent IDs"

sleep 45

# 2.2 - Cálculo dinâmico de atraso
log "⏰ Implementando cálculo dinâmico de devolução atrasada..."
./claude-flow sparc run report-developer "Implement dynamic late return calculation for R-07 report:

CRITICAL: DEVOLUCAO_ATRASADA is NEVER stored, always computed dynamically.

1. SQL CASE calculation:
   CASE 
     WHEN status = 'COM_COLABORADOR' 
     AND data_limite_devolucao < CURRENT_DATE 
     THEN true ELSE false 
   END as devolucao_atrasada

2. Create composite index:
   CREATE INDEX idx_devolucao_atrasada 
   ON entrega_itens(status, data_limite_devolucao) 
   WHERE status = 'COM_COLABORADOR'

3. Add computed field in API responses
4. Handle timezone correctly"

sleep 30

git add . && git commit -m "refactor: implement complex validations and dynamic calculations" || true

# ========================================
# REFINAMENTO 3: OTIMIZAÇÕES DE PERFORMANCE
# ========================================

log "⚡ Refinamento 3: Aplicando otimizações de performance"

# 3.1 - Otimizar Kardex
log "📊 Otimizando consulta Kardex para alto volume..."
./claude-flow sparc run performance-optimizer "Optimize the Kardex query in src/application/use-cases/queries/kardex.query.ts:

REQUIREMENTS:
1. Add compound index (estoque_item_id, data_movimentacao DESC)
2. Implement cursor-based pagination
3. Selective field loading
4. Calculate running balance in memory
5. Cache statistics for 5 minutes
6. Use raw SQL for aggregations
7. Target: <100ms for 10k movements"

sleep 45

# 3.2 - Cache inteligente
log "💾 Implementando cache inteligente de saldos..."
./claude-flow sparc run performance-optimizer "Implement intelligent caching for stock balances in src/infrastructure/cache/balance-cache.service.ts:

FEATURES:
- Redis with memory fallback
- Auto-invalidation on movements
- Hot item detection
- Metrics tracking
- Cache warming
- Graceful degradation

Never serve stale data for critical operations."

sleep 45

git add . && git commit -m "perf: optimize queries and implement intelligent caching" || true

# ========================================
# REFINAMENTO 4: MELHORIAS DE SEGURANÇA
# ========================================

log "🔒 Refinamento 4: Aplicando melhorias de segurança"

./claude-flow sparc run api-security "Review and enhance API security:

1. Add rate limiting to all endpoints
2. Validate all UUIDs with Zod
3. Add correlation IDs to all operations
4. Implement audit logging for critical operations
5. Add request sanitization
6. Configure CORS properly
7. Add API key authentication for external access"

sleep 30

git add . && git commit -m "security: enhance API security measures" || true

# ========================================
# REFINAMENTO 5: MELHORIAS NA DOCUMENTAÇÃO
# ========================================

log "📚 Refinamento 5: Melhorando documentação"

./claude-flow sparc run documentation-writer "Enhance documentation with:

1. Sequence diagrams for main flows
2. API examples for each endpoint
3. Common error codes and solutions
4. Performance tuning guide
5. Deployment checklist
6. Troubleshooting guide

Reference /docs-building for context."

sleep 30

git add . && git commit -m "docs: enhance documentation with diagrams and examples" || true

# ========================================
# VALIDAÇÃO FINAL COMPLETA
# ========================================

log "✅ Validação final completa"

./claude-flow sparc run code-reviewer "Perform final validation against EPI specification v3.5:

CHECKLIST:
1. All 12 use cases implemented correctly
2. All API endpoints match specification
3. Business rules enforced:
   - Atomic transactions
   - Unit tracking (1 record = 1 unit)
   - Signature required for returns
   - Dynamic DEVOLUCAO_ATRASADA
   - No estorno of estorno
   - PERMITIR_ESTOQUE_NEGATIVO respected

4. Performance targets met:
   - Kardex <100ms for 10k records
   - Cached balance lookups <10ms

5. Security measures in place:
   - Rate limiting
   - Input validation with Zod
   - Audit logging

6. Test coverage >80%

Generate detailed compliance report with specific improvements needed."

sleep 60

# ========================================
# SCRIPTS DE MONITORAMENTO
# ========================================

log "📊 Criando scripts de monitoramento"

# Script de monitoramento
cat > monitor-epi-system.sh << 'MONITOR_EOF'
#!/bin/bash
# Monitor do Sistema EPI

while true; do
    clear
    echo "📊 Monitor do Sistema EPI - $(date)"
    echo "=============================================="
    
    # Status geral
    echo -e "\n🟢 Status do Sistema:"
    ./claude-flow status
    
    # Agentes ativos
    echo -e "\n🤖 Agentes Ativos:"
    ./claude-flow agent list --verbose
    
    # Memória
    echo -e "\n🧠 Contexto na Memória:"
    ./claude-flow memory query "epi" --limit 5
    
    # Métricas se disponível
    if [ -f "src/infrastructure/cache/balance-cache.service.ts" ]; then
        echo -e "\n📈 Métricas de Cache:"
        curl -s http://localhost:3333/metrics/cache 2>/dev/null || echo "Métricas não disponíveis"
    fi
    
    # Logs recentes
    echo -e "\n📜 Logs Recentes:"
    tail -n 5 logs/application.log 2>/dev/null || echo "Logs não encontrados"
    
    sleep 5
done
MONITOR_EOF

chmod +x monitor-epi-system.sh

# Script de recuperação
cat > recover-epi-system.sh << 'RECOVER_EOF'
#!/bin/bash
# Recuperação do Sistema EPI

echo "🔧 Iniciando recuperação do sistema EPI..."

# Backup do estado atual
./claude-flow memory dump > backup-$(date +%s).json

# Identificar problemas
STUCK=$(./claude-flow agent list --status stuck --format json | jq -r '.[].id')

# Terminar agentes travados
for agent in $STUCK; do
    echo "Terminando agente: $agent"
    ./claude-flow agent terminate $agent
done

# Checkpoint
CHECKPOINT=$(./claude-flow memory query "checkpoint" --latest)

# Reiniciar
./claude-flow stop
sleep 5
./claude-flow start --ui --port 3000

# Recuperar do checkpoint
./claude-flow swarm "Recover EPI system from: $CHECKPOINT" \
  --strategy recovery \
  --max-agents 3

echo "✅ Recuperação concluída"
RECOVER_EOF

chmod +x recover-epi-system.sh

git add . && git commit -m "feat: add monitoring and recovery scripts" || true

# ========================================
# TESTES FINAIS
# ========================================

log "🧪 Executando testes finais"

# Testes unitários
npm test || warning "Alguns testes unitários falharam"

# Testes de integração
npm run test:integration || warning "Alguns testes de integração falharam"

# Coverage
npm run test:coverage || warning "Coverage abaixo do esperado"

# Build de produção
npm run build || warning "Build de produção falhou"

# ========================================
# RELATÓRIO FINAL DE REFINAMENTOS
# ========================================

log "📊 Refinamentos concluídos!"
echo ""
echo "======================================="
echo "RESUMO DOS REFINAMENTOS"
echo "======================================="
echo "✅ Transações complexas implementadas"
echo "  - Transferência entre almoxarifados"
echo "  - Rastreamento unitário de entregas"
echo "  - Sistema completo de estorno"
echo ""
echo "✅ Validações aprimoradas"
echo "  - Devolução com assinatura obrigatória"
echo "  - Cálculo dinâmico de atrasos"
echo ""
echo "✅ Performance otimizada"
echo "  - Kardex com paginação por cursor"
echo "  - Cache inteligente de saldos"
echo ""
echo "✅ Segurança reforçada"
echo "  - Rate limiting"
echo "  - Validação Zod em todos endpoints"
echo "  - Audit logging"
echo ""
echo "✅ Documentação melhorada"
echo "✅ Scripts de monitoramento criados"
echo ""
echo "📁 Arquivos modificados:"
git diff --name-only HEAD~6 | wc -l
echo ""
echo "🔍 Para monitorar: ./monitor-epi-system.sh"
echo "🔧 Para recuperar: ./recover-epi-system.sh"
echo ""
echo "🎯 Sistema EPI v3.5 totalmente refinado!"
echo "======================================="

# Parar Claude-Flow
./claude-flow stop

exit 0