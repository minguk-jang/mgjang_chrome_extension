document.addEventListener('DOMContentLoaded', () => {
  // --- DOM 요소 참조 ---
  const captureBtn = document.getElementById('capture-btn');
  const thumbnailGrid = document.getElementById('thumbnail-grid');
  const previewSection = document.getElementById('preview-section');
  const emptyState = document.getElementById('empty-state');
  
  const mainPreview = document.getElementById('main-preview');
  const infoDate = document.getElementById('info-date');
  const infoUrl = document.getElementById('info-url');
  const toast = document.getElementById('toast');

  // 현재 선택된 스크린샷 객체
  let currentScreenshot = null;

  // --- 초기화 ---
  loadScreenshots();

  // --- 이벤트 리스너: 캡처 버튼 ---
  captureBtn.addEventListener('click', async () => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];

      if (!activeTab) {
        alert('활성화된 탭을 찾을 수 없습니다.');
        return;
      }

      // 1. 탭 캡처 (captureVisibleTab)
      const dataUrl = await chrome.tabs.captureVisibleTab(null, { format: 'png' });
      
      // 용량 체크 (약 5MB 제한)
      if (dataUrl.length > 5 * 1024 * 1024 * 1.37) { // Base64 encoding increases size by ~37%
        alert('이미지 용량이 너무 큽니다 (5MB 초과).');
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

      // 2. 데이터 저장
      saveScreenshot(newScreenshot);

    } catch (error) {
      console.error('캡처 실패:', error);
      alert('스크린샷을 찍는 중 오류가 발생했습니다.\n' + error.message);
    }
  });

  // --- 이벤트 리스너: 키보드 단축키 (복사) ---
  document.addEventListener('keydown', (e) => {
    // Cmd+C 또는 Ctrl+C 감지
    if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
      if (currentScreenshot && !previewSection.classList.contains('hidden')) {
        e.preventDefault(); // 기본 복사 방지
        copyToClipboard(currentScreenshot.dataUrl);
      }
    }
  });

  // --- 기능: 스크린샷 저장 ---
  function saveScreenshot(screenshot) {
    chrome.storage.local.get(['screenshots'], (result) => {
      let screenshots = result.screenshots || [];
      
      // 최신 순으로 앞에 추가
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
        selectScreenshot(screenshot); // 저장 후 바로 선택 및 미리보기
      });
    });
  }

  // --- 기능: 불러오기 ---
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

  // --- 기능: 그리드 렌더링 ---
  function renderGrid(screenshots) {
    thumbnailGrid.innerHTML = ''; // 기존 그리드 초기화

    if (screenshots.length === 0) {
      showEmptyState();
      return;
    }

    emptyState.classList.add('hidden');
    previewSection.classList.remove('hidden');

    screenshots.forEach(item => {
      const thumbDiv = document.createElement('div');
      thumbDiv.className = 'thumbnail-item';
      thumbDiv.dataset.id = item.id;
      
      // 이미지 요소
      const img = document.createElement('img');
      img.src = item.dataUrl;
      img.alt = item.title;
      
      // 시간 표시 요소
      const timeDiv = document.createElement('div');
      timeDiv.className = 'time-overlay';
      timeDiv.textContent = formatTimeSimple(item.timestamp);

      thumbDiv.appendChild(img);
      thumbDiv.appendChild(timeDiv);

      // 클릭 시 선택 이벤트
      thumbDiv.addEventListener('click', () => {
        selectScreenshot(item);
      });

      thumbnailGrid.appendChild(thumbDiv);
    });
  }

  // --- 기능: 스크린샷 선택 및 미리보기 업데이트 ---
  function selectScreenshot(item) {
    currentScreenshot = item;

    // 미리보기 이미지 업데이트
    mainPreview.src = item.dataUrl;
    
    // 정보 업데이트 (날짜/시간, URL)
    infoDate.textContent = formatDateTimeFull(item.timestamp);
    infoUrl.textContent = item.url;
    infoUrl.href = item.url;

    // 미리보기 영역 보이기
    previewSection.classList.remove('hidden');
    emptyState.classList.add('hidden');

    // 썸네일 선택 스타일 적용
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
    emptyState.classList.remove('hidden');
    currentScreenshot = null;
  }

  // --- 기능: 클립보드 복사 ---
  async function copyToClipboard(dataUrl) {
    try {
      // DataURL을 Blob으로 변환
      const blob = await (await fetch(dataUrl)).blob();
      
      // ClipboardItem 생성
      const item = new ClipboardItem({ [blob.type]: blob });
      
      // 클립보드에 쓰기
      await navigator.clipboard.write([item]);
      
      showToast();
    } catch (err) {
      console.error('복사 실패:', err);
      alert('클립보드 복사에 실패했습니다.');
    }
  }

  // --- 유틸리티: 토스트 메시지 표시 ---
  function showToast() {
    toast.classList.remove('hidden');
    // CSS 애니메이션이 끝난 후 클래스 제거를 위해 setTimeout 사용 (애니메이션 시간과 일치)
    setTimeout(() => {
      toast.classList.add('hidden');
    }, 1500);
  }

  // --- 유틸리티: 시간 포맷 (썸네일용: 오후 3:30) ---
  function formatTimeSimple(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('ko-KR', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  }

  // --- 유틸리티: 날짜 포맷 (상세 정보용: 10월 27일 오후 3:45) ---
  function formatDateTimeFull(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    
    const isToday = date.getDate() === now.getDate() &&
                    date.getMonth() === now.getMonth() &&
                    date.getFullYear() === now.getFullYear();

    const timeStr = date.toLocaleTimeString('ko-KR', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });

    if (isToday) {
      return `오늘 ${timeStr}`;
    } else {
      const dateStr = date.toLocaleDateString('ko-KR', {
        month: 'long',
        day: 'numeric'
      });
      return `${dateStr} ${timeStr}`;
    }
  }
});