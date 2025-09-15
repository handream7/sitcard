document.addEventListener('DOMContentLoaded', async () => { 
    let sitCardData = {}; 
    let currentAssignments = []; 
    let allSeatsForCurrentGame = []; 

    const assignButton = document.getElementById('assign-button');
    const reAssignButton = document.getElementById('re-assign-button');
    const addPlayerButton = document.getElementById('add-player-button');
    const saveButton = document.getElementById('save-button');
    const confirmAddButton = document.getElementById('confirm-add-button');
    const cancelAddButton = document.getElementById('cancel-add-button');
    
    // ✅ 'fieldset' 대신 '2테이블' 라디오 버튼을 직접 제어합니다.
    const table2Radio = document.querySelector('input[name="table-option"][value="2_table"]');
    const table1Radio = document.querySelector('input[name="table-option"][value="1_table"]');
    const dealerNeededRadio = document.getElementById('dealer-needed');
    const dealerNotNeededRadio = document.getElementById('dealer-not-needed');

    async function loadSitCardData() {
        try {
            const csvUrl = 'https://raw.githubusercontent.com/handream7/sitcard/main/data/sitcard.csv'; 
            const response = await fetch(csvUrl);
            if (!response.ok) throw new Error(`네트워크 응답 오류: ${response.status}`);
            const text = await response.text();
            parseCSV(text);
        } catch (error) {
            console.error('CSV 파일을 불러오는 데 실패했습니다:', error);
            UI.showAlert('온라인 좌석 데이터를 불러올 수 없습니다. F12를 눌러 콘솔을 확인해주세요.');
        }
    }

    function parseCSV(text) {
        const rows = text.split('\n').map(row => row.trim()).map(row => row.split(','));
        if (rows.length < 2) throw new Error("CSV 데이터가 비어있습니다.");
        const headerNameRow = rows[1];
        const t1_needed_start = headerNameRow.indexOf('딜러필요');
        const t1_not_needed_start = headerNameRow.indexOf('딜러불필요');
        const t2_needed_start = headerNameRow.indexOf('딜러필요', t1_not_needed_start);
        const t2_not_needed_start = headerNameRow.indexOf('딜러불필요', t1_not_needed_start + 1);
        if (t1_needed_start === -1 || t1_not_needed_start === -1) {
            throw new Error("CSV 파일에서 '딜러필요' 또는 '딜러불필요' 헤더를 찾을 수 없습니다.");
        }
        for (let i = 2; i < rows.length; i++) {
            const row = rows[i];
            const playerCountKey = row[0];
            if (!playerCountKey) continue;
            sitCardData[playerCountKey] = {};
            const t1_needed = row.slice(t1_needed_start, t1_not_needed_start).filter(Boolean);
            const t1_not_needed = row.slice(t1_not_needed_start, t2_needed_start > -1 ? t2_needed_start : undefined).filter(Boolean);
            if (t1_needed.length > 0 || t1_not_needed.length > 0) {
                sitCardData[playerCountKey]['1_table'] = { needed: t1_needed, notNeeded: t1_not_needed };
            }
            if (t2_needed_start > -1 && t2_not_needed_start > -1) {
                const t2_needed = row.slice(t2_needed_start, t2_not_needed_start).filter(Boolean);
                const t2_not_needed = row.slice(t2_not_needed_start).filter(Boolean);
                if (t2_needed.length > 0 || t2_not_needed.length > 0) {
                    sitCardData[playerCountKey]['2_table'] = { needed: t2_needed, notNeeded: t2_not_needed };
                }
            }
        }
        console.log("좌석 데이터 파싱 완료:", sitCardData);
    }
    
    // ✅ UI 업데이트 로직 수정: '2테이블' 라디오 버튼만 제어
    function updateOptionsUI() {
        const nicknames = UI.getNicknames();
        UI.playerCountSpan.textContent = nicknames.length;
        const playerCountKey = `${nicknames.length}명`;
        const availableOptions = sitCardData[playerCountKey];

        if (availableOptions && availableOptions['2_table']) {
            table2Radio.disabled = false; // 2테이블 옵션이 있으면 활성화
        } else {
            table2Radio.disabled = true; // 없으면 비활성화
            table1Radio.checked = true; // 1테이블로 강제 선택
        }
    }

    function assignSeats() {
        const nicknames = UI.getNicknames();
        if (nicknames.length === 0) { UI.showAlert('닉네임을 입력해주세요.'); return; }
        const tableOption = document.querySelector('input[name="table-option"]:checked').value;
        const dealerOption = document.querySelector('input[name="dealer-option"]:checked').value;
        const playerCountKey = `${nicknames.length}명`;
        const seatConfig = sitCardData[playerCountKey];
        if (!seatConfig || !seatConfig[tableOption]) {
            UI.showAlert(`선택된 조건(${playerCountKey}, ${tableOption.replace('_',' ')})에 대한 좌석 정보가 없습니다.`);
            return;
        }
        const seats = seatConfig[tableOption][dealerOption];
        if (nicknames.length > seats.length) {
            UI.showAlert(`인원 수(${nicknames.length}명)가 배정 가능한 좌석 수(${seats.length}개)보다 많습니다.`);
            return;
        }
        allSeatsForCurrentGame = [...seats];
        currentAssignments = [...nicknames].sort(() => Math.random() - 0.5)
            .map((nickname, i) => ({ nickname, seat: seats[i] }));
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
        const newAssignment = { nickname: newNickname, seat: availableSeats[0] };
        currentAssignments.push(newAssignment);
        UI.addSingleCard(newAssignment.nickname, newAssignment.seat);
        UI.toggleAddPlayerPopup(false);
    }
    
    function saveToFirebase() {
        if (currentAssignments.length === 0) { UI.showAlert('저장할 데이터가 없습니다.'); return; }
        const dataToSave = {
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            tableOption: document.querySelector('input[name="table-option"]:checked').value,
            dealerOption: document.querySelector('input[name="dealer-option"]:checked').value,
            assignments: currentAssignments
        };
        database.ref('sitcard_assignments').push(dataToSave)
            .then(() => UI.showAlert('성공적으로 저장되었습니다!'))
            .catch((error) => console.error("저장 실패:", error));
    }

    function loadLatestAssignment() {
        database.ref('sitcard_assignments').orderByChild('createdAt').limitToLast(1).once('value', (snapshot) => {
            if (snapshot.exists()) {
                const key = Object.keys(snapshot.val())[0];
                const latestData = snapshot.val()[key];
                const playerCount = latestData.assignments.length;
                const playerCountKey = `${playerCount}명`;
                const seatConfig = sitCardData[playerCountKey];
                if (seatConfig && seatConfig[latestData.tableOption]) {
                    currentAssignments = latestData.assignments;
                    allSeatsForCurrentGame = seatConfig[latestData.tableOption][latestData.dealerOption];
                    UI.nicknamesInput.value = currentAssignments.map(p => p.nickname).join('\n');
                    updateOptionsUI();
                    if (latestData.tableOption === '2_table' && !table2Radio.disabled) {
                        table2Radio.checked = true;
                    } else {
                        table1Radio.checked = true;
                    }
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

    UI.nicknamesInput.addEventListener('input', updateOptionsUI);
    assignButton.addEventListener('click', assignSeats);
    reAssignButton.addEventListener('click', assignSeats);
    addPlayerButton.addEventListener('click', () => UI.toggleAddPlayerPopup(true));
    cancelAddButton.addEventListener('click', () => UI.toggleAddPlayerPopup(false));
    confirmAddButton.addEventListener('click', addPlayer);
    saveButton.addEventListener('click', saveToFirebase);

    await loadSitCardData();
    updateOptionsUI();
    loadLatestAssignment();
});