import { Injectable } from '@nestjs/common';

export interface FichaEpiData {
  id: string;
  colaboradorId: string;
  dataEmissao: Date;
  status: string;
  createdAt: Date;
  colaborador?: {
    id: string;
    nome: string;
    contratadaId?: string;
    contratada?: {
      nome: string;
      cnpj: string;
    };
  };
  entregas?: any[];
}

export interface FichaOutput {
  id: string;
  colaboradorId: string;
  colaboradorNome?: string;
  contratadaNome?: string;
  dataEmissao: string;
  status: string;
  totalEntregas: number;
  itensAtivos: number;
  ultimaEntrega?: string;
  createdAt: string;
}

export interface ListaFichasOutput {
  fichas: FichaOutput[];
  resumo: {
    totalFichas: number;
    fichasAtivas: number;
    fichasInativas: number;
    fichasSuspensas: number;
    percentualAtivas: number;
  };
}

export interface EstatisticasFichas {
  totalFichas: number;
  fichasAtivas: number;
  fichasInativas: number;
  fichasSuspensas: number;
  colaboradoresComFicha: number;
  fichasPorContratada: Array<{
    contratadaId: string;
    contratadaNome: string;
    totalFichas: number;
    fichasAtivas: number;
  }>;
  crescimentoMensal: {
    fichasCriadas: number;
    percentualCrescimento: number;
  };
}

@Injectable()
export class FichaFormatterService {
  /**
   * Formata uma ficha individual para output
   */
  formatarFichaOutput(ficha: FichaEpiData): FichaOutput {
    const totalEntregas = ficha.entregas?.length || 0;
    const itensAtivos = ficha.entregas?.filter(e => e.status === 'ASSINADA')
      .reduce((total: number, entrega: any) => {
        return total + (entrega.entregaItens?.filter((item: any) => item.status === 'COM_COLABORADOR').length || 0);
      }, 0) || 0;

    const ultimaEntrega = ficha.entregas?.length > 0 
      ? new Date(Math.max(...ficha.entregas.map(e => new Date(e.dataEntrega).getTime())))
      : null;

    return {
      id: ficha.id,
      colaboradorId: ficha.colaboradorId,
      colaboradorNome: ficha.colaborador?.nome,
      contratadaNome: ficha.colaborador?.contratada?.nome,
      dataEmissao: ficha.dataEmissao.toISOString(),
      status: ficha.status,
      totalEntregas,
      itensAtivos,
      ultimaEntrega: ultimaEntrega?.toISOString(),
      createdAt: ficha.createdAt.toISOString(),
    };
  }

  /**
   * Formata lista de fichas com resumo
   */
  formatarListaFichas(fichas: FichaEpiData[]): ListaFichasOutput {
    const fichasFormatadas = fichas.map(ficha => this.formatarFichaOutput(ficha));

    const totalFichas = fichas.length;
    const fichasAtivas = fichas.filter(f => f.status === 'ATIVA').length;
    const fichasInativas = fichas.filter(f => f.status === 'INATIVA').length;
    const fichasSuspensas = fichas.filter(f => f.status === 'SUSPENSA').length;
    const percentualAtivas = totalFichas > 0 ? Math.round((fichasAtivas / totalFichas) * 100) : 0;

    return {
      fichas: fichasFormatadas,
      resumo: {
        totalFichas,
        fichasAtivas,
        fichasInativas,
        fichasSuspensas,
        percentualAtivas,
      },
    };
  }

  /**
   * Formata estatísticas completas de fichas
   */
  formatarEstatisticasFichas(
    fichas: FichaEpiData[],
    fichasCriadasMesAtual: number = 0,
    fichasCriadasMesAnterior: number = 0
  ): EstatisticasFichas {
    const totalFichas = fichas.length;
    const fichasAtivas = fichas.filter(f => f.status === 'ATIVA').length;
    const fichasInativas = fichas.filter(f => f.status === 'INATIVA').length;
    const fichasSuspensas = fichas.filter(f => f.status === 'SUSPENSA').length;
    
    const colaboradoresComFicha = new Set(fichas.map(f => f.colaboradorId)).size;

    // Agrupar por contratada
    const fichasPorContratadaMap = new Map();
    fichas.forEach(ficha => {
      if (ficha.colaborador?.contratada) {
        const contratadaId = ficha.colaborador.contratadaId;
        const contratadaNome = ficha.colaborador.contratada.nome;
        
        if (!fichasPorContratadaMap.has(contratadaId)) {
          fichasPorContratadaMap.set(contratadaId, {
            contratadaId,
            contratadaNome,
            totalFichas: 0,
            fichasAtivas: 0,
          });
        }
        
        const stats = fichasPorContratadaMap.get(contratadaId);
        stats.totalFichas++;
        if (ficha.status === 'ATIVA') {
          stats.fichasAtivas++;
        }
      }
    });

    const fichasPorContratada = Array.from(fichasPorContratadaMap.values());

    // Calcular crescimento mensal
    const percentualCrescimento = fichasCriadasMesAnterior > 0
      ? Math.round(((fichasCriadasMesAtual - fichasCriadasMesAnterior) / fichasCriadasMesAnterior) * 100)
      : fichasCriadasMesAtual > 0 ? 100 : 0;

    return {
      totalFichas,
      fichasAtivas,
      fichasInativas,
      fichasSuspensas,
      colaboradoresComFicha,
      fichasPorContratada,
      crescimentoMensal: {
        fichasCriadas: fichasCriadasMesAtual,
        percentualCrescimento,
      },
    };
  }

  /**
   * Formata dados para validação de criação de ficha
   */
  formatarValidacaoFicha(validacao: {
    fichaExistente: boolean;
    colaboradorExiste: boolean;
    colaboradorNome?: string;
    fichaId?: string;
    motivoErro?: string;
  }) {
    return {
      podecriar: !validacao.fichaExistente && validacao.colaboradorExiste,
      fichaExistente: validacao.fichaExistente,
      colaboradorExiste: validacao.colaboradorExiste,
      colaboradorNome: validacao.colaboradorNome,
      fichaId: validacao.fichaId,
      motivoErro: validacao.motivoErro,
      recomendacao: this.gerarRecomendacaoValidacao(validacao),
    };
  }

  /**
   * Gera recomendação baseada na validação
   */
  private gerarRecomendacaoValidacao(validacao: any): string {
    if (!validacao.colaboradorExiste) {
      return 'Verifique se o ID do colaborador está correto e se o colaborador existe no sistema';
    }
    
    if (validacao.fichaExistente) {
      return 'Uma ficha já existe para este colaborador. Use a ficha existente ou reative-a se necessário';
    }
    
    return 'Ficha pode ser criada normalmente';
  }
}