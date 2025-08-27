// 游戏配置
const config = {
    gridSize: 20,         // 网格大小
    canvasWidth: 600,     // 画布宽度
    canvasHeight: 600,    // 画布高度
    initialSpeed: 200,    // 初始速度（毫秒）
    minSpeed: 50,         // 最小速度（毫秒）
    maxSpeed: 500,        // 最大速度（毫秒）
    snakeColor: '#27ae60', // 蛇的颜色
    foodColor: '#e74c3c',  // 食物颜色
    headColor: '#1e8449',  // 蛇头颜色
    wallColor: '#34495e',  // 网格线颜色
    boostSpeed: 80,       // 加速时的速度（毫秒）
    boostDuration: 150,   // 按键长按时的加速持续时间（毫秒）
    boostCooldown: 500    // 两次加速之间的冷却时间（毫秒）
};

// 游戏状态
const gameState = {
    snake: [],            // 蛇的身体
    food: null,           // 食物位置
    direction: 'right',   // 移动方向
    nextDirection: 'right', // 下一个移动方向
    score: 0,             // 当前分数
    highScore: 0,         // 最高分数
    isRunning: false,     // 游戏是否运行
    isPaused: false,      // 游戏是否暂停
    gameInterval: null,   // 游戏主循环
    speed: config.initialSpeed, // 当前游戏速度
    baseSpeed: config.initialSpeed, // 基础速度（用于恢复）
    isBoosting: false,    // 是否正在加速
    lastBoostTime: 0,     // 上次加速的时间
    pressedKeys: {}       // 跟踪按下的键
};

// 获取DOM元素
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const highScoreElement = document.getElementById('highScore');
const startBtn = document.getElementById('startBtn');
const pauseBtn = document.getElementById('pauseBtn');
const restartBtn = document.getElementById('restartBtn');
const speedControl = document.getElementById('speedControl');
const speedValue = document.getElementById('speedValue');
// 获取音效元素
const eatSound = document.getElementById('eatSound');
const gameOverSound = document.getElementById('gameOverSound');

// 用于跟踪用户是否已经与页面交互
let userInteracted = false;

// 安全播放音效的辅助函数
function playSound(soundElement) {
    if (!soundElement) return;
    
    // 检查用户是否已经交互过
    if (!userInteracted) {
        return; // 用户未交互，不播放音效
    }
    
    try {
        soundElement.currentTime = 0; // 重置音效
        soundElement.play().catch(error => {
            console.log('音效播放失败:', error);
        });
    } catch (error) {
        console.log('音效播放异常:', error);
    }
}

// 初始化游戏
function initGame() {
    // 设置画布尺寸
    canvas.width = config.canvasWidth;
    canvas.height = config.canvasHeight;
    
    // 加载最高分数
    loadHighScore();
    
    // 初始化蛇
    resetGame();
    
    // 渲染初始状态
    draw();
    
    // 绑定事件监听器
    bindEventListeners();
}

// 重置游戏
function resetGame() {
    // 初始化蛇的位置，从中心开始
    const centerX = Math.floor(config.canvasWidth / (2 * config.gridSize)) * config.gridSize;
    const centerY = Math.floor(config.canvasHeight / (2 * config.gridSize)) * config.gridSize;
    
    gameState.snake = [
        { x: centerX, y: centerY },
        { x: centerX - config.gridSize, y: centerY },
        { x: centerX - config.gridSize * 2, y: centerY }
    ];
    
    // 重置游戏状态
    gameState.direction = 'right';
    gameState.nextDirection = 'right';
    gameState.score = 0;
    gameState.isRunning = false;
    gameState.isPaused = false;
    gameState.baseSpeed = config.initialSpeed;
    gameState.speed = config.initialSpeed;
    gameState.isBoosting = false;
    gameState.lastBoostTime = 0;
    gameState.pressedKeys = {};
    
    // 生成食物
    generateFood();
    
    // 更新UI
    updateScore();
    updateButtons();
    
    // 清除游戏循环
    if (gameState.gameInterval) {
        clearInterval(gameState.gameInterval);
        gameState.gameInterval = null;
    }
}

// 开始游戏
function startGame() {
    if (!gameState.isRunning && !gameState.isPaused) {
        resetGame();
    }
    
    gameState.isRunning = true;
    gameState.isPaused = false;
    
    // 设置游戏循环
    if (gameState.gameInterval) {
        clearInterval(gameState.gameInterval);
    }
    
    gameState.gameInterval = setInterval(gameLoop, gameState.speed);
    
    // 更新按钮状态
    updateButtons();
}

// 暂停游戏
function pauseGame() {
    if (gameState.isRunning) {
        gameState.isPaused = !gameState.isPaused;
        
        if (gameState.isPaused) {
            clearInterval(gameState.gameInterval);
        } else {
            gameState.gameInterval = setInterval(gameLoop, gameState.speed);
        }
        
        updateButtons();
        draw();
    }
}

// 游戏主循环
function gameLoop() {
    // 检查是否需要应用加速
    checkBoost();
    
    // 更新方向
    gameState.direction = gameState.nextDirection;
    
    // 移动蛇
    moveSnake();
    
    // 检测碰撞
    if (checkCollision()) {
        gameOver();
        return;
    }
    
    // 检测是否吃到食物
    checkFood();
    
    // 绘制游戏
    draw();
}

// 检查并应用加速
function checkBoost() {
    if (!gameState.isRunning || gameState.isPaused) {
        return;
    }
    
    const currentTime = Date.now();
    const canBoost = currentTime - gameState.lastBoostTime > config.boostCooldown;
    
    // 检查是否有方向键被按住
    const isDirectionKeyPressed = gameState.pressedKeys[37] || 
                                 gameState.pressedKeys[38] || 
                                 gameState.pressedKeys[39] || 
                                 gameState.pressedKeys[40];
    
    if (isDirectionKeyPressed && canBoost) {
        if (!gameState.isBoosting) {
            // 开始加速
            gameState.isBoosting = true;
            gameState.lastBoostTime = currentTime;
            
            // 临时增加速度
            if (gameState.gameInterval) {
                clearInterval(gameState.gameInterval);
                gameState.gameInterval = setInterval(gameLoop, config.boostSpeed);
            }
        }
    } else if (gameState.isBoosting) {
        // 结束加速，恢复基础速度
        gameState.isBoosting = false;
        
        if (gameState.gameInterval) {
            clearInterval(gameState.gameInterval);
            gameState.gameInterval = setInterval(gameLoop, gameState.baseSpeed);
        }
    }
}

// 移动蛇
function moveSnake() {
    const head = { ...gameState.snake[0] };
    
    // 根据方向移动蛇头
    switch (gameState.direction) {
        case 'up':
            head.y -= config.gridSize;
            break;
        case 'down':
            head.y += config.gridSize;
            break;
        case 'left':
            head.x -= config.gridSize;
            break;
        case 'right':
            head.x += config.gridSize;
            break;
    }
    
    // 添加新的头部
    gameState.snake.unshift(head);
}

// 检测碰撞
function checkCollision() {
    const head = gameState.snake[0];
    
    // 检测是否撞墙
    if (head.x < 0 || head.x >= config.canvasWidth || 
        head.y < 0 || head.y >= config.canvasHeight) {
        return true;
    }
    
    // 检测是否撞到自己
    for (let i = 1; i < gameState.snake.length; i++) {
        if (head.x === gameState.snake[i].x && head.y === gameState.snake[i].y) {
            return true;
        }
    }
    
    return false;
}

// 检测是否吃到食物
function checkFood() {
    const head = gameState.snake[0];
    
    if (head.x === gameState.food.x && head.y === gameState.food.y) {
        // 增加分数
        gameState.score += 10;
        updateScore();
        
        // 生成新食物
        generateFood();
        
        // 播放吃食物音效
        playSound(eatSound);
        
        // 检查是否需要更新最高分数
        if (gameState.score > gameState.highScore) {
            gameState.highScore = gameState.score;
            saveHighScore();
            updateScore();
        }
    } else {
        // 如果没吃到食物，移除尾部
        gameState.snake.pop();
    }
}

// 生成食物
function generateFood() {
    let newFood;
    let onSnake;
    
    do {
        // 随机生成食物位置，确保在网格上
        const x = Math.floor(Math.random() * (config.canvasWidth / config.gridSize)) * config.gridSize;
        const y = Math.floor(Math.random() * (config.canvasHeight / config.gridSize)) * config.gridSize;
        
        newFood = { x, y };
        
        // 检查食物是否在蛇身上
        onSnake = gameState.snake.some(segment => segment.x === x && segment.y === y);
    } while (onSnake);
    
    gameState.food = newFood;
}

// 游戏结束
function gameOver() {
    gameState.isRunning = false;
    gameState.isBoosting = false;
    gameState.pressedKeys = {};
    
    // 清除游戏循环
    if (gameState.gameInterval) {
        clearInterval(gameState.gameInterval);
        gameState.gameInterval = null;
    }
    
    // 播放游戏结束音效
    playSound(gameOverSound);
    
    // 更新按钮状态
    updateButtons();
    
    // 绘制游戏结束画面
    draw();
}

// 绘制游戏
function draw() {
    // 清除画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // 绘制网格线（可选）
    drawGrid();
    
    // 绘制蛇
    drawSnake();
    
    // 绘制食物
    drawFood();
    
    // 如果游戏暂停，显示暂停信息
    if (gameState.isPaused) {
        drawPauseScreen();
    }
    
    // 如果游戏结束，显示游戏结束信息
    if (!gameState.isRunning && gameState.score > 0) {
        drawGameOverScreen();
    }
    
    // 如果正在加速，显示加速提示
    if (gameState.isBoosting) {
        drawBoostIndicator();
    }
}

// 绘制网格线
function drawGrid() {
    ctx.strokeStyle = config.wallColor;
    ctx.lineWidth = 0.5;
    
    // 绘制垂直线
    for (let x = 0; x <= config.canvasWidth; x += config.gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, config.canvasHeight);
        ctx.stroke();
    }
    
    // 绘制水平线
    for (let y = 0; y <= config.canvasHeight; y += config.gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(config.canvasWidth, y);
        ctx.stroke();
    }
}

// 绘制蛇
function drawSnake() {
    // 绘制蛇头
    ctx.fillStyle = config.headColor;
    const head = gameState.snake[0];
    ctx.fillRect(head.x, head.y, config.gridSize, config.gridSize);
    
    // 绘制蛇身
    ctx.fillStyle = config.snakeColor;
    for (let i = 1; i < gameState.snake.length; i++) {
        const segment = gameState.snake[i];
        ctx.fillRect(segment.x, segment.y, config.gridSize, config.gridSize);
    }
}

// 绘制食物
function drawFood() {
    ctx.fillStyle = config.foodColor;
    ctx.fillRect(gameState.food.x, gameState.food.y, config.gridSize, config.gridSize);
}

// 绘制暂停画面
function drawPauseScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('游戏暂停', canvas.width / 2, canvas.height / 2);
    
    ctx.font = '24px Arial';
    ctx.fillText('按空格键继续游戏', canvas.width / 2, canvas.height / 2 + 40);
}

// 绘制游戏结束画面
function drawGameOverScreen() {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = 'white';
    ctx.font = '48px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('游戏结束', canvas.width / 2, canvas.height / 2 - 40);
    
    ctx.font = '24px Arial';
    ctx.fillText(`最终分数: ${gameState.score}`, canvas.width / 2, canvas.height / 2);
    ctx.fillText('点击开始按钮重新游戏', canvas.width / 2, canvas.height / 2 + 40);
}

// 绘制加速指示器
function drawBoostIndicator() {
    ctx.fillStyle = 'rgba(255, 165, 0, 0.7)';
    ctx.font = '16px Arial';
    ctx.textAlign = 'left';
    ctx.fillText('加速中...', 10, 25);
}

// 更新分数显示
function updateScore() {
    scoreElement.textContent = gameState.score;
    highScoreElement.textContent = gameState.highScore;
}

// 更新按钮状态
function updateButtons() {
    startBtn.disabled = gameState.isRunning && !gameState.isPaused;
    pauseBtn.disabled = !gameState.isRunning;
    restartBtn.disabled = !gameState.isRunning && !gameState.isPaused;
}

// 保存最高分数到本地存储
function saveHighScore() {
    localStorage.setItem('snakeGameHighScore', gameState.highScore.toString());
}

// 从本地存储加载最高分数
function loadHighScore() {
    const savedHighScore = localStorage.getItem('snakeGameHighScore');
    if (savedHighScore) {
        gameState.highScore = parseInt(savedHighScore, 10);
    }
}

// 设置游戏速度
function setGameSpeed(speedValue) {
    // 反转值，因为值越大速度应该越快
    const reversedValue = 11 - parseInt(speedValue, 10);
    gameState.baseSpeed = config.minSpeed + (config.maxSpeed - config.minSpeed) * (reversedValue / 10);
    
    // 如果不在加速状态，同步更新当前速度
    if (!gameState.isBoosting) {
        gameState.speed = gameState.baseSpeed;
    }
    
    // 更新速度显示文本
    const speedTexts = ['极慢', '很慢', '慢速', '较慢', '中慢', '中等', '中快', '较快', '快速', '很快', '极快'];
    document.getElementById('speedValue').textContent = speedTexts[reversedValue - 1];
    
    // 如果游戏正在运行且不在加速状态，更新游戏循环
    if (gameState.isRunning && !gameState.isPaused && !gameState.isBoosting) {
        clearInterval(gameState.gameInterval);
        gameState.gameInterval = setInterval(gameLoop, gameState.speed);
    }
}

// 绑定事件监听器
function bindEventListeners() {
    // 监听用户交互，允许后续播放音效
    document.addEventListener('click', function() {
        if (!userInteracted) {
            userInteracted = true;
            console.log('用户已交互，音效已解锁');
        }
    });
    
    // 按钮事件
    startBtn.addEventListener('click', startGame);
    pauseBtn.addEventListener('click', pauseGame);
    restartBtn.addEventListener('click', resetGame);
    
    // 速度控制事件
    speedControl.addEventListener('input', function() {
        setGameSpeed(this.value);
    });
    
    // 初始化速度显示
    setGameSpeed(speedControl.value);
    
    // 键盘控制 - 按键按下
    document.addEventListener('keydown', function(event) {
        // 阻止方向键滚动页面
        if ([37, 38, 39, 40].includes(event.keyCode)) {
            event.preventDefault();
        }
        
        // 记录按键状态
        gameState.pressedKeys[event.keyCode] = true;
        
        switch (event.keyCode) {
            case 37: // 左箭头
                if (gameState.direction !== 'right') {
                    gameState.nextDirection = 'left';
                }
                break;
            case 38: // 上箭头
                if (gameState.direction !== 'down') {
                    gameState.nextDirection = 'up';
                }
                break;
            case 39: // 右箭头
                if (gameState.direction !== 'left') {
                    gameState.nextDirection = 'right';
                }
                break;
            case 40: // 下箭头
                if (gameState.direction !== 'up') {
                    gameState.nextDirection = 'down';
                }
                break;
            case 32: // 空格键（暂停/继续）
                if (gameState.isRunning) {
                    pauseGame();
                }
                break;
            case 13: // 回车键（开始/继续）
                if (!gameState.isRunning || gameState.isPaused) {
                    startGame();
                }
                break;
        }
    });
    
    // 键盘控制 - 按键释放
    document.addEventListener('keyup', function(event) {
        // 清除按键状态
        gameState.pressedKeys[event.keyCode] = false;
    });
}

// 当页面加载完成后初始化游戏
window.addEventListener('load', initGame);