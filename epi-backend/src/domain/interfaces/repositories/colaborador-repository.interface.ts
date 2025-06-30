import { Colaborador } from '../../entities/colaborador.entity';
import { IBaseRepository } from './base.repository.interface';

export interface ColaboradorFilters {
  nome?: string;
  cpf?: string;
  matricula?: string;
  cargo?: string;
  setor?: string;
  unidadeNegocioId?: string;
  ativo?: boolean;
}

export interface IColaboradorRepository extends IBaseRepository<Colaborador> {
  findByCPF(cpf: string): Promise<Colaborador | null>;

  findByMatricula(matricula: string): Promise<Colaborador | null>;

  findByUnidadeNegocio(unidadeNegocioId: string): Promise<Colaborador[]>;

  findAtivos(unidadeNegocioId?: string): Promise<Colaborador[]>;

  findByFilters(filtros: ColaboradorFilters): Promise<Colaborador[]>;

  searchByNome(nome: string, unidadeNegocioId?: string): Promise<Colaborador[]>;

  existsByCPF(cpf: string, excludeId?: string): Promise<boolean>;

  existsByMatricula(matricula: string, excludeId?: string): Promise<boolean>;

  inativar(id: string): Promise<Colaborador>;

  ativar(id: string): Promise<Colaborador>;

  obterEstatisticas(unidadeNegocioId?: string): Promise<{
    total: number;
    ativos: number;
    inativos: number;
    porSetor: { setor: string; quantidade: number }[];
    porCargo: { cargo: string; quantidade: number }[];
  }>;
}