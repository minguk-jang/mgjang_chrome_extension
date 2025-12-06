// 아이콘 클릭 시 사이드 패널 열기
chrome.action.onClicked.addListener((tab) => {
  // 현재 윈도우에 대해 사이드 패널 열기
  chrome.sidePanel.open({ windowId: tab.windowId });
});
