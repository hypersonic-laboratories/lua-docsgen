import { getInput } from "@actions/core";
import { getOctokit } from "@actions/github";

import * as fs from "fs";

import {
	Docs,
} from "./schema";
import { SUPPORTED_LANGUAGES } from "./generator";
import * as path from "path";

console.log("Building documentation...");

const LOCAL_FOLDER = "D:\\code\\helix\\docs\\src\\api";

async function getFilesRecursively(dir: string): Promise<string[]> {
    const dirents = await fs.promises.readdir(dir, { withFileTypes: true });
    const files = await Promise.all(dirents.map((dirent) => {
        const res = path.resolve(dir, dirent.name);
        return dirent.isDirectory() ? getFilesRecursively(res) : res;
    }));
    return Array.prototype.concat(...files);
}

async function buildDocs() {
    const files = await getFilesRecursively(LOCAL_FOLDER);

	let docs: Docs = {
		classes: {},
		enums: {},
	};

    const promises = files
        .filter(file => file.endsWith('.json') && !path.basename(file).startsWith('_'))
        .map(async (filePath) => {
            const relativePath = path.relative(LOCAL_FOLDER, filePath);
            console.log(`Processing ${relativePath}...`);

            const fileContents = JSON.parse(await fs.promises.readFile(filePath, 'utf8'));

            // Write annotations
            if (path.basename(filePath) === "Enums.json") {
                docs.enums = fileContents;
                return;
            }

            const fileName = path.basename(filePath);
            if (
                fileName.startsWith("Classes") ||
                fileName.startsWith("StaticClasses") ||
                fileName.startsWith("Structs") ||
                fileName.startsWith("UtilityClasses")
            ) {
                fileContents.staticClass =
                    fileName.startsWith("StaticClasses") ||
                    fileName.startsWith("UtilityClasses");
                docs.classes[fileContents.name] = fileContents;
                return;
            }
        });
	await Promise.all(promises);

	await fs.promises.mkdir("./docs");

	for (const [name, gen] of Object.entries(SUPPORTED_LANGUAGES)) {
		console.log(`Generating ${name} documentation...`);
		const output = gen.generate(docs);
		await fs.promises.writeFile(`./docs/${gen.docsName}`, output);
	}
}

buildDocs().then(() => console.log("Build finished"));
