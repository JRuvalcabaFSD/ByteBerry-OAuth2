# ByteBerry-OAuth2

Servidor OAuth2 con Authorization Code + PKCE, JWT RS256, refresh tokens y JWKS. Implementa Clean Architecture con TypeScript, PostgreSQL y Docker multi-arch para Raspberry Pi 5.

[![GitHub Actions Workflow Status](https://img.shields.io/github/actions/workflow/status/JRuvalcabaFSD/ByteBerry-OAuth2/pr-ci.yml?logo=github&logoColor=white&label=Tests)](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/actions)
[![GitHub Tag](https://img.shields.io/github/v/tag/JRuvalcabaFSD/ByteBerry-OAuth2?sort=semver&logo=semanticrelease&logoColor=White&label=Version)](https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2/tags)
[![Node](https://img.shields.io/badge/node-%3E%3D20.21.1-brightgreen.svg?logo=node.js&logoColor=white)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-10.20.0-f69220.svg?logo=pnpm&logoColor=white)](https://pnpm.io)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/license-ISC-blue.svg?logo=open-source-initiative&logoColor=white)](LICENSE)
[![Docker Image Version](https://img.shields.io/docker/v/jruvalcabafsd/byteberry-oauth2?sort=semver&logo=docker&logoColor=white&label=Image%20Version)](https://hub.docker.com/r/jruvalcabafsd/byteberry-oauth2)

## Características

- **OAuth2 Authorization Code + PKCE** - Flujo seguro con code challenge S256
- **JWT RS256** - Tokens firmados con RSA-256 (firma asimetrica)
- **Refresh Tokens** - Sesiones extendidas sin re-autenticacion
- **JWKS Endpoint** - Distribucion de llaves publicas para validacion
- **Clean Architecture** - Separacion clara de capas (domain, application, infrastructure)
- **PostgreSQL + Prisma** - Base de datos relacional con ORM tipado
- **Docker Multi-arch** - Soporte para x64 y ARM64 (Raspberry Pi)

## Flujos OAuth2

### Login Flow

Autenticacion de usuario y creacion de sesion.

```mermaid
sequenceDiagram
    participant U as Usuario
    participant B as Browser
    participant S as OAuth2 Server
    participant DB as Database

    U->>B: Accede a /auth/login
    B->>S: GET /auth/login
    S->>B: Render login form (EJS)
    U->>B: Ingresa credenciales
    B->>S: POST /auth/login
    S->>DB: Validar credenciales
    DB-->>S: Usuario encontrado
    S->>S: Verificar password (bcrypt)
    S->>S: Verificar cuenta activa
    S->>DB: Crear sesion
    DB-->>S: Session ID
    S->>B: Set-Cookie: session_id + Redirect
    B->>U: Usuario autenticado
```

### Authorization Flow

Flujo OAuth2 Authorization Code con PKCE.

```mermaid
sequenceDiagram
    participant C as Client App
    participant B as Browser
    participant S as OAuth2 Server
    participant DB as Database

    C->>B: Redirect a /auth/authorize
    Note over C,B: client_id, redirect_uri, scope,<br/>code_challenge, state
    B->>S: GET /auth/authorize
    S->>S: Validar session cookie
    alt Sin sesion
        S->>B: Redirect a /auth/login?return_url=...
    end
    S->>DB: Validar client_id y redirect_uri
    DB-->>S: Cliente valido
    S->>DB: Verificar consent existente
    alt Sin consent
        S->>B: 200 {consentUrl: /auth/authorize/consent}
        Note over B,S: Ver Consent Flow
    end
    S->>S: Generar authorization code
    S->>DB: Guardar code + PKCE challenge
    S->>B: Redirect a redirect_uri?code=xxx&state=yyy
    B->>C: Authorization code recibido
```

### Consent Flow

Proceso de consentimiento del usuario para autorizar scopes.

```mermaid
sequenceDiagram
    participant U as Usuario
    participant B as Browser
    participant S as OAuth2 Server
    participant DB as Database

    B->>S: GET /auth/authorize/consent
    Note over B,S: client_id, scope, redirect_uri, state
    S->>DB: Obtener info del cliente
    DB-->>S: Nombre, scopes solicitados
    S->>B: Render consent screen (EJS)
    U->>B: Decide aprobar/denegar
    B->>S: PUT /auth/authorize/decision
    Note over B,S: decision: approve|deny
    alt Usuario aprueba
        S->>DB: Guardar consent (user, client, scopes)
        S->>S: Generar authorization code
        S->>DB: Guardar code + PKCE challenge
        S->>B: Redirect a redirect_uri?code=xxx&state=yyy
    else Usuario deniega
        S->>B: Redirect a redirect_uri?error=access_denied
    end
```

### Token Exchange Flow

Intercambio del authorization code por access token con validacion PKCE.

```mermaid
sequenceDiagram
    participant C as Client App
    participant S as OAuth2 Server
    participant DB as Database
    participant JWT as JWT Service

    C->>S: POST /auth/token
    Note over C,S: code, client_id, redirect_uri,<br/>code_verifier
    S->>DB: Buscar authorization code
    DB-->>S: Code encontrado
    S->>S: Validar code no expirado
    S->>S: Validar code no usado
    S->>S: Validar client_id coincide
    S->>S: Validar redirect_uri coincide
    S->>S: Verificar PKCE (S256)
    Note over S: SHA256(code_verifier) == code_challenge
    S->>DB: Marcar code como usado
    S->>DB: Obtener datos del usuario
    DB-->>S: User info
    S->>JWT: Generar access token (RS256)
    JWT-->>S: JWT firmado
    S->>C: 200 {access_token, token_type, expires_in, scope}
```

## Requisitos Previos

- Node.js >= 20.21.1
- pnpm >= 10.20.0
- PostgreSQL 15+
- Docker (opcional, para desarrollo con contenedores)

## Instalacion

```bash
# Clonar repositorio
git clone https://github.com/JRuvalcabaFSD/ByteBerry-OAuth2.git
cd ByteBerry-OAuth2

# Instalar dependencias
pnpm install

# Configurar variables de entorno
cp .env.example .env

# Generar cliente Prisma
pnpm db generate

# Iniciar base de datos y ejecutar migraciones
pnpm db:setup

# Iniciar en modo desarrollo
pnpm dev
```

## Variables de Entorno

| Variable                       | Descripcion                        | Default       |
| ------------------------------ | ---------------------------------- | ------------- |
| `NODE_ENV`                     | Entorno de ejecucion               | `development` |
| `PORT`                         | Puerto del servidor                | `4000`        |
| `DATABASE_URL`                 | URL de conexion PostgreSQL         | -             |
| `JWT_ISSUER`                   | Emisor de tokens JWT               | -             |
| `JWT_AUDIENCE`                 | Audiencia de tokens                | -             |
| `JWT_ACCESS_TOKEN_EXPIRES_IN`  | Expiracion access token (segundos) | `900`         |
| `JWT_REFRESH_TOKEN_EXPIRES_IN` | Expiracion refresh token           | `7d`          |
| `OAUTH2_PKCE_REQUIRED`         | Requerir PKCE                      | `true`        |
| `OAUTH2_PKCE_METHODS`          | Metodos PKCE permitidos            | `S256`        |
| `CORS_ORIGINS`                 | Origenes CORS permitidos           | -             |

Ver `.env.example` para la lista completa de variables.

## Scripts Disponibles

### Desarrollo

| Comando        | Descripcion                                       |
| -------------- | ------------------------------------------------- |
| `pnpm dev`     | Inicia servidor en modo desarrollo con hot-reload |
| `pnpm dev:app` | Solo servidor (sin compilar CSS)                  |
| `pnpm dev:css` | Solo compilar Tailwind CSS en modo watch          |

### Build

| Comando          | Descripcion                            |
| ---------------- | -------------------------------------- |
| `pnpm build`     | Compila TypeScript, CSS y copia assets |
| `pnpm build:ts`  | Solo compilar TypeScript               |
| `pnpm build:css` | Solo compilar Tailwind CSS             |
| `pnpm start`     | Ejecuta version compilada              |
| `pnpm clean`     | Elimina directorio dist/               |

### Base de Datos

| Comando               | Descripcion                                     |
| --------------------- | ----------------------------------------------- |
| `pnpm db:up`          | Inicia contenedor PostgreSQL                    |
| `pnpm db:down`        | Detiene y elimina contenedor                    |
| `pnpm db:setup`       | Setup completo (up + generate + migrate + seed) |
| `pnpm db:reset`       | Resetea base de datos                           |
| `pnpm db:seed`        | Ejecuta seeds                                   |
| `pnpm db:studio`      | Abre Prisma Studio                              |
| `pnpm db generate`    | Genera cliente Prisma                           |
| `pnpm db migrate dev` | Ejecuta migraciones en desarrollo               |

### Testing

| Comando                 | Descripcion                           |
| ----------------------- | ------------------------------------- |
| `pnpm test`             | Ejecuta todos los tests               |
| `pnpm test:unit`        | Solo tests unitarios                  |
| `pnpm test:integration` | Solo tests de integracion             |
| `pnpm test:all`         | Tests unitarios + integracion         |
| `pnpm test:coverage`    | Tests con reporte de cobertura        |
| `pnpm test:watch`       | Tests en modo watch                   |
| `pnpm test:ui`          | Tests con interfaz visual (Vitest UI) |
| `pnpm test:ci`          | Pipeline completo para CI             |

### Calidad de Codigo

| Comando           | Descripcion                      |
| ----------------- | -------------------------------- |
| `pnpm lint`       | Ejecuta ESLint                   |
| `pnpm lint:fix`   | ESLint con auto-fix              |
| `pnpm type-check` | Verificacion de tipos TypeScript |
| `pnpm quality`    | type-check + lint + tests        |

### Docker

| Comando              | Descripcion                       |
| -------------------- | --------------------------------- |
| `pnpm docker:build`  | Construye imagen Docker           |
| `pnpm docker:run`    | Ejecuta con docker-compose        |
| `pnpm generate:keys` | Genera par de llaves RSA para JWT |

## Estructura del Proyecto

```
src/
├── application/           # Capa de aplicacion
│   ├── dtos/             # Data Transfer Objects
│   ├── use-cases/        # Casos de uso
│   │   ├── auth/         # Autenticacion y autorizacion
│   │   ├── client/       # Gestion de clientes OAuth
│   │   ├── consent/      # Consentimientos de usuario
│   │   └── user/         # Gestion de usuarios
│   └── validate-schemas/ # Esquemas de validacion Zod
├── config/               # Configuracion de la aplicacion
├── container/            # Contenedor de dependencias
├── domain/               # Capa de dominio
│   ├── entities/         # Entidades de negocio
│   ├── errors/           # Errores de dominio
│   └── value-objects/    # Value Objects
├── infrastructure/       # Capa de infraestructura
│   ├── http/             # Servidor HTTP y middlewares
│   ├── lifecycle/        # Graceful shutdown
│   ├── mappers/          # Mapeadores entidad <-> DTO
│   ├── repositories/     # Repositorios Prisma
│   └── services/         # Servicios (JWT, logging, etc.)
├── interfaces/           # Contratos e interfaces
├── presentation/         # Capa de presentacion
│   ├── controller/       # Controladores HTTP
│   ├── middleware/       # Middlewares de ruta
│   └── routes/           # Definicion de rutas
└── shared/               # Utilidades compartidas
    ├── decorators/       # Decoradores (DI, logging)
    ├── errors/           # Errores compartidos
    └── helpers/          # Funciones utilitarias
```

## API Endpoints

### Autenticacion OAuth2

| Metodo | Endpoint                      | Descripcion                         |
| ------ | ----------------------------- | ----------------------------------- |
| GET    | `/auth/login`                 | Formulario de login                 |
| POST   | `/auth/login`                 | Autenticar credenciales             |
| GET    | `/auth/authorize`             | Iniciar flujo OAuth2                |
| GET    | `/auth/authorize/consent`     | Pantalla de consentimiento          |
| PUT    | `/auth/authorize/decision`    | Procesar decision de consentimiento |
| POST   | `/auth/token`                 | Intercambiar codigo por tokens      |
| GET    | `/auth/.well-known/jwks.json` | Llaves publicas JWKS                |

### Usuarios

| Metodo | Endpoint            | Descripcion        |
| ------ | ------------------- | ------------------ |
| POST   | `/user`             | Registrar usuario  |
| GET    | `/user/me`          | Obtener perfil     |
| PUT    | `/user/me`          | Actualizar perfil  |
| PUT    | `/user/me/password` | Cambiar contrasena |

### Clientes OAuth

| Metodo | Endpoint                    | Descripcion        |
| ------ | --------------------------- | ------------------ |
| POST   | `/client`                   | Crear cliente      |
| GET    | `/client`                   | Listar clientes    |
| GET    | `/client/:id`               | Obtener cliente    |
| PUT    | `/client/:id`               | Actualizar cliente |
| DELETE | `/client/:id`               | Eliminar cliente   |
| POST   | `/client/:id/rotate-secret` | Rotar secreto      |

### Health Check

| Metodo | Endpoint       | Descripcion         |
| ------ | -------------- | ------------------- |
| GET    | `/health`      | Health check basico |
| GET    | `/health/deep` | Health check con DB |

## Docker

### Build local

```bash
pnpm docker:build
```

### Ejecutar con docker-compose

```bash
# Desarrollo
docker-compose up -d

# Ver logs
docker-compose logs -f byteberry-oauth2
```

### Imagen desde Docker Hub

```bash
docker pull jruvalcabafsd/byteberry-oauth2:latest
```

## Testing

El proyecto usa Vitest con configuraciones separadas:

```bash
# Tests unitarios (mocks)
pnpm test:unit

# Tests de integracion (DB real)
pnpm db:test:setup
pnpm test:integration

# Pipeline completo
pnpm test:ci
```

## Tecnologias

- **Runtime**: Node.js, Express 5
- **Lenguaje**: TypeScript 5.9
- **Base de datos**: PostgreSQL 15, Prisma 7
- **Autenticacion**: JWT (jsonwebtoken), bcrypt
- **Validacion**: Zod 4
- **Logging**: Winston
- **Testing**: Vitest, Supertest
- **Estilos**: Tailwind CSS 4
- **CI/CD**: GitHub Actions, Semantic Release

## Licencia

ISC - Ver [LICENSE](LICENSE) para mas detalles.

## Autor

Jesus Ruvalcaba - [@JRuvalcabaFSD](https://github.com/JRuvalcabaFSD)
