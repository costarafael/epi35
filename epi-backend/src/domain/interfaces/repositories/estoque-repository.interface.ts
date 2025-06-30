import { StatusEstoqueItem } from '../../enums';
import { EstoqueItem } from '../../entities/estoque-item.entity';
import { IBaseRepository } from './base.repository.interface';

export interface IEstoqueRepository extends IBaseRepository<EstoqueItem> {
  findByAlmoxarifadoAndTipo(
    almoxarifadoId: string,
    tipoEpiId: string,
    status?: StatusEstoqueItem,
  ): Promise<EstoqueItem | null>;

  findByAlmoxarifado(almoxarifadoId: string): Promise<EstoqueItem[]>;

  findByTipoEpi(tipoEpiId: string): Promise<EstoqueItem[]>;

  findDisponiveis(almoxarifadoId?: string): Promise<EstoqueItem[]>;

  atualizarQuantidade(
    almoxarifadoId: string,
    tipoEpiId: string,
    status: StatusEstoqueItem,
    novaQuantidade: number,
  ): Promise<EstoqueItem>;

  adicionarQuantidade(
    almoxarifadoId: string,
    tipoEpiId: string,
    status: StatusEstoqueItem,
    quantidade: number,
  ): Promise<EstoqueItem>;

  removerQuantidade(
    almoxarifadoId: string,
    tipoEpiId: string,
    status: StatusEstoqueItem,
    quantidade: number,
  ): Promise<EstoqueItem>;

  verificarDisponibilidade(
    almoxarifadoId: string,
    tipoEpiId: string,
    quantidadeRequerida: number,
  ): Promise<boolean>;

  obterSaldoTotal(tipoEpiId: string): Promise<number>;

  obterSaldoPorAlmoxarifado(almoxarifadoId: string): Promise<EstoqueItem[]>;

  criarOuAtualizar(
    almoxarifadoId: string,
    tipoEpiId: string,
    status: StatusEstoqueItem,
    quantidade: number,
  ): Promise<EstoqueItem>;
}