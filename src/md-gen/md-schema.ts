//Classes

export interface Class {
    name: string;
    description: string;
    baseType: string;
    properties: Property[];
    constants: Constant[];
    constructors: Constructor[];
    memberFunctions: MemberFunction[];
    staticFunctions: StaticFunction[];
}

export interface Property {
    name: string;
    description: string;
    type: string;
    tags: string[];
}

export interface Constant {
    name: string;
    description: string;
    type: string;
    tags: string[];
}

export interface Constructor {
    name: string;
    description: string;
    signature: Signature;
}

export interface MemberFunction {
    name: string;
    description: string;
    signature: Signature;
}

export interface StaticFunction {
    name: string;
    description: string;
    signature: Signature;
}

export interface Signature {
    returns: Return[];
    parameters: Parameter[];
}

export interface Return {
    type: string;
}

export interface Parameter {
    type: string;
    name: string;
    isOptional?: boolean;
}

// Namespaces

export interface Namespace {
    name: string;
    description: string;
    baseType: string;
    properties: Property[];
    constants: Constant[];
    constructors: Constructor[];
    memberFunctions: MemberFunction[];
    staticFunctions: StaticFunction[];
    staticHooks: StaticHook[];
}

export interface StaticHook {
    name: string;
    description: string;
    parameters: Parameter[];
}


// Enums

export interface Enum {
    name: string;
    description: string;
    values: Value[];
}

export interface Value {
    name: string;
    description: string;
    value: string;
}

// Interfaces

export interface Interface {
    name: string;
    description: string;
    properties: Property[];
    events: Event[];
    hooks: Hook[];
    memberFunctions: MemberFunction[];
}

export interface Event {
    name: string;
    description: string;
    parameters: Parameter[];
}

export interface Hook {
    name: string;
    description: string;
    parameters: Parameter[];
}