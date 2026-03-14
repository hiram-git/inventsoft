-- Migración: agregar columna enviar_a_cocina a productos y servicios
-- Indica si el ítem debe aparecer en el selector de comandas de cocina
-- Default false: los registros existentes no se muestran en cocina hasta que se habilite manualmente

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS enviar_a_cocina boolean NOT NULL DEFAULT false;

ALTER TABLE servicios
  ADD COLUMN IF NOT EXISTS enviar_a_cocina boolean NOT NULL DEFAULT false;
