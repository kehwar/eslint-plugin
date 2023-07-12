import { ESLintUtils } from "@typescript-eslint/utils";
import type { Linter } from "@typescript-eslint/utils/dist/ts-eslint";

export const createEslintRule = ESLintUtils.RuleCreator((ruleName) => ruleName);

export const createEslintConfig = (config: Linter.Config) => () => config;
