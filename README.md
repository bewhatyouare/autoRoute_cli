# autoRoute_cli
用于把.vue文件生成route配置文件
# 安装
npm install autorouter-cli -g
# 使用方法
nxl createRoute <vuefile-path> [routepath]
参数： <vuefile-path>是需要创建路由配置的文件目录，必输项
      [routepath] 是生成的路由配置文件，默认为src/route/route.js

# 例子
    项目文件src/views/aa.vue
    执行nxl createRoute views
    如果没有路由文件 会自动生成src/route/route.js
    export default  [
        {
        path: '/aa',
        name: 'aa',
        component: () => import('./src/views/aa.vue')
        },
    ]

    在views下再新建bb.vue,执行nxl createRoute views
    会在src/route/route.js中添加
        {
        path: '/bb',
        name: 'bb',
        component: () => import('./src/views/bb.vue')
        },


