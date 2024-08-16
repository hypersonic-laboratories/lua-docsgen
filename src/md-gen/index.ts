// Read in /api-dump as json
// Pass to md-formatter to format as markdown
// Eventual: Read in /examples and pass to examples.ts to integrate (json or md format? - also notify of missing?)

import * as fs from 'fs';
import * as path from 'path';
import { jsonToMarkdown } from './md-formatter';

// Base directory containing JSON files
const baseDir = path.join(__dirname, '../../api-dump');
const outputDir = path.join(__dirname, 'outputFolder');

// Ensure a directory exists
function ensureDirSync(dir: string) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
}

// Process JSON files and convert them to Markdown
function processJsonFiles(directory: string, outputDirectory: string) {
    const queue: [string, string][] = [[directory, outputDirectory]];

    while (queue.length > 0) {
        const [currentDir, currentOutputDir] = queue.shift()!;

        const items = fs.readdirSync(currentDir, { withFileTypes: true });

        for (const item of items) {
            const fullPath = path.join(currentDir, item.name);
            const relativePath = path.relative(baseDir, fullPath);
            const outputPath = path.join(currentOutputDir, relativePath);

            if (item.isDirectory()) {
                // Queue subdirectory for processing
                queue.push([fullPath, path.join(currentOutputDir, item.name)]);
            } else if (item.isFile() && item.name.endsWith('.json')) {
                // Process JSON file
                const jsonData = JSON.parse(fs.readFileSync(fullPath, 'utf-8'));

                // Convert JSON to Markdown
                const markdownData = jsonToMarkdown(jsonData);

                // Ensure directory exists and write Markdown file
                ensureDirSync(path.dirname(outputPath));
                fs.writeFileSync(outputPath.replace(/\.json$/, '.md'), markdownData, 'utf-8');
            }
        }
    }
}

async function main() {
    try {
        ensureDirSync(outputDir);
        processJsonFiles(baseDir, outputDir);
        console.log('Files have been converted and saved.');
    } catch (error) {
        console.error('Error processing files:', error);
    }
}

main();

