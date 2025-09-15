// UI 관련 함수들을 모아놓은 모듈
const UI = {
    nicknamesInput: document.getElementById('nicknames'),
    playerCountSpan: document.getElementById('player-count'),
    sitcardDisplay: document.getElementById('sitcard-display'),
    addPlayerPopup: document.getElementById('add-player-popup'),
    newNicknameInput: document.getElementById('new-nickname-input'),
    actionButtons: document.querySelectorAll('.action-btn'),

    // 플레이어 수 업데이트
    updatePlayerCount: function() {
        const nicknames = this.getNicknames();
        this.playerCountSpan.textContent = nicknames.length;
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
        assignments.forEach(assignment => {
            const card = this.createSitCard(assignment.nickname, assignment.seat);
            card.style.animationDelay = `${delay}s`;
            this.sitcardDisplay.appendChild(card);
            delay += 0.05; // 각 카드가 순차적으로 나타나도록 딜레이
        });
        
        if(assignments.length > 0){
            this.enableActionButtons();
        }
    },

    // 싯카드 HTML 요소 생성
    createSitCard: function(nickname, seat) {
        const card = document.createElement('div');
        card.className = 'sitcard';
        card.dataset.seat = seat; // 데이터 속성으로 자리 번호 저장

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