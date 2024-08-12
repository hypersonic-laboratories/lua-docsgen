import { Docs, DocClass, DocEnumValue } from "../schema";

export const OPERATORS: { [key: string]: string; } = {
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
};

export interface Type {
	name: string;
	array: boolean;
}

export class ComplexType {
	public optional: boolean = false;
	public typenames: Type[] = [];

	protected static LUA_TYPE = ["string", "number", "boolean", "table", "function", "thread", "userdata"];

	public static IsLuaType(type: string): boolean {
		return ComplexType.LUA_TYPE.includes(type);
	}

	public containsLuaType() {
		return this.typenames.some((type) => ComplexType.IsLuaType(type.name));
	}

	protected mapTypename(name: string) {
		if (name.endsWith("Path")) {
			return "string";
		}

		switch (name) {
			case "float":
				return "number";
			default:
				return name;
		}
	}

	public toString = (): string => {
		let ret = "";
		this.typenames.forEach((type) => {
			ret += this.mapTypename(type.name);
			if (type.array) ret += "[]";
			ret += "|";
		});
		ret = ret.slice(0, -1);
		return ret;
	};
}

export interface CodeGenerator {
	docsName: string;

	generate(docs: Docs): string;
	generateClass(classes: { [key: string]: DocClass; }, cls: DocClass): string;
	generateEnum(name: string, values: DocEnumValue[]): string;
}
