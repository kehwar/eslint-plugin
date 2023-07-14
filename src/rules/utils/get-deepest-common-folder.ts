import path from "node:path";

export function getDeepestCommonFolder (path1: string, path2: string): string {
    const directories1 = path1.split("/");
    const directories2 = path2.split("/");

    const deepestFolder = directories1.filter((directory, index) => {
        return directory === directories2[index];
    });

    return path.join(...deepestFolder).replace(/\\/g, "/");
}
