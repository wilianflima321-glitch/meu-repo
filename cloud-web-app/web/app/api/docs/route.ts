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
    body {
      margin: 0;
      background: #0d0d12;
    }
    .swagger-ui {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    .swagger-ui .topbar {
      background: #14141c;
      border-bottom: 1px solid #2a2a3c;
    }
    .swagger-ui .topbar .download-url-wrapper .select-label {
      color: #e4e4eb;
    }
    .swagger-ui .info {
      margin: 30px 0;
    }
    .swagger-ui .info .title {
      color: #e4e4eb;
    }
    .swagger-ui .info .description p {
      color: #8b8b9e;
    }
    .swagger-ui .scheme-container {
      background: #14141c;
      box-shadow: none;
      border: 1px solid #2a2a3c;
    }
    .swagger-ui section.models {
      border: 1px solid #2a2a3c;
    }
    .swagger-ui .model-container {
      background: #14141c;
    }
    .swagger-ui .opblock.opblock-get {
      border-color: #22c55e;
      background: rgba(34, 197, 94, 0.1);
    }
    .swagger-ui .opblock.opblock-post {
      border-color: #6366f1;
      background: rgba(99, 102, 241, 0.1);
    }
    .swagger-ui .opblock.opblock-put {
      border-color: #f59e0b;
      background: rgba(245, 158, 11, 0.1);
    }
    .swagger-ui .opblock.opblock-delete {
      border-color: #ef4444;
      background: rgba(239, 68, 68, 0.1);
    }
    .swagger-ui .opblock.opblock-patch {
      border-color: #06b6d4;
      background: rgba(6, 182, 212, 0.1);
    }
    .swagger-ui .btn.authorize {
      background: #6366f1;
      border-color: #6366f1;
      color: white;
    }
    .swagger-ui .btn.authorize:hover {
      background: #7c7ff2;
    }
    /* Dark mode adjustments */
    .swagger-ui .opblock .opblock-summary-operation-id,
    .swagger-ui .opblock .opblock-summary-path,
    .swagger-ui .opblock .opblock-summary-description {
      color: #e4e4eb !important;
    }
    .swagger-ui table thead tr td, 
    .swagger-ui table thead tr th {
      color: #e4e4eb;
      border-color: #2a2a3c;
    }
    .swagger-ui .response-col_status {
      color: #e4e4eb;
    }
    .swagger-ui .tab li {
      color: #8b8b9e;
    }
    .swagger-ui .tab li.active {
      color: #e4e4eb;
    }
    .swagger-ui .opblock-description-wrapper p,
    .swagger-ui .opblock-external-docs-wrapper p {
      color: #8b8b9e;
    }
    .swagger-ui .parameter__name,
    .swagger-ui .parameter__type,
    .swagger-ui .parameter__in {
      color: #e4e4eb;
    }
    .swagger-ui input[type=text],
    .swagger-ui textarea {
      background: #14141c;
      border-color: #2a2a3c;
      color: #e4e4eb;
    }
    .swagger-ui select {
      background: #14141c;
      border-color: #2a2a3c;
      color: #e4e4eb;
    }
    .swagger-ui .model-title,
    .swagger-ui .model {
      color: #e4e4eb;
    }
    .swagger-ui .prop-type {
      color: #6366f1;
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
