import { pgSchema, serial, varchar, boolean, integer, timestamp } from 'drizzle-orm/pg-core';

export const authSchema = pgSchema('inventsoft_auth');

/** Global user accounts — credentials live here, shared across all companies */
export const usuariosGlobal = authSchema.table('usuarios_global', {
  id:           serial('id').primaryKey(),
  nombre:       varchar('nombre', { length: 200 }).notNull(),
  email:        varchar('email', { length: 200 }).notNull().unique(),
  passwordHash: varchar('password_hash', { length: 200 }).notNull(),
  creadoEn:     timestamp('creado_en').defaultNow().notNull(),
});

/** Company registry — one row per tenant */
export const empresasRegistry = authSchema.table('empresas_registry', {
  id:       serial('id').primaryKey(),
  slug:     varchar('slug', { length: 100 }).notNull().unique(),
  nombre:   varchar('nombre', { length: 200 }).notNull(),
  activo:   boolean('activo').default(true).notNull(),
  creadoEn: timestamp('creado_en').defaultNow().notNull(),
});

/** Maps global users to companies they can access */
export const usuarioEmpresas = authSchema.table('usuario_empresas', {
  id:           serial('id').primaryKey(),
  globalUserId: integer('global_user_id').notNull(),
  empresaSlug:  varchar('empresa_slug', { length: 100 }).notNull(),
  activo:       boolean('activo').default(true).notNull(),
});
