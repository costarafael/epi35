import { Injectable } from '@nestjs/common';

export interface DevolucaoData {
  entregaItemIds: string[];
  movimentacoes: MovimentacaoData[];
  itensProcessados: ItemProcessadoData[];
}

export interface MovimentacaoData {
  id: string;
  estoqueItemId: string;
  tipoMovimentacao: string;
  quantidadeMovida: number;
  responsavelId: string;
  entregaId: string;
  dataMovimentacao: Date;
  estoqueItem?: {
    tipoEpi?: {
      nomeEquipamento: string;
      numeroCa: string;
    };
    almoxarifado?: {
      nome: string;
    };
  };
  responsavel?: {
    nome: string;
  };
}

export interface ItemProcessadoData {
  entregaItemId: string;
  tipoEpiNome: string;
  numeroCa: string;
  statusAnterior: string;
  statusAtual: string;
  dataEntrega: Date;
  dataDevolucao: Date;
  diasEmPosse: number;
}

export interface DevolucaoOutput {
  resumo: {
    totalItensDevolvidos: number;
    totalMovimentacoes: number;
    statusOperacao: 'SUCESSO' | 'PARCIAL' | 'ERRO';
    dataProcessamento: string;
  };
  itensProcessados: ItemDevolvidoOutput[];
  movimentacoesGeradas: MovimentacaoDevolucaoOutput[];
  alertas?: string[];
}

export interface ItemDevolvidoOutput {
  entregaItemId: string;
  tipoEpiNome: string;
  numeroCa: string;
  statusAnterior: string;
  statusAtual: string;
  dataEntrega: string;
  dataDevolucao: string;
  diasEmPosse: number;
  situacao: 'DEVOLVIDO_NO_PRAZO' | 'DEVOLVIDO_EM_ATRASO' | 'PROCESSAMENTO_ERRO';
}

export interface MovimentacaoDevolucaoOutput {
  id: string;
  tipoEpiNome: string;
  almoxarifadoNome: string;
  quantidadeMovida: number;
  responsavelNome: string;
  tipoMovimentacao: string;
  dataMovimentacao: string;
  situacaoEstoque: 'AGUARDANDO_INSPECAO' | 'DISPONIVEL' | 'QUARENTENA';
}

export interface HistoricoDevolucaoOutput {
  colaboradorId: string;
  colaboradorNome: string;
  devolucoes: HistoricoItemOutput[];
  estatisticas: {
    totalDevolucoes: number;
    devolucoesNoPrazo: number;
    devolucoesAtrasadas: number;
    percentualPontualidade: number;
    tempoMedioPosseHoras: number;
  };
}

export interface HistoricoItemOutput {
  entregaId: string;
  entregaItemId: string;
  tipoEpiNome: string;
  numeroCa: string;
  dataEntrega: string;
  dataDevolucao: string;
  diasEmPosse: number;
  situacao: string;
  responsavelEntrega: string;
  responsavelDevolucao: string;
  almoxarifado: string;
  observacoes?: string;
}

export interface CancelamentoDevolucaoOutput {
  resumo: {
    itensRestaurados: number;
    movimentacoesEstornadas: number;
    statusOperacao: 'SUCESSO' | 'PARCIAL' | 'ERRO';
    dataCancelamento: string;
  };
  itensRestaurados: ItemRestauradoOutput[];
  movimentacoesEstornadas: MovimentacaoEstornoOutput[];
  alertas?: string[];
}

export interface ItemRestauradoOutput {
  entregaItemId: string;
  tipoEpiNome: string;
  statusAnterior: string;
  statusAtual: string;
  motivoCancelamento: string;
}

export interface MovimentacaoEstornoOutput {
  movimentacaoOriginalId: string;
  movimentacaoEstornoId: string;
  tipoMovimentacao: string;
  quantidadeEstornada: number;
  dataEstorno: string;
}

@Injectable()
export class DevolucaoFormatterService {
  /**
   * Formata resultado de processamento de devolução
   */
  formatarDevolucaoOutput(dados: DevolucaoData): DevolucaoOutput {
    const totalItensDevolvidos = dados.entregaItemIds.length;
    const totalMovimentacoes = dados.movimentacoes.length;
    const statusOperacao = this.determinarStatusOperacao(dados);

    const itensProcessados = dados.itensProcessados.map(item => 
      this.formatarItemDevolvido(item)
    );

    const movimentacoesGeradas = dados.movimentacoes.map(mov => 
      this.formatarMovimentacaoDevolucao(mov)
    );

    const alertas = this.gerarAlertasDevolucao(dados);

    return {
      resumo: {
        totalItensDevolvidos,
        totalMovimentacoes,
        statusOperacao,
        dataProcessamento: new Date().toISOString(),
      },
      itensProcessados,
      movimentacoesGeradas,
      alertas: alertas.length > 0 ? alertas : undefined,
    };
  }

  /**
   * Formata item devolvido individual
   */
  formatarItemDevolvido(item: ItemProcessadoData): ItemDevolvidoOutput {
    const hoje = new Date();
    const situacao = this.determinarSituacaoItem(item, hoje);

    return {
      entregaItemId: item.entregaItemId,
      tipoEpiNome: item.tipoEpiNome,
      numeroCa: item.numeroCa,
      statusAnterior: item.statusAnterior,
      statusAtual: item.statusAtual,
      dataEntrega: item.dataEntrega.toISOString(),
      dataDevolucao: item.dataDevolucao.toISOString(),
      diasEmPosse: item.diasEmPosse,
      situacao,
    };
  }

  /**
   * Formata movimentação de devolução
   */
  formatarMovimentacaoDevolucao(movimentacao: MovimentacaoData): MovimentacaoDevolucaoOutput {
    return {
      id: movimentacao.id,
      tipoEpiNome: movimentacao.estoqueItem?.tipoEpi?.nomeEquipamento || 'N/A',
      almoxarifadoNome: movimentacao.estoqueItem?.almoxarifado?.nome || 'N/A',
      quantidadeMovida: movimentacao.quantidadeMovida,
      responsavelNome: movimentacao.responsavel?.nome || 'N/A',
      tipoMovimentacao: movimentacao.tipoMovimentacao,
      dataMovimentacao: movimentacao.dataMovimentacao.toISOString(),
      situacaoEstoque: 'AGUARDANDO_INSPECAO', // Padrão para devoluções
    };
  }

  /**
   * Formata histórico de devoluções de um colaborador
   */
  formatarHistoricoDevolucoes(
    colaboradorId: string,
    colaboradorNome: string,
    historico: HistoricoItemOutput[]
  ): HistoricoDevolucaoOutput {
    const totalDevolucoes = historico.length;
    const devolucoesNoPrazo = historico.filter(item => 
      item.situacao === 'DEVOLVIDO_NO_PRAZO'
    ).length;
    const devolucoesAtrasadas = historico.filter(item => 
      item.situacao === 'DEVOLVIDO_EM_ATRASO'
    ).length;

    const percentualPontualidade = totalDevolucoes > 0 
      ? Math.round((devolucoesNoPrazo / totalDevolucoes) * 100)
      : 0;

    const tempoMedioPosseHoras = totalDevolucoes > 0
      ? Math.round(
          historico.reduce((total, item) => total + (item.diasEmPosse * 24), 0) / totalDevolucoes
        )
      : 0;

    return {
      colaboradorId,
      colaboradorNome,
      devolucoes: historico,
      estatisticas: {
        totalDevolucoes,
        devolucoesNoPrazo,
        devolucoesAtrasadas,
        percentualPontualidade,
        tempoMedioPosseHoras,
      },
    };
  }

  /**
   * Formata resultado de cancelamento de devolução
   */
  formatarCancelamentoDevolucao(dados: {
    itensRestaurados: ItemRestauradoOutput[];
    movimentacoesEstornadas: MovimentacaoEstornoOutput[];
    motivoCancelamento: string;
  }): CancelamentoDevolucaoOutput {
    const itensRestaurados = dados.itensRestaurados.length;
    const movimentacoesEstornadas = dados.movimentacoesEstornadas.length;
    const statusOperacao = itensRestaurados > 0 && movimentacoesEstornadas > 0 
      ? 'SUCESSO' : 'ERRO';

    const alertas = this.gerarAlertasCancelamento(dados);

    return {
      resumo: {
        itensRestaurados,
        movimentacoesEstornadas,
        statusOperacao,
        dataCancelamento: new Date().toISOString(),
      },
      itensRestaurados: dados.itensRestaurados,
      movimentacoesEstornadas: dados.movimentacoesEstornadas,
      alertas: alertas.length > 0 ? alertas : undefined,
    };
  }

  /**
   * Formata dados para validação de devolução
   */
  formatarValidacaoDevolucao(validacao: {
    itensValidos: boolean;
    entregaAssinada: boolean;
    itensJaDevolvidos: string[];
    motivosErro: string[];
  }) {
    return {
      podeDevolver: validacao.itensValidos && validacao.entregaAssinada && validacao.itensJaDevolvidos.length === 0,
      itensValidos: validacao.itensValidos,
      entregaAssinada: validacao.entregaAssinada,
      itensJaDevolvidos: validacao.itensJaDevolvidos,
      motivosErro: validacao.motivosErro,
      recomendacoes: this.gerarRecomendacoesValidacao(validacao),
    };
  }

  /**
   * Determina status da operação baseado nos dados
   */
  private determinarStatusOperacao(dados: DevolucaoData): 'SUCESSO' | 'PARCIAL' | 'ERRO' {
    const itensComSucesso = dados.itensProcessados.filter(item => 
      item.statusAtual === 'DEVOLVIDO'
    ).length;

    if (itensComSucesso === dados.entregaItemIds.length) {
      return 'SUCESSO';
    } else if (itensComSucesso > 0) {
      return 'PARCIAL';
    } else {
      return 'ERRO';
    }
  }

  /**
   * Determina situação do item devolvido
   */
  private determinarSituacaoItem(item: ItemProcessadoData, hoje: Date): 'DEVOLVIDO_NO_PRAZO' | 'DEVOLVIDO_EM_ATRASO' | 'PROCESSAMENTO_ERRO' {
    if (item.statusAtual !== 'DEVOLVIDO') {
      return 'PROCESSAMENTO_ERRO';
    }

    // Se não há data limite, considera no prazo
    if (item.diasEmPosse <= 30) { // Assumindo 30 dias como prazo padrão
      return 'DEVOLVIDO_NO_PRAZO';
    } else {
      return 'DEVOLVIDO_EM_ATRASO';
    }
  }

  /**
   * Gera alertas para devolução
   */
  private gerarAlertasDevolucao(dados: DevolucaoData): string[] {
    const alertas = [];

    const itensComErro = dados.itensProcessados.filter(item => 
      item.statusAtual !== 'DEVOLVIDO'
    );

    if (itensComErro.length > 0) {
      alertas.push(`${itensComErro.length} itens não foram processados corretamente`);
    }

    const itensAtrasados = dados.itensProcessados.filter(item => 
      item.diasEmPosse > 30
    );

    if (itensAtrasados.length > 0) {
      alertas.push(`${itensAtrasados.length} itens foram devolvidos em atraso`);
    }

    return alertas;
  }

  /**
   * Gera alertas para cancelamento
   */
  private gerarAlertasCancelamento(dados: any): string[] {
    const alertas = [];

    if (dados.itensRestaurados.length === 0) {
      alertas.push('Nenhum item foi restaurado no cancelamento');
    }

    if (dados.movimentacoesEstornadas.length === 0) {
      alertas.push('Nenhuma movimentação foi estornada');
    }

    return alertas;
  }

  /**
   * Gera recomendações para validação
   */
  private gerarRecomendacoesValidacao(validacao: any): string[] {
    const recomendacoes = [];

    if (!validacao.entregaAssinada) {
      recomendacoes.push('Solicite a assinatura da entrega antes de processar devoluções');
    }

    if (!validacao.itensValidos) {
      recomendacoes.push('Verifique se os IDs dos itens estão corretos e se pertencem à entrega');
    }

    if (validacao.itensJaDevolvidos.length > 0) {
      recomendacoes.push('Remova os itens já devolvidos da lista');
    }

    if (recomendacoes.length === 0) {
      recomendacoes.push('Devolução pode ser processada normalmente');
    }

    return recomendacoes;
  }
}