import { Contratada } from '../../entities/contratada.entity';
import { IBaseRepository } from './base.repository.interface';

export interface ContratadaFilters {
  nome?: string;
  cnpj?: string;
}

export interface IContratadaRepository extends IBaseRepository<Contratada> {
  findByCNPJ(cnpj: string): Promise<Contratada | null>;

  findByFilters(filtros: ContratadaFilters): Promise<Contratada[]>;

  searchByNome(nome: string): Promise<Contratada[]>;

  existsByCNPJ(cnpj: string, excludeId?: string): Promise<boolean>;

  obterEstatisticas(): Promise<{
    total: number;
    colaboradoresVinculados: number;
    colaboradoresSemContratada: number;
    topContratadas: Array<{
      contratada: {
        id: string;
        nome: string;
        cnpj: string;
      };
      totalColaboradores: number;
      totalEpisAtivos: number;
    }>;
  }>;
}