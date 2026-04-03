import { readFile, rm, mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, "..");
const outputDir = resolve(repoRoot, "public/resume-preview");
const resumeSource = resolve(repoRoot, "resume/resume.yml");
const resumeHtml = resolve(outputDir, "resume.html");

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });

await run("yamlresume", ["build", resumeSource, "-o", outputDir]);

const html = await readFile(resumeHtml, "utf-8");
const patchedHtml = html.replaceAll(
	/<a href="(https?:\/\/[^"]+)"/g,
	'<a href="$1" target="_blank" rel="noopener noreferrer"',
);

await writeFile(resumeHtml, patchedHtml);

function run(command, args) {
	return new Promise((resolvePromise, rejectPromise) => {
		const child = spawn(command, args, {
			cwd: repoRoot,
			stdio: "inherit",
			shell: process.platform === "win32",
		});

		child.on("error", rejectPromise);
		child.on("exit", (code) => {
			if (code === 0) {
				resolvePromise();
				return;
			}
			rejectPromise(new Error(`${command} exited with code ${code ?? "unknown"}`));
		});
	});
}
