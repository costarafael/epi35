import { FichaEPI } from '../../entities/ficha-epi.entity';
import { StatusFichaEPI } from '../../enums';
import { IBaseRepository } from './base.repository.interface';

export interface FichaFilters {
  colaboradorId?: string;
  tipoEpiId?: string;
  almoxarifadoId?: string;
  status?: StatusFichaEPI;
}

export interface FichaWithDetails extends FichaEPI {
  colaborador: {
    id: string;
    nome: string;
    cpf: string;
    matricula?: string;
    setor?: string;
    cargo?: string;
  };
  tipoEpi: {
    id: string;
    nome: string;
    codigo: string;
    exigeAssinaturaEntrega: boolean;
    validadeMeses?: number;
  };
  almoxarifado: {
    id: string;
    nome: string;
    codigo: string;
  };
}

export interface IFichaRepository extends IBaseRepository<FichaEPI> {
  findByColaboradorAndTipoEpi(
    colaboradorId: string,
    tipoEpiId: string,
    almoxarifadoId?: string,
  ): Promise<FichaEPI | null>;

  findByChaveUnica(
    colaboradorId: string,
    tipoEpiId: string,
    almoxarifadoId: string,
  ): Promise<FichaEPI | null>;

  findByColaborador(colaboradorId: string, status?: StatusFichaEPI): Promise<FichaEPI[]>;

  findByTipoEpi(tipoEpiId: string, status?: StatusFichaEPI): Promise<FichaEPI[]>;

  findByAlmoxarifado(almoxarifadoId: string, status?: StatusFichaEPI): Promise<FichaEPI[]>;

  findByFilters(filtros: FichaFilters): Promise<FichaEPI[]>;

  findWithDetails(id: string): Promise<FichaWithDetails | null>;

  findAllWithDetails(filtros?: FichaFilters): Promise<FichaWithDetails[]>;

  existsActiveForColaboradorAndTipo(
    colaboradorId: string,
    tipoEpiId: string,
    almoxarifadoId: string,
  ): Promise<boolean>;

  ativarFicha(id: string): Promise<FichaEPI>;

  inativarFicha(id: string): Promise<FichaEPI>;

  suspenderFicha(id: string, motivo?: string): Promise<FichaEPI>;

  obterFichasVencimento(
    diasAntecedencia: number,
    almoxarifadoId?: string,
  ): Promise<{
    fichaId: string;
    colaboradorNome: string;
    tipoEpiNome: string;
    dataVencimento: Date;
    diasRestantes: number;
  }[]>;

  obterEstatisticas(almoxarifadoId?: string): Promise<{
    totalFichas: number;
    fichasAtivas: number;
    fichasInativas: number;
    fichasSuspensas: number;
    porTipoEpi: { tipoEpiNome: string; quantidade: number }[];
    porColaborador: { colaboradorNome: string; quantidade: number }[];
  }>;

  criarOuAtivar(
    colaboradorId: string,
    tipoEpiId: string,
    almoxarifadoId: string,
  ): Promise<FichaEPI>;
}