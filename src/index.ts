import { getNuxtConfigPreset } from "./configs/nuxt-config-preset";
import { getConsistentImportPathsRule } from "./rules/consistent-import-paths";

export default {
    rules: {
        "consistent-import-paths": getConsistentImportPathsRule(),
    },
    configs: {
        nuxt: getNuxtConfigPreset(),
    },
};
