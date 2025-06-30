import { Injectable, Inject } from '@nestjs/common';
import { INotaRepository } from '../../../domain/interfaces/repositories/nota-repository.interface';
import { NotaMovimentacao } from '../../../domain/entities/nota-movimentacao.entity';
import { TipoNotaMovimentacao } from '../../../domain/enums';
import { BusinessError, NotFoundError } from '../../../domain/exceptions/business.exception';

export interface CriarNotaRascunhoInput {
  tipo: TipoNotaMovimentacao;
  usuarioId: string;
  almoxarifadoOrigemId?: string;
  almoxarifadoDestinoId?: string;
  observacoes?: string;
}

export interface AdicionarItemInput {
  notaId: string;
  tipoEpiId: string;
  quantidade: number;
  observacoes?: string;
}

export interface AtualizarQuantidadeItemInput {
  notaId: string;
  tipoEpiId: string;
  quantidade: number;
}

@Injectable()
export class GerenciarNotaRascunhoUseCase {
  constructor(
    @Inject('INotaRepository')
    private readonly notaRepository: INotaRepository,
  ) {}

  async criarNota(input: CriarNotaRascunhoInput): Promise<NotaMovimentacao> {
    // Gerar próximo número
    const numero = await this.notaRepository.gerarProximoNumero(input.tipo);

    // Criar entidade usando factory method
    const notaData = NotaMovimentacao.create(
      numero,
      input.tipo,
      input.usuarioId,
      input.almoxarifadoOrigemId,
      input.almoxarifadoDestinoId,
      input.observacoes,
    );

    // Salvar no repositório  
    return await this.notaRepository.createNota(notaData);
  }

  async obterNota(notaId: string): Promise<NotaMovimentacao> {
    const nota = await this.notaRepository.findById(notaId);
    if (!nota) {
      throw new NotFoundError('Nota de movimentação', notaId);
    }
    return nota;
  }

  async obterNotaComItens(notaId: string) {
    const nota = await this.notaRepository.findWithItens(notaId);
    if (!nota) {
      throw new NotFoundError('Nota de movimentação', notaId);
    }
    return nota;
  }

  async listarRascunhos(usuarioId?: string): Promise<NotaMovimentacao[]> {
    return await this.notaRepository.findRascunhos(usuarioId);
  }

  async adicionarItem(input: AdicionarItemInput): Promise<void> {
    const nota = await this.obterNota(input.notaId);
    
    if (!nota.isEditavel()) {
      throw new BusinessError('Nota não está em modo de edição');
    }

    await this.notaRepository.adicionarItem(
      input.notaId,
      input.tipoEpiId,
      input.quantidade,
      input.observacoes,
    );
  }

  async removerItem(notaId: string, itemId: string): Promise<void> {
    const nota = await this.obterNota(notaId);
    
    if (!nota.isEditavel()) {
      throw new BusinessError('Nota não está em modo de edição');
    }

    await this.notaRepository.removerItem(notaId, itemId);
  }

  async atualizarQuantidadeItem(input: AtualizarQuantidadeItemInput): Promise<void> {
    const nota = await this.obterNota(input.notaId);
    
    if (!nota.isEditavel()) {
      throw new BusinessError('Nota não está em modo de edição');
    }

    if (input.quantidade <= 0) {
      throw new BusinessError('Quantidade deve ser positiva');
    }

    // Buscar o item específico através da nota com itens
    const notaComItens = await this.notaRepository.findWithItens(input.notaId);
    if (!notaComItens) {
      throw new NotFoundError('Nota de movimentação', input.notaId);
    }

    const item = notaComItens.itens.find(item => item.tipoEpiId === input.tipoEpiId);
    if (!item) {
      throw new BusinessError('Item não encontrado na nota');
    }

    await this.notaRepository.atualizarQuantidadeItem(
      input.notaId,
      item.id,
      input.quantidade,
    );
  }

  async atualizarObservacoes(notaId: string, observacoes: string): Promise<NotaMovimentacao> {
    const nota = await this.obterNota(notaId);
    
    if (!nota.isEditavel()) {
      throw new BusinessError('Nota não está em modo de edição');
    }

    return await this.notaRepository.update(notaId, { observacoes });
  }

  async excluirNota(notaId: string): Promise<void> {
    const nota = await this.obterNota(notaId);
    
    if (!nota.isRascunho()) {
      throw new BusinessError('Apenas notas em rascunho podem ser excluídas');
    }

    await this.notaRepository.delete(notaId);
  }
}