import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import { IMovimentacaoRepository } from '../../../domain/interfaces/repositories/movimentacao-repository.interface';
import { IEstoqueRepository } from '../../../domain/interfaces/repositories/estoque-repository.interface';
import { ConfiguracaoService } from '../../../domain/services/configuracao.service';
import { StatusEstoqueItem, TipoMovimentacao } from '../../../domain/enums';
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
    private readonly configuracaoService: ConfiguracaoService,
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
    return await this.prisma.$transaction(async (_tx) => {
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

      // Buscar ou criar estoque item
      const estoqueItem = await this.estoqueRepository.criarOuAtualizar(
        input.almoxarifadoId,
        input.tipoEpiId,
        StatusEstoqueItem.DISPONIVEL,
        saldoAnterior,
      );

      // Determinar tipo de ajuste
      const tipoMovimentacao = diferenca >= 0 
        ? TipoMovimentacao.AJUSTE_POSITIVO 
        : TipoMovimentacao.AJUSTE_NEGATIVO;

      // Criar movimentação de ajuste usando Prisma direto
      const movimentacaoCriada = await this.prisma.movimentacaoEstoque.create({
        data: {
          estoqueItemId: estoqueItem.id,
          tipoMovimentacao,
          quantidadeMovida: Math.abs(diferenca),
          notaMovimentacaoId: null,
          responsavelId: input.usuarioId,
          movimentacaoOrigemId: null,
        },
      });

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
    return await this.prisma.$transaction(async (_tx) => {
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

            // Buscar ou criar estoque item
            const estoqueItem = await this.estoqueRepository.criarOuAtualizar(
              input.almoxarifadoId,
              ajuste.tipoEpiId,
              StatusEstoqueItem.DISPONIVEL,
              saldoAnterior,
            );

            // Determinar tipo de ajuste
            const tipoMovimentacao = diferenca >= 0 
              ? TipoMovimentacao.AJUSTE_POSITIVO 
              : TipoMovimentacao.AJUSTE_NEGATIVO;

            // Criar movimentação usando Prisma direto
            const movimentacaoCriada = await this.prisma.movimentacaoEstoque.create({
              data: {
                estoqueItemId: estoqueItem.id,
                tipoMovimentacao,
                quantidadeMovida: Math.abs(diferenca),
                notaMovimentacaoId: null,
                responsavelId: input.usuarioId,
                movimentacaoOrigemId: null,
              },
            });

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
    // Buscar movimentações de ajuste usando Prisma direto
    const whereClause: any = {
      OR: [
        { tipoMovimentacao: TipoMovimentacao.AJUSTE_POSITIVO },
        { tipoMovimentacao: TipoMovimentacao.AJUSTE_NEGATIVO },
      ],
    };

    if (dataInicio || dataFim) {
      whereClause.createdAt = {};
      if (dataInicio) whereClause.createdAt.gte = dataInicio;
      if (dataFim) whereClause.createdAt.lte = dataFim;
    }

    if (almoxarifadoId || tipoEpiId) {
      whereClause.estoqueItem = {};
      if (almoxarifadoId) whereClause.estoqueItem.almoxarifadoId = almoxarifadoId;
      if (tipoEpiId) whereClause.estoqueItem.tipoEpiId = tipoEpiId;
    }

    const movimentacoes = await this.prisma.movimentacaoEstoque.findMany({
      where: whereClause,
      include: {
        estoqueItem: {
          include: {
            almoxarifado: true,
            tipoEpi: true,
          },
        },
        responsavel: true,
      },
      orderBy: { dataMovimentacao: 'desc' },
    });

    const ajustes = movimentacoes.map(mov => {
      // Calcular diferença baseado no tipo (positivo ou negativo)
      const diferenca = mov.tipoMovimentacao === TipoMovimentacao.AJUSTE_POSITIVO 
        ? mov.quantidadeMovida 
        : -mov.quantidadeMovida;
      
      return {
        id: mov.id,
        data: mov.dataMovimentacao,
        almoxarifadoId: mov.estoqueItem?.almoxarifado?.id || '',
        tipoEpiId: mov.estoqueItem?.tipoEpi?.id || '',
        quantidade: mov.quantidadeMovida,
        saldoAnterior: 0, // Não disponível no novo schema
        saldoPosterior: 0, // Não disponível no novo schema 
        diferenca,
        usuarioId: mov.responsavelId,
        observacoes: `Ajuste ${mov.tipoMovimentacao}`,
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
    if (!usuarioId) {
      throw new BusinessError('Usuário é obrigatório para realizar ajustes');
    }

    // Verificar se ajustes forçados estão habilitados no sistema
    const ajustesForcadosHabilitados = await this.configuracaoService.permitirAjustesForcados();
    
    if (!ajustesForcadosHabilitados) {
      throw new BusinessError('Ajustes diretos de inventário estão desabilitados no sistema');
    }
  }
}