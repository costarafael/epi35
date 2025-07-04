import { Injectable, Inject } from '@nestjs/common';
import { Contratada } from '../../../domain/entities/contratada.entity';
import { IContratadaRepository } from '../../../domain/interfaces/repositories/contratada-repository.interface';
import { BusinessError } from '../../../domain/exceptions/business.exception';

export interface CriarContratadaInput {
  nome: string;
  cnpj: string;
}

export interface ContratadaOutput {
  id: string;
  nome: string;
  cnpj: string;
  cnpjFormatado: string;
  createdAt: Date;
}

@Injectable()
export class CriarContratadaUseCase {
  constructor(
    @Inject('IContratadaRepository')
    private readonly contratadaRepository: IContratadaRepository,
  ) {}

  async execute(input: CriarContratadaInput): Promise<ContratadaOutput> {
    // Validar dados de entrada
    this.validarInput(input);

    // Criar entidade de domínio (irá validar automaticamente)
    const contratadaData = Contratada.create(
      input.nome,
      input.cnpj,
    );

    // Salvar no banco de dados
    const contratada = await this.contratadaRepository.create(contratadaData);

    return this.mapToOutput(contratada);
  }

  private validarInput(input: CriarContratadaInput): void {
    if (!input.nome || input.nome.trim().length === 0) {
      throw new BusinessError('Nome da contratada é obrigatório');
    }

    if (!input.cnpj || input.cnpj.trim().length === 0) {
      throw new BusinessError('CNPJ da contratada é obrigatório');
    }
  }

  private mapToOutput(contratada: Contratada): ContratadaOutput {
    return {
      id: contratada.id,
      nome: contratada.nome,
      cnpj: contratada.cnpj,
      cnpjFormatado: contratada.getFormattedCNPJ(),
      createdAt: contratada.createdAt,
    };
  }
}