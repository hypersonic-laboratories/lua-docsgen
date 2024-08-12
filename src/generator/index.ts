import { LuaGenerator } from "./lua";
import { CodeGenerator } from "./types";
import { YmlGenerator } from "./yml";


export interface SupportedLanguages {
	[key: string]: CodeGenerator;
}

export const SUPPORTED_LANGUAGES: SupportedLanguages = {
	lua: new LuaGenerator(),
	yml: new YmlGenerator(),
};