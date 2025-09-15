document.addEventListener('DOMContentLoaded', () => {
    // 전역 상태 변수
    let sitCardData = {}; // CSV에서 파싱한 좌석 데이터
    let currentAssignments = []; // 현재 배정된 좌석 정보
    let allSeatsForCurrentGame = []; // 현재 게임에서 사용 가능한 모든 좌석 목록

    // --- DOM 요소 가져오기 ---
    const assignButton = document.getElementById('assign-button');
    const reAssignButton = document.getElementById('re-assign-button');
    const addPlayerButton = document.getElementById('add-player-button');
    const saveButton = document.getElementById('save-button');
    const confirmAddButton = document.getElementById('confirm-add-button');
    const cancelAddButton = document.getElementById('cancel-add-button');

    // --- 데이터 로딩 ---
    async function loadSitCardData() {
        try {
            // ✅ 이 URL이 'raw.githubusercontent.com'을 포함하는 Raw URL인지 다시 한번 확인해주세요!
            const csvUrl = 'https://raw.githubusercontent.com/handream7/sitcard/refs/heads/main/data/sitcard.csv'; // 여기에 복사한 URL을 붙여넣으세요.
            const response = await fetch(csvUrl);
            
            if (!response.ok) {
                throw new Error(`네트워크 응답 오류: ${response.status} ${response.statusText}`);
            }

            const text = await response.text();
            parseCSV(text);
        } catch (error) {
            console.error('CSV 파일을 불러오는 데 실패했습니다:', error);
            UI.showAlert('온라인 좌석 데이터를 불러올 수 없습니다. F12를 눌러 콘솔을 확인해주세요.');
        }
    }

    // ✨✨✨ 오류 방어 기능이 추가된 새로운 parseCSV 함수 ✨✨✨
    function parseCSV(text) {
        // 1. 빈 줄을 먼저 제거해서 데이터의 신뢰성을 높입니다.
        const rows = text.split('\n')
            .map(row => row.trim())
            .filter(row => row) // 빈 줄 삭제
            .map(row => row.split(','));

        // 2. 가장 중요한 헤더(두 번째 줄) 데이터가 있는지 확인합니다.
        if (rows.length < 2 || !rows[1]) {
            const errorMessage = "CSV 데이터 형식이 잘못되었습니다. 헤더(두 번째 줄)를 찾을 수 없습니다.";
            console.error(errorMessage, rows); // 콘솔에 현재 rows 상태를 출력하여 디버깅을 도움
            throw new Error(errorMessage);
        }

        const headerRow = rows[1];
        const dealerNotNeededStartIndex = headerRow.findIndex(header => header.includes('딜러불필요'));

        // 3. '딜러불필요' 키워드를 찾았는지 확인합니다.
        if (dealerNotNeededStartIndex === -1) {
            const errorMessage = "'딜러불필요' 키워드를 헤더(두 번째 줄)에서 찾을 수 없습니다.";
            console.error(errorMessage, headerRow);
            throw new Error(errorMessage);
        }

        // 4. 실제 데이터 처리 (세 번째 줄부터)
        for (let i = 2; i < rows.length; i++) {
            const row = rows[i];
            const playerCountKey = row[0];
            if (!playerCountKey) continue;

            const neededSeats = row.slice(2, dealerNotNeededStartIndex).filter(Boolean);
            const notNeededSeats = row.slice(dealerNotNeededStartIndex).filter(Boolean);

            sitCardData[playerCountKey] = {
                needed: neededSeats,
                notNeeded: notNeededSeats
            };
        }
        console.log("좌석 데이터 파싱 성공:", sitCardData); // 성공 시 콘솔에 로그
    }

    // --- 핵심 로직 함수 ---
    function assignSeats() {
        const nicknames = UI.getNicknames();
        const playerCount = nicknames.length;

        if (playerCount === 0) {
            UI.showAlert('닉네임을 입력해주세요.');
            return;
        }

        const dealerOption = document.querySelector('input[name="dealer-option"]:checked').value;
        const playerCountKey = `${playerCount}명`;
        
        const seatConfig = sitCardData[playerCountKey];

        if (!seatConfig) {
            UI.showAlert(`${playerCount}명에 대한 좌석 정보가 없습니다.`);
            return;
        }

        const seats = seatConfig[dealerOption];

        if (nicknames.length > seats.length) {
            UI.showAlert(`인원 수(${nicknames.length}명)가 배정 가능한 좌석 수(${seats.length}개)보다 많습니다.`);
            return;
        }

        const shuffledNicknames = [...nicknames].sort(() => Math.random() - 0.5);
        
        allSeatsForCurrentGame = [...seats];
        currentAssignments = [];

        for (let i = 0; i < shuffledNicknames.length; i++) {
            currentAssignments.push({
                nickname: shuffledNicknames[i],
                seat: seats[i]
            });
        }
        
        UI.displaySitCards(currentAssignments);
    }

    function addPlayer() {
        const newNickname = UI.newNicknameInput.value.trim();
        if (!newNickname) {
            UI.showAlert('추가할 닉네임을 입력해주세요.');
            return;
        }

        const isDuplicate = currentAssignments.some(p => p.nickname.toLowerCase() === newNickname.toLowerCase());
        if(isDuplicate) {
            UI.showAlert('이미 존재하는 닉네임입니다.');
            return;
        }

        const assignedSeats = currentAssignments.map(a => a.seat);
        const availableSeats = allSeatsForCurrentGame.filter(seat => !assignedSeats.includes(seat));

        if (availableSeats.length === 0) {
            UI.showAlert('앉을 수 있는 빈자리가 없습니다.');
            return;
        }

        const newSeat = availableSeats[0];
        const newAssignment = { nickname: newNickname, seat: newSeat };
        currentAssignments.push(newAssignment);
        
        UI.addSingleCard(newAssignment.nickname, newAssignment.seat);
        UI.toggleAddPlayerPopup(false);
    }
    
    function saveToFirebase() {
        if (currentAssignments.length === 0) {
            UI.showAlert('저장할 데이터가 없습니다.');
            return;
        }
        
        const timestamp = new Date().toISOString();
        const dataToSave = {
            createdAt: timestamp,
            assignments: currentAssignments
        };

        database.ref('sitcard_assignments/' + Date.now()).set(dataToSave)
            .then(() => {
                UI.showAlert('성공적으로 저장되었습니다!');
            })
            .catch((error) => {
                console.error("저장 실패:", error);
                UI.showAlert('저장에 실패했습니다. 콘솔을 확인해주세요.');
            });
    }

    // --- 이벤트 리스너 설정 ---
    UI.nicknamesInput.addEventListener('input', UI.updatePlayerCount.bind(UI));
    assignButton.addEventListener('click', assignSeats);
    reAssignButton.addEventListener('click', assignSeats);
    
    addPlayerButton.addEventListener('click', () => UI.toggleAddPlayerPopup(true));
    cancelAddButton.addEventListener('click', () => UI.toggleAddPlayerPopup(false));
    confirmAddButton.addEventListener('click', addPlayer);

    saveButton.addEventListener('click', saveToFirebase);

    // --- 초기화 ---
    loadSitCardData();
});