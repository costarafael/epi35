import { Module } from '@nestjs/common';
import { RepositoryModule } from '../infrastructure/repositories/repository.module';

// Contratada Use Cases
import { CriarContratadaUseCase } from './use-cases/contratadas/criar-contratada.use-case';
import { ListarContratadasUseCase } from './use-cases/contratadas/listar-contratadas.use-case';
import { AtualizarContratadaUseCase } from './use-cases/contratadas/atualizar-contratada.use-case';
import { ExcluirContratadaUseCase } from './use-cases/contratadas/excluir-contratada.use-case';
import { ObterContratadaUseCase } from './use-cases/contratadas/obter-contratada.use-case';

// Estoque Use Cases
import { ConcluirNotaMovimentacaoUseCase } from './use-cases/estoque/concluir-nota-movimentacao.use-case';
import { RealizarAjusteDirectoUseCase } from './use-cases/estoque/realizar-ajuste-direto.use-case';

// Fichas Use Cases
import { CancelarDevolucaoUseCase } from './use-cases/fichas/cancelar-devolucao.use-case';
import { CancelarEntregaUseCase } from './use-cases/fichas/cancelar-entrega.use-case';
import { CriarEntregaFichaUseCase } from './use-cases/fichas/criar-entrega-ficha.use-case';
import { CriarFichaEpiUseCase } from './use-cases/fichas/criar-ficha-epi.use-case';
import { CriarTipoEpiUseCase } from './use-cases/fichas/criar-tipo-epi.use-case';
import { ProcessarDevolucaoUseCase } from './use-cases/fichas/processar-devolucao.use-case';

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

@Module({
  imports: [RepositoryModule],
  providers: [
    // Contratada Use Cases
    CriarContratadaUseCase,
    ListarContratadasUseCase,
    AtualizarContratadaUseCase,
    ExcluirContratadaUseCase,
    ObterContratadaUseCase,
    
    // Estoque Use Cases
    ConcluirNotaMovimentacaoUseCase,
    RealizarAjusteDirectoUseCase,
    
    // Fichas Use Cases
    CancelarDevolucaoUseCase,
    CancelarEntregaUseCase,
    CriarEntregaFichaUseCase,
    CriarFichaEpiUseCase,
    CriarTipoEpiUseCase,
    ProcessarDevolucaoUseCase,
    
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
  ],
  exports: [
    // Contratada Use Cases
    CriarContratadaUseCase,
    ListarContratadasUseCase,
    AtualizarContratadaUseCase,
    ExcluirContratadaUseCase,
    ObterContratadaUseCase,
    
    // Estoque Use Cases
    ConcluirNotaMovimentacaoUseCase,
    RealizarAjusteDirectoUseCase,
    
    // Fichas Use Cases
    CancelarDevolucaoUseCase,
    CancelarEntregaUseCase,
    CriarEntregaFichaUseCase,
    CriarFichaEpiUseCase,
    CriarTipoEpiUseCase,
    ProcessarDevolucaoUseCase,
    
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
  ],
})
export class ApplicationModule {}