// script.js (優化版)
document.addEventListener('DOMContentLoaded', () => {
    const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyorRECLxowOAOG2WA3Bwkkv_dLVKM9k5gwHDFUJpgR6brek5J_3gWJxo_7jA9rTnfd/exec';

    const canvas = document.getElementById('roulette-canvas');
    const spinButton = document.getElementById('spin-button');
    const optionsList = document.getElementById('options-list');
    const addForm = document.getElementById('add-form');
    const newOptionInput = document.getElementById('new-option-input');
    const loadingOverlay = document.getElementById('loading-overlay');
    const collapsibleHeader = document.querySelector('.collapsible-header');
    const arrow = document.querySelector('.arrow');

    // 指定的顏色列表
    const COLORS = ['#683DE6', '#3C91CD', '#10E5B3'];
    
    let lunchWheel = null;
    let wheelSpinning = false;
    let currentOptions = [];
    let colorIndex = 0;

    const resizeCanvas = () => {
        const container = canvas.parentElement;
        const size = Math.min(container.clientWidth, 400);
        
        canvas.style.width = size + 'px';
        canvas.style.height = size + 'px';
        
        canvas.width = size;
        canvas.height = size;

        return size;
    };

    // 初始化/重設轉盤
    const createWheel = (segments) => {
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

        const canvasSize = resizeCanvas();

        colorIndex = 0;

        lunchWheel = new Winwheel({
            'startAngle': 90,
            'canvasId': 'roulette-canvas',
            'numSegments': currentOptions.length,
            'outerRadius': (canvasSize / 2) * 0.9, // 轉盤半徑為canvas大小的一半再乘以0.9
            'textFontSize': 14,
            'textFillStyle': '#FFFFFF',
            'strokeStyle': '#AAAAAA',
            'lineWidth': 2,
            'segments': currentOptions.map(option => ({ 'fillStyle': getNextColor(), 'text': option })),
            'animation': {
                'type': 'spinToStop',
                'duration': 5, // 固定持續時間
                'spins': 10,   // 固定旋轉圈數
                'callbackFinished': alertPrize,
                'callbackAfter': drawTriangle
            }
        });
        drawTriangle();
    };

    // 繪製指針
    const drawTriangle = () => {
        if (!lunchWheel) return;
        let canvasSize = lunchWheel.canvas.width;
        let ctx = lunchWheel.ctx;
        ctx.strokeStyle = 'navy';
        ctx.fillStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(canvasSize, canvasSize / 2 - 15);
        ctx.lineTo(canvasSize, canvasSize / 2 + 15);
        ctx.lineTo(canvasSize - 30, canvasSize / 2);
        ctx.closePath();
        ctx.stroke();
        ctx.fill();
    };
    
    const getSegmentAtAngle = (wheel, offsetAngle = 270) => {
        let targetAngle = (wheel.rotationAngle + offsetAngle) % 360;
        let adjustedAngle = (360 - targetAngle + 360) % 360;
        const segmentAngle = 360 / wheel.numSegments;
        const segmentIndex = Math.floor(adjustedAngle / segmentAngle);

        return wheel.segments[segmentIndex + 1];
    };

    const alertPrize = () => {
        const segment = getSegmentAtAngle(lunchWheel, 270);
        if (segment && segment.text) {
            alert(`恭喜！今天就吃「${segment.text}」吧！`);
        } else {
            alert('轉盤出錯了，請再試一次。');
        }
        wheelSpinning = false;
        spinButton.disabled = false;
    };

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

    const showLoading = () => {
        loadingOverlay.style.display = 'flex';
    };

    const hideLoading = () => {
        loadingOverlay.style.display = 'none';
    };

    // 獲取下一個顏色（循環使用指定顏色）
    const getNextColor = () => {
        const color = COLORS[colorIndex % COLORS.length];
        colorIndex++;
        return color;
    };

    // 從 Google Sheet 獲取資料
    const fetchOptions = async () => {
        showLoading();
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
        } finally {
            hideLoading();
        }
    };
    
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

        showLoading();
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
            hideLoading();
            button.textContent = '新增選項';
            button.disabled = false;
        }
    };

    const handleDelete = async (optionName) => {
        if (!confirm(`確定要刪除「${optionName}」嗎？`)) return;

        showLoading();
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
        } finally {
            hideLoading();
        }
    };

    spinButton.addEventListener('click', () => {
        if (wheelSpinning || !lunchWheel) return;
        wheelSpinning = true;
        spinButton.disabled = true;

        lunchWheel.rotationAngle = 0;

        lunchWheel.startAnimation();
    });

    addForm.addEventListener('submit', handleAdd);

    window.addEventListener('resize', () => {
        if (lunchWheel && !wheelSpinning) {
            createWheel(currentOptions);
        }
    });

    fetchOptions();
    
    if (collapsibleHeader && arrow) {
        collapsibleHeader.addEventListener('click', () => {
            optionsList.classList.toggle('expanded');
            arrow.classList.toggle('rotated');
        });
    }
    

});