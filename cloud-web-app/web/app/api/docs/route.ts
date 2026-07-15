/**
 * API Documentation - Swagger UI Endpoint
 */

import { NextResponse } from 'next/server';
import openApiSpec from '@/lib/openapi-spec';

// Swagger UI HTML Template
const swaggerHtml = (specUrl: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="description" content="Aethel Engine API Documentation" />
  <title>Aethel Engine API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui.css" />
  <link rel="icon" href="/favicon.ico" />
  <style>
  :root {
    --aethel-docs-bg: var(--aethel-docs-bg);
    --aethel-docs-surface: var(--aethel-docs-surface);
    --aethel-docs-border: var(--aethel-docs-border);
    --aethel-docs-text: var(--aethel-docs-text);
    --aethel-docs-text-muted: var(--aethel-docs-text-muted);
    --aethel-docs-primary: var(--aethel-docs-primary);
    --aethel-docs-success: var(--aethel-docs-success);
    --aethel-docs-warning: var(--aethel-docs-warning);
    --aethel-docs-error: var(--aethel-docs-error);
    --aethel-docs-info: var(--aethel-docs-info);
  }

    body {
      margin: 0;
      background: var(--aethel-docs-bg);
    }
    .swagger-ui {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    .swagger-ui .topbar {
      background: var(--aethel-docs-surface);
      border-bottom: 1px solid var(--aethel-docs-border);
    }
    .swagger-ui .topbar .download-url-wrapper .select-label {
      color: var(--aethel-docs-text);
    }
    .swagger-ui .info {
      margin: 30px 0;
    }
    .swagger-ui .info .title {
      color: var(--aethel-docs-text);
    }
    .swagger-ui .info .description p {
      color: var(--aethel-docs-text-muted);
    }
    .swagger-ui .scheme-container {
      background: var(--aethel-docs-surface);
      box-shadow: none;
      border: 1px solid var(--aethel-docs-border);
    }
    .swagger-ui section.models {
      border: 1px solid var(--aethel-docs-border);
    }
    .swagger-ui .model-container {
      background: var(--aethel-docs-surface);
    }
    .swagger-ui .opblock.opblock-get {
      border-color: var(--aethel-docs-success);
      background: color-mix(in_srgb,var(--aethel-docs-success) 10%, transparent);
    }
    .swagger-ui .opblock.opblock-post {
      border-color: var(--aethel-docs-primary);
      background: color-mix(in_srgb,var(--aethel-docs-primary) 10%, transparent);
    }
    .swagger-ui .opblock.opblock-put {
      border-color: var(--aethel-docs-warning);
      background: color-mix(in_srgb,var(--aethel-docs-warning) 10%, transparent);
    }
    .swagger-ui .opblock.opblock-delete {
      border-color: var(--aethel-docs-error);
      background: color-mix(in_srgb,var(--aethel-docs-error) 10%, transparent);
    }
    .swagger-ui .opblock.opblock-patch {
      border-color: var(--aethel-docs-info);
      background: color-mix(in_srgb,var(--aethel-docs-info) 10%, transparent);
    }
    .swagger-ui .btn.authorize {
      background: var(--aethel-docs-primary);
      border-color: var(--aethel-docs-primary);
      color: white;
    }
    .swagger-ui .btn.authorize:hover {
      background: color-mix(in_srgb,var(--aethel-docs-primary) 80%, white);
    }
    /* Dark mode adjustments */
    .swagger-ui .opblock .opblock-summary-operation-id,
    .swagger-ui .opblock .opblock-summary-path,
    .swagger-ui .opblock .opblock-summary-description {
      color: var(--aethel-docs-text) !important;
    }
    .swagger-ui table thead tr td, 
    .swagger-ui table thead tr th {
      color: var(--aethel-docs-text);
      border-color: var(--aethel-docs-border);
    }
    .swagger-ui .response-col_status {
      color: var(--aethel-docs-text);
    }
    .swagger-ui .tab li {
      color: var(--aethel-docs-text-muted);
    }
    .swagger-ui .tab li.active {
      color: var(--aethel-docs-text);
    }
    .swagger-ui .opblock-description-wrapper p,
    .swagger-ui .opblock-external-docs-wrapper p {
      color: var(--aethel-docs-text-muted);
    }
    .swagger-ui .parameter__name,
    .swagger-ui .parameter__type,
    .swagger-ui .parameter__in {
      color: var(--aethel-docs-text);
    }
    .swagger-ui input[type=text],
    .swagger-ui textarea {
      background: var(--aethel-docs-surface);
      border-color: var(--aethel-docs-border);
      color: var(--aethel-docs-text);
    }
    .swagger-ui select {
      background: var(--aethel-docs-surface);
      border-color: var(--aethel-docs-border);
      color: var(--aethel-docs-text);
    }
    .swagger-ui .model-title,
    .swagger-ui .model {
      color: var(--aethel-docs-text);
    }
    .swagger-ui .prop-type {
      color: var(--aethel-docs-primary);
    }
    /* Logo */
    .swagger-ui .topbar .topbar-wrapper::before {
      content: '🎮 ';
    }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-bundle.js" crossorigin></script>
  <script src="https://unpkg.com/swagger-ui-dist@5.11.0/swagger-ui-standalone-preset.js" crossorigin></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '${specUrl}',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIStandalonePreset
        ],
        plugins: [
          SwaggerUIBundle.plugins.DownloadUrl
        ],
        layout: "StandaloneLayout",
        persistAuthorization: true,
        displayRequestDuration: true,
        filter: true,
        syntaxHighlight: {
          activate: true,
          theme: 'monokai'
        }
      });
    };
  </script>
</body>
</html>
`;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format');
  
  // Return JSON spec
  if (format === 'json') {
    return NextResponse.json(openApiSpec);
  }
  
  // Return YAML spec
  if (format === 'yaml') {
    // Simple YAML conversion (in production, use js-yaml)
    const yaml = JSON.stringify(openApiSpec, null, 2)
      .replace(/"/g, '')
      .replace(/,$/gm, '');
    return new NextResponse(yaml, {
      headers: {
        'Content-Type': 'text/yaml',
      },
    });
  }
  
  // Return Swagger UI HTML
  const baseUrl = request.url.split('/api/docs')[0];
  const specUrl = `${baseUrl}/api/docs?format=json`;
  
  return new NextResponse(swaggerHtml(specUrl), {
    headers: {
      'Content-Type': 'text/html',
    },
  });
}
