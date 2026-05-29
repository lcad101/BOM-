/**
 * 应用入口
 */
import { createApp } from 'vue';
import { createPinia } from 'pinia';
import ElementPlus from 'element-plus';
import zhCn from 'element-plus/es/locale/lang/zh-cn';
import 'element-plus/dist/index.css';
import * as ElementPlusIconsVue from '@element-plus/icons-vue';

import App from './App.vue';
import router from './router';
import './assets/styles/global.scss';

const app = createApp(App);

// 注册Pinia
const pinia = createPinia();
app.use(pinia);

// 注册路由
app.use(router);

// 注册Element Plus
app.use(ElementPlus, { locale: zhCn });

// 注册所有Element Plus图标
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
  app.component(key, component);
}

// 全局错误处理
app.config.errorHandler = (err, _instance, info) => {
  console.error('[Global Error]', err, info);
};

app.mount('#app');