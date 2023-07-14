import path from "node:path";
import { sync as globSync } from "glob";
import { memoize } from "lodash";

function _findDirectoryWithFiles (absPath: string, patterns: string[]): string | null {
    let currentPath = absPath;
    while (true) {
        const hasMatchingFiles = patterns.some((pattern) => globSync(pattern, { cwd: currentPath, nodir: true }).length > 0);
        if (hasMatchingFiles) {
            return currentPath.replace(/\\/g, "/");
        }

        const parentPath = path.dirname(currentPath);
        if (currentPath === parentPath) {
            return null; // Reached the root directory without finding a matching directory
        }

        currentPath = parentPath;
    }
}

export const findDirectoryWithFiles = memoize(_findDirectoryWithFiles);
