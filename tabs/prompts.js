// 프롬프트 탭 기능 구현
document.addEventListener('DOMContentLoaded', () => {
  // --- DOM 요소 참조 ---
  const promptInput = document.getElementById('prompt-input');
  const saveBtn = document.getElementById('save-prompt-btn');
  const promptList = document.getElementById('prompt-list');
  const promptCount = document.getElementById('prompt-count');

  // --- 초기화 ---
  loadPrompts();

  // --- 이벤트: 입력값 감지 (버튼 활성화) ---
  promptInput.addEventListener('input', () => {
    const text = promptInput.value.trim();
    saveBtn.disabled = text.length === 0;
  });

  // --- 이벤트: 저장 버튼 클릭 ---
  saveBtn.addEventListener('click', () => {
    const text = promptInput.value.trim();
    if (!text) return;

    const timestamp = Date.now();
    const newPrompt = {
      id: timestamp,
      text: text,
      timestamp: timestamp,
      createdAt: new Date().toISOString()
    };

    savePrompt(newPrompt);
  });

  // --- 함수: 프롬프트 저장 ---
  function savePrompt(prompt) {
    chrome.storage.local.get(['prompts'], (result) => {
      let prompts = result.prompts || [];
      
      // 최신순 추가 (FIFO)
      prompts.unshift(prompt);

      // 최대 100개 제한
      if (prompts.length > 100) {
        prompts = prompts.slice(0, 100);
      }

      chrome.storage.local.set({ prompts: prompts }, () => {
        if (chrome.runtime.lastError) {
          alert('저장 실패: ' + chrome.runtime.lastError.message);
          return;
        }

        // 성공 시 입력창 초기화
        promptInput.value = '';
        saveBtn.disabled = true;
        
        // 리스트 갱신
        renderPrompts(prompts);
      });
    });
  }

  // --- 함수: 불러오기 ---
  function loadPrompts() {
    chrome.storage.local.get(['prompts'], (result) => {
      const prompts = result.prompts || [];
      renderPrompts(prompts);
    });
  }

  // --- 함수: 리스트 렌더링 ---
  function renderPrompts(prompts) {
    promptList.innerHTML = '';
    promptCount.textContent = `${prompts.length}/100`;

    if (prompts.length === 0) {
      promptList.innerHTML = '<div class="empty-state">저장된 프롬프트가 없습니다.</div>';
      return;
    }

    prompts.forEach(item => {
      const el = createPromptElement(item);
      promptList.appendChild(el);
    });
  }

  // --- 함수: 개별 아이템 DOM 생성 ---
  function createPromptElement(item) {
    const div = document.createElement('div');
    div.className = 'prompt-item';
    
    // 날짜 포맷팅
    const dateStr = formatPromptDate(item.timestamp);

    div.innerHTML = `
      <div class="prompt-date">${dateStr}</div>
      <div class="prompt-text" title="전체 보기">${escapeHtml(item.text)}</div>
      <div class="prompt-actions">
        <button class="action-btn copy-btn">📋 복사</button>
        <button class="action-btn delete-btn">🗑️ 삭제</button>
      </div>
    `;

    // 텍스트 클릭 시 확장/축소 및 전체 복사
    const textEl = div.querySelector('.prompt-text');
    textEl.addEventListener('click', () => {
      textEl.classList.toggle('expanded');
    });

    // 복사 버튼 이벤트
    const copyBtn = div.querySelector('.copy-btn');
    copyBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(item.text);
        
        // 버튼 피드백
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✓ 복사됨';
        copyBtn.classList.add('success');
        
        setTimeout(() => {
          copyBtn.textContent = originalText;
          copyBtn.classList.remove('success');
        }, 1500);
      } catch (err) {
        console.error('복사 실패', err);
      }
    });

    // 삭제 버튼 이벤트
    const deleteBtn = div.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deletePrompt(item.id);
    });

    return div;
  }

  // --- 함수: 삭제 ---
  function deletePrompt(id) {
    chrome.storage.local.get(['prompts'], (result) => {
      let prompts = result.prompts || [];
      
      const initialLength = prompts.length;
      prompts = prompts.filter(p => p.id !== id);

      if (prompts.length === initialLength) return; // 삭제된 게 없으면 중단

      chrome.storage.local.set({ prompts: prompts }, () => {
        renderPrompts(prompts);
      });
    });
  }

  // --- 유틸리티: HTML 이스케이프 (XSS 방지) ---
  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // --- 유틸리티: 날짜 포맷 ---
  function formatPromptDate(timestamp) {
    const date = new Date(timestamp);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();

    // 어제 날짜 계산
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const timeStr = date.toLocaleTimeString('ko-KR', { 
      hour: 'numeric', minute: '2-digit', hour12: true 
    });

    if (isToday) return `오늘 ${timeStr}`;
    if (isYesterday) return `어제 ${timeStr}`;
    
    return `${date.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })} ${timeStr}`;
  }
});
