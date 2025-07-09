import {
  Controller,
  Get,
  Post,
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
} from '@nestjs/swagger';
import { ZodValidationPipe } from '../pipes/zod-validation.pipe';
import {
  CriarColaboradorUseCase,
  ListarColaboradoresUseCase,
} from '../../application/use-cases/colaboradores';
import {
  CriarColaboradorSchema,
  FiltrosColaboradorSchema,
  CriarColaboradorRequest,
  FiltrosColaborador,
} from '../dto/schemas/colaborador.schemas';
import { IdSchema, SuccessResponse, PaginatedResponse } from '../dto/schemas/common.schemas';

@ApiTags('colaboradores')
@Controller('colaboradores')
export class ColaboradoresController {
  constructor(
    private readonly criarColaboradorUseCase: CriarColaboradorUseCase,
    private readonly listarColaboradoresUseCase: ListarColaboradoresUseCase,
  ) {}

  @Post()
  @ApiOperation({ 
    summary: 'Criar novo colaborador',
    description: 'Cria um novo colaborador vinculado a uma contratada',
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Colaborador criado com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nome: { type: 'string', example: 'João da Silva' },
            cpf: { type: 'string', example: '12345678901' },
            cpfFormatado: { type: 'string', example: '123.456.789-01' },
            matricula: { type: 'string', nullable: true, example: 'MAT001' },
            cargo: { type: 'string', nullable: true, example: 'Técnico' },
            setor: { type: 'string', nullable: true, example: 'Manutenção' },
            ativo: { type: 'boolean', example: true },
            contratadaId: { type: 'string', format: 'uuid' },
            unidadeNegocioId: { type: 'string', format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' },
            contratada: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                nome: { type: 'string', example: 'Empresa Contratada LTDA' },
                cnpj: { type: 'string', example: '12345678000190' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 409, description: 'CPF já cadastrado' })
  @ApiResponse({ status: 404, description: 'Contratada não encontrada' })
  async criarColaborador(
    @Body(new ZodValidationPipe(CriarColaboradorSchema)) 
    body: CriarColaboradorRequest,
  ): Promise<SuccessResponse> {
    const colaborador = await this.criarColaboradorUseCase.execute({
      nome: body.nome,
      cpf: body.cpf,
      matricula: body.matricula,
      cargo: body.cargo,
      setor: body.setor,
      contratadaId: body.contratadaId,
    });

    return {
      success: true,
      data: colaborador,
      message: 'Colaborador criado com sucesso',
    };
  }

  @Get()
  @ApiOperation({ 
    summary: 'Listar colaboradores',
    description: 'Lista colaboradores com filtros opcionais e paginação',
  })
  @ApiQuery({ name: 'nome', required: false, type: String, description: 'Filtrar por nome' })
  @ApiQuery({ name: 'cpf', required: false, type: String, description: 'Filtrar por CPF' })
  @ApiQuery({ name: 'contratadaId', required: false, type: String, description: 'Filtrar por contratada' })
  @ApiQuery({ name: 'cargo', required: false, type: String, description: 'Filtrar por cargo' })
  @ApiQuery({ name: 'setor', required: false, type: String, description: 'Filtrar por setor' })
  @ApiQuery({ name: 'ativo', required: false, type: Boolean, description: 'Filtrar por status ativo' })
  @ApiQuery({ name: 'semFicha', required: false, type: Boolean, description: 'Filtrar apenas colaboradores sem ficha EPI (útil para criação de fichas)' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (padrão: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página (padrão: 10, máx: 100)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de colaboradores recuperada com sucesso',
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
              cpf: { type: 'string' },
              cpfFormatado: { type: 'string' },
              matricula: { type: 'string', nullable: true },
              cargo: { type: 'string', nullable: true },
              setor: { type: 'string', nullable: true },
              ativo: { type: 'boolean' },
              contratada: {
                type: 'object',
                properties: {
                  nome: { type: 'string' },
                  cnpj: { type: 'string' },
                },
              },
            },
          },
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' },
            hasNext: { type: 'boolean' },
            hasPrev: { type: 'boolean' },
          },
        },
      },
    },
  })
  async listarColaboradores(
    @Query(new ZodValidationPipe(FiltrosColaboradorSchema)) 
    filtros: FiltrosColaborador,
  ): Promise<PaginatedResponse> {
    const resultado = await this.listarColaboradoresUseCase.execute(
      {
        nome: filtros.nome,
        cpf: filtros.cpf,
        contratadaId: filtros.contratadaId,
        cargo: filtros.cargo,
        setor: filtros.setor,
        ativo: filtros.ativo,
        semFicha: filtros.semFicha,
      },
      {
        page: filtros.page,
        limit: filtros.limit,
      }
    );

    return {
      success: true,
      data: resultado.items,
      pagination: resultado.pagination,
    };
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Obter colaborador por ID',
    description: 'Retorna os detalhes de um colaborador específico',
  })
  @ApiParam({ name: 'id', type: String, description: 'ID do colaborador (UUID)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Colaborador encontrado',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            nome: { type: 'string' },
            cpf: { type: 'string' },
            cpfFormatado: { type: 'string' },
            matricula: { type: 'string', nullable: true },
            cargo: { type: 'string', nullable: true },
            setor: { type: 'string', nullable: true },
            ativo: { type: 'boolean' },
            contratada: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                nome: { type: 'string' },
                cnpj: { type: 'string' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Colaborador não encontrado' })
  async obterColaborador(
    @Param('id', new ZodValidationPipe(IdSchema)) 
    id: string,
  ): Promise<SuccessResponse> {
    const colaborador = await this.listarColaboradoresUseCase.obterPorId(id);

    if (!colaborador) {
      throw new Error('Colaborador não encontrado');
    }

    return {
      success: true,
      data: colaborador,
      message: 'Colaborador encontrado',
    };
  }
}