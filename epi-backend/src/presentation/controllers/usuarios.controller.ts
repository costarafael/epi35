import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiParam } from '@nestjs/swagger';
import { ListarUsuariosUseCase } from '../../application/use-cases/usuarios/listar-usuarios.use-case';
import { 
  ListarUsuariosQuerySchema, 
  ListarUsuariosResponseSchema,
  UsuarioResponseSchema,
  ListarUsuariosQuery,
  ListarUsuariosResponse,
  UsuarioResponse
} from '../dto/schemas/usuarios.schemas';

@ApiTags('Usuários')
@Controller('usuarios')
export class UsuariosController {
  constructor(
    private readonly listarUsuariosUseCase: ListarUsuariosUseCase,
  ) {}

  @Get()
  @ApiOperation({ 
    summary: 'Listar usuários',
    description: 'Lista usuários do sistema com paginação e filtros opcionais por nome e email'
  })
  @ApiQuery({ name: 'nome', required: false, description: 'Filtro por nome (busca parcial case-insensitive)' })
  @ApiQuery({ name: 'email', required: false, description: 'Filtro por email (busca parcial case-insensitive)' })
  @ApiQuery({ name: 'page', required: false, description: 'Número da página (padrão: 1)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Itens por página (padrão: 50, máximo: 100)' })
  @ApiResponse({ 
    status: 200, 
    description: 'Lista de usuários retornada com sucesso',
    schema: {
      type: 'object',
      properties: {
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', format: 'uuid' },
              nome: { type: 'string' },
              email: { type: 'string', format: 'email' },
              createdAt: { type: 'string', format: 'date-time' }
            }
          }
        },
        pagination: {
          type: 'object',
          properties: {
            page: { type: 'number' },
            limit: { type: 'number' },
            total: { type: 'number' },
            totalPages: { type: 'number' }
          }
        }
      }
    }
  })
  async listarUsuarios(@Query() query: ListarUsuariosQuery): Promise<ListarUsuariosResponse> {
    const validatedQuery = ListarUsuariosQuerySchema.parse(query);
    return await this.listarUsuariosUseCase.execute(validatedQuery);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Obter usuário por ID',
    description: 'Retorna as informações de um usuário específico pelo seu ID'
  })
  @ApiParam({ name: 'id', description: 'ID do usuário', type: 'string', format: 'uuid' })
  @ApiResponse({ 
    status: 200, 
    description: 'Usuário encontrado',
    schema: {
      type: 'object',
      properties: {
        id: { type: 'string', format: 'uuid' },
        nome: { type: 'string' },
        email: { type: 'string', format: 'email' },
        createdAt: { type: 'string', format: 'date-time' }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'Usuário não encontrado' })
  async obterUsuario(@Param('id') id: string): Promise<UsuarioResponse | null> {
    return await this.listarUsuariosUseCase.obterPorId(id);
  }
}