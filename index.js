const fs = require('fs');
const path = require('path');
const babelParser = require('@babel/parser');
const babelTraverse = require('@babel/traverse').default;
const babel = require('@babel/core');

let id = 0;

// createAsset 用來取得 File Info & js 檔之間的 dependency
function createAsset(filename) {

    // 用來存後面解析出來當前 file import 了哪些的路徑
    const dependencies = [];

    // readFileSync 會回傳一個 string 說明當前 file 全部的 dependency (import) 路徑 & code
    const fileInfo = fs.readFileSync(filename, 'utf-8');
    console.log('====== fileInfo ======');
    console.log(fileInfo);
    console.log(typeof fileInfo === 'string');

    // babelParser 負責將 string 生成 AST
    // AST (Abstract Syntax Tree)
    // 可以簡單理解為會把 js file code 的每個字(包括關鍵字) 都抽象轉換
    // 最後彙整成一個說明細節的大 object, 而 object 每個階層又叫做 node
    const fileAST = babelParser.parse(fileInfo, {
        sourceType: 'module'
    });

    console.log('====== asset ======');
    console.log(fileAST);

    // babelTraverse 是用來歷遍對 AST 的工具
    // 類似於 string 的 replace, 指定一個正則表達式, 就能對 string 進行替換, 他接受兩個參數
    // 參數1: 傳入要歷遍的 AST
    // 參數2: 傳入遇到指定 string 時, 要額外做事的 object
    babelTraverse(fileAST, {
        // 因為是要取得 file 之間的 dependency 路徑, 所以 node types 設定為 'ImportDeclaration'
        // 這樣當 babel 轉換到 file 裡的 import 關鍵字時, 就會走到這個 ImportDeclaration function 裡
        ImportDeclaration: (node) => {
            // 歷遍每個有 ImportDeclaration function 的 node
            // 從 node.source.value 取出 import path 的 string 並且 push 到 dependencies array 中
            // 例如: 當前 file 有 import message from './message.js'; 會取出 './message.js'
            dependencies.push(node.source.value);
        }
    });

    // 為每個轉換過的 file 添加 id
    const astId = id++;

    // transformFromAstSync 用來把 ES6 轉成 ES5 (像是 polyfill 在做的事情一樣)
    // 他接受三個參數
    // 參數1:
    // 參數2:
    // 參數3:
    const {code} = babel.transformFromAstSync(fileAST, null, {
        presets: ['@babel/preset-env']
    });

    return {
        id,
        filename,
        dependencies,
        code
    };
}

function createGraph(entry) {
    const mainAsset = createAsset(entry);
}

createGraph('./src/components/entry.js');
