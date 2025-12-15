#!/usr/bin/env node

/**
 * Script to generate a new Chrome extension project from this template
 * Usage: npx create-chrome-ext-ts <project-name>
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function error(message) {
  log(`Error: ${message}`, "red");
  process.exit(1);
}

// Get project name from command line
const projectName = process.argv[2];

if (!projectName) {
  error("Project name is required");
  console.log("Usage: npx create-chrome-ext-ts <project-name>");
  process.exit(1);
}

// Validate project name
if (!/^[a-zA-Z0-9_-]+$/.test(projectName)) {
  error(
    "Project name can only contain letters, numbers, hyphens, and underscores"
  );
}

// Find the template directory
// When run via npx, we need to find the package root
// __dirname will be the bin directory, so go up to find package root
let templateDir = path.join(__dirname, "..");

// Verify this is the correct package by checking for template files
if (
  !fs.existsSync(path.join(templateDir, "src")) ||
  !fs.existsSync(path.join(templateDir, "manifest.json"))
) {
  // Try alternative paths (for npx installations)
  const possiblePaths = [
    path.join(__dirname, "..", "..", "..", "create-chrome-ext-ts"),
    path.join(__dirname, "..", "..", "create-chrome-ext-ts"),
    path.join(__dirname, ".."),
  ];
  let found = false;
  for (const possiblePath of possiblePaths) {
    if (
      fs.existsSync(path.join(possiblePath, "src")) &&
      fs.existsSync(path.join(possiblePath, "manifest.json"))
    ) {
      templateDir = possiblePath;
      found = true;
      break;
    }
  }
  if (!found) {
    error(
      `Could not find template files. Looked in:\n${possiblePaths
        .map((p) => `  - ${p}`)
        .join("\n")}`
    );
  }
}

// Verify template directory has required files
if (!fs.existsSync(path.join(templateDir, "src"))) {
  error(`Template directory does not contain 'src' folder: ${templateDir}`);
}
if (!fs.existsSync(path.join(templateDir, "manifest.json"))) {
  error(`Template directory does not contain 'manifest.json': ${templateDir}`);
}

// Create project in current working directory
const projectDir = path.join(process.cwd(), projectName);

// Check if project directory already exists
if (fs.existsSync(projectDir)) {
  error(`Directory '${projectDir}' already exists`);
}

log(`\n🚀 Creating new Chrome extension project: ${projectName}`, "green");

// Create project directory
fs.mkdirSync(projectDir, { recursive: true });

// Files and directories to copy
const filesToCopy = [
  "src",
  "manifest.json",
  "package.json",
  "tsconfig.json",
  "webpack.config.js",
  ".gitignore",
  "README.md",
];

// Files and directories to exclude
const excludePatterns = [
  "node_modules",
  "dist",
  ".git",
  "generate-project.js",
  "bin",
  ".DS_Store",
  "package-lock.json",
];

function shouldExclude(filePath) {
  return excludePatterns.some((pattern) => filePath.includes(pattern));
}

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) return;

  const stat = fs.statSync(src);

  if (stat.isDirectory()) {
    if (shouldExclude(src)) return;

    fs.mkdirSync(dest, { recursive: true });
    const entries = fs.readdirSync(src);

    for (const entry of entries) {
      const srcPath = path.join(src, entry);
      const destPath = path.join(dest, entry);

      if (!shouldExclude(srcPath)) {
        copyRecursive(srcPath, destPath);
      }
    }
  } else {
    if (!shouldExclude(src)) {
      fs.copyFileSync(src, dest);
    }
  }
}

// Copy files
log("📁 Copying template files...", "blue");
let copiedCount = 0;
for (const item of filesToCopy) {
  const srcPath = path.join(templateDir, item);
  const destPath = path.join(projectDir, item);

  if (fs.existsSync(srcPath)) {
    copyRecursive(srcPath, destPath);
    copiedCount++;
    log(`  ✓ Copied ${item}`, "green");
  } else {
    log(`  ⚠ Skipped ${item} (not found)`, "yellow");
  }
}

if (copiedCount === 0) {
  error(
    `No files were copied! Template directory: ${templateDir}\nPlease check that the template files exist.`
  );
}

// Convert project name to various formats
const packageName = projectName.toLowerCase().replace(/_/g, "-");
const manifestName = projectName
  .replace(/_/g, " ")
  .replace(/-/g, " ")
  .split(" ")
  .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
  .join(" ");

// Update package.json
log("📝 Updating package.json...", "blue");
const packageJsonPath = path.join(projectDir, "package.json");
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
  packageJson.name = packageName;
  // Remove bin field if it exists (it's only for the template)
  delete packageJson.bin;
  // Remove generate script
  if (packageJson.scripts) {
    delete packageJson.scripts.generate;
  }
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + "\n"
  );
}

// Update manifest.json
log("📝 Updating manifest.json...", "blue");
const manifestJsonPath = path.join(projectDir, "manifest.json");
if (fs.existsSync(manifestJsonPath)) {
  const manifestJson = JSON.parse(fs.readFileSync(manifestJsonPath, "utf8"));
  manifestJson.name = manifestName;
  fs.writeFileSync(
    manifestJsonPath,
    JSON.stringify(manifestJson, null, 2) + "\n"
  );
}

// Install dependencies
log("\n📦 Installing dependencies...", "yellow");
try {
  process.chdir(projectDir);
  execSync("npm install", { stdio: "inherit" });
  log("✓ Dependencies installed", "green");
} catch (err) {
  log(
    '⚠ Failed to install dependencies. You can run "npm install" manually.',
    "yellow"
  );
}

log("\n✅ Project created successfully!", "green");
console.log("\n📋 Next steps:");
console.log(`  1. cd ${projectName}`);
console.log("  2. npm run dev    # Start development");
console.log("  3. Load the 'dist' folder in Chrome at chrome://extensions/");
console.log("");
