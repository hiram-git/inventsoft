/// <reference types="astro/client" />

declare namespace App {
  interface Locals {
    user: {
      id: string;
      nombre: string;
      email: string;
      rol: string;
    };
    moneda: {
      simbolo: string;
      codigo: string;
      nombre: string;
    };
  }
}
