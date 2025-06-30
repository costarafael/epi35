import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { IMovimentacaoRepository } from '../../../domain/interfaces/repositories/movimentacao-repository.interface';
import { IEstoqueRepository } from '../../../domain/interfaces/repositories/estoque-repository.interface';
import { MovimentacaoEstoque } from '../../../domain/entities/movimentacao-estoque.entity';
import { StatusEstoqueItem } from '../../../domain/enums';
import { BusinessError } from '../../../domain/exceptions/business.exception';

export interface AjusteDirectoInput {
  almoxarifadoId: string;
  tipoEpiId: string;
  novaQuantidade: number;
  usuarioId: string;
  motivo: string;
  validarPermissao?: boolean;
}

export interface AjusteInventarioInput {
  almoxarifadoId: string;
  ajustes: {
    tipoEpiId: string;
    quantidadeContada: number;
    motivo?: string;
  }[];
  usuarioId: string;
  observacoes?: string;
}

export interface ResultadoAjuste {
  movimentacaoId: string;
  tipoEpiId: string;
  saldoAnterior: number;
  saldoPosterior: number;
  diferenca: number;
  observacoes: string;
}

export interface ResultadoInventario {
  ajustesRealizados: ResultadoAjuste[];
  totalItensProcessados: number;
  totalAjustesPositivos: number;
  totalAjustesNegativos: number;
  valorTotalAjustes: number;
}

@Injectable()
export class RealizarAjusteDirectoUseCase {
  constructor(
    @Inject('IMovimentacaoRepository')
    private readonly movimentacaoRepository: IMovimentacaoRepository,
    @Inject('IEstoqueRepository')
    private readonly estoqueRepository: IEstoqueRepository,
    private readonly prisma: PrismaService,
  ) {}

  async executarAjusteDirecto(input: AjusteDirectoInput): Promise<ResultadoAjuste> {
    // Validar permissões se necessário
    if (input.validarPermissao !== false) {
      await this.validarPermissaoAjuste(input.usuarioId);
    }

    // Validar dados de entrada
    if (input.novaQuantidade < 0) {
      throw new BusinessError('Quantidade não pode ser negativa');
    }

    if (!input.motivo || input.motivo.trim().length === 0) {
      throw new BusinessError('Motivo do ajuste é obrigatório');
    }

    // Executar dentro de transação
    return await this.prisma.$transaction(async (tx) => {
      // Obter saldo atual
      const saldoAnterior = await this.movimentacaoRepository.obterUltimaSaldo(
        input.almoxarifadoId,
        input.tipoEpiId,
      );

      // Calcular diferença
      const diferenca = input.novaQuantidade - saldoAnterior;

      if (diferenca === 0) {
        throw new BusinessError('Nova quantidade é igual ao saldo atual. Nenhum ajuste necessário.');
      }

      // Criar movimentação de ajuste
      const movimentacao = MovimentacaoEstoque.createAjuste(
        input.almoxarifadoId,
        input.tipoEpiId,
        Math.abs(diferenca),
        saldoAnterior,
        input.usuarioId,
        `Ajuste direto: ${input.motivo}`,
      );

      const movimentacaoCriada = await this.movimentacaoRepository.create(movimentacao);

      // Atualizar estoque
      await this.estoqueRepository.criarOuAtualizar(
        input.almoxarifadoId,
        input.tipoEpiId,
        StatusEstoqueItem.DISPONIVEL,
        input.novaQuantidade,
      );

      return {
        movimentacaoId: movimentacaoCriada.id,
        tipoEpiId: input.tipoEpiId,
        saldoAnterior,
        saldoPosterior: input.novaQuantidade,
        diferenca,
        observacoes: `Ajuste direto: ${input.motivo}`,
      };
    });
  }

  async executarInventario(input: AjusteInventarioInput): Promise<ResultadoInventario> {
    // Validar entrada
    if (!input.ajustes || input.ajustes.length === 0) {
      throw new BusinessError('Lista de ajustes não pode estar vazia');
    }

    // Validar permissões
    await this.validarPermissaoAjuste(input.usuarioId);

    // Executar todos os ajustes em uma única transação
    return await this.prisma.$transaction(async (tx) => {
      const ajustesRealizados: ResultadoAjuste[] = [];
      let totalAjustesPositivos = 0;
      let totalAjustesNegativos = 0;
      let valorTotalAjustes = 0;

      for (const ajuste of input.ajustes) {
        try {
          // Obter saldo atual
          const saldoAnterior = await this.movimentacaoRepository.obterUltimaSaldo(
            input.almoxarifadoId,
            ajuste.tipoEpiId,
          );

          // Calcular diferença
          const diferenca = ajuste.quantidadeContada - saldoAnterior;

          // Só processar se houver diferença
          if (diferenca !== 0) {
            const motivo = ajuste.motivo || 
              `Inventário: contagem ${ajuste.quantidadeContada}, saldo sistema ${saldoAnterior}`;

            // Criar movimentação
            const movimentacao = MovimentacaoEstoque.createAjuste(
              input.almoxarifadoId,
              ajuste.tipoEpiId,
              Math.abs(diferenca),
              saldoAnterior,
              input.usuarioId,
              motivo,
            );

            const movimentacaoCriada = await this.movimentacaoRepository.create(movimentacao);

            // Atualizar estoque
            await this.estoqueRepository.criarOuAtualizar(
              input.almoxarifadoId,
              ajuste.tipoEpiId,
              StatusEstoqueItem.DISPONIVEL,
              ajuste.quantidadeContada,
            );

            // Contabilizar estatísticas
            if (diferenca > 0) {
              totalAjustesPositivos++;
            } else {
              totalAjustesNegativos++;
            }
            valorTotalAjustes += Math.abs(diferenca);

            ajustesRealizados.push({
              movimentacaoId: movimentacaoCriada.id,
              tipoEpiId: ajuste.tipoEpiId,
              saldoAnterior,
              saldoPosterior: ajuste.quantidadeContada,
              diferenca,
              observacoes: motivo,
            });
          }
        } catch (error) {
          throw new BusinessError(
            `Erro ao processar ajuste para item ${ajuste.tipoEpiId}: ${error.message}`,
          );
        }
      }

      return {
        ajustesRealizados,
        totalItensProcessados: input.ajustes.length,
        totalAjustesPositivos,
        totalAjustesNegativos,
        valorTotalAjustes,
      };
    });
  }

  async simularAjuste(
    almoxarifadoId: string,
    tipoEpiId: string,
    novaQuantidade: number,
  ): Promise<{
    saldoAtual: number;
    novaQuantidade: number;
    diferenca: number;
    tipoAjuste: 'positivo' | 'negativo' | 'neutro';
    impactoFinanceiro?: number;
  }> {
    const saldoAtual = await this.movimentacaoRepository.obterUltimaSaldo(
      almoxarifadoId,
      tipoEpiId,
    );

    const diferenca = novaQuantidade - saldoAtual;
    
    let tipoAjuste: 'positivo' | 'negativo' | 'neutro';
    if (diferenca > 0) {
      tipoAjuste = 'positivo';
    } else if (diferenca < 0) {
      tipoAjuste = 'negativo';
    } else {
      tipoAjuste = 'neutro';
    }

    return {
      saldoAtual,
      novaQuantidade,
      diferenca,
      tipoAjuste,
      impactoFinanceiro: Math.abs(diferenca), // Pode ser calculado com custo médio
    };
  }

  async obterHistoricoAjustes(
    almoxarifadoId?: string,
    tipoEpiId?: string,
    dataInicio?: Date,
    dataFim?: Date,
  ): Promise<{
    ajustes: {
      id: string;
      data: Date;
      almoxarifadoId: string;
      tipoEpiId: string;
      quantidade: number;
      saldoAnterior: number;
      saldoPosterior: number;
      diferenca: number;
      usuarioId: string;
      observacoes: string;
    }[];
    resumo: {
      totalAjustes: number;
      ajustesPositivos: number;
      ajustesNegativos: number;
      somaAjustesPositivos: number;
      somaAjustesNegativos: number;
    };
  }> {
    const filtros: any = {
      tipoMovimentacao: 'AJUSTE',
    };

    if (almoxarifadoId) {
      filtros.almoxarifadoId = almoxarifadoId;
    }

    if (tipoEpiId) {
      filtros.tipoEpiId = tipoEpiId;
    }

    if (dataInicio || dataFim) {
      filtros.dataInicio = dataInicio;
      filtros.dataFim = dataFim;
    }

    const movimentacoes = await this.movimentacaoRepository.findByFilters(filtros);

    const ajustes = movimentacoes.map(mov => {
      const diferenca = mov.saldoPosterior - mov.saldoAnterior;
      return {
        id: mov.id,
        data: mov.createdAt,
        almoxarifadoId: mov.almoxarifadoId,
        tipoEpiId: mov.tipoEpiId,
        quantidade: mov.quantidade,
        saldoAnterior: mov.saldoAnterior,
        saldoPosterior: mov.saldoPosterior,
        diferenca,
        usuarioId: mov.usuarioId,
        observacoes: mov.observacoes || '',
      };
    });

    // Calcular resumo
    const resumo = {
      totalAjustes: ajustes.length,
      ajustesPositivos: ajustes.filter(a => a.diferenca > 0).length,
      ajustesNegativos: ajustes.filter(a => a.diferenca < 0).length,
      somaAjustesPositivos: ajustes
        .filter(a => a.diferenca > 0)
        .reduce((sum, a) => sum + a.diferenca, 0),
      somaAjustesNegativos: ajustes
        .filter(a => a.diferenca < 0)
        .reduce((sum, a) => sum + Math.abs(a.diferenca), 0),
    };

    return { ajustes, resumo };
  }

  async validarDivergenciasInventario(
    almoxarifadoId: string,
    contagensInventario: { tipoEpiId: string; quantidadeContada: number }[],
  ): Promise<{
    divergencias: {
      tipoEpiId: string;
      saldoSistema: number;
      quantidadeContada: number;
      diferenca: number;
      percentualDivergencia: number;
    }[];
    resumo: {
      totalItens: number;
      itensSemDivergencia: number;
      itensComDivergencia: number;
      maiorDivergencia: number;
      menorDivergencia: number;
    };
  }> {
    const divergencias = [];
    let maiorDivergencia = 0;
    let menorDivergencia = 0;

    for (const contagem of contagensInventario) {
      const saldoSistema = await this.movimentacaoRepository.obterUltimaSaldo(
        almoxarifadoId,
        contagem.tipoEpiId,
      );

      const diferenca = contagem.quantidadeContada - saldoSistema;
      const percentualDivergencia = saldoSistema > 0 
        ? (diferenca / saldoSistema) * 100 
        : (contagem.quantidadeContada > 0 ? 100 : 0);

      if (diferenca !== 0) {
        divergencias.push({
          tipoEpiId: contagem.tipoEpiId,
          saldoSistema,
          quantidadeContada: contagem.quantidadeContada,
          diferenca,
          percentualDivergencia,
        });

        maiorDivergencia = Math.max(maiorDivergencia, Math.abs(diferenca));
        if (menorDivergencia === 0) {
          menorDivergencia = Math.abs(diferenca);
        } else {
          menorDivergencia = Math.min(menorDivergencia, Math.abs(diferenca));
        }
      }
    }

    const resumo = {
      totalItens: contagensInventario.length,
      itensSemDivergencia: contagensInventario.length - divergencias.length,
      itensComDivergencia: divergencias.length,
      maiorDivergencia,
      menorDivergencia,
    };

    return { divergencias, resumo };
  }

  private async validarPermissaoAjuste(usuarioId: string): Promise<void> {
    // Aqui você pode implementar validação de permissões
    // Por exemplo, verificar se o usuário tem papel de "AJUSTADOR_INVENTARIO"
    // ou consultar uma tabela de configurações para ver se ajustes estão habilitados
    
    // Por enquanto, vamos apenas simular a validação
    // Em uma implementação real, isso seria conectado ao sistema de autenticação/autorização
    
    if (!usuarioId) {
      throw new BusinessError('Usuário é obrigatório para realizar ajustes');
    }

    // Simulação: verificar se ajustes forçados estão habilitados no sistema
    // Isso seria buscado da tabela de configurações
    const ajustesForcadosHabilitados = true; // await configService.get('PERMITIR_AJUSTES_FORCADOS')
    
    if (!ajustesForcadosHabilitados) {
      throw new BusinessError('Ajustes diretos de inventário estão desabilitados no sistema');
    }
  }
}