import { Injectable } from '@nestjs/common';

export interface EntregaData {
  id: string;
  fichaEpiId: string;
  almoxarifadoId: string;
  responsavelId: string;
  dataEntrega: Date;
  status: string;
  linkAssinatura?: string;
  dataAssinatura?: Date;
  createdAt: Date;
  almoxarifado?: {
    nome: string;
    unidadeNegocio?: {
      nome: string;
    };
  };
  responsavel?: {
    nome: string;
  };
  entregaItens?: EntregaItemData[];
  fichaEpi?: {
    colaborador?: {
      nome: string;
      contratada?: {
        nome: string;
      };
    };
  };
}

export interface EntregaItemData {
  id: string;
  estoqueItemOrigemId: string;
  quantidadeEntregue: number;
  dataLimiteDevolucao?: Date;
  status: string;
  createdAt: Date;
  estoqueItemOrigem?: {
    tipoEpi?: {
      nomeEquipamento: string;
      numeroCa: string;
      categoria: string;
    };
  };
}

export interface EntregaOutput {
  id: string;
  fichaEpiId: string;
  colaboradorNome?: string;
  contratadaNome?: string;
  almoxarifadoNome?: string;
  unidadeNegocioNome?: string;
  responsavelNome?: string;
  dataEntrega: string;
  status: string;
  linkAssinatura?: string;
  dataAssinatura?: string;
  totalItens: number;
  itensAtivos: number;
  itensDevolvidos: number;
  itensVencidos: number;
  proximoVencimento?: string;
  itens: EntregaItemOutput[];
  createdAt: string;
}

export interface EntregaItemOutput {
  id: string;
  tipoEpiNome: string;
  numeroCa: string;
  categoria: string;
  quantidadeEntregue: number;
  dataLimiteDevolucao?: string;
  status: string;
  diasParaVencimento?: number;
  vencido: boolean;
  createdAt: string;
}

export interface PosseAtualOutput {
  colaboradorId: string;
  colaboradorNome: string;
  contratadaNome?: string;
  itensEmPosse: PosseItemOutput[];
  resumo: {
    totalItens: number;
    itensVencidos: number;
    itensProximoVencimento: number;
    proximoVencimento?: string;
  };
}

export interface PosseItemOutput {
  entregaId: string;
  entregaItemId: string;
  tipoEpiNome: string;
  numeroCa: string;
  categoria: string;
  dataEntrega: string;
  dataLimiteDevolucao?: string;
  diasParaVencimento?: number;
  vencido: boolean;
  almoxarifadoNome: string;
  responsavelEntregaNome: string;
}

@Injectable()
export class EntregaFormatterService {
  /**
   * Formata uma entrega individual para output
   */
  formatarEntregaOutput(entrega: EntregaData): EntregaOutput {
    const itens = entrega.entregaItens || [];
    const itensAtivos = itens.filter(item => item.status === 'COM_COLABORADOR');
    const itensDevolvidos = itens.filter(item => item.status === 'DEVOLVIDO');
    
    const hoje = new Date();
    const itensVencidos = itensAtivos.filter(item => 
      item.dataLimiteDevolucao && new Date(item.dataLimiteDevolucao) < hoje
    );

    // Encontrar próximo vencimento
    const datasVencimento = itensAtivos
      .map(item => item.dataLimiteDevolucao)
      .filter(data => data && new Date(data) >= hoje)
      .sort((a, b) => new Date(a!).getTime() - new Date(b!).getTime());

    const proximoVencimento = datasVencimento.length > 0 ? datasVencimento[0] : undefined;

    return {
      id: entrega.id,
      fichaEpiId: entrega.fichaEpiId,
      colaboradorNome: entrega.fichaEpi?.colaborador?.nome,
      contratadaNome: entrega.fichaEpi?.colaborador?.contratada?.nome,
      almoxarifadoNome: entrega.almoxarifado?.nome,
      unidadeNegocioNome: entrega.almoxarifado?.unidadeNegocio?.nome,
      responsavelNome: entrega.responsavel?.nome,
      dataEntrega: entrega.dataEntrega.toISOString(),
      status: entrega.status,
      linkAssinatura: entrega.linkAssinatura,
      dataAssinatura: entrega.dataAssinatura?.toISOString(),
      totalItens: itens.length,
      itensAtivos: itensAtivos.length,
      itensDevolvidos: itensDevolvidos.length,
      itensVencidos: itensVencidos.length,
      proximoVencimento: proximoVencimento?.toISOString(),
      itens: itens.map(item => this.formatarEntregaItemOutput(item)),
      createdAt: entrega.createdAt.toISOString(),
    };
  }

  /**
   * Formata um item de entrega individual
   */
  formatarEntregaItemOutput(item: EntregaItemData): EntregaItemOutput {
    const hoje = new Date();
    const dataVencimento = item.dataLimiteDevolucao ? new Date(item.dataLimiteDevolucao) : null;
    const diasParaVencimento = dataVencimento 
      ? Math.ceil((dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
      : undefined;
    const vencido = dataVencimento ? dataVencimento < hoje : false;

    return {
      id: item.id,
      tipoEpiNome: item.estoqueItemOrigem?.tipoEpi?.nomeEquipamento || 'N/A',
      numeroCa: item.estoqueItemOrigem?.tipoEpi?.numeroCa || 'N/A',
      categoria: item.estoqueItemOrigem?.tipoEpi?.categoria || 'OUTROS',
      quantidadeEntregue: item.quantidadeEntregue,
      dataLimiteDevolucao: item.dataLimiteDevolucao?.toISOString(),
      status: item.status,
      diasParaVencimento,
      vencido,
      createdAt: item.createdAt.toISOString(),
    };
  }

  /**
   * Formata lista de entregas
   */
  formatarListaEntregas(entregas: EntregaData[]) {
    const entregasFormatadas = entregas.map(entrega => this.formatarEntregaOutput(entrega));

    const resumo = {
      totalEntregas: entregas.length,
      entregasPendentes: entregas.filter(e => e.status === 'PENDENTE_ASSINATURA').length,
      entregasAssinadas: entregas.filter(e => e.status === 'ASSINADA').length,
      entregasCanceladas: entregas.filter(e => e.status === 'CANCELADA').length,
      totalItens: entregas.reduce((total, entrega) => total + (entrega.entregaItens?.length || 0), 0),
    };

    return {
      entregas: entregasFormatadas,
      resumo,
    };
  }

  /**
   * Formata dados de posse atual de um colaborador
   */
  formatarPosseAtual(
    colaboradorId: string,
    colaboradorNome: string,
    contratadaNome: string | undefined,
    entregas: EntregaData[]
  ): PosseAtualOutput {
    const itensEmPosse: PosseItemOutput[] = [];
    
    entregas.forEach(entrega => {
      if (entrega.status === 'ASSINADA' && entrega.entregaItens) {
        entrega.entregaItens
          .filter(item => item.status === 'COM_COLABORADOR')
          .forEach(item => {
            const hoje = new Date();
            const dataVencimento = item.dataLimiteDevolucao ? new Date(item.dataLimiteDevolucao) : null;
            const diasParaVencimento = dataVencimento 
              ? Math.ceil((dataVencimento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
              : undefined;
            const vencido = dataVencimento ? dataVencimento < hoje : false;

            itensEmPosse.push({
              entregaId: entrega.id,
              entregaItemId: item.id,
              tipoEpiNome: item.estoqueItemOrigem?.tipoEpi?.nomeEquipamento || 'N/A',
              numeroCa: item.estoqueItemOrigem?.tipoEpi?.numeroCa || 'N/A',
              categoria: item.estoqueItemOrigem?.tipoEpi?.categoria || 'OUTROS',
              dataEntrega: entrega.dataEntrega.toISOString(),
              dataLimiteDevolucao: item.dataLimiteDevolucao?.toISOString(),
              diasParaVencimento,
              vencido,
              almoxarifadoNome: entrega.almoxarifado?.nome || 'N/A',
              responsavelEntregaNome: entrega.responsavel?.nome || 'N/A',
            });
          });
      }
    });

    const hoje = new Date();
    const itensVencidos = itensEmPosse.filter(item => item.vencido).length;
    const itensProximoVencimento = itensEmPosse.filter(item => 
      item.diasParaVencimento !== undefined && item.diasParaVencimento <= 30 && item.diasParaVencimento > 0
    ).length;

    // Encontrar próximo vencimento
    const datasVencimento = itensEmPosse
      .map(item => item.dataLimiteDevolucao)
      .filter(data => data && new Date(data) >= hoje)
      .sort((a, b) => new Date(a!).getTime() - new Date(b!).getTime());

    const proximoVencimento = datasVencimento.length > 0 ? datasVencimento[0] : undefined;

    return {
      colaboradorId,
      colaboradorNome,
      contratadaNome,
      itensEmPosse,
      resumo: {
        totalItens: itensEmPosse.length,
        itensVencidos,
        itensProximoVencimento,
        proximoVencimento,
      },
    };
  }

  /**
   * Formata dados para validação de entrega
   */
  formatarValidacaoEntrega(validacao: {
    fichaExiste: boolean;
    fichaAtiva: boolean;
    itensDisponiveis: boolean;
    estoqueDetalhes: any[];
    motivosErro: string[];
  }) {
    return {
      podeEntregar: validacao.fichaExiste && validacao.fichaAtiva && validacao.itensDisponiveis,
      fichaExiste: validacao.fichaExiste,
      fichaAtiva: validacao.fichaAtiva,
      itensDisponiveis: validacao.itensDisponiveis,
      estoqueDetalhes: validacao.estoqueDetalhes,
      motivosErro: validacao.motivosErro,
      recomendacoes: this.gerarRecomendacoesValidacao(validacao),
    };
  }

  /**
   * Gera recomendações baseadas na validação
   */
  private gerarRecomendacoesValidacao(validacao: any): string[] {
    const recomendacoes = [];

    if (!validacao.fichaExiste) {
      recomendacoes.push('Crie uma ficha de EPI para o colaborador antes de realizar entregas');
    }

    if (!validacao.fichaAtiva) {
      recomendacoes.push('Ative a ficha do colaborador antes de realizar entregas');
    }

    if (!validacao.itensDisponiveis) {
      recomendacoes.push('Verifique a disponibilidade dos itens no estoque ou solicite reposição');
    }

    if (recomendacoes.length === 0) {
      recomendacoes.push('Entrega pode ser realizada normalmente');
    }

    return recomendacoes;
  }
}