import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class ConfiguracaoService {
  constructor(
    private readonly configService: ConfigService,
    private readonly prismaService: PrismaService,
  ) {}

  /**
   * Obtém configuração com fallback para variável de ambiente
   * Prioridade: 1. Banco de dados, 2. Variável de ambiente
   */
  async getBoolean(chave: string, defaultValue: boolean = false): Promise<boolean> {
    try {
      // Tenta buscar no banco primeiro
      const config = await this.prismaService.configuracao.findUnique({
        where: { chave },
      });
      
      if (config) {
        return config.valor === 'true';
      }
      
      // Fallback para variável de ambiente
      return this.configService.get<boolean>(chave, defaultValue);
    } catch (error) {
      // Se houver erro no banco, usa variável de ambiente
      return this.configService.get<boolean>(chave, defaultValue);
    }
  }

  /**
   * Obtém configuração numérica com fallback para variável de ambiente
   * Prioridade: 1. Banco de dados, 2. Variável de ambiente
   */
  async getNumber(chave: string, defaultValue: number = 0): Promise<number> {
    try {
      // Tenta buscar no banco primeiro
      const config = await this.prismaService.configuracao.findUnique({
        where: { chave },
      });
      
      if (config) {
        const numericValue = parseInt(config.valor, 10);
        return isNaN(numericValue) ? defaultValue : numericValue;
      }
      
      // Fallback para variável de ambiente
      return this.configService.get<number>(chave, defaultValue);
    } catch (error) {
      // Se houver erro no banco, usa variável de ambiente
      return this.configService.get<number>(chave, defaultValue);
    }
  }

  /**
   * Configurações específicas do sistema EPI
   */
  async permitirEstoqueNegativo(): Promise<boolean> {
    return this.getBoolean('PERMITIR_ESTOQUE_NEGATIVO', false);
  }

  async permitirAjustesForcados(): Promise<boolean> {
    return this.getBoolean('PERMITIR_AJUSTES_FORCADOS', false);
  }

  async obterEstoqueMinimoEquipamento(): Promise<number> {
    return this.getNumber('ESTOQUE_MINIMO_EQUIPAMENTO', 10);
  }

  /**
   * Define configuração no banco de dados
   */
  async setConfiguration(chave: string, valor: boolean, descricao?: string): Promise<void> {
    await this.prismaService.configuracao.upsert({
      where: { chave },
      update: { valor: valor.toString() },
      create: {
        chave,
        valor: valor.toString(),
        descricao,
      },
    });
  }

  /**
   * Inicializa configurações padrão se não existirem
   */
  async initializeDefaultConfigurations(): Promise<void> {
    const defaultConfigs = [
      {
        chave: 'PERMITIR_ESTOQUE_NEGATIVO',
        valor: 'false',
        descricao: 'Permite ou não que o saldo de estoque_itens fique negativo',
      },
      {
        chave: 'PERMITIR_AJUSTES_FORCADOS',
        valor: 'false',
        descricao: 'Habilita ou desabilita a funcionalidade de ajuste manual de inventário',
      },
      {
        chave: 'ESTOQUE_MINIMO_EQUIPAMENTO',
        valor: '10',
        descricao: 'Quantidade mínima padrão para todos os equipamentos',
      },
    ];

    for (const config of defaultConfigs) {
      const existing = await this.prismaService.configuracao.findUnique({
        where: { chave: config.chave },
      });

      if (!existing) {
        await this.prismaService.configuracao.create({
          data: config,
        });
      }
    }
  }
}