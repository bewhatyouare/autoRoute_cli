const fs = require('fs')

//异步请求库
const {promisify} = require('util')
//基于ASCII字符组成的字符画
const figlet = promisify(require('figlet'))
const chalk = require('chalk')//粉笔
//打印的日志是绿色
const log = content => console.log(chalk.green(content))
const handlebars = require('handlebars');
const js_beautify = require('./beautify.js')
let rootPath = './src/'//根目录
//默认的路由模板
let defaultTemplate = "export default[\n\
    {{#each list}}\n\
    {\n\
      path: '/{{name}}',\n\
      name: '{{name}}',\n\
      component: () => import('{{file}}')\n\
    },\n\
    {{/each}}\n\
]"
const templatePath = './template/router.js.hbs';
let tmpContent = defaultTemplate;
let vuePathFromtmp = '';//模板内vue文件的目录前缀


module.exports = async (pagePath = 'views',targetPath='./src/router/router.js') =>{

    if(pagePath && !~pagePath.indexOf('src/')){//如果参数不包含src/
        rootPath += pagePath;//从src的pagePath目录下读取vue文件
    } else {//参数包含src/
        //判断是不是./src
        rootPath = pagePath.startsWith('./')?pagePath : './' + pagePath;
    }
    const data = await figlet('AUTO ROUTER')
    log(data)

    
    if(fs.existsSync(templatePath)){//判断路由模板文件是否存在
        tmpContent = fs.readFileSync(templatePath).toString();
        log('即将生成的模板文件路径为：'+ templatePath)
    }
    let reg = /import\('(.+?){{file}}'\)/g;//取出component: () => import('./src/views{{file}}')中的import中file的目录
    let result = reg.exec(tmpContent);
    if(result){
        vuePathFromtmp = result[1];//获取到模板中的{{file}}的前缀./src/views
    }
    var isExist = true;
    //检查某个目录是否存在
    try{
        isExist = fs.statSync(rootPath);
    }catch(e){
        log('【'+rootPath + '】目录不存在')
        return;
    }
    let list = [];
    //获取页面列表
    const nowList = fs.readdirSync(rootPath)
    checkIfVue(nowList,rootPath,list);

    if(!list || list.length == 0){//如果没有匹配到路由文件则返回
        return;
    }
    //生成路由定义
    compile({list},targetPath,list)

}

//判断是否为vue文件
function checkIfVue(list,filePath,retList){
    for(let i = 0; i < list.length; i++){
        if(list[i].endsWith('.vue')){//是否为vue文件
            let fileDir = joinDir(filePath,list[i]);
            retList.push({
                name: list[i].replace('.vue','').toLocaleLowerCase(),
                file: fileDir.replace(vuePathFromtmp,'')
            });//添加到返回list中
        } else {
            let nowPath= joinDir(filePath,list[i]);
            let newList = fs.readdirSync(nowPath);
            checkIfVue(newList,nowPath,retList);
        }
    }

}

/**
 * 模板编译
 * @param {*} meta 数据定义
 * @param {*} targetPath 目标文件
 */
function compile(meta,targetPath,dataList){
    let result = handlebars.compile(tmpContent)(meta)
    if(fs.existsSync(targetPath)){//路由文件已经存在
        let newTxt = appendRouteToOld(targetPath,result,dataList);
        if(newTxt){
            fs.writeFileSync(targetPath,newTxt)
        }
        // 同步追加写入方法 appendFileSync
        //fs.appendFileSync(targetPath,result);
    }else {
        let fileDir = targetPath.substr(0,targetPath.lastIndexOf('/'))
        if(!fs.existsSync(fileDir)){
            fs.mkdirSync(fileDir);
        }
        fs.writeFileSync(targetPath,result)
    }
    log(`【${targetPath}】 创建成功`)
}

//拼接两个目录
function joinDir(srcDir,addDir){
    let retDir = srcDir;
    if(!srcDir){//如果源目录srcDir是空的，直接返回目标目录addDir
        return addDir;
    }
    if(!addDir){//如果被添加的目录addDir是空的 直接返回源目录srcDir
        return srcDir
    }
    if(srcDir.endsWith('/')){
        addDir = addDir.startsWith('/')?addDir.substr(1):addDir;
    } else {
        addDir = addDir.startsWith('/')?addDir: '/'+addDir;
    }
    retDir += addDir;
    return retDir;
}

//添加新的路由到旧路由中
function appendRouteToOld(filePath,newRouteStr,newList){
    let retTxt = newRouteStr;
    let orginContent = fs.readFileSync(filePath,{encoding:'utf-8'});
    
    let oneLineTxt = orginContent.replace(/\n/g,'');
    
    let routeMatch = oneLineTxt.match(/\[(.+?)\]/g);//匹配出路由数组
    if(!routeMatch || routeMatch.length == 0){//如果没有匹配到以前的路由
        return newRouteStr;
    }
    let oldRouteArr = [];
    try{
        oldRouteArr = eval('('+routeMatch[0]+')');
    }catch(e){
        console.info('读取旧的route文件发生错误' + e)
    }
    if(!oldRouteArr || oldRouteArr.length == 0){//如果没有匹配到旧的路由数组
        //直接把新的路由文件插入到原来文件的[]数组中
        retTxt = switchOldFile(oneLineTxt,newList)
        return;
    }
    let addList = [];
    
    for(let j = 0; j < newList.length; j++){
        let item = newList[j];
        let flg = true;
        for(let i = 0; i < oldRouteArr.length; i++){
            if(item.name == oldRouteArr[i].name || item.path == oldRouteArr[i].path){
               //在旧的路由数组中已经存在
                flg = false;
                break;
            }
        }
        if(flg) {//没有配置过
            addList.push(item);
        }
    }
    if(addList.length == 0){//没有需要新增的内容
        return '';
    }
    //把合并的路由文件插入到原来文件的[]数组中
    retTxt = switchOldFile(oneLineTxt,addList);
    return retTxt;
}

/**
 * 
 * @param {oldFileContent} 原来路由文件内容
 * @param {*} list 需要新添加的路由数组
 */
function switchOldFile(oldFileContent,list){
    
    let tmpContent =  "{{#each list}}\n\
        {\n\
          path: '/{{name}}',\n\
          name: '{{name}}',\n\
          component: () => import('{{file}}')\n\
        },\n\
        {{/each}}\n"
    let result = handlebars.compile(tmpContent)({list})
    
    let reg = /(\[.+?)\]/g;
    let a = oldFileContent;
    if(reg.test(oldFileContent)) {
        a = a.match(/\[(.+?)\]/g)[0];
        //判断旧的路由数组是否以，结尾
        if(!(a.endsWith(',]'))){
            result =  ',' + result;
        }
        oldFileContent = oldFileContent.replace(reg, '$1'+result+']');
        oldFileContent = beautify(oldFileContent);
    }
    return oldFileContent;
}

//美化JS
function beautify(content){
    let indent_size = 1;
    let indent_char = '\t';
    let retVal = js_beautify(content, {indent_size: indent_size, indent_char: indent_char, preserve_newlines:false});
    //console.info(retVal);
    
    return retVal;
}