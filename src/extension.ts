// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
const fs = require('fs');
let thriftParser = require('thrift-parser');
const vscode_1 = require("vscode");
import * as t from '@byte-ferry/parser';


// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	
	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "ThriftFormat" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('ThriftFormat.helloWorld', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		// 获取当前文件路径
		let thriftFilePath = vscode.window.activeTextEditor?.document.fileName
		if (thriftFilePath == null || thriftFilePath == "") {
			vscode.window.showErrorMessage('没有选中thrift文件，格式化失败');
			return
		}
		// 读取文件内容
		const thriftFileContent = fs.readFileSync(thriftFilePath, 'utf8');
		let thriftContentArr:string = thriftFileContent.split("\n")
		let contentArr:string[] = new Array()
		// 解析thrift 语法
		const document = t.parse(thriftFileContent);
		console.log(document)
		document.body.forEach(item => {
			switch (item.type) {
				case t.SyntaxType.StructDefinition:
					let content = StructHandler(item)
					contentArr = contentArr.concat(content)
					break;
				default:
					console.log(item)
					for (let index = item.loc.start.line; index <= item.loc.end.line; index++) {
						contentArr.push(thriftContentArr[index-1])
						contentArr.push("")
					}	
			}
		})
		replace(0, vscode_1.window.activeTextEditor.document.lineCount + 1, contentArr.join("\n"))
	});


	context.subscriptions.push(disposable);
}

interface ReplaceContent {
	startLine: number,
	endLine: number,
	content: string,
}

// 单个结构体处理
function StructHandler (thriftStruct: t.StructDefinition) :string[] {
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
		if (field.fieldID != undefined && (field.fieldID.value+"").length > lenObj.numLen) {
			lenObj.numLen = (field.fieldID.value+"").length+1; // 加一个引号的长度
		}
		if (field.requiredness !=undefined && field.requiredness.length > lenObj.optionLen) {
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
	contentArr.push("struct "+ thriftStruct.name.value+" {")
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
			fieldValue.numberValue = strFill("    "+field.fieldID.value+":", lenObj.numLen+1);
		}
		if (field.requiredness != undefined) {
			fieldValue.optionValue = strFill(field.requiredness, lenObj.optionLen);
		}
		if (field.fieldType != undefined) {
			let type = typeHandler(field.fieldType)
			fieldValue.typeValue = strFill(type, lenObj.typeLen+1);
		}
		if (field.name != undefined) {
			fieldValue.namevalue = strFill(field.name.value, lenObj.fieldNameLen+2);
		}
		if (field.comments.length > 0) {
			fieldValue.commentValue = "// "+field.comments[0].value
		}
		contentArr.push(fieldValue.numberValue+fieldValue.optionValue+fieldValue.typeValue+fieldValue.namevalue+fieldValue.commentValue)
	})
	contentArr.push("}")
	contentArr.push("")
	return contentArr
}

// 类型处理
function typeHandler (typeStruct:t.FunctionType) :string {
	let typeStr = ""
	switch (typeStruct.type) {
		case t.SyntaxType.Identifier:
			return typeStruct.value			
		case t.SyntaxType.MapType:
			let keyType = typeHandler(typeStruct.keyType)
			let valueType = typeHandler(typeStruct.valueType)
			return "map<"+keyType+", "+valueType+">"
		case t.SyntaxType.ListType:
			let listType = typeHandler(typeStruct.valueType)
			return "list<"+listType+">"
		default:
			return typeStruct.type.substr(0, typeStruct.type.length-7).toLocaleLowerCase()
	
	}
}

function replace(startLine:number, endLine:number, content: string) {
	console.log(startLine + "; "+endLine+"; ")
	if (startLine > 0) {
		startLine = startLine - 1
	}
	//核心代码
	vscode_1.window.activeTextEditor.edit((editBuilder: string) => {
		// 从开始到结束，全量替换
		const end = new vscode_1.Position(endLine, 0);
		editBuilder.replace(new vscode_1.Range(new vscode_1.Position(startLine, 0), end), content);
	});
}

// 字符串填充
function strFill(str:string, len:Number) :string {
	for (let index = str.length-1; index < len; index++) {
		str += " "
	}
	return str
}

// this method is called when your extension is deactivated
export function deactivate() {}
