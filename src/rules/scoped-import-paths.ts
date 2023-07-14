/**
 * @template https://github.com/MelvinVermeer/eslint-plugin-no-relative-import-paths
 */

import path from "node:path";
import { createEslintRule } from "../utils";
import { findDirectoryWithFiles } from "./utils/find-directory";
import { getDeepestCommonFolder } from "./utils/get-deepest-common-folder";
import { isInternalImportPath } from "./utils/is-internal";
import { resolveImportPath } from "./utils/resolve-import-path";
import type { RuleContext } from "@typescript-eslint/utils/dist/ts-eslint";

export const RULE_NAME = "scoped-import-paths";
export type MessageIds = "wrongImportPath";
export type RuleOptions = [Options];
type Options = {
    rootAlias?: string;
    srcDir?: string;
    globPatterns?: string[];
};
const DefaultOptions = {
    rootAlias: "",
    srcDir: "",
    globPatterns: ["package.json"],
} satisfies Options;

export function getScopedImportPathsRule () {
    return createEslintRule<RuleOptions, MessageIds>({
        name: RULE_NAME,
        meta: {
            type: "layout",
            docs: {
                description: "Use relative import paths within the same module and absolute import paths from other modules in the project",
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
                        globPatterns: {
                            type: "array",
                            items: {
                                type: "string",
                            },
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
                    const skip = !isInternalImportPath(context, node.source.value);
                    if (skip) return;

                    const rawImportPath = node.source.value;
                    const parseResult = parseRawImportPath(context, rawImportPath);
                    if (parseResult == null) return;

                    const requiredPath = getRequiredPath(parseResult);

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

function getRequiredPath (importDeclarationInfo: ReturnType<typeof parseRawImportPath>) {
    const { importAsAbsolutePath, importAsRelativePath, fileScopeDirectory, importScopeDirectory, rootScopeDirectory, commonParent } = importDeclarationInfo;

    const isSameModule = fileScopeDirectory === importScopeDirectory;
    const rootIsCommonParent = rootScopeDirectory === commonParent;

    return (isSameModule && !rootIsCommonParent) ? importAsRelativePath : importAsAbsolutePath;
}

// This function retrieves information about an import declaration.
function parseRawImportPath (context: RuleContext<MessageIds, RuleOptions>, rawImportPath: string) {
    // Get the rule options.
    const { srcDir, rootAlias, globPatterns } = { ...DefaultOptions, ...context.options[0] };

    // Get the current file path.
    const filePath = context.getFilename().replace(/\\/g, "/");

    // Get the resolved import path
    const importPath = resolveImportPath(context, rawImportPath);

    // Get the import path relative to the source directory.
    const importAsAbsolutePath = getImportAbsolutePath(context, importPath, srcDir, rootAlias).replace(/\\/g, "/");

    // Get the import path relative to the current file.
    const importAsRelativePath = getImportRelativePath(filePath, importPath).replace(/\\/g, "/");

    // Scopes
    const fileScopeDirectory = findDirectoryWithFiles(filePath, globPatterns);
    const importScopeDirectory = findDirectoryWithFiles(importPath, globPatterns);
    const rootScopeDirectory = getRootDir(context, srcDir);
    const commonParent = getDeepestCommonFolder(filePath, importPath);

    // Return
    return {
        fileScopeDirectory,
        importScopeDirectory,
        rootScopeDirectory,
        commonParent,
        importAsAbsolutePath,
        importAsRelativePath,
    };
}

// This function returns the relative path from the current file to the given file path.
function getImportRelativePath (filePath: string, importPath: string) {
    const fileDir = path.dirname(filePath);
    const relativePath = path.relative(fileDir, importPath);
    return (relativePath.startsWith(".") ? relativePath : `.${path.sep}${relativePath}`).replace(/\\/g, "/");
}

// This function returns the absolute path from the source directory to the given file path.
function getImportAbsolutePath (context: RuleContext<MessageIds, RuleOptions>, filepath: string, srcDir?: string, rootAlias? : string) {
    const rootDir = getRootDir(context, srcDir);
    const absolutePath = path.relative(rootDir, filepath);
    return (rootAlias ? path.join(rootAlias, absolutePath) : `${path.sep}${absolutePath}`).replace(/\\/g, "/");
}

function getRootDir (context: RuleContext<MessageIds, RuleOptions>, srcDir?: string) {
    return path.join(context.getCwd(), srcDir ?? "").replace(/\\/g, "/");
}
