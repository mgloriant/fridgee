import { getLocales } from "expo-localization";
import { I18n } from "i18n-js";
import en from "./en";
import fr from "./fr";

const i18n = new I18n({ en, fr });

const deviceLocales = getLocales();
const deviceLang = deviceLocales[0]?.languageCode ?? "en";
i18n.locale = deviceLang;
i18n.enableFallback = true;
i18n.defaultLocale = "fr";

export default i18n;
export const t = (key: string, options?: object) => i18n.t(key, options);
export const setLocale = (lang: string) => { i18n.locale = lang; };
