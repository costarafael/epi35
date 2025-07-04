import { Injectable, Inject } from '@nestjs/common';
import { IContratadaRepository } from '../../../domain/interfaces/repositories/contratada-repository.interface';
import { BusinessError } from '../../../domain/exceptions/business.exception';

export interface ExcluirContratadaInput {
  id: string;
}

@Injectable()
export class ExcluirContratadaUseCase {
  constructor(
    @Inject('IContratadaRepository')
    private readonly contratadaRepository: IContratadaRepository,
  ) {}

  async execute(input: ExcluirContratadaInput): Promise<void> {
    // Validar dados de entrada
    this.validarInput(input);

    // Verificar se contratada existe
    const contratadaExistente = await this.contratadaRepository.findById(input.id);
    if (!contratadaExistente) {
      throw new BusinessError('Contratada não encontrada');
    }

    // Excluir do banco de dados
    // A validação de colaboradores vinculados é feita no repository
    await this.contratadaRepository.delete(input.id);
  }

  private validarInput(input: ExcluirContratadaInput): void {
    if (!input.id || input.id.trim().length === 0) {
      throw new BusinessError('ID da contratada é obrigatório');
    }
  }
}