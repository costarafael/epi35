import { Injectable, Inject } from '@nestjs/common';
import { Contratada } from '../../../domain/entities/contratada.entity';
import { IContratadaRepository, ContratadaFilters } from '../../../domain/interfaces/repositories/contratada-repository.interface';

export interface ListarContratadasInput {
  nome?: string;
  cnpj?: string;
}

export interface ContratadaListOutput {
  id: string;
  nome: string;
  cnpj: string;
  cnpjFormatado: string;
  createdAt: Date;
}

export interface ListarContratadasOutput {
  contratadas: ContratadaListOutput[];
  total: number;
}

@Injectable()
export class ListarContratadasUseCase {
  constructor(
    @Inject('IContratadaRepository')
    private readonly contratadaRepository: IContratadaRepository,
  ) {}

  async execute(filtros: ListarContratadasInput = {}): Promise<ListarContratadasOutput> {
    const contratadas = await this.contratadaRepository.findByFilters(filtros);

    return {
      contratadas: contratadas.map(this.mapToListOutput),
      total: contratadas.length,
    };
  }

  async obterTodas(): Promise<ContratadaListOutput[]> {
    const contratadas = await this.contratadaRepository.findAll();
    return contratadas.map(this.mapToListOutput);
  }

  async buscarPorNome(nome: string): Promise<ContratadaListOutput[]> {
    const contratadas = await this.contratadaRepository.searchByNome(nome);
    return contratadas.map(this.mapToListOutput);
  }

  async obterEstatisticas(): Promise<{
    total: number;
    colaboradoresVinculados: number;
    colaboradoresSemContratada: number;
    topContratadas: Array<{
      contratada: {
        id: string;
        nome: string;
        cnpjFormatado: string;
      };
      totalColaboradores: number;
    }>;
  }> {
    const stats = await this.contratadaRepository.obterEstatisticas();
    
    return {
      ...stats,
      topContratadas: stats.topContratadas.map(item => ({
        contratada: {
          id: item.contratada.id,
          nome: item.contratada.nome,
          cnpjFormatado: this.formatCNPJ(item.contratada.cnpj),
        },
        totalColaboradores: item.totalColaboradores,
      })),
    };
  }

  private mapToListOutput = (contratada: Contratada): ContratadaListOutput => {
    return {
      id: contratada.id,
      nome: contratada.nome,
      cnpj: contratada.cnpj,
      cnpjFormatado: contratada.getFormattedCNPJ(),
      createdAt: contratada.createdAt,
    };
  };

  private formatCNPJ(cnpj: string): string {
    const cleanCNPJ = cnpj.replace(/\D/g, '');
    return cleanCNPJ.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  }
}