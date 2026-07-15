/**
 * Aethel Engine API - OpenAPI 3.0 specification.
 *
 * Keep this file as a small assembly point; paths, metadata and schemas live in
 * focused modules so the API contract remains reviewable.
 */

import type { OpenAPIV3 } from 'openapi-types';

import { openApiComponents } from './openapi-spec.components';
import { openApiInfo, openApiServers, openApiTags } from './openapi-spec.meta';
import { openApiPaths } from './openapi-spec.paths';

export const openApiSpec: OpenAPIV3.Document = {
  openapi: '3.0.3',
  info: openApiInfo,
  servers: openApiServers,
  tags: openApiTags,
  paths: openApiPaths,
  components: openApiComponents,
};

export default openApiSpec;
