import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  HttpStatus,
  UseGuards,
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
import {
  CriarNotaMovimentacaoSchema,
  AdicionarItemNotaSchema,
  AtualizarQuantidadeItemSchema,
  AtualizarNotaSchema,
  ConcluirNotaSchema,
  CancelarNotaSchema,
  FiltrosNotaMovimentacaoSchema,
  CriarNotaMovimentacaoRequest,
  AdicionarItemNotaRequest,
  AtualizarQuantidadeItemRequest,
  AtualizarNotaRequest,
  ConcluirNotaRequest,
  CancelarNotaRequest,
  FiltrosNotaMovimentacao,
} from '../dto/schemas/nota-movimentacao.schemas';
import { IdSchema, SuccessResponse, PaginatedResponse } from '../dto/schemas/common.schemas';

@ApiTags('notas-movimentacao')
@ApiBearerAuth()
@Controller('api/notas-movimentacao')
export class NotasMovimentacaoController {
  constructor(
    private readonly gerenciarNotaUseCase: GerenciarNotaRascunhoUseCase,
    private readonly concluirNotaUseCase: ConcluirNotaMovimentacaoUseCase,
    private readonly cancelarNotaUseCase: CancelarNotaMovimentacaoUseCase,
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
    @Request() req: any,
  ): Promise<SuccessResponse> {
    const usuarioId = req.user?.id || 'user-temp'; // TODO: Implementar autenticação

    const nota = await this.gerenciarNotaUseCase.criarNota({
      tipo: criarNotaDto.tipo as TipoNotaMovimentacao,
      almoxarifadoOrigemId: criarNotaDto.almoxarifadoOrigemId,
      almoxarifadoDestinoId: criarNotaDto.almoxarifadoDestinoId,
      observacoes: criarNotaDto.observacoes,
      usuarioId,
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
    // TODO: Implementar paginação real
    const notas = await this.gerenciarNotaUseCase.listarRascunhos();
    
    return {
      success: true,
      data: notas,
      pagination: {
        page: Number(filtros.page),
        limit: Number(filtros.limit),
        total: notas.length,
        totalPages: Math.ceil(notas.length / Number(filtros.limit)),
        hasNext: false,
        hasPrev: false,
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
      observacoes: adicionarItemDto.observacoes,
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