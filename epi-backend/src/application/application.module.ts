import { Module } from '@nestjs/common';
import { RepositoryModule } from '../infrastructure/repositories/repository.module';
import { ConfiguracaoService } from '../domain/services/configuracao.service';

// Contratada Use Cases
import { CriarContratadaUseCase } from './use-cases/contratadas/criar-contratada.use-case';
import { ListarContratadasUseCase } from './use-cases/contratadas/listar-contratadas.use-case';
import { AtualizarContratadaUseCase } from './use-cases/contratadas/atualizar-contratada.use-case';
import { ExcluirContratadaUseCase } from './use-cases/contratadas/excluir-contratada.use-case';
import { ObterContratadaUseCase } from './use-cases/contratadas/obter-contratada.use-case';

// Estoque Use Cases
import { ConcluirNotaMovimentacaoUseCase } from './use-cases/estoque/concluir-nota-movimentacao.use-case';
import { RealizarAjusteDirectoUseCase } from './use-cases/estoque/realizar-ajuste-direto.use-case';
import { GerenciarNotaRascunhoUseCase } from './use-cases/estoque/gerenciar-nota-rascunho.use-case';
import { CancelarNotaMovimentacaoUseCase } from './use-cases/estoque/cancelar-nota-movimentacao.use-case';
import { ListarEstoqueItensUseCase } from './use-cases/estoque/listar-estoque-itens.use-case';
import { ListarAlmoxarifadosUseCase } from './use-cases/estoque/listar-almoxarifados.use-case';

// Fichas Use Cases
import { AssinarEntregaUseCase } from './use-cases/fichas/assinar-entrega.use-case';
import { CancelarDevolucaoUseCase } from './use-cases/fichas/cancelar-devolucao.use-case';
import { CancelarEntregaUseCase } from './use-cases/fichas/cancelar-entrega.use-case';
import { CriarEntregaFichaUseCase } from './use-cases/fichas/criar-entrega-ficha.use-case';
import { CriarFichaEpiUseCase } from './use-cases/fichas/criar-ficha-epi.use-case';
import { CriarTipoEpiUseCase } from './use-cases/fichas/criar-tipo-epi.use-case';
import { ObterHistoricoFichaUseCase } from './use-cases/fichas/obter-historico-ficha.use-case';
import { ProcessarDevolucaoUseCase } from './use-cases/fichas/processar-devolucao.use-case';
import { ObterFichaCompletaUseCase } from './use-cases/fichas/obter-ficha-completa.use-case';
import { ListarFichasEnhancedUseCase } from './use-cases/fichas/listar-fichas-enhanced.use-case';

// Query Use Cases
import { ControleVencimentosUseCase } from './use-cases/queries/controle-vencimentos.use-case';
import { RelatorioDevolucaoAtrasadaUseCase } from './use-cases/queries/relatorio-devolucao-atrasada.use-case';
import { RelatorioEntregasColaboradorUseCase } from './use-cases/queries/relatorio-entregas-colaborador.use-case';
import { RelatorioEpisAnaliseQuarentenaUseCase } from './use-cases/queries/relatorio-epis-analise-quarentena.use-case';
import { RelatorioEpisAtivosDetalhadoUseCase } from './use-cases/queries/relatorio-epis-ativos-detalhado.use-case';
import { RelatorioEpisAtivosSinteticoUseCase } from './use-cases/queries/relatorio-epis-ativos-sintetico.use-case';
import { RelatorioEpisDevolvidosDescartadosUseCase } from './use-cases/queries/relatorio-epis-devolvidos-descartados.use-case';
import { RelatorioItensDescartadosUseCase } from './use-cases/queries/relatorio-itens-descartados.use-case';
import { RelatoriopesquisarFichasTipoEpiUseCase } from './use-cases/queries/relatorio-pesquisar-fichas-tipo-epi.use-case';
import { RelatorioPosicaoEstoqueUseCase } from './use-cases/queries/relatorio-posicao-estoque.use-case';
import { RelatorioSaldoEstoqueUseCase } from './use-cases/queries/relatorio-saldo-estoque.use-case';
import { RelatorioDescartesUseCase } from './use-cases/queries/relatorio-descartes.use-case';
import { RelatorioMovimentacoesEstoqueUseCase } from './use-cases/queries/relatorio-movimentacoes-estoque.use-case';

// Configuracao Use Cases
import { ObterConfiguracoesUseCase } from './use-cases/configuracoes/obter-configuracoes.use-case';
import { AtualizarConfiguracoesUseCase } from './use-cases/configuracoes/atualizar-configuracoes.use-case';

// Usuario Use Cases
import { ListarUsuariosUseCase } from './use-cases/usuarios/listar-usuarios.use-case';

// Colaborador Use Cases
import { CriarColaboradorUseCase } from './use-cases/colaboradores/criar-colaborador.use-case';
import { ListarColaboradoresUseCase } from './use-cases/colaboradores/listar-colaboradores.use-case';

// Entregas Otimizadas Use Cases
import { CriarEntregaCompletaUseCase } from './use-cases/entregas/criar-entrega-completa.use-case';

// Devoluções Otimizadas Use Cases
import { ProcessarDevolucoesBatchUseCase } from './use-cases/devolucoes/processar-devolucoes-batch.use-case';

@Module({
  imports: [RepositoryModule],
  providers: [
    // Domain Services
    ConfiguracaoService,
    
    // Contratada Use Cases
    CriarContratadaUseCase,
    ListarContratadasUseCase,
    AtualizarContratadaUseCase,
    ExcluirContratadaUseCase,
    ObterContratadaUseCase,
    
    // Estoque Use Cases
    ConcluirNotaMovimentacaoUseCase,
    RealizarAjusteDirectoUseCase,
    GerenciarNotaRascunhoUseCase,
    CancelarNotaMovimentacaoUseCase,
    ListarEstoqueItensUseCase,
    ListarAlmoxarifadosUseCase,
    
    // Fichas Use Cases
    AssinarEntregaUseCase,
    CancelarDevolucaoUseCase,
    CancelarEntregaUseCase,
    CriarEntregaFichaUseCase,
    CriarFichaEpiUseCase,
    CriarTipoEpiUseCase,
    ObterHistoricoFichaUseCase,
    ProcessarDevolucaoUseCase,
    ObterFichaCompletaUseCase,
    ListarFichasEnhancedUseCase,
    
    // Query Use Cases
    ControleVencimentosUseCase,
    RelatorioDevolucaoAtrasadaUseCase,
    RelatorioEntregasColaboradorUseCase,
    RelatorioEpisAnaliseQuarentenaUseCase,
    RelatorioEpisAtivosDetalhadoUseCase,
    RelatorioEpisAtivosSinteticoUseCase,
    RelatorioEpisDevolvidosDescartadosUseCase,
    RelatorioItensDescartadosUseCase,
    RelatoriopesquisarFichasTipoEpiUseCase,
    RelatorioPosicaoEstoqueUseCase,
    RelatorioSaldoEstoqueUseCase,
    RelatorioDescartesUseCase,
    RelatorioMovimentacoesEstoqueUseCase,
    
    // Configuracao Use Cases
    ObterConfiguracoesUseCase,
    AtualizarConfiguracoesUseCase,
    
    // Usuario Use Cases
    ListarUsuariosUseCase,
    
    // Colaborador Use Cases
    CriarColaboradorUseCase,
    ListarColaboradoresUseCase,
    
    // Entregas Otimizadas Use Cases
    CriarEntregaCompletaUseCase,
    
    // Devoluções Otimizadas Use Cases
    ProcessarDevolucoesBatchUseCase,
  ],
  exports: [
    // Domain Services
    ConfiguracaoService,
    
    // Contratada Use Cases
    CriarContratadaUseCase,
    ListarContratadasUseCase,
    AtualizarContratadaUseCase,
    ExcluirContratadaUseCase,
    ObterContratadaUseCase,
    
    // Estoque Use Cases
    ConcluirNotaMovimentacaoUseCase,
    RealizarAjusteDirectoUseCase,
    GerenciarNotaRascunhoUseCase,
    CancelarNotaMovimentacaoUseCase,
    ListarEstoqueItensUseCase,
    ListarAlmoxarifadosUseCase,
    
    // Fichas Use Cases
    AssinarEntregaUseCase,
    CancelarDevolucaoUseCase,
    CancelarEntregaUseCase,
    CriarEntregaFichaUseCase,
    CriarFichaEpiUseCase,
    CriarTipoEpiUseCase,
    ObterHistoricoFichaUseCase,
    ProcessarDevolucaoUseCase,
    ObterFichaCompletaUseCase,
    ListarFichasEnhancedUseCase,
    
    // Query Use Cases
    ControleVencimentosUseCase,
    RelatorioDevolucaoAtrasadaUseCase,
    RelatorioEntregasColaboradorUseCase,
    RelatorioEpisAnaliseQuarentenaUseCase,
    RelatorioEpisAtivosDetalhadoUseCase,
    RelatorioEpisAtivosSinteticoUseCase,
    RelatorioEpisDevolvidosDescartadosUseCase,
    RelatorioItensDescartadosUseCase,
    RelatoriopesquisarFichasTipoEpiUseCase,
    RelatorioPosicaoEstoqueUseCase,
    RelatorioSaldoEstoqueUseCase,
    RelatorioDescartesUseCase,
    RelatorioMovimentacoesEstoqueUseCase,
    
    // Configuracao Use Cases
    ObterConfiguracoesUseCase,
    AtualizarConfiguracoesUseCase,
    
    // Usuario Use Cases
    ListarUsuariosUseCase,
    
    // Colaborador Use Cases
    CriarColaboradorUseCase,
    ListarColaboradoresUseCase,
    
    // Entregas Otimizadas Use Cases
    CriarEntregaCompletaUseCase,
    
    // Devoluções Otimizadas Use Cases
    ProcessarDevolucoesBatchUseCase,
  ],
})
export class ApplicationModule {}