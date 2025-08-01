// script.js (優化版)
document.addEventListener('DOMContentLoaded', () => {
    // --- 請將此處換成你自己的 Apps Script 網址 ---
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyorRECLxowOAOG2WA3Bwkkv_dLVKM9k5gwHDFUJpgR6brek5J_3gWJxo_7jA9rTnfd/exec';
    // ---------------------------------------------

    const canvas = document.getElementById('roulette-canvas');
    const spinButton = document.getElementById('spin-button');
    const optionsList = document.getElementById('options-list');
    const addForm = document.getElementById('add-form');
    const newOptionInput = document.getElementById('new-option-input');

    let lunchWheel = null;
    let wheelSpinning = false;
    let currentOptions = [];

    // 初始化/重設轉盤
    const createWheel = (segments) => {
        // 如果正在轉動，先停止
        if (wheelSpinning && lunchWheel) {
            lunchWheel.stopAnimation(false);
        }

        // 如果 segments 為空或未定義，提供一個預設的提示
        if (!segments || segments.length === 0) {
            currentOptions = ['請先新增選項'];
            spinButton.disabled = true;
        } else {
            currentOptions = segments;
            spinButton.disabled = false;
        }
        
        lunchWheel = new Winwheel({
            'canvasId': 'roulette-canvas',
            'numSegments': currentOptions.length,
            'outerRadius': 180,
            'textFontSize': 16,
            'segments': currentOptions.map(option => ({ 'fillStyle': getRandomColor(), 'text': option })),
            'animation': {
                'type': 'spinToStop',
                'duration': 8,
                'spins': 10,
                'callbackFinished': alertPrize,
                'callbackAfter': drawTriangle
            }
        });
        drawTriangle();
    };

    // 繪製指針
    const drawTriangle = () => {
        if (!lunchWheel) return;
        let ctx = lunchWheel.ctx;
        ctx.strokeStyle = 'navy';
        ctx.fillStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(170, 0);
        ctx.lineTo(230, 0);
        ctx.lineTo(200, 40);
        ctx.lineTo(171, 0);
        ctx.stroke();
        ctx.fill();
    };
    
    // 轉動結束後跳出提示
    const alertPrize = (indicatedSegment) => {
        // 檢查 indicatedSegment 是否存在以及是否有 text 屬性
        if (indicatedSegment && indicatedSegment.text) {
            alert(`恭喜！今天就吃「${indicatedSegment.text}」吧！`);
        } else {
            alert('轉盤出錯了，請再試一次。');
        }
        wheelSpinning = false;
        spinButton.disabled = false;
    }

    // 更新畫面上的選項列表
    const updateOptionsList = (options) => {
        optionsList.innerHTML = '';
        if (options.length === 0) {
            optionsList.innerHTML = '<li>目前沒有任何選項。</li>';
            return;
        }
        options.forEach(option => {
            const li = document.createElement('li');
            li.textContent = option;
            const deleteButton = document.createElement('button');
            deleteButton.textContent = '刪除';
            deleteButton.className = 'delete-button';
            deleteButton.onclick = () => handleDelete(option);
            li.appendChild(deleteButton);
            optionsList.appendChild(li);
        });
    };

    // 從 Google Sheet 獲取資料
    const fetchOptions = async () => {
        try {
            const response = await fetch(SCRIPT_URL, { method: 'GET' });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            if (result.status === 'success') {
                createWheel(result.data);
                updateOptionsList(result.data);
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('獲取選項失敗:', error);
            alert('無法從 Google Sheet 載入資料，請檢查主控台錯誤訊息。');
            createWheel([]); // 即使載入失敗，也初始化一個空的轉盤
            updateOptionsList([]);
        }
    };
    
    // 處理新增選項
    const handleAdd = async (event) => {
        event.preventDefault();
        const newOption = newOptionInput.value.trim();
        if (!newOption) return;

        if (currentOptions.includes(newOption)) {
            alert('此選項已存在！');
            return;
        }

        const button = addForm.querySelector('button');
        button.textContent = '新增中...';
        button.disabled = true;

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'add', name: newOption }),
            });
            const result = await response.json();
            if (result.status === 'success') {
                newOptionInput.value = '';
                await fetchOptions();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('新增失敗:', error);
            alert('新增選項失敗！');
        } finally {
            button.textContent = '新增選項';
            button.disabled = false;
        }
    };

    // 處理刪除選項
    const handleDelete = async (optionName) => {
        if (!confirm(`確定要刪除「${optionName}」嗎？`)) return;

        try {
            const response = await fetch(SCRIPT_URL, {
                method: 'POST',
                body: JSON.stringify({ action: 'delete', name: optionName }),
            });
            const result = await response.json();
            if (result.status === 'success') {
                await fetchOptions();
            } else {
                throw new Error(result.message);
            }
        } catch (error) {
            console.error('刪除失敗:', error);
            alert('刪除選項失敗！');
        }
    };

    // 點擊轉動按鈕
    spinButton.addEventListener('click', () => {
        if (wheelSpinning || !lunchWheel) return;
        wheelSpinning = true;
        spinButton.disabled = true;
        lunchWheel.startAnimation();
    });

    // 監聽表單提交事件
    addForm.addEventListener('submit', handleAdd);

    // 初始載入資料
    fetchOptions();
    
    // 輔助函數：產生隨機顏色
    const getRandomColor = () => {
        const letters = '0123456789ABCDEF';
        let color = '#';
        for (let i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * 16)];
        }
        return color;
    };
});