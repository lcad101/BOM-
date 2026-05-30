// 修复旧BOM版本数据，补充bomCode字段
// 在浏览器控制台中运行，或作为参考
const key = 'bom_master_data';
const data = JSON.parse(localStorage.getItem(key) || '{}');
if (data.bomVersions && data.bomVersions.length > 0) {
  let counter = 1;
  data.bomVersions.forEach(v => {
    if (!v.bomCode) {
      v.bomCode = String(counter).padStart(12, '0');
      counter++;
    }
  });
  localStorage.setItem(key, JSON.stringify(data));
  console.log('已修复', data.bomVersions.length, '个BOM版本的bomCode');
} else {
  console.log('没有需要修复的数据');
}