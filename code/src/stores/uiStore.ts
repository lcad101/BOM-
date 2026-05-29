/**
 * UI状态管理
 */
import { defineStore } from 'pinia';
import { ref, watch } from 'vue';

export const useUiStore = defineStore('ui', () => {
  // ========== 状态 ==========
  const sidebarCollapsed = ref(false);
  const sidebarWidth = ref(280);
  const rightPanelVisible = ref(true);
  const rightPanelWidth = ref(320);
  const theme = ref<'light' | 'dark'>('light');
  const language = ref<'zh-CN' | 'en'>('zh-CN');
  const searchVisible = ref(false);
  const searchKeyword = ref('');

  // ========== 操作 ==========
  function toggleSidebar() {
    sidebarCollapsed.value = !sidebarCollapsed.value;
  }

  function setSidebarWidth(width: number) {
    sidebarWidth.value = Math.max(200, Math.min(500, width));
  }

  function toggleRightPanel() {
    rightPanelVisible.value = !rightPanelVisible.value;
  }

  function setRightPanelWidth(width: number) {
    rightPanelWidth.value = Math.max(250, Math.min(600, width));
  }

  function setTheme(newTheme: 'light' | 'dark') {
    theme.value = newTheme;
    document.documentElement.setAttribute('data-theme', newTheme);
  }

  function setLanguage(lang: 'zh-CN' | 'en') {
    language.value = lang;
  }

  function toggleSearch() {
    searchVisible.value = !searchVisible.value;
    if (!searchVisible.value) {
      searchKeyword.value = '';
    }
  }

  function setSearchKeyword(keyword: string) {
    searchKeyword.value = keyword;
  }

  // 持久化到localStorage
  function loadPersistedState() {
    try {
      const saved = localStorage.getItem('bom-master-ui');
      if (saved) {
        const state = JSON.parse(saved);
        if (state.theme) theme.value = state.theme;
        if (state.language) language.value = state.language;
        if (state.sidebarWidth) sidebarWidth.value = state.sidebarWidth;
        if (state.rightPanelWidth) rightPanelWidth.value = state.rightPanelWidth;
      }
    } catch {
      // 忽略解析错误
    }
  }

  function persistState() {
    localStorage.setItem(
      'bom-master-ui',
      JSON.stringify({
        theme: theme.value,
        language: language.value,
        sidebarWidth: sidebarWidth.value,
        rightPanelWidth: rightPanelWidth.value,
      }),
    );
  }

  // 监听状态变化自动持久化
  watch([theme, language, sidebarWidth, rightPanelWidth], persistState);

  // 初始化时加载
  loadPersistedState();

  return {
    sidebarCollapsed,
    sidebarWidth,
    rightPanelVisible,
    rightPanelWidth,
    theme,
    language,
    searchVisible,
    searchKeyword,
    toggleSidebar,
    setSidebarWidth,
    toggleRightPanel,
    setRightPanelWidth,
    setTheme,
    setLanguage,
    toggleSearch,
    setSearchKeyword,
  };
});