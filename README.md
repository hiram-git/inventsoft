# InventSoft ERP

Sistema ERP web multi-empresa y multi-sucursal construido con **Astro 5 SSR**, **DrizzleORM** y **PostgreSQL**. Incluye un asistente de instalación web que configura la base de datos y crea el primer usuario administrador sin necesidad de ejecutar comandos manuales.

---

## Tecnologías

| Capa | Tecnología |
|---|---|
| Framework | [Astro 5](https://astro.build) — SSR con adaptador Node.js |
| ORM | [DrizzleORM](https://orm.drizzle.team) + `postgres-js` |
| Base de datos | PostgreSQL 14+ |
| Estilos | Tailwind CSS v4 |
| Animaciones | GSAP 3 |
| Auth web | Cookies HTTP-only (`session_user_id`, `session_empresa`, `session_sucursal_id`) |
| Auth móvil | Bearer tokens en memoria (Map, 8 h) |
| Contraseñas | bcryptjs |
| PDF | PDFKit |
| Impresión térmica | node-thermal-printer |

---

## Características

- **Asistente de instalación web** — configura la empresa y crea el administrador desde el navegador; corre `drizzle-kit push` automáticamente.
- **Multi-empresa** — aislamiento por schema de PostgreSQL (`inventsoft_{slug}`). Schema central `inventsoft_auth` para credenciales y registro de empresas.
- **Multi-sucursal** — sesión por sucursal con cookie; números de documento atómicos por sucursal.
- **Módulos incluidos**: Clientes, Productos, Almacenes, Facturas, Cotizaciones, Pedidos, Compras, Cobros, Notas de crédito, Comandas, Proveedores, Vendedores, Reportes.
- **API REST** para aplicaciones móviles con Bearer tokens.
- **Roles y permisos** configurables por empresa.
- **Generación de PDF** de documentos.
- **Impresión térmica** de tickets.

---

## Requisitos previos

- Node.js 20+
- PostgreSQL 14+ (accesible localmente o en red)
- npm 9+

---

## Instalación desde cero

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd inventsoft/app
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar variables de entorno

```bash
cp .env.example .env
```

Editar `.env` con los datos reales:

```env
# Cadena de conexión a PostgreSQL
DATABASE_URL=postgresql://usuario:password@localhost:5432/inventsoft

# Slug de la empresa por defecto (instalación single-tenant usa el schema 'public')
DEFAULT_COMPANY_SLUG=public
```

> **Nota**: La base de datos debe existir (`CREATE DATABASE inventsoft;`), pero no necesita tablas — el asistente de instalación las crea.

### 4. Iniciar el servidor de desarrollo

```bash
npm run dev
```

### 5. Completar el asistente de instalación

Abrir en el navegador: **http://localhost:4321**

El sistema detecta que no hay datos y redirige automáticamente a `/setup`. El asistente solicita:

- **Datos de la empresa**: nombre, RUC/RIF, NIT, teléfono, email, dirección.
- **Cuenta del administrador**: nombre completo, correo y contraseña.

Al confirmar, el asistente:

1. Crea todas las tablas en PostgreSQL (vía `drizzle-kit push`).
2. Crea el schema `inventsoft_auth` con las tablas de autenticación central.
3. Inserta los permisos, roles y datos de la empresa.
4. Crea el usuario administrador.
5. Redirige al login.

---

## Comandos disponibles

```bash
# Desarrollo con hot reload
npm run dev

# Build de producción
npm run build

# Vista previa del build
npm run preview

# Aplicar cambios del schema a la base de datos
npm run db:push

# Abrir DrizzleKit Studio (GUI de la base de datos)
npm run db:studio

# Generar archivos de migración SQL
npm run db:generate
```

---

## Agregar una nueva empresa (multi-tenant)

Una vez instalado el sistema, se puede agregar un nuevo tenant con el script de aprovisionamiento:

```bash
npx tsx scripts/create-company.ts \
  --slug acme \
  --nombre "Acme Corp" \
  --adminEmail admin@acme.com \
  --adminPassword contraseña123
```

El script:

1. Crea el schema `inventsoft_acme` en PostgreSQL.
2. Crea todas las tablas en ese schema.
3. Siembra roles, permisos, empresa y secuencias.
4. Registra la empresa en `inventsoft_auth.empresas_registry`.
5. Crea o vincula el usuario administrador global.

> El `slug` debe ser alfanumérico en minúsculas (sin espacios ni guiones). Se usa como identificador del schema y como cookie de sesión.

---

## Estructura del proyecto

```
app/
├── scripts/
│   └── create-company.ts       # Aprovisionamiento de nuevas empresas
├── src/
│   ├── db/
│   │   ├── auth-schema.ts      # Schema central inventsoft_auth
│   │   ├── index.ts            # getDb(), authDb, requestDb (AsyncLocalStorage), Proxy db
│   │   └── schema.ts           # Tablas por empresa (clientes, facturas, etc.)
│   ├── lib/
│   │   ├── auth.ts             # Cookies de sesión (usuario, empresa, sucursal)
│   │   ├── setup-check.ts      # isSetupComplete() con caché
│   │   ├── store.ts            # Capa de acceso a datos (CRUD de todos los módulos)
│   │   └── tokens.ts           # Bearer tokens para apps móviles
│   ├── middleware.ts            # Resolución de empresa → requestDb.run(getDb(slug), next)
│   ├── pages/
│   │   ├── setup.astro         # Asistente de instalación (4 pasos)
│   │   ├── login.astro         # Login con autenticación central
│   │   ├── select-company.astro # Selector de empresa (multi-tenant)
│   │   ├── select-branch.astro  # Selector de sucursal
│   │   ├── dashboard.astro
│   │   └── api/
│   │       ├── setup.ts        # POST — ejecuta instalación inicial
│   │       └── auth/
│   │           ├── login.ts        # POST — auth central, devuelve empresas + sucursales
│   │           ├── logout.ts       # POST — limpia cookies y tokens
│   │           ├── select-company.ts # POST — selecciona empresa activa
│   │           └── switch-branch.ts  # POST — cambia sucursal activa
│   └── styles/
│       └── global.css
├── .env.example
├── astro.config.mjs
├── drizzle.config.ts
└── package.json
```

---

## Arquitectura de base de datos

```
PostgreSQL
├── inventsoft_auth          ← Schema central (autenticación)
│   ├── usuarios_global      ← Credenciales únicas por email
│   ├── empresas_registry    ← Registro de tenants (slug, nombre)
│   └── usuario_empresas     ← Qué usuarios acceden a qué empresas
│
├── public                   ← Empresa por defecto (DEFAULT_COMPANY_SLUG=public)
│   ├── usuarios             ← Usuarios locales de la empresa
│   ├── empresa              ← Datos de la empresa (nombre, RUC, moneda…)
│   ├── clientes, productos, almacenes, facturas, …
│   ├── sucursales, usuario_sucursales
│   └── secuencias           ← Numeración atómica de documentos
│
└── inventsoft_acme          ← Segunda empresa (slug=acme)
    └── (mismas tablas que public)
```

### Flujo de autenticación

```
Login (email + password)
  │
  ├─▶ Valida en inventsoft_auth.usuarios_global (bcrypt)
  │
  ├─▶ Obtiene empresas del usuario desde usuario_empresas
  │       ├─ 1 empresa  → setea cookie session_empresa → dashboard
  │       └─ N empresas → /select-company
  │
  └─▶ Dentro del contexto de empresa → obtiene sucursales
          ├─ 1 sucursal  → setea cookie session_sucursal_id
          └─ N sucursales → /select-branch
```

---

## Variables de entorno

| Variable | Descripción | Por defecto |
|---|---|---|
| `DATABASE_URL` | Cadena de conexión PostgreSQL | — (requerida) |
| `DEFAULT_COMPANY_SLUG` | Slug del tenant por defecto en instalaciones single-tenant | `public` |

---

## Producción

```bash
# 1. Build
npm run build

# 2. Iniciar servidor Node.js
node dist/server/entry.mjs
```

El servidor escucha en el puerto definido por la variable `PORT` (por defecto `4321`). Se recomienda usar un proxy inverso (Nginx, Caddy) con SSL en producción.
