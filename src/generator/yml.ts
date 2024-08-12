import { CodeGenerator, OPERATORS, Type, ComplexType as OriginalComplexType } from "./types";
import { Authority, DocClass, DocConstructor, DocDescriptive, DocEnumValue, DocEvent, DocFunction, DocParameter, DocReturn, Docs, DocTyped } from "../schema";

export class ComplexType extends OriginalComplexType {
	public toString = (): string => {
		let ret = "";
        if (this.typenames.length == 1) {
            let isArray = this.typenames[0].array;
            let type = this.mapTypename(this.typenames[0].name);
            if (type.startsWith("{")) {
                ret += "any";
                if (isArray) ret += "[]";
                return ret;
            } else if (ComplexType.IsLuaType(type)) {
                ret += type;
                if (isArray) ret += "[]";
                return ret;
            } else {
                ret += `\n          display: ${type}${isArray ? "[]" : ""}`;
            }
        } else {
            ret = "any";
        }
		return ret;
	};
}

export class YmlGenerator implements CodeGenerator {
    docsName: string = "helix.yml";

    static generateType(typed: DocTyped): ComplexType {
        let complexType = new ComplexType();
    
        let typeString = typed.type;
        if (typeString.endsWith("?")) {
            complexType.optional = true;
            typeString = typeString.slice(0, -1);
        } else if (typed.default !== undefined) {
            complexType.optional = true;
        }
    
        if (typed.table_properties === undefined) {
            typeString.split("|").forEach((typename) => {
                let type: Type = {
                    name: typename,
                    array: false,
                };
    
                if (type.name.endsWith("[]")) {
                    type.array = true;
                    type.name = type.name.slice(0, -2);
                }
    
                complexType.typenames.push(type);
            });
        } else {
            complexType.typenames.push({
                name: `{ ${typed.table_properties
                    .map(
                        (prop) =>
                            `${prop.name}: ${YmlGenerator.generateType({
                                type: prop.type,
                            }).toString()}`
                    )
                    .join(", ")} }`,
                array: typeString.endsWith("[]"),
            });
        }
    
        return complexType;
    }

    static generateParams(params?: DocParameter[]): string {
        if (params === undefined) return "[]";
    
        let ret = "";
        params.forEach(function (param) {
            param.name = param.name ?? "missing_name";
            if (param.name.endsWith("...")) param.name = "...";
    
            const type = YmlGenerator.generateType(param);
            ret += `${type.optional ? "\n      - required: false\n        " : "\n      - "}type: ${type.toString()}`;
        });

        return ret;
    }

    static generateConstructor(
        constructor: DocConstructor,
        className: string
    ): string {
        const params = YmlGenerator.generateParams(constructor.parameters);
        return `\n  ${className}:\n    must_use: true\n    args:${params}`;
    }

    static generateStaticFunction(fun: DocFunction, accessor: string = ""): string {
        const params = YmlGenerator.generateParams(fun.parameters);
        return `\n  ${accessor}${fun.name}:\n    args:${params}`;
    }

    static generateFunction(fun: DocFunction, accessor: string = ""): string {
        const params = YmlGenerator.generateParams(fun.parameters);
        return `\n    ${accessor}${fun.name}:\n      args:${params}`;
    }

    generate(docs: Docs): string {
        let output = "---\nbase: lua52\nname: helix\nglobals:\n";
        Object.entries(docs.enums).forEach(([name, { enums: values }]) => {
            output += this.generateEnum(name, values);
        });
        Object.entries(docs.classes).forEach(([_, cls]) => {
            output += this.generateStaticClass(docs.classes, cls);
        });
        output += "\nstructs:";
        Object.entries(docs.classes).forEach(([_, cls]) => {
            output += this.generateStaticClass(docs.classes, cls);
        });
        return output;
    }

    generateStaticClass(classes: { [key: string]: DocClass; }, cls: DocClass): string {
        const constructors =
            cls.constructors?.reduce(
                (prev, constructor) =>
                    prev + YmlGenerator.generateConstructor(constructor, cls.name),
                ""
            ) ?? "";
        
        let staticFunctions = "";
        if (cls.static_functions !== undefined) {
            cls.static_functions.forEach((fun) => {
                if (
                    (fun.name === "Subscribe" || fun.name === "Unsubscribe") &&
                    cls.name !== "Events"
                )
                    return;
                staticFunctions += YmlGenerator.generateStaticFunction(fun, `${cls.name}.`);
            });
        }

        let events = "";
        if (cls.events !== undefined && cls.staticClass) {
            events = `\n  ${cls.name}.Subscribe:\n    args:\n      - type: string\n      - type: function\n  ${cls.name}.Unsubscribe:\n    args:\n      - type: string\n      - type: function`;
        }

        const staticFields = cls.static_properties?.length ? `\n${cls.static_properties.map(field => `  ${cls.name}.${field.name}:\n    property: read-only`).join("\n")}` : "";
        return `${constructors}${staticFunctions}${staticFields}${events}`;
    }

    generateInstanceClass(classes: { [key: string]: DocClass; }, cls: DocClass): string {
        let functions = "";
        if (cls.functions !== undefined) {
            cls.functions.forEach((fun) => {
                if (
                    (fun.name === "Subscribe" || fun.name === "Unsubscribe") &&
                    cls.name !== "Events"
                )
                    return;
                functions += YmlGenerator.generateFunction(fun, `${cls.name}:`);
            });
        }

        let events = "";
        if (cls.events !== undefined && !cls.staticClass) {
            events = `\n    Subscribe:\n      args:\n        - type: string\n        - type: function\n    Unsubscribe:\n      args:\n        - type: string\n        - type: function`;
        }

        let fields = "";
        if (cls.properties !== undefined) {
            cls.properties.forEach((prop) => {
                fields += `\n    ${cls.name}.${prop.name}:\n      property: read-only`;
            });
        }
        return `\n    ${cls.name}:${fields}${functions}${events}`;
    }

    generateClass(classes: { [key: string]: DocClass; }, cls: DocClass): string {
        return "";
    }

    generateEnum(name: string, values: DocEnumValue[]): string {
        let vaulesString = "";
        values.forEach((value) => {
            vaulesString += `  ${name}.${value.key}:\n    property: read-only\n`;
        });
        return vaulesString;
    }
}