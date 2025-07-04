import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';
import {
  CriarContratadaUseCase,
  ListarContratadasUseCase,
  AtualizarContratadaUseCase,
  ExcluirContratadaUseCase,
  ObterContratadaUseCase,
} from '../../application/use-cases/contratadas';
import {
  CriarContratadaSchema,
  AtualizarContratadaSchema,
  FiltrosContratadaSchema,
  BuscarContratadaSchema,
  CriarContratadaRequest,
  AtualizarContratadaRequest,
  FiltrosContratada,
  BuscarContratada,
} from '../dto/schemas/contratada.schemas';
import { IdSchema, SuccessResponse } from '../dto/schemas/common.schemas';

@ApiTags('contratadas')
@ApiBearerAuth()
@Controller('api/contratadas')
export class ContratadaController {
  constructor(
    private readonly criarContratadaUseCase: CriarContratadaUseCase,
    private readonly listarContratadasUseCase: ListarContratadasUseCase,
    private readonly atualizarContratadaUseCase: AtualizarContratadaUseCase,
    private readonly excluirContratadaUseCase: ExcluirContratadaUseCase,
    private readonly obterContratadaUseCase: ObterContratadaUseCase,
  ) {}

  @Post()
  @ApiOperation({ 
    summary: 'Criar nova contratada',
    description: 'Cria uma nova empresa contratada no sistema',
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Contratada criada com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nome: { type: 'string', example: 'Empresa Contratada LTDA' },
            cnpj: { type: 'string', example: '12345678000190' },
            cnpjFormatado: { type: 'string', example: '12.345.678/0001-90' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 409, description: 'CNPJ já cadastrado' })
  async criarContratada(
    @Body(new ZodValidationPipe(CriarContratadaSchema)) 
    body: CriarContratadaRequest,
  ): Promise<SuccessResponse> {
    const contratada = await this.criarContratadaUseCase.execute({
      nome: body.nome!,
      cnpj: body.cnpj!,
    });

    return {
      success: true,
      data: contratada,
      message: 'Contratada criada com sucesso',
    };
  }

  @Get()
  @ApiOperation({ 
    summary: 'Listar contratadas',
    description: 'Lista todas as contratadas com filtros opcionais',
  })
  @ApiQuery({ name: 'nome', required: false, type: String, description: 'Filtrar por nome' })
  @ApiQuery({ name: 'cnpj', required: false, type: String, description: 'Filtrar por CNPJ' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de contratadas',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            contratadas: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string', format: 'uuid' },
                  nome: { type: 'string' },
                  cnpj: { type: 'string' },
                  cnpjFormatado: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            total: { type: 'number' },
          },
        },
      },
    },
  })
  async listarContratadas(
    @Query(new ZodValidationPipe(FiltrosContratadaSchema)) 
    filtros: FiltrosContratada,
  ): Promise<SuccessResponse> {
    const resultado = await this.listarContratadasUseCase.execute(filtros);

    return {
      success: true,
      data: resultado,
    };
  }

  @Get('estatisticas')
  @ApiOperation({ 
    summary: 'Obter estatísticas das contratadas',
    description: 'Retorna estatísticas gerais das contratadas e colaboradores vinculados',
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Estatísticas das contratadas',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            total: { type: 'number' },
            colaboradoresVinculados: { type: 'number' },
            colaboradoresSemContratada: { type: 'number' },
            topContratadas: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  contratada: {
                    type: 'object',
                    properties: {
                      id: { type: 'string', format: 'uuid' },
                      nome: { type: 'string' },
                      cnpjFormatado: { type: 'string' },
                    },
                  },
                  totalColaboradores: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
  })
  async obterEstatisticas(): Promise<SuccessResponse> {
    const estatisticas = await this.listarContratadasUseCase.obterEstatisticas();

    return {
      success: true,
      data: estatisticas,
    };
  }

  @Get('buscar')
  @ApiOperation({ 
    summary: 'Buscar contratadas por nome',
    description: 'Busca contratadas por nome (limitado a 10 resultados)',
  })
  @ApiQuery({ name: 'nome', required: true, type: String, description: 'Nome para busca' })
  @ApiResponse({ 
    status: 200, 
    description: 'Resultados da busca',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              nome: { type: 'string' },
              cnpj: { type: 'string' },
              cnpjFormatado: { type: 'string' },
              createdAt: { type: 'string', format: 'date-time' },
            },
          },
        },
      },
    },
  })
  async buscarPorNome(
    @Query(new ZodValidationPipe(BuscarContratadaSchema)) 
    query: BuscarContratada,
  ): Promise<SuccessResponse> {
    const contratadas = await this.listarContratadasUseCase.buscarPorNome(query.nome);

    return {
      success: true,
      data: contratadas,
    };
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Obter contratada por ID',
    description: 'Retorna os dados de uma contratada específica',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid', description: 'ID da contratada' })
  @ApiResponse({ 
    status: 200, 
    description: 'Dados da contratada',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nome: { type: 'string' },
            cnpj: { type: 'string' },
            cnpjFormatado: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Contratada não encontrada' })
  async obterContratada(
    @Param('id', new ZodValidationPipe(IdSchema)) 
    id: string,
  ): Promise<SuccessResponse> {
    const contratada = await this.obterContratadaUseCase.execute({ id });

    return {
      success: true,
      data: contratada,
    };
  }

  @Put(':id')
  @ApiOperation({ 
    summary: 'Atualizar contratada',
    description: 'Atualiza os dados de uma contratada existente',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid', description: 'ID da contratada' })
  @ApiResponse({ 
    status: 200, 
    description: 'Contratada atualizada com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nome: { type: 'string' },
            cnpj: { type: 'string' },
            cnpjFormatado: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Contratada não encontrada' })
  @ApiResponse({ status: 409, description: 'CNPJ já cadastrado' })
  async atualizarContratada(
    @Param('id', new ZodValidationPipe(IdSchema)) 
    id: string,
    @Body(new ZodValidationPipe(AtualizarContratadaSchema)) 
    body: AtualizarContratadaRequest,
  ): Promise<SuccessResponse> {
    const contratada = await this.atualizarContratadaUseCase.execute({
      id,
      ...body,
    });

    return {
      success: true,
      data: contratada,
      message: 'Contratada atualizada com sucesso',
    };
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Excluir contratada',
    description: 'Exclui uma contratada do sistema (apenas se não houver colaboradores vinculados)',
  })
  @ApiParam({ name: 'id', type: String, format: 'uuid', description: 'ID da contratada' })
  @ApiResponse({ 
    status: 200, 
    description: 'Contratada excluída com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Contratada excluída com sucesso' },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Contratada não encontrada' })
  @ApiResponse({ status: 400, description: 'Não é possível excluir contratada com colaboradores vinculados' })
  async excluirContratada(
    @Param('id', new ZodValidationPipe(IdSchema)) 
    id: string,
  ): Promise<SuccessResponse> {
    await this.excluirContratadaUseCase.execute({ id });

    return {
      success: true,
      data: null,
      message: 'Contratada excluída com sucesso',
    };
  }
}