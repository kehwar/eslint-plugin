/**
 * @template https://github.com/MelvinVermeer/eslint-plugin-no-relative-import-paths
 */

import path from "node:path";
import { loadConfig, createMatchPath } from "tsconfig-paths";
import type { RuleContext } from "@typescript-eslint/utils/dist/ts-eslint";

// This function retrieves information about an import declaration.
export function resolveImportPath (context: RuleContext<any, any>, rawImportPath: string) {
    // Resolve the TypeScript import path.
    const tsImportPath = resolveTSPath(context.getCwd(), rawImportPath);

    // Get the current file path.
    const filePath = context.getFilename();

    // Get the directory of the current file.
    const fileDir = path.dirname(filePath);

    // Use the TypeScript import path if available, otherwise resolve the raw import path based on its type.
    const importPath = tsImportPath ?? (isPathRelative(rawImportPath) ? resolveRelativePath(fileDir, rawImportPath) : rawImportPath);

    // Return
    return importPath.replace(/\\/g, "/");
}

// This function checks if a file path is relative, i.e., it starts with "./" or "../".
function isPathRelative (filePath: string) {
    const normalizedPath = filePath.replace(/\\/g, "/");
    return normalizedPath.startsWith(`./`) || normalizedPath.startsWith(`../`);
}

// This function resolves a TypeScript path based on the source directory and file path.
function resolveTSPath (srcDir: string, filePath: string) {
    // Load the tsconfig.json configuration.
    const config = loadConfig(srcDir);
    if (config.resultType !== "success") {
        // Throw an error if the tsconfig.json could not be loaded successfully.
        throw new Error("Failed to load tsconfig.json");
    }

    // Create a matchPath function based on the baseUrl and paths configuration from tsconfig.json.
    const matchPath = createMatchPath(config.absoluteBaseUrl, config.paths);
    const match = matchPath(filePath, undefined, undefined, [".ts", ".tsx", ".js", ".jsx"]);

    // Return
    return match;
}

// This function resolves a relative file path based on the source directory and file path.
function resolveRelativePath (srcDir: string, filePath: string) {
    return path.resolve(srcDir, filePath);
}
