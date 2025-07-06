import {
  Controller,
  Get,
  Put,
  Post,
  Patch,
  Body,
  Param,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';
import { ObterConfiguracoesUseCase } from '../../application/use-cases/configuracoes/obter-configuracoes.use-case';
import { AtualizarConfiguracoesUseCase } from '../../application/use-cases/configuracoes/atualizar-configuracoes.use-case';
import {
  ObterConfiguracaoParamsSchema,
  AtualizarConfiguracaoSchema,
  AtualizarConfiguracoesLoteSchema,
  AtualizarConfiguracaoBooleanSchema,
  AtualizarConfiguracaoNumericaSchema,
  ObterConfiguracaoParams,
  AtualizarConfiguracaoRequest,
  AtualizarConfiguracoesLoteRequest,
  AtualizarConfiguracaoBooleanRequest,
  AtualizarConfiguracaoNumericaRequest,
  ConfiguracoesListResponse,
  ConfiguracaoResponse,
  AtualizacaoConfiguracaoResponse,
  AtualizacaoLoteResponse,
  StatusSistemaResponse,
  ChaveConfiguracao,
} from '../dto/schemas/configuracoes.schemas';
import { BusinessError, NotFoundError, ValidationError } from '../../domain/exceptions/business.exception';

@ApiTags('configuracoes')
@ApiBearerAuth()
@Controller('configuracoes')
export class ConfiguracoesController {
  constructor(
    private readonly obterConfiguracoesUseCase: ObterConfiguracoesUseCase,
    private readonly atualizarConfiguracoesUseCase: AtualizarConfiguracoesUseCase,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Listar todas as configurações',
    description: 'Lista todas as configurações do sistema com seus valores atuais',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Lista de configurações retornada com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              chave: { 
                type: 'string', 
                enum: ['PERMITIR_ESTOQUE_NEGATIVO', 'PERMITIR_AJUSTES_FORCADOS', 'ESTOQUE_MINIMO_EQUIPAMENTO'],
                example: 'PERMITIR_ESTOQUE_NEGATIVO' 
              },
              valor: { type: 'string', example: 'false' },
              valorParsed: { 
                oneOf: [
                  { type: 'boolean' },
                  { type: 'number' },
                  { type: 'string' }
                ],
                example: false 
              },
              tipo: { 
                type: 'string', 
                enum: ['BOOLEAN', 'NUMBER', 'STRING'],
                example: 'BOOLEAN' 
              },
              descricao: { type: 'string', nullable: true, example: 'Permite que o estoque fique negativo durante operações' },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time', nullable: true },
            },
          },
        },
        message: { type: 'string', example: 'Configurações listadas com sucesso' },
      },
    },
  })
  async listarConfiguracoes(): Promise<ConfiguracoesListResponse> {
    try {
      const configuracoes = await this.obterConfiguracoesUseCase.listarTodasConfiguracoes();

      return {
        success: true,
        data: configuracoes,
        message: 'Configurações listadas com sucesso',
      };
    } catch (error) {
      if (error instanceof BusinessError) {
        throw error;
      }
      throw new BusinessError('Erro interno ao listar configurações');
    }
  }

  @Get('status')
  @ApiOperation({
    summary: 'Obter status do sistema',
    description: 'Retorna o status atual das principais configurações do sistema',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Status do sistema retornado com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            configuracoes: {
              type: 'object',
              properties: {
                permitirEstoqueNegativo: { type: 'boolean', example: false },
                permitirAjustesForcados: { type: 'boolean', example: false },
                estoqueMinimoEquipamento: { type: 'number', example: 10 },
              },
            },
            versao: { type: 'string', example: '3.5.5' },
            ambiente: { type: 'string', example: 'production' },
            timestamp: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  async obterStatusSistema(): Promise<StatusSistemaResponse> {
    try {
      const status = await this.obterConfiguracoesUseCase.obterStatusSistema();

      return {
        success: true,
        data: status,
      };
    } catch (error) {
      if (error instanceof BusinessError) {
        throw error;
      }
      throw new BusinessError('Erro interno ao obter status do sistema');
    }
  }

  @Get(':chave')
  @ApiOperation({
    summary: 'Obter configuração específica',
    description: 'Retorna os detalhes de uma configuração específica',
  })
  @ApiParam({
    name: 'chave',
    enum: ['PERMITIR_ESTOQUE_NEGATIVO', 'PERMITIR_AJUSTES_FORCADOS', 'ESTOQUE_MINIMO_EQUIPAMENTO'],
    description: 'Chave da configuração',
    example: 'PERMITIR_ESTOQUE_NEGATIVO',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configuração encontrada',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            chave: { type: 'string', example: 'PERMITIR_ESTOQUE_NEGATIVO' },
            valor: { type: 'string', example: 'false' },
            valorParsed: { type: 'boolean', example: false },
            tipo: { type: 'string', example: 'BOOLEAN' },
            descricao: { type: 'string', nullable: true },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time', nullable: true },
          },
        },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Chave de configuração inválida' })
  async obterConfiguracao(
    @Param(new ZodValidationPipe(ObterConfiguracaoParamsSchema))
    params: ObterConfiguracaoParams,
  ): Promise<ConfiguracaoResponse> {
    try {
      const configuracao = await this.obterConfiguracoesUseCase.obterConfiguracao(params.chave);

      return {
        success: true,
        data: configuracao,
      };
    } catch (error) {
      if (error instanceof BusinessError) {
        throw error;
      }
      throw new BusinessError(`Erro interno ao obter configuração '${params.chave}'`);
    }
  }

  @Put(':chave')
  @ApiOperation({
    summary: 'Atualizar configuração',
    description: 'Atualiza o valor de uma configuração específica',
  })
  @ApiParam({
    name: 'chave',
    enum: ['PERMITIR_ESTOQUE_NEGATIVO', 'PERMITIR_AJUSTES_FORCADOS', 'ESTOQUE_MINIMO_EQUIPAMENTO'],
    description: 'Chave da configuração',
    example: 'PERMITIR_ESTOQUE_NEGATIVO',
  })
  @ApiBody({
    description: 'Dados da configuração a ser atualizada',
    schema: {
      type: 'object',
      properties: {
        valor: {
          type: 'string',
          description: 'Valor da configuração (string, será convertido conforme o tipo)',
          example: 'true',
        },
        descricao: {
          type: 'string',
          description: 'Descrição opcional da configuração',
          example: 'Permite estoque negativo para operações emergenciais',
        },
      },
      required: ['valor'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configuração atualizada com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            configuracao: {
              type: 'object',
              properties: {
                chave: { type: 'string', example: 'PERMITIR_ESTOQUE_NEGATIVO' },
                valor: { type: 'string', example: 'true' },
                valorParsed: { type: 'boolean', example: true },
                tipo: { type: 'string', example: 'BOOLEAN' },
                descricao: { type: 'string', nullable: true },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
            },
            valorAnterior: { type: 'string', example: 'false' },
          },
        },
        message: { type: 'string', example: 'Configuração atualizada com sucesso' },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Dados inválidos ou valor incompatível com o tipo' })
  async atualizarConfiguracao(
    @Param(new ZodValidationPipe(ObterConfiguracaoParamsSchema))
    params: ObterConfiguracaoParams,
    @Body(new ZodValidationPipe(AtualizarConfiguracaoSchema))
    body: AtualizarConfiguracaoRequest,
  ): Promise<AtualizacaoConfiguracaoResponse> {
    try {
      const resultado = await this.atualizarConfiguracoesUseCase.atualizarConfiguracao(
        params.chave,
        body,
      );

      return {
        success: true,
        data: resultado,
        message: 'Configuração atualizada com sucesso',
      };
    } catch (error) {
      if (error instanceof BusinessError || error instanceof ValidationError) {
        throw error;
      }
      throw new BusinessError(`Erro interno ao atualizar configuração '${params.chave}'`);
    }
  }

  @Patch(':chave/boolean')
  @ApiOperation({
    summary: 'Atualizar configuração booleana',
    description: 'Atualiza uma configuração booleana de forma simplificada',
  })
  @ApiParam({
    name: 'chave',
    enum: ['PERMITIR_ESTOQUE_NEGATIVO', 'PERMITIR_AJUSTES_FORCADOS'],
    description: 'Chave da configuração booleana',
    example: 'PERMITIR_ESTOQUE_NEGATIVO',
  })
  @ApiBody({
    description: 'Valor booleano da configuração',
    schema: {
      type: 'object',
      properties: {
        ativo: {
          type: 'boolean',
          description: 'Valor booleano da configuração',
          example: true,
        },
        descricao: {
          type: 'string',
          description: 'Descrição opcional da configuração',
          example: 'Habilitado para operações emergenciais',
        },
      },
      required: ['ativo'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configuração booleana atualizada com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            configuracao: {
              type: 'object',
              properties: {
                chave: { type: 'string', example: 'PERMITIR_ESTOQUE_NEGATIVO' },
                valor: { type: 'string', example: 'true' },
                valorParsed: { type: 'boolean', example: true },
                tipo: { type: 'string', example: 'BOOLEAN' },
                descricao: { type: 'string', nullable: true },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
            },
            valorAnterior: { type: 'string', example: 'false' },
          },
        },
        message: { type: 'string', example: 'Configuração atualizada com sucesso' },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Configuração não é do tipo booleano' })
  async atualizarConfiguracaoBoolean(
    @Param(new ZodValidationPipe(ObterConfiguracaoParamsSchema))
    params: ObterConfiguracaoParams,
    @Body(new ZodValidationPipe(AtualizarConfiguracaoBooleanSchema))
    body: AtualizarConfiguracaoBooleanRequest,
  ): Promise<AtualizacaoConfiguracaoResponse> {
    try {
      const resultado = await this.atualizarConfiguracoesUseCase.atualizarConfiguracoesBolean(
        params.chave,
        body.ativo,
        body.descricao,
      );

      return {
        success: true,
        data: resultado,
        message: 'Configuração atualizada com sucesso',
      };
    } catch (error) {
      if (error instanceof BusinessError || error instanceof ValidationError) {
        throw error;
      }
      throw new BusinessError(`Erro interno ao atualizar configuração '${params.chave}'`);
    }
  }

  @Patch(':chave/number')
  @ApiOperation({
    summary: 'Atualizar configuração numérica',
    description: 'Atualiza uma configuração numérica de forma simplificada',
  })
  @ApiParam({
    name: 'chave',
    enum: ['ESTOQUE_MINIMO_EQUIPAMENTO'],
    description: 'Chave da configuração numérica',
    example: 'ESTOQUE_MINIMO_EQUIPAMENTO',
  })
  @ApiBody({
    description: 'Valor numérico da configuração',
    schema: {
      type: 'object',
      properties: {
        valor: {
          type: 'number',
          description: 'Valor numérico da configuração',
          example: 15,
          minimum: 0,
          maximum: 999999,
        },
        descricao: {
          type: 'string',
          description: 'Descrição opcional da configuração',
          example: 'Estoque mínimo ajustado para operação sazonal',
        },
      },
      required: ['valor'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configuração numérica atualizada com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            configuracao: {
              type: 'object',
              properties: {
                chave: { type: 'string', example: 'ESTOQUE_MINIMO_EQUIPAMENTO' },
                valor: { type: 'string', example: '15' },
                valorParsed: { type: 'number', example: 15 },
                tipo: { type: 'string', example: 'NUMBER' },
                descricao: { type: 'string', nullable: true },
                createdAt: { type: 'string', format: 'date-time' },
                updatedAt: { type: 'string', format: 'date-time' },
              },
            },
            valorAnterior: { type: 'string', example: '10' },
          },
        },
        message: { type: 'string', example: 'Configuração atualizada com sucesso' },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Configuração não é do tipo numérico ou valor inválido' })
  async atualizarConfiguracaoNumerica(
    @Param(new ZodValidationPipe(ObterConfiguracaoParamsSchema))
    params: ObterConfiguracaoParams,
    @Body(new ZodValidationPipe(AtualizarConfiguracaoNumericaSchema))
    body: AtualizarConfiguracaoNumericaRequest,
  ): Promise<AtualizacaoConfiguracaoResponse> {
    try {
      const resultado = await this.atualizarConfiguracoesUseCase.atualizarConfiguracaoNumerica(
        params.chave,
        body.valor,
        body.descricao,
      );

      return {
        success: true,
        data: resultado,
        message: 'Configuração atualizada com sucesso',
      };
    } catch (error) {
      if (error instanceof BusinessError || error instanceof ValidationError) {
        throw error;
      }
      throw new BusinessError(`Erro interno ao atualizar configuração '${params.chave}'`);
    }
  }

  @Post('batch')
  @ApiOperation({
    summary: 'Atualizar múltiplas configurações',
    description: 'Atualiza várias configurações em uma única operação',
  })
  @ApiBody({
    description: 'Lista de configurações a serem atualizadas',
    schema: {
      type: 'object',
      properties: {
        configuracoes: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              chave: {
                type: 'string',
                enum: ['PERMITIR_ESTOQUE_NEGATIVO', 'PERMITIR_AJUSTES_FORCADOS', 'ESTOQUE_MINIMO_EQUIPAMENTO'],
                example: 'PERMITIR_ESTOQUE_NEGATIVO',
              },
              valor: {
                type: 'string',
                example: 'true',
              },
              descricao: {
                type: 'string',
                example: 'Configuração atualizada em lote',
              },
            },
            required: ['chave', 'valor'],
          },
          minItems: 1,
          maxItems: 10,
        },
      },
      required: ['configuracoes'],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configurações atualizadas (parcial ou totalmente)',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            configuracoes: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  chave: { type: 'string' },
                  valor: { type: 'string' },
                  valorParsed: { oneOf: [{ type: 'boolean' }, { type: 'number' }, { type: 'string' }] },
                  tipo: { type: 'string' },
                  descricao: { type: 'string', nullable: true },
                  createdAt: { type: 'string', format: 'date-time' },
                  updatedAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            totalAtualizadas: { type: 'number', example: 2 },
            falhas: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  chave: { type: 'string' },
                  erro: { type: 'string' },
                },
              },
            },
          },
        },
        message: { type: 'string', example: 'Configurações atualizadas em lote' },
      },
    },
  })
  @ApiResponse({ status: HttpStatus.BAD_REQUEST, description: 'Dados inválidos na requisição' })
  async atualizarConfiguracoesLote(
    @Body(new ZodValidationPipe(AtualizarConfiguracoesLoteSchema))
    body: AtualizarConfiguracoesLoteRequest,
  ): Promise<AtualizacaoLoteResponse> {
    try {
      const resultado = await this.atualizarConfiguracoesUseCase.atualizarConfiguracoesLote(body);

      const message = resultado.falhas && resultado.falhas.length > 0
        ? `${resultado.totalAtualizadas} configurações atualizadas com sucesso, ${resultado.falhas.length} falharam`
        : `${resultado.totalAtualizadas} configurações atualizadas com sucesso`;

      return {
        success: true,
        data: resultado,
        message,
      };
    } catch (error) {
      if (error instanceof BusinessError) {
        throw error;
      }
      throw new BusinessError('Erro interno ao atualizar configurações em lote');
    }
  }

  @Post('reset')
  @ApiOperation({
    summary: 'Resetar configurações para valores padrão',
    description: 'Reseta todas as configurações para seus valores padrão do sistema',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Configurações resetadas com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              chave: { type: 'string' },
              valor: { type: 'string' },
              valorParsed: { oneOf: [{ type: 'boolean' }, { type: 'number' }, { type: 'string' }] },
              tipo: { type: 'string' },
              descricao: { type: 'string', nullable: true },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' },
            },
          },
        },
        message: { type: 'string', example: 'Configurações resetadas para valores padrão' },
      },
    },
  })
  async resetarConfiguracoes(): Promise<ConfiguracoesListResponse> {
    try {
      const configuracoes = await this.atualizarConfiguracoesUseCase.resetarConfiguracoesPadrao();

      return {
        success: true,
        data: configuracoes,
        message: 'Configurações resetadas para valores padrão',
      };
    } catch (error) {
      if (error instanceof BusinessError) {
        throw error;
      }
      throw new BusinessError('Erro interno ao resetar configurações');
    }
  }
}