const UI = {
    nicknamesInput: document.getElementById('nicknames'),
    playerCountSpan: document.getElementById('player-count'),
    sitcardDisplay: document.getElementById('sitcard-display'),
    addPlayerPopup: document.getElementById('add-player-popup'),
    newNicknamesInput: document.getElementById('new-nicknames-input'),
    actionButtons: document.querySelectorAll('.action-btn'),

    dealerFixFieldset: document.getElementById('dealer-fix-fieldset'),
    dealerBGroup: document.getElementById('dealer-b-group'),
    dealerASelect: document.getElementById('dealer-a-select'),
    dealerBSelect: document.getElementById('dealer-b-select'),

    // ✅ 재배치 버튼 관련 요소 삭제
    addPlayerButton: document.getElementById('add-player-button'),
    saveButton: document.getElementById('save-button'),
    lockButton: document.getElementById('lock-button'),
    
    saveConfirmPopup: document.getElementById('save-confirm-popup'),
    saveTimestamp: document.getElementById('save-timestamp'),

    capacityPopup: document.getElementById('capacity-popup'),

    historyPopup: document.getElementById('history-popup'),
    historyList: document.getElementById('history-list'),
    loadHistoryButton: document.getElementById('load-history-button'),
    closeHistoryButton: document.getElementById('close-history-button'),

    newGameButton: document.getElementById('new-game-button'),
    newGamePopup: document.getElementById('new-game-popup'),

    getNicknames: function(excludeDealers = false) {
        const names = this.nicknamesInput.value.split('\n').map(name => name.trim()).filter(name => name !== '');
        if (excludeDealers) {
            const fixedDealerA = this.dealerASelect.value;
            const fixedDealerB = this.dealerBSelect.value;
            const fixedDealers = [fixedDealerA, fixedDealerB].filter(d => d && d !== 'none');
            return [...new Set(names)].filter(name => !fixedDealers.includes(name));
        }
        return [...new Set(names)];
    },

    updateDealerDropdowns: function() {
        const allNicknames = this.getNicknames();
        const selectedA = this.dealerASelect.value;
        const selectedB = this.dealerBSelect.value;

        const populate = (selectElement, excludeValue) => {
            const currentValue = selectElement.value;
            selectElement.innerHTML = '<option value="none">--선택--</option>';
            const nicknameSet = new Set(allNicknames);

            if (currentValue && currentValue !== 'none' && !nicknameSet.has(currentValue)) {
                const directOption = new Option(currentValue, currentValue, true, true);
                selectElement.appendChild(directOption);
            }

            allNicknames.forEach(name => {
                if (name !== excludeValue) {
                    const option = new Option(name, name);
                    selectElement.appendChild(option);
                }
            });
            selectElement.value = currentValue && selectElement.querySelector(`option[value="${currentValue}"]`) ? currentValue : 'none';
        };

        populate(this.dealerASelect, selectedB);
        populate(this.dealerBSelect, selectedA);
    },

    displaySitCards: function(assignments) {
        this.sitcardDisplay.innerHTML = '';
        if (!assignments || assignments.length === 0) return;

        let delay = 0;
        const getSortOrder = (seat) => {
            if (seat === '딜A') return 1; if (seat.startsWith('A-')) return 2;
            if (seat === '딜B') return 3; if (seat.startsWith('B-')) return 4;
            return 5;
        };
        const sortedAssignments = [...assignments].sort((a, b) => {
            const orderA = getSortOrder(a.seat); const orderB = getSortOrder(b.seat);
            if (orderA !== orderB) return orderA - orderB;
            const numA = parseInt(a.seat.replace(/[^0-9]/g, '')) || 0;
            const numB = parseInt(b.seat.replace(/[^0-9]/g, '')) || 0;
            return numA - numB;
        });
        sortedAssignments.forEach(assignment => {
            const card = this.createSitCard(assignment.nickname, assignment.seat);
            card.style.animationDelay = `${delay}s`;
            this.sitcardDisplay.appendChild(card);
            delay += 0.05;
        });
    },

    createSitCard: function(nickname, seat) {
        const card = document.createElement('div');
        card.className = 'sitcard';
        card.dataset.seat = seat;
        if (seat === '딜A') card.classList.add('sitcard--dealer-a');
        else if (seat === '딜B') card.classList.add('sitcard--dealer-b');
        else if (seat.startsWith('B-')) card.classList.add('sitcard--table-b');
        const seatNumber = document.createElement('div');
        seatNumber.className = 'seat-number';
        seatNumber.textContent = seat;
        const nicknameDiv = document.createElement('div');
        nicknameDiv.className = 'nickname';
        nicknameDiv.textContent = nickname;
        card.appendChild(seatNumber);
        card.appendChild(nicknameDiv);
        return card;
    },
    
    togglePopup: function(popupElement, show) {
        popupElement.style.display = show ? 'flex' : 'none';
    },

    displayHistory: function(historyData, loadCallback) {
        this.historyList.innerHTML = '';
        if (!historyData || historyData.length === 0) {
            this.historyList.innerHTML = '<p style="text-align: center;">저장된 내역이 없습니다.</p>';
            return;
        }

        historyData.forEach(item => {
            const entry = document.createElement('div');
            entry.className = 'history-item';
            entry.textContent = item.data.savedAtReadable || '시간 정보 없음';
            entry.dataset.key = item.key;
            entry.addEventListener('click', () => {
                if (confirm(`'${entry.textContent}' 내역을 불러오시겠습니까?`)) {
                    loadCallback(item.key);
                }
            });
            this.historyList.appendChild(entry);
        });
    },

    addSingleCard: function(nickname, seat) {
        const card = this.createSitCard(nickname, seat);
        card.style.animationDelay = '0s';
        this.sitcardDisplay.appendChild(card);
    },

    updateLockState: function(isLocked) {
        if (isLocked) {
            this.lockButton.textContent = '🔓 잠금해제';
            // 재배치 버튼이 없으므로 해당 라인 삭제
            this.addPlayerButton.disabled = true;
            this.saveButton.disabled = true;
        } else {
            this.lockButton.textContent = '🔒 잠금';
            // 재배치 버튼이 없으므로 해당 라인 삭제
            this.addPlayerButton.disabled = false;
            this.saveButton.disabled = false;
        }
    }
};