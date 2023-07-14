import { getNuxtConfigPreset } from "./configs/nuxt-config-preset";
import { getScopedImportPathsRule } from "./rules/scoped-import-paths";

export default {
    rules: {
        "scoped-import-paths": getScopedImportPathsRule(),
    },
    configs: {
        nuxt: getNuxtConfigPreset(),
    },
};
