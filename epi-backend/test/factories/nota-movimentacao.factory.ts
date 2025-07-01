import { NotaMovimentacao, NotaMovimentacaoItem } from '../../src/domain/entities/nota-movimentacao.entity';
import { StatusNotaMovimentacao, TipoNotaMovimentacao } from '../../src/domain/enums';

export interface NotaMovimentacaoFactoryProps {
  id?: string;
  numero?: string;
  tipo?: TipoNotaMovimentacao;
  almoxarifadoOrigemId?: string | null;
  almoxarifadoDestinoId?: string | null;
  usuarioId?: string;
  observacoes?: string | null;
  status?: StatusNotaMovimentacao;
  dataConclusao?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  itens?: NotaMovimentacaoItem[];
}

export class NotaMovimentacaoFactory {
  static create(props: NotaMovimentacaoFactoryProps = {}): NotaMovimentacao {
    const now = new Date();
    
    return new NotaMovimentacao(
      props.id ?? 'nota-id-test',
      props.numero ?? 'ENT-001',
      props.tipo ?? TipoNotaMovimentacao.ENTRADA,
      props.almoxarifadoOrigemId ?? null,
      props.almoxarifadoDestinoId ?? 'almoxarifado-destino-id',
      props.usuarioId ?? 'usuario-id-test',
      props.observacoes ?? null,
      props.status ?? StatusNotaMovimentacao.RASCUNHO,
      props.dataConclusao ?? null,
      props.createdAt ?? now,
      props.updatedAt ?? now,
      props.itens ?? []
    );
  }

  static createEntrada(props: Partial<NotaMovimentacaoFactoryProps> = {}): NotaMovimentacao {
    return this.create({
      ...props,
      tipo: TipoNotaMovimentacao.ENTRADA,
      almoxarifadoOrigemId: null,
      almoxarifadoDestinoId: props.almoxarifadoDestinoId ?? 'almoxarifado-destino-id',
      numero: props.numero ?? 'ENT-001'
    });
  }

  static createTransferencia(props: Partial<NotaMovimentacaoFactoryProps> = {}): NotaMovimentacao {
    return this.create({
      ...props,
      tipo: TipoNotaMovimentacao.TRANSFERENCIA,
      almoxarifadoOrigemId: props.almoxarifadoOrigemId ?? 'almoxarifado-origem-id',
      almoxarifadoDestinoId: props.almoxarifadoDestinoId ?? 'almoxarifado-destino-id',
      numero: props.numero ?? 'TRF-001'
    });
  }

  static createDescarte(props: Partial<NotaMovimentacaoFactoryProps> = {}): NotaMovimentacao {
    return this.create({
      ...props,
      tipo: TipoNotaMovimentacao.DESCARTE,
      almoxarifadoOrigemId: props.almoxarifadoOrigemId ?? 'almoxarifado-origem-id',
      almoxarifadoDestinoId: null,
      numero: props.numero ?? 'DESC-001'
    });
  }

  static createAjuste(props: Partial<NotaMovimentacaoFactoryProps> = {}): NotaMovimentacao {
    return this.create({
      ...props,
      tipo: TipoNotaMovimentacao.AJUSTE,
      almoxarifadoOrigemId: null,
      almoxarifadoDestinoId: props.almoxarifadoDestinoId ?? 'almoxarifado-destino-id',
      numero: props.numero ?? 'AJU-001'
    });
  }

  static createRascunho(props: Partial<NotaMovimentacaoFactoryProps> = {}): NotaMovimentacao {
    return this.create({
      ...props,
      status: StatusNotaMovimentacao.RASCUNHO
    });
  }

  static createConcluida(props: Partial<NotaMovimentacaoFactoryProps> = {}): NotaMovimentacao {
    return this.create({
      ...props,
      status: StatusNotaMovimentacao.CONCLUIDA,
      dataConclusao: props.dataConclusao ?? new Date()
    });
  }

  static createCancelada(props: Partial<NotaMovimentacaoFactoryProps> = {}): NotaMovimentacao {
    return this.create({
      ...props,
      status: StatusNotaMovimentacao.CANCELADA
    });
  }

  static createWithItens(props: Partial<NotaMovimentacaoFactoryProps> = {}): NotaMovimentacao {
    const defaultItens: NotaMovimentacaoItem[] = [
      {
        id: 'item-1',
        tipoEpiId: 'tipo-epi-1',
        quantidade: 10,
        quantidadeProcessada: 0,
        observacoes: 'Item de teste 1'
      },
      {
        id: 'item-2',
        tipoEpiId: 'tipo-epi-2',
        quantidade: 5,
        quantidadeProcessada: 0,
        observacoes: 'Item de teste 2'
      }
    ];

    return this.create({
      ...props,
      itens: props.itens ?? defaultItens
    });
  }
}

export interface NotaMovimentacaoItemFactoryProps {
  id?: string;
  tipoEpiId?: string;
  quantidade?: number;
  quantidadeProcessada?: number;
  observacoes?: string;
}

export class NotaMovimentacaoItemFactory {
  static create(props: NotaMovimentacaoItemFactoryProps = {}): NotaMovimentacaoItem {
    return {
      id: props.id ?? 'item-id-test',
      tipoEpiId: props.tipoEpiId ?? 'tipo-epi-id-test',
      quantidade: props.quantidade ?? 10,
      quantidadeProcessada: props.quantidadeProcessada ?? 0,
      observacoes: props.observacoes ?? 'Item de teste'
    };
  }

  static createMultiple(count: number, baseProps: NotaMovimentacaoItemFactoryProps = {}): NotaMovimentacaoItem[] {
    return Array.from({ length: count }, (_, index) => 
      this.create({
        ...baseProps,
        id: `${baseProps.id ?? 'item'}-${index + 1}`,
        tipoEpiId: `${baseProps.tipoEpiId ?? 'tipo-epi'}-${index + 1}`
      })
    );
  }
}