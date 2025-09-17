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

    reAssignButton: document.getElementById('re-assign-button'),
    addPlayerButton: document.getElementById('add-player-button'),
    saveButton: document.getElementById('save-button'),
    lockButton: document.getElementById('lock-button'),
    reassignPopup: document.getElementById('reassign-popup'),
    
    saveConfirmPopup: document.getElementById('save-confirm-popup'),
    saveTimestamp: document.getElementById('save-timestamp'),

    // ✅ 인원 초과 팝업 UI 요소 추가
    capacityPopup: document.getElementById('capacity-popup'),

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
            selectElement.value = currentValue; 
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

    addSingleCard: function(nickname, seat) {
        const card = this.createSitCard(nickname, seat);
        card.style.animationDelay = '0s';
        this.sitcardDisplay.appendChild(card);
    },

    updateLockState: function(isLocked) {
        if (isLocked) {
            this.lockButton.textContent = '🔓 잠금해제';
            this.reAssignButton.disabled = true;
            this.addPlayerButton.disabled = true;
            this.saveButton.disabled = true;
        } else {
            this.lockButton.textContent = '🔒 잠금';
            this.reAssignButton.disabled = false;
            this.addPlayerButton.disabled = false;
            this.saveButton.disabled = false;
        }
    }
};