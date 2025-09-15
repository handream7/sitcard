// UI 관련 함수들을 모아놓은 모듈
const UI = {
    nicknamesInput: document.getElementById('nicknames'),
    playerCountSpan: document.getElementById('player-count'),
    sitcardDisplay: document.getElementById('sitcard-display'),
    addPlayerPopup: document.getElementById('add-player-popup'),
    newNicknameInput: document.getElementById('new-nickname-input'),
    actionButtons: document.querySelectorAll('.action-btn'),
    tableSelectionGroup: document.getElementById('table-selection-group'), // ✅ 추가

    // 플레이어 수 업데이트 + 옵션 UI 업데이트
    updatePlayerOptions: function(sitCardData) {
        const nicknames = this.getNicknames();
        this.playerCountSpan.textContent = nicknames.length;
        
        const playerCountKey = `${nicknames.length}명`;
        const availableOptions = sitCardData[playerCountKey];

        // 2테이블 옵션이 있으면 UI 표시, 없으면 숨김
        if (availableOptions && availableOptions['2_table']) {
            this.toggleTableSelection(true);
        } else {
            this.toggleTableSelection(false);
        }
    },

    // ✅ 추가: 테이블 선택 UI 표시/숨김 함수
    toggleTableSelection: function(show) {
        this.tableSelectionGroup.style.display = show ? 'block' : 'none';
        if (!show) {
            // 숨겨질 때는 항상 1테이블을 기본값으로 선택
            document.querySelector('input[name="table-option"][value="1_table"]').checked = true;
        }
    },
    
    // 입력된 닉네임 목록 가져오기 (공백, 중복 제거)
    getNicknames: function() {
        const names = this.nicknamesInput.value
            .split('\n')
            .map(name => name.trim())
            .filter(name => name !== '');
        return [...new Set(names)]; // 중복 제거
    },

    // 싯카드들을 화면에 표시
    displaySitCards: function(assignments) {
        this.sitcardDisplay.innerHTML = '';
        let delay = 0;
        // 좌석 번호 순서대로 정렬하여 표시
        const sortedAssignments = [...assignments].sort((a, b) => {
            const numA = parseInt(a.seat.replace(/[^0-9]/g, ''));
            const numB = parseInt(b.seat.replace(/[^0-9]/g, ''));
            if (a.seat.startsWith('B') && b.seat.startsWith('A')) return 1;
            if (a.seat.startsWith('A') && b.seat.startsWith('B')) return -1;
            return numA - numB;
        });

        sortedAssignments.forEach(assignment => {
            const card = this.createSitCard(assignment.nickname, assignment.seat);
            card.style.animationDelay = `${delay}s`;
            this.sitcardDisplay.appendChild(card);
            delay += 0.05;
        });
        
        if(assignments.length > 0){
            this.enableActionButtons();
        }
    },

    // 싯카드 HTML 요소 생성
    createSitCard: function(nickname, seat) {
        const card = document.createElement('div');
        card.className = 'sitcard';
        card.dataset.seat = seat;

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
    
    // 추가 인원 팝업 표시/숨김
    toggleAddPlayerPopup: function(show) {
        this.addPlayerPopup.style.display = show ? 'flex' : 'none';
        if (show) {
            this.newNicknameInput.value = '';
            this.newNicknameInput.focus();
        }
    },

    // 새로 추가된 플레이어 카드만 표시
    addSingleCard: function(nickname, seat) {
        const card = this.createSitCard(nickname, seat);
        card.style.animationDelay = '0s';
        this.sitcardDisplay.appendChild(card);
    },

    // 결과 출력 후 액션 버튼들 활성화
    enableActionButtons: function() {
        this.actionButtons.forEach(btn => btn.disabled = false);
    },

    // 알림 메시지
    showAlert: function(message) {
        alert(message);
    }
};