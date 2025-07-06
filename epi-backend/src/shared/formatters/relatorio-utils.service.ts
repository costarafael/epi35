import { Injectable } from '@nestjs/common';
import { BadRequestException } from '@nestjs/common';

export interface FiltrosData {
  dataInicio?: string;
  dataFim?: string;
  almoxarifadoId?: string;
  unidadeNegocioId?: string;
  tipoEpiId?: string;
  colaboradorId?: string;
  responsavelId?: string;
  contratadaId?: string;
}

@Injectable()
export class RelatorioUtilsService {
  /**
   * Valida filtros comuns de data
   */
  validarFiltrosData(filtros: FiltrosData): void {
    if (filtros.dataInicio && filtros.dataFim) {
      const dataInicio = new Date(filtros.dataInicio);
      const dataFim = new Date(filtros.dataFim);

      if (dataInicio > dataFim) {
        throw new BadRequestException('Data início não pode ser maior que data fim');
      }

      const diffDias = Math.ceil((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24));
      
      // Limite de 1 ano para evitar consultas muito pesadas
      if (diffDias > 365) {
        throw new BadRequestException('Período máximo permitido é de 1 ano');
      }
    }
  }

  /**
   * Converte strings de data para objetos Date
   */
  converterDatas(filtros: FiltrosData): { dataInicio?: Date; dataFim?: Date } {
    return {
      dataInicio: filtros.dataInicio ? new Date(filtros.dataInicio) : undefined,
      dataFim: filtros.dataFim ? new Date(filtros.dataFim) : undefined,
    };
  }

  /**
   * Aplica filtros de data numa query builder
   */
  aplicarFiltrosData(query: any, filtros: FiltrosData, campoData: string = 'createdAt'): any {
    const { dataInicio, dataFim } = this.converterDatas(filtros);

    if (dataInicio || dataFim) {
      const where = query.where || {};
      
      if (dataInicio && dataFim) {
        where[campoData] = {
          gte: dataInicio,
          lte: dataFim,
        };
      } else if (dataInicio) {
        where[campoData] = {
          gte: dataInicio,
        };
      } else if (dataFim) {
        where[campoData] = {
          lte: dataFim,
        };
      }

      return { ...query, where };
    }

    return query;
  }

  /**
   * Valida se UUIDs fornecidos têm formato válido
   */
  validarUUIDs(filtros: FiltrosData): void {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    
    const camposUUID = [
      'almoxarifadoId', 'unidadeNegocioId', 'tipoEpiId', 
      'colaboradorId', 'responsavelId', 'contratadaId'
    ];

    for (const campo of camposUUID) {
      const valor = filtros[campo as keyof FiltrosData];
      if (valor && !uuidRegex.test(valor)) {
        throw new BadRequestException(`Campo ${campo} deve ser um UUID válido`);
      }
    }
  }

  /**
   * Calcula período padrão (últimos 30 dias) se não fornecido
   */
  calcularPeriodoPadrao(): { dataInicio: Date; dataFim: Date } {
    const dataFim = new Date();
    const dataInicio = new Date();
    dataInicio.setDate(dataInicio.getDate() - 30);

    return { dataInicio, dataFim };
  }

  /**
   * Formata valores monetários para exibição
   */
  formatarValorMonetario(valor: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  }

  /**
   * Calcula percentual de variação entre dois valores
   */
  calcularVariacaoPercentual(valorAtual: number, valorAnterior: number): number {
    if (valorAnterior === 0) {
      return valorAtual > 0 ? 100 : 0;
    }
    
    return Math.round(((valorAtual - valorAnterior) / valorAnterior) * 100);
  }

  /**
   * Gera resumo estatístico de uma lista numérica
   */
  calcularEstatisticasNumericas(valores: number[]) {
    if (valores.length === 0) {
      return {
        total: 0,
        media: 0,
        maximo: 0,
        minimo: 0,
        mediana: 0,
      };
    }

    const valoresOrdenados = [...valores].sort((a, b) => a - b);
    const total = valores.reduce((sum, val) => sum + val, 0);
    const media = total / valores.length;
    const maximo = Math.max(...valores);
    const minimo = Math.min(...valores);
    
    const meio = Math.floor(valoresOrdenados.length / 2);
    const mediana = valoresOrdenados.length % 2 === 0
      ? (valoresOrdenados[meio - 1] + valoresOrdenados[meio]) / 2
      : valoresOrdenados[meio];

    return {
      total,
      media: Math.round(media * 100) / 100,
      maximo,
      minimo,
      mediana,
    };
  }
}