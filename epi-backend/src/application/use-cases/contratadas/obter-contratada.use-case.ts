import { Injectable, Inject } from '@nestjs/common';
import { Contratada } from '../../../domain/entities/contratada.entity';
import { IContratadaRepository } from '../../../domain/interfaces/repositories/contratada-repository.interface';
import { BusinessError } from '../../../domain/exceptions/business.exception';

export interface ObterContratadaInput {
  id?: string;
  cnpj?: string;
}

export interface ContratadaOutput {
  id: string;
  nome: string;
  cnpj: string;
  cnpjFormatado: string;
  createdAt: Date;
}

@Injectable()
export class ObterContratadaUseCase {
  constructor(
    @Inject('IContratadaRepository')
    private readonly contratadaRepository: IContratadaRepository,
  ) {}

  async execute(input: ObterContratadaInput): Promise<ContratadaOutput> {
    this.validarInput(input);

    let contratada: Contratada | null = null;

    if (input.id) {
      contratada = await this.contratadaRepository.findById(input.id);
    } else if (input.cnpj) {
      contratada = await this.contratadaRepository.findByCNPJ(input.cnpj);
    }

    if (!contratada) {
      throw new BusinessError('Contratada não encontrada');
    }

    return this.mapToOutput(contratada);
  }

  private validarInput(input: ObterContratadaInput): void {
    if (!input.id && !input.cnpj) {
      throw new BusinessError('É necessário informar o ID ou CNPJ da contratada');
    }

    if (input.id && input.cnpj) {
      throw new BusinessError('Informe apenas o ID ou CNPJ, não ambos');
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