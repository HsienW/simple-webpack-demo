/** Webpack 基本工作原理 **/

// 本質上來說 Webpack 就是一個 module builder
// 它的工作流程可以大概歸為三個步驟
// step1 把每個 file 的 code 轉換成 ES5 (瀏覽器才能看懂), 並且生產該 file 的 dependency AST
// step2 透過第一步的 AST 產生 file 之間的 dependency 圖 (使用遞迴)
// step3 透過第二步的 dependency 圖 build 出來, 壓成一個 pure js file

const fs = require('fs');
const path = require('path');
const babelParser = require('@babel/parser');
const babelTraverse = require('@babel/traverse').default;
const babel = require('@babel/core');

let id = 0;

// step1
// createAsset 用來取得 File Info & js 檔之間的 dependency
function createAsset(filePath) {

    // 用來存後面解析出來當前 file import 了哪些的路徑
    const dependencies = [];

    // readFileSync 會回傳一個 string 說明當前 file 全部的 dependency (import) 路徑 & code
    const fileInfo = fs.readFileSync(filePath, 'utf-8');
    console.log('====== fileInfo ======');
    console.log(fileInfo);
    console.log(typeof fileInfo === 'string');

    // babelParser 負責將 string 生成 AST
    // AST (Abstract Syntax Tree)
    // 可以簡單理解為會把 js file code 的每個字(包括關鍵字) 都抽象轉換
    // 最後彙整成一個說明細節的大 object, 而 object 每個階層又叫做 node
    const fileAST = babelParser.parse(fileInfo, {
        // babel 官方規定要加這個參數, 否則無法識別 ES Module
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
        ImportDeclaration: (path) => {
            // 歷遍每個有 ImportDeclaration function 的 node
            // 從 path.node.source.value 取出 import path 的 string 並且 push 到 dependencies array 中
            // 例如: 當前 file 有 import message from './message.js'; 會取出 './message.js'
            dependencies.push(path.node.source.value);
        }
    });

    // 為每個轉換過的 file 添加 id
    const astId = id++;

    // transformFromAstSync 用來把 ES6 轉成 ES5 (像是 polyfill 在做的事情一樣)
    // 他接受三個參數
    // 參數1: 要被轉換的 AST
    // 參數2: 要被轉換的 ES6 以上的 source code (這裡我們已經有 AST 了, 所以就不用特別再傳 source code 進去)
    // 參數3: babel option 傳入你想要調用的 babel 轉換包
    const {code} = babel.transformFromAstSync(fileAST, null, {
        presets: ['@babel/preset-env']
    });

    // 最後回傳一個大 obj 帶有以下4點
    // 1. model id
    // 2. 檔案路徑
    // 3. dependency array
    // 4. 轉換後的 ES5 code
    return {
        astId,
        filePath,
        dependencies,
        code
    };
}

// step2
// 從 entry point 開始產生 dependency 圖, 使用廣度優先 (BFS)
function createGraph(entry) {
    const mainAsset = createAsset(entry);
    console.log('====== main asset ======');
    console.log(mainAsset);

    // 廣度優先一般都使用佇列 (queue) & for 迴圈來處理, 第一個一定是從 entry.js 回傳的開始
    const queue = [mainAsset];

    for (const asset of queue) {

        // path.dirname 給它一段路徑(string) 會回傳檔案前段的路徑
        // 例如: ./src/components/entry.js 會回傳 ./src/components
        const dirname = path.dirname(asset.filePath);

        console.log('====== path ======');
        console.log(dirname);

        // 新增一個屬性 childDependencyMap 用來存放 child 相關的 data
        // 例如: {"./message.js" : 1}
        asset.childDependencyMap = {};

        asset.dependencies.forEach(childPath => {
            // path.join 接受一個 string array 會把它全部串起來回傳成一段路徑 string
            const childFullPath = path.join(dirname, childPath);

            // 使用 createAsset 傳入 childFullPath 用以取得 child 的 dependency object
            const childAsset = createAsset(childFullPath);

            // 存入 dependency map 路徑 & id 對應
            asset.childDependencyMap[childPath] = childAsset.astId;

            // childAsset 也傳入 queue 做廣度優先 (BFS) 的歷遍
            queue.push(childAsset);
        });
    }

    console.log('====== queue ======');
    console.log(queue);

    return queue;
}

// step3
// bundle 用來透過 Graph 圖去產生對應可以 run 的 code (webpack 是產出瀏覽器可以用的)
// 到這一步目前都還是在操作 string 最後回傳的才是可以執行的 code
function bundle(graph) {

    // 用來存後面 graph 解析出來的 code (string)
    let modules = '';

    // 歷遍 graph 把每個要轉出 bundle 的 model 透過 id & string 先把 function scope 等等的 code 存起來
    graph.forEach(model => {
        modules += `
            ${model.astId}: {
                handler: function (require, module, exports) {${model.code}},
                dependencyMap: ${JSON.stringify(model.childDependencyMap)},
            },
        `;
    });

    console.log('====== modules ======');
    console.log(modules);

    // require, module, exports 不能在瀏覽器裡用, 所以我們自己模擬一下這三個 function (注意這裡都使用 string 不然瀏覽器會 error)
    // result 用來存放 IIFE 並傳入我們的 modules
    const result = `
    (function(modules){

      // require 傳入一個 id (string) 對應 modules 中我們要取出的 model
      function require(id){

        // 取出當前這個 model 的 dependency map & 要執行的 handler function
        const {handler, dependencyMap} = modules[id];

        // scope 內準備一個 mappingRequire 處理從 childDependencyMap 中拿路徑去 mapping 出對應的 model
        function mappingRequire(path) {
          return require(dependencyMap[path]);
        }

        // 先預設 exports 出去的是一個空的 object
        const module = {exports:{}};

        // call mappingRequire 開始尋找 mapping
        handler(mappingRequire, module, module.exports);

        return module.exports;
      }

      // 第一步開始先 call entry 給 0 當 id
      require(0);
    })({${modules}})
  `;
    return result;
}

const graph = createGraph('./src/components/entry.js');
const result = bundle(graph);

// writeFileSync 用來把 data 同步寫入並在對應路徑下產生 file , 如果該 file 已經存在, 則整個替換它的 content
// 他接受三個參數
// 參數1: 對應要產生的路徑 (string)
// 參數2: 要寫入 file 的 code (string)
// 參數3: 用於指定將影響輸出的可選參數 (這邊不用特別設, 讓它預設 utf8)
fs.writeFileSync('./bundle.js', result);
