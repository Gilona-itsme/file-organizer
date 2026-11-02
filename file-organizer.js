import path from "node:path";
import os from "node:os";
import process from "node:process";
import { Scanner } from "./lib/scanner.js";
import { DuplicateFinder } from "./lib/duplicates.js";
import { Organizer } from "./lib/organizer.js";
import { Cleanup } from "./lib/cleanup.js";
import { formatSize, drawProgressBar, describeError } from "./lib/utils.js";

const USAGE = `
file-organizer — CLI tool for taming your Downloads folder

Usage:
  node file-organizer.js scan <directory>
  node file-organizer.js duplicates <directory>
  node file-organizer.js organize <directory> --output <target>
  node file-organizer.js cleanup <directory> --older-than <days> [--confirm]

Options:
  --output <dir>        Target directory for "organize"
  --older-than <days>   Age threshold in days for "cleanup"
  --confirm             Actually delete files (without it, cleanup is a dry run)
  --help                Show this help
`;

// ---------------------------------------------------------------- helpers

const VALUE_FLAGS = new Set(["output", "older-than"]);

function parseArgs(argv) {
	const positional = [];
	const flags = {};

	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (!arg.startsWith("--")) {
			positional.push(arg);
			continue;
		}

		const eq = arg.indexOf("=");
		const name = eq === -1 ? arg.slice(2) : arg.slice(2, eq);

		if (VALUE_FLAGS.has(name)) {
			flags[name] = eq === -1 ? argv[++i] : arg.slice(eq + 1);
		} else {
			flags[name] = true;
		}
	}

	return { positional, flags };
}

function fail(message) {
	console.error(`❌ Error: ${message}`);
	process.exit(1);
}

function renderProgress(label, current, total) {
	if (total === 0) return;
	const line = `${label} ${drawProgressBar(current, total)}`;
	process.stdout.write(`\r${line}`);
	if (current >= total) process.stdout.write("\n");
}

function warn(message) {
	process.stdout.write(`\r${" ".repeat(80)}\r`);
	console.warn(`⚠️  ${message}`);
}

function pad(text, width) {
	return String(text).padEnd(width);
}

async function runScan(directory) {
	const scanner = new Scanner();
	let progressTotal = 0;

	scanner.on("scan-start", ({ directory: dir }) => {
		console.log(`📂 Scanning: ${dir}`);
	});
	scanner.on("files-listed", ({ total }) => {
		progressTotal = total;
	});
	scanner.on("file-found", ({ processed, total }) => {
		const step = Math.max(1, Math.floor(total / 100));
		if (processed % step === 0 || processed === total) {
			renderProgress("Processing...", processed, total);
		}
	});
	scanner.on("scan-warning", ({ path: p, error }) =>
		warn(describeError(error, p)),
	);

	scanner.on("scan-complete", (stats) => {
		if (progressTotal > 0 && stats.totalFiles < progressTotal) {
			renderProgress("Processing...", progressTotal, progressTotal);
		}
		printScanReport(stats);
	});

	await scanner.scan(directory);
}

function printScanReport(stats) {
	console.log("\n📊 Scan Results:");
	console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
	console.log(`Total files: ${stats.totalFiles}`);
	console.log(`Total size: ${formatSize(stats.totalSize)}`);

	if (stats.totalFiles === 0) {
		console.log("\nNo files found.");
		return;
	}

	const MAX_TYPES = 10;
	const types = [...stats.byType.entries()].sort(
		(a, b) => b[1].totalSize - a[1].totalSize,
	);
	const shown = types.slice(0, MAX_TYPES);
	const rest = types.slice(MAX_TYPES);

	console.log("\nBy File Type:");
	for (const [ext, { count, totalSize }] of shown) {
		console.log(
			`  ${pad(ext, 10)} ${pad(count + " files", 11)} ${formatSize(totalSize)}`,
		);
	}
	if (rest.length > 0) {
		const count = rest.reduce((sum, [, v]) => sum + v.count, 0);
		const size = rest.reduce((sum, [, v]) => sum + v.totalSize, 0);
		console.log(
			`  ${pad("(other)", 10)} ${pad(count + " files", 11)} ${formatSize(size)}`,
		);
	}

	console.log("\nFile Age:");
	console.log(`  Last 7 days:    ${stats.age.last7} files`);
	console.log(`  Last 30 days:   ${stats.age.last30} files`);
	console.log(`  Older than 90:  ${stats.age.older90} files`);

	console.log("\nLargest files:");
	stats.largest.forEach((file, i) => {
		console.log(`  ${i + 1}. ${pad(file.name, 28)} ${formatSize(file.size)}`);
	});

	if (stats.oldest) {
		console.log(
			`\nOldest file: ${stats.oldest.name} (modified ${stats.oldest.daysOld} days ago)`,
		);
	}
}

async function runDuplicates(directory) {
	const finder = new DuplicateFinder();

	finder.on("scan-start", ({ directory: dir }) => {
		console.log(`🔍 Searching for duplicates in: ${dir}`);
	});
	finder.on("hashing-start", ({ total }) => {
		if (total === 0) return;
		renderProgress("Calculating hashes...", 0, total);
	});
	finder.on("file-processed", ({ processed, total }) => {
		renderProgress("Calculating hashes...", processed, total);
	});
	finder.on("file-error", ({ path: p, error }) =>
		warn(describeError(error, p)),
	);

	finder.on("duplicates-found", ({ groups, totalWasted }) => {
		if (groups.length === 0) {
			console.log("\n✅ No duplicates found.");
			return;
		}

		console.log(
			`\nFound ${groups.length} duplicate groups (${formatSize(totalWasted)} wasted):`,
		);

		groups.forEach((group, i) => {
			console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
			console.log(
				`Group ${i + 1} (${group.paths.length} copies, ${formatSize(group.size)} each):`,
			);
			console.log(`  SHA-256: ${group.hash.slice(0, 12)}...\n`);
			for (const filePath of group.paths) console.log(`  📄 ${filePath}`);
			console.log(`\n  Wasted space: ${formatSize(group.wasted)}`);
		});

		console.log("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
		console.log(`💾 Total wasted space: ${formatSize(totalWasted)}`);
	});

	await finder.find(directory);
}

async function runOrganize(directory, output) {
	const organizer = new Organizer();

	organizer.on("organize-start", ({ source, output: out }) => {
		console.log(`📦 Organizing: ${source}`);
		console.log(`Target: ${out}\n`);
		console.log("Creating folders...");
	});
	organizer.on("folder-created", ({ category }) => {
		console.log(`  ✓ ${category}/`);
	});
	organizer.on("files-listed", ({ total }) => {
		console.log("");
		renderProgress("Copying files...", 0, total);
	});
	organizer.on("copy-complete", ({ processed, total }) => {
		const step = Math.max(1, Math.floor(total / 100));
		if (processed % step === 0 || processed === total) {
			renderProgress("Copying files...", processed, total);
		}
	});
	organizer.on("copy-error", ({ source, error }) =>
		warn(`Failed to copy ${source}: ${describeError(error)}`),
	);

	organizer.on(
		"organize-complete",
		({ summary, totalCopied, totalSize, errors, output: out }) => {
			const outName = path.basename(out);
			console.log("\n✅ Organization complete!\n");
			console.log("Summary:");
			for (const [category, count] of Object.entries(summary)) {
				console.log(
					`  ${pad(category + ":", 11)} ${String(count).padStart(4)} files → ${outName}/${category}/`,
				);
			}
			console.log(
				`\nTotal copied: ${totalCopied} files (${formatSize(totalSize)})`,
			);
			if (errors > 0) console.log(`⚠️  ${errors} file(s) could not be copied.`);
		},
	);

	await organizer.organize(directory, output);
}

async function runCleanup(directory, days, confirm) {
	const cleanup = new Cleanup();

	console.log(`🧹 Cleanup: ${directory}`);
	console.log(`Looking for files older than ${days} days...\n`);

	cleanup.on("file-error", ({ path: p, error }) =>
		warn(describeError(error, p)),
	);

	const files = await cleanup.findOldFiles(directory, days);

	if (files.length === 0) {
		console.log("✅ No old files found.");
		return;
	}

	const totalSize = files.reduce((sum, f) => sum + f.size, 0);
	const MAX_SHOWN = 10;

	console.log(`Found ${files.length} files to delete:\n`);
	console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
	for (const file of files.slice(0, MAX_SHOWN)) {
		console.log(path.relative(directory, file.path) || file.path);
		console.log(`  Size: ${formatSize(file.size)}`);
		console.log(
			`  Modified: ${file.daysOld} days ago (${file.mtime.toISOString().slice(0, 10)})\n`,
		);
	}
	if (files.length > MAX_SHOWN) {
		console.log(`... (${files.length - MAX_SHOWN} more files)`);
	}
	console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
	console.log(`\nTotal: ${files.length} files (${formatSize(totalSize)})\n`);

	if (!confirm) {
		console.log("⚠️  DRY RUN MODE: No files were deleted.");
		console.log("To actually delete these files, run with --confirm flag.");
		return;
	}

	console.log(
		`⚠️  DELETING ${files.length} files (${formatSize(totalSize)}). This action cannot be undone!\n`,
	);

	cleanup.on("file-deleted", ({ processed, total }) => {
		renderProgress("Deleting...", processed, total);
	});
	cleanup.on("cleanup-complete", ({ deleted, freedSize, errors }) => {
		console.log("\n✅ Cleanup complete!");
		console.log(`Deleted: ${deleted} files (${formatSize(freedSize)} freed)`);
		if (errors > 0) console.log(`⚠️  ${errors} file(s) could not be deleted.`);
	});

	await cleanup.deleteFiles(files);
}

async function main() {
	const { positional, flags } = parseArgs(process.argv.slice(2));
	const [command, directoryArg] = positional;

	const directory = !directoryArg
		? path.join(os.homedir(), "Downloads")
		: directoryArg === "~" ||
			  directoryArg.startsWith("~/") ||
			  directoryArg.startsWith("~\\")
			? path.join(os.homedir(), directoryArg.slice(1))
			: directoryArg;

	if (!command || flags.help || command === "help") {
		console.log(USAGE);
		return;
	}

	const commands = ["scan", "duplicates", "organize", "cleanup"];
	if (!commands.includes(command)) {
		fail(`Unknown command: ${command}\n${USAGE}`);
	}
	const target = path.resolve(directory);

	try {
		switch (command) {
			case "scan":
				await runScan(target);
				break;

			case "duplicates":
				await runDuplicates(target);
				break;

			case "organize": {
				if (!flags.output || flags.output === true) {
					fail("Missing --output <directory> option.");
				}
				await runOrganize(target, path.resolve(flags.output));
				break;
			}

			case "cleanup": {
				const days = Number(flags["older-than"]);
				if (
					flags["older-than"] === undefined ||
					!Number.isFinite(days) ||
					days < 0
				) {
					fail(
						"Missing or invalid --older-than <days> option (expected a non-negative number).",
					);
				}
				await runCleanup(target, days, flags.confirm === true);
				break;
			}
		}
	} catch (error) {
		process.stdout.write("\n");
		console.error(`❌ ${describeError(error, error.path ?? target)}`);
		process.exit(1);
	}
}

main();
