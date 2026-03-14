-- Migración: agregar columna enviar_a_cocina a la tabla productos
-- Indica si el producto debe aparecer en las comandas de cocina
-- Default false: los productos existentes no se muestran en cocina hasta que se habilite

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS enviar_a_cocina boolean NOT NULL DEFAULT false;
