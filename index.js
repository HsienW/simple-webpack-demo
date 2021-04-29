const fs = require('fs');
const path = require('path');
const babylon = require('@babel/parser');
const traverse = require('@babel/traverse').default;
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

    // babylon 負責將 string 生成 AST
    // AST (Abstract Syntax Tree)
    // 可以簡單理解為會把 js file code 的每個字(包括關鍵字) 都抽象轉換, 最後彙整成一個說明細節的大 object
    const asset = babylon.parse(fileInfo, {
        sourceType: "module"
    });

    console.log('====== asset ======');
    console.log(asset);

}

function createGraph(entry) {
    const mainAsset = createAsset(entry);
}

createGraph('./src/components/entry.js');
