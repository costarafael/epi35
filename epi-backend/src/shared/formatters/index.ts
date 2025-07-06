// Formatters para Relatórios
export { DashboardFormatterService } from './dashboard-formatter.service';
export { RelatorioFormatterService } from './relatorio-formatter.service';
export { RelatorioUtilsService } from './relatorio-utils.service';

// Formatters para Fichas/Entregas/Devoluções
export { FichaFormatterService } from './ficha-formatter.service';
export { EntregaFormatterService } from './entrega-formatter.service';
export { DevolucaoFormatterService } from './devolucao-formatter.service';

// Types exportados
export type { DashboardData, DashboardOutput } from './dashboard-formatter.service';
export type { 
  RelatorioConformidadeData, 
  RelatorioUsoData, 
  RelatorioMovimentacaoData,
  SaudeSistemaData 
} from './relatorio-formatter.service';
export type { FiltrosData } from './relatorio-utils.service';
export type { 
  FichaEpiData, 
  FichaOutput, 
  ListaFichasOutput,
  EstatisticasFichas 
} from './ficha-formatter.service';
export type { 
  EntregaData, 
  EntregaOutput, 
  PosseAtualOutput,
  EntregaItemOutput 
} from './entrega-formatter.service';
export type { 
  DevolucaoData, 
  DevolucaoOutput, 
  HistoricoDevolucaoOutput,
  CancelamentoDevolucaoOutput 
} from './devolucao-formatter.service';