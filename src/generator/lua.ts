import { CodeGenerator, OPERATORS, Type, ComplexType } from "./types";
import { Authority, DocClass, DocConstructor, DocDescriptive, DocEnumValue, DocEvent, DocFunction, DocParameter, DocReturn, Docs, DocTyped } from "../schema";

export class LuaGenerator implements CodeGenerator {
    docsName: string = "annotations.lua";
    
    static generateAuthorityString(authority: Authority) {
        switch (authority) {
            case Authority.Server:
                return '<img src="https://static.helix-cdn.com/docs/server-only.png" height="10"> `Server Side`';
            case Authority.Client:
                return '<img src="https://static.helix-cdn.com/docs/client-only.png" height="10"> `Client Side`';
            case Authority.Authority:
                return '<img src="https://static.helix-cdn.com/docs/authority-only.png" height="10"> `Authority Side`';
            case Authority.Both:
            default:
                return '<img src="https://static.helix-cdn.com/docs/both.png" height="10"> `Client/Server Side`';
        }
    }

    static generateDocstring(obj: DocDescriptive): string {
        return (
            obj.description_long === undefined
                ? obj.description === undefined
                    ? ""
                    : obj.description
                : obj.description_long
        ).replaceAll("\n", "<br>");
    }

    static generateInlineDocstring(descriptive: DocDescriptive): string {
        let docstring = LuaGenerator.generateDocstring(descriptive);
        return docstring.length > 0 ? `@${docstring}` : "";
    }
    
    static generateParamDocstring(param: DocParameter): string {
        let docstring = LuaGenerator.generateInlineDocstring(param);
        if (param.default !== undefined)
            docstring += `${docstring.length > 0 ? " " : "@"}(Default: ${
                param.default.length === 0 ? '""' : param.default
            })`;
        return docstring;
    }

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
                            `${prop.name}: ${LuaGenerator.generateType({
                                type: prop.type,
                            }).toString()}`
                    )
                    .join(", ")} }`,
                array: typeString.endsWith("[]"),
            });
        }
    
        return complexType;
    }

    static generateReturns(rets?: DocReturn[]): string {
        if (rets === undefined) return "";
        return rets
            .map((ret) => {
                const type = LuaGenerator.generateType(ret);
                return `\n---@return ${
                    type.toString() + (type.optional ? "?" : "")
                } ${LuaGenerator.generateInlineDocstring(ret)}`;
            })
            .join("");
    }

    // This can be refactored out once the overload rework on the language server is done
    static generateInlineReturns(rets?: DocReturn[], areAllOptional?: boolean): string {
        if (rets === undefined) return "";
        return (
            ": " +
            rets
                .map((ret) => {
                    const type = LuaGenerator.generateType(ret);
                    return type.toString() + (areAllOptional || type.optional ? "?" : "");
                })
                .join(", ")
        );
    }

    static generateParams(params?: DocParameter[]): {
        string: string;
        names: string;
    } {
        let ret = { string: "", names: "" };
        if (params === undefined) return ret;
    
        params.forEach(function (param) {
            param.name = param.name ?? "missing_name";
            if (param.name.endsWith("...")) param.name = "...";
    
            const type = LuaGenerator.generateType(param);
            ret.string += `\n---@param ${param.name}${
                type.optional ? "?" : ""
            } ${type.toString()} ${LuaGenerator.generateParamDocstring(param)}`;
            ret.names += param.name + ", ";
        });
    
        ret.names = ret.names.slice(0, -2);
        return ret;
    }

    static generateInlineParams(params: DocParameter[]): string {
        return params
            .map((param) => {
                param.name = param.name ?? "missing_name";
                const type = LuaGenerator.generateType(param);
                return `${param.name}${
                    type.optional ? "?" : ""
                }: ${type.toString()}`;
            })
            .join(", ");
    }

    static generateFunction(fun: DocFunction, accessor: string = ""): string {
        const params = LuaGenerator.generateParams(fun.parameters);
        return `
    
---${LuaGenerator.generateAuthorityString(fun.authority)}
---
---${LuaGenerator.generateDocstring(fun)}${params.string}${LuaGenerator.generateReturns(fun.return)}
function ${accessor}${fun.name}(${params.names}) end`;
    }

    static generateConstructor(
        constructor: DocConstructor,
        className: string
    ): string {
        const params = LuaGenerator.generateInlineParams(constructor.parameters);
        return `\n---@overload fun(${params}): ${className}`;
    }
    
    generate(docs: Docs): string {
        let output = "---@meta";

        Object.entries(docs.classes).forEach(([_, cls]) => {
            output += this.generateClass(docs.classes, cls);
        });
        Object.entries(docs.enums).forEach(([name, { enums: values }]) => {
            output += this.generateEnum(name, values);
        });
        return output;
    }

    generateClass(classes: { [key: string]: DocClass }, cls: DocClass): string {
        let inheritance = "";
        if (cls.inheritance !== undefined) {
            inheritance = ` : ${cls.inheritance.join(", ")}`;
        }
    
        const constructors =
            cls.constructors?.reduce(
                (prev, constructor) =>
                    prev + LuaGenerator.generateConstructor(constructor, cls.name),
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
                staticFunctions += LuaGenerator.generateFunction(fun, `${cls.name}.`);
            });
        }
    
        let functions = "";
        if (cls.functions !== undefined) {
            cls.functions.forEach((fun) => {
                if (
                    (fun.name === "Subscribe" || fun.name === "Unsubscribe") &&
                    cls.name !== "Events"
                )
                    return;
                functions += LuaGenerator.generateFunction(fun, `${cls.name}:`);
            });
        }
    
        let events = "";
        if (cls.events !== undefined) {
            // Handle inheritance
            let combinedEvents: { [key: string]: DocEvent } = {};
            if (cls.inheritance !== undefined) {
                cls.inheritance.forEach((clsName) => {
                    classes[clsName].events?.forEach((inheritedEvent) => {
                        combinedEvents[inheritedEvent.name] = inheritedEvent;
                    });
                });
            }
            cls.events.forEach((event) => {
                combinedEvents[event.name] = event;
            });
    
            // Generate overloads
            let subOverloads = "";
            let unsubOverloads = "";
            Object.entries(combinedEvents).forEach(([_, event]) => {
                let callbackSig = "";
                if (event.arguments !== undefined) {
                    callbackSig = event.arguments
                        .map((param, idx) => {
                            const type = LuaGenerator.generateType(param);
                            return `${param.name}${type.optional ? "?" : ""}: ${
                                idx !== 0 || param.name !== "self"
                                    ? type.toString()
                                    : cls.name
                            }`;
                        })
                        .join(", ");
                }
                callbackSig = `fun(${callbackSig})${LuaGenerator.generateInlineReturns(
                    event.return, true
                )}`;
    
                subOverloads += `\n---@overload fun(${
                    cls.staticClass ? "" : `self: ${cls.name}, `
                }event_name: "${
                    event.name
                }", callback: ${callbackSig}): ${callbackSig} ${LuaGenerator.generateInlineDocstring(
                    event
                )}`;
                unsubOverloads += `\n---@overload fun(${
                    cls.staticClass ? "" : `self: ${cls.name}, `
                }event_name: "${
                    event.name
                }", callback: ${callbackSig}) ${LuaGenerator.generateInlineDocstring(event)}`;
            });
    
            events = `
    
---Subscribe to an event
---@param event_name string @Name of the event to subscribe to
---@param callback function @Function to call when the event is triggered
---@return function @The callback function passed${subOverloads}
function ${cls.name}${
                cls.staticClass ? "." : ":"
            }Subscribe(event_name, callback) end
    
---Unsubscribe from an event
---@param event_name string @Name of the event to unsubscribe from
---@param callback? function @Optional callback to unsubscribe (if no callback is passed then all callbacks in this Package will be unsubscribed from this event)${unsubOverloads}
function ${cls.name}${
                cls.staticClass ? "." : ":"
            }Unsubscribe(event_name, callback) end`;
        }
    
        let fields = "";
        if (cls.properties !== undefined) {
            cls.properties.forEach((prop) => {
                fields += `\n---@field ${prop.name} ${LuaGenerator.generateType(
                    prop
                ).toString()} ${LuaGenerator.generateInlineDocstring(prop)}`;
            });
        }
    
        const staticFields = cls.static_properties?.length ? `\n${cls.static_properties.map(field => `${cls.name}.${field.name} = ${field.value}`).join("\n")}` : "";
    
        let operators = "";
        if (cls.operators !== undefined) {
            cls.operators.forEach((op) => {
                if (op.operator in OPERATORS)
                    operators += `\n---@operator ${
                        OPERATORS[op.operator]
                    }(${LuaGenerator.generateType({ type: op.rhs }).toString()}): ${LuaGenerator.generateType(
                        { type: op.return }
                    ).toString()}`;
            });
        }
    
        return `

---${LuaGenerator.generateAuthorityString(cls.authority)}
---
---${LuaGenerator.generateDocstring(cls)}
---@class ${cls.name}${inheritance}${fields}${operators}${constructors}
${cls.name} = {}${staticFields}${staticFunctions}${functions}${events}`;
    }

    generateEnum(name: string, values: DocEnumValue[]): string {
        let valuesString = "";
        values.forEach((value) => {
            valuesString += `\n    ["${value.key}"] = ${value.value},`;
        });
    
        return `
    
---@enum ${name}
${name} = {${valuesString.slice(0, -1)}
}`;
    }
}