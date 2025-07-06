import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  ChaveConfiguracao,
  ConfiguracaoOutput,
  CONFIGURACAO_METADATA,
  parseConfigurationValue,
  validateConfigurationValue,
  AtualizarConfiguracaoRequest,
  AtualizarConfiguracoesLoteRequest,
} from '../../../presentation/dto/schemas/configuracoes.schemas';
import { BusinessError, ValidationError } from '../../../domain/exceptions/business.exception';

export interface AtualizacaoResult {
  configuracao: ConfiguracaoOutput;
  valorAnterior: string;
}

export interface AtualizacaoLoteResult {
  configuracoes: ConfiguracaoOutput[];
  totalAtualizadas: number;
  falhas?: Array<{
    chave: string;
    erro: string;
  }>;
}

@Injectable()
export class AtualizarConfiguracoesUseCase {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  async atualizarConfiguracao(
    chave: ChaveConfiguracao,
    input: AtualizarConfiguracaoRequest,
  ): Promise<AtualizacaoResult> {
    try {
      // Validar se a chave é conhecida
      const metadata = CONFIGURACAO_METADATA[chave];
      if (!metadata) {
        throw new ValidationError(`Configuração '${chave}' não é válida`);
      }

      // Validar o valor conforme o tipo
      if (!validateConfigurationValue(chave, input.valor)) {
        throw new ValidationError(
          `Valor '${input.valor}' não é válido para configuração '${chave}'. ` +
          `Tipo esperado: ${metadata.tipo}`
        );
      }

      // Validar regras de negócio específicas
      await this.validarRegrasNegocio(chave, input.valor);

      // Buscar configuração atual
      const configuracaoAtual = await this.prisma.configuracao.findUnique({
        where: { chave },
      });

      let valorAnterior = metadata.valorPadrao;

      // Atualizar ou criar configuração
      let configuracao;
      if (configuracaoAtual) {
        valorAnterior = configuracaoAtual.valor;
        configuracao = await this.prisma.configuracao.update({
          where: { chave },
          data: {
            valor: input.valor,
            descricao: input.descricao ?? configuracaoAtual.descricao,
          },
        });
      } else {
        configuracao = await this.prisma.configuracao.create({
          data: {
            chave,
            valor: input.valor,
            descricao: input.descricao ?? metadata.descricaoPadrao,
          },
        });
      }

      const configuracaoOutput: ConfiguracaoOutput = {
        chave,
        valor: configuracao.valor,
        valorParsed: parseConfigurationValue(chave, configuracao.valor),
        tipo: metadata.tipo,
        descricao: configuracao.descricao,
        createdAt: configuracao.createdAt,
        updatedAt: undefined,
      };

      return {
        configuracao: configuracaoOutput,
        valorAnterior,
      };
    } catch (error) {
      if (error instanceof BusinessError || error instanceof ValidationError) {
        throw error;
      }
      throw new BusinessError(`Erro interno ao atualizar configuração '${chave}'`);
    }
  }

  async atualizarConfiguracoesBolean(
    chave: ChaveConfiguracao,
    ativo: boolean,
    descricao?: string,
  ): Promise<AtualizacaoResult> {
    // Verificar se é uma configuração booleana
    const metadata = CONFIGURACAO_METADATA[chave];
    if (metadata.tipo !== 'BOOLEAN') {
      throw new ValidationError(`Configuração '${chave}' não é do tipo booleano`);
    }

    return this.atualizarConfiguracao(chave, {
      valor: String(ativo),
      descricao,
    });
  }

  async atualizarConfiguracaoNumerica(
    chave: ChaveConfiguracao,
    valor: number,
    descricao?: string,
  ): Promise<AtualizacaoResult> {
    // Verificar se é uma configuração numérica
    const metadata = CONFIGURACAO_METADATA[chave];
    if (metadata.tipo !== 'NUMBER') {
      throw new ValidationError(`Configuração '${chave}' não é do tipo numérico`);
    }

    return this.atualizarConfiguracao(chave, {
      valor: String(valor),
      descricao,
    });
  }

  async atualizarConfiguracoesLote(
    input: AtualizarConfiguracoesLoteRequest,
  ): Promise<AtualizacaoLoteResult> {
    const configuracoes: ConfiguracaoOutput[] = [];
    const falhas: Array<{ chave: string; erro: string }> = [];
    let totalAtualizadas = 0;

    // Processar cada configuração
    for (const configInput of input.configuracoes) {
      try {
        const resultado = await this.atualizarConfiguracao(
          configInput.chave,
          {
            valor: configInput.valor,
            descricao: configInput.descricao,
          }
        );
        configuracoes.push(resultado.configuracao);
        totalAtualizadas++;
      } catch (error) {
        falhas.push({
          chave: configInput.chave,
          erro: error instanceof Error ? error.message : 'Erro desconhecido',
        });
      }
    }

    return {
      configuracoes,
      totalAtualizadas,
      falhas: falhas.length > 0 ? falhas : undefined,
    };
  }

  async resetarConfiguracoesPadrao(): Promise<ConfiguracaoOutput[]> {
    try {
      const configuracoes: ConfiguracaoOutput[] = [];

      // Resetar cada configuração conhecida para valor padrão
      for (const [chave, metadata] of Object.entries(CONFIGURACAO_METADATA)) {
        const chaveTyped = chave as ChaveConfiguracao;
        
        const configuracao = await this.prisma.configuracao.upsert({
          where: { chave },
          update: {
            valor: metadata.valorPadrao,
            descricao: metadata.descricaoPadrao,
          },
          create: {
            chave,
            valor: metadata.valorPadrao,
            descricao: metadata.descricaoPadrao,
          },
        });

        configuracoes.push({
          chave: chaveTyped,
          valor: configuracao.valor,
          valorParsed: parseConfigurationValue(chaveTyped, configuracao.valor),
          tipo: metadata.tipo,
          descricao: configuracao.descricao,
          createdAt: configuracao.createdAt,
          updatedAt: undefined,
        });
      }

      return configuracoes;
    } catch (error) {
      throw new BusinessError('Erro interno ao resetar configurações');
    }
  }

  private async validarRegrasNegocio(
    chave: ChaveConfiguracao,
    valor: string,
  ): Promise<void> {
    // Validações específicas de regras de negócio
    switch (chave) {
      case 'PERMITIR_ESTOQUE_NEGATIVO':
        // Se estiver desabilitando estoque negativo, verificar se há estoques negativos
        if (valor === 'false') {
          const estoqueNegativo = await this.prisma.estoqueItem.count({
            where: { quantidade: { lt: 0 } },
          });
          
          if (estoqueNegativo > 0) {
            throw new ValidationError(
              'Não é possível desabilitar estoque negativo: existem itens com saldo negativo no sistema'
            );
          }
        }
        break;

      case 'PERMITIR_AJUSTES_FORCADOS':
        // Sem validações específicas por enquanto
        break;

      case 'ESTOQUE_MINIMO_EQUIPAMENTO':
        const valorNumerico = parseInt(valor, 10);
        if (isNaN(valorNumerico) || valorNumerico < 0) {
          throw new ValidationError('Estoque mínimo deve ser um número positivo ou zero');
        }
        if (valorNumerico > 999999) {
          throw new ValidationError('Estoque mínimo não pode exceder 999.999 unidades');
        }
        break;
    }
  }
}