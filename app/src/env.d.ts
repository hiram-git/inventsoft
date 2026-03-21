/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    user: {
      id: string;
      nombre: string;
      email: string;
      rol: string;
      globalId: string;
    };
    empresa: {
      slug: string;
      nombre: string;
    } | null;
    sucursal: {
      id: string;
      nombre: string;
      almacenId: string | null;
      almacenNombre: string;
    } | null;
    moneda: {
      simbolo: string;
      codigo: string;
      nombre: string;
    };
  }
}
