// ui-handlers.js에서 필요한 UI 관련 함수들을 import
import { initializeGame as uiInitializeGame, showMessageBox, hideCompoundCardModal } from './ui-handlers.js';

// constants.js에서 필요한 상수들을 import
import { MIN_PLAYERS, MAX_PLAYERS, CARD_TYPES, COMPOUND_CARDS_RAW_DATA } from './constants.js';

// game-state.js에서 덱 변수를 직접 업데이트하기 위해 import (또는 함수를 통해 전달)
// ES6 모듈에서는 let으로 export된 변수를 직접 수정하는 것은 권장되지 않으므로,
// game-state.js에 덱을 설정하는 함수를 만들고 그것을 호출하는 것이 더 좋습니다.
// 예: import { setDecks } from './game-state.js';
// 여기서는 game-state.js의 basicDeck, advancedDeck이 export let으로 선언되어
// 외부에서 직접 수정 가능하다고 가정하고 진행합니다. (game-state.js 수정 필요)
import { setDecks } from './game-state.js';


// DOM이 로드된 후 초기화
document.addEventListener('DOMContentLoaded', () => {
    initApp();

    // 규칙서 보기 버튼 이벤트
    const rulesBtn = document.getElementById('rules-btn');
    if (rulesBtn) {
        rulesBtn.addEventListener('click', showRules);
    }

    // 게임 재시작 버튼 이벤트
    const resetBtn = document.getElementById('reset-btn');
    if (resetBtn) {
        resetBtn.addEventListener('click', () => {
            window.location.reload();
        });
    }

    // 화합물 카드 모달 닫기 버튼 이벤트
    const closeCompoundCardBtn = document.getElementById('close-compound-card-modal-btn');
    if (closeCompoundCardBtn) {
        closeCompoundCardBtn.addEventListener('click', hideCompoundCardModal); // ui-handlers.js에서 export된 함수 사용
    }

    // 플레이어 선택 버튼 이벤트 설정
    const playerSetupEl = document.getElementById('player-setup');
    if (playerSetupEl) {
        playerSetupEl.addEventListener('click', (event) => {
            if (event.target.classList.contains('player-count-btn')) {
                const playerCount = parseInt(event.target.dataset.count);
                if (!isNaN(playerCount) && playerCount >= MIN_PLAYERS && playerCount <= MAX_PLAYERS) {
                    if (typeof uiInitializeGame === 'function') {
                        uiInitializeGame(playerCount); // ui-handlers.js에서 export된 함수 사용
                    } else {
                        console.error('uiInitializeGame is not defined. Make sure it is imported from ui-handlers.js');
                    }
                }
            }
        });
    }

    // 화합물 카드 데이터 파싱 및 덱 설정
    const { parsedBasic, parsedAdvanced } = parseCompoundCardsData();
    // game-state.js의 덱을 직접 업데이트 (더 나은 방법은 game-state.js에 setter 함수를 만드는 것)
    // basicDeck.length = 0; // 기존 내용 비우기
    // advancedDeck.length = 0;
    // basicDeck.push(...shuffleArray(parsedBasic));
    // advancedDeck.push(...shuffleArray(parsedAdvanced));
    // console.log(`파싱 및 덱 설정 완료: 기본 카드 ${basicDeck.length}장, 고급 카드 ${advancedDeck.length}장`);
    setDecks(shuffleArray(parsedBasic), shuffleArray(parsedAdvanced));

});

// 애플리케이션 초기화
function initApp() {
    showPlayerSelection();
    // setupInitialListeners(); // ui-handlers.js에서 이미 DOMContentLoaded 시 처리하므로 중복 X
}

// 플레이어 선택 화면 표시
function showPlayerSelection() {
    const gameboardEl = document.getElementById('gameboard');
    const playerSetupEl = document.getElementById('player-setup');

    if (gameboardEl) gameboardEl.classList.add('hidden');
    if (playerSetupEl) playerSetupEl.classList.remove('hidden');
    else console.error('Player setup element not found in HTML.');
}

// 규칙 다이얼로그 표시
function showRules() {
    if (typeof showMessageBox === 'function') { // ui-handlers.js에서 export된 함수 사용
        const rulesHTML = `
            <div class="text-lg font-bold mb-4 text-indigo-700">멘델레예프 다이스 - 게임 규칙 (v2.4)</div>
            <div class="space-y-3 text-sm text-gray-700">
                <div>
                    <div class="font-semibold text-indigo-600 mb-1">게임 목표</div>
                    <p>주사위를 굴려 원소를 생산하고, 생산한 원소들로 화합물 카드를 구매하여 가장 먼저 <strong>${WINNING_SCORE}점</strong>을 달성하는 플레이어가 승리합니다.</p>
                </div>
                <div>
                    <div class="font-semibold text-indigo-600 mb-1">게임 단계</div>
                    <ol class="list-decimal ml-5 space-y-1">
                        <li><strong>생산 단계</strong>: 모든 플레이어가 동시에 자신의 주사위를 굴립니다. 각 플레이어는 자신의 차례에 주사위 눈금을 조합 (단일, 덧셈, 뺄셈, 곱셈*, 나눗셈*, 자리붙이기*)하여 원자번호를 만들고, 주기율표에 자신의 큐브를 놓아 원소를 점유합니다. 이미 다른 플레이어가 점유한 원소는 점유할 수 없으며, 자신의 첫 큐브가 아니라면 이미 놓인 자신의 큐브와 인접한 곳에만 놓을 수 있습니다. (기술 카드*: 곱셈/나눗셈, 자리붙이기)</li>
                        <li><strong>판매 단계</strong>: 모든 플레이어가 생산을 마치면, 시작 플레이어부터 차례대로 화합물 카드를 구매하거나 턴을 넘길 수 있습니다. 자신이 점유한 원소들로 카드에 필요한 원소를 모두 충족하면 해당 카드를 구매하고 점수를 얻습니다. 시장의 카드는 즉시 보충됩니다. 모든 플레이어가 판매 단계를 마치면 한 라운드가 종료됩니다.</li>
                    </ol>
                </div>
                <div>
                    <div class="font-semibold text-indigo-600 mb-1">점수 및 기술</div>
                     <ul class="list-disc ml-5 space-y-1">
                        <li>특정 점수(10, 20, 30, 40점) 도달 시 보상으로 새 주사위 또는 기술 카드를 얻습니다.</li>
                        <li><strong>기술 카드 종류:</strong>
                            <ul class="list-circle ml-5 text-xs">
                                <li>배수/나눗셈: 곱셈(×) 또는 나눗셈(÷) 연산 사용 가능.</li>
                                <li>자리붙이기: 두 주사위 눈금을 이어 두 자릿수 생성 (예: 2와 5 → 25).</li>
                                <li>슬라이드: 원소 배치 후, 자신의 큐브 중 하나를 인접한 빈칸으로 이동.</li>
                                <li>외주 생산: 카드 구매 시 필요한 원소 1개를 자신이 점유하지 않아도 되는 것으로 간주 (라운드당 1회).</li>
                            </ul>
                        </li>
                    </ul>
                </div>
                <div>
                    <div class="font-semibold text-indigo-600 mb-1">게임 종료 및 승리</div>
                    <p>한 플레이어가 ${WINNING_SCORE}점 이상을 달성하면, 현재 진행 중인 판매 단계까지 모두 완료한 후 게임이 종료됩니다. 최종 점수는 (획득한 카드 점수 합계) + (판매한 카드에 포함된 고유한 원소 <strong>분류</strong>의 수)로 계산합니다. 가장 높은 최종 점수를 얻은 플레이어가 승리합니다. 동점 시, 고급 카드 수가 많은 플레이어, 그래도 동점이면 남은 주사위 수가 많은 플레이어가 승리합니다.</p>
                </div>
            </div>
        `;
        showMessageBox(rulesHTML, true); // isHtml = true 로 전달
    } else {
        alert("규칙 보기 기능이 현재 비활성화되어 있습니다.");
    }
}

// 화합물 카드 데이터 파싱 함수
function parseCompoundCardsData() {
    if (typeof COMPOUND_CARDS_RAW_DATA === 'undefined') {
        console.error('COMPOUND_CARDS_RAW_DATA is not defined or imported from constants.js');
        return { parsedBasic: [], parsedAdvanced: [] }; // 빈 배열 반환
    }

    const rows = COMPOUND_CARDS_RAW_DATA.trim().split('\n');
    if (rows.length <= 1) { // 헤더만 있거나 데이터가 없는 경우
        console.warn('COMPOUND_CARDS_RAW_DATA is empty or contains only header.');
        return { parsedBasic: [], parsedAdvanced: [] };
    }
    const header = rows[0].split('\t'); // 헤더는 현재 사용 안함
    const dataRows = rows.slice(1);

    let parsedBasic = [];
    let parsedAdvanced = [];

    dataRows.forEach((row, rowIndex) => {
        const columns = row.split('\t');
        const getColumnData = (index, defaultValue = '') => (columns[index] || defaultValue).trim();

        const points = parseInt(getColumnData(0, '0')) || 0;
        const cardName = getColumnData(1, `무명 카드 ${rowIndex + 1}`);
        const description = getColumnData(17);
        const cardTypeString = getColumnData(18, '일반');

        const requiredElements = [];
        const elementIndices = [2, 5, 8, 11, 14]; // 원소 번호가 있는 열 인덱스
        elementIndices.forEach(index => {
            const elementNumStr = getColumnData(index);
            if (elementNumStr) {
                const elementNum = parseInt(elementNumStr);
                if (!isNaN(elementNum) && elementNum > 0) { // 유효한 원소 번호인지 확인
                    requiredElements.push(elementNum);
                }
            }
        });

        // 화학식은 카드 이름에서 괄호 안 내용으로 추출 (예: "물(H2O)")
        const formulaMatch = cardName.match(/\(([^)]+)\)/);
        const formula = formulaMatch ? formulaMatch[1] : '';
        // 카드 이름에서 화학식 부분 제거 (선택적)
        // const cleanCardName = cardName.replace(/\s*\(([^)]+)\)\s*$/, "").trim();

        const card = {
            id: `${cardName.replace(/[^a-zA-Z0-9가-힣]/g, "_")}_${points}_${rowIndex}`,
            name: cardName, // 또는 cleanCardName
            formula: formula,
            points: points,
            requiredElements: requiredElements,
            description: description,
            type: cardTypeString.toLowerCase() === '고급' ? CARD_TYPES.ADVANCED : CARD_TYPES.BASIC,
            // category는 game-state.js의 calculateFinalScores에서 requiredElements의 type으로 계산하므로 여기서 불필요
        };

        if (card.type === CARD_TYPES.ADVANCED) {
            parsedAdvanced.push(card);
        } else {
            parsedBasic.push(card);
        }
    });

    return { parsedBasic, parsedAdvanced }; // 파싱된 덱 반환
}

// 배열 섞기 유틸리티 함수 (프로젝트 내 한 곳에만 정의하는 것이 좋음)
function shuffleArray(array) {
    if (!array || !Array.isArray(array) || array.length === 0) return []; // 방어 코드 강화
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// export { shuffleArray }; // 다른 모듈에서 사용하려면 export