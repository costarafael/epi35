import { Injectable, Inject } from '@nestjs/common';
import { Contratada } from '../../../domain/entities/contratada.entity';
import { IContratadaRepository } from '../../../domain/interfaces/repositories/contratada-repository.interface';
import { BusinessError } from '../../../domain/exceptions/business.exception';

export interface AtualizarContratadaInput {
  id: string;
  nome?: string;
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
export class AtualizarContratadaUseCase {
  constructor(
    @Inject('IContratadaRepository')
    private readonly contratadaRepository: IContratadaRepository,
  ) {}

  async execute(input: AtualizarContratadaInput): Promise<ContratadaOutput> {
    // Validar dados de entrada
    this.validarInput(input);

    // Verificar se contratada existe
    const contratadaExistente = await this.contratadaRepository.findById(input.id);
    if (!contratadaExistente) {
      throw new BusinessError('Contratada não encontrada');
    }

    // Preparar dados para atualização
    const updateData: any = {};
    
    if (input.nome !== undefined) {
      if (!input.nome || input.nome.trim().length === 0) {
        throw new BusinessError('Nome da contratada é obrigatório');
      }
      updateData.nome = input.nome.trim();
    }

    if (input.cnpj !== undefined) {
      if (!input.cnpj || input.cnpj.trim().length === 0) {
        throw new BusinessError('CNPJ da contratada é obrigatório');
      }
      
      // Validar CNPJ criando uma instância temporária
      const tempContratada = Contratada.create('temp', input.cnpj);
      updateData.cnpj = tempContratada.cnpj;
    }

    // Atualizar no banco de dados
    const contratadaAtualizada = await this.contratadaRepository.update(input.id, updateData);

    return this.mapToOutput(contratadaAtualizada);
  }

  private validarInput(input: AtualizarContratadaInput): void {
    if (!input.id || input.id.trim().length === 0) {
      throw new BusinessError('ID da contratada é obrigatório');
    }

    if (input.nome === undefined && input.cnpj === undefined) {
      throw new BusinessError('É necessário informar pelo menos um campo para atualização');
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