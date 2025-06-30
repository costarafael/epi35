import { TipoMovimentacao } from '../../enums';
import { MovimentacaoEstoque } from '../../entities/movimentacao-estoque.entity';
import { IBaseRepository } from './base.repository.interface';

export interface MovimentacaoEstoqueFilters {
  almoxarifadoId?: string;
  tipoEpiId?: string;
  tipoMovimentacao?: TipoMovimentacao;
  usuarioId?: string;
  notaMovimentacaoId?: string;
  dataInicio?: Date;
  dataFim?: Date;
}

export interface KardexItem {
  data: Date;
  documento: string;
  tipoMovimentacao: TipoMovimentacao;
  quantidade: number;
  saldoAnterior: number;
  saldoPosterior: number;
  observacoes?: string;
}

export interface IMovimentacaoRepository extends IBaseRepository<MovimentacaoEstoque> {
  findByAlmoxarifadoAndTipo(
    almoxarifadoId: string,
    tipoEpiId: string,
    filtros?: Partial<MovimentacaoEstoqueFilters>,
  ): Promise<MovimentacaoEstoque[]>;

  findByNotaMovimentacao(notaMovimentacaoId: string): Promise<MovimentacaoEstoque[]>;

  findByFilters(filtros: MovimentacaoEstoqueFilters): Promise<MovimentacaoEstoque[]>;

  obterUltimaSaldo(almoxarifadoId: string, tipoEpiId: string): Promise<number>;

  obterKardex(
    almoxarifadoId: string,
    tipoEpiId: string,
    dataInicio?: Date,
    dataFim?: Date,
  ): Promise<KardexItem[]>;

  createMovimentacao(
    almoxarifadoId: string,
    tipoEpiId: string,
    tipoMovimentacao: TipoMovimentacao,
    quantidade: number,
    usuarioId: string,
    notaMovimentacaoId?: string,
    observacoes?: string,
  ): Promise<MovimentacaoEstoque>;

  criarEstorno(
    movimentacaoOriginalId: string,
    usuarioId: string,
    observacoes?: string,
  ): Promise<MovimentacaoEstoque>;

  findEstornaveis(almoxarifadoId?: string): Promise<MovimentacaoEstoque[]>;

  obterResumoMovimentacoes(
    dataInicio: Date,
    dataFim: Date,
    almoxarifadoId?: string,
  ): Promise<{
    tipoMovimentacao: TipoMovimentacao;
    quantidade: number;
    valor: number;
  }[]>;
}