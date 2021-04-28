const fs = require('fs');
const path = require('path');
const babylon = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const babel = require('@babel/core');

// createAsset 用來取得 File Info & js 檔之間的 dependency
function createAsset(filename) {
    const content = fs.readFileSync(filename, 'utf-8');

}

function createGraph(entry) {
    const mainAsset = createAsset(entry);
}

createGraph('./src/components/entry.js');
