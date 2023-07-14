import importType from "eslint-plugin-import/lib/core/importType";
import type { RuleContext } from "@typescript-eslint/utils/dist/ts-eslint";

export function isInternalImportPath (context: RuleContext<any, any>, importPath: string) {
    const importTypeResult = importType(importPath, context);
    return ["internal", "sibling", "parent", "index"].includes(importTypeResult);
}
