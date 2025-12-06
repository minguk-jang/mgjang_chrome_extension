// 스크린샷 탭 기능 구현
document.addEventListener('DOMContentLoaded', () => {
  // --- DOM 요소 참조 ---
  const captureBtn = document.getElementById('capture-btn');
  const clearBtn = document.getElementById('clear-screenshots-btn');
  const thumbnailGrid = document.getElementById('thumbnail-grid');
  const previewSection = document.getElementById('preview-section');
  const emptyState = document.getElementById('empty-state');
  const historySection = document.getElementById('history-section');
  const mainPreview = document.getElementById('main-preview');
  const infoDate = document.getElementById('info-date');
  const infoUrl = document.getElementById('info-url');
  const toast = document.getElementById('toast');

  let currentScreenshot = null;

  // --- 초기화 ---
  loadScreenshots();

  // --- 이벤트: 캡처 버튼 ---
  captureBtn.addEventListener('click', async () => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];

      if (!activeTab) {
        alert('활성화된 탭을 찾을 수 없습니다.');
        return;
      }

      // 1. 캡처
      const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
      
      // 5MB 제한 체크 (약 5MB = 5 * 1024 * 1024 바이트, base64 인코딩 고려)
      if (dataUrl.length > 7000000) { 
        alert('이미지 용량이 너무 큽니다.');
        return;
      }

      const timestamp = Date.now();
      const newScreenshot = {
        id: timestamp,
        dataUrl: dataUrl,
        url: activeTab.url,
        timestamp: timestamp,
        title: activeTab.title || '제목 없음'
      };

      // 2. 저장
      saveScreenshot(newScreenshot);

    } catch (error) {
      console.error('캡처 실패:', error);
      alert('캡처 중 오류가 발생했습니다: ' + error.message);
    }
  });

  // --- 이벤트: 전체 삭제 버튼 ---
  clearBtn.addEventListener('click', () => {
    if (confirm('모든 스크린샷을 삭제하시겠습니까?')) {
      chrome.storage.local.set({ screenshots: [] }, () => {
        showEmptyState();
        renderGrid([]);
      });
    }
  });

  // --- 이벤트: 단축키 복사 (Cmd/Ctrl + C) ---
  document.addEventListener('keydown', (e) => {
    const screenshotTab = document.getElementById('screenshot-tab');
    // 스크린샷 탭이 활성화 상태일 때만 동작
    if (!screenshotTab.classList.contains('active')) return;

    if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
      if (currentScreenshot && !previewSection.classList.contains('hidden')) {
        e.preventDefault();
        copyToClipboard(currentScreenshot.dataUrl);
      }
    }
  });

  // --- 함수: 스크린샷 저장 ---
  function saveScreenshot(screenshot) {
    chrome.storage.local.get(['screenshots'], (result) => {
      let screenshots = result.screenshots || [];
      
      // 최신순 추가 (FIFO)
      screenshots.unshift(screenshot);

      // 최대 10개 유지
      if (screenshots.length > 10) {
        screenshots = screenshots.slice(0, 10);
      }

      chrome.storage.local.set({ screenshots: screenshots }, () => {
        if (chrome.runtime.lastError) {
          alert('저장 실패: ' + chrome.runtime.lastError.message);
          return;
        }
        renderGrid(screenshots);
        selectScreenshot(screenshot);
      });
    });
  }

  // --- 함수: 불러오기 ---
  function loadScreenshots() {
    chrome.storage.local.get(['screenshots'], (result) => {
      const screenshots = result.screenshots || [];
      renderGrid(screenshots);

      if (screenshots.length > 0) {
        selectScreenshot(screenshots[0]);
      } else {
        showEmptyState();
      }
    });
  }

  // --- 함수: 그리드 렌더링 ---
  function renderGrid(screenshots) {
    thumbnailGrid.innerHTML = '';

    if (screenshots.length === 0) {
      showEmptyState();
      return;
    }

    emptyState.classList.add('hidden');
    previewSection.classList.remove('hidden');
    historySection.classList.remove('hidden');

    screenshots.forEach(item => {
      const thumbDiv = document.createElement('div');
      thumbDiv.className = 'thumbnail-item';
      thumbDiv.dataset.id = item.id;
      
      const img = document.createElement('img');
      img.src = item.dataUrl;
      img.alt = item.title;
      
      const timeDiv = document.createElement('div');
      timeDiv.className = 'time-overlay';
      timeDiv.textContent = formatTimeSimple(item.timestamp);

      thumbDiv.appendChild(img);
      thumbDiv.appendChild(timeDiv);

      thumbDiv.addEventListener('click', () => {
        selectScreenshot(item);
      });

      thumbnailGrid.appendChild(thumbDiv);
    });
  }

  // --- 함수: 선택 및 미리보기 ---
  function selectScreenshot(item) {
    currentScreenshot = item;

    mainPreview.src = item.dataUrl;
    
    infoDate.textContent = formatDateTimeFull(item.timestamp);
    infoUrl.textContent = item.url;
    infoUrl.href = item.url;

    previewSection.classList.remove('hidden');
    emptyState.classList.add('hidden');

    // 선택 스타일 업데이트
    const thumbnails = document.querySelectorAll('.thumbnail-item');
    thumbnails.forEach(thumb => {
      if (parseInt(thumb.dataset.id) === item.id) {
        thumb.classList.add('selected');
      } else {
        thumb.classList.remove('selected');
      }
    });
  }

  function showEmptyState() {
    previewSection.classList.add('hidden');
    historySection.classList.add('hidden');
    emptyState.classList.remove('hidden');
    currentScreenshot = null;
  }

  // --- 유틸리티: 클립보드 복사 ---
  async function copyToClipboard(dataUrl) {
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const item = new ClipboardItem({ [blob.type]: blob });
      await navigator.clipboard.write([item]);
      
      showToast();
    } catch (err) {
      console.error('복사 실패:', err);
      alert('클립보드 복사 실패');
    }
  }

  function showToast() {
    toast.classList.remove('hidden');
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 1500);
  }

  // --- 유틸리티: 시간 포맷 ---
  function formatTimeSimple(timestamp) {
    return new Date(timestamp).toLocaleTimeString('ko-KR', { 
      hour: 'numeric', minute: '2-digit', hour12: true 
    });
  }

  function formatDateTimeFull(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    const timeStr = date.toLocaleTimeString('ko-KR', { 
      hour: 'numeric', minute: '2-digit', hour12: true 
    });

    if (isToday) return `오늘 ${timeStr}`;
    return `${date.toLocaleDateString('ko-KR')} ${timeStr}`;
  }
});
