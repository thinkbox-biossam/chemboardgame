// constants.js에서 필요한 상수들을 import
import {
    MAX_CUBES, DICE_TYPES, SKILL_CARDS, PERIODIC_TABLE_DATA, CARD_TYPES, ELEMENT_TYPE_KEYS, OPERATIONS
} from './constants.js';

// game-state.js에서 필요한 게임 상태 변수 및 함수들을 import
import {
    gamePhase, players, currentPlayerIndex, marketCards, basicDeck, advancedDeck,
    currentCalculatedValue, selectedDice, periodicTableState,
    initGameSetup as gsInitGameSetup, // 이름 충돌 방지
    toggleDieSelection as gsToggleDieSelection,
    changeOperation as gsChangeOperation,
    occupyElement as gsOccupyElement,
    sellCard as gsSellCard,
    canSellCard as gsCanSellCard,
    startSellingPhase as gsStartSellingPhase,
    skipSellingTurn as gsSkipSellingTurn,
    rollSingleDie as gsRollSingleDie, // 주사위 굴리기 로직
    acquireNewDie, // 새 주사위 획득 함수
    acquireSkill, // 새 기술 획득 함수
    hasSkill, // 기술 보유 확인 함수
    selectedOperation as gsSelectedOperation // 현재 선택된 연산
} from './game-state.js';

// DOM 요소 캐싱 (기존과 동일)
const periodicTableEl = document.getElementById('periodic-table');
const playerSetupEl = document.getElementById('player-setup');
const gameboardEl = document.getElementById('gameboard');
// ... (다른 DOM 요소 캐싱 계속) ...
const basicDeckAreaEl = document.getElementById('basic-deck-area');
const advancedDeckAreaEl = document.getElementById('advanced-deck-area');
const basicMarketCardsEl = document.getElementById('basic-market-cards');
const advancedMarketCardsEl = document.getElementById('advanced-market-cards');
const gameMessageEl = document.getElementById('game-message');
const playerContainersEl = document.getElementById('player-containers');
const diceOperationsEl = document.getElementById('dice-operations');
const compoundCardModalEl = document.getElementById('compound-card-modal');
const messageBoxOverlay = document.getElementById('message-box-overlay');
const messageBoxEl = document.getElementById('message-box-container');
const messageBoxText = document.getElementById('message-box-text');
const messageBoxOkBtn = document.getElementById('message-box-ok');

// 모달 요소 캐싱
const diceSelectionModalEl = document.getElementById('dice-selection-modal');
const skillSelectionModalEl = document.getElementById('skill-selection-modal');


let playerUIElements = {}; // 플레이어별 UI 요소 캐시

// 게임 초기화 (main.js에서 호출됨)
export function initializeGame(playerCount) {
    if (typeof gsInitGameSetup !== 'function') {
        console.error("치명적 오류: gsInitGameSetup 함수가 game-state.js에서 import되지 않았거나 정의되지 않았습니다.");
        alert("게임 초기화 오류! 콘솔을 확인하세요.");
        return;
    }
    gsInitGameSetup(playerCount);

    if (playerSetupEl) playerSetupEl.classList.add('hidden');
    if (gameboardEl) gameboardEl.classList.remove('hidden');

    createPlayerUIElements(playerCount);
    createPeriodicTable();
    renderMarketAndDecks();
    updateGameInfoDisplay();
    setupOperationListeners(); // 게임 시작 후 연산 버튼 리스너 설정

    showGameMessage('게임이 시작되었습니다! 생산 단계입니다.');
    console.log('ui-handlers.js: 게임이 초기화되었습니다. 플레이어 수:', playerCount);
}

function createPlayerUIElements(playerCount) {
    if (!playerContainersEl) {
        console.error("플레이어 컨테이너 요소를 찾을 수 없습니다!");
        return;
    }
    playerContainersEl.innerHTML = '';
    playerUIElements = {};

    for (let i = 0; i < playerCount; i++) {
        const player = players[i];
        const playerEl = document.createElement('div');
        playerEl.className = 'player-card bg-white rounded-lg shadow-md p-3 mb-3';
        playerEl.id = `player-${i}`;
        playerEl.style.borderLeft = `5px solid ${player.color}`;

        playerEl.innerHTML = `
            <div class="player-header flex justify-between items-center mb-2">
                <h3 class="text-md font-semibold text-gray-700">플레이어 ${i + 1}</h3>
                <div class="player-score text-sm">점수: <span class="score-value font-bold text-indigo-600">0</span></div>
            </div>
            <div class="dice-container flex flex-wrap gap-1.5 mb-2"></div>
            <div class="flex items-center text-xs text-gray-600 mb-2">
                <div class="cubes-container flex gap-0.5 mr-2"></div>
                큐브: <span class="cubes-count font-semibold ml-1">${player.cubes}</span>개
            </div>
            <div class="skills-container flex flex-wrap gap-1 mb-2"></div>
            <div class="cards-container mt-1">
                <h4 class="text-xs font-medium text-gray-500 mb-0.5">판매한 카드:</h4>
                <div class="sold-cards flex flex-wrap gap-1"></div>
            </div>
        `;
        playerContainersEl.appendChild(playerEl);
        playerUIElements[i] = {
            container: playerEl,
            score: playerEl.querySelector('.score-value'),
            diceContainer: playerEl.querySelector('.dice-container'),
            cubesContainer: playerEl.querySelector('.cubes-container'),
            cubesCount: playerEl.querySelector('.cubes-count'),
            skillsContainer: playerEl.querySelector('.skills-container'),
            soldCardsContainer: playerEl.querySelector('.sold-cards')
        };
    }
    renderAllPlayers();
}

function renderAllPlayers() {
    if (!players || players.length === 0) return;
    players.forEach((player, i) => { // players 배열 직접 순회
        if (playerUIElements[i]) {
            renderPlayerDice(i);
            renderPlayerCubes(i);
            renderPlayerSkills(i);
            renderPlayerCards(i);
            updatePlayerScore(i);
        }
    });
    highlightCurrentPlayer();
}

function highlightCurrentPlayer() {
    Object.values(playerUIElements).forEach((elements, idx) => {
        if (elements.container) {
            if (idx === currentPlayerIndex) {
                elements.container.classList.add('ring-2', 'ring-indigo-500', 'shadow-xl');
                // 현재 플레이어의 주사위/연산 영역 활성화 표시 (선택적)
                if(diceOperationsEl) diceOperationsEl.style.opacity = '1';
            } else {
                elements.container.classList.remove('ring-2', 'ring-indigo-500', 'shadow-xl');
                // 다른 플레이어의 주사위/연산 영역 비활성화 표시 (선택적)
                // if(diceOperationsEl) diceOperationsEl.style.opacity = '0.5'; // 예시
            }
        }
    });
    // 연산 버튼 상태 업데이트는 현재 플레이어 기준으로 이루어지므로 여기서 호출
    updateOperationButtons();
}

function renderPlayerDice(playerIndex) {
    const player = players[playerIndex];
    const ui = playerUIElements[playerIndex];
    if (!ui || !ui.diceContainer) return;
    ui.diceContainer.innerHTML = '';

    player.dice.forEach((die, dieIndex) => {
        const dieEl = document.createElement('div');
        const diceTypeInfo = DICE_TYPES[die.type] || { color: '#777777', sides: '?', name: die.type };
        dieEl.className = `dice-wrapper relative flex flex-col items-center justify-center w-10 h-12 rounded-md shadow-sm transition-all duration-150`;
        dieEl.style.borderColor = diceTypeInfo.color;
        dieEl.style.borderWidth = '1px';

        const faceEl = document.createElement('div');
        faceEl.className = `dice-face w-8 h-8 flex items-center justify-center font-bold text-lg rounded-sm`;
        faceEl.style.backgroundColor = `${diceTypeInfo.color}20`;
        faceEl.style.color = diceTypeInfo.color;
        faceEl.textContent = die.value;

        const typeEl = document.createElement('div');
        typeEl.className = 'dice-type-label text-[0.6rem] font-medium mt-0.5';
        typeEl.style.color = diceTypeInfo.color;
        typeEl.textContent = diceTypeInfo.name.toUpperCase(); // DICE_TYPES에 name 속성 사용

        dieEl.appendChild(faceEl);
        dieEl.appendChild(typeEl);

        if (die.selected) {
            dieEl.classList.add('ring-2', 'ring-offset-1', 'ring-blue-500', 'scale-110');
            faceEl.classList.add('shadow-inner');
        }
        if (die.locked) {
            dieEl.classList.add('opacity-60', 'cursor-not-allowed');
            faceEl.classList.add('bg-gray-200'); // 잠긴 주사위 배경색
            typeEl.classList.add('text-gray-400'); // 잠긴 주사위 타입 텍스트 색상
        }

        if (gamePhase === 'production' && currentPlayerIndex === playerIndex && !die.locked) {
            dieEl.classList.add('cursor-pointer', 'hover:scale-105', 'hover:shadow-lg');
            dieEl.addEventListener('click', () => handleDieClick(playerIndex, dieIndex));
        }
        ui.diceContainer.appendChild(dieEl);
    });
}

function renderPlayerCubes(playerIndex) {
    const player = players[playerIndex];
    const ui = playerUIElements[playerIndex];
    if (!ui || !ui.cubesContainer || !ui.cubesCount) return;
    ui.cubesContainer.innerHTML = '';
    for (let i = 0; i < MAX_CUBES; i++) {
        const cubeEl = document.createElement('div');
        cubeEl.className = 'w-2.5 h-2.5 rounded-sm'; // Tailwind class
        cubeEl.style.backgroundColor = player.color;
        if (i >= player.cubes) {
            cubeEl.classList.add('opacity-30');
        }
        ui.cubesContainer.appendChild(cubeEl);
    }
    ui.cubesCount.textContent = player.cubes;
}

function renderPlayerSkills(playerIndex) {
    const player = players[playerIndex];
    const ui = playerUIElements[playerIndex];
    if (!ui || !ui.skillsContainer) return;
    ui.skillsContainer.innerHTML = '';
    if (player.skills.length === 0) {
        ui.skillsContainer.innerHTML = '<span class="text-xs text-gray-400 italic">기술 없음</span>';
        return;
    }
    player.skills.forEach(skillId => {
        const skill = Object.values(SKILL_CARDS).find(s => s.id === skillId);
        if (skill) {
            const skillEl = document.createElement('div');
            skillEl.className = 'skill-icon w-6 h-6 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-md'; // Tailwind classes로 대체 가능
            skillEl.style.backgroundColor = player.color; // 플레이어 색상으로 배경
            skillEl.textContent = skill.icon;
            skillEl.title = `${skill.name}: ${skill.description}`;
            ui.skillsContainer.appendChild(skillEl);
        }
    });
}

function renderPlayerCards(playerIndex) {
    const player = players[playerIndex];
    const ui = playerUIElements[playerIndex];
    if (!ui || !ui.soldCardsContainer) return;
    ui.soldCardsContainer.innerHTML = '';
    if (player.soldCards.length === 0) {
        ui.soldCardsContainer.innerHTML = '<span class="text-xs text-gray-400 italic">없음</span>';
        return;
    }
    // 최근 3개의 카드만 간략히 표시
    player.soldCards.slice(-3).forEach(card => {
        const cardEl = document.createElement('div');
        cardEl.className = 'sold-card-preview bg-gray-100 rounded p-1 text-xs text-center w-12 h-16 flex flex-col justify-between items-center shadow-sm';
        cardEl.innerHTML = `<div class="font-semibold line-clamp-2">${card.name.split('(')[0]}</div> <div class="font-bold text-indigo-600">${card.points}점</div>`;
        cardEl.title = `${card.name} (${card.points}점)`;
        ui.soldCardsContainer.appendChild(cardEl);
    });
    if (player.soldCards.length > 3) {
        const moreEl = document.createElement('div');
        moreEl.className = 'text-xs text-gray-500 self-center ml-1';
        moreEl.textContent = `+${player.soldCards.length - 3}`;
        ui.soldCardsContainer.appendChild(moreEl);
    }
}


function updatePlayerScore(playerIndex) {
    const player = players[playerIndex];
    const ui = playerUIElements[playerIndex];
    if (ui && ui.score) {
        ui.score.textContent = player.score;
    }
}

function createPeriodicTable() {
    if (!periodicTableEl) {
        console.error("주기율표 요소를 찾을 수 없습니다.");
        return;
    }
    periodicTableEl.innerHTML = '';
    const tableGrid = document.createElement('div');
    tableGrid.className = 'periodic-table-grid'; // styles.css에 정의된 클래스

    PERIODIC_TABLE_DATA.forEach(element => {
        const cell = document.createElement('div');
        // element.type (e.g., 'ALKALI_METAL')을 CSS 클래스 ('element-type-alkali-metal')로 변환
        const elementTypeClass = element.type ? `element-type-${element.type.toLowerCase().replace(/_/g, '-')}` : 'element-type-unknown';
        cell.className = `element-cell ${elementTypeClass}`;
        cell.style.gridRowStart = element.row; // PERIODIC_TABLE_DATA의 row, col은 1-indexed
        cell.style.gridColumnStart = element.col;
        cell.dataset.elementNumber = element.atomicNumber;

        cell.innerHTML = `
            <div class="atomic-number text-xs">${element.atomicNumber}</div>
            <div class="element-symbol text-lg font-bold">${element.symbol}</div>
            <div class="cube-container mt-1 flex justify-center items-end space-x-px h-2"></div>
        `;
        cell.title = `${element.name} (#${element.atomicNumber})`;

        cell.addEventListener('click', () => {
            if (gamePhase === 'production') { // 생산 단계에서만 클릭 가능
                handleElementCellClick(element.atomicNumber);
            }
        });
        tableGrid.appendChild(cell);
    });
    periodicTableEl.appendChild(tableGrid);
    updatePeriodicTableState(); // 초기 상태 업데이트
}

function updatePeriodicTableState() {
    if (!periodicTableState || !players) return;
    document.querySelectorAll('.element-cell').forEach(cell => {
        const cubeContainer = cell.querySelector('.cube-container');
        if (cubeContainer) cubeContainer.innerHTML = ''; // 이전 큐브들 제거
        const elementNumber = parseInt(cell.dataset.elementNumber);

        if (periodicTableState[elementNumber] && periodicTableState[elementNumber].owners.length > 0) {
            periodicTableState[elementNumber].owners.forEach(ownerId => {
                const player = players.find(p => p.id === ownerId);
                if (player) {
                    const cubeEl = document.createElement('div');
                    // player-cube 클래스 사용 (styles.css 또는 index.html <style>에 정의 필요)
                    cubeEl.className = 'player-cube w-1.5 h-1.5 rounded-full'; // Tailwind 사용 예시
                    cubeEl.style.backgroundColor = player.color;
                    cubeEl.title = `플레이어 ${ownerId + 1}`;
                    if (cubeContainer) cubeContainer.appendChild(cubeEl);
                }
            });
        }
    });
}

// 시장 및 덱 렌더링 (기존 로직과 유사하나, CARD_TYPES, ELEMENT_TYPE_KEYS 등 import된 상수 사용)
function renderMarketAndDecks() {
    if (!basicDeckAreaEl || !advancedDeckAreaEl || !basicMarketCardsEl || !advancedMarketCardsEl) {
        console.error("시장/덱 영역의 일부 DOM 요소를 찾을 수 없습니다.");
        return;
    }
    // console.log("Rendering market. TopBasic:", marketCards.topBasicDeckCard, "OpenBasic:", marketCards.basicOpen.length);

    renderDeckDisplay(basicDeckAreaEl, marketCards.topBasicDeckCard, basicDeck, "기본", CARD_TYPES.BASIC);
    renderDeckDisplay(advancedDeckAreaEl, marketCards.topAdvancedDeckCard, advancedDeck, "고급", CARD_TYPES.ADVANCED);
    renderOpenMarketCards(basicMarketCardsEl, marketCards.basicOpen, CARD_TYPES.BASIC);
    renderOpenMarketCards(advancedMarketCardsEl, marketCards.advancedOpen, CARD_TYPES.ADVANCED);
}

function renderDeckDisplay(containerEl, topCard, deck, deckNameSuffix, cardTypeConst) {
    containerEl.innerHTML = ''; // Clear previous content
    const wrapper = document.createElement('div');
    wrapper.className = 'deck-display-wrapper flex flex-col items-center p-2 bg-gray-50 rounded-lg shadow';

    const titleEl = document.createElement('h4');
    titleEl.className = 'text-sm font-semibold text-gray-600 mb-2';
    titleEl.textContent = `${deckNameSuffix} 덱 (남은 카드: ${deck.length}장)`;
    wrapper.appendChild(titleEl);

    const deckAndTopCardContainer = document.createElement('div');
    deckAndTopCardContainer.className = 'flex items-start space-x-3'; // 덱과 상단 카드 나란히

    // 덱 더미 UI
    const deckPile = document.createElement('div');
    deckPile.className = 'deck-pile relative w-24 h-36 group'; // styles.css 또는 <style> 태그에 정의
    deckPile.title = `${deckNameSuffix} 덱 (${deck.length}장 남음)`;
    if (deck.length > 0) {
        for (let i = 0; i < Math.min(deck.length, 3); i++) { // 최대 3장 겹쳐 보이게
            const cardBack = document.createElement('div');
            cardBack.className = `deck-pile-card-back absolute w-full h-full rounded-md shadow-lg border-2 ${cardTypeConst === CARD_TYPES.BASIC ? 'basic-deck-color' : 'advanced-deck-color'}`;
            cardBack.style.transform = `translate(${i * 3}px, ${i * 3}px) rotate(${i * 1.5}deg)`; // 약간씩 어긋나게
            if (i === Math.min(deck.length, 3) - 1) { // 맨 위 카드에만 남은 장수 표시
                cardBack.innerHTML = `<div class="flex items-center justify-center h-full text-xs font-semibold">${deck.length}</div>`;
            }
            deckPile.appendChild(cardBack);
        }
    } else {
        deckPile.classList.add('bg-gray-100', 'border-dashed', 'border-2', 'border-gray-300', 'flex', 'items-center', 'justify-center', 'text-gray-400', 'text-xs', 'rounded-md');
        deckPile.textContent = '덱 비었음';
    }
    deckAndTopCardContainer.appendChild(deckPile);

    // 상단 공개 카드 UI
    if (topCard) {
        const topCardEl = createCompoundCardElement(topCard, cardTypeConst, -1, true); // isTopDeckCard = true
        deckAndTopCardContainer.appendChild(topCardEl);
    } else {
        const noTopCardEl = document.createElement('div');
        noTopCardEl.className = 'w-28 h-36 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center text-xs text-gray-400 p-2 text-center'; // Tailwind 사용
        noTopCardEl.textContent = '공개된 카드 없음';
        deckAndTopCardContainer.appendChild(noTopCardEl);
    }
    wrapper.appendChild(deckAndTopCardContainer);
    containerEl.appendChild(wrapper);
}

function renderOpenMarketCards(containerEl, cards, cardTypeConst) {
    containerEl.innerHTML = ''; // Clear previous content
    if (cards && cards.length > 0) {
        cards.forEach((card, index) => {
            if (card) { // 유효한 카드 객체인지 확인
                const cardEl = createCompoundCardElement(card, cardTypeConst, index, false); // isTopDeckCard = false
                containerEl.appendChild(cardEl);
            } else {
                console.warn(`Undefined card found in ${cardTypeConst} open market at index ${index}`);
            }
        });
    } else {
        containerEl.innerHTML = `<div class="col-span-full text-center text-gray-500 p-4">판매 가능한 ${cardTypeConst === CARD_TYPES.BASIC ? "기본" : "고급"} 카드가 없습니다.</div>`;
    }
}


function createCompoundCardElement(card, cardTypeConst, cardIndex, isTopDeckCard = false) {
    if (!card || typeof card.name === 'undefined' || typeof card.points === 'undefined') {
        console.warn("유효하지 않은 카드 데이터로 요소 생성 시도:", card);
        const errorCardEl = document.createElement('div');
        errorCardEl.className = 'compound-card-ui bg-red-100 border-red-500 p-2 text-red-700 text-xs flex items-center justify-center w-[120px] h-[170px]';
        errorCardEl.textContent = '카드 정보 오류';
        return errorCardEl;
    }

    const cardEl = document.createElement('div');
    // 클래스는 index.html <style> 태그 또는 styles.css 에 정의된 .compound-card-ui 사용
    cardEl.className = `compound-card-ui bg-white rounded-lg shadow-lg p-2.5 border-2 flex flex-col justify-between hover:shadow-xl transition-shadow duration-200`;
    cardEl.style.borderColor = cardTypeConst === CARD_TYPES.BASIC ? '#6EE7B7' /* Emerald-300 */ : '#FDE047' /* Amber-300 */;

    const header = document.createElement('div');
    header.className = 'text-center mb-1';
    const nameEl = document.createElement('h5');
    nameEl.className = 'card-name'; // <style> 태그에 정의된 클래스
    nameEl.textContent = card.name;
    header.appendChild(nameEl);

    if (card.formula) {
        const formulaEl = document.createElement('p');
        formulaEl.className = 'card-formula'; // <style> 태그에 정의된 클래스
        formulaEl.innerHTML = formatChemicalFormula(card.formula);
        header.appendChild(formulaEl);
    }
    cardEl.appendChild(header);

    const elementsContainer = document.createElement('div');
    elementsContainer.className = 'elements-display-area'; // <style> 태그에 정의된 클래스

    if (card.requiredElements && card.requiredElements.length > 0) {
        card.requiredElements.forEach(reqNum => {
            const elData = PERIODIC_TABLE_DATA.find(el => el.atomicNumber === reqNum);
            const badge = document.createElement('span');
            const baseBadgeClasses = 'element-badge-modal px-2 py-1 rounded text-sm font-semibold text-white m-0.5 shadow';

            if (elData) {
                badge.textContent = `${elData.symbol} (${elData.name})`;
                const elementTypeClass = elData.type ? `element-type-${elData.type.toLowerCase().replace(/_/g, '-')}` : 'element-type-unknown';
                badge.className = `${baseBadgeClasses} ${elementTypeClass}`;

                const player = players[currentPlayerIndex];
                if (player && player.elements.includes(reqNum)) {
                    badge.classList.add('ring-2', 'ring-offset-1', 'ring-white', 'opacity-100');
                } else {
                    badge.classList.add('opacity-60');
                }
            } else {
                badge.textContent = `원소 ${reqNum}`;
                badge.className = baseBadgeClasses;
                badge.style.backgroundColor = '#A0AEC0'; // Fallback for unknown elements, like gray-500
            }
            elementsContainer.appendChild(badge);
        });
    } else {
        elementsContainer.textContent = '필요 원소 없음';
    }
    cardEl.appendChild(elementsContainer);

    const footer = document.createElement('div');
    footer.className = 'mt-auto text-center'; // flex-grow로 인해 elementsContainer가 공간을 차지하므로, 이게 맨 아래로 감

    const pointsEl = document.createElement('div');
    pointsEl.className = `points-display`; // <style> 태그에 정의된 클래스
    pointsEl.style.backgroundColor = cardTypeConst === CARD_TYPES.BASIC ? '#10B981' /* Emerald-500 */ : '#F59E0B' /* Amber-500 */;
    pointsEl.textContent = `${card.points}점`;
    footer.appendChild(pointsEl);

    if (!isTopDeckCard) { // 덱 상단 카드가 아닐 경우에만 구매 버튼 표시
        const buyButtonEl = document.createElement('button');
        buyButtonEl.className = 'buy-button bg-indigo-500 text-white hover:bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed'; // <style> 태그
        buyButtonEl.textContent = '구매';
        const canBuy = gamePhase === 'selling' && currentPlayerIndex !== null && gsCanSellCard(currentPlayerIndex, card);
        buyButtonEl.disabled = !canBuy;
        buyButtonEl.addEventListener('click', (e) => {
            e.stopPropagation(); // 카드 전체 클릭 이벤트 전파 방지
            if (canBuy) {
                handleCardPurchase(card);
            }
        });
        footer.appendChild(buyButtonEl);
    }
    cardEl.appendChild(footer);

    // 카드 클릭 시 상세 정보 모달 표시 (버튼 클릭 제외)
    cardEl.addEventListener('click', (e) => {
        if (e.target.tagName !== 'BUTTON') {
            showCompoundCardModal(card);
        }
    });
    return cardEl;
}


export function showCompoundCardModal(card) {
    if (!compoundCardModalEl || !card) return;
    const cardTitleEl = document.getElementById('compound-card-title');
    const cardFormulaEl = document.getElementById('compound-card-formula');
    const cardDescriptionEl = document.getElementById('compound-card-description');
    const cardElementsEl = document.getElementById('compound-card-elements');
    const cardPointsEl = document.getElementById('compound-card-points');
    const purchaseBtn = document.getElementById('purchase-compound-card');

    if (cardTitleEl) cardTitleEl.textContent = card.name;
    if (cardFormulaEl) cardFormulaEl.innerHTML = card.formula ? formatChemicalFormula(card.formula) : '화학식 정보 없음';
    if (cardDescriptionEl) cardDescriptionEl.textContent = card.description || '학습용 설명이 없습니다.';
    if (cardPointsEl) cardPointsEl.textContent = `${card.points}`;

    if (cardElementsEl) {
        cardElementsEl.innerHTML = '';
        if (card.requiredElements && card.requiredElements.length > 0) {
            card.requiredElements.forEach(reqNum => {
                const elData = PERIODIC_TABLE_DATA.find(el => el.atomicNumber === reqNum);
                const badge = document.createElement('span');
                const baseBadgeClasses = 'element-badge-modal px-2 py-1 rounded text-sm font-semibold text-white m-0.5 shadow';

                if (elData) {
                    badge.textContent = `${elData.symbol} (${elData.name})`;
                    const elementTypeClass = elData.type ? `element-type-${elData.type.toLowerCase().replace(/_/g, '-')}` : 'element-type-unknown';
                    badge.className = `${baseBadgeClasses} ${elementTypeClass}`;

                    const player = players[currentPlayerIndex];
                    if (player && player.elements.includes(reqNum)) {
                        badge.classList.add('ring-2', 'ring-offset-1', 'ring-white', 'opacity-100');
                    } else {
                        badge.classList.add('opacity-60');
                    }
                } else {
                    badge.textContent = `원소 ${reqNum}`;
                    badge.className = baseBadgeClasses;
                    badge.style.backgroundColor = '#A0AEC0'; // Fallback for unknown elements, like gray-500
                }
                cardElementsEl.appendChild(badge);
            });
        } else {
            cardElementsEl.textContent = '필요 원소 없음';
        }
    }

    if (purchaseBtn) {
        const canBuy = gamePhase === 'selling' && currentPlayerIndex !== null && gsCanSellCard(currentPlayerIndex, card);
        purchaseBtn.disabled = !canBuy;
        // 이벤트 리스너 중복 방지를 위해 기존 리스너 제거 후 새로 추가
        const newPurchaseBtn = purchaseBtn.cloneNode(true);
        purchaseBtn.parentNode.replaceChild(newPurchaseBtn, purchaseBtn);
        newPurchaseBtn.addEventListener('click', () => {
            if (gsCanSellCard(currentPlayerIndex, card)) {
                 handleCardPurchase(card);
            }
            hideCompoundCardModal();
        });
    }
    compoundCardModalEl.classList.remove('hidden');
}

export function hideCompoundCardModal() {
    if (compoundCardModalEl) compoundCardModalEl.classList.add('hidden');
}

export function showMessageBox(message, isHtml = false) {
    if (!messageBoxText || !messageBoxOverlay || !messageBoxEl) return;
    if (isHtml) {
        messageBoxText.innerHTML = message;
    } else {
        messageBoxText.textContent = message;
    }
    messageBoxOverlay.classList.remove('hidden');
    messageBoxEl.classList.remove('hidden');
    // OK 버튼에 포커스 (접근성)
    if (messageBoxOkBtn) messageBoxOkBtn.focus();
}

function hideMessageBox() {
    if (messageBoxOverlay && messageBoxEl) {
        messageBoxOverlay.classList.add('hidden');
        messageBoxEl.classList.add('hidden');
    }
}

function formatChemicalFormula(formula) {
    // 간단한 숫자만 아래첨자로 변환
    return formula.replace(/(\d+)/g, '<sub>$1</sub>').replace(/\s/g, '');
}

// 게임 메시지 표시 (짧은 메시지용 토스트)
export function showGameMessage(message, duration = 3000) {
    if (!gameMessageEl) return;
    // 메시지가 너무 길면 showMessageBox 사용 (HTML 형식 지원 안 함)
    if (message.length > 60 && typeof showMessageBox === 'function') {
        showMessageBox(message);
        return;
    }
    gameMessageEl.textContent = message;
    gameMessageEl.classList.add('visible');
    if (gameMessageEl.timer) clearTimeout(gameMessageEl.timer);
    gameMessageEl.timer = setTimeout(() => {
        gameMessageEl.classList.remove('visible');
    }, duration);
}


function updateGameInfoDisplay() {
    const roundCounterEl = document.getElementById('round-counter');
    const phaseDisplayEl = document.getElementById('phase-display');
    const calculatedValueDisplayEl = document.getElementById('calculated-value');
    const selectedDiceValueEl = document.getElementById('selected-dice-value');


    if (roundCounterEl) roundCounterEl.textContent = `라운드: ${currentRound}`;
    if (phaseDisplayEl) {
        let phaseText = '';
        if (gamePhase === 'production') phaseText = '생산';
        else if (gamePhase === 'selling') phaseText = '판매';
        else if (gamePhase === 'game-over') phaseText = '게임 종료';
        else phaseText = gamePhase; // 'setup' 등
        phaseDisplayEl.textContent = `단계: ${phaseText}`;
    }
    if (calculatedValueDisplayEl) {
         const displayValue = (gamePhase === 'production' && selectedDice.length > 0 && currentCalculatedValue > 0) ? currentCalculatedValue : '-';
         calculatedValueDisplayEl.textContent = displayValue;
    }
    if (selectedDiceValueEl) {
        if (gamePhase === 'production' && players[currentPlayerIndex] && selectedDice.length > 0) {
            const diceValues = selectedDice.map(idx => players[currentPlayerIndex].dice[idx].value).join(', ');
            selectedDiceValueEl.textContent = diceValues;
        } else {
            selectedDiceValueEl.textContent = '-';
        }
    }

    updateOperationButtons();
    highlightCurrentPlayer(); // 현재 플레이어 UI 업데이트 포함
}


function updateOperationButtons() {
    if (!diceOperationsEl) return;
    const buttons = diceOperationsEl.querySelectorAll('button.operation-btn');
    const rollDiceBtn = document.getElementById('roll-dice-btn');
    const endTurnBtn = document.getElementById('end-turn-btn');
    const skipSellingBtn = document.getElementById('skip-selling-btn');

    // 기본적으로 모든 연산 버튼 비활성화 및 스타일 초기화
    buttons.forEach(btn => {
        btn.disabled = true;
        btn.classList.add('opacity-50', 'cursor-not-allowed', 'bg-gray-300', 'text-gray-500');
        btn.classList.remove('bg-indigo-600', 'hover:bg-indigo-700', 'text-white', 'ring-2', 'ring-yellow-400', 'border-indigo-600');
    });
    if (rollDiceBtn) { rollDiceBtn.disabled = true; rollDiceBtn.classList.add('opacity-50', 'cursor-not-allowed'); }
    if (endTurnBtn) { endTurnBtn.disabled = true; endTurnBtn.classList.add('opacity-50', 'cursor-not-allowed'); }
    if (skipSellingBtn) { skipSellingBtn.disabled = true; skipSellingBtn.classList.add('opacity-50', 'cursor-not-allowed'); }

    const player = players[currentPlayerIndex];
    if (!player) return; // 현재 플레이어가 없으면 아무것도 안 함

    if (gamePhase === 'production') {
        // 주사위 굴리기 버튼: 잠기지 않은 주사위가 하나라도 있으면 활성화
        if (rollDiceBtn && player.dice.some(d => !d.locked)) {
            rollDiceBtn.disabled = false;
            rollDiceBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }

        // 생산 종료 버튼: (모든 주사위 잠김 OR 주사위 선택됨) AND (큐브가 없거나 OR 계산된 값이 0이 아님)
        // -> 계산된 값이 있고 주기율표에 놓을 수 있거나, 더 이상 놓을 큐브/주사위가 없을 때
        const canOccupy = currentCalculatedValue > 0 && currentCalculatedValue <= PERIODIC_TABLE_SIZE;
        const noMoreCubes = player.cubes <= 0;
        const allDiceLocked = player.dice.every(d => d.locked);

        if (endTurnBtn) {
            if (allDiceLocked || noMoreCubes) { // 모든 주사위를 사용했거나, 큐브가 없으면 무조건 종료 가능
                endTurnBtn.disabled = false;
                endTurnBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            } else if (selectedDice.length > 0 && !canOccupy && currentCalculatedValue === 0) {
                // 주사위를 선택했지만 유효한 조합이 아닐 때 (값이 0일 때) 종료 가능
                endTurnBtn.disabled = false;
                endTurnBtn.classList.remove('opacity-50', 'cursor-not-allowed');
            }
            // 추가: 주사위 선택이 없고, 굴릴 주사위도 없을 때 (모든 주사위 잠김) - 이미 allDiceLocked에서 처리됨
        }


        // 연산 버튼 활성화 로직
        if (selectedDice.length === 1) {
            const singleBtn = diceOperationsEl.querySelector('[data-operation="single"]');
            if (singleBtn) {
                singleBtn.disabled = false;
                singleBtn.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-gray-300', 'text-gray-500');
                singleBtn.classList.add('bg-white', 'border-gray-300'); // 기본 스타일
                if (gsSelectedOperation === OPERATIONS.SINGLE) { // 현재 선택된 연산 강조
                    singleBtn.classList.add('ring-2', 'ring-yellow-400', 'border-indigo-600', 'text-indigo-700', 'font-semibold');
                }
            }
        } else if (selectedDice.length === 2) {
            const availableOps = [OPERATIONS.ADD, OPERATIONS.SUBTRACT];
            if (hasSkill(currentPlayerIndex, SKILL_CARDS.MATH.id)) {
                availableOps.push(OPERATIONS.MULTIPLY, OPERATIONS.DIVIDE);
            }
            if (hasSkill(currentPlayerIndex, SKILL_CARDS.CONCAT.id)) {
                availableOps.push(OPERATIONS.CONCAT);
            }
            availableOps.forEach(opKey => {
                const btn = diceOperationsEl.querySelector(`[data-operation="${opKey}"]`);
                if (btn) {
                    btn.disabled = false;
                    btn.classList.remove('opacity-50', 'cursor-not-allowed', 'bg-gray-300', 'text-gray-500');
                    btn.classList.add('bg-white', 'border-gray-300');
                    if (gsSelectedOperation === opKey) {
                        btn.classList.add('ring-2', 'ring-yellow-400', 'border-indigo-600', 'text-indigo-700', 'font-semibold');
                    }
                }
            });
        }
    } else if (gamePhase === 'selling') {
        if (skipSellingBtn) {
            skipSellingBtn.disabled = false;
            skipSellingBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        }
        // 판매 단계에서는 카드 구매 버튼 활성화는 createCompoundCardElement에서 처리
    }
}


function setupOperationListeners() {
    if (!diceOperationsEl) return;
    const rollDiceBtn = document.getElementById('roll-dice-btn');
    if (rollDiceBtn) rollDiceBtn.addEventListener('click', handleRollDice);

    const endTurnBtn = document.getElementById('end-turn-btn');
    if (endTurnBtn) endTurnBtn.addEventListener('click', handleEndTurn);

    const skipSellingBtn = document.getElementById('skip-selling-btn');
    if (skipSellingBtn) skipSellingBtn.addEventListener('click', handleSkipSellingTurn);

    diceOperationsEl.querySelectorAll('button.operation-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            if (btn.disabled) return;
            const operation = btn.dataset.operation;
            if (gsChangeOperation(operation)) { // game-state의 연산 변경 함수 호출
                updateGameInfoDisplay(); // 연산 변경 후 UI 즉시 업데이트
            }
        });
    });
}

// 이벤트 핸들러 함수들
function handleDieClick(playerIndex, dieIndex) {
    if (gamePhase !== 'production' || currentPlayerIndex !== playerIndex) return;
    if (gsToggleDieSelection(playerIndex, dieIndex)) { // game-state의 주사위 선택 토글 함수 호출
        renderPlayerDice(playerIndex); // 해당 플레이어 주사위만 다시 그림
        updateGameInfoDisplay(); // 계산된 값 및 버튼 상태 업데이트
    }
}

function handleRollDice() {
    if (gamePhase !== 'production' || !players[currentPlayerIndex]) return;
    const player = players[currentPlayerIndex];
    // 잠기지 않은 주사위가 하나라도 있는지 확인
    if (player.dice.some(d => !d.locked)) {
        player.dice.forEach(die => {
            if (!die.locked) {
                gsRollSingleDie(die); // game-state의 단일 주사위 굴리기 함수 호출
            }
        });
        // 주사위 굴린 후 선택 상태 및 계산값 초기화 (game-state에서 처리하는 것이 더 적합할 수 있음)
        // selectedDice = []; // 이 변수는 game-state.js에 있으므로 직접 초기화 불가
        // currentCalculatedValue = 0;
        // selectedOperation = OPERATIONS.SINGLE;
        // 위 초기화는 startProductionPhase 또는 rollAllDice 같은 함수에서 처리하도록 game-state.js 수정 고려
        // 현재는 game-state.js의 startProductionPhase에서 초기화되므로, 여기서는 UI 업데이트만 집중

        renderPlayerDice(currentPlayerIndex); // 현재 플레이어 주사위 UI 업데이트
        updateGameInfoDisplay(); // 계산된 값 표시 등
        showGameMessage('주사위를 굴렸습니다. 원자번호를 조합하세요.');
    } else {
        showGameMessage('모든 주사위가 잠겨있거나 굴릴 주사위가 없습니다.');
    }
}


function handleElementCellClick(elementNumber) {
    if (gamePhase !== 'production' || currentCalculatedValue !== elementNumber) {
        if (currentCalculatedValue === 0 && selectedDice.length > 0) {
             showGameMessage(`유효하지 않은 주사위 조합입니다. (값: ${currentCalculatedValue})`, 2000);
        } else if (currentCalculatedValue !== elementNumber) {
            showGameMessage(`선택한 주사위 값(${currentCalculatedValue})과 원소 번호(${elementNumber})가 일치하지 않습니다.`, 2000);
        }
        return;
    }
    if (gsOccupyElement(currentPlayerIndex, elementNumber)) { // game-state의 원소 점유 함수 호출
        const elementName = PERIODIC_TABLE_DATA.find(e => e.atomicNumber === elementNumber)?.symbol || elementNumber;
        showGameMessage(`원소 ${elementName} (${elementNumber}) 점유!`);
        renderAllPlayers(); // 모든 플레이어 UI (큐브 수 등)
        updatePeriodicTableState(); // 주기율표 큐브 표시
        updateGameInfoDisplay(); // 계산값 초기화 및 버튼 상태 업데이트
    }
    // 실패 메시지는 gsOccupyElement 내부에서 showGameMessage로 처리됨
}

function handleCardPurchase(card) {
    if (gamePhase !== 'selling') return;
    if (gsSellCard(currentPlayerIndex, card)) { // game-state의 카드 판매 함수 호출
        showGameMessage(`'${card.name}' 카드를 구매했습니다! (+${card.points}점)`);
        renderMarketAndDecks(); // 시장 카드 업데이트
        renderAllPlayers(); // 플레이어 점수, 판매 카드 목록 등 업데이트
        updateGameInfoDisplay(); // 게임 정보 업데이트 (단계 등)
    }
    // 실패 메시지는 gsSellCard 내부에서 showGameMessage로 처리될 수 있음
}

function handleEndTurn() { // 생산 종료 버튼 클릭 시
    if (gamePhase !== 'production') return;
    gsStartSellingPhase(); // game-state의 판매 단계 시작 함수 호출
    updateGameInfoDisplay(); // 단계 표시 업데이트 등
    renderMarketAndDecks(); // 판매 단계이므로 시장 카드 구매 가능 상태로 업데이트
    renderAllPlayers(); // 현재 플레이어 하이라이트 변경 등
    showGameMessage("생산 단계를 종료하고 판매 단계로 전환합니다.");
}

function handleSkipSellingTurn() { // 판매 넘기기 버튼 클릭 시
    if (gamePhase !== 'selling') return;
    if (gsSkipSellingTurn(currentPlayerIndex)) { // game-state의 판매 턴 넘기기 함수 호출
        // nextPlayerTurn 내부에서 라운드 종료 및 다음 생산 단계 시작 처리
        updateGameInfoDisplay();
        renderMarketAndDecks(); // 다음 플레이어를 위해 시장 상태 업데이트
        renderAllPlayers(); // 현재 플레이어 변경 등
    }
}

// 점수 트랙 보상 모달 표시 및 처리
export function showDiceSelectionModal(playerIndex) {
    if (!diceSelectionModalEl) return;
    diceSelectionModalEl.classList.remove('hidden');
    // 기존 이벤트 리스너 제거 (중복 방지)
    const newModal = diceSelectionModalEl.cloneNode(true);
    diceSelectionModalEl.parentNode.replaceChild(newModal, diceSelectionModalEl);
    diceSelectionModalEl = newModal; // 캐시 업데이트

    diceSelectionModalEl.querySelectorAll('.dice-select-btn').forEach(button => {
        button.addEventListener('click', () => {
            const dieType = button.dataset.dice;
            if (acquireNewDie(playerIndex, dieType)) { // game-state 함수 호출
                renderAllPlayers(); // UI 업데이트
            }
            hideDiceSelectionModal();
        });
    });
}

function hideDiceSelectionModal() {
    if (diceSelectionModalEl) diceSelectionModalEl.classList.add('hidden');
}

export function showSkillSelectionModal(playerIndex) {
    if (!skillSelectionModalEl) return;

    // 이미 보유한 기술은 선택 못하게 하거나 다르게 표시
    const playerSkills = players[playerIndex].skills;
    skillSelectionModalEl.querySelectorAll('.skill-select-btn').forEach(button => {
        const skillId = button.dataset.skill; // SKILL_CARDS의 키값 (MATH, CONCAT 등)이 아님. SKILL_CARDS.KEY.id 값이어야 함.
                                            // data-skill 속성값을 SKILL_CARDS의 id ('math', 'concat' 등)로 설정해야 함.
        const skillData = Object.values(SKILL_CARDS).find(s => s.id === skillId);

        if (skillData && playerSkills.includes(skillData.id)) {
            button.disabled = true;
            button.classList.add('opacity-50', 'cursor-not-allowed');
            button.title = "이미 보유한 기술입니다.";
        } else {
            button.disabled = false;
            button.classList.remove('opacity-50', 'cursor-not-allowed');
            button.title = "";
        }
    });


    skillSelectionModalEl.classList.remove('hidden');
    const newModal = skillSelectionModalEl.cloneNode(true);
    skillSelectionModalEl.parentNode.replaceChild(newModal, skillSelectionModalEl);
    skillSelectionModalEl = newModal;

    skillSelectionModalEl.querySelectorAll('.skill-select-btn:not(:disabled)').forEach(button => {
        button.addEventListener('click', () => {
            const skillId = button.dataset.skill; // SKILL_CARDS의 ID ('math', 'concat' 등)
            if (acquireSkill(playerIndex, skillId)) { // game-state 함수 호출
                renderAllPlayers(); // UI 업데이트
            }
            hideSkillSelectionModal();
        });
    });
}

function hideSkillSelectionModal() {
    if (skillSelectionModalEl) skillSelectionModalEl.classList.add('hidden');
}


// 초기 설정 이벤트 리스너는 DOMContentLoaded 시 main.js에서 호출되도록 변경 가능
// 또는 여기서 직접 호출
document.addEventListener('DOMContentLoaded', () => {
    if (messageBoxOkBtn) {
        messageBoxOkBtn.addEventListener('click', hideMessageBox);
    }
    // 나머지 초기 리스너 설정 (필요시)
});