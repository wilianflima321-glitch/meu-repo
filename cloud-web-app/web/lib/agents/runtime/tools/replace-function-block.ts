import { tool } from '@langchain/core/tools'
import { z } from 'zod'
import * as fs from 'fs'

export const replaceFunctionBlockTool = tool(
  async ({ filePath, targetContent, replacementContent }) => {
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      if (!content.includes(targetContent)) {
        return \`Error: targetContent not found in \${filePath}. Please provide the exact text you want to replace.\`
      }
      const newContent = content.replace(targetContent, replacementContent)
      fs.writeFileSync(filePath, newContent, 'utf-8')
      return \`Successfully replaced content in \${filePath}\`
    } catch (e: any) {
      return \`Error reading or writing to \${filePath}: \${e.message}\`
    }
  },
  {
    name: 'replace_function_block',
    description: 'Surgically replaces a specific block of code in a file.',
    schema: z.object({
      filePath: z.string().describe('Absolute path to the file'),
      targetContent: z.string().describe('Exact string to be replaced'),
      replacementContent: z.string().describe('The new string to insert'),
    }),
  }
)
