import { StatusNotaMovimentacao, TipoNotaMovimentacao } from '../../enums';
import { NotaMovimentacao } from '../../entities/nota-movimentacao.entity';
import { IBaseRepository } from './base.repository.interface';

export interface NotaMovimentacaoFilters {
  numero?: string;
  tipo?: TipoNotaMovimentacao;
  status?: StatusNotaMovimentacao;
  almoxarifadoOrigemId?: string;
  almoxarifadoDestinoId?: string;
  usuarioId?: string;
  dataInicio?: Date;
  dataFim?: Date;
}

export interface NotaMovimentacaoWithItens extends NotaMovimentacao {
  itens: {
    id: string;
    tipoEpiId: string;
    quantidade: number;
    custoUnitario?: number;
    quantidadeProcessada: number;
    observacoes?: string;
    tipoEpi: {
      nome: string;
      codigo: string;
    };
  }[];
}

export interface INotaRepository extends IBaseRepository<NotaMovimentacao> {
  createNota(entity: Omit<NotaMovimentacao, 'id' | 'createdAt' | 'updatedAt' | 'dataConclusao'>): Promise<NotaMovimentacao>;
  findByNumero(numero: string): Promise<NotaMovimentacao | null>;

  findByFilters(filtros: NotaMovimentacaoFilters): Promise<NotaMovimentacao[]>;

  findRascunhos(usuarioId?: string): Promise<NotaMovimentacao[]>;

  findPendentes(): Promise<NotaMovimentacao[]>;

  findWithItens(id: string): Promise<NotaMovimentacaoWithItens | null>;

  findByAlmoxarifado(
    almoxarifadoId: string,
    isOrigem: boolean,
  ): Promise<NotaMovimentacao[]>;

  gerarProximoNumero(tipo: TipoNotaMovimentacao): Promise<string>;

  concluirNota(
    id: string,
    usuarioId: string,
    dataConclusao?: Date,
  ): Promise<NotaMovimentacao>;

  cancelarNota(
    id: string,
    usuarioId: string,
    motivo?: string,
  ): Promise<NotaMovimentacao>;

  adicionarItem(
    notaId: string,
    tipoEpiId: string,
    quantidade: number,
    custoUnitario?: number,
  ): Promise<void>;

  removerItem(notaId: string, itemId: string): Promise<void>;

  atualizarQuantidadeItem(
    notaId: string,
    itemId: string,
    quantidade: number,
  ): Promise<void>;

  atualizarCustoUnitarioItem(
    notaId: string,
    itemId: string,
    custoUnitario: number,
  ): Promise<void>;

  atualizarQuantidadeProcessada(
    notaId: string,
    itemId: string,
    quantidadeProcessada: number,
  ): Promise<void>;

  obterEstatisticas(
    dataInicio: Date,
    dataFim: Date,
    almoxarifadoId?: string,
  ): Promise<{
    totalNotas: number;
    notasConcluidas: number;
    notasCanceladas: number;
    notasRascunho: number;
    totalItens: number;
    totalQuantidade: number;
  }>;

  obterNotasVencidas(): Promise<NotaMovimentacao[]>;
}