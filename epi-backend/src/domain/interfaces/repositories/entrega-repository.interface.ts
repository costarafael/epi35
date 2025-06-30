import { Entrega, EntregaItemData } from '../../entities/entrega.entity';
import { StatusEntrega, StatusEntregaItem } from '../../enums';
import { IBaseRepository } from './base.repository.interface';

export interface EntregaFilters {
  fichaEpiId?: string;
  colaboradorId?: string;
  status?: StatusEntrega;
  dataEntregaInicio?: Date;
  dataEntregaFim?: Date;
  dataVencimentoInicio?: Date;
  dataVencimentoFim?: Date;
  almoxarifadoId?: string;
  tipoEpiId?: string;
}

export interface EntregaWithDetails extends Entrega {
  colaborador: {
    id: string;
    nome: string;
    cpf: string;
    matricula?: string;
  };
  fichaEpi: {
    id: string;
    tipoEpiId: string;
    almoxarifadoId: string;
  };
  tipoEpi: {
    id: string;
    nome: string;
    codigo: string;
    validadeMeses?: number;
    exigeAssinaturaEntrega: boolean;
  };
  almoxarifado: {
    id: string;
    nome: string;
    codigo: string;
  };
  itens: (EntregaItemData & {
    tipoEpi: {
      nome: string;
      codigo: string;
    };
  })[];
}

export interface EntregaItem {
  id: string;
  entregaId: string;
  tipoEpiId: string;
  quantidadeEntregue: number;
  numeroSerie?: string;
  lote?: string;
  dataFabricacao?: Date;
  dataVencimento?: Date;
  status: StatusEntregaItem;
  dataDevolucao?: Date;
  motivoDevolucao?: string;
}

export interface IEntregaRepository extends IBaseRepository<Entrega> {
  findByFichaEpi(fichaEpiId: string, status?: StatusEntrega): Promise<Entrega[]>;

  findByColaborador(colaboradorId: string, status?: StatusEntrega): Promise<Entrega[]>;

  findByFilters(filtros: EntregaFilters): Promise<Entrega[]>;

  findWithDetails(id: string): Promise<EntregaWithDetails | null>;

  findAllWithDetails(filtros?: EntregaFilters): Promise<EntregaWithDetails[]>;

  findAtivas(colaboradorId?: string, tipoEpiId?: string): Promise<Entrega[]>;

  findVencidas(diasTolerancia?: number): Promise<Entrega[]>;

  findProximasVencimento(diasAntecedencia: number): Promise<Entrega[]>;

  findComAssinaturaPendente(): Promise<Entrega[]>;

  // Métodos para itens de entrega
  adicionarItem(entregaId: string, item: Omit<EntregaItemData, 'id' | 'status'>): Promise<EntregaItem>;

  atualizarStatusItem(itemId: string, status: StatusEntregaItem, motivo?: string): Promise<EntregaItem>;

  findItensEntregues(entregaId: string): Promise<EntregaItem[]>;

  findItemBySerieOuLote(numeroSerie?: string, lote?: string): Promise<EntregaItem | null>;

  // Métodos para devolução
  processarDevolucaoItem(
    itemId: string,
    motivoDevolucao?: string,
    usuarioId?: string,
  ): Promise<EntregaItem>;

  processarDevolucaoCompleta(
    entregaId: string,
    motivoDevolucao?: string,
    usuarioId?: string,
  ): Promise<EntregaItem[]>;

  // Relatórios e estatísticas
  obterEntregasPorPeriodo(
    dataInicio: Date,
    dataFim: Date,
    almoxarifadoId?: string,
  ): Promise<{
    totalEntregas: number;
    totalItens: number;
    entregasAtivas: number;
    entregasDevolvidas: number;
    porTipoEpi: { tipoEpiNome: string; quantidade: number }[];
    porColaborador: { colaboradorNome: string; quantidade: number }[];
  }>;

  obterKardexColaborador(
    colaboradorId: string,
    tipoEpiId?: string,
    dataInicio?: Date,
    dataFim?: Date,
  ): Promise<{
    data: Date;
    operacao: 'ENTREGA' | 'DEVOLUCAO' | 'PERDA' | 'DANIFICADO';
    tipoEpiNome: string;
    quantidade: number;
    observacoes?: string;
    vencimento?: Date;
  }[]>;

  obterPosseAtual(colaboradorId: string): Promise<{
    tipoEpiId: string;
    tipoEpiNome: string;
    quantidadePosse: number;
    dataUltimaEntrega: Date;
    dataVencimento?: Date;
    diasUso: number;
    status: 'ATIVO' | 'VENCIDO' | 'PROXIMO_VENCIMENTO';
  }[]>;

  obterHistoricoItem(numeroSerie?: string, lote?: string): Promise<{
    entregaId: string;
    colaboradorNome: string;
    dataEntrega: Date;
    dataDevolucao?: Date;
    status: StatusEntregaItem;
    motivoDevolucao?: string;
    diasUso?: number;
  }[]>;

  // Validações
  validarAssinaturaObrigatoria(entregaId: string): Promise<boolean>;

  validarDisponibilidadeColaborador(
    colaboradorId: string,
    tipoEpiId: string,
    quantidade: number,
  ): Promise<{
    podeReceber: boolean;
    motivo?: string;
    posseAtual: number;
    limitePermitido?: number;
  }>;
}