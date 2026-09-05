import { readFile } from "node:fs/promises";

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
const packageLock = JSON.parse(await readFile("package-lock.json", "utf8"));

if (packageJson.private === true) {
  console.log(
    "Release publication is not activated yet (package.json private=true). This is expected until the final npm scope/bootstrap PR.",
  );
  process.exit(0);
}

const failures = [];
const expectedRepository =
  "https://github.com/ShimaBell0619/cloud-arch-icon-browser.git";

if (!/^@[a-z0-9][a-z0-9._-]*\/[a-z0-9][a-z0-9._-]*$/u.test(packageJson.name)) {
  failures.push("package name must be a final scoped npm name (@scope/name)");
}
if (!/^\d+\.\d+\.\d+$/u.test(packageJson.version)) {
  failures.push("package version must be a stable SemVer X.Y.Z");
}
if (packageJson.repository?.url !== expectedRepository) {
  failures.push(`repository.url must be exactly ${expectedRepository}`);
}
if (packageLock.name !== packageJson.name || packageLock.version !== packageJson.version) {
  failures.push("package-lock.json top-level name/version must match package.json");
}
if (
  packageLock.packages?.[""]?.name !== packageJson.name ||
  packageLock.packages?.[""]?.version !== packageJson.version
) {
  failures.push("package-lock.json root package metadata must match package.json");
}

const compatibility = await readFile("COMPATIBILITY.md", "utf8");
if (!/^Release gate:\s*PASS\s*$/mu.test(compatibility)) {
  failures.push(
    "COMPATIBILITY.md must contain an exact 'Release gate: PASS' after a successful current official-ZIP verification",
  );
}

if (failures.length > 0) {
  console.error("Release readiness validation failed:\n");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Release readiness gate passed for ${packageJson.name}@${packageJson.version}.`);
