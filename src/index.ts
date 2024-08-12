import { getInput } from "@actions/core";
import { getOctokit } from "@actions/github";

import * as fs from "fs";

import {
	Docs,
} from "./schema";
import { SUPPORTED_LANGUAGES } from "./generator";

console.log("Building documentation...");

const TOKEN = getInput("github-token");
const REPO_OWNER = getInput("repository-owner");
const REPO_NAME = getInput("repository-name");
const REPO_BRANCH = getInput("repository-branch");

const octokit = getOctokit(TOKEN);

async function buildDocs() {
	const response = await octokit.request(
		"GET /repos/{owner}/{repo}/git/trees/{tree_sha}",
		{
			owner: REPO_OWNER,
			repo: REPO_NAME,
			tree_sha: REPO_BRANCH,
			recursive: "1",
		}
	);

	let docs: Docs = {
		classes: {},
		enums: {},
	};

	const promises = response.data.tree
		.filter(function (entry) {
			return entry.type === "blob" && entry.path?.endsWith(".json");
		})
		.map((entry) =>
			(async () => {
				if (entry.path === undefined || entry.path.startsWith("_"))
					return;
				console.log(`Processing ${entry.path}...`);

				const response = await octokit.request(
					"GET /repos/{owner}/{repo}/contents/{path}",
					{
						accept: "application/vnd.github+json",
						owner: REPO_OWNER,
						repo: REPO_NAME,
						path: entry.path,
						ref: REPO_BRANCH,
					}
				);

				// Process file
				const file: any = response.data;
				if (file.content === undefined) return;

				const fileContents = JSON.parse(
					atob(file.content.replaceAll("\n", ""))
				);

				// Write annotations
				if (entry.path === "Enums.json") {
					docs.enums = fileContents;
					return;
				}

				if (
					entry.path.startsWith("Classes") ||
					entry.path.startsWith("StaticClasses") ||
					entry.path.startsWith("Structs") ||
					entry.path.startsWith("UtilityClasses")
				) {
					fileContents.staticClass =
						entry.path.startsWith("StaticClasses") ||
						entry.path.startsWith("UtilityClasses");
					docs.classes[fileContents.name] = fileContents;
					return;
				}
			})()
		);
	await Promise.all(promises);

	await fs.promises.mkdir("./docs");

	for (const [name, gen] of Object.entries(SUPPORTED_LANGUAGES)) {
		console.log(`Generating ${name} documentation...`);
		const output = gen.generate(docs);
		await fs.promises.writeFile(`./docs/${gen.docsName}`, output);
	}
}

buildDocs().then(() => console.log("Build finished"));
