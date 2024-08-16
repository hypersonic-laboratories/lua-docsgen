/*

---JSON to Markdown---

Ideology:
- Description at top
- Uses tables liberally
- Good error checking/logging for missing/wrong fields
- Doesn't have inheritance or similarly complex data; that's for the autocomplete (and examples and tutorials)
- Examples eventually shown at the bottom (integrated via ./examples.ts)

Implementation:
- Uses ./md-schema.ts to classify and format the data
- Proof of concept only for now; to update later when input data is more finalized

TODO:
- Change how it sees types (e.g. by folder, not by subname)

*/


import * as fs from 'fs';
import { Class, Namespace, Enum, Interface, Property, Constant, Constructor, MemberFunction, StaticFunction, Signature, Hook, StaticHook, Event } from './md-schema';

export function jsonToMarkdown(jsonData: any): string {
    let markdown = '';

    try {
        if (jsonData.classes) {
            markdown += generateClassesMarkdown(jsonData.classes);
        }

        if (jsonData.namespaces) {
            markdown += generateNamespacesMarkdown(jsonData.namespaces);
        }

        if (jsonData.enums) {
            markdown += generateEnumsMarkdown(jsonData.enums);
        }

        if (jsonData.interfaces) {
            markdown += generateInterfacesMarkdown(jsonData.interfaces);
        }
    } catch (error) {
        console.error('Error generating Markdown:', error);
    }

    return markdown;
}

function generateClassesMarkdown(classes: Class[]): string {
    let markdown = '# Classes\n\n';
    for (const classData of classes) {
        markdown += `## ${classData.name}\n\n`;
        markdown += `${classData.description}\n\n`;

        if (classData.baseType) {
            markdown += `**Base Type:** ${classData.baseType}\n\n`;
        }

        if (classData.properties?.length) {
            markdown += generatePropertiesTable(classData.properties);
        }

        if (classData.constants?.length) {
            markdown += generateConstantsTable(classData.constants);
        }

        if (classData.constructors?.length) {
            markdown += generateConstructorsTable(classData.constructors);
        }

        if (classData.memberFunctions?.length) {
            markdown += generateFunctionsTable('Member Functions', classData.memberFunctions);
        }

        if (classData.staticFunctions?.length) {
            markdown += generateFunctionsTable('Static Functions', classData.staticFunctions);
        }

        markdown += '---\n\n';
    }
    return markdown;
}

function generateNamespacesMarkdown(namespaces: Namespace[]): string {
    let markdown = '# Namespaces\n\n';
    for (const namespaceData of namespaces) {
        markdown += `## ${namespaceData.name}\n\n`;
        markdown += `${namespaceData.description}\n\n`;

        if (namespaceData.baseType) {
            markdown += `**Base Type:** ${namespaceData.baseType}\n\n`;
        }

        if (namespaceData.properties?.length) {
            markdown += generatePropertiesTable(namespaceData.properties);
        }

        if (namespaceData.constants?.length) {
            markdown += generateConstantsTable(namespaceData.constants);
        }

        if (namespaceData.constructors?.length) {
            markdown += generateConstructorsTable(namespaceData.constructors);
        }

        if (namespaceData.memberFunctions?.length) {
            markdown += generateFunctionsTable('Member Functions', namespaceData.memberFunctions);
        }

        if (namespaceData.staticFunctions?.length) {
            markdown += generateFunctionsTable('Static Functions', namespaceData.staticFunctions);
        }

        if (namespaceData.staticHooks?.length) {
            markdown += generateStaticHooksTable(namespaceData.staticHooks);
        }

        markdown += '---\n\n';
    }
    return markdown;
}

function generateEnumsMarkdown(enums: Enum[]): string {
    let markdown = '# Enums\n\n';
    for (const enumData of enums) {
        markdown += `## ${enumData.name}\n\n`;
        markdown += `${enumData.description}\n\n`;

        if (enumData.values?.length) {
            markdown += `| Name | Description | Value |\n`;
            markdown += `| ---- | ----------- | ----- |\n`;
            for (const value of enumData.values) {
                markdown += `| ${value.name} | ${value.description} | ${value.value} |\n`;
            }
        }

        markdown += '---\n\n';
    }
    return markdown;
}

function generateInterfacesMarkdown(interfaces: Interface[]): string {
    let markdown = '# Interfaces\n\n';
    for (const interfaceData of interfaces) {
        markdown += `## ${interfaceData.name}\n\n`;
        markdown += `${interfaceData.description}\n\n`;

        if (interfaceData.properties?.length) {
            markdown += generatePropertiesTable(interfaceData.properties);
        }

        if (interfaceData.events?.length) {
            markdown += generateEventsTable(interfaceData.events);
        }

        if (interfaceData.hooks?.length) {
            markdown += generateHooksTable(interfaceData.hooks);
        }

        if (interfaceData.memberFunctions?.length) {
            markdown += generateFunctionsTable('Member Functions', interfaceData.memberFunctions);
        }

        markdown += '---\n\n';
    }
    return markdown;
}

function generatePropertiesTable(properties: Property[]): string {
    let markdown = `**Properties:**\n\n`;
    markdown += `| Name | Type | Description | Tags |\n`;
    markdown += `| ---- | ---- | ----------- | ---- |\n`;
    for (const prop of properties) {
        markdown += `| ${prop.name} | ${prop.type} | ${prop.description} | ${prop.tags?.join(', ') ?? 'N/A'} |\n`;
    }
    markdown += '\n';
    return markdown;
}

function generateConstantsTable(constants: Constant[]): string {
    let markdown = `**Constants:**\n\n`;
    markdown += `| Name | Type | Description | Tags |\n`;
    markdown += `| ---- | ---- | ----------- | ---- |\n`;
    for (const constant of constants) {
        markdown += `| ${constant.name} | ${constant.type} | ${constant.description} | ${constant.tags?.join(', ') ?? 'N/A'} |\n`;
    }
    markdown += '\n';
    return markdown;
}

function generateConstructorsTable(constructors: Constructor[]): string {
    let markdown = `**Constructors:**\n\n`;
    for (const constructor of constructors) {
        markdown += `### ${constructor.name}\n\n`;
        markdown += `${constructor.description}\n\n`;
        markdown += generateSignatureTable(constructor.signature);
    }
    return markdown;
}

function generateFunctionsTable(title: string, functions: (MemberFunction | StaticFunction)[]): string {
    let markdown = `**${title}:**\n\n`;
    for (const func of functions) {
        markdown += `### ${func.name}\n\n`;
        markdown += `${func.description}\n\n`;
        markdown += generateSignatureTable(func.signature);
    }
    return markdown;
}

function generateSignatureTable(signature: Signature): string {
    let markdown = `**Signature:**\n\n`;

    if (signature.parameters?.length) {
        markdown += `| Parameter | Type | Optional |\n`;
        markdown += `| --------- | ---- | -------- |\n`;
        for (const param of signature.parameters) {
            markdown += `| ${param.name} | ${param.type} | ${param.isOptional ? 'Yes' : 'No'} |\n`;
        }
    }

    if (signature.returns?.length) {
        markdown += `**Returns:**\n\n`;
        markdown += `| Type |\n`;
        markdown += `| ---- |\n`;
        for (const ret of signature.returns) {
            markdown += `| ${ret.type} |\n`;
        }
    }

    markdown += '\n';
    return markdown;
}

function generateEventsTable(events: Event[]): string {
    let markdown = `**Events:**\n\n`;
    for (const event of events) {
        markdown += `### ${event.name}\n\n`;
        markdown += `${event.description}\n\n`;
        markdown += `| Parameter | Type |\n`;
        markdown += `| --------- | ---- |\n`;
        for (const param of event.parameters) {
            markdown += `| ${param.name} | ${param.type} |\n`;
        }
        markdown += '\n';
    }
    return markdown;
}

function generateHooksTable(hooks: Hook[]): string {
    let markdown = `**Hooks:**\n\n`;
    for (const hook of hooks) {
        markdown += `### ${hook.name}\n\n`;
        markdown += `${hook.description}\n\n`;
        markdown += `| Parameter | Type |\n`;
        markdown += `| --------- | ---- |\n`;
        for (const param of hook.parameters) {
            markdown += `| ${param.name} | ${param.type} |\n`;
        }
        markdown += '\n';
    }
    return markdown;
}

function generateStaticHooksTable(staticHooks: StaticHook[]): string {
    let markdown = `**Static Hooks:**\n\n`;
    for (const hook of staticHooks) {
        markdown += `### ${hook.name}\n\n`;
        markdown += `${hook.description}\n\n`;
        markdown += `| Parameter | Type |\n`;
        markdown += `| --------- | ---- |\n`;
        for (const param of hook.parameters) {
            markdown += `| ${param.name} | ${param.type} |\n`;
        }
        markdown += '\n';
    }
    return markdown;
}