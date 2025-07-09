import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Request,
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
import { TipoNotaMovimentacao } from '../../domain/enums/estoque.enum';
import { GerenciarNotaRascunhoUseCase } from '../../application/use-cases/estoque/gerenciar-nota-rascunho.use-case';
import { ConcluirNotaMovimentacaoUseCase } from '../../application/use-cases/estoque/concluir-nota-movimentacao.use-case';
import { CancelarNotaMovimentacaoUseCase } from '../../application/use-cases/estoque/cancelar-nota-movimentacao.use-case';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
  CriarNotaMovimentacaoSchema,
  AdicionarItemNotaSchema,
  AtualizarQuantidadeItemSchema,
  AtualizarNotaSchema,
  ConcluirNotaSchema,
  CancelarNotaSchema,
  FiltrosNotaMovimentacaoSchema,
  FiltrosResumoNotaMovimentacaoSchema,
  CriarNotaMovimentacaoRequest,
  AdicionarItemNotaRequest,
  AtualizarQuantidadeItemRequest,
  AtualizarNotaRequest,
  ConcluirNotaRequest,
  CancelarNotaRequest,
  FiltrosNotaMovimentacao,
  FiltrosResumoNotaMovimentacao,
} from '../dto/schemas/nota-movimentacao.schemas';
import { IdSchema, SuccessResponse, PaginatedResponse } from '../dto/schemas/common.schemas';

@ApiTags('notas-movimentacao')
@ApiBearerAuth()
@Controller('notas-movimentacao')
export class NotasMovimentacaoController {
  constructor(
    private readonly gerenciarNotaUseCase: GerenciarNotaRascunhoUseCase,
    private readonly concluirNotaUseCase: ConcluirNotaMovimentacaoUseCase,
    private readonly cancelarNotaUseCase: CancelarNotaMovimentacaoUseCase,
    private readonly prismaService: PrismaService,
  ) {}

  @Post()
  @ApiOperation({ 
    summary: 'Criar nova nota de movimentação em rascunho',
    description: 'Cria uma nova nota de movimentação no status RASCUNHO para posterior adição de itens',
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Nota criada com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            numero: { type: 'string', example: 'ENT-2024-000001' },
            tipo: { type: 'string', enum: ['ENTRADA', 'TRANSFERENCIA', 'DESCARTE', 'AJUSTE'] },
            status: { type: 'string', example: 'RASCUNHO' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiResponse({ status: 404, description: 'Almoxarifado não encontrado' })
  async criarNota(
    @Body(new ZodValidationPipe(CriarNotaMovimentacaoSchema)) 
    criarNotaDto: CriarNotaMovimentacaoRequest,
  ): Promise<SuccessResponse> {
    // Para desenvolvimento: buscar usuário admin do seed
    // TODO: Implementar autenticação real com JWT
    const adminUser = await this.prismaService.usuario.findFirst({
      where: { email: 'admin@epi.com' }
    });
    
    if (!adminUser) {
      throw new Error('Usuário admin não encontrado. Execute o seed primeiro.');
    }

    const nota = await this.gerenciarNotaUseCase.criarNota({
      tipo: criarNotaDto.tipo as TipoNotaMovimentacao,
      almoxarifadoOrigemId: criarNotaDto.almoxarifadoOrigemId,
      almoxarifadoDestinoId: criarNotaDto.almoxarifadoDestinoId,
      observacoes: criarNotaDto.observacoes,
      usuarioId: adminUser.id,
    });

    return {
      success: true,
      data: nota,
      message: 'Nota de movimentação criada com sucesso',
    };
  }

  @Get()
  @ApiOperation({ 
    summary: 'Listar notas de movimentação',
    description: 'Lista notas com filtros opcionais e paginação',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (padrão: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página (padrão: 10, máx: 100)' })
  @ApiQuery({ name: 'numero', required: false, type: String, description: 'Filtrar por número da nota' })
  @ApiQuery({ name: 'tipo', required: false, enum: ['ENTRADA', 'TRANSFERENCIA', 'DESCARTE', 'AJUSTE'] })
  @ApiQuery({ name: 'status', required: false, enum: ['RASCUNHO', 'CONCLUIDA', 'CANCELADA'] })
  @ApiQuery({ name: 'dataInicio', required: false, type: String, format: 'date' })
  @ApiQuery({ name: 'dataFim', required: false, type: String, format: 'date' })
  @ApiResponse({ status: 200, description: 'Lista de notas recuperada com sucesso' })
  async listarNotas(
    @Query(new ZodValidationPipe(FiltrosNotaMovimentacaoSchema))
    filtros: FiltrosNotaMovimentacao,
  ): Promise<PaginatedResponse> {
    const { page, limit, ...restFiltros } = filtros;

    const where: any = {};
    if (restFiltros.numero) {
      where.numeroDocumento = { contains: restFiltros.numero, mode: 'insensitive' };
    }
    if (restFiltros.tipo) {
      where.tipoNota = restFiltros.tipo;
    }
    if (restFiltros.status) {
      where.status = restFiltros.status;
    }
    if (restFiltros.usuarioId) {
      where.responsavelId = restFiltros.usuarioId;
    }
    if (restFiltros.dataInicio || restFiltros.dataFim) {
      where.createdAt = {};
      if (restFiltros.dataInicio) where.createdAt.gte = new Date(restFiltros.dataInicio);
      if (restFiltros.dataFim) where.createdAt.lte = new Date(restFiltros.dataFim);
    }

    const [notas, total] = await this.prismaService.$transaction([
      this.prismaService.notaMovimentacao.findMany({
        where,
        include: {
          responsavel: {
            select: { id: true, nome: true },
          },
          almoxarifadoOrigem: {
            select: { id: true, nome: true },
          },
          almoxarifadoDestino: {
            select: { id: true, nome: true },
          },
          itens: {
            include: {
              tipoEpi: {
                select: { nomeEquipamento: true, numeroCa: true },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prismaService.notaMovimentacao.count({ where }),
    ]);

    const notasFormatadas = notas.map(nota => {
      const totalItens = nota.itens.reduce((acc, item) => acc + item.quantidade, 0);
      const valorTotal = nota.itens.reduce((acc, item) => {
        const custo = item.custoUnitario ? item.custoUnitario.toNumber() : 0;
        return acc + (custo * item.quantidade);
      }, 0);

      return {
        id: nota.id,
        numero: nota.numeroDocumento,
        tipo: nota.tipoNota,
        almoxarifadoOrigemId: nota.almoxarifadoId,
        almoxarifadoDestinoId: nota.almoxarifadoDestinoId,
        usuarioId: nota.responsavelId,
        observacoes: nota.observacoes,
        _status: nota.status,
        createdAt: nota.createdAt,
        
        // Campos expandidos e calculados
        usuario: nota.responsavel,
        almoxarifadoOrigem: nota.almoxarifadoOrigem,
        almoxarifadoDestino: nota.almoxarifadoDestino,
        totalItens,
        valorTotal,
        _itens: nota.itens.map(item => ({
          id: item.id,
          tipoEpiId: item.tipoEpiId,
          quantidade: item.quantidade,
          custo_unitario: item.custoUnitario?.toNumber() ?? 0,
        })),
      };
    });

    return {
      success: true,
      data: notasFormatadas,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  @Get('resumo')
  @ApiOperation({ 
    summary: 'Resumo de notas de movimentação',
    description: 'Lista notas com informações resumidas para exibição em tabelas',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Página (padrão: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página (padrão: 10, máx: 100)' })
  @ApiQuery({ name: 'numero', required: false, type: String, description: 'Filtrar por número da nota' })
  @ApiQuery({ name: 'tipo', required: false, enum: ['ENTRADA', 'TRANSFERENCIA', 'DESCARTE', 'AJUSTE'] })
  @ApiQuery({ name: 'status', required: false, enum: ['RASCUNHO', 'CONCLUIDA', 'CANCELADA'] })
  @ApiQuery({ name: 'almoxarifadoId', required: false, type: String, description: 'ID do almoxarifado (origem ou destino)' })
  @ApiQuery({ name: 'usuarioId', required: false, type: String, description: 'ID do usuário responsável' })
  @ApiQuery({ name: 'dataInicio', required: false, type: String, format: 'date' })
  @ApiQuery({ name: 'dataFim', required: false, type: String, format: 'date' })
  @ApiResponse({ 
    status: 200, 
    description: 'Resumo de notas recuperado com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              numero: { type: 'string', example: 'ENT-2025-000014' },
              tipo: { type: 'string', enum: ['ENTRADA', 'TRANSFERENCIA', 'DESCARTE', 'AJUSTE'] },
              status: { type: 'string', enum: ['RASCUNHO', 'CONCLUIDA', 'CANCELADA'] },
              responsavel_nome: { type: 'string', example: 'Administrador Sistema' },
              almoxarifado_nome: { type: 'string', example: 'Almoxarifado RJ' },
              total_itens: { type: 'number', example: 5 },
              valor_total: { type: 'number', nullable: true, example: 1250.00 },
              data_documento: { type: 'string', format: 'date', example: '2025-07-07' },
              observacoes: { type: 'string', nullable: true, example: 'Compra de EPIs' },
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
  async obterResumoNotas(
    @Query() 
    filtros: any,
  ): Promise<PaginatedResponse> {
    // Aplicar defaults aos filtros se não fornecidos
    const page = parseInt(filtros.page) || 1;
    const limit = Math.min(parseInt(filtros.limit) || 10, 100);
    
    const where: any = {};
    
    if (filtros.numero) {
      where.numeroDocumento = { contains: filtros.numero, mode: 'insensitive' };
    }
    if (filtros.tipo) {
      where.tipoNota = filtros.tipo;
    }
    if (filtros.status) {
      where.status = filtros.status;
    }
    if (filtros.almoxarifadoId) {
      where.OR = [
        { almoxarifadoId: filtros.almoxarifadoId },
        { almoxarifadoDestinoId: filtros.almoxarifadoId },
      ];
    }
    if (filtros.usuarioId) {
      where.responsavelId = filtros.usuarioId;
    }
    if (filtros.dataInicio || filtros.dataFim) {
      where.dataDocumento = {};
      if (filtros.dataInicio) {
        where.dataDocumento.gte = new Date(filtros.dataInicio);
      }
      if (filtros.dataFim) {
        where.dataDocumento.lte = new Date(filtros.dataFim);
      }
    }

    const [notas, total] = await Promise.all([
      this.prismaService.notaMovimentacao.findMany({
        where,
        include: {
          responsavel: {
            select: { nome: true },
          },
          almoxarifadoOrigem: {
            select: { nome: true },
          },
          almoxarifadoDestino: {
            select: { nome: true },
          },
          itens: {
            select: {
              quantidade: true,
              custoUnitario: true,
            },
          },
        },
        orderBy: { dataDocumento: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prismaService.notaMovimentacao.count({ where }),
    ]);

    const notasFormatadas = notas.map(nota => {
      const totalItens = nota.itens.reduce((acc, item) => acc + item.quantidade, 0);
      const valorTotal = nota.itens.reduce((acc, item) => {
        return acc + (item.custoUnitario ? item.custoUnitario.toNumber() * item.quantidade : 0);
      }, 0);
      
      const almoxarifadoNome = nota.almoxarifadoDestino?.nome || nota.almoxarifadoOrigem?.nome || '';
      
      return {
        id: nota.id,
        numero: nota.numeroDocumento || '',
        tipo: nota.tipoNota,
        status: nota.status,
        responsavel_nome: nota.responsavel.nome,
        almoxarifado_nome: almoxarifadoNome,
        total_itens: totalItens,
        valor_total: valorTotal > 0 ? valorTotal : null,
        data_documento: nota.dataDocumento.toISOString().split('T')[0],
        observacoes: nota.observacoes,
      };
    });

    return {
      success: true,
      data: notasFormatadas,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      },
    };
  }

  @Get('rascunhos')
  @ApiOperation({ 
    summary: 'Listar notas em rascunho',
    description: 'Lista apenas as notas no status RASCUNHO do usuário atual',
  })
  @ApiResponse({ status: 200, description: 'Rascunhos recuperados com sucesso' })
  async listarRascunhos(@Request() req: any): Promise<SuccessResponse> {
    const usuarioId = req.user?.id;
    const rascunhos = await this.gerenciarNotaUseCase.listarRascunhos(usuarioId);

    return {
      success: true,
      data: rascunhos,
    };
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Buscar nota por ID',
    description: 'Retorna os detalhes completos de uma nota, incluindo itens',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'ID da nota' })
  @ApiResponse({ status: 200, description: 'Nota encontrada' })
  @ApiResponse({ status: 404, description: 'Nota não encontrada' })
  async obterNota(
    @Param('id', new ZodValidationPipe(IdSchema)) id: string,
  ): Promise<SuccessResponse> {
    const nota = await this.gerenciarNotaUseCase.obterNotaComItens(id);

    return {
      success: true,
      data: nota,
    };
  }

  @Put(':id')
  @ApiOperation({ 
    summary: 'Atualizar observações da nota',
    description: 'Atualiza apenas as observações de uma nota em rascunho',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Nota atualizada com sucesso' })
  @ApiResponse({ status: 400, description: 'Nota não está em rascunho' })
  @ApiResponse({ status: 404, description: 'Nota não encontrada' })
  async atualizarNota(
    @Param('id', new ZodValidationPipe(IdSchema)) id: string,
    @Body(new ZodValidationPipe(AtualizarNotaSchema)) 
    atualizarDto: AtualizarNotaRequest,
  ): Promise<SuccessResponse> {
    const nota = await this.gerenciarNotaUseCase.atualizarObservacoes(
      id,
      atualizarDto.observacoes || '',
    );

    return {
      success: true,
      data: nota,
      message: 'Nota atualizada com sucesso',
    };
  }

  @Delete(':id')
  @ApiOperation({ 
    summary: 'Excluir nota em rascunho',
    description: 'Exclui uma nota que está no status RASCUNHO',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Nota excluída com sucesso' })
  @ApiResponse({ status: 400, description: 'Nota não pode ser excluída' })
  @ApiResponse({ status: 404, description: 'Nota não encontrada' })
  async excluirNota(
    @Param('id', new ZodValidationPipe(IdSchema)) id: string,
  ): Promise<SuccessResponse> {
    await this.gerenciarNotaUseCase.excluirNota(id);

    return {
      success: true,
      message: 'Nota excluída com sucesso',
      data: null,
    };
  }

  @Post(':id/itens')
  @ApiOperation({ 
    summary: 'Adicionar item à nota',
    description: 'Adiciona um novo item a uma nota em rascunho',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 201, description: 'Item adicionado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos ou nota não editável' })
  @ApiResponse({ status: 409, description: 'Tipo de EPI já adicionado na nota' })
  async adicionarItem(
    @Param('id', new ZodValidationPipe(IdSchema)) notaId: string,
    @Body(new ZodValidationPipe(AdicionarItemNotaSchema)) 
    adicionarItemDto: AdicionarItemNotaRequest,
  ): Promise<SuccessResponse> {
    await this.gerenciarNotaUseCase.adicionarItem({
      notaId,
      tipoEpiId: adicionarItemDto.tipoEpiId,
      quantidade: adicionarItemDto.quantidade,
      custoUnitario: adicionarItemDto.custoUnitario,
      // observacoes não existe no schema v3.5
    });

    return {
      success: true,
      message: 'Item adicionado com sucesso',
      data: null,
    };
  }

  @Put(':id/itens/:tipoEpiId')
  @ApiOperation({ 
    summary: 'Atualizar quantidade do item',
    description: 'Atualiza a quantidade de um item específico na nota',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'ID da nota' })
  @ApiParam({ name: 'tipoEpiId', type: 'string', format: 'uuid', description: 'ID do tipo de EPI' })
  @ApiResponse({ status: 200, description: 'Quantidade atualizada com sucesso' })
  async atualizarQuantidadeItem(
    @Param('id', new ZodValidationPipe(IdSchema)) notaId: string,
    @Param('tipoEpiId', new ZodValidationPipe(IdSchema)) tipoEpiId: string,
    @Body(new ZodValidationPipe(AtualizarQuantidadeItemSchema)) 
    atualizarDto: AtualizarQuantidadeItemRequest,
  ): Promise<SuccessResponse> {
    await this.gerenciarNotaUseCase.atualizarQuantidadeItem({
      notaId,
      tipoEpiId,
      quantidade: atualizarDto.quantidade,
    });

    return {
      success: true,
      message: 'Quantidade do item atualizada com sucesso',
      data: null,
    };
  }

  @Delete(':id/itens/:itemId')
  @ApiOperation({ 
    summary: 'Remover item da nota',
    description: 'Remove um item específico de uma nota em rascunho',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid', description: 'ID da nota' })
  @ApiParam({ name: 'itemId', type: 'string', format: 'uuid', description: 'ID do item' })
  @ApiResponse({ status: 200, description: 'Item removido com sucesso' })
  async removerItem(
    @Param('id', new ZodValidationPipe(IdSchema)) notaId: string,
    @Param('itemId', new ZodValidationPipe(IdSchema)) itemId: string,
  ): Promise<SuccessResponse> {
    await this.gerenciarNotaUseCase.removerItem(notaId, itemId);

    return {
      success: true,
      message: 'Item removido com sucesso',
      data: null,
    };
  }

  @Post(':id/concluir')
  @ApiOperation({ 
    summary: 'Concluir nota de movimentação',
    description: 'Processa uma nota em rascunho, criando movimentações e atualizando estoque',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ 
    status: 200, 
    description: 'Nota concluída com sucesso',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean' },
        data: {
          type: 'object',
          properties: {
            notaConcluida: { type: 'object' },
            movimentacoesCriadas: { type: 'array' },
            itensProcessados: { type: 'array' },
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Nota não pode ser concluída ou estoque insuficiente' })
  async concluirNota(
    @Param('id', new ZodValidationPipe(IdSchema)) notaId: string,
    @Body(new ZodValidationPipe(ConcluirNotaSchema)) 
    concluirDto: ConcluirNotaRequest,
    @Request() req: any,
  ): Promise<SuccessResponse> {
    const usuarioId = req.user?.id || 'user-temp';

    const resultado = await this.concluirNotaUseCase.execute({
      notaId,
      usuarioId,
      validarEstoque: concluirDto.validarEstoque,
    });

    return {
      success: true,
      data: resultado,
      message: 'Nota concluída com sucesso',
    };
  }

  @Post(':id/cancelar')
  @ApiOperation({ 
    summary: 'Cancelar nota de movimentação',
    description: 'Cancela uma nota, gerando estornos se necessário',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Nota cancelada com sucesso' })
  @ApiResponse({ status: 400, description: 'Nota não pode ser cancelada' })
  async cancelarNota(
    @Param('id', new ZodValidationPipe(IdSchema)) notaId: string,
    @Body(new ZodValidationPipe(CancelarNotaSchema)) 
    cancelarDto: CancelarNotaRequest,
    @Request() req: any,
  ): Promise<SuccessResponse> {
    const usuarioId = req.user?.id || 'user-temp';

    const resultado = await this.cancelarNotaUseCase.execute({
      notaId,
      usuarioId,
      motivo: cancelarDto.motivo,
      gerarEstorno: cancelarDto.gerarEstorno,
    });

    return {
      success: true,
      data: resultado,
      message: 'Nota cancelada com sucesso',
    };
  }

  @Get(':id/validar-cancelamento')
  @ApiOperation({ 
    summary: 'Validar se nota pode ser cancelada',
    description: 'Verifica se uma nota pode ser cancelada e retorna informações sobre o impacto',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Validação realizada' })
  async validarCancelamento(
    @Param('id', new ZodValidationPipe(IdSchema)) notaId: string,
  ): Promise<SuccessResponse> {
    const validacao = await this.cancelarNotaUseCase.validarCancelamento(notaId);
    const impacto = await this.cancelarNotaUseCase.obterImpactoCancelamento(notaId);

    return {
      success: true,
      data: {
        validacao,
        impacto,
      },
    };
  }
}