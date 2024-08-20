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
        return dirent.isDirectory() ? getFilesRecursively(res) : [res];
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

            if (
                relativePath.startsWith("Classes") ||
                relativePath.startsWith("StaticClasses") ||
                relativePath.startsWith("Structs") ||
                relativePath.startsWith("UtilityClasses")
            ) {
                fileContents.staticClass =
                    relativePath.startsWith("StaticClasses") ||
                    relativePath.startsWith("UtilityClasses");
                docs.classes[fileContents.name] = fileContents;
                return;
            }
        });
	await Promise.all(promises);

    // console.log(docs);

    if (!fs.existsSync("./docs"))
	    await fs.promises.mkdir("./docs");

	for (const [name, gen] of Object.entries(SUPPORTED_LANGUAGES)) {
		console.log(`Generating ${name} documentation...`);
		const output = gen.generate(docs);
		await fs.promises.writeFile(`./docs/${gen.docsName}`, output);
	}
}

buildDocs().then(() => console.log("Build finished"));