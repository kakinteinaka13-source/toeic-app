let allMasterData = []; 
let currentQuizSet = []; 
let currentNum = 0;
let score = 0;
let wrongList = [];

const soundCorrect = new Audio('correct.mp3');
const soundWrong = new Audio('wrong.mp3');

// --- LocalStorage操作 ---
function getWeakData() {
    const data = localStorage.getItem('toeic_weak_words');
    return data ? JSON.parse(data) : {};
}

function saveWeakData(word) {
    let weakData = getWeakData();
    weakData[word] = (weakData[word] || 0) + 1;
    localStorage.setItem('toeic_weak_words', JSON.stringify(weakData));
}

function clearWeakData() {
    if(confirm("これまでの間違い記録をすべて消去しますか？")) {
        localStorage.removeItem('toeic_weak_words');
        showMenu();
    }
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

async function initApp() {
    try {
        const response = await fetch('data.json');
        allMasterData = await response.json();
        showMenu();
    } catch (error) {
        console.error("読み込み失敗:", error);
    }
}

function showMenu() {
    const quizArea = document.getElementById('quiz-area');
    const weakData = getWeakData();
    const weakCount = Object.keys(weakData).length; // 苦手単語の数

    quizArea.innerHTML = `
        <h1>TOEIC単語マスター</h1>
        <p>全 ${allMasterData.length} 問</p>
        
        <button onclick="startQuiz(false)" class="btn menu-btn">通常モード (10問)</button>
        
        <button onclick="startWeakMode()" class="btn menu-btn" style="background:#ff5722; color:white;" ${weakCount === 0 ? 'disabled' : ''}>
            弱点克服モード (${weakCount}問)
        </button>
        
        <button onclick="showWeakWords()" class="btn" style="background:#f0f0f0; margin-top:20px;">苦手単語を確認</button>
    `;
    
    if(weakCount === 0) {
        quizArea.innerHTML += `<p style="font-size:0.8rem; color:gray;">※一度間違えると弱点モードが選べます</p>`;
    }
}

// 【追加】弱点克服モード開始
function startWeakMode() {
    const weakData = getWeakData();
    const weakWords = Object.keys(weakData); // 間違えたことのある単語のリスト
    
    // allMasterDataの中から、間違えたことのある単語だけを抜き出す
    let weakList = allMasterData.filter(item => weakWords.includes(item.word));
    
    if (weakList.length === 0) {
        alert("苦手な単語がまだありません！");
        return;
    }

    // 弱点リストをシャッフルしてセット
    currentQuizSet = shuffle([...weakList]); 
    // ※もし弱点が多くなっても10問に絞るなら .slice(0, 10) を追加してください
    
    currentNum = 0;
    score = 0;
    wrongList = [];
    showQuestion();
}

// 苦手ランキング画面
function showWeakWords() {
    const weakData = getWeakData();
    const quizArea = document.getElementById('quiz-area');
    const sorted = Object.entries(weakData).sort((a, b) => b[1] - a[1]);

    let listHTML = `<h2>苦手単語ワースト</h2>`;
    listHTML += `<div style="text-align:left; margin-bottom:20px; max-height:200px; overflow-y:auto;">`;
    
    if (sorted.length === 0) {
        listHTML += `<p style="text-align:center;">まだ記録がありません</p>`;
    } else {
        listHTML += `<table style="width:100%; border-collapse:collapse;">`;
        sorted.forEach(([word, count]) => {
            listHTML += `<tr style="border-bottom:1px solid #eee;">
                            <td style="padding:8px;">${word}</td>
                            <td style="padding:8px; text-align:right; color:red;">${count}回ミス</td>
                         </tr>`;
        });
        listHTML += `</table>`;
    }
    listHTML += `</div>`;
    listHTML += `<button onclick="showMenu()" class="btn">戻る</button>`;
    listHTML += `<button onclick="clearWeakData()" class="btn" style="font-size:0.8rem; background:#eee; color:#666;">記録をリセット</button>`;
    
    quizArea.innerHTML = listHTML;
}

function startQuiz(isReview = false) {
    if (isReview) {
        currentQuizSet = shuffle([...wrongList]);
    } else {
        let shuffledAll = shuffle([...allMasterData]);
        currentQuizSet = shuffledAll.slice(0, 10); 
    }

    currentNum = 0;
    score = 0;
    wrongList = []; 
    showQuestion();
}

function showQuestion() {
    const q = currentQuizSet[currentNum];
    const quizArea = document.getElementById('quiz-area');
    const shuffledChoices = shuffle([...q.choices]);

    quizArea.innerHTML = `
        <div class="progress">${currentNum + 1} / ${currentQuizSet.length}</div>
        <h1 class="word">${q.word}</h1>
        <div id="options-area"></div>
        <div id="feedback" style="margin-top:20px; font-weight:bold; min-height:1.5em;"></div>
    `;

    const optionsArea = document.getElementById('options-area');
    shuffledChoices.forEach(choice => {
        const btn = document.createElement('button');
        btn.innerText = choice;
        btn.className = 'btn choice-btn';
        btn.onclick = () => checkAnswer(choice, q.answer);
        optionsArea.appendChild(btn);
    });
}

function checkAnswer(selected, correct) {
    const buttons = document.querySelectorAll('.choice-btn');
    const feedback = document.getElementById('feedback');

    buttons.forEach(btn => {
        btn.disabled = true;
        if (btn.innerText === correct) btn.classList.add('correct');
        if (btn.innerText === selected && selected !== correct) {
            btn.classList.add('wrong', 'shake');
        }
    });

    if (selected === correct) {
        score++;
        feedback.innerText = "⭕ 正解！";
        feedback.style.color = "green";
        soundCorrect.currentTime = 0;
        soundCorrect.play().catch(() => {});
    } else {
        feedback.innerText = "❌ 不正解...";
        feedback.style.color = "red";
        
        const targetWord = currentQuizSet[currentNum].word;
        saveWeakData(targetWord); 
        
        wrongList.push(currentQuizSet[currentNum]);
        soundWrong.currentTime = 0;
        soundWrong.play().catch(() => {});
    }

    setTimeout(nextQuestion, 1500);
}

function nextQuestion() {
    currentNum++;
    if (currentNum < currentQuizSet.length) {
        showQuestion();
    } else {
        showResult();
    }
}

function showResult() {
    const quizArea = document.getElementById('quiz-area');
    let resultHTML = `
        <h1>結果発表</h1>
        <div class="score-display">${currentQuizSet.length}問中 ${score}問 正解！</div>
    `;

    if (wrongList.length > 0) {
        resultHTML += `<button onclick="startQuiz(true)" class="btn" style="background:#ff9800; color:white;">ミスった ${wrongList.length} 問を復習</button>`;
    }

    resultHTML += `<button onclick="showMenu()" class="btn" style="background:#1a73e8; color:white;">メニューへ</button>`;
    quizArea.innerHTML = resultHTML;
}

initApp();