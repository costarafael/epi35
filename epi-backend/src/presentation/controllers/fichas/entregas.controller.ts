import {
  Controller,
  Get,
  Post,
  Put,
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
import { ZodValidationPipe } from '../../pipes/zod-validation.pipe';
import { CriarEntregaFichaUseCase } from '../../../application/use-cases/fichas/criar-entrega-ficha.use-case';
import { AssinarEntregaUseCase } from '../../../application/use-cases/fichas/assinar-entrega.use-case';
import { StatusEntrega } from '../../../domain/enums/entrega.enum';
import {
  CriarEntregaSchema,
  FiltrosEntregasSchema,
  CriarEntregaRequest,
  FiltrosEntregas,
  AssinarEntregaSchema,
  AssinarEntregaRequest,
} from '../../dto/schemas/ficha-epi.schemas';
import { IdSchema, SuccessResponse, PaginatedResponse } from '../../dto/schemas/common.schemas';
import { EntregaFormatterService } from '../../../shared/formatters/entrega-formatter.service';

@ApiTags('fichas-epi')
@ApiBearerAuth()
@Controller('fichas-epi')
export class EntregasController {
  constructor(
    private readonly criarEntregaFichaUseCase: CriarEntregaFichaUseCase,
    private readonly assinarEntregaUseCase: AssinarEntregaUseCase,
    private readonly entregaFormatter: EntregaFormatterService,
  ) {}

  @Post(':fichaId/entregas')
  @ApiOperation({ 
    summary: 'Criar nova entrega de EPIs',
    description: 'Cria uma nova entrega de itens de EPI para uma ficha específica',
  })
  @ApiParam({ name: 'fichaId', type: String, format: 'uuid' })
  @ApiResponse({ 
    status: 201, 
    description: 'Entrega criada com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            fichaEpiId: { type: 'string', format: 'uuid' },
            status: { type: 'string', enum: ['PENDENTE_ASSINATURA', 'ASSINADA', 'CANCELADA'] },
            dataEntrega: { type: 'string', format: 'date-time' },
            itens: { type: 'array' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Ficha não encontrada' })
  @ApiResponse({ status: 422, description: 'Estoque insuficiente' })
  async criarEntrega(
    @Param('fichaId', new ZodValidationPipe(IdSchema)) 
    fichaId: string,
    @Body(new ZodValidationPipe(CriarEntregaSchema)) 
    criarEntregaDto: CriarEntregaRequest,
  ): Promise<SuccessResponse> {
    // 🔍 DEBUG: Log detalhado do payload recebido
    console.log('🔍 [ENTREGAS CONTROLLER] Payload recebido:');
    console.log('📋 FichaId:', fichaId);
    console.log('📋 Quantidade:', criarEntregaDto.quantidade);
    console.log('📋 Itens recebidos:', JSON.stringify(criarEntregaDto.itens, null, 2));
    console.log('📋 Total de itens no array:', criarEntregaDto.itens.length);
    
    // Validar se há IDs duplicados
    const estoqueIds = criarEntregaDto.itens.map(item => item.estoqueItemOrigemId);
    const uniqueIds = [...new Set(estoqueIds)];
    console.log('📋 IDs de EstoqueItem únicos:', uniqueIds.length, 'de', estoqueIds.length, 'total');
    console.log('📋 IDs únicos:', uniqueIds);
    
    if (uniqueIds.length !== estoqueIds.length) {
      console.log('⚠️ ALERTA: Existem IDs duplicados no payload!');
      console.log('📋 IDs completos:', estoqueIds);
    }

    const entrega = await this.criarEntregaFichaUseCase.execute(
      criarEntregaDto,
      fichaId,
    );

    return {
      success: true,
      data: entrega,
      message: 'Entrega criada com sucesso',
    };
  }

  @Get(':fichaId/entregas')
  @ApiOperation({ 
    summary: 'Listar entregas de uma ficha',
    description: 'Lista todas as entregas de uma ficha específica com filtros',
  })
  @ApiParam({ name: 'fichaId', type: String, format: 'uuid' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (padrão: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página (padrão: 10)' })
  @ApiQuery({ name: 'status', required: false, enum: ['ATIVA', 'DEVOLVIDA_PARCIAL', 'DEVOLVIDA_TOTAL', 'CANCELADA'] })
  @ApiQuery({ name: 'dataInicio', required: false, type: String, format: 'date' })
  @ApiQuery({ name: 'dataFim', required: false, type: String, format: 'date' })
  @ApiResponse({ status: 200, description: 'Lista de entregas obtida com sucesso' })
  @ApiResponse({ status: 404, description: 'Ficha não encontrada' })
  async listarEntregas(
    @Param('fichaId', new ZodValidationPipe(IdSchema)) 
    fichaId: string,
    @Query(new ZodValidationPipe(FiltrosEntregasSchema)) 
    filtros: FiltrosEntregas,
  ): Promise<PaginatedResponse> {
    // 🔍 DEBUG: Log da consulta de entregas
    console.log('🔍 [ENTREGAS CONTROLLER] Buscando entregas para ficha:', fichaId);
    console.log('🔍 [ENTREGAS CONTROLLER] Filtros recebidos:', filtros);

    const page = filtros.page || 1;
    const limit = filtros.limit || 10;
    
    // ✅ FIX: Implementar busca real de entregas usando o use case
    const entregas = await this.criarEntregaFichaUseCase.listarEntregasPorFicha(fichaId);
    
    // 🔍 DEBUG: Log das entregas encontradas
    console.log('🔍 [ENTREGAS CONTROLLER] Entregas encontradas:', {
      total: entregas.length,
      entregas: entregas.map(e => ({
        id: e.id,
        dataEntrega: e.dataEntrega,
        totalItens: e.itens.length,
        itensDetalhes: e.itens.map(item => ({
          tipoEpiId: item.tipoEpiId,
          quantidade: item.quantidadeEntregue,
        }))
      }))
    });

    // Aplicar paginação
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const entregasPaginadas = entregas.slice(startIndex, endIndex);

    return {
      success: true,
      data: entregasPaginadas,
      pagination: {
        page,
        limit,
        total: entregas.length,
        totalPages: Math.ceil(entregas.length / limit),
        hasNext: endIndex < entregas.length,
        hasPrev: page > 1,
      },
    };
  }

  @Put('entregas/:entregaId/assinar')
  @ApiOperation({ 
    summary: 'Assinar entrega de EPI',
    description: 'Marca uma entrega como assinada, alterando seu status de PENDENTE_ASSINATURA para ASSINADA',
  })
  @ApiParam({ name: 'entregaId', type: String, format: 'uuid', description: 'ID da entrega a ser assinada' })
  @ApiResponse({ 
    status: 200, 
    description: 'Entrega assinada com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            status: { type: 'string', example: 'ASSINADA' },
            dataAssinatura: { type: 'string', format: 'date-time' },
            assinaturaColaborador: { type: 'string', nullable: true },
            observacoes: { type: 'string', nullable: true },
            fichaEpiId: { type: 'string', format: 'uuid' },
            almoxarifadoId: { type: 'string', format: 'uuid' },
            responsavelId: { type: 'string', format: 'uuid' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
          },
        },
        message: { type: 'string', example: 'Entrega assinada com sucesso' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou entrega não pode ser assinada' })
  @ApiResponse({ status: 404, description: 'Entrega não encontrada' })
  async assinarEntrega(
    @Param('entregaId', new ZodValidationPipe(IdSchema)) 
    entregaId: string,
    @Body(new ZodValidationPipe(AssinarEntregaSchema)) 
    assinarEntregaDto: AssinarEntregaRequest,
  ): Promise<SuccessResponse> {
    console.log('🔍 [ENTREGAS CONTROLLER] Assinando entrega:', entregaId);
    console.log('📋 Dados da assinatura:', assinarEntregaDto);

    const entregaAssinada = await this.assinarEntregaUseCase.execute({
      entregaId,
      assinaturaColaborador: assinarEntregaDto.assinaturaColaborador,
      observacoes: assinarEntregaDto.observacoes,
    });

    console.log('✅ [ENTREGAS CONTROLLER] Entrega assinada com sucesso:', entregaAssinada.id);

    return {
      success: true,
      data: entregaAssinada,
      message: 'Entrega assinada com sucesso',
    };
  }
}