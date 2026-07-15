import { existsSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const adminDir = join(__dirname, '..', 'app', 'admin');

const folders = readdirSync(adminDir, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);

for (const folder of folders) {
  const pagePath = join(adminDir, folder, 'page.tsx');
  if (!existsSync(pagePath)) {
    const title = folder.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const fnName = folder.replace(/-/g, '') + 'AdminPage';
    const content = [
      "import React from 'react';",
      "",
      "export default function " + fnName + "() {",
      "  return (",
      "    <div className='p-8'>",
      "      <h1 className='text-2xl font-bold mb-4'>" + title + "</h1>",
      "      <p className='text-muted-foreground'>",
      "        This section is pending implementation under the V34 Dominance Wave.",
      "      </p>",
      "    </div>",
      "  );",
      "}"
    ].join("\n");
    writeFileSync(pagePath, content, 'utf8');
    console.log("Created stub for " + folder);
  }
}
