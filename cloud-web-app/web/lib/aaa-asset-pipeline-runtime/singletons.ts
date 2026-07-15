/**
 * AAA Asset Pipeline - split runtime modules.
 *
 * Asset import, database, optimization, and streaming stay behind Studio/Local
 * runtime boundaries until capability and provenance evidence is available.
 */

import { AssetDatabase } from './database';
import { AssetImporter } from './importer';
import { AssetOptimizer } from './optimizer';
import { AssetStreamer } from './streamer';
import { DEFAULT_IMPORT_OPTIONS } from './types';

export const assetImporter = new AssetImporter();
export const assetDatabase = new AssetDatabase();
export const assetOptimizer = new AssetOptimizer();
export const assetStreamer = new AssetStreamer();

const aaaAssetPipeline = {
  AssetImporter,
  AssetDatabase,
  AssetOptimizer,
  AssetStreamer,
  assetImporter,
  assetDatabase,
  assetOptimizer,
  assetStreamer,
  DEFAULT_IMPORT_OPTIONS,
};

export default aaaAssetPipeline;
