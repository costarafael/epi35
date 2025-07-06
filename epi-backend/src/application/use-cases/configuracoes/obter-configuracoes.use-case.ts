import { Injectable } from '@nestjs/common';
import { ConfiguracaoService } from '../../../domain/services/configuracao.service';
import { PrismaService } from '../../../infrastructure/database/prisma.service';
import {
  ChaveConfiguracao,
  ConfiguracaoOutput,
  CONFIGURACAO_METADATA,
  parseConfigurationValue,
} from '../../../presentation/dto/schemas/configuracoes.schemas';
import { BusinessError, NotFoundError } from '../../../domain/exceptions/business.exception';

@Injectable()
export class ObterConfiguracoesUseCase {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configuracaoService: ConfiguracaoService,
  ) {}

  async listarTodasConfiguracoes(): Promise<ConfiguracaoOutput[]> {
    try {
      // Buscar todas as configurações do banco
      const configuracoesBanco = await this.prisma.configuracao.findMany({
        orderBy: { chave: 'asc' },
      });

      // Criar mapa das configurações existentes
      const configMap = new Map<string, any>();
      configuracoesBanco.forEach(config => {
        configMap.set(config.chave, config);
      });

      // Garantir que todas as configurações conhecidas existam
      const configuracoes: ConfiguracaoOutput[] = [];

      for (const [chave, metadata] of Object.entries(CONFIGURACAO_METADATA)) {
        const chaveTyped = chave as ChaveConfiguracao;
        let configuracao = configMap.get(chave);

        if (!configuracao) {
          // Criar configuração padrão se não existir
          configuracao = await this.prisma.configuracao.create({
            data: {
              chave,
              valor: metadata.valorPadrao,
              descricao: metadata.descricaoPadrao,
            },
          });
        }

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
      throw new BusinessError('Erro interno ao listar configurações');
    }
  }

  async obterConfiguracao(chave: ChaveConfiguracao): Promise<ConfiguracaoOutput> {
    try {
      // Buscar configuração no banco
      let configuracao = await this.prisma.configuracao.findUnique({
        where: { chave },
      });

      const metadata = CONFIGURACAO_METADATA[chave];

      if (!configuracao) {
        // Criar configuração padrão se não existir
        configuracao = await this.prisma.configuracao.create({
          data: {
            chave,
            valor: metadata.valorPadrao,
            descricao: metadata.descricaoPadrao,
          },
        });
      }

      return {
        chave,
        valor: configuracao.valor,
        valorParsed: parseConfigurationValue(chave, configuracao.valor),
        tipo: metadata.tipo,
        descricao: configuracao.descricao,
        createdAt: configuracao.createdAt,
        updatedAt: undefined,
      };
    } catch (error) {
      if (error instanceof BusinessError) {
        throw error;
      }
      throw new BusinessError(`Erro interno ao obter configuração '${chave}'`);
    }
  }

  async obterStatusSistema(): Promise<{
    configuracoes: {
      permitirEstoqueNegativo: boolean;
      permitirAjustesForcados: boolean;
      estoqueMinimoEquipamento: number;
    };
    versao: string;
    ambiente: string;
    timestamp: Date;
  }> {
    try {
      const [
        permitirEstoqueNegativo,
        permitirAjustesForcados,
        estoqueMinimoEquipamento,
      ] = await Promise.all([
        this.configuracaoService.permitirEstoqueNegativo(),
        this.configuracaoService.permitirAjustesForcados(),
        this.configuracaoService.obterEstoqueMinimoEquipamento(),
      ]);

      return {
        configuracoes: {
          permitirEstoqueNegativo,
          permitirAjustesForcados,
          estoqueMinimoEquipamento,
        },
        versao: process.env.npm_package_version || '3.5.5',
        ambiente: process.env.NODE_ENV || 'development',
        timestamp: new Date(),
      };
    } catch (error) {
      throw new BusinessError('Erro interno ao obter status do sistema');
    }
  }
}