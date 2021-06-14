import * as t from '@byte-ferry/parser';
import { Node } from '@byte-ferry/parser';
import { type } from 'os';
import * as utils from './utils';

export class NodeData {
    ContentArr: string[] = []
}

export class ContentData {
    NameSpaces: NodeData[] = []
    Includes: NodeData[] = []
    Enums: NodeData[] = []
    Structs: NodeData[] = []
    Services: NodeData[] = []
    Others: NodeData[] = []
}

export function namespaceHandler(ns: t.NamespaceDefinition): string[] {
    let namespaceArr: string[] = new Array()
    // 评论处理
    ns.comments.forEach(item => namespaceArr.push("// " + item.value))
    let str = "namespace " + ns.scope.value + " " + ns.name.value
    namespaceArr.push(str)
    return namespaceArr
}
export function includeHandler(ns: t.IncludeDefinition): string[] {
    let inArr: string[] = new Array()
    // 评论处理
    ns.comments.forEach(item => inArr.push("// " + item.value))
    let str = "include \"" + ns.path.value + "\";"
    inArr.push(str)
    return inArr
}

export function enumHandler(en: t.EnumDefinition): string[] {
    let enArr: string[] = new Array()
    // 评论处理
    en.comments.forEach(item => enArr.push("// " + item.value))
    let name = "enum " + en.name.value + " {"
    enArr.push(name)
    let lenObj = {
        nameLen: 0,
        valueLen: 0,
    }
    en.members.forEach(item => {
        if (item.name.value.length > lenObj.nameLen) {
            lenObj.nameLen = item.name.value.length
        }
        if ((item.initializer?.value.value + "").length > lenObj.valueLen) {
            lenObj.valueLen = (item.initializer?.value.value + "").length
        }
    })


    en.members.forEach(item => {
        let fieldValue = {
            nameValue: "",
            value: "",
            comment: "",
        }
        if (item.name != undefined) {
            fieldValue.nameValue = utils.strFill(item.name.value, lenObj.nameLen)
        }
        if (item.initializer != undefined) {
            fieldValue.value = utils.strFill(item.initializer?.value.value + "", lenObj.valueLen)
        }
        if (item.comments.length > 0) {
            fieldValue.comment = "// " + item.comments[0].value
        }
        enArr.push("    " + fieldValue.nameValue + " = " + fieldValue.value + " " + fieldValue.comment)
    })
    enArr.push("}")

    return enArr
}


// 单个结构体处理
export function StructHandler(thriftStruct: t.StructDefinition): string[] {
    let contentArr: string[] = new Array()
    //  1: required i64 submit_id,  // 提交id
    //  1  2        3   4           5
    let lenObj = {
        numLen: 0,
        optionLen: 0,
        typeLen: 0,
        fieldNameLen: 0,
        noteLen: 0,
    }

    // 字段长度处理
    thriftStruct.fields.forEach(field => {
        if (field.fieldID != undefined && (field.fieldID.value + "").length > lenObj.numLen) {
            lenObj.numLen = (field.fieldID.value + "").length + 1; // 加一个引号的长度
        }
        if (field.requiredness != undefined && field.requiredness.length > lenObj.optionLen) {
            lenObj.optionLen = field.requiredness.length;
        }
        if (field.fieldType != undefined) {
            let type = typeHandler(field.fieldType)
            if (type.length > lenObj.typeLen) {
                lenObj.typeLen = type.length;
            }
        }
        if (field.name != undefined && field.name.value.length > lenObj.fieldNameLen) {
            lenObj.fieldNameLen = field.name.value.length
        }
    })


    // 注释处理
    if (thriftStruct.comments.length > 0) {
        thriftStruct.comments.forEach(comment => {
            contentArr.push("// " + comment.value)
        })
    }
    contentArr.push("struct " + thriftStruct.name.value + " {")
    // 字段处理
    thriftStruct.fields.forEach(field => {
        let fieldValue = {
            numberValue: "",
            optionValue: "",
            typeValue: "",
            namevalue: "",
            commentValue: "",
        }

        if (field.fieldID != undefined) {
            fieldValue.numberValue = "    " + utils.strFill(+field.fieldID.value + ":", lenObj.numLen);
        }
        if (field.requiredness != undefined) {
            fieldValue.optionValue = utils.strFill(field.requiredness, lenObj.optionLen);
        }
        if (field.fieldType != undefined) {
            let type = typeHandler(field.fieldType)
            fieldValue.typeValue = utils.strFill(type, lenObj.typeLen + 1);
            if (field.requiredness == undefined) {
                fieldValue.typeValue = utils.strFill(fieldValue.typeValue, lenObj.typeLen + lenObj.optionLen + 2)
            }
        }
        if (field.name != undefined) {
            fieldValue.namevalue = utils.strFill(field.name.value, lenObj.fieldNameLen + 2);
        }
        if (field.comments.length > 0) {
            fieldValue.commentValue = "// " + field.comments[0].value
        }
        contentArr.push(fieldValue.numberValue + fieldValue.optionValue + fieldValue.typeValue + fieldValue.namevalue + ";" + fieldValue.commentValue)
    })
    contentArr.push("}")
    contentArr.push("")
    return contentArr
}

// 类型处理
function typeHandler(typeStruct: t.FunctionType): string {
    switch (typeStruct.type) {
        case t.SyntaxType.Identifier:
            return typeStruct.value
        case t.SyntaxType.MapType:
            let keyType = typeHandler(typeStruct.keyType)
            let valueType = typeHandler(typeStruct.valueType)
            return "map<" + keyType + ", " + valueType + ">"
        case t.SyntaxType.ListType:
            let listType = typeHandler(typeStruct.valueType)
            return "list<" + listType + ">"
        default:
            return typeStruct.type.substr(0, typeStruct.type.length - 7).toLocaleLowerCase()

    }
}

export function ServiceHandler(serviceStruct: t.ServiceDefinition): string[] {
    let contentArr: string[] = new Array()
    // 注释处理
    if (serviceStruct.comments.length > 0) {
        serviceStruct.comments.forEach(item => {
            contentArr.push("// " + item.value)
        })
    }
    contentArr.push("service " + serviceStruct.name.value + " {")
    if (serviceStruct.functions.length > 0) {
        serviceStruct.functions.forEach(item => {
            contentArr = contentArr.concat(FunctionHandler(item))
        })
    }
    contentArr.push("}")
    return contentArr
}

export function FunctionHandler(funStruct: t.FunctionDefinition): string[] {
    let contentArr: string[] = new Array()
    // 注释处理
    if (funStruct.comments.length > 0) {
        funStruct.comments.forEach(item => {
            contentArr.push("    // " + item.value)
        })
    }
    let funStr = "    " + typeHandler(funStruct.returnType) + " " + funStruct.name.value + "("
    if (funStruct.fields.length > 0) {
        let flag: boolean = false
        funStruct.fields.forEach(item => {
            if (item.fieldType != undefined) {
                funStr += item.fieldID?.value + ": " + typeHandler(item.fieldType) + " " + item.name.value
                flag = true
            }
        })
        if (flag) {
            funStr = funStr.substring(0, funStr.length - 1)
        }
    }
    funStr += ");"
    contentArr.push(funStr)
    contentArr.push("")
    return contentArr
}