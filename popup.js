// 탭 전환 로직 관리
document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.tab-btn');
  const contents = document.querySelectorAll('.tab-content');

  // 이전에 선택했던 탭 기억하기 (저장된 값이 없으면 screenshot-tab)
  const savedTab = localStorage.getItem('activeTab') || 'screenshot-tab';
  activateTab(savedTab);

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTab = tab.dataset.tab;
      activateTab(targetTab);
      
      // 선택 상태 저장
      localStorage.setItem('activeTab', targetTab);
    });
  });

  function activateTab(tabId) {
    // 모든 탭 및 컨텐츠 비활성화
    tabs.forEach(t => t.classList.remove('active'));
    contents.forEach(c => c.classList.remove('active'));

    // 선택된 탭 및 컨텐츠 활성화
    const activeBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    const activeContent = document.getElementById(tabId);

    if (activeBtn && activeContent) {
      activeBtn.classList.add('active');
      activeContent.classList.add('active');
    }
  }
});
