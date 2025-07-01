import { describe, it, expect, beforeEach, vi } from 'vitest';
import { 
  GerenciarNotaRascunhoUseCase, 
  CriarNotaRascunhoInput,
  AdicionarItemInput,
  AtualizarQuantidadeItemInput
} from '../../../../src/application/use-cases/estoque/gerenciar-nota-rascunho.use-case';
import { NotaMovimentacao } from '../../../../src/domain/entities/nota-movimentacao.entity';
import { TipoNotaMovimentacao, StatusNotaMovimentacao } from '../../../../src/domain/enums';
import { BusinessError, NotFoundError } from '../../../../src/domain/exceptions/business.exception';
import { MockNotaRepository, createMockNotaRepository } from '../../../mocks/nota-repository.mock';
import { NotaMovimentacaoFactory, NotaMovimentacaoItemFactory } from '../../../factories/nota-movimentacao.factory';

describe('GerenciarNotaRascunhoUseCase', () => {
  let useCase: GerenciarNotaRascunhoUseCase;
  let mockNotaRepository: MockNotaRepository;

  beforeEach(() => {
    mockNotaRepository = createMockNotaRepository();
    useCase = new GerenciarNotaRascunhoUseCase(mockNotaRepository);
  });

  describe('criarNota', () => {
    it('deve criar uma nota de entrada com sucesso', async () => {
      // Arrange
      const input: CriarNotaRascunhoInput = {
        tipo: TipoNotaMovimentacao.ENTRADA,
        usuarioId: 'usuario-test',
        almoxarifadoDestinoId: 'almoxarifado-destino',
        observacoes: 'Nota de teste'
      };

      const expectedNota = NotaMovimentacaoFactory.createEntrada({
        numero: 'ENT-001',
        usuarioId: input.usuarioId,
        almoxarifadoDestinoId: input.almoxarifadoDestinoId,
        observacoes: input.observacoes
      });

      mockNotaRepository.setupSuccessfulCreation(expectedNota);

      // Act
      const result = await useCase.criarNota(input);

      // Assert
      expect(mockNotaRepository.gerarProximoNumero).toHaveBeenCalledWith(TipoNotaMovimentacao.ENTRADA);
      expect(mockNotaRepository.createNota).toHaveBeenCalledWith(
        expect.objectContaining({
          numero: 'ENT-001',
          tipo: TipoNotaMovimentacao.ENTRADA,
          usuarioId: input.usuarioId,
          almoxarifadoOrigemId: null,
          almoxarifadoDestinoId: input.almoxarifadoDestinoId,
          observacoes: input.observacoes,
          status: StatusNotaMovimentacao.RASCUNHO
        })
      );
      expect(result).toEqual(expectedNota);
    });

    it('deve criar uma nota de transferência com sucesso', async () => {
      // Arrange
      const input: CriarNotaRascunhoInput = {
        tipo: TipoNotaMovimentacao.TRANSFERENCIA,
        usuarioId: 'usuario-test',
        almoxarifadoOrigemId: 'almoxarifado-origem',
        almoxarifadoDestinoId: 'almoxarifado-destino',
        observacoes: 'Transferência de teste'
      };

      const expectedNota = NotaMovimentacaoFactory.createTransferencia({
        numero: 'TRF-001',
        usuarioId: input.usuarioId,
        almoxarifadoOrigemId: input.almoxarifadoOrigemId,
        almoxarifadoDestinoId: input.almoxarifadoDestinoId,
        observacoes: input.observacoes
      });

      mockNotaRepository.setupSuccessfulCreation(expectedNota);

      // Act
      const result = await useCase.criarNota(input);

      // Assert
      expect(mockNotaRepository.gerarProximoNumero).toHaveBeenCalledWith(TipoNotaMovimentacao.TRANSFERENCIA);
      expect(mockNotaRepository.createNota).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: TipoNotaMovimentacao.TRANSFERENCIA,
          almoxarifadoOrigemId: input.almoxarifadoOrigemId,
          almoxarifadoDestinoId: input.almoxarifadoDestinoId
        })
      );
      expect(result).toEqual(expectedNota);
    });

    it('deve criar uma nota de descarte com sucesso', async () => {
      // Arrange
      const input: CriarNotaRascunhoInput = {
        tipo: TipoNotaMovimentacao.DESCARTE,
        usuarioId: 'usuario-test',
        almoxarifadoOrigemId: 'almoxarifado-origem'
      };

      const expectedNota = NotaMovimentacaoFactory.createDescarte({
        numero: 'DESC-001',
        usuarioId: input.usuarioId,
        almoxarifadoOrigemId: input.almoxarifadoOrigemId
      });

      mockNotaRepository.setupSuccessfulCreation(expectedNota);

      // Act
      const result = await useCase.criarNota(input);

      // Assert
      expect(mockNotaRepository.gerarProximoNumero).toHaveBeenCalledWith(TipoNotaMovimentacao.DESCARTE);
      expect(mockNotaRepository.createNota).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: TipoNotaMovimentacao.DESCARTE,
          almoxarifadoOrigemId: input.almoxarifadoOrigemId,
          almoxarifadoDestinoId: null
        })
      );
      expect(result).toEqual(expectedNota);
    });

    it('deve criar uma nota de ajuste com sucesso', async () => {
      // Arrange
      const input: CriarNotaRascunhoInput = {
        tipo: TipoNotaMovimentacao.AJUSTE,
        usuarioId: 'usuario-test',
        almoxarifadoDestinoId: 'almoxarifado-destino'
      };

      const expectedNota = NotaMovimentacaoFactory.createAjuste({
        numero: 'AJU-001',
        usuarioId: input.usuarioId,
        almoxarifadoDestinoId: input.almoxarifadoDestinoId
      });

      mockNotaRepository.setupSuccessfulCreation(expectedNota);

      // Act
      const result = await useCase.criarNota(input);

      // Assert
      expect(mockNotaRepository.gerarProximoNumero).toHaveBeenCalledWith(TipoNotaMovimentacao.AJUSTE);
      expect(mockNotaRepository.createNota).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: TipoNotaMovimentacao.AJUSTE,
          almoxarifadoOrigemId: null,
          almoxarifadoDestinoId: input.almoxarifadoDestinoId
        })
      );
      expect(result).toEqual(expectedNota);
    });

    it('deve propagar erro do repositório ao gerar próximo número', async () => {
      // Arrange
      const input: CriarNotaRascunhoInput = {
        tipo: TipoNotaMovimentacao.ENTRADA,
        usuarioId: 'usuario-test',
        almoxarifadoDestinoId: 'almoxarifado-destino'
      };

      mockNotaRepository.gerarProximoNumero.mockRejectedValue(new Error('Erro no banco de dados'));

      // Act & Assert
      await expect(useCase.criarNota(input)).rejects.toThrow('Erro no banco de dados');
    });

    it('deve propagar erro do repositório ao criar nota', async () => {
      // Arrange
      const input: CriarNotaRascunhoInput = {
        tipo: TipoNotaMovimentacao.ENTRADA,
        usuarioId: 'usuario-test',
        almoxarifadoDestinoId: 'almoxarifado-destino'
      };

      mockNotaRepository.gerarProximoNumero.mockResolvedValue('ENT-001');
      mockNotaRepository.createNota.mockRejectedValue(new Error('Erro ao salvar nota'));

      // Act & Assert
      await expect(useCase.criarNota(input)).rejects.toThrow('Erro ao salvar nota');
    });
  });

  describe('obterNota', () => {
    it('deve retornar nota quando encontrada', async () => {
      // Arrange
      const notaId = 'nota-test-id';
      const expectedNota = NotaMovimentacaoFactory.createRascunho({ id: notaId });
      
      mockNotaRepository.setupNotaExists(expectedNota);

      // Act
      const result = await useCase.obterNota(notaId);

      // Assert
      expect(mockNotaRepository.findById).toHaveBeenCalledWith(notaId);
      expect(result).toEqual(expectedNota);
    });

    it('deve lançar NotFoundError quando nota não encontrada', async () => {
      // Arrange
      const notaId = 'nota-inexistente';
      mockNotaRepository.setupNotaFound(notaId);

      // Act & Assert
      await expect(useCase.obterNota(notaId)).rejects.toThrow(NotFoundError);
      await expect(useCase.obterNota(notaId)).rejects.toThrow('Nota de movimentação with identifier \'nota-inexistente\' not found');
    });
  });

  describe('obterNotaComItens', () => {
    it('deve retornar nota com itens quando encontrada', async () => {
      // Arrange
      const notaId = 'nota-test-id';
      const expectedNota = NotaMovimentacaoFactory.createWithItens({ id: notaId });
      
      mockNotaRepository.setupNotaExists(expectedNota);

      // Act
      const result = await useCase.obterNotaComItens(notaId);

      // Assert
      expect(mockNotaRepository.findWithItens).toHaveBeenCalledWith(notaId);
      expect(result).toEqual(expectedNota);
    });

    it('deve lançar NotFoundError quando nota não encontrada', async () => {
      // Arrange
      const notaId = 'nota-inexistente';
      mockNotaRepository.findWithItens.mockResolvedValue(null);

      // Act & Assert
      await expect(useCase.obterNotaComItens(notaId)).rejects.toThrow(NotFoundError);
    });
  });

  describe('listarRascunhos', () => {
    it('deve retornar lista de rascunhos sem filtro de usuário', async () => {
      // Arrange
      const rascunhos = [
        NotaMovimentacaoFactory.createRascunho({ usuarioId: 'usuario-1' }),
        NotaMovimentacaoFactory.createRascunho({ usuarioId: 'usuario-2' })
      ];
      
      mockNotaRepository.setupRascunhosList(rascunhos);

      // Act
      const result = await useCase.listarRascunhos();

      // Assert
      expect(mockNotaRepository.findRascunhos).toHaveBeenCalledWith(undefined);
      expect(result).toEqual(rascunhos);
    });

    it('deve retornar lista de rascunhos filtrada por usuário', async () => {
      // Arrange
      const usuarioId = 'usuario-1';
      const rascunhos = [
        NotaMovimentacaoFactory.createRascunho({ usuarioId })
      ];
      
      mockNotaRepository.setupRascunhosList(rascunhos, usuarioId);

      // Act
      const result = await useCase.listarRascunhos(usuarioId);

      // Assert
      expect(mockNotaRepository.findRascunhos).toHaveBeenCalledWith(usuarioId);
      expect(result).toEqual(rascunhos);
    });

    it('deve retornar lista vazia quando não há rascunhos', async () => {
      // Arrange
      mockNotaRepository.setupRascunhosList([]);

      // Act
      const result = await useCase.listarRascunhos();

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('adicionarItem', () => {
    it('deve adicionar item com sucesso quando nota é editável', async () => {
      // Arrange
      const input: AdicionarItemInput = {
        notaId: 'nota-test-id',
        tipoEpiId: 'tipo-epi-1',
        quantidade: 10,
        observacoes: 'Item de teste'
      };

      const nota = NotaMovimentacaoFactory.createRascunho({ id: input.notaId });
      mockNotaRepository.setupNotaExists(nota);
      mockNotaRepository.setupItemOperations();

      // Act
      await useCase.adicionarItem(input);

      // Assert
      expect(mockNotaRepository.findById).toHaveBeenCalledWith(input.notaId);
      expect(mockNotaRepository.adicionarItem).toHaveBeenCalledWith(
        input.notaId,
        input.tipoEpiId,
        input.quantidade,
        input.observacoes
      );
    });

    it('deve lançar BusinessError quando nota não é editável', async () => {
      // Arrange
      const input: AdicionarItemInput = {
        notaId: 'nota-test-id',
        tipoEpiId: 'tipo-epi-1',
        quantidade: 10
      };

      const nota = NotaMovimentacaoFactory.createConcluida({ id: input.notaId });
      mockNotaRepository.setupNotaExists(nota);

      // Act & Assert
      await expect(useCase.adicionarItem(input)).rejects.toThrow(BusinessError);
      await expect(useCase.adicionarItem(input)).rejects.toThrow('Nota não está em modo de edição');
      expect(mockNotaRepository.adicionarItem).not.toHaveBeenCalled();
    });

    it('deve lançar NotFoundError quando nota não existe', async () => {
      // Arrange
      const input: AdicionarItemInput = {
        notaId: 'nota-inexistente',
        tipoEpiId: 'tipo-epi-1',
        quantidade: 10
      };

      mockNotaRepository.setupNotaFound(input.notaId);

      // Act & Assert
      await expect(useCase.adicionarItem(input)).rejects.toThrow(NotFoundError);
      expect(mockNotaRepository.adicionarItem).not.toHaveBeenCalled();
    });
  });

  describe('removerItem', () => {
    it('deve remover item com sucesso quando nota é editável', async () => {
      // Arrange
      const notaId = 'nota-test-id';
      const itemId = 'item-test-id';

      const nota = NotaMovimentacaoFactory.createRascunho({ id: notaId });
      mockNotaRepository.setupNotaExists(nota);
      mockNotaRepository.setupItemOperations();

      // Act
      await useCase.removerItem(notaId, itemId);

      // Assert
      expect(mockNotaRepository.findById).toHaveBeenCalledWith(notaId);
      expect(mockNotaRepository.removerItem).toHaveBeenCalledWith(notaId, itemId);
    });

    it('deve lançar BusinessError quando nota não é editável', async () => {
      // Arrange
      const notaId = 'nota-test-id';
      const itemId = 'item-test-id';

      const nota = NotaMovimentacaoFactory.createConcluida({ id: notaId });
      mockNotaRepository.setupNotaExists(nota);

      // Act & Assert
      await expect(useCase.removerItem(notaId, itemId)).rejects.toThrow(BusinessError);
      await expect(useCase.removerItem(notaId, itemId)).rejects.toThrow('Nota não está em modo de edição');
      expect(mockNotaRepository.removerItem).not.toHaveBeenCalled();
    });

    it('deve lançar NotFoundError quando nota não existe', async () => {
      // Arrange
      const notaId = 'nota-inexistente';
      const itemId = 'item-test-id';

      mockNotaRepository.setupNotaFound(notaId);

      // Act & Assert
      await expect(useCase.removerItem(notaId, itemId)).rejects.toThrow(NotFoundError);
      expect(mockNotaRepository.removerItem).not.toHaveBeenCalled();
    });
  });

  describe('atualizarQuantidadeItem', () => {
    it('deve atualizar quantidade do item com sucesso', async () => {
      // Arrange
      const input: AtualizarQuantidadeItemInput = {
        notaId: 'nota-test-id',
        tipoEpiId: 'tipo-epi-1',
        quantidade: 15
      };

      const item = NotaMovimentacaoItemFactory.create({
        id: 'item-1',
        tipoEpiId: input.tipoEpiId
      });

      const nota = NotaMovimentacaoFactory.createRascunho({ 
        id: input.notaId,
        itens: [item]
      });

      mockNotaRepository.setupNotaExists(nota);
      mockNotaRepository.setupItemOperations();

      // Act
      await useCase.atualizarQuantidadeItem(input);

      // Assert
      expect(mockNotaRepository.findById).toHaveBeenCalledWith(input.notaId);
      expect(mockNotaRepository.findWithItens).toHaveBeenCalledWith(input.notaId);
      expect(mockNotaRepository.atualizarQuantidadeItem).toHaveBeenCalledWith(
        input.notaId,
        item.id,
        input.quantidade
      );
    });

    it('deve lançar BusinessError quando nota não é editável', async () => {
      // Arrange
      const input: AtualizarQuantidadeItemInput = {
        notaId: 'nota-test-id',
        tipoEpiId: 'tipo-epi-1',
        quantidade: 15
      };

      const nota = NotaMovimentacaoFactory.createConcluida({ id: input.notaId });
      mockNotaRepository.setupNotaExists(nota);

      // Act & Assert
      await expect(useCase.atualizarQuantidadeItem(input)).rejects.toThrow(BusinessError);
      await expect(useCase.atualizarQuantidadeItem(input)).rejects.toThrow('Nota não está em modo de edição');
    });

    it('deve lançar BusinessError quando quantidade é zero ou negativa', async () => {
      // Arrange
      const input: AtualizarQuantidadeItemInput = {
        notaId: 'nota-test-id',
        tipoEpiId: 'tipo-epi-1',
        quantidade: 0
      };

      const nota = NotaMovimentacaoFactory.createRascunho({ id: input.notaId });
      mockNotaRepository.setupNotaExists(nota);

      // Act & Assert
      await expect(useCase.atualizarQuantidadeItem(input)).rejects.toThrow(BusinessError);
      await expect(useCase.atualizarQuantidadeItem(input)).rejects.toThrow('Quantidade deve ser positiva');
    });

    it('deve lançar BusinessError quando item não encontrado na nota', async () => {
      // Arrange
      const input: AtualizarQuantidadeItemInput = {
        notaId: 'nota-test-id',
        tipoEpiId: 'tipo-epi-inexistente',
        quantidade: 15
      };

      const item = NotaMovimentacaoItemFactory.create({
        tipoEpiId: 'tipo-epi-diferente'
      });

      const nota = NotaMovimentacaoFactory.createRascunho({ 
        id: input.notaId,
        itens: [item]
      });

      mockNotaRepository.setupNotaExists(nota);

      // Act & Assert
      await expect(useCase.atualizarQuantidadeItem(input)).rejects.toThrow(BusinessError);
      await expect(useCase.atualizarQuantidadeItem(input)).rejects.toThrow('Item não encontrado na nota');
    });

    it('deve lançar NotFoundError quando nota não existe', async () => {
      // Arrange
      const input: AtualizarQuantidadeItemInput = {
        notaId: 'nota-inexistente',
        tipoEpiId: 'tipo-epi-1',
        quantidade: 15
      };

      mockNotaRepository.setupNotaFound(input.notaId);

      // Act & Assert
      await expect(useCase.atualizarQuantidadeItem(input)).rejects.toThrow(NotFoundError);
    });
  });

  describe('atualizarObservacoes', () => {
    it('deve atualizar observações com sucesso', async () => {
      // Arrange
      const notaId = 'nota-test-id';
      const observacoes = 'Observações atualizadas';

      const notaOriginal = NotaMovimentacaoFactory.createRascunho({ id: notaId });
      const notaAtualizada = NotaMovimentacaoFactory.createRascunho({ 
        id: notaId, 
        observacoes 
      });

      mockNotaRepository.setupNotaExists(notaOriginal);
      mockNotaRepository.setupUpdateOperations(notaAtualizada);

      // Act
      const result = await useCase.atualizarObservacoes(notaId, observacoes);

      // Assert
      expect(mockNotaRepository.findById).toHaveBeenCalledWith(notaId);
      expect(mockNotaRepository.update).toHaveBeenCalledWith(notaId, { observacoes });
      expect(result).toEqual(notaAtualizada);
    });

    it('deve lançar BusinessError quando nota não é editável', async () => {
      // Arrange
      const notaId = 'nota-test-id';
      const observacoes = 'Observações atualizadas';

      const nota = NotaMovimentacaoFactory.createConcluida({ id: notaId });
      mockNotaRepository.setupNotaExists(nota);

      // Act & Assert
      await expect(useCase.atualizarObservacoes(notaId, observacoes)).rejects.toThrow(BusinessError);
      await expect(useCase.atualizarObservacoes(notaId, observacoes)).rejects.toThrow('Nota não está em modo de edição');
      expect(mockNotaRepository.update).not.toHaveBeenCalled();
    });

    it('deve lançar NotFoundError quando nota não existe', async () => {
      // Arrange
      const notaId = 'nota-inexistente';
      const observacoes = 'Observações atualizadas';

      mockNotaRepository.setupNotaFound(notaId);

      // Act & Assert
      await expect(useCase.atualizarObservacoes(notaId, observacoes)).rejects.toThrow(NotFoundError);
      expect(mockNotaRepository.update).not.toHaveBeenCalled();
    });
  });

  describe('excluirNota', () => {
    it('deve excluir nota em rascunho com sucesso', async () => {
      // Arrange
      const notaId = 'nota-test-id';
      const nota = NotaMovimentacaoFactory.createRascunho({ id: notaId });

      mockNotaRepository.setupNotaExists(nota);
      mockNotaRepository.setupDeleteOperations();

      // Act
      await useCase.excluirNota(notaId);

      // Assert
      expect(mockNotaRepository.findById).toHaveBeenCalledWith(notaId);
      expect(mockNotaRepository.delete).toHaveBeenCalledWith(notaId);
    });

    it('deve lançar BusinessError quando nota não é rascunho', async () => {
      // Arrange
      const notaId = 'nota-test-id';
      const nota = NotaMovimentacaoFactory.createConcluida({ id: notaId });

      mockNotaRepository.setupNotaExists(nota);

      // Act & Assert
      await expect(useCase.excluirNota(notaId)).rejects.toThrow(BusinessError);
      await expect(useCase.excluirNota(notaId)).rejects.toThrow('Apenas notas em rascunho podem ser excluídas');
      expect(mockNotaRepository.delete).not.toHaveBeenCalled();
    });

    it('deve lançar NotFoundError quando nota não existe', async () => {
      // Arrange
      const notaId = 'nota-inexistente';
      mockNotaRepository.setupNotaFound(notaId);

      // Act & Assert
      await expect(useCase.excluirNota(notaId)).rejects.toThrow(NotFoundError);
      expect(mockNotaRepository.delete).not.toHaveBeenCalled();
    });
  });

  describe('Integration scenarios', () => {
    it('deve gerenciar ciclo completo de uma nota rascunho', async () => {
      // Arrange
      const criarInput: CriarNotaRascunhoInput = {
        tipo: TipoNotaMovimentacao.ENTRADA,
        usuarioId: 'usuario-test',
        almoxarifadoDestinoId: 'almoxarifado-destino'
      };

      const nota = NotaMovimentacaoFactory.createRascunho({
        id: 'nota-criada',
        numero: 'ENT-001',
        usuarioId: criarInput.usuarioId,
        almoxarifadoDestinoId: criarInput.almoxarifadoDestinoId
      });

      mockNotaRepository.setupSuccessfulCreation(nota);
      mockNotaRepository.setupNotaExists(nota);
      mockNotaRepository.setupItemOperations();

      // Act - Criar nota
      const notaCriada = await useCase.criarNota(criarInput);

      // Act - Adicionar item
      const adicionarItemInput: AdicionarItemInput = {
        notaId: notaCriada.id,
        tipoEpiId: 'tipo-epi-1',
        quantidade: 10,
        observacoes: 'Primeiro item'
      };
      await useCase.adicionarItem(adicionarItemInput);

      // Act - Obter nota
      const notaObtida = await useCase.obterNota(notaCriada.id);

      // Assert
      expect(notaCriada).toEqual(nota);
      expect(notaObtida).toEqual(nota);
      expect(mockNotaRepository.adicionarItem).toHaveBeenCalledWith(
        notaCriada.id,
        'tipo-epi-1',
        10,
        'Primeiro item'
      );
    });

    it('deve validar permissões em operações sequenciais', async () => {
      // Arrange
      const notaId = 'nota-test-id';
      const notaRascunho = NotaMovimentacaoFactory.createRascunho({ id: notaId });
      const notaConcluida = NotaMovimentacaoFactory.createConcluida({ id: notaId });

      // Setup inicial com nota em rascunho
      mockNotaRepository.setupNotaExists(notaRascunho);

      // Act & Assert - Operação válida com rascunho
      await expect(useCase.adicionarItem({
        notaId,
        tipoEpiId: 'tipo-epi-1',
        quantidade: 10
      })).resolves.not.toThrow();

      // Simular mudança de status para concluída
      mockNotaRepository.setupNotaExists(notaConcluida);

      // Act & Assert - Operação inválida com nota concluída
      await expect(useCase.adicionarItem({
        notaId,
        tipoEpiId: 'tipo-epi-2',
        quantidade: 5
      })).rejects.toThrow('Nota não está em modo de edição');

      await expect(useCase.atualizarObservacoes(notaId, 'Nova observação'))
        .rejects.toThrow('Nota não está em modo de edição');

      await expect(useCase.excluirNota(notaId))
        .rejects.toThrow('Apenas notas em rascunho podem ser excluídas');
    });
  });
});