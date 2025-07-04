import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { EstoqueRepository } from './estoque.repository';
import { MovimentacaoRepository } from './movimentacao.repository';
import { NotaRepository } from './nota.repository';
import { ContratadaRepository } from './contratada.repository';

// Repository interfaces are used in providers configuration below

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: 'IEstoqueRepository',
      useClass: EstoqueRepository,
    },
    {
      provide: 'IMovimentacaoRepository',
      useClass: MovimentacaoRepository,
    },
    {
      provide: 'INotaRepository',
      useClass: NotaRepository,
    },
    {
      provide: 'IContratadaRepository',
      useClass: ContratadaRepository,
    },
    // Export concrete classes as well for direct injection
    EstoqueRepository,
    MovimentacaoRepository,
    NotaRepository,
    ContratadaRepository,
  ],
  exports: [
    'IEstoqueRepository',
    'IMovimentacaoRepository',
    'INotaRepository',
    'IContratadaRepository',
    EstoqueRepository,
    MovimentacaoRepository,
    NotaRepository,
    ContratadaRepository,
  ],
})
export class RepositoryModule {}