document.addEventListener('DOMContentLoaded', async () => { 
    // 전역 상태 변수
    let sitCardData = {}; 
    let currentAssignments = []; 
    let allSeatsForCurrentGame = []; 

    // --- DOM 요소 가져오기 ---
    const assignButton = document.getElementById('assign-button');
    const reAssignButton = document.getElementById('re-assign-button');
    const addPlayerButton = document.getElementById('add-player-button');
    const saveButton = document.getElementById('save-button');
    const confirmAddButton = document.getElementById('confirm-add-button');
    const cancelAddButton = document.getElementById('cancel-add-button');
    const table1Radio = document.getElementById('table-1');
    const table2Radio = document.getElementById('table-2');
    const dealerNeededRadio = document.getElementById('dealer-needed');
    const dealerNotNeededRadio = document.getElementById('dealer-not-needed');

    // --- 데이터 로딩 ---
    async function loadSitCardData() {
        try {
            // ✅ handream7 아이디 반영, '저장소이름'은 본인 것으로 변경 필수!
            const csvUrl = 'https://raw.githubusercontent.com/handream7/sitcard/main/data/sitcard.csv';
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

    // ✅ 1테이블/2테이블 구조를 인식하도록 파싱 로직 전면 수정
    function parseCSV(text) {
        const rows = text.split('\n').map(row => row.trim()).map(row => row.split(','));
        if (rows.length < 2) throw new Error("CSV 데이터가 비어있습니다.");

        const headerDefRow = rows[0]; // 1,2,3...24,1,2,3...24
        const headerNameRow = rows[1]; // 딜러필요, 딜러불필요

        // 2테이블 데이터가 시작되는 컬럼 인덱스 찾기
        const table2StartIdx = headerDefRow.indexOf('1', 5); // 5번째 컬럼 이후의 '1'을 찾음

        // 1테이블의 '딜러불필요' 시작 컬럼 인덱스
        const table1NotNeededIdx = headerNameRow.indexOf('딜러불필요');

        // 2테이블의 '딜러불필요' 시작 컬럼 인덱스
        const table2NotNeededIdx = table2StartIdx !== -1 ? headerNameRow.indexOf('딜러불필요', table2StartIdx) : -1;

        for (let i = 2; i < rows.length; i++) {
            const row = rows[i];
            const playerCountKey = row[0];
            if (!playerCountKey) continue;

            sitCardData[playerCountKey] = {};

            // --- 1테이블 데이터 파싱 ---
            const t1_needed = row.slice(2, table1NotNeededIdx).filter(Boolean);
            const t1_not_needed = row.slice(table1NotNeededIdx, table2StartIdx > 0 ? table2StartIdx : undefined).filter(Boolean);
            if (t1_needed.length > 0 || t1_not_needed.length > 0) {
                sitCardData[playerCountKey]['1_table'] = { needed: t1_needed, notNeeded: t1_not_needed };
            }

            // --- 2테이블 데이터 파싱 (존재하는 경우) ---
            if (table2StartIdx !== -1 && table2NotNeededIdx !== -1) {
                const t2_needed = row.slice(table2StartIdx, table2NotNeededIdx).filter(Boolean);
                const t2_not_needed = row.slice(table2NotNeededIdx).filter(Boolean);
                if (t2_needed.length > 0 || t2_not_needed.length > 0) {
                    sitCardData[playerCountKey]['2_table'] = { needed: t2_needed, notNeeded: t2_not_needed };
                }
            }
        }
        console.log("좌석 데이터 파싱 완료:", sitCardData);
    }

    // --- 핵심 로직 함수 ---
    function assignSeats() {
        const nicknames = UI.getNicknames();
        const playerCount = nicknames.length;
        if (playerCount === 0) {
            UI.showAlert('닉네임을 입력해주세요.');
            return;
        }

        const tableOption = document.querySelector('input[name="table-option"]:checked').value;
        const dealerOption = document.querySelector('input[name="dealer-option"]:checked').value;
        const playerCountKey = `${playerCount}명`;
        
        const seatConfig = sitCardData[playerCountKey];
        if (!seatConfig || !seatConfig[tableOption]) {
            UI.showAlert(`선택된 조건(${playerCount}명, ${tableOption.replace('_',' ')})에 대한 좌석 정보가 없습니다.`);
            return;
        }

        const seats = seatConfig[tableOption][dealerOption];
        if (nicknames.length > seats.length) {
            UI.showAlert(`인원 수(${nicknames.length}명)가 배정 가능한 좌석 수(${seats.length}개)보다 많습니다.`);
            return;
        }

        const shuffledNicknames = [...nicknames].sort(() => Math.random() - 0.5);
        allSeatsForCurrentGame = [...seats];
        currentAssignments = [];
        for (let i = 0; i < shuffledNicknames.length; i++) {
            currentAssignments.push({ nickname: shuffledNicknames[i], seat: seats[i] });
        }
        UI.displaySitCards(currentAssignments);
    }

    function addPlayer() {
        const newNickname = UI.newNicknameInput.value.trim();
        if (!newNickname) { UI.showAlert('추가할 닉네임을 입력해주세요.'); return; }
        if (currentAssignments.some(p => p.nickname.toLowerCase() === newNickname.toLowerCase())) {
            UI.showAlert('이미 존재하는 닉네임입니다.'); return;
        }
        const assignedSeats = currentAssignments.map(a => a.seat);
        const availableSeats = allSeatsForCurrentGame.filter(seat => !assignedSeats.includes(seat));
        if (availableSeats.length === 0) { UI.showAlert('앉을 수 있는 빈자리가 없습니다.'); return; }

        const newSeat = availableSeats[0];
        const newAssignment = { nickname: newNickname, seat: newSeat };
        currentAssignments.push(newAssignment);
        UI.addSingleCard(newAssignment.nickname, newAssignment.seat);
        UI.toggleAddPlayerPopup(false);
    }
    
    // ✅ 저장 함수에 테이블 옵션 추가
    function saveToFirebase() {
        if (currentAssignments.length === 0) {
            UI.showAlert('저장할 데이터가 없습니다.');
            return;
        }
        const tableOption = document.querySelector('input[name="table-option"]:checked').value;
        const dealerOption = document.querySelector('input[name="dealer-option"]:checked').value;
        const dataToSave = {
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            tableOption: tableOption, // 테이블 옵션 저장
            dealerOption: dealerOption,
            assignments: currentAssignments
        };
        database.ref('sitcard_assignments').push(dataToSave)
            .then(() => UI.showAlert('성공적으로 저장되었습니다!'))
            .catch((error) => {
                console.error("저장 실패:", error);
                UI.showAlert('저장에 실패했습니다. 콘솔을 확인해주세요.');
            });
    }

    // ✅ 불러오기 함수에 테이블 옵션 복원 기능 추가
    function loadLatestAssignment() {
        database.ref('sitcard_assignments').orderByChild('createdAt').limitToLast(1).once('value', (snapshot) => {
            if (snapshot.exists()) {
                const key = Object.keys(snapshot.val())[0];
                const latestData = snapshot.val()[key];
                
                const playerCount = latestData.assignments.length;
                const playerCountKey = `${playerCount}명`;
                const seatConfig = sitCardData[playerCountKey];

                if (seatConfig && seatConfig[latestData.tableOption]) {
                    console.log("불러온 데이터:", latestData);
                    
                    // 상태 복원
                    currentAssignments = latestData.assignments;
                    allSeatsForCurrentGame = seatConfig[latestData.tableOption][latestData.dealerOption];
                    
                    // UI 복원
                    UI.nicknamesInput.value = currentAssignments.map(p => p.nickname).join('\n');
                    UI.updatePlayerOptions(sitCardData); // 옵션 UI 업데이트
                    
                    if (latestData.tableOption === '2_table') table2Radio.checked = true;
                    else table1Radio.checked = true;

                    if (latestData.dealerOption === 'needed') dealerNeededRadio.checked = true;
                    else dealerNotNeededRadio.checked = true;
                    
                    UI.displaySitCards(currentAssignments);
                    UI.showAlert('마지막으로 저장된 좌석 정보를 불러왔습니다.');
                }
            } else {
                console.log("저장된 좌석 정보가 없습니다.");
            }
        });
    }

    // --- 이벤트 리스너 설정 ---
    UI.nicknamesInput.addEventListener('input', () => UI.updatePlayerOptions(sitCardData));
    assignButton.addEventListener('click', assignSeats);
    reAssignButton.addEventListener('click', assignSeats);
    addPlayerButton.addEventListener('click', () => UI.toggleAddPlayerPopup(true));
    cancelAddButton.addEventListener('click', () => UI.toggleAddPlayerPopup(false));
    confirmAddButton.addEventListener('click', addPlayer);
    saveButton.addEventListener('click', saveToFirebase);

    // --- 초기화 ---
    await loadSitCardData();
    loadLatestAssignment();
});