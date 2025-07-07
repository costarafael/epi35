# Plano de Desacoplamento Inteligente - fichaProcessAdapter

## 🎯 Objetivo
Dividir o `fichaProcessAdapter.ts` (1,429 linhas) em 4 adapters especializados, reduzindo complexidade e melhorando manutenibilidade.

## 📊 Análise Atual

### Responsabilidades Misturadas
```
fichaProcessAdapter.ts (1,429 linhas)
├── Queries de fichas (300 linhas)
├── Processamento de entregas (400 linhas)  
├── Processamento de devoluções (250 linhas)
├── Gerenciamento de cache (150 linhas)
├── Transformações de dados (200 linhas)
└── Utilitários diversos (129 linhas)
```

## 🏗️ Nova Arquitetura Proposta

### 1. **fichaQueryAdapter.ts** (~200 linhas)
**Responsabilidade**: Buscar e listar fichas

```typescript
// /lib/services/process/fichaQueryAdapter.ts
class FichaQueryAdapter {
  // Listagem otimizada (usa novo endpoint /list-enhanced)
  async getFichasList(params: FichaListParams): Promise<PaginatedResponse<FichaListItem>>
  
  // Detalhes completos (usa novo endpoint /{id}/complete)  
  async getFichaComplete(fichaId: string): Promise<FichaCompleteData>
  
  // Busca simples por ID
  async getFichaById(fichaId: string): Promise<FichaEPIDTO>
  
  // Histórico específico
  async getFichaHistory(fichaId: string): Promise<HistoricoEvent[]>
}
```

**Endpoints utilizados:**
- `GET /api/fichas-epi/list-enhanced`
- `GET /api/fichas-epi/{id}/complete`
- `GET /api/fichas-epi/{id}`

### 2. **deliveryProcessAdapter.ts** (~150 linhas)
**Responsabilidade**: Gerenciar entregas de EPIs

```typescript
// /lib/services/process/deliveryProcessAdapter.ts
class DeliveryProcessAdapter {
  // Criar entrega (usa novo endpoint /create-complete)
  async createDelivery(payload: CreateDeliveryPayload): Promise<DeliveryResult>
  
  // Confirmar assinatura
  async confirmSignature(entregaId: string, signature: string): Promise<void>
  
  // Cancelar entrega
  async cancelDelivery(entregaId: string, reason: string): Promise<void>
  
  // Buscar entregas por ficha
  async getDeliveriesByFicha(fichaId: string): Promise<EntregaDTO[]>
}
```

**Endpoints utilizados:**
- `POST /api/entregas/create-complete`
- `PUT /api/entregas/{id}/confirm-signature`
- `POST /api/entregas/{id}/cancel`

### 3. **returnProcessAdapter.ts** (~100 linhas)
**Responsabilidade**: Gerenciar devoluções de EPIs

```typescript
// /lib/services/process/returnProcessAdapter.ts
class ReturnProcessAdapter {
  // Processar devoluções (usa novo endpoint /process-batch)
  async processReturns(items: ReturnItem[]): Promise<ReturnResult>
  
  // Buscar devoluções por ficha
  async getReturnsByFicha(fichaId: string): Promise<DevolucaoItem[]>
  
  // Validar se item pode ser devolvido
  async validateReturn(equipamentoId: string): Promise<ReturnValidation>
}
```

**Endpoints utilizados:**
- `POST /api/devolucoes/process-batch`
- `GET /api/fichas-epi/{id}/devolucoes`

### 4. **equipmentTrackingAdapter.ts** (~80 linhas)
**Responsabilidade**: Rastrear equipamentos em posse

```typescript
// /lib/services/process/equipmentTrackingAdapter.ts
class EquipmentTrackingAdapter {
  // Equipamentos em posse (dados vêm do endpoint /complete)
  async getEquipmentInPossession(fichaId: string): Promise<EquipamentoEmPosseItem[]>
  
  // Status de equipamento específico
  async getEquipmentStatus(equipmentId: string): Promise<EquipmentStatus>
  
  // Atualizar status de equipamento
  async updateEquipmentStatus(equipmentId: string, status: string): Promise<void>
}
```

## 🔧 Shared Utilities

### 5. **fichaDataTransforms.ts** (~50 linhas)
**Responsabilidade**: Transformações de dados compartilhadas

```typescript
// /lib/services/process/shared/fichaDataTransforms.ts
export class FichaDataTransforms {
  // Mapear status (ainda necessário para casos legacy)
  static mapStatus(backendStatus: string): FrontendStatus
  
  // Formatar CPF
  static formatCPF(cpf: string): string
  
  // Calcular dias para vencimento (backup caso backend não envie)
  static calculateDaysToExpiration(date: string): number
}
```

### 6. **fichaCache.ts** (~30 linhas)
**Responsabilidade**: Cache inteligente e simplificado

```typescript
// /lib/services/process/shared/fichaCache.ts
export class FichaCache {
  // Cache simples com TTL
  static setFichaData(fichaId: string, data: any, ttl: number = 300000): void
  static getFichaData(fichaId: string): any | null
  static invalidateFicha(fichaId: string): void
  static clearAll(): void
}
```

## 📋 Plano de Migração

### **Fase 1: Criar Estrutura Base (1 dia)**
```bash
src/lib/services/process/
├── queries/
│   └── fichaQueryAdapter.ts
├── operations/  
│   ├── deliveryProcessAdapter.ts
│   └── returnProcessAdapter.ts
├── tracking/
│   └── equipmentTrackingAdapter.ts
└── shared/
    ├── fichaDataTransforms.ts
    └── fichaCache.ts
```

### **Fase 2: Migrar Query Operations (2 dias)**
1. Mover `getFichasList()` para `fichaQueryAdapter`
2. Mover `getFichaDetailData()` para `fichaQueryAdapter` 
3. Simplificar usando novos endpoints backend
4. Testar compatibilidade

### **Fase 3: Migrar Delivery Operations (2 dias)**
1. Mover `criarNovaEntrega()` para `deliveryProcessAdapter`
2. Mover `confirmarAssinatura()` para `deliveryProcessAdapter`
3. Simplificar usando novos endpoints backend
4. Testar fluxo completo de entrega

### **Fase 4: Migrar Return Operations (1 dia)**
1. Mover `processarDevolucao()` para `returnProcessAdapter`
2. Simplificar usando novo endpoint backend
3. Testar fluxo de devolução

### **Fase 5: Migrar Equipment Tracking (1 dia)**
1. Mover `extrairEquipamentosEmPosse()` para `equipmentTrackingAdapter`
2. Simplificar usando dados do endpoint `/complete`
3. Testar rastreamento de equipamentos

### **Fase 6: Cleanup e Otimização (1 dia)**
1. Remover `fichaProcessAdapter.ts` original
2. Atualizar imports em todos os componentes
3. Testes finais de integração
4. Documentação

## 🎯 Benefícios do Desacoplamento

### **Redução de Complexidade**
- **Antes**: 1 arquivo com 1,429 linhas
- **Depois**: 6 arquivos com ~160 linhas cada (média)

### **Responsabilidades Claras**
- Cada adapter tem uma responsabilidade específica
- Facilita testes unitários
- Reduz conflitos em desenvolvimento em equipe

### **Manutenibilidade**
- Bugs são mais fáceis de localizar
- Mudanças têm escopo limitado
- Código mais legível e documentado

### **Reutilização**
- Adapters podem ser reutilizados em diferentes componentes
- Shared utilities evitam duplicação de código
- Facilita criação de novos recursos

### **Performance**
- Cache mais eficiente e específico
- Imports menores (tree-shaking)
- Lazy loading por funcionalidade

## 📊 Estimativa de Impacto

### **Tamanho dos Arquivos**
```
fichaQueryAdapter.ts         ~200 linhas  (foi ~500)
deliveryProcessAdapter.ts    ~150 linhas  (foi ~400)  
returnProcessAdapter.ts      ~100 linhas  (foi ~250)
equipmentTrackingAdapter.ts  ~80 linhas   (foi ~150)
fichaDataTransforms.ts       ~50 linhas   (foi ~200)
fichaCache.ts               ~30 linhas   (foi ~150)
───────────────────────────────────────────────────
Total:                      ~610 linhas  (era 1,429)
```

### **Redução de 57% no código total**

## 🚀 Cronograma Execução

**Depende dos novos endpoints backend:**
- **Se backend ready**: 8 dias de trabalho
- **Se backend não ready**: Começar com current endpoints, migrar depois

**Prioridade de execução:**
1. fichaQueryAdapter (maior impacto)
2. deliveryProcessAdapter (fluxo crítico)
3. returnProcessAdapter (fluxo crítico)
4. equipmentTrackingAdapter (menor impacto)

Esta estratégia reduzirá significativamente a complexidade enquanto melhora a performance e manutenibilidade do sistema.