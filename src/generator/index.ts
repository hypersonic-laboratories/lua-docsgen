import { Authority, DocClass, DocEnumValue, Docs } from "../schema";
import { LuaGenerator } from "./lua";

export interface SupportedLanguages {
	[key: string]: CodeGenerator;
}

export const SUPPORTED_LANGUAGES: SupportedLanguages = {
	lua: new LuaGenerator(),
}

export const OPERATORS: { [key: string]: string } = {
	__unm: "unm",
	__bnot: "bnot",
	__len: "len",
	__add: "add",
	__sub: "sub",
	__mul: "mul",
	__div: "div",
	__mod: "mod",
	__pow: "pow",
	__idiv: "idiv",
	__band: "band",
	__bor: "bor",
	__bxor: "bxor",
	__shl: "shl",
	__shr: "shr",
	__concat: "concat",
	__call: "call",
}


export interface CodeGenerator {
	docsName: string;
	
    generate(docs: Docs): string;
    generateClass(classes: { [key: string] : DocClass }, cls: DocClass): string;
    generateEnum(name: string, values: DocEnumValue[]): string;
}