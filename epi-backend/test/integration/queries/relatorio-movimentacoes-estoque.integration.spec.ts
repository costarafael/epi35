import { describe, it, expect, beforeEach } from 'vitest';
import { IntegrationTestSetup, setupIntegrationTestSuite } from '../setup/integration-test-setup';
import { PrismaService } from '@infrastructure/database/prisma.service';

/**
 * R-02: Movimentações de Estoque (Kardex)
 * 
 * Relatório que mostra o histórico de movimentações de estoque.
 * Conforme documentação: SELECT * FROM movimentacoes_estoque com filtros por almoxarifado_id e período
 */
describe('Relatório R-02: Movimentações de Estoque (Kardex) - Integration Tests', () => {
  const { createTestSetup } = setupIntegrationTestSuite();
  let testSetup: IntegrationTestSetup;
  let prismaService: PrismaService;

  beforeEach(async () => {
    testSetup = await createTestSetup();
    prismaService = testSetup.prismaService;
    await testSetup.resetTestData();
  });

  describe('Movimentações de Estoque', () => {
    it('deve retornar todas as movimentações sem filtros', async () => {
      // Act - Buscar todas as movimentações
      const movimentacoes = await prismaService.movimentacaoEstoque.findMany({
        include: {
          estoqueItem: {
            include: {
              almoxarifado: {
                select: {
                  nome: true,
                  unidadeNegocio: {
                    select: {
                      nome: true,
                      codigo: true,
                    },
                  },
                },
              },
              tipoEpi: {
                select: {
                  nomeEquipamento: true,
                  numeroCa: true,
                },
              },
            },
          },
          responsavel: {
            select: {
              nome: true,
              email: true,
            },
          },
          notaMovimentacao: {
            select: {
              numeroDocumento: true,
              tipoNota: true,
            },
          },
          entrega: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: {
          dataMovimentacao: 'desc',
        },
      });

      // Assert
      expect(movimentacoes).toBeDefined();
      expect(Array.isArray(movimentacoes)).toBe(true);

      // Verificar estrutura dos dados
      if (movimentacoes.length > 0) {
        const firstMovimentacao = movimentacoes[0];
        expect(firstMovimentacao).toHaveProperty('id');
        expect(firstMovimentacao).toHaveProperty('tipoMovimentacao');
        expect(firstMovimentacao).toHaveProperty('quantidadeMovida');
        expect(firstMovimentacao).toHaveProperty('dataMovimentacao');
        expect(firstMovimentacao).toHaveProperty('estoqueItem');
        expect(firstMovimentacao).toHaveProperty('responsavel');
        expect(firstMovimentacao.estoqueItem).toHaveProperty('almoxarifado');
        expect(firstMovimentacao.estoqueItem).toHaveProperty('tipoEpi');
      }
    });

    it('deve filtrar movimentações por almoxarifado', async () => {
      // Arrange
      const almoxarifado = await testSetup.findAlmoxarifado('Almoxarifado Central');
      expect(almoxarifado).toBeDefined();

      // Act - Filtrar por almoxarifado
      const movimentacoes = await prismaService.movimentacaoEstoque.findMany({
        where: {
          estoqueItem: {
            almoxarifadoId: almoxarifado.id,
          },
        },
        include: {
          estoqueItem: {
            include: {
              almoxarifado: {
                select: {
                  nome: true,
                },
              },
              tipoEpi: {
                select: {
                  nomeEquipamento: true,
                  numeroCa: true,
                },
              },
            },
          },
          responsavel: {
            select: {
              nome: true,
            },
          },
        },
        orderBy: {
          dataMovimentacao: 'desc',
        },
      });

      // Assert
      expect(movimentacoes).toBeDefined();
      
      // Todas as movimentações devem ser do almoxarifado filtrado
      movimentacoes.forEach(movimentacao => {
        expect(movimentacao.estoqueItem.almoxarifadoId).toBe(almoxarifado.id);
        expect(movimentacao.estoqueItem.almoxarifado.nome).toBe('Almoxarifado Central');
      });
    });

    it('deve filtrar movimentações por tipo de EPI', async () => {
      // Arrange
      const tipoEpi = await testSetup.findTipoEpi('CA-12345');
      expect(tipoEpi).toBeDefined();

      // Act - Filtrar por tipo de EPI
      const movimentacoes = await prismaService.movimentacaoEstoque.findMany({
        where: {
          estoqueItem: {
            tipoEpiId: tipoEpi.id,
          },
        },
        include: {
          estoqueItem: {
            include: {
              tipoEpi: {
                select: {
                  nomeEquipamento: true,
                  numeroCa: true,
                },
              },
            },
          },
          responsavel: {
            select: {
              nome: true,
            },
          },
        },
        orderBy: {
          dataMovimentacao: 'desc',
        },
      });

      // Assert
      expect(movimentacoes).toBeDefined();
      
      // Todas as movimentações devem ser do tipo filtrado
      movimentacoes.forEach(movimentacao => {
        expect(movimentacao.estoqueItem.tipoEpiId).toBe(tipoEpi.id);
        expect(movimentacao.estoqueItem.tipoEpi.numeroCa).toBe('CA-12345');
      });
    });

    it('deve filtrar movimentações por período', async () => {
      // Arrange - Definir período de teste (últimos 30 dias)
      const dataFim = new Date();
      const dataInicio = new Date();
      dataInicio.setDate(dataInicio.getDate() - 30);

      // Act - Filtrar por período
      const movimentacoes = await prismaService.movimentacaoEstoque.findMany({
        where: {
          dataMovimentacao: {
            gte: dataInicio,
            lte: dataFim,
          },
        },
        include: {
          estoqueItem: {
            include: {
              almoxarifado: {
                select: {
                  nome: true,
                },
              },
              tipoEpi: {
                select: {
                  nomeEquipamento: true,
                },
              },
            },
          },
          responsavel: {
            select: {
              nome: true,
            },
          },
        },
        orderBy: {
          dataMovimentacao: 'desc',
        },
      });

      // Assert
      expect(movimentacoes).toBeDefined();
      
      // Todas as movimentações devem estar no período
      movimentacoes.forEach(movimentacao => {
        expect(movimentacao.dataMovimentacao.getTime()).toBeGreaterThanOrEqual(dataInicio.getTime());
        expect(movimentacao.dataMovimentacao.getTime()).toBeLessThanOrEqual(dataFim.getTime());
      });
    });

    it('deve filtrar movimentações por tipo de movimentação', async () => {
      // Act - Filtrar apenas entradas de nota
      const movimentacoes = await prismaService.movimentacaoEstoque.findMany({
        where: {
          tipoMovimentacao: 'ENTRADA_NOTA',
        },
        include: {
          estoqueItem: {
            include: {
              tipoEpi: {
                select: {
                  nomeEquipamento: true,
                },
              },
            },
          },
          responsavel: {
            select: {
              nome: true,
            },
          },
          notaMovimentacao: {
            select: {
              numeroDocumento: true,
            },
          },
        },
        orderBy: {
          dataMovimentacao: 'desc',
        },
      });

      // Assert
      expect(movimentacoes).toBeDefined();
      
      // Todas devem ser do tipo ENTRADA_NOTA
      movimentacoes.forEach(movimentacao => {
        expect(movimentacao.tipoMovimentacao).toBe('ENTRADA_NOTA');
        // Entradas de nota devem ter nota associada
        expect(movimentacao.notaMovimentacaoId).toBeDefined();
        expect(movimentacao.entregaId).toBeNull();
      });
    });

    it('deve filtrar movimentações por saídas de entrega', async () => {
      // Act - Filtrar apenas saídas para entrega
      const movimentacoes = await prismaService.movimentacaoEstoque.findMany({
        where: {
          tipoMovimentacao: 'SAIDA_ENTREGA',
        },
        include: {
          estoqueItem: {
            include: {
              tipoEpi: {
                select: {
                  nomeEquipamento: true,
                },
              },
            },
          },
          responsavel: {
            select: {
              nome: true,
            },
          },
          entrega: {
            select: {
              status: true,
              fichaEpi: {
                select: {
                  colaborador: {
                    select: {
                      nome: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          dataMovimentacao: 'desc',
        },
      });

      // Assert
      expect(movimentacoes).toBeDefined();
      
      // Todas devem ser do tipo SAIDA_ENTREGA
      movimentacoes.forEach(movimentacao => {
        expect(movimentacao.tipoMovimentacao).toBe('SAIDA_ENTREGA');
        // Saídas de entrega devem ter entrega associada
        expect(movimentacao.entregaId).toBeDefined();
        expect(movimentacao.notaMovimentacaoId).toBeNull();
      });
    });

    it('deve buscar kardex de um item específico', async () => {
      // Arrange - Buscar um item de estoque existente
      const estoqueItem = await prismaService.estoqueItem.findFirst({
        include: {
          tipoEpi: {
            select: {
              nomeEquipamento: true,
              numeroCa: true,
            },
          },
          almoxarifado: {
            select: {
              nome: true,
            },
          },
        },
      });
      
      expect(estoqueItem).toBeDefined();

      // Act - Buscar kardex do item específico
      const kardex = await prismaService.movimentacaoEstoque.findMany({
        where: {
          estoqueItemId: estoqueItem.id,
        },
        include: {
          responsavel: {
            select: {
              nome: true,
            },
          },
          notaMovimentacao: {
            select: {
              numeroDocumento: true,
              tipoNota: true,
            },
          },
          entrega: {
            select: {
              id: true,
              fichaEpi: {
                select: {
                  colaborador: {
                    select: {
                      nome: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          dataMovimentacao: 'desc',
        },
      });

      // Assert
      expect(kardex).toBeDefined();
      
      // Todas as movimentações devem ser do item específico
      kardex.forEach(movimentacao => {
        expect(movimentacao.estoqueItemId).toBe(estoqueItem.id);
      });
    });

    it('deve agrupar movimentações por tipo', async () => {
      // Act - Agrupar movimentações por tipo
      const movimentacoesPorTipo = await prismaService.movimentacaoEstoque.groupBy({
        by: ['tipoMovimentacao'],
        _sum: {
          quantidadeMovida: true,
        },
        _count: {
          id: true,
        },
        orderBy: {
          tipoMovimentacao: 'asc',
        },
      });

      // Assert
      expect(movimentacoesPorTipo).toBeDefined();
      expect(Array.isArray(movimentacoesPorTipo)).toBe(true);
      
      // Verificar estrutura dos agrupamentos
      movimentacoesPorTipo.forEach(grupo => {
        expect(grupo).toHaveProperty('tipoMovimentacao');
        expect(grupo).toHaveProperty('_sum');
        expect(grupo).toHaveProperty('_count');
        expect(typeof grupo._sum.quantidadeMovida).toBe('number');
        expect(typeof grupo._count.id).toBe('number');
      });
    });

    it('deve buscar movimentações com estornos', async () => {
      // Act - Buscar apenas movimentações de estorno
      const estornos = await prismaService.movimentacaoEstoque.findMany({
        where: {
          tipoMovimentacao: {
            startsWith: 'ESTORNO_',
          },
        },
        include: {
          estoqueItem: {
            include: {
              tipoEpi: {
                select: {
                  nomeEquipamento: true,
                },
              },
            },
          },
          responsavel: {
            select: {
              nome: true,
            },
          },
          movimentacaoOrigem: {
            select: {
              id: true,
              tipoMovimentacao: true,
              dataMovimentacao: true,
              responsavel: {
                select: {
                  nome: true,
                },
              },
            },
          },
        },
        orderBy: {
          dataMovimentacao: 'desc',
        },
      });

      // Assert
      expect(estornos).toBeDefined();
      
      // Todas devem ser estornos e ter movimentação original
      estornos.forEach(estorno => {
        expect(estorno.tipoMovimentacao).toMatch(/^ESTORNO_/);
        expect(estorno.movimentacaoOrigemId).toBeDefined();
        expect(estorno.movimentacaoOrigem).toBeDefined();
      });
    });
  });
});