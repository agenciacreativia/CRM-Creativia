import { NextResponse } from "next/server";

/**
 * OpenAPI 3.1 spec de la API pública v1 del CRM Turistea.
 * Servida en /api/v1/openapi.json — consumible por Swagger UI, Insomnia, Postman, etc.
 */

const SPEC = {
  openapi: "3.1.0",
  info: {
    title: "Turistea CRM — API v1",
    version: "1.0.0",
    description:
      "API REST multi-tenant del CRM Turistea. Una key activa por cuenta, con límite mensual configurable. Si se excede el límite, los leads entrantes van automáticamente a la lista de espera y se procesan al renovarse el cupo.",
    contact: {
      name: "Agencia Creativia",
      url: "https://agenciacreativia.com/",
    },
    license: { name: "Proprietary" },
  },
  servers: [
    {
      url: "https://{subdominio}.turisteacrm.com/api/v1",
      description: "Producción (reemplazar {subdominio} por el tenant)",
      variables: {
        subdominio: { default: "creativia", description: "Tu subdominio de tenant" },
      },
    },
  ],
  security: [{ ApiKeyBearer: [] }],
  paths: {
    "/{modulo}": {
      parameters: [
        {
          name: "modulo",
          in: "path",
          required: true,
          schema: { type: "string", enum: ["contactos", "empresas", "oportunidades", "productos"] },
        },
      ],
      get: {
        summary: "Listar registros del módulo",
        operationId: "listResources",
        parameters: [{ name: "limit", in: "query", schema: { type: "integer", default: 50, maximum: 200 } }],
        responses: {
          "200": {
            description: "Lista paginada",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "array", items: { type: "object" } },
                    uso: { $ref: "#/components/schemas/Uso" },
                  },
                },
              },
            },
          },
          "401": { description: "API key inválida o revocada" },
          "404": { description: "Módulo desconocido" },
        },
      },
      post: {
        summary: "Crear un registro nuevo",
        operationId: "createResource",
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", additionalProperties: true },
              examples: {
                contacto: {
                  value: {
                    nombre: "Ana Pérez",
                    email: "ana@ejemplo.com",
                    telefono: "+54 11 5555 1234",
                  },
                },
                oportunidad: {
                  value: {
                    nombre: "Paquete Europa 12d",
                    contacto_id: "00000000-0000-0000-0000-000000000001",
                    empresa_id: "00000000-0000-0000-0000-000000000002",
                    valor: 4500,
                    moneda: "USD",
                  },
                },
              },
            },
          },
        },
        responses: {
          "201": {
            description: "Creado",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: { type: "object" },
                    uso: { $ref: "#/components/schemas/Uso" },
                  },
                },
              },
            },
          },
          "202": {
            description: "Aceptado pero se excedió el cupo mensual — el lead quedó en lista de espera (en_espera=true).",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    data: {
                      type: "object",
                      properties: {
                        id: { type: "string", format: "uuid" },
                        en_lista_espera: { type: "boolean", const: true },
                      },
                    },
                    mensaje: { type: "string" },
                    uso: { $ref: "#/components/schemas/Uso" },
                  },
                },
              },
            },
          },
          "400": { description: "Campos requeridos faltantes o body inválido" },
          "401": { description: "Sin auth" },
        },
      },
    },
    "/{modulo}/{id}": {
      parameters: [
        { name: "modulo", in: "path", required: true, schema: { type: "string" } },
        { name: "id", in: "path", required: true, schema: { type: "string", format: "uuid" } },
      ],
      get: {
        summary: "Leer un registro",
        operationId: "getResource",
        responses: {
          "200": { description: "Encontrado" },
          "404": { description: "No encontrado" },
        },
      },
      patch: {
        summary: "Actualizar campos parciales",
        operationId: "patchResource",
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", additionalProperties: true } } },
        },
        responses: { "200": { description: "OK" }, "400": { description: "Error" } },
      },
      delete: {
        summary: "Eliminar (soft-delete para oportunidades, hard para el resto)",
        operationId: "deleteResource",
        responses: { "200": { description: "OK" } },
      },
    },
  },
  components: {
    securitySchemes: {
      ApiKeyBearer: {
        type: "http",
        scheme: "bearer",
        bearerFormat: "API Key (crm_…)",
        description: "Generá tu key en /ajustes/integraciones. Header: `Authorization: Bearer crm_…`",
      },
    },
    schemas: {
      Uso: {
        type: "object",
        properties: {
          usados: { type: "integer", description: "Requests del mes corriente" },
          limite: { type: "integer", description: "Límite mensual configurado" },
        },
      },
    },
  },
} as const;

export async function GET() {
  return NextResponse.json(SPEC, {
    headers: {
      "Cache-Control": "public, max-age=300, s-maxage=300",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
