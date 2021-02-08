#!/usr/bin/env node
//指定脚本解释器为node
const propram = require('commander');//命令

//版本号
propram.version(require('../package.json').version)

propram
    .command('createRoute <vuefile-path> [routepath]')
    .description('读取<vue-path>目录下的vue文件，生成相应的路由配置到[routepath],\n默认生成到src/router/router.js')
    .action(require('../lib/createRouter.js'))


//执行 必须有
propram.parse(process.argv)