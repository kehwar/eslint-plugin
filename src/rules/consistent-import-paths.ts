/**
 * @template https://github.com/MelvinVermeer/eslint-plugin-no-relative-import-paths
 */

import fs from "node:fs";
import path from "node:path";
import isCoreModule from "is-core-module";
import { loadConfig, createMatchPath } from "tsconfig-paths";
import { createEslintRule } from "../utils";
import type { RuleContext } from "@typescript-eslint/utils/dist/ts-eslint";

export const RULE_NAME = "consistent-import-paths";
export type MessageIds = "wrongImportPath";
export type RuleOptions = [Options];
type Options = {
    rootAlias?: string;
    srcDir?: string;
    sameFolder?: "relative" | "absolute";
    parent?: "relative" | "absolute";
    minimumParentDepth?: number;
};
const DefaultOptions = {
    rootAlias: "",
    srcDir: "",
    sameFolder: "relative",
    parent: "absolute",
    minimumParentDepth: 0,
} as const satisfies Options;

export function getConsistentImportPathsRule () {
    return createEslintRule<RuleOptions, MessageIds>({
        name: RULE_NAME,
        meta: {
            type: "layout",
            docs: {
                description: "Newline after if",
                recommended: "error",
            },
            fixable: "code",
            schema: [
                {
                    type: "object",
                    properties: {
                        rootAlias: {
                            type: "string",
                        },
                        srcDir: {
                            type: "string",
                        },
                        sameFolder: {
                            type: "string",
                            enum: ["relative", "absolute"],
                        },
                        parent: {
                            type: "string",
                            enum: ["relative", "absolute"],
                        },
                        minimumParentDepth: {
                            type: "integer",
                            minimum: 0,
                        },
                    },
                    additionalProperties: false,
                },
            ],
            messages: {
                wrongImportPath: "import statement should be {{suggestion}}",
            },
        },
        defaultOptions: [DefaultOptions],
        create (context) {
            return {
                ImportDeclaration (node) {
                    const rawImportPath = node.source.value;
                    const importPaths = getInternalImportPaths(context, rawImportPath);
                    if (importPaths == null) return;

                    const requiredPath = getRequiredPath(importPaths, context.options[0]);

                    if (requiredPath !== rawImportPath) {
                        context.report({
                            node,
                            messageId: "wrongImportPath",
                            data: {
                                suggestion: requiredPath,
                            },
                            fix (fixer) {
                                return fixer.replaceTextRange(
                                    [node.source.range[0] + 1, node.source.range[1] - 1],
                                    requiredPath
                                );
                            },
                        });
                    }
                },
            };
        },
    });
}

function getRequiredPath (paths: ReturnType<typeof getInternalImportPaths>, options?: Options) {
    const { absoluteImportPath, relativeImportPath } = paths;
    const { sameFolder, parent, minimumParentDepth } = { ...DefaultOptions, ...options };

    // Determine the required path based on the conditions.
    return isPathSameFolder(relativeImportPath)

    // If the import path is in the same folder, use the relative or absolute import path based on the "sameFolder" value.
        ? sameFolder === "relative" ? relativeImportPath : absoluteImportPath
        : getRelativePathParentDepth(relativeImportPath) >= minimumParentDepth

        // If the import path has sufficient parent folder depth, use the relative or absolute import path based on the "parent" value.
            ? parent === "relative" ? relativeImportPath : absoluteImportPath

        // Otherwise, use the opposite value declared in the "parent" option.
            : parent === "relative" ? absoluteImportPath : relativeImportPath;
}

// This function retrieves information about an import declaration.
function getInternalImportPaths (context: RuleContext<MessageIds, RuleOptions>, rawImportPath: string) {
    // Get the rule options.
    const { srcDir, rootAlias } = { ...DefaultOptions, ...context.options[0] };

    // Get the absolute path of the source directory.
    const rootDir = path.join(context.getCwd(), srcDir ?? "");

    // Check if is core module
    if (isCoreModule(rawImportPath)) return null;

    // Check if is external folder
    const externalFolders = ["node_modules"].map((folder) => path.join(rootDir, folder));
    const isExternal = externalFolders.some((folder) => {
        const packagePath = path.join(folder, rawImportPath);
        const dirExists = fs.existsSync(packagePath);
        return dirExists;
    });
    if (isExternal) return null;

    // Resolve the TypeScript import path.
    const tsImportPath = resolveTSPath(rootDir, rawImportPath);

    // Get the current file path.
    const filePath = context.getFilename();

    // Get the directory of the current file.
    const fileDir = path.dirname(filePath);

    // Use the TypeScript import path if available, otherwise resolve the raw import path based on its type.
    const importPath = tsImportPath ?? (isPathRelative(rawImportPath) ? resolveRelativePath(fileDir, rawImportPath) : rawImportPath);

    // Get the absolute import path from the root directory.
    const absoluteImportPath = getAbsolutePathFromRoot(rootDir, importPath, rootAlias);

    // Get the relative path from the file directory to the resolved import path.
    const relativeImportPath = getRelativePath(fileDir, importPath);

    // Return
    return {
        absoluteImportPath: absoluteImportPath.replace(/\\/g, "/"),
        relativeImportPath: relativeImportPath.replace(/\\/g, "/"),
    };
}

// This function checks if a file path is in the same folder.
function isPathSameFolder (filePath: string) {
    const normalizedPath = filePath.replace(/\\/g, "/");
    return normalizedPath.startsWith(`./`);
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

// This function returns the relative path from one directory to another.
function getRelativePath (from: string, to: string) {
    const relativePath = path.relative(from, to);
    return relativePath.startsWith(".") ? relativePath : `.${path.sep}${relativePath}`;
}

// This function returns the absolute path from the root directory to the given file path.
function getAbsolutePathFromRoot (rootDir: string, filepath: string, rootAlias? : string) {
    const absolutePath = path.relative(rootDir, filepath);
    return rootAlias ? path.join(rootAlias, absolutePath) : `${path.sep}${absolutePath}`;
}

// This function returns the depth of parent folders in a relative file path.
function getRelativePathParentDepth (filePath: string) {
    const parentFolders = filePath.replace(/\\/g, "/").match(/\.\.\//g);
    return parentFolders ? parentFolders.length : 0;
}
