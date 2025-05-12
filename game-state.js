// constants.js에서 필요한 상수들을 import
import {
    MAX_CUBES, MIN_PLAYERS, MAX_PLAYERS, OPERATIONS, PERIODIC_TABLE_SIZE,
    DICE_TYPES, CARD_TYPES, PERIODIC_TABLE_LAYOUT, WINNING_SCORE, MAX_DICE,
    SCORE_TRACK_SPECIAL, STARTING_DICE_TYPES, PERIODIC_TABLE_DATA, SKILL_CARDS
} from './constants.js';

// ui-handlers.js 또는 main.js에서 필요한 함수 import (예시)
// 실제로는 ui-handlers.js의 showGameMessage 등을 직접 호출하는 대신,
// 이벤트를 발생시키거나 콜백을 사용하는 방식이 더 좋을 수 있습니다.
// 여기서는 일단 직접 호출 가능한 상태라고 가정하고 진행합니다.
// (만약 showGameMessage 등이 ui-handlers.js에 있다면, 해당 파일에서 export 하고 여기서 import 해야 함)
import { showGameMessage, showDiceSelectionModal, showSkillSelectionModal } from './ui-handlers.js';


// 게임 상태 변수
export let gamePhase = 'setup';
export let currentRound = 0;
export let currentPlayerIndex = 0;
export let players = [];
export let gameActive = false;
export let periodicTableState = {};

export let marketCards = {
    basicOpen: [],
    advancedOpen: [],
    topBasicDeckCard: null,
    topAdvancedDeckCard: null
};

export let basicDeck = [];
export let advancedDeck = [];
export let selectedOperation = OPERATIONS.SINGLE;
export let selectedDice = [];
export let currentCalculatedValue = 0;

// 함수 추가: 외부에서 덱 데이터를 설정하기 위함
export function setDecks(parsedBasicCards, parsedAdvancedCards) {
    basicDeck.length = 0;
    advancedDeck.length = 0;
    basicDeck.push(...parsedBasicCards);
    advancedDeck.push(...parsedAdvancedCards);
    console.log(`Decks set in game-state: Basic - ${basicDeck.length}, Advanced - ${advancedDeck.length}`);
}

// 게임 설정 초기화
export function initGameSetup(playerCount) {
    console.log(`Initializing game setup with ${playerCount} players.`);
    gamePhase = 'production';
    currentRound = 1;
    currentPlayerIndex = 0;
    players = [];
    for (let i = 0; i < playerCount; i++) {
        players.push({
            id: i,
            color: getPlayerColor(i),
            score: 0,
            cubes: MAX_CUBES,
            dice: STARTING_DICE_TYPES.map(type => ({ type, value: 1, selected: false, locked: false })),
            elements: [],
            skills: [],
            soldCards: [],
            outsourceUsed: false
        });
    }

    periodicTableState = {};
    for (let i = 1; i <= PERIODIC_TABLE_SIZE; i++) {
        periodicTableState[i] = { owners: [] };
    }

    selectedDice = [];
    selectedOperation = OPERATIONS.SINGLE;
    currentCalculatedValue = 0;

    setupMarket();
    startProductionPhase();
    gameActive = true;
    console.log("Game setup complete. Current phase:", gamePhase);
}

// 덱에서 특정 조건의 카드를 찾아 제거하고 반환하는 헬퍼 함수
function extractCardFromDeck(deck, conditionFn) {
    if (!deck || deck.length === 0) return null;
    let foundCard = null;
    let foundIndex = -1;

    if (conditionFn) {
        foundIndex = deck.findIndex(conditionFn);
    }

    if (foundIndex !== -1) {
        foundCard = deck.splice(foundIndex, 1)[0];
    } else if (deck.length > 0 && !conditionFn) {
        foundCard = deck.shift();
    }
    return foundCard;
}

// 덱 상단 카드 설정 (단일 원소 우선)
function extractTopCardFromDeck(deck, singleElementPriority) {
    if (!deck || deck.length === 0) return null;
    let topCard = null;

    if (singleElementPriority) {
        const singleElementCardIndex = deck.findIndex(card => card.requiredElements && card.requiredElements.length === 1);
        if (singleElementCardIndex !== -1) {
            topCard = deck.splice(singleElementCardIndex, 1)[0];
        } else if (deck.length > 0) {
            topCard = deck.shift();
        }
    } else if (deck.length > 0) {
        topCard = deck.shift();
    }
    return topCard;
}

// 마켓 설정
export function setupMarket() {
    marketCards.topBasicDeckCard = extractTopCardFromDeck(basicDeck, true);
    marketCards.topAdvancedDeckCard = extractTopCardFromDeck(advancedDeck, true);

    marketCards.basicOpen = [];
    for (let i = 0; i < 4; i++) {
        if (basicDeck.length > 0) {
            marketCards.basicOpen.push(basicDeck.shift());
        } else {
            break;
        }
    }

    marketCards.advancedOpen = [];
    for (let i = 0; i < 4; i++) {
        if (advancedDeck.length > 0) {
            marketCards.advancedOpen.push(advancedDeck.shift());
        } else {
            break;
        }
    }
    // console.log 생략 (필요시 유지)
}


// 플레이어 색상 가져오기
function getPlayerColor(playerIndex) {
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#6366f1', '#ec4899'];
    return colors[playerIndex % colors.length];
}

// 생산 단계 시작
export function startProductionPhase() {
    gamePhase = 'production';
    players.forEach(player => {
        player.dice.forEach(die => {
            die.selected = false;
            rollSingleDie(die);
        });
        player.outsourceUsed = false;
    });
    selectedDice = [];
    selectedOperation = OPERATIONS.SINGLE;
    currentCalculatedValue = 0;
    // console.log 생략
}

// 단일 주사위 굴리기
export function rollSingleDie(die) {
    if (!die || !DICE_TYPES[die.type]) {
        console.error("Invalid die object or type:", die);
        return 0;
    }
    const sides = DICE_TYPES[die.type].sides;
    die.value = Math.floor(Math.random() * sides) + 1;
    return die.value;
}

// 주사위 선택/해제
export function toggleDieSelection(playerIndex, dieIndex) {
    if (gamePhase !== 'production' || currentPlayerIndex !== playerIndex) {
        console.warn("Cannot toggle die selection: Not in production phase or not current player.");
        return false;
    }
    const die = players[playerIndex].dice[dieIndex];
    if (die.locked) {
        console.warn("Cannot select a locked die.");
        return false;
    }
    die.selected = !die.selected;
    if (die.selected) {
        selectedDice.push(dieIndex);
    } else {
        const indexInSelected = selectedDice.indexOf(dieIndex);
        if (indexInSelected !== -1) {
            selectedDice.splice(indexInSelected, 1);
        }
    }
    if (selectedDice.length > 2) {
        die.selected = false;
        selectedDice.pop();
        if (typeof showGameMessage === 'function') showGameMessage("주사위는 최대 2개까지 선택할 수 있습니다.", 2000);
        return false;
    }
    updateAvailableOperations();
    calculateValue();
    return true;
}

// 가능한 연산 업데이트
function updateAvailableOperations() {
    if (selectedDice.length === 0) {
        selectedOperation = null; // 또는 OPERATIONS.SINGLE로 유지할 수도 있음
    } else if (selectedDice.length === 1) {
        selectedOperation = OPERATIONS.SINGLE;
    } else if (selectedDice.length === 2) {
        const player = players[currentPlayerIndex];
        let canKeepCurrentOp = true;
        if (!selectedOperation || // 현재 연산이 아예 없거나
            ((selectedOperation === OPERATIONS.MULTIPLY || selectedOperation === OPERATIONS.DIVIDE) && !hasSkill(currentPlayerIndex, SKILL_CARDS.MATH.id)) ||
            (selectedOperation === OPERATIONS.CONCAT && !hasSkill(currentPlayerIndex, SKILL_CARDS.CONCAT.id))) {
            canKeepCurrentOp = false;
        }

        if (!canKeepCurrentOp) {
            selectedOperation = OPERATIONS.ADD; // 유효하지 않으면 기본값 ADD로
        }
    }
}

// 연산 변경
export function changeOperation(operation) {
    if (selectedDice.length === 1 && operation !== OPERATIONS.SINGLE) {
        if (typeof showGameMessage === 'function') showGameMessage("주사위 1개 선택 시에는 단일 값만 가능합니다.", 2000);
       return false;
    }
    if (selectedDice.length !== 2 && operation !== OPERATIONS.SINGLE) {
       if (typeof showGameMessage === 'function') showGameMessage("연산을 변경하려면 주사위 2개를 선택해야 합니다.", 2000);
       return false;
    }

    if (operation === OPERATIONS.MULTIPLY || operation === OPERATIONS.DIVIDE) {
        if (!hasSkill(currentPlayerIndex, SKILL_CARDS.MATH.id)) {
            if (typeof showGameMessage === 'function') showGameMessage("곱셈/나눗셈 기술 카드가 필요합니다.", 2000);
            return false;
        }
    }
    if (operation === OPERATIONS.CONCAT) {
        if (!hasSkill(currentPlayerIndex, SKILL_CARDS.CONCAT.id)) {
            if (typeof showGameMessage === 'function') showGameMessage("자리붙이기 기술 카드가 필요합니다.", 2000);
            return false;
        }
    }
    selectedOperation = operation;
    calculateValue();
    return true;
}

// 값 계산
export function calculateValue() {
    if (selectedDice.length === 0) {
        currentCalculatedValue = 0;
        return 0;
    }
    const player = players[currentPlayerIndex];
    const dieValues = selectedDice.map(index => player.dice[index].value);

    if (selectedOperation === OPERATIONS.SINGLE && dieValues.length > 0) {
        currentCalculatedValue = dieValues[0];
    } else if (dieValues.length === 2) {
        const [val1, val2] = dieValues;
        switch (selectedOperation) {
            case OPERATIONS.ADD: currentCalculatedValue = val1 + val2; break;
            case OPERATIONS.SUBTRACT: currentCalculatedValue = Math.abs(val1 - val2); break;
            case OPERATIONS.MULTIPLY: currentCalculatedValue = val1 * val2; break;
            case OPERATIONS.DIVIDE:
                // 나눗셈 결과가 정수가 아니거나, 0으로 나누는 경우 0으로 처리 (유효하지 않음)
                currentCalculatedValue = (val2 === 0 || val1 % val2 !== 0) ? 0 : val1 / val2;
                break;
            case OPERATIONS.CONCAT:
                // 규칙: 작은 수 눈금 + 큰 수 눈금 (예: 2와 5 -> 25)
                currentCalculatedValue = parseInt(`${Math.min(val1, val2)}${Math.max(val1, val2)}`);
                break;
            default: currentCalculatedValue = 0;
        }
    } else { // 주사위가 1개 또는 2개가 아닌 잘못된 상태 (이론상 발생 안 함)
        currentCalculatedValue = 0;
    }

    if (currentCalculatedValue > PERIODIC_TABLE_SIZE || currentCalculatedValue < 1) {
        if (selectedDice.length > 0) { // 주사위를 선택했으나 유효하지 않은 값이면 0
            currentCalculatedValue = 0;
        }
    }
    // console.log 생략
    return currentCalculatedValue;
}

// 원소 점유
export function occupyElement(playerIndex, elementNumber) {
    if (gamePhase !== 'production' || currentPlayerIndex !== playerIndex) return false;
    if (currentCalculatedValue !== elementNumber || elementNumber < 1 || elementNumber > PERIODIC_TABLE_SIZE) {
        if (typeof showGameMessage === 'function') showGameMessage("유효하지 않은 원소 번호입니다.", 2000);
        return false;
    }
    const player = players[playerIndex];
    if (player.cubes <= 0) {
        if (typeof showGameMessage === 'function') showGameMessage("남은 큐브가 없습니다.", 2000);
        return false;
    }
    if (periodicTableState[elementNumber].owners.includes(playerIndex)) {
         if (typeof showGameMessage === 'function') showGameMessage("이미 점유한 원소입니다.", 2000);
        return false;
    }
    if (player.elements.length > 0 && !isAdjacentToPlayerElements(playerIndex, elementNumber)) {
        if (typeof showGameMessage === 'function') showGameMessage("기존에 점유한 원소와 인접해야 합니다.", 2000);
        return false;
    }

    periodicTableState[elementNumber].owners.push(playerIndex);
    player.elements.push(elementNumber);
    player.cubes--;

    selectedDice.forEach(dieIdx => {
        player.dice[dieIdx].locked = true;
        player.dice[dieIdx].selected = false;
    });
    selectedDice = [];
    currentCalculatedValue = 0;
    selectedOperation = OPERATIONS.SINGLE; // 또는 null로 설정하여 연산 버튼 재선택 유도

    if (hasSkill(playerIndex, SKILL_CARDS.SLIDE.id)) {
        // 슬라이드 기술 사용 가능 알림 (UI에서 실제 슬라이드 동작 처리 필요)
        if (typeof showGameMessage === 'function') showGameMessage("슬라이드 기술 사용 가능! (UI에서 슬라이드할 큐브 선택)", 2500);
    }
    return true;
}

// 플레이어의 원소와 인접한지 확인
function isAdjacentToPlayerElements(playerIndex, targetElementNumber) {
    const player = players[playerIndex];
    if (player.elements.length === 0) return true;

    const targetPos = getElementPosition(targetElementNumber);
    if (!targetPos) return false;

    for (const ownedElement of player.elements) {
        const ownedPos = getElementPosition(ownedElement);
        if (!ownedPos) continue;

        const rowDiff = Math.abs(targetPos.row - ownedPos.row);
        const colDiff = Math.abs(targetPos.col - ownedPos.col);
        if ((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1)) {
            return true;
        }
    }
    return false;
}

// 슬라이드 기능 (UI에서 호출되어야 함)
export function slideCube(playerIndex, fromElementNumber, toElementNumber) {
    if (!hasSkill(playerIndex, SKILL_CARDS.SLIDE.id)) return false;
    const player = players[playerIndex];
    const fromOwners = periodicTableState[fromElementNumber]?.owners;
    const toOwners = periodicTableState[toElementNumber]?.owners;

    if (!fromOwners || !toOwners || !fromOwners.includes(playerIndex) || toOwners.includes(playerIndex)) {
        if (typeof showGameMessage === 'function') showGameMessage("슬라이드할 수 없는 위치입니다.", 2000);
        return false;
    }

    const fromPos = getElementPosition(fromElementNumber);
    const toPos = getElementPosition(toElementNumber);
    if (!fromPos || !toPos) return false;

    const rowDiff = Math.abs(fromPos.row - toPos.row);
    const colDiff = Math.abs(fromPos.col - toPos.col);
    if (!((rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1))) {
        if (typeof showGameMessage === 'function') showGameMessage("인접한 칸으로만 슬라이드할 수 있습니다.", 2000);
        return false;
    }

    // 실제 상태 변경
    fromOwners.splice(fromOwners.indexOf(playerIndex), 1);
    toOwners.push(playerIndex);
    player.elements.splice(player.elements.indexOf(fromElementNumber), 1);
    player.elements.push(toElementNumber);

    // 슬라이드 기술 사용 후 추가 동작 (예: 기술 사용 표시)은 필요에 따라 추가
    if (typeof showGameMessage === 'function') showGameMessage("큐브를 슬라이드했습니다.", 2000);
    return true;
}

// 판매 단계 시작
export function startSellingPhase() {
    gamePhase = 'selling';
    currentPlayerIndex = 0; // 판매 단계는 항상 첫 번째 플레이어부터 시작
    // console.log 생략
    if (typeof showGameMessage === 'function') showGameMessage("판매 단계 시작! 카드를 구매하거나 턴을 넘기세요.", 2500);
}

// 화합물 카드 판매 가능 여부 확인
export function canSellCard(playerIndex, card) {
    if (gamePhase !== 'selling' || currentPlayerIndex !== playerIndex || !card) return false;

    const player = players[playerIndex];
    if (!player || !card.requiredElements) return false; // 방어 코드

    const neededElements = [...card.requiredElements];
    player.elements.forEach(ownedElement => {
        const index = neededElements.indexOf(ownedElement);
        if (index !== -1) {
            neededElements.splice(index, 1);
        }
    });

    const canUseOutsource = hasSkill(playerIndex, SKILL_CARDS.OUTSOURCE.id) && !player.outsourceUsed;
    if (neededElements.length === 1 && canUseOutsource) {
        return true;
    }
    return neededElements.length === 0;
}

// 화합물 카드 판매
export function sellCard(playerIndex, cardToSell) {
    const player = players[playerIndex];
    if (!canSellCard(playerIndex, cardToSell)) { // 판매 조건 재확인
        if (typeof showGameMessage === 'function') showGameMessage("카드를 판매할 수 있는 조건이 아닙니다.", 2000);
        return false;
    }

    player.score += cardToSell.points;
    player.soldCards.push(cardToSell);

    // 외주 생산 사용 여부 확인 및 처리
    const tempNeededElements = [...cardToSell.requiredElements];
    player.elements.forEach(ownedElement => {
        const index = tempNeededElements.indexOf(ownedElement);
        if (index !== -1) tempNeededElements.splice(index, 1);
    });
    if (tempNeededElements.length > 0 && hasSkill(playerIndex, SKILL_CARDS.OUTSOURCE.id) && !player.outsourceUsed) {
        player.outsourceUsed = true; // 라운드당 1회 사용됨으로 표시
        if (typeof showGameMessage === 'function') showGameMessage("외주 생산 기술을 사용했습니다!", 2000);
    }

    // 시장에서 카드 제거 및 새 카드 보충
    let soldFromMarket = false;
    let marketIndex = marketCards.basicOpen.findIndex(mc => mc.id === cardToSell.id);
    if (marketIndex !== -1) {
        marketCards.basicOpen.splice(marketIndex, 1);
        if (basicDeck.length > 0) marketCards.basicOpen.push(basicDeck.shift());
        soldFromMarket = true;
    } else {
        marketIndex = marketCards.advancedOpen.findIndex(mc => mc.id === cardToSell.id);
        if (marketIndex !== -1) {
            marketCards.advancedOpen.splice(marketIndex, 1);
            if (advancedDeck.length > 0) marketCards.advancedOpen.push(advancedDeck.shift());
            soldFromMarket = true;
        }
    }

    // 덱 상단 카드 구매 로직 (규칙에 따라 주석 해제 또는 수정)
    // if (!soldFromMarket) {
    //     if (marketCards.topBasicDeckCard && marketCards.topBasicDeckCard.id === cardToSell.id) {
    //         marketCards.topBasicDeckCard = extractTopCardFromDeck(basicDeck, true);
    //         soldFromMarket = true;
    //     } else if (marketCards.topAdvancedDeckCard && marketCards.topAdvancedDeckCard.id === cardToSell.id) {
    //         marketCards.topAdvancedDeckCard = extractTopCardFromDeck(advancedDeck, true);
    //         soldFromMarket = true;
    //     }
    // }

    if (!soldFromMarket) {
        console.warn("판매된 카드를 시장이나 덱 상단에서 찾을 수 없습니다:", cardToSell);
        // 이 경우 어떻게 처리할지 결정 필요 (오류 또는 무시)
    }

    checkSpecialScoreRewards(playerIndex);
    nextPlayerTurn();
    return true;
}


// 점수 특수 보상 확인
function checkSpecialScoreRewards(playerIndex) {
    const player = players[playerIndex];
    const pointsFromThisCard = player.soldCards.length > 0 ? player.soldCards[player.soldCards.length - 1].points : 0;
    const oldScore = player.score - pointsFromThisCard;

    for (const scoreThreshold in SCORE_TRACK_SPECIAL) {
        const threshold = parseInt(scoreThreshold);
        if (player.score >= threshold && oldScore < threshold) {
            const reward = SCORE_TRACK_SPECIAL[scoreThreshold];
            if (typeof showGameMessage === 'function') showGameMessage(`점수 ${threshold}점 달성! 보상: ${reward.description}`, 3000);

            if (reward.type === 'dice' && typeof showDiceSelectionModal === 'function') {
                showDiceSelectionModal(playerIndex); // ui-handlers.js에서 실제 모달 표시 및 선택 처리
            } else if (reward.type === 'skill' && typeof showSkillSelectionModal === 'function') {
                showSkillSelectionModal(playerIndex); // ui-handlers.js에서 실제 모달 표시 및 선택 처리
            }
        }
    }
}

// 플레이어가 특정 기술을 가졌는지 확인
export function hasSkill(playerIndex, skillId) {
    return players[playerIndex] && players[playerIndex].skills.includes(skillId);
}

// 새 주사위 획득 (ui-handlers.js의 모달에서 호출될 수 있음)
export function acquireNewDie(playerIndex, dieType) {
    const player = players[playerIndex];
    if (player.dice.length >= MAX_DICE) {
        if (typeof showGameMessage === 'function') showGameMessage("더 이상 주사위를 추가할 수 없습니다.", 2000);
        return false;
    }
    if (!DICE_TYPES[dieType]) {
        console.error("유효하지 않은 주사위 타입:", dieType);
        return false;
    }
    player.dice.push({ type: dieType, value: 1, selected: false, locked: false });
    rollSingleDie(player.dice[player.dice.length - 1]);
    if (typeof showGameMessage === 'function') showGameMessage(`${DICE_TYPES[dieType].name} 주사위를 획득했습니다!`, 2000);
    // UI 업데이트는 acquireNewDie를 호출한 쪽(예: 모달 닫힐 때)에서 renderAllPlayers 등을 호출
    return true;
}

// 새 기술 획득 (ui-handlers.js의 모달에서 호출될 수 있음)
export function acquireSkill(playerIndex, skillId) {
    const player = players[playerIndex];
    const skill = Object.values(SKILL_CARDS).find(s => s.id === skillId);

    if (!skill) {
        console.error("유효하지 않은 기술 ID:", skillId);
        return false;
    }
    if (player.skills.includes(skillId)) {
        if (typeof showGameMessage === 'function') showGameMessage("이미 보유한 기술입니다.", 2000);
        return false;
    }
    player.skills.push(skillId);
    if (typeof showGameMessage === 'function') showGameMessage(`${skill.name} 기술을 획득했습니다!`, 2000);
    // UI 업데이트는 acquireSkill을 호출한 쪽에서 처리
    return true;
}

// 다음 플레이어 턴으로 이동
export function nextPlayerTurn() {
    currentPlayerIndex = (currentPlayerIndex + 1) % players.length;

    if (gamePhase === 'selling' && currentPlayerIndex === 0) {
        if (checkWinCondition()) {
            endGame();
            return;
        }
        currentRound++;
        startProductionPhase(); // 다음 라운드 생산 단계 시작
        // UI 업데이트는 이 함수를 호출한 쪽에서 (예: sellCard, skipSellingTurn) renderAllPlayers 등으로 처리
    }
    // console.log 생략
    // gamePhase가 production일 때는 handleEndTurn (ui-handlers.js)에서 startSellingPhase를 호출
}

// 판매 단계 턴 넘기기
export function skipSellingTurn(playerIndex) {
    if (gamePhase !== 'selling' || currentPlayerIndex !== playerIndex) return false;
    if (typeof showGameMessage === 'function') showGameMessage(`플레이어 ${playerIndex + 1}이(가) 판매를 넘겼습니다.`, 1500);
    nextPlayerTurn();
    return true;
}

// 승리 조건 체크
function checkWinCondition() {
    return players.some(player => player.score >= WINNING_SCORE);
}

// 게임 종료 처리
function endGame() {
    gamePhase = 'game-over';
    gameActive = false;
    calculateFinalScores();
    const winner = getWinner();
    // console.log 생략

    if (typeof showGameMessage === 'function') {
        if (winner) {
            showGameMessage(`게임 종료! 최종 승자: 플레이어 ${winner.id + 1}! 최종 점수: ${winner.finalScore}`, 10000);
        } else {
            showGameMessage(`게임 종료! 승자를 결정할 수 없습니다. (동점자 규칙 확인 필요)`, 10000);
        }
    }
    // ui-handlers.js에서 최종 결과 화면 표시 등의 로직 추가 가능
}

// 최종 점수 계산
function calculateFinalScores() {
    players.forEach(player => {
        let finalScore = player.score;
        const uniqueElementTypes = new Set(); // 고유 원소 "타입"을 저장할 Set

        player.soldCards.forEach(card => {
            if (card.requiredElements) {
                card.requiredElements.forEach(elementNumber => {
                    const elementData = PERIODIC_TABLE_DATA.find(el => el.atomicNumber === elementNumber);
                    if (elementData && elementData.type) {
                        uniqueElementTypes.add(elementData.type); // 원소의 실제 타입(분류)을 추가
                    }
                });
            }
        });
        // 규칙: "최종 점수는 카드 점수 + 원소 분류 유형 1점씩입니다." -> 판매한 카드에 포함된 고유한 원소 "분류"의 수만큼 추가점
        finalScore += uniqueElementTypes.size;
        player.finalScore = finalScore;
    });
}

// 승자 가져오기 (플레이어 객체 반환)
function getWinner() {
    return players.slice().sort((a, b) => { // 원본 배열 변경 방지를 위해 slice() 사용
        if (b.finalScore !== a.finalScore) {
            return b.finalScore - a.finalScore;
        }
        const advancedA = a.soldCards.filter(c => c.type === CARD_TYPES.ADVANCED).length;
        const advancedB = b.soldCards.filter(c => c.type === CARD_TYPES.ADVANCED).length;
        if (advancedB !== advancedA) {
            return advancedB - advancedA;
        }
        // 남은 큐브 수가 많은 플레이어가 승리하는 규칙이 있다면 추가
        // return b.cubes - a.cubes;
        return b.dice.length - a.dice.length; // 남은 주사위 수 (또는 다른 동점자 규칙)
    })[0];
}

// 주기율표 레이아웃에서 원소 위치 찾기
function getElementPosition(atomicNumber) {
    // PERIODIC_TABLE_DATA에서 직접 row, col을 찾는 것이 더 효율적일 수 있음
    // 현재 PERIODIC_TABLE_LAYOUT은 원자번호를 값으로 가지므로, 이 방식도 유효함
    for (let r = 0; r < PERIODIC_TABLE_LAYOUT.length; r++) {
        for (let c = 0; c < PERIODIC_TABLE_LAYOUT[r].length; c++) {
            if (PERIODIC_TABLE_LAYOUT[r][c] === atomicNumber) {
                return { row: r, col: c }; // 0-indexed row, col 반환
            }
        }
    }
    // 만약 PERIODIC_TABLE_DATA를 사용한다면:
    // const element = PERIODIC_TABLE_DATA.find(el => el.atomicNumber === atomicNumber);
    // if (element) return { row: element.row - 1, col: element.col - 1 }; // 1-indexed를 0-indexed로 변환
    return null;
}

// 전역 노출 (ES6 모듈 사용 시 필요 없어짐, 각 함수/변수 export로 대체)
// window.initGameSetup = initGameSetup;
// ... (다른 전역 노출 함수들도 제거)