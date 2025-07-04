# Relatórios Implementados - Sistema EPI v3.5

**Versão**: 3.5.1  
**Data**: 04 de julho de 2025  
**Última Atualização**: Sistema com 19 relatórios implementados

---

## 📊 Visão Geral

O sistema EPI v3.5 possui uma arquitetura robusta de relatórios cobrindo todas as áreas críticas da gestão de EPIs. Os relatórios são organizados em **6 categorias principais** de análise e seguem padrões consistentes de API RESTful, validação com Zod, e arquitetura limpa.

### 🎯 Status de Implementação
- ✅ **Totalmente Implementados**: 14 relatórios
- 🔄 **Parcialmente Implementados**: 4 relatórios  
- 🚧 **Em Desenvolvimento**: 1 relatório

---

## 📋 Categorias de Análise

### 📦 **1. Estoque e Inventário**
Relatórios focados na gestão física e financeira do estoque.

### 👥 **2. Colaboradores e Conformidade**
Análises relacionadas aos colaboradores, entregas e cumprimento de normas.

### ⏰ **3. Temporal e Vencimentos**
Controle de prazos, vencimentos e análises temporais.

### 💰 **4. Financeiro e Perdas**
Análises de custos, valores e impactos financeiros.

### 🔍 **5. Operacional e Auditoria**
Monitoramento de operações, performance e compliance.

### 📊 **6. Dashboards e Métricas**
Painéis executivos e indicadores consolidados.

---

## 📦 1. ESTOQUE E INVENTÁRIO

### **R-01: Posição de Estoque**
- **Endpoint**: Use Case `RelatorioPosicaoEstoqueUseCase`
- **Funcionalidade**: Posição detalhada do estoque por almoxarifado e tipo de EPI
- **Filtros Disponíveis**:
  - `almoxarifadoId`: Filtrar por almoxarifado específico
  - `tipoEpiId`: Filtrar por tipo de EPI
  - `unidadeNegocioId`: Filtrar por unidade de negócio
  - `apenasComSaldo`: Mostrar apenas itens com saldo positivo
  - `apenasAbaixoMinimo`: Mostrar apenas itens abaixo do estoque mínimo

- **Dados Retornados**:
  - Lista detalhada de itens com saldos atuais
  - Situação do estoque (NORMAL, BAIXO, CRITICO, ZERO)
  - Valores unitários e totais por item
  - Resumo consolidado com totais gerais

- **Métodos Especiais**:
  - `obterKardexItem()`: Movimentações detalhadas de um item específico
  - `obterAnaliseGiroEstoque()`: Análise de giro e classificação ABC

### **R-02: Saldo de Estoque**
- **Endpoint**: Use Case `RelatorioSaldoEstoqueUseCase`
- **Funcionalidade**: Saldos atuais com detalhes financeiros e status
- **Filtros Disponíveis**:
  - `almoxarifadoId`: Almoxarifado específico
  - `tipoEpiId`: Tipo de EPI específico
  - `status`: Status do estoque (DISPONIVEL, AGUARDANDO_INSPECAO, QUARENTENA)
  - `incluirZerados`: Incluir itens com saldo zero

- **Dados Retornados**:
  - Saldos por status de estoque
  - Valores financeiros consolidados
  - Estatísticas de distribuição por status
  - Análise de qualidade do estoque

### **R-03: Movimentações de Estoque (Kardex)**
- **Endpoint**: Use Case `RelatorioMovimentacoesEstoqueUseCase`
- **Funcionalidade**: Histórico completo de todas as movimentações
- **Filtros Disponíveis**:
  - `almoxarifadoId`, `tipoEpiId`, `estoqueItemId`
  - `tipoMovimentacao`: Tipo específico de movimentação
  - `responsavelId`: Usuário responsável pela movimentação
  - `dataInicio`, `dataFim`: Período de análise
  - Paginação: `page`, `limit`

- **Dados Retornados**:
  - Lista chronológica de movimentações
  - Saldos anteriores e posteriores
  - Detalhes de documentos associados
  - Estatísticas por tipo de movimentação

- **Métodos Especiais**:
  - `obterKardexItem()`: Kardex específico de um item
  - `obterEstatisticas()`: Resumo de movimentações por período

### **R-04: Itens Descartados**
- **Endpoint**: Use Case `RelatorioItensDescartadosUseCase`
- **Funcionalidade**: Análise completa de descartes e perdas
- **Filtros Disponíveis**:
  - `almoxarifadoId`, `tipoEpiId`, `responsavelId`
  - `dataInicio`, `dataFim`: Período de análise
  - `incluirNotaMovimentacao`: Incluir dados da nota
  - Paginação disponível

- **Dados Retornados**:
  - Lista de itens descartados com motivos
  - Valores financeiros das perdas
  - Análise por responsável e tipo
  - Tendências de descarte

- **Métodos Especiais**:
  - `obterEstatisticas()`: Estatísticas consolidadas
  - `obterDescartePorTipo()`: Agrupamento por tipo de EPI
  - `obterDescartePorResponsavel()`: Análise por responsável

### **R-05: Análise de Quarentena**
- **Endpoint**: Use Case `RelatorioEpisAnaliseQuarentenaUseCase`
- **Funcionalidade**: EPIs em processo de quarentena/inspeção
- **Dados Retornados**:
  - Itens aguardando inspeção
  - Tempo médio em quarentena
  - Análise de qualidade dos retornos
  - Recomendações de ação

---

## 👥 2. COLABORADORES E CONFORMIDADE

### **R-06: Relatório de Conformidade**
- **Endpoint**: `GET /api/relatorios/conformidade`
- **Funcionalidade**: Status de conformidade dos colaboradores com EPIs obrigatórios
- **Filtros Disponíveis**:
  - `unidadeNegocioId`: Unidade de negócio específica
  - `colaboradorId`: Colaborador específico
  - `incluirVencidos`: Incluir EPIs vencidos na análise
  - `incluirProximosVencimento`: Incluir EPIs próximos do vencimento
  - `diasAvisoVencimento`: Dias de antecedência para alerta
  - `dataInicio`, `dataFim`: Período de análise

- **Dados Retornados**:
  - Lista de colaboradores com status de conformidade
  - Percentuais de conformidade por unidade
  - Identificação de não conformidades
  - Recomendações de ação corretiva

- **Métricas Calculadas**:
  - Taxa de conformidade geral
  - Colaboradores com EPIs vencidos
  - Colaboradores sem EPIs obrigatórios
  - Tempo médio de não conformidade

### **R-07: Entregas por Colaborador**
- **Endpoint**: Use Case `RelatorioEntregasColaboradorUseCase`
- **Funcionalidade**: Histórico completo de entregas individuais
- **Filtros Disponíveis**:
  - `colaboradorId`: Colaborador específico
  - `almoxarifadoId`: Almoxarifado de origem
  - `dataInicio`, `dataFim`: Período de análise

- **Dados Retornados**:
  - Histórico cronológico de entregas
  - Status atual de cada item entregue
  - Análise de padrões de uso
  - Indicadores de comportamento

### **R-08: Devolução Atrasada**
- **Endpoint**: Use Case `RelatorioDevolucaoAtrasadaUseCase`
- **Funcionalidade**: Lista colaboradores com devoluções em atraso
- **Filtros Disponíveis**:
  - `colaboradorId`: Colaborador específico
  - `tipoEpiId`: Tipo de EPI específico
  - `almoxarifadoId`: Almoxarifado específico
  - `diasAtraso`: Mínimo de dias em atraso
  - Paginação disponível

- **Dados Retornados**:
  - Lista de colaboradores com atrasos
  - Tempo de atraso por item
  - Ranking de maiores atrasos
  - Análise de impacto financeiro

- **Métodos Especiais**:
  - `obterEstatisticas()`: Estatísticas de atrasos
  - `obterColaboradoresCriticos()`: Colaboradores com atrasos críticos

---

## ⏰ 3. TEMPORAL E VENCIMENTOS

### **R-09: Controle de Vencimentos**
- **Endpoint**: Use Case `ControleVencimentosUseCase`
- **Funcionalidade**: Monitora EPIs com vencimento próximo ou vencidos
- **Filtros Disponíveis**:
  - `colaboradorId`, `tipoEpiId`, `almoxarifadoId`
  - `diasAntecedencia`: Dias de antecedência para alerta
  - `incluirVencidos`: Incluir itens já vencidos
  - `apenasVencidos`: Mostrar apenas vencidos
  - `dataReferencia`: Data base para cálculo
  - Paginação disponível

- **Dados Retornados**:
  - Lista de EPIs próximos ao vencimento
  - Dias restantes para cada item
  - Priorização por criticidade
  - Cronograma de vencimentos

- **Métodos Especiais**:
  - `obterEstatisticas()`: Estatísticas gerais de vencimentos
  - `obterItensVencidosCriticos()`: Itens muito atrasados (>30 dias)
  - `obterColaboradoresComMaisVencimentos()`: Ranking de colaboradores
  - `gerarRelatorioVencimentosPorPeriodo()`: Análise temporal

### **R-10: Uso de EPIs**
- **Endpoint**: `GET /api/relatorios/uso-epis`
- **Funcionalidade**: Análise de padrões de uso, tempo médio e condições de devolução
- **Filtros Disponíveis**:
  - `colaboradorId`: Colaborador específico
  - `tipoEpiId`: Tipo de EPI específico
  - `unidadeNegocioId`: Unidade de negócio
  - `incluirDevolvidos`: Incluir itens devolvidos
  - `incluirPerdidos`: Incluir itens perdidos
  - `dataInicio`, `dataFim`: Período de análise

- **Dados Retornados**:
  - Histórico de uso detalhado
  - Tempo médio de utilização por tipo
  - Condições de devolução
  - Análise de durabilidade

- **Métricas Calculadas**:
  - Taxa de perda por tipo de EPI
  - Taxa de danificação
  - Custo total de perdas
  - Tempo médio de uso efetivo

---

## 💰 4. FINANCEIRO E PERDAS

### **R-11: EPIs Devolvidos e Descartados**
- **Endpoint**: Use Case `RelatorioEpisDevolvidosDescartadosUseCase`
- **Funcionalidade**: Análise financeira de devoluções e descartes
- **Dados Retornados**:
  - Valor total de itens descartados
  - Análise de motivos de descarte
  - Impact financeiro por categoria
  - Tendências de perda

### **R-12: Estornos**
- **Endpoint**: Use Case `RelatorioEstornosUseCase`
- **Funcionalidade**: Análise completa de estornos de movimentações
- **Filtros Disponíveis**:
  - `almoxarifadoId`, `tipoEpiId`, `responsavelId`
  - `tipoMovimentacaoOriginal`: Tipo da movimentação estornada
  - `dataInicio`, `dataFim`: Período de análise
  - `incluirDetalhesOriginal`: Incluir dados da movimentação original
  - Paginação disponível

- **Dados Retornados**:
  - Lista de estornos com detalhes
  - Motivos e justificativas
  - Impacto financeiro dos estornos
  - Análise de frequência por responsável

- **Métodos Especiais**:
  - `obterEstatisticas()`: Estatísticas completas de estornos
  - `obterEstornosPorResponsavel()`: Análise por responsável
  - `obterEstornosRapidos()`: Estornos feitos rapidamente (< 24h)
  - `obterEstornosLentos()`: Estornos tardios (> 7 dias)

---

## 🔍 5. OPERACIONAL E AUDITORIA

### **R-13: Movimentações Detalhadas**
- **Endpoint**: `GET /api/relatorios/movimentacoes`
- **Funcionalidade**: Lista todas as movimentações com filtros detalhados e paginação
- **Filtros Disponíveis**:
  - `almoxarifadoId`: Almoxarifado específico
  - `tipoEpiId`: Tipo de EPI específico
  - `tipoMovimentacao`: Tipo específico (ENTRADA, SAIDA, TRANSFERENCIA, etc.)
  - `usuarioId`: Usuário responsável
  - `dataInicio`, `dataFim`: Período de análise
  - `page`, `limit`: Paginação

- **Dados Retornados**:
  - Lista detalhada de movimentações
  - Informações do responsável
  - Documentos associados
  - Resumo estatístico por tipo

### **R-14: Relatório de Auditoria**
- **Endpoint**: `GET /api/relatorios/auditoria`
- **Status**: 🚧 **Em Desenvolvimento**
- **Funcionalidade**: Sistema completo de auditoria para compliance e rastreabilidade
- **Filtros Disponíveis**:
  - `usuarioId`: Usuário específico
  - `acao`: Tipo de ação realizada
  - `dataInicio`, `dataFim`: Período de análise
  - `nivelSeveridade`: Criticidade da operação
  - `modulo`: Módulo do sistema (estoque, fichas, relatórios)

- **Dados Retornados** (Planejados):
  - **Log de Operações**:
    - Timestamp exato da operação
    - Usuário responsável
    - Ação realizada (CRIAR, EDITAR, DELETAR, VISUALIZAR)
    - Entidade afetada (tipo_epi, ficha_epi, entrega, etc.)
    - Valores anteriores e posteriores (para edições)
    - IP de origem da requisição
    - User Agent do navegador

  - **Análise de Segurança**:
    - Tentativas de acesso negadas
    - Operações fora do horário comercial
    - Múltiplas tentativas de login
    - Operações em lote suspeitas
    - Alterações em dados críticos

  - **Resumo Estatístico**:
    - Total de operações por período
    - Operações por usuário
    - Ações mais frequentes
    - Horários de maior atividade
    - Dispositivos utilizados

- **Casos de Uso do Relatório de Auditoria**:
  - **Compliance Regulatório**: Atender exigências de órgãos fiscalizadores
  - **Investigação de Incidentes**: Rastrear alterações suspeitas
  - **Análise de Comportamento**: Identificar padrões de uso
  - **Controle de Acesso**: Verificar permissões e acessos
  - **Backup de Integridade**: Garantir que dados não foram alterados indevidamente

- **Implementação Técnica Planejada**:
  ```typescript
  // Estrutura do log de auditoria
  interface LogAuditoria {
    id: string;
    timestamp: Date;
    usuarioId: string;
    usuarioNome: string;
    acao: 'CRIAR' | 'EDITAR' | 'DELETAR' | 'VISUALIZAR' | 'LOGIN' | 'LOGOUT';
    entidade: string; // 'tipo_epi', 'ficha_epi', etc.
    entidadeId: string;
    valoresAnteriores?: object;
    valoresPosteriores?: object;
    ipOrigem: string;
    userAgent: string;
    sessionId: string;
    sucesso: boolean;
    motivoFalha?: string;
  }
  ```

### **R-15: Saúde do Sistema**
- **Endpoint**: `GET /api/relatorios/saude-sistema`
- **Funcionalidade**: Monitora status geral, alertas e performance
- **Filtros Disponíveis**:
  - `incluirAlertas`: Incluir alertas ativos
  - `incluirEstatisticas`: Incluir estatísticas operacionais
  - `incluirPerformance`: Incluir métricas de performance

- **Dados Retornados**:
  - **Status Geral**: SAUDAVEL, ATENCAO, CRITICO
  - **Alertas Ativos**:
    - Estoque baixo ou crítico
    - Vencimentos próximos
    - Devoluções atrasadas
    - Erros de sistema
  - **Estatísticas Operacionais**:
    - Total de usuários e fichas ativas
    - Operações nas últimas 24h
    - Items em alerta
  - **Métricas de Performance**:
    - Tempo médio de resposta
    - Utilização de CPU e memória
    - Conexões de banco de dados
    - Operações por minuto

---

## 📊 6. DASHBOARDS E MÉTRICAS

### **R-16: Dashboard Principal**
- **Endpoint**: `GET /api/relatorios/dashboard`
- **Funcionalidade**: Painel executivo com indicadores consolidados
- **Filtros Disponíveis**:
  - `unidadeNegocioId`: Unidade específica
  - `almoxarifadoId`: Almoxarifado específico
  - `periodo`: ULTIMO_MES, ULTIMO_TRIMESTRE, ULTIMO_SEMESTRE, ULTIMO_ANO

- **Dados Retornados**:
  - **Indicadores Gerais**:
    - Total de fichas (ativas e totais)
    - Itens em estoque e valor total
    - Percentuais de crescimento

  - **Alertas de Estoque**:
    - Items críticos, baixos e zerados
    - Lista de itens problemáticos
    - Ações recomendadas

  - **Entregas Recentes**:
    - Entregas hoje, esta semana, este mês
    - Entregas pendentes de assinatura

  - **Vencimentos Próximos**:
    - Vencendo hoje, em 7 dias, em 30 dias
    - Lista de itens críticos

  - **EPIs por Categoria**:
    - Distribuição por categoria brasileira
    - Disponibilidade por tipo
    - Categoria com maior estoque

### **R-17: EPIs Ativos Sintético**
- **Endpoint**: Use Case `RelatorioEpisAtivosSinteticoUseCase`
- **Funcionalidade**: Visão consolidada de EPIs em uso
- **Dados Retornados**:
  - Quantidade total por tipo de EPI
  - Distribuição por almoxarifado
  - Status de utilização
  - Métricas de rotatividade

### **R-18: EPIs Ativos Detalhado**
- **Endpoint**: Use Case `RelatorioEpisAtivosDetalhadoUseCase`
- **Funcionalidade**: Detalhamento individual de EPIs em uso
- **Dados Retornados**:
  - Lista individual de cada EPI ativo
  - Dados do colaborador atual
  - Histórico de movimentações
  - Status de vencimento individual

### **R-19: Pesquisa de Fichas por Tipo de EPI**
- **Endpoint**: Use Case `RelatorioPesquisarFichasTipoEpiUseCase`
- **Funcionalidade**: Busca avançada e análise de fichas
- **Dados Retornados**:
  - Fichas filtradas por critérios específicos
  - Estatísticas de uso por tipo
  - Padrões de distribuição
  - Análise de demanda

---

## 🛠️ Arquitetura Técnica

### **Padrões de Implementação**
- **ORM**: Prisma para acesso ao banco PostgreSQL
- **Validação**: Schemas Zod para validação de entrada
- **Arquitetura**: Clean Architecture (Controllers → Use Cases → Repositories)
- **Paginação**: Server-side com metadados completos
- **Filtros**: Opcionais e combináveis
- **Performance**: Queries otimizadas com índices adequados

### **Estrutura de Resposta Padronizada**
```typescript
interface RelatorioResponse {
  success: boolean;
  data: {
    items?: any[];           // Lista de dados (quando aplicável)
    resumo?: any;           // Estatísticas consolidadas
    parametros?: any;       // Parâmetros utilizados
    dataGeracao: Date;      // Timestamp da geração
  };
  pagination?: {            // Metadados de paginação
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
  message?: string;
}
```

### **Filtros Comuns Disponíveis**
- **Entidades**: `colaboradorId`, `tipoEpiId`, `almoxarifadoId`, `unidadeNegocioId`
- **Temporal**: `dataInicio`, `dataFim`, `dataReferencia`
- **Paginação**: `page`, `limit`
- **Status**: `status`, `incluirVencidos`, `apenasAtivos` 
- **Responsabilidade**: `responsavelId`, `usuarioId`

---

## 📈 Roadmap de Melhorias

### **Próximas Implementações**
1. **Finalização do Relatório de Auditoria** - Sistema completo de logs
2. **Relatórios por Categoria de EPI** - Análises específicas por categoria brasileira
3. **Exportação para XLSX** - Relatórios em formato Excel

### **Otimizações Planejadas**
- Queries assíncronas para relatórios pesados

---

## ❓ Respostas às Dúvidas Técnicas

### **Q1: Como o estoque mínimo é definido?**
**R:** Atualmente o sistema **NÃO possui estoque mínimo configurável por item**. A nova implementação incluirá:

**Nova Configuração Global**: `ESTOQUE_MINIMO_EQUIPAMENTO` (padrão: 10)
- Configuração única aplicada a todos os equipamentos
- Usuário pode alterar para qualquer valor inteiro positivo
- Substituirá os valores hardcoded atuais

**Status Simplificado**:
- **BAIXO**: Quando saldo < configuração `ESTOQUE_MINIMO_EQUIPAMENTO`
- **NORMAL**: Quando saldo >= configuração `ESTOQUE_MINIMO_EQUIPAMENTO`
- **ZERO**: Quando saldo = 0

**Implementação necessária**: 
- Configuração global `ESTOQUE_MINIMO_EQUIPAMENTO`
- Campo `estoqueMinimo` na tabela `EstoqueItem` (para exceções por item)
- Lógica de cálculo simplificada nos relatórios

### **Q2: Como são definidos os status do estoque (NORMAL, BAIXO, CRITICO, ZERO)?**
**R:** Seguirá o padrão da nova implementação simplificada:
- **BAIXO**: Quando saldo < configuração `ESTOQUE_MINIMO_EQUIPAMENTO`
- **NORMAL**: Quando saldo >= configuração `ESTOQUE_MINIMO_EQUIPAMENTO`
- **ZERO**: Quando saldo = 0

A lógica de cálculo será unificada em todos os relatórios usando a configuração global.

### **Q3: O que significam "valores unitários e totais por item"?**
**R:** São **valores financeiros** opcionais:
- **Valor Unitário**: `custoUnitario` do EstoqueItem
- **Valor Total**: `quantidade * custoUnitario`
- Só aparecem quando o `custoUnitario` está preenchido

### **Q4: O status é por tipoEPI ou por EstoqueItem? Onde ficam itens descartados?**
**R:** O status é **agregado por tipoEPI + almoxarifado + status**. Itens descartados não aparecem nos relatórios de estoque pois só são consultados os status: `DISPONIVEL`, `QUARENTENA`, `AGUARDANDO_INSPECAO`. Descartes são rastreados via movimentações `SAIDA_DESCARTE`.

**Implementação necessária**: Criar **Relatório Específico de Descarte** com:
- Filtros por período, responsável, motivo
- Lista detalhada de itens descartados
- Análise de custos e perdas
- Tendências de descarte por tipo de EPI


### **Q5: E quanto a possíveis itens com estoque negativo?**
**R:** **Sim, o sistema suporta estoque negativo** através da configuração `PERMITIR_ESTOQUE_NEGATIVO` (padrão: false). Quando habilitada, permite saldos negativos nos EstoqueItem.

**Implementação necessária**: 
- Incluir itens com saldo negativo nos relatórios de estoque zero
- Adicionar opção "Incluir saldos negativos" nos filtros
- Status **NEGATIVO** para saldos < 0 quando configuração habilitada
- Destaque visual para alertar sobre estoque negativo


### **Q7: Há suporte para alertas de vencimento próximo no dashboard?**
**R:** **Sim, totalmente implementado**. O dashboard possui:
- Alertas para itens vencendo hoje, em 7 dias, em 30 dias
- Lista de itens críticos com colaborador e prazo
- Use case `ControleVencimentosUseCase` completo com prioridades
- Configuração de `diasAntecedencia` (padrão: 30 dias)

### **Q7: Devemos ter entidade "Contratada" para empresa do colaborador?**
**R:** **Sim, será implementada a entidade `Contratada`** como identificação lateral ao colaborador.

**Estrutura da entidade**:
```sql
CREATE TABLE "contratadas" (
  "id" TEXT PRIMARY KEY,
  "nome" VARCHAR(255) NOT NULL,
  "cnpj" VARCHAR(14) NOT NULL UNIQUE,
  "created_at" TIMESTAMPTZ(6) DEFAULT CURRENT_TIMESTAMP
);
```

**Relacionamento**: Colaborador terá campo `contratada_id` opcional. Todos os relatórios incluirão filtro por contratada e dados da empresa nos resultados. 

### **Q8: O que seria um "relatório grande"?**
**R:** Para o contexto do sistema (2.000 fichas EPI, 10.000 itens de estoque), não há necessidade de otimizações complexas. Os relatórios atuais são adequados para o volume de dados.

### **Q9: O que significa "APIs GraphQL para relatórios customizáveis"?**
**R:** Seria permitir ao frontend criar consultas dinâmicas especificando exatamente quais campos e filtros deseja, ao invés de endpoints fixos. Não será implementado neste projeto.

---

## 📋 Plano de Implementação das Considerações

### **🎯 Fase 1: Entidade Contratada (Prioridade Alta)**

#### **1.1 Criar entidade Contratada**
```sql
-- Migration: criar tabela contratadas
CREATE TABLE "contratadas" (
    "id" TEXT NOT NULL,
    "nome" VARCHAR(255) NOT NULL,
    "cnpj" VARCHAR(14) NOT NULL UNIQUE,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "contratadas_pkey" PRIMARY KEY ("id")
);
```

#### **1.2 Adicionar relacionamento em Colaborador**
```sql
-- Adicionar campo contratada_id em colaboradores
ALTER TABLE "colaboradores" ADD COLUMN "contratada_id" TEXT;
ALTER TABLE "colaboradores" ADD CONSTRAINT "fk_colaborador_contratada" 
    FOREIGN KEY ("contratada_id") REFERENCES "contratadas"("id");
```

#### **1.3 Implementar CRUD básico**
- Controller: `ContratadaController`
- Use Case: `CriarContratadaUseCase`, `ListarContratadasUseCase`
- Schemas: Validação CNPJ, nome obrigatório

#### **1.4 Adicionar filtro contratadaId em relatórios**
- Atualizar todos os schemas de filtros
- Modificar queries para incluir join com contratada
- Adicionar campo nos DTOs de resposta

### **🎯 Fase 2: Estoque Mínimo Global (Prioridade Alta)**

#### **2.1 Configuração global no sistema**
```sql
-- Adicionar configuração ESTOQUE_MINIMO_EQUIPAMENTO
INSERT INTO "configuracoes" (chave, valor, descricao) 
VALUES ('ESTOQUE_MINIMO_EQUIPAMENTO', '10', 'Quantidade mínima padrão para todos os equipamentos');
```

#### **2.2 Implementação simplificada**
- Configuração única aplicada a todos os tipos de EPI
- Status: BAIXO (< mínimo), NORMAL (>= mínimo), ZERO (= 0)
- Interface para alterar valor global
- Alertas automáticos baseados na configuração

#### **2.3 Campo opcional por item**
```sql
-- Campo para exceções específicas (opcional)
ALTER TABLE "estoque_itens" ADD COLUMN "estoque_minimo" INTEGER NULL;
```
Quando NULL, usa configuração global. Quando preenchido, usa valor específico.

### **🎯 Fase 3: Relatórios por Categoria (Prioridade Média)**

#### **3.1 Implementar RelatorioCategoriaEpiUseCase**
```typescript
interface RelatorioCategoria {
  categoria: CategoriaEPI;
  quantidadeEstoque: number;
  quantidadeDevolvida: number;
  quantidadeDisponivel: number;
  quantidadeQuarentena: number;
  quantidadeAguardandoInspecao: number;
  valorTotalEstoque: number;
}
```


#### **3.2 Endpoint dedicado**
- `GET /api/relatorios/categoria-epi`
- Filtros: `unidadeNegocioId`, `almoxarifadoId`, `contratadaId`
- Dados por status de estoque e categoria

### **🎯 Fase 4: Exportação XLSX (Prioridade Média)**

#### **4.1 Biblioteca de exportação**
```bash
npm install exceljs
```

#### **4.2 Implementar ExportacaoService**
- Método genérico para transformar dados em XLSX
- Headers customizáveis por relatório
- Formatação de dados (datas, valores monetários)

#### **4.3 Endpoints de exportação**
- Adicionar query parameter `?formato=xlsx` em todos os relatórios
- Retornar arquivo binário com headers adequados

### **🎯 Fase 5: Relatório de Itens Transferidos (Prioridade Baixa)**

#### **5.1 Implementar RelatorioItensTransferidosUseCase**
- Similar ao relatório de descartados
- Filtrar movimentações `SAIDA_TRANSFERENCIA` e `ENTRADA_TRANSFERENCIA`
- Análise de transferências entre almoxarifados

### **🎯 Fase 6: Relatório Específico de Descarte (Prioridade Média)**

#### **6.1 Implementar RelatorioDescartesUseCase**
```typescript
interface RelatorioDescarte {
  itemId: string;
  tipoEpi: string;
  almoxarifado: string;
  dataDescarte: Date;
  motivo: string;
  responsavel: string;
  custoEstimado: number;
  observacoes?: string;
}
```

#### **6.2 Análises específicas**
- Filtros por período, responsável, motivo de descarte
- Cálculos de impacto financeiro
- Trending de descartes por tipo de EPI
- Relatório de perdas e desperdícios

---

### **📅 Cronograma Estimado**

| Fase | Prazo | Complexidade | Impacto |
|------|-------|--------------|---------|
| **Fase 1**: Entidade Contratada | 1-2 semanas | Média | Alto |
| **Fase 2**: Estoque Mínimo Global | 3-4 dias | Baixa | Alto |
| **Fase 3**: Relatórios Categoria | 3-4 dias | Baixa | Médio |
| **Fase 4**: Exportação XLSX | 1 semana | Média | Médio |
| **Fase 5**: Itens Transferidos | 2-3 dias | Baixa | Baixo |
| **Fase 6**: Relatório Descarte | 3-4 dias | Baixa | Médio |

**Total estimado**: 3-5 semanas para implementação completa com abordagem simplificada.

---

**📋 Este documento será atualizado conforme novas implementações e melhorias forem realizadas no sistema.**