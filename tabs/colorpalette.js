/**
 * Color Palette (색상 추천) 모듈
 * 
 * 기능:
 * 1. 10개 기본 색상 팔레트 표시
 * 2. 선택한 색상 기반으로 15개 추천 색상 생성
 *    - 명도(Lightness) 변형 5개
 *    - 채도(Saturation) 변형 5개
 *    - 조합(Harmonious) 추천 5개
 * 3. 클릭 시 HEX 코드 클립보드 복사
 */

// ============================================
// 기본 색상 팔레트 (10개)
// ============================================
const BASE_COLORS = [
  { hex: '#EF4444', name: 'Red' },
  { hex: '#F97316', name: 'Orange' },
  { hex: '#EAB308', name: 'Yellow' },
  { hex: '#22C55E', name: 'Green' },
  { hex: '#14B8A6', name: 'Teal' },
  { hex: '#3B82F6', name: 'Blue' },
  { hex: '#6366F1', name: 'Indigo' },
  { hex: '#A855F7', name: 'Purple' },
  { hex: '#EC4899', name: 'Pink' },
  { hex: '#6B7280', name: 'Gray' }
];

// ============================================
// 색상 변환 유틸리티 함수
// ============================================

/**
 * HEX 색상을 HSL로 변환
 * @param {string} hex - HEX 색상 코드 (예: '#FF5733')
 * @returns {object} { h: 0-360, s: 0-100, l: 0-100 }
 */
function hexToHsl(hex) {
  // HEX를 RGB로 변환
  let r = parseInt(hex.slice(1, 3), 16) / 255;
  let g = parseInt(hex.slice(3, 5), 16) / 255;
  let b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h, s, l = (max + min) / 2;

  if (max === min) {
    h = s = 0; // 무채색
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      case b:
        h = ((r - g) / d + 4) / 6;
        break;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100)
  };
}

/**
 * HSL을 HEX 색상으로 변환
 * @param {number} h - Hue (0-360)
 * @param {number} s - Saturation (0-100)
 * @param {number} l - Lightness (0-100)
 * @returns {string} HEX 색상 코드
 */
function hslToHex(h, s, l) {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m = l - c / 2;

  let r, g, b;

  if (h >= 0 && h < 60) {
    [r, g, b] = [c, x, 0];
  } else if (h >= 60 && h < 120) {
    [r, g, b] = [x, c, 0];
  } else if (h >= 120 && h < 180) {
    [r, g, b] = [0, c, x];
  } else if (h >= 180 && h < 240) {
    [r, g, b] = [0, x, c];
  } else if (h >= 240 && h < 300) {
    [r, g, b] = [x, 0, c];
  } else {
    [r, g, b] = [c, 0, x];
  }

  r = Math.round((r + m) * 255);
  g = Math.round((g + m) * 255);
  b = Math.round((b + m) * 255);

  return `#${r.toString(16).padStart(2, '0').toUpperCase()}${g.toString(16).padStart(2, '0').toUpperCase()}${b.toString(16).padStart(2, '0').toUpperCase()}`;
}

// ============================================
// 색상 생성 알고리즘
// ============================================

/**
 * 명도(Lightness) 변형 색상 생성 (5개)
 * L값을 20%, 35%, 50%, 65%, 80%로 설정
 * @param {string} baseHex - 기준 HEX 색상
 * @returns {Array} 변형된 색상 배열
 */
function generateLightnessVariations(baseHex) {
  const { h, s } = hexToHsl(baseHex);
  const lightnessLevels = [20, 35, 50, 65, 80];

  return lightnessLevels.map(l => ({
    hex: hslToHex(h, s, l),
    label: `L: ${l}%`
  }));
}

/**
 * 채도(Saturation) 변형 색상 생성 (5개)
 * S값을 20%, 40%, 60%, 80%, 100%로 설정
 * @param {string} baseHex - 기준 HEX 색상
 * @returns {Array} 변형된 색상 배열
 */
function generateSaturationVariations(baseHex) {
  const { h, l } = hexToHsl(baseHex);
  const saturationLevels = [20, 40, 60, 80, 100];

  return saturationLevels.map(s => ({
    hex: hslToHex(h, s, l),
    label: `S: ${s}%`
  }));
}

/**
 * 조합(Harmonious) 추천 색상 생성 (10개)
 * 기준 색상에서 변형된 HSL 오프셋을 10개 기본 색상에 동일하게 적용
 * @param {object} offsets - { h, s, l } HSL 오프셋 값
 * @param {string} selectedBaseHex - 현재 선택된 기본 색상 (제외용)
 * @returns {Array} 변형된 10색 팔레트 배열
 */
function generateHarmoniousColors(offsets, selectedBaseHex) {
  return BASE_COLORS
    .filter(color => color.hex !== selectedBaseHex) // 선택된 색상 제외
    .map(color => {
      const { h, s, l } = hexToHsl(color.hex);

      // 동일한 오프셋 적용
      let newH = (h + offsets.h) % 360;
      if (newH < 0) newH += 360;

      let newS = Math.max(10, Math.min(100, s + offsets.s));
      let newL = Math.max(20, Math.min(80, l + offsets.l));

      return {
        hex: hslToHex(Math.round(newH), Math.round(newS), Math.round(newL)),
        label: color.name
      };
    });
}

// ============================================
// UI 렌더링 함수
// ============================================

/**
 * 기본 팔레트 렌더링
 */
function renderBasePalette() {
  const container = document.getElementById('base-palette-grid');
  if (!container) return;

  container.innerHTML = '';

  BASE_COLORS.forEach(color => {
    const chip = createColorChip(color.hex, color.name, true);
    container.appendChild(chip);
  });
}

/**
 * 색상 칩 요소 생성
 * @param {string} hex - HEX 색상 코드
 * @param {string} label - 라벨 (이름 또는 설명)
 * @param {boolean} isBase - 기본 팔레트 여부
 * @returns {HTMLElement} 색상 칩 요소
 */
function createColorChip(hex, label, isBase = false) {
  const chip = document.createElement('div');
  chip.className = `color-chip ${isBase ? 'base-chip' : 'recommendation-chip'}`;
  chip.style.backgroundColor = hex;

  // 밝은 색상인지 확인하여 텍스트 색상 결정
  const { l } = hexToHsl(hex);
  const textColor = l > 55 ? '#1f2937' : '#ffffff';

  chip.innerHTML = `
    <span class="color-hex" style="color: ${textColor}">${hex}</span>
    <span class="color-label" style="color: ${textColor}">${label}</span>
  `;

  // 클릭 이벤트: 기본 팔레트는 추천 생성, 추천 색상은 복사
  if (isBase) {
    chip.addEventListener('click', () => {
      selectBaseColor(hex);
    });
  } else {
    chip.addEventListener('click', () => {
      copyToClipboard(hex);
    });
  }

  return chip;
}

/**
 * 랜덤 범위 내 값 생성
 * @param {number} min - 최소값
 * @param {number} max - 최대값
 * @returns {number} 랜덤 값
 */
function randomInRange(min, max) {
  return Math.random() * (max - min) + min;
}

/**
 * 기본 색상에서 랜덤 변형 생성
 * H, S, L 각각에 랜덤 오프셋을 적용하여 새로운 색상 생성
 * @param {string} baseHex - 기본 HEX 색상
 * @returns {object} { hex: 변형 색상, description: 변형 설명, offsets: {h, s, l} }
 */
function generateRandomVariant(baseHex) {
  const { h, s, l } = hexToHsl(baseHex);

  // 랜덤 오프셋 적용
  // H: ±30도 범위
  // S: ±20% 범위 (0-100 유지)
  // L: ±15% 범위 (20-80 유지)
  const hOffset = randomInRange(-30, 30);
  const sOffset = randomInRange(-20, 20);
  const lOffset = randomInRange(-15, 15);

  let newH = (h + hOffset) % 360;
  if (newH < 0) newH += 360;

  let newS = Math.max(10, Math.min(100, s + sOffset));
  let newL = Math.max(20, Math.min(80, l + lOffset));

  const variantHex = hslToHex(Math.round(newH), Math.round(newS), Math.round(newL));

  // 변형 설명 생성
  const hDir = hOffset >= 0 ? '+' : '';
  const sDir = sOffset >= 0 ? '+' : '';
  const lDir = lOffset >= 0 ? '+' : '';

  const description = `H${hDir}${Math.round(hOffset)}° S${sDir}${Math.round(sOffset)}% L${lDir}${Math.round(lOffset)}%`;

  return {
    hex: variantHex,
    description: description,
    originalHex: baseHex,
    // HSL 오프셋 저장 (조합 추천에서 재사용)
    offsets: {
      h: hOffset,
      s: sOffset,
      l: lOffset
    }
  };
}

/**
 * 기본 색상 선택 시 랜덤 변형 생성 후 추천 색상 표시
 * @param {string} baseHex - 선택된 기준 색상
 */
function selectBaseColor(baseHex) {
  // 랜덤 변형 생성
  const variant = generateRandomVariant(baseHex);

  // 선택된 색상 표시 (원본 → 변형)
  const selectedDisplay = document.getElementById('selected-color-display');
  if (selectedDisplay) {
    selectedDisplay.classList.remove('hidden');
    selectedDisplay.style.background = `linear-gradient(90deg, ${baseHex} 0%, ${baseHex} 45%, ${variant.hex} 55%, ${variant.hex} 100%)`;

    // 텍스트 업데이트
    const { l: variantL } = hexToHsl(variant.hex);
    const textColor = variantL > 55 ? '#1f2937' : '#ffffff';

    const hexDisplay = selectedDisplay.querySelector('.selected-hex');
    if (hexDisplay) {
      hexDisplay.innerHTML = `
        <span class="original-color">${baseHex}</span>
        <span class="arrow">→</span>
        <span class="variant-color">${variant.hex}</span>
      `;
      hexDisplay.style.color = textColor;
    }

    // 변형 설명 표시
    let descEl = selectedDisplay.querySelector('.variant-description');
    if (!descEl) {
      descEl = document.createElement('span');
      descEl.className = 'variant-description';
      selectedDisplay.appendChild(descEl);
    }
    descEl.textContent = variant.description;
    descEl.style.color = textColor;
  }

  // 기존 선택 해제 및 새 선택 표시
  document.querySelectorAll('.base-chip').forEach(chip => {
    chip.classList.remove('selected');
  });
  event.currentTarget.classList.add('selected');

  // 변형 색상 기반으로 추천 색상 생성 및 렌더링
  // variant.offsets와 baseHex를 전달하여 조합 추천에서 사용
  renderRecommendations(variant.hex, variant.offsets, baseHex);

  // 추천 섹션 표시 (애니메이션과 함께)
  const recommendationSection = document.getElementById('recommendation-section');
  if (recommendationSection) {
    recommendationSection.classList.remove('hidden');
    recommendationSection.classList.add('show');
  }
}

/**
 * 추천 색상 렌더링
 * @param {string} variantHex - 변형된 기준 색상
 * @param {object} offsets - HSL 오프셋 { h, s, l }
 * @param {string} selectedBaseHex - 선택된 기본 색상
 */
function renderRecommendations(variantHex, offsets, selectedBaseHex) {
  // 명도 변형
  const lightnessGrid = document.getElementById('lightness-grid');
  if (lightnessGrid) {
    lightnessGrid.innerHTML = '';
    generateLightnessVariations(variantHex).forEach(color => {
      lightnessGrid.appendChild(createColorChip(color.hex, color.label, false));
    });
  }

  // 채도 변형
  const saturationGrid = document.getElementById('saturation-grid');
  if (saturationGrid) {
    saturationGrid.innerHTML = '';
    generateSaturationVariations(variantHex).forEach(color => {
      saturationGrid.appendChild(createColorChip(color.hex, color.label, false));
    });
  }

  // 조합 추천 - 동일한 오프셋을 10개 기본 색상에 적용
  const harmoniousGrid = document.getElementById('harmonious-grid');
  if (harmoniousGrid) {
    harmoniousGrid.innerHTML = '';
    generateHarmoniousColors(offsets, selectedBaseHex).forEach(color => {
      harmoniousGrid.appendChild(createColorChip(color.hex, color.label, false));
    });
  }
}

/**
 * 클립보드에 복사 및 토스트 알림
 * @param {string} text - 복사할 텍스트
 */
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast(`${text} 복사됨!`);
  }).catch(err => {
    console.error('클립보드 복사 실패:', err);
  });
}

/**
 * 토스트 알림 표시
 * @param {string} message - 표시할 메시지
 */
function showToast(message) {
  // 기존 토스트 제거
  const existingToast = document.getElementById('toast');
  if (existingToast) {
    existingToast.remove();
  }

  // 새 토스트 생성
  const toast = document.createElement('div');
  toast.id = 'toast';
  toast.className = 'toast';
  toast.textContent = message;
  document.body.appendChild(toast);

  // 애니메이션 후 제거
  setTimeout(() => {
    toast.remove();
  }, 1500);
}

// ============================================
// 초기화
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  // 팝업이 열릴 때 기본 팔레트 렌더링
  renderBasePalette();
});
