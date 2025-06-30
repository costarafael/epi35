import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module';
import { EstoqueRepository } from './estoque.repository';
import { MovimentacaoRepository } from './movimentacao.repository';
import { NotaRepository } from './nota.repository';

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
    // Export concrete classes as well for direct injection
    EstoqueRepository,
    MovimentacaoRepository,
    NotaRepository,
  ],
  exports: [
    'IEstoqueRepository',
    'IMovimentacaoRepository',
    'INotaRepository',
    EstoqueRepository,
    MovimentacaoRepository,
    NotaRepository,
  ],
})
export class RepositoryModule {}