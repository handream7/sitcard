document.addEventListener('DOMContentLoaded', () => { 
    // --- 전역 변수 및 상수 ---
    let currentAssignments = []; 
    let allSeatsForCurrentGame = []; 
    const GAME_DATA_REF = database.ref('sitcard_live_data');
    const HISTORY_REF = database.ref('sitcard_history');

    // --- DOM 요소 ---
    const assignButton = document.getElementById('assign-button');
    // ✅ 재배치 관련 요소 삭제
    const dealerADirectBtn = document.getElementById('dealer-a-direct-btn');
    const dealerBDirectBtn = document.getElementById('dealer-b-direct-btn');
    const confirmAddButton = document.getElementById('confirm-add-button');
    const cancelAddButton = document.getElementById('cancel-add-button');
    const confirmSaveButton = document.getElementById('confirm-save-button');
    const cancelSaveButton = document.getElementById('cancel-save-button');
    const imageSaveButton = document.getElementById('image-save-button');
    const confirmCapacityButton = document.getElementById('confirm-capacity-button');
    const confirmNewGameButton = document.getElementById('confirm-new-game-button');
    const cancelNewGameButton = document.getElementById('cancel-new-game-button');

    const seatPriorities = {
        dealers: ['딜A', '딜B'],
        tableA: ['A-2','A-4','A-6','A-8','A-5','A-7','A-3','A-1','A-9','A-10','A-2(2)','A-7(2)'],
        tableB: ['B-2','B-4','B-6','B-8','B-5','B-7','B-3','B-1','B-9','B-10','B-2(2)','B-7(2)']
    };

    // --- UI 업데이트 ---
    function updateOptionsUI() {
        const playerCount = UI.getNicknames().length;
        UI.playerCountSpan.textContent = playerCount;
        const isDealerNeeded = document.getElementById('dealer-needed').checked;
        const is2Table = document.querySelector('input[name="table-option"][value="2_table"]').checked;
        UI.dealerFixFieldset.style.display = isDealerNeeded ? 'block' : 'none';
        UI.dealerBGroup.style.display = isDealerNeeded && is2Table ? 'block' : 'none';
        if (!is2Table) UI.dealerBSelect.value = 'none';
        UI.updateDealerDropdowns();
    }

    // --- Firebase 실시간 동기화 ---
    function syncWithFirebase() {
        GAME_DATA_REF.on('value', (snapshot) => {
            const data = snapshot.val();
            if (data) {
                UI.nicknamesInput.value = data.nicknamesText || '';
                currentAssignments = data.assignments || [];
                UI.displaySitCards(currentAssignments);
                UI.updateLockState(data.isLocked || false);
                updateOptionsUI();
            } else {
                UI.nicknamesInput.value = '';
                currentAssignments = [];
                UI.displaySitCards([]);
                UI.updateLockState(false);
                updateOptionsUI();
            }
        });
    }

    // --- 핵심 로직: 배정 및 저장 ---
    function assignAndSaveSeats() {
        let nicknames = UI.getNicknames();
        if (nicknames.length === 0) { UI.showAlert('닉네임을 입력해주세요.'); return; }

        const tableOption = document.querySelector('input[name="table-option"]:checked').value;
        const dealerOption = document.querySelector('input[name="dealer-option"]:checked').value;

        const maxCapacity = dealerOption === 'needed' ? 14 : 13;
        if (tableOption === '1_table' && nicknames.length > maxCapacity) {
            UI.togglePopup(UI.capacityPopup, true);
            return;
        }

        if (tableOption === '2_table' && nicknames.length < 10) {
            UI.showAlert('2테이블은 10명 이상부터 가능합니다.'); return;
        }

        let fixedAssignments = [];
        let nonDealerNicknames = [...nicknames];

        if (dealerOption === 'needed') {
            let fixedDealerA = UI.dealerASelect.value;
            let fixedDealerB = UI.dealerBSelect.value;

            if (fixedDealerA && fixedDealerA !== 'none') {
                nonDealerNicknames = nonDealerNicknames.filter(n => n !== fixedDealerA);
            } else {
                if(nonDealerNicknames.length > 0) fixedDealerA = nonDealerNicknames.splice(Math.floor(Math.random() * nonDealerNicknames.length), 1)[0];
            }
            if(fixedDealerA) fixedAssignments.push({ nickname: fixedDealerA, seat: '딜A' });

            if (tableOption === '2_table') {
                if (fixedDealerB && fixedDealerB !== 'none') {
                    nonDealerNicknames = nonDealerNicknames.filter(n => n !== fixedDealerB);
                } else {
                    if(nonDealerNicknames.length > 0) fixedDealerB = nonDealerNicknames.splice(Math.floor(Math.random() * nonDealerNicknames.length), 1)[0];
                }
                if(fixedDealerB) fixedAssignments.push({ nickname: fixedDealerB, seat: '딜B' });
            }
        }
        
        nonDealerNicknames.sort(() => Math.random() - 0.5);
        let nonDealerSeats = [];
        if (tableOption === '1_table') {
            nonDealerSeats.push(...seatPriorities.tableA.slice(0, nonDealerNicknames.length));
        } else {
            const playersForA = Math.ceil(nonDealerNicknames.length / 2);
            const playersForB = Math.floor(nonDealerNicknames.length / 2);
            nonDealerSeats.push(...seatPriorities.tableA.slice(0, playersForA));
            nonDealerSeats.push(...seatPriorities.tableB.slice(0, playersForB));
        }
        const nonDealerAssignments = nonDealerNicknames.map((n, i) => ({ nickname: n, seat: nonDealerSeats[i] }));
        
        const newGameData = {
            nicknamesText: UI.nicknamesInput.value,
            assignments: [...fixedAssignments, ...nonDealerAssignments],
            isLocked: false,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        };
        
        GAME_DATA_REF.set(newGameData);
    }

    // --- 추가 배치 로직 ---
    function addPlayers() {
        const newNicknames = UI.newNicknamesInput.value.split('\n').map(n => n.trim()).filter(Boolean);
        if (newNicknames.length === 0) { UI.showAlert('추가할 닉네임을 입력해주세요.'); return; }

        const existingAssignments = currentAssignments.map(a => a.nickname);
        const uniqueNewNicknames = newNicknames.filter(n => !existingAssignments.includes(n));
        
        if (uniqueNewNicknames.length !== newNicknames.length) {
            UI.showAlert('이미 배정된 닉네임은 제외되었습니다.');
        }
        if (uniqueNewNicknames.length === 0) {
            UI.togglePopup(UI.addPlayerPopup, false);
            UI.newNicknamesInput.value = '';
            return;
        }
        
        let tableOption = '1_table';
        const assignedSeats = currentAssignments.map(a => a.seat);
        if (assignedSeats.some(s => s.startsWith('B-') || s === '딜B')) {
            tableOption = '2_table';
        }

        let availableASeats = seatPriorities.tableA.filter(s => !assignedSeats.includes(s));
        
        if (tableOption === '1_table') {
            uniqueNewNicknames.forEach(nickname => {
                const seatToAssign = availableASeats.shift();
                if (seatToAssign) {
                    currentAssignments.push({ nickname: nickname, seat: seatToAssign });
                } else {
                    UI.showAlert(`'${nickname}'을 배정할 빈 자리가 없습니다.`);
                }
            });
        } else {
            let tableACount = currentAssignments.filter(a => a.seat.startsWith('A-')).length;
            let tableBCount = currentAssignments.filter(a => a.seat.startsWith('B-')).length;
            let availableBSeats = seatPriorities.tableB.filter(s => !assignedSeats.includes(s));

            uniqueNewNicknames.forEach(nickname => {
                let seatToAssign = null;
                if (tableACount > tableBCount) {
                    seatToAssign = availableBSeats.shift();
                    if (seatToAssign) tableBCount++;
                    else seatToAssign = availableASeats.shift();
                } else {
                    seatToAssign = availableASeats.shift();
                    if (seatToAssign) tableACount++;
                    else seatToAssign = availableBSeats.shift();
                }

                if (seatToAssign) {
                    currentAssignments.push({ nickname: nickname, seat: seatToAssign });
                } else {
                    UI.showAlert(`'${nickname}'을 배정할 빈 자리가 없습니다.`);
                }
            });
        }

        const currentNicknames = UI.getNicknames();
        const finalNicknames = [...new Set([...currentNicknames, ...uniqueNewNicknames])];
        
        GAME_DATA_REF.update({
            assignments: currentAssignments,
            nicknamesText: finalNicknames.join('\n')
        });

        UI.togglePopup(UI.addPlayerPopup, false);
        UI.newNicknamesInput.value = '';
    }

    // --- 저장 확인 팝업 로직 ---
    function confirmAndSaveState() {
        if (currentAssignments.length === 0) { UI.showAlert('저장할 내역이 없습니다.'); return; }
        const now = new Date();
        const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
        UI.saveTimestamp.textContent = timestamp;
        UI.togglePopup(UI.saveConfirmPopup, true);
    }

    // --- 실제 Firebase에 기록 저장 ---
    function saveHistory() {
        UI.togglePopup(UI.saveConfirmPopup, false);
        GAME_DATA_REF.get().then((snapshot) => {
            if (snapshot.exists()) {
                const dataToSave = snapshot.val();
                dataToSave.savedAtReadable = UI.saveTimestamp.textContent;
                dataToSave.savedAt = firebase.database.ServerValue.TIMESTAMP;
                HISTORY_REF.push(dataToSave)
                    .then(() => {
                        UI.showAlert('성공적으로 저장되었습니다!');
                    });
            }
        });
    }

    // --- 직접 입력 핸들러 ---
    function handleDirectInput(dealerType) {
        const select = dealerType === 'A' ? UI.dealerASelect : UI.dealerBSelect;
        const name = prompt(`'딜${dealerType}' 닉네임:`);
        if (name && name.trim() !== '') {
            if (!Array.from(select.options).find(o => o.value === name)) {
                select.add(new Option(name, name, true, true));
            }
            select.value = name;
            updateOptionsUI();
        }
    }

    // --- 이미지 저장 함수 ---
    function saveCardsAsImage() {
        const captureArea = document.getElementById('sitcard-display');
        if (captureArea.children.length === 0) {
            UI.showAlert('저장할 싯카드 내역이 없습니다.');
            return;
        }

        Array.from(captureArea.children).forEach(card => {
            card.style.animation = 'none';
            card.style.opacity = '1';
            card.style.transform = 'none';
        });

        setTimeout(() => {
            html2canvas(captureArea, {
                backgroundColor: getComputedStyle(document.querySelector('.container')).backgroundColor,
                scale: 2 
            }).then(canvas => {
                const now = new Date();
                const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}${String(now.getSeconds()).padStart(2, '0')}`;
                const filename = `sitcard_${timestamp}.png`;
                
                const link = document.createElement('a');
                link.download = filename;
                link.href = canvas.toDataURL("image/png");
                link.click();

                Array.from(captureArea.children).forEach(card => {
                    card.style.animation = '';
                    card.style.opacity = '';
                    card.style.transform = '';
                });

            });
        }, 100);
    }
    
    // --- 저장 내역 불러오기 로직 ---
    function fetchAndShowHistory() {
        HISTORY_REF.orderByChild('savedAt').limitToLast(50).once('value', (snapshot) => {
            if (snapshot.exists()) {
                const data = snapshot.val();
                const historyArray = Object.keys(data).map(key => ({
                    key: key,
                    data: data[key]
                })).reverse();
                UI.displayHistory(historyArray, loadHistoryEntry);
            } else {
                UI.displayHistory([]);
            }
            UI.togglePopup(UI.historyPopup, true);
        });
    }
    
    function loadHistoryEntry(key) {
        HISTORY_REF.child(key).get().then((snapshot) => {
            if (snapshot.exists()) {
                const historyData = snapshot.val();
                const gameData = {
                    assignments: historyData.assignments,
                    nicknamesText: historyData.nicknamesText,
                    isLocked: false, 
                    timestamp: firebase.database.ServerValue.TIMESTAMP
                };
                GAME_DATA_REF.set(gameData);
                UI.togglePopup(UI.historyPopup, false);
            }
        });
    }

    // --- 이벤트 리스너 설정 ---
    const allOptionRadios = document.querySelectorAll('input[name="table-option"], input[name="dealer-option"]');
    allOptionRadios.forEach(radio => radio.addEventListener('change', updateOptionsUI));
    
    UI.nicknamesInput.addEventListener('input', updateOptionsUI);
    UI.dealerASelect.addEventListener('change', updateOptionsUI);
    UI.dealerBSelect.addEventListener('change', updateOptionsUI);
    dealerADirectBtn.addEventListener('click', () => handleDirectInput('A'));
    dealerBDirectBtn.addEventListener('click', () => handleDirectInput('B'));

    assignButton.addEventListener('click', assignAndSaveSeats);
    
    // ✅ 재배치 리스너 삭제
    
    UI.addPlayerButton.addEventListener('click', () => UI.togglePopup(UI.addPlayerPopup, true));
    confirmAddButton.addEventListener('click', addPlayers);
    cancelAddButton.addEventListener('click', () => { UI.togglePopup(UI.addPlayerPopup, false); UI.newNicknamesInput.value = ''; });

    UI.saveButton.addEventListener('click', confirmAndSaveState);
    confirmSaveButton.addEventListener('click', saveHistory);
    cancelSaveButton.addEventListener('click', () => UI.togglePopup(UI.saveConfirmPopup, false));
    
    UI.lockButton.addEventListener('click', () => {
        GAME_DATA_REF.child('isLocked').get().then((snapshot) => {
            const isCurrentlyLocked = snapshot.val() || false;
            GAME_DATA_REF.child('isLocked').set(!isCurrentlyLocked);
        });
    });

    imageSaveButton.addEventListener('click', saveCardsAsImage);
    confirmCapacityButton.addEventListener('click', () => UI.togglePopup(UI.capacityPopup, false));
    
    UI.loadHistoryButton.addEventListener('click', fetchAndShowHistory);
    UI.closeHistoryButton.addEventListener('click', () => UI.togglePopup(UI.historyPopup, false));
    
    UI.newGameButton.addEventListener('click', () => UI.togglePopup(UI.newGamePopup, true));
    confirmNewGameButton.addEventListener('click', () => { GAME_DATA_REF.set(null); UI.togglePopup(UI.newGamePopup, false); });
    cancelNewGameButton.addEventListener('click', () => UI.togglePopup(UI.newGamePopup, false));

    // --- 초기화 ---
    updateOptionsUI();
    syncWithFirebase();
});