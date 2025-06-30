import { StatusEntrega, StatusEntregaItem } from '../enums';
import { BusinessError } from '../exceptions/business.exception';

export interface EntregaItemData {
  id?: string;
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

export class Entrega {
  constructor(
    public readonly id: string,
    public readonly fichaEpiId: string,
    public readonly colaboradorId: string,
    public readonly dataEntrega: Date,
    public readonly dataVencimento: Date | null,
    public readonly assinaturaColaborador: string | null,
    public readonly observacoes: string | null,
    private _status: StatusEntrega,
    public readonly createdAt: Date,
    public readonly updatedAt: Date,
    private _itens: EntregaItemData[] = [],
  ) {
    this.validate();
  }

  get status(): StatusEntrega {
    return this._status;
  }

  get itens(): readonly EntregaItemData[] {
    return this._itens;
  }

  private validate(): void {
    if (!this.fichaEpiId) {
      throw new BusinessError('Ficha de EPI é obrigatória');
    }

    if (!this.colaboradorId) {
      throw new BusinessError('Colaborador é obrigatório');
    }

    if (!this.dataEntrega) {
      throw new BusinessError('Data de entrega é obrigatória');
    }

    if (this.dataEntrega > new Date()) {
      throw new BusinessError('Data de entrega não pode ser futura');
    }

    if (this.dataVencimento && this.dataVencimento <= this.dataEntrega) {
      throw new BusinessError('Data de vencimento deve ser posterior à data de entrega');
    }
  }

  public isAtiva(): boolean {
    return this._status === StatusEntrega.ATIVA;
  }

  public isDevolvida(): boolean {
    return this._status === StatusEntrega.DEVOLVIDA_TOTAL || 
           this._status === StatusEntrega.DEVOLVIDA_PARCIAL;
  }

  public isDevolvadaParcial(): boolean {
    return this._status === StatusEntrega.DEVOLVIDA_PARCIAL;
  }

  public isDevolvadaTotal(): boolean {
    return this._status === StatusEntrega.DEVOLVIDA_TOTAL;
  }

  public isCancelada(): boolean {
    return this._status === StatusEntrega.CANCELADA;
  }

  public isVencida(): boolean {
    if (!this.dataVencimento) {
      return false;
    }
    return new Date() > this.dataVencimento;
  }

  public isProximaVencimento(diasAntecedencia: number = 30): boolean {
    if (!this.dataVencimento) {
      return false;
    }
    
    const hoje = new Date();
    const dataLimite = new Date();
    dataLimite.setDate(hoje.getDate() + diasAntecedencia);
    
    return this.dataVencimento <= dataLimite && this.dataVencimento > hoje;
  }

  public podeSerDevolvida(): boolean {
    return this.isAtiva() && this.temItensEntregues();
  }

  public podeSerCancelada(): boolean {
    return this.isAtiva() && !this.temItensDevolvidos();
  }

  public temItensEntregues(): boolean {
    return this._itens.some(item => item.status === StatusEntregaItem.ENTREGUE);
  }

  public temItensDevolvidos(): boolean {
    return this._itens.some(item => item.status === StatusEntregaItem.DEVOLVIDO);
  }

  public getQuantidadeTotal(): number {
    return this._itens.reduce((total, item) => total + item.quantidadeEntregue, 0);
  }

  public getQuantidadeEntregue(): number {
    return this._itens
      .filter(item => item.status === StatusEntregaItem.ENTREGUE)
      .reduce((total, item) => total + item.quantidadeEntregue, 0);
  }

  public getQuantidadeDevolvida(): number {
    return this._itens
      .filter(item => item.status === StatusEntregaItem.DEVOLVIDO)
      .reduce((total, item) => total + item.quantidadeEntregue, 0);
  }

  public adicionarItem(itemData: Omit<EntregaItemData, 'id' | 'status'>): void {
    if (itemData.quantidadeEntregue !== 1) {
      throw new BusinessError('Quantidade entregue deve ser sempre 1 para rastreabilidade unitária');
    }

    const novoItem: EntregaItemData = {
      ...itemData,
      status: StatusEntregaItem.ENTREGUE,
    };

    this._itens.push(novoItem);
  }

  public devolverItem(itemId: string, motivoDevolucao?: string): void {
    if (!this.podeSerDevolvida()) {
      throw new BusinessError('Entrega não pode ser devolvida');
    }

    const item = this._itens.find(i => i.id === itemId);
    if (!item) {
      throw new BusinessError('Item não encontrado na entrega');
    }

    if (item.status !== StatusEntregaItem.ENTREGUE) {
      throw new BusinessError('Item não está em status de entregue');
    }

    item.status = StatusEntregaItem.DEVOLVIDO;
    item.dataDevolucao = new Date();
    item.motivoDevolucao = motivoDevolucao;

    this.atualizarStatusEntrega();
  }

  public marcarItemComoPerdido(itemId: string, motivo?: string): void {
    const item = this._itens.find(i => i.id === itemId);
    if (!item) {
      throw new BusinessError('Item não encontrado na entrega');
    }

    if (item.status !== StatusEntregaItem.ENTREGUE) {
      throw new BusinessError('Item não está em status de entregue');
    }

    item.status = StatusEntregaItem.PERDIDO;
    item.motivoDevolucao = motivo || 'Item perdido';

    this.atualizarStatusEntrega();
  }

  public marcarItemComoDanificado(itemId: string, motivo?: string): void {
    const item = this._itens.find(i => i.id === itemId);
    if (!item) {
      throw new BusinessError('Item não encontrado na entrega');
    }

    if (item.status !== StatusEntregaItem.ENTREGUE) {
      throw new BusinessError('Item não está em status de entregue');
    }

    item.status = StatusEntregaItem.DANIFICADO;
    item.motivoDevolucao = motivo || 'Item danificado';

    this.atualizarStatusEntrega();
  }

  private atualizarStatusEntrega(): void {
    const itensEntregues = this._itens.filter(item => item.status === StatusEntregaItem.ENTREGUE);
    const itensDevolvidos = this._itens.filter(item => 
      [StatusEntregaItem.DEVOLVIDO, StatusEntregaItem.PERDIDO, StatusEntregaItem.DANIFICADO].includes(item.status)
    );

    if (itensDevolvidos.length === 0) {
      this._status = StatusEntrega.ATIVA;
    } else if (itensEntregues.length === 0) {
      this._status = StatusEntrega.DEVOLVIDA_TOTAL;
    } else {
      this._status = StatusEntrega.DEVOLVIDA_PARCIAL;
    }
  }

  public cancelar(): void {
    if (!this.podeSerCancelada()) {
      throw new BusinessError('Entrega não pode ser cancelada');
    }

    this._status = StatusEntrega.CANCELADA;
  }

  public calcularDiasUso(itemId?: string): number {
    const hoje = new Date();
    
    if (itemId) {
      const item = this._itens.find(i => i.id === itemId);
      if (!item) {
        throw new BusinessError('Item não encontrado');
      }
      
      const dataFim = item.dataDevolucao || hoje;
      return Math.floor((dataFim.getTime() - this.dataEntrega.getTime()) / (1000 * 60 * 60 * 24));
    }

    // Calcular dias de uso médio para todos os itens
    return Math.floor((hoje.getTime() - this.dataEntrega.getTime()) / (1000 * 60 * 60 * 24));
  }

  public static create(
    fichaEpiId: string,
    colaboradorId: string,
    dataEntrega: Date = new Date(),
    dataVencimento?: Date,
    assinaturaColaborador?: string,
    observacoes?: string,
  ): Omit<Entrega, 'id' | 'createdAt' | 'updatedAt'> {
    return {
      fichaEpiId,
      colaboradorId,
      dataEntrega,
      dataVencimento: dataVencimento || null,
      assinaturaColaborador: assinaturaColaborador || null,
      observacoes: observacoes || null,
      status: StatusEntrega.ATIVA,
      itens: [],
      isAtiva: Entrega.prototype.isAtiva,
      isDevolvida: Entrega.prototype.isDevolvida,
      isDevolvadaParcial: Entrega.prototype.isDevolvadaParcial,
      isDevolvadaTotal: Entrega.prototype.isDevolvadaTotal,
      isCancelada: Entrega.prototype.isCancelada,
      isVencida: Entrega.prototype.isVencida,
      isProximaVencimento: Entrega.prototype.isProximaVencimento,
      podeSerDevolvida: Entrega.prototype.podeSerDevolvida,
      podeSerCancelada: Entrega.prototype.podeSerCancelada,
      temItensEntregues: Entrega.prototype.temItensEntregues,
      temItensDevolvidos: Entrega.prototype.temItensDevolvidos,
      getQuantidadeTotal: Entrega.prototype.getQuantidadeTotal,
      getQuantidadeEntregue: Entrega.prototype.getQuantidadeEntregue,
      getQuantidadeDevolvida: Entrega.prototype.getQuantidadeDevolvida,
      adicionarItem: Entrega.prototype.adicionarItem,
      devolverItem: Entrega.prototype.devolverItem,
      marcarItemComoPerdido: Entrega.prototype.marcarItemComoPerdido,
      marcarItemComoDanificado: Entrega.prototype.marcarItemComoDanificado,
      cancelar: Entrega.prototype.cancelar,
      calcularDiasUso: Entrega.prototype.calcularDiasUso,
    } as any;
  }
}