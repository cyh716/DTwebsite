//新增分支折叠功能初始化
function initBranchToggle() {
    document.addEventListener('click', (e) => {
        const title = e.target.closest('.branch-title');
        if (!title) return;

        const content = title.nextElementSibling;
        const icon = title.querySelector('.toggle-icon i');
        const isHidden = content.style.display === 'none';
        
        content.style.display = isHidden ? 'block' : 'none';
        icon.className = isHidden ? 'fas fa-chevron-down' : 'fas fa-chevron-right';
    });
}



document.addEventListener('DOMContentLoaded', async function() {
    // 初始化播放器元素
    const playerContainer = document.getElementById('playerContainer');
    const nowPlaying = document.getElementById('nowPlaying');
    const progressBar = document.getElementById('progressBar');
    const currentTime = document.getElementById('currentTime');
    const duration = document.getElementById('duration');

    // 音频播放器实例
    const audioPlayer = {
        audio: new Audio(),
        currentSong: null,
        isPlaying: false,
        loadingPromise: null,
        playMode: 'sequential', // sequential | random | loop
        songList: [],           // 完整歌曲列表
        currentSongId: -1,      // 当前歌曲编号
        
        init() {
            this.audio.crossOrigin = 'anonymous';
            this.audio.addEventListener('timeupdate', () => this.updateProgress());
            this.audio.addEventListener('ended', () => this.stop());
            this.audio.addEventListener('ended', () => this.handleSongEnd());
            this.audio.addEventListener('error', (e) => {
                console.error('播放错误:', e);
                this.stop();
            });
        },

        async load(song) {
            this.currentSongId = this.songList.findIndex(s => s.file === song.file);
            console.log(`加载歌曲：${song.title} (编号: ${this.currentSongId + 1})`);
            if (this.currentSong === song.file && this.loadingPromise) {
                return this.loadingPromise;
            }

            this.stop();
            
            this.loadingPromise = new Promise(async (resolve, reject) => {
                try {
                    console.log('开始加载:', song.file);
                    this.currentSong = song.file;
                    this.audio.src = `assets/songs/${song.file}`;
                    
                    
                    await new Promise((resolve) => {
                        const onLoadedMetadata = () => {
                            this.audio.removeEventListener('loadedmetadata', onLoadedMetadata);
                            resolve();
                        };
                        this.audio.addEventListener('loadedmetadata', onLoadedMetadata);
                        this.audio.load();
                        nowPlaying.textContent = song.title
                        adjustPlayerWidth(); // 新增此行
                        scrollToCurrentSong(); // 触发滚动
                        this.highlightCurrentSong(); // 新增高亮
                        resolve();
                    });
                    
                    resolve();
                } catch (err) {
                    reject(err);
                } finally {
                    this.loadingPromise = null;
                }
            });
            
            return this.loadingPromise;
        },

        async handleSongEnd() {
            if (this.songList.length === 0) return null;
            if (this.songList.length === 1) return this.songList[0];
            const nextSong = this.getNextSong();
            if (nextSong) {
                await this.load(nextSong);
                
                await this.play();
                console.log(`正在播放第 ${this.currentSongId + 1} 首歌曲`);
            } else {
                this.stop();
            }
        },

        // 新增：获取下一首歌曲
        getNextSong() {
            if (this.songList.length === 0) return null;
        
            // 单曲循环模式
            if (this.playMode === 'loop') {
                return this.songList[this.currentSongId];
            }
        
            let nextId;
            if (this.playMode === 'sequential') {
                nextId = (this.currentSongId + 1) % this.songList.length;
            } else { // 随机模式
                do {
                    nextId = Math.floor(Math.random() * this.songList.length);
                } while (nextId === this.currentSongId && this.songList.length > 1);
            }
        
            return this.songList[nextId];
        },

        highlightCurrentSong() {
            // 移除所有高亮
            document.querySelectorAll('.song-list tr').forEach(row => {
                row.classList.remove('playing-row');
            });
            
            // 添加当前高亮
            if (this.currentSong) {
                const targetRow = document.querySelector(
                    `.play-btn[data-file="${this.currentSong}"]`
                )?.closest('tr');
                
                if (targetRow) {
                    targetRow.classList.add('playing-row');
                    // 如果关联歌词行存在则同步高亮
                    const lyricsRow = targetRow.nextElementSibling;
                    if (lyricsRow?.classList.contains('lyrics-row')) {
                        lyricsRow.style.borderTop = '1px solid rgba(33, 150, 243, 0.1)';
                    }
                }
            }
        },

        

        async play() {
            try {
                if (!this.currentSong) return;
                
                if (this.loadingPromise) {
                    await this.loadingPromise;
                }
                
                await this.audio.play();
                this.isPlaying = true;
                updateAllPlayButtons();
            } catch (err) {
                console.error('播放失败:', err);
                this.stop();
            }
        },

        pause() {
            if (!this.isPlaying) return;
            this.audio.pause();
            this.isPlaying = false;
            updateAllPlayButtons();
        },

        stop() {
            this.pause();
            this.audio.currentTime = 0;
            this.currentSong = null;
            
            // 关闭所有歌词
            document.querySelectorAll('.lyrics-switch:checked').forEach(checkbox => {
                checkbox.checked = false;
                checkbox.dispatchEvent(new Event('change'));
            });
            
            updateAllPlayButtons();
        },
        updateProgress() {
            if (this.audio.duration) {
                currentTime.textContent = this.formatTime(this.audio.currentTime);
                duration.textContent = this.formatTime(this.audio.duration);
            }
        },
        
        formatTime(seconds) {
            const mins = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${mins}:${secs.toString().padStart(2, '0')}`;
        }
    };

    // 全局状态更新函数
    function updateAllPlayButtons() {
        const playPauseBtn = document.getElementById('playPauseBtn');
        const playIcon = playPauseBtn.querySelector('i');
    
        // 同步大播放键
        if (audioPlayer.currentSong) {
            playIcon.className = audioPlayer.isPlaying ? 'fas fa-pause' : 'fas fa-play';
        } else {
            playIcon.className = 'fas fa-play'; // 默认状态
        }
    
        // 同步小播放键
        document.querySelectorAll('.play-btn').forEach(btn => {
            const isActive = btn.dataset.file === audioPlayer.currentSong && audioPlayer.isPlaying;
            btn.querySelector('i').className = isActive ? 'fas fa-pause' : 'fas fa-play';
        });
    }
    
    // 初始化大播放键逻辑
    function initMainPlayButton() {
        const playPauseBtn = document.getElementById('playPauseBtn');
        
        playPauseBtn.addEventListener('click', async () => {
            if (!audioPlayer.currentSong) return; // 无歌曲时忽略
            
            try {
                if (audioPlayer.isPlaying) {
                    await audioPlayer.pause();
                } else {
                    await audioPlayer.play();
                }
                updateAllPlayButtons(); // 同步所有按钮
            } catch (err) {
                console.error('操作失败:', err);
            }
        });
    }
    // 初始化播放按钮逻辑
    function initPlayButtons() {
        document.addEventListener('click', async (e) => {
            const playBtn = e.target.closest('.play-btn');
            if (!playBtn) return;
    
            const songData = {
                title: playBtn.dataset.song,
                file: playBtn.dataset.file
            };
    
            nowPlaying.textContent = songData.title;
            playerContainer.style.display = 'flex';
    
            try {
                if (audioPlayer.currentSong === songData.file) {
                    // 当前为同一首歌时切换播放/暂停
                    if (audioPlayer.isPlaying) {
                        await audioPlayer.pause();
                    } else {
                        await audioPlayer.play(); // 直接从当前位置继续播放
                    }
                } else {
                    // 加载新歌曲并播放
                    await audioPlayer.load(songData);
                    await audioPlayer.play();
                }
            } catch (err) {
                console.error('播放失败:', err);
                audioPlayer.stop();
            }
        });
    }

    // 新增：动态调整播放器宽度
    function adjustPlayerWidth() {
        const player = document.getElementById('playerContainer');
        const songNameSpan = document.getElementById('nowPlaying');
        
        // 计算文本实际宽度
        const textWidth = songNameSpan.scrollWidth + 100; // 20px 缓冲
        const minWidth = 160;  // 最小宽度
        const maxWidth = 250;  // 最大宽度
        
        // 应用动态宽度
        player.style.width = `${Math.min(maxWidth, Math.max(minWidth, textWidth))}px`;
    }

    // 改进后的拖动逻辑
function initPlayerDrag() {
    let isDragging = false;
    let startX = 0, startY = 0;
    let startLeft = 0, startTop = 0;
    const player = playerContainer;
    
    // 初始化位置
    player.style.left = 'calc(100% - 320px)';
    player.style.top = '20px';

    // 边界限制
    const getBoundary = () => ({
        minX: 20,
        maxX: window.innerWidth - player.offsetWidth - 20,
        minY: 20,
        maxY: window.innerHeight - player.offsetHeight - 20
    });

    const dragStart = (e) => {
        isDragging = true;
        startX = e.clientX;
        startY = e.clientY;
        const rect = player.getBoundingClientRect();
        startLeft = rect.left;
        startTop = rect.top;
        
        player.style.transition = 'none';
        player.style.cursor = 'grabbing';
        player.style.userSelect = 'none'; // 防止文字选中
    };

    const dragging = (e) => {
        if (!isDragging) return;
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        const boundaries = getBoundary();
        
        let newLeft = startLeft + deltaX;
        let newTop = startTop + deltaY;
        
        // 边界约束
        newLeft = Math.max(boundaries.minX, Math.min(newLeft, boundaries.maxX));
        newTop = Math.max(boundaries.minY, Math.min(newTop, boundaries.maxY));
        
        player.style.left = `${newLeft}px`;
        player.style.top = `${newTop}px`;
    };

    const dragEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        
        player.style.cursor = '';
        player.style.userSelect = '';
        player.style.transition = 'left 0.3s, top 0.3s';
        
        // 最终位置校准
        const boundaries = getBoundary();
        const currentLeft = parseInt(player.style.left);
        const currentTop = parseInt(player.style.top);
        player.style.left = `${Math.max(boundaries.minX, Math.min(currentLeft, boundaries.maxX))}px`;
        player.style.top = `${Math.max(boundaries.minY, Math.min(currentTop, boundaries.maxY))}px`;
    };

    // 事件监听
    player.addEventListener('mousedown', dragStart);
    document.addEventListener('mousemove', dragging);
    document.addEventListener('mouseup', dragEnd);
    
    // 窗口大小变化时重置位置
    window.addEventListener('resize', () => {
        const boundaries = getBoundary();
        const currentLeft = parseInt(player.style.left);
        const currentTop = parseInt(player.style.top);
        player.style.left = `${Math.max(boundaries.minX, Math.min(currentLeft, boundaries.maxX))}px`;
        player.style.top = `${Math.max(boundaries.minY, Math.min(currentTop, boundaries.maxY))}px`;
    });
}
    // 新增：初始化播放模式切换
    function initPlayModeToggle() {
        const modeBtn = document.getElementById('playModeBtn');
        const modeIcon = modeBtn.querySelector('i');
    
        const modeCycle = [
            { mode: 'sequential', icon: 'fa-retweet', tip: '顺序播放' },
            { mode: 'random', icon: 'fa-random', tip: '随机播放' },
            { mode: 'loop', icon: 'fa-redo', tip: '单曲循环' }
        ];
    
        let currentModeIndex = 0;
    
        function updateMode() {
            audioPlayer.playMode = modeCycle[currentModeIndex].mode;
            modeIcon.className = `fas ${modeCycle[currentModeIndex].icon}`;
            modeBtn.title = modeCycle[currentModeIndex].tip;
            console.log(`切换到${modeCycle[currentModeIndex].tip}模式`);
        }
    
        modeBtn.addEventListener('click', () => {
            currentModeIndex = (currentModeIndex + 1) % modeCycle.length;
            updateMode();
        });
    
        // 初始化模式显示
        updateMode();
    }

    function initLyricsToggle() {
        document.addEventListener('change', (e) => {
            if (e.target.classList.contains('lyrics-switch')) {
                // 获取当前行的歌词行
                const songRow = e.target.closest('tr');
                const lyricsRow = songRow.nextElementSibling;
                
                // 添加过渡动画
                lyricsRow.style.transition = 'all 0.3s ease';
                lyricsRow.style.overflow = 'hidden';
                
                if (e.target.checked) {
                    lyricsRow.style.display = 'table-row';
                    lyricsRow.style.maxHeight = '500px'; // 根据实际内容调整
                } else {
                    lyricsRow.style.maxHeight = '0';
                    setTimeout(() => {
                        lyricsRow.style.display = 'none';
                    }, 300);
                }
            }
        });
    }

    // 新增：滚动到当前歌曲位置
    function scrollToCurrentSong() {
        if (!audioPlayer.currentSong) return;
        
        // 通过 data-file 属性找到对应的播放按钮
        const targetBtn = document.querySelector(`.play-btn[data-file="${audioPlayer.currentSong}"]`);
        if (targetBtn) {
            targetBtn.scrollIntoView({
                behavior: 'smooth',  // 平滑滚动
                block: 'center'      // 垂直居中
            });
        }
    }

    // 主初始化流程
    try {
        const response = await fetch('data/DT.json');
        if (!response.ok) throw new Error('数据加载失败');
        const timelineData = await response.json();
        
        const timeline = document.querySelector('.timeline');
        timeline.innerHTML = timelineData.map(yearData => `
            <div class="timeline-item">
                <div class="timeline-year">${yearData.year}</div>
                <div class="timeline-content">
                    ${yearData.branches.filter(branch => branch.data?.songs?.length > 0).map(branch => `
                        <div class="branch" data-type="${branch.type}">
                            <div class="branch-title">
                                ${branch.title}
                                <span class="toggle-icon"><i class="fas fa-chevron-down"></i></span>
                            </div>
                            <div class="branch-content" >
                                ${branch.type === 'album' ? `
                                    <div class="album-header">
                                        <div class="album-cover">
                                            <img src="${branch.data.cover}" alt="${branch.data.title}" loading="lazy">
                                        </div>
                                        <div class="album-info">
                                            <h2>${branch.data.title}</h2>
                                            ${branch.data.releaseDate ? 
                                                `<div>发行时间: ${branch.data.releaseDate}</div>` : ''}
                                        </div>
                                    </div>
                                ` : ''}
                                <table class="song-list">
       
        <tbody>
            ${branch.data.songs.map(song => `
                <tr>
                    <td class="col-number">${song.number}</td>
                    <td class="col-title">${song.title}</td>
                    <td class="col-singer">${song.singer}</td>
                    <td class="col-duration">${song.duration || '--:--'}</td>
                    <td class="col-lyrics lyrics-toggle">
                        <label>
                            <input type="checkbox" class="lyrics-switch">
                            显示歌词
                        </label>
                    </td>
                    <td class="col-play play-btn" 
                        data-song="${song.title}"
                        data-file="${song.file}">
                        <i class="fas fa-play"></i>
                    </td>
                </tr>
                <tr class="lyrics-row">
                    <td colspan="6"> <!-- 根据实际列数调整colspan -->
                        <div class="lyrics-container">${song.lyrics.replace(/\n/g, '<br>')}</div>
                    </td>
                </tr>
            `).join('')}
        </tbody>
    </table>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');

        audioPlayer.songList = timelineData.reduce((list, yearData) => {
            yearData.branches.forEach(branch => {
                if (branch.data?.songs) {
                    branch.data.songs.forEach((song, index) => {
                        list.push({
                            ...song,
                            _year: yearData.year,
                            _branch: branch.title,
                            globalId: list.length // 全局唯一编号
                        });
                    });
                }
            });
            return list;
        }, []);

        audioPlayer.init();
        initPlayerDrag();
        initLyricsToggle();
        initPlayButtons();
        initMainPlayButton(); // 新增初始化
        initBranchToggle(); // 新增这行
        initPlayModeToggle(); // 新增此行
        
    } catch (error) {
        console.error('初始化失败:', error);
        document.querySelector('.timeline').innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i>
                数据加载失败，请刷新页面
            </div>`;
    }
});