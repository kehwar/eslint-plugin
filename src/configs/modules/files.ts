import { createEslintConfig } from "../../utils";

export const getFilesConfig = createEslintConfig({
    /** Rules */
    rules: {
        /** @see https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/no-empty-file.md */
        "unicorn/no-empty-file": "error",

        /** @see https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/filename-case.md */
        "unicorn/filename-case": ["error", { case: "kebabCase" } ],
    },

    /** Rule overrides */
    overrides: [
        /** Override for remoteFunctionFn server files */
        {
            files: ["*.server.ts"],
            rules: {
                /**
                 * Use snakeCase for filenames since they will be used as variable names
                 *
                 * @see https://github.com/wobsoriano/nuxt-remote-fn/issues/5
                 * @see https://github.com/sindresorhus/eslint-plugin-unicorn/blob/main/docs/rules/filename-case.md
                 */
                "unicorn/filename-case": ["error", { case: "snakeCase" } ],
            },
        },
    ],
});
