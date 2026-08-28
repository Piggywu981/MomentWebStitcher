// 全局变量
let uploadedImages = [];
let imageGroups = [];
let draggedElement = null;
let dragSourceContainer = null;
let isStitching = false;

// 输出限制：宽度 1080px 对朋友圈足够（微信会二次压缩），
// 总面积上限规避移动端 Safari 大 canvas 输出空白的问题
const MAX_OUTPUT_WIDTH = 1080;
const MAX_CANVAS_AREA = 16777216;

// 解析EXIF日期格式
function parseExifDate(exifDate) {
    if (!exifDate) return new Date();
    
    // EXIF格式: "2023:12:25 14:30:25"
    const parts = exifDate.split(' ');
    if (parts.length !== 2) return new Date();
    
    const dateParts = parts[0].split(':');
    const timeParts = parts[1].split(':');
    
    if (dateParts.length !== 3 || timeParts.length !== 3) return new Date();
    
    const year = parseInt(dateParts[0]);
    const month = parseInt(dateParts[1]) - 1; // JavaScript月份从0开始
    const day = parseInt(dateParts[2]);
    const hour = parseInt(timeParts[0]);
    const minute = parseInt(timeParts[1]);
    const second = parseInt(timeParts[2]);
    
    return new Date(year, month, day, hour, minute, second);
}

// 文件修改时间兜底（file.lastModifiedDate 已废弃）
function getFileDate(file) {
    return new Date(file.lastModified);
}

// 初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    setupDragAndDrop();
    setupFileInput();
    setupQualitySlider();
    setupDragAndDropGroups();
}

// 拖拽上传设置
function setupDragAndDrop() {
    const uploadArea = document.getElementById('uploadArea');
    const fileInput = document.getElementById('fileInput');
    
    // 点击上传区任意位置打开文件选择（内部按钮点击会冒泡到这里，不会重复触发）
    uploadArea.addEventListener('click', function() {
        fileInput.click();
    });
    
    uploadArea.addEventListener('dragover', function(e) {
        e.preventDefault();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', function() {
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', function(e) {
        e.preventDefault();
        uploadArea.classList.remove('dragover');
        const files = Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'));
        handleImageUpload(files);
    });
}

// 文件输入设置
function setupFileInput() {
    const fileInput = document.getElementById('fileInput');
    fileInput.addEventListener('change', function(e) {
        const files = Array.from(e.target.files);
        handleImageUpload(files);
    });
}

// 质量滑块设置
function setupQualitySlider() {
    const slider = document.getElementById('qualitySlider');
    const valueDisplay = document.getElementById('qualityValue');
    
    slider.addEventListener('input', function() {
        valueDisplay.textContent = this.value + '%';
    });
}

// 处理图片上传（优化版）
function handleImageUpload(files) {
    const validFiles = Array.from(files).filter(file => file.type.startsWith('image/'));
    if (validFiles.length === 0) return;
    
    // 限制并发处理数量
    const batchSize = 5;
    const batches = [];
    for (let i = 0; i < validFiles.length; i += batchSize) {
        batches.push(validFiles.slice(i, i + batchSize));
    }
    
    let processedCount = 0;
    const totalImages = validFiles.length;
    
    const processBatch = async (batch) => {
        const loadPromises = batch.map(file => {
            return new Promise((resolve) => {
                // 直接使用对象 URL，避免 base64 字符串常驻内存
                const image = {
                    id: Date.now() + Math.random(),
                    name: file.name,
                    src: URL.createObjectURL(file),
                    file: file,
                    dateTime: null
                };
                
                const img = new Image();
                img.onload = function() {
                    try {
                        EXIF.getData(img, function() {
                            const dateTimeOriginal = EXIF.getTag(this, 'DateTimeOriginal');
                            const dateTime = EXIF.getTag(this, 'DateTime');
                            
                            let dateTaken;
                            if (dateTimeOriginal) {
                                dateTaken = parseExifDate(dateTimeOriginal);
                            } else if (dateTime) {
                                dateTaken = parseExifDate(dateTime);
                            } else {
                                dateTaken = getFileDate(file);
                            }
                            
                            image.dateTime = dateTaken;
                            resolve(image);
                        });
                    } catch (error) {
                        image.dateTime = getFileDate(file);
                        resolve(image);
                    }
                };
                img.onerror = function() {
                    image.dateTime = getFileDate(file);
                    resolve(image);
                };
                img.src = image.src;
            });
        });
        
        const batchImages = await Promise.all(loadPromises);
        processedCount += batchImages.length;
        
        uploadedImages.push(...batchImages);
        
        // 使用防抖更新UI
        debouncedUpdateImagePool();
        
        // 更新进度
        const progress = Math.round((processedCount / totalImages) * 100);
        document.getElementById('progressText').textContent = `处理中... ${progress}%`;
    };
    
    // 分批处理
    batches.reduce((promise, batch) => {
        return promise.then(() => processBatch(batch));
    }, Promise.resolve()).then(() => {
        // 全部完成后按拍摄时间统一排序（分批完成顺序 ≠ 时间顺序）
        uploadedImages.sort((a, b) => a.dateTime - b.dateTime);
        updateImagePool();
        document.getElementById('progressText').textContent = '准备就绪';
    });
}

// 防抖的UI更新函数
const debouncedUpdateImagePool = debounce(updateImagePool, 100);
const debouncedUpdateGroups = debounce(updateGroups, 100);

// 防抖函数
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 更新图片池显示（优化版）
function updateImagePool() {
    const poolImages = document.getElementById('poolImages');
    const fragment = document.createDocumentFragment();
    
    // 使用文档片段减少重排
    uploadedImages.forEach(image => {
        const div = createImageElement(image, 'pool');
        fragment.appendChild(div);
    });
    
    poolImages.innerHTML = '';
    poolImages.appendChild(fragment);
    
    updateStitchButton();
}

// HTML 转义，防止文件名注入
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// 创建图片元素
function createImageElement(image, type) {
    const div = document.createElement('div');
    div.className = type === 'pool' ? 'pool-image' : 'group-image';
    div.draggable = true;
    div.dataset.imageId = image.id;
    
    const name = escapeHtml(image.name);
    const time = image.dateTime ? image.dateTime.toLocaleString() : '未知时间';
    
    if (type === 'pool') {
        div.innerHTML = `
            <img src="${image.src}" alt="${name}" loading="lazy">
            <div class="image-info">
                <span>${name}</span>
                <small>${time}</small>
            </div>
            <button class="remove-btn" onclick="removeImage('${image.id}')">×</button>
        `;
    } else {
        div.innerHTML = `
            <img src="${image.src}" alt="${name}" loading="lazy">
            <div class="image-info">
                <span class="filename">${name}</span>
                <small>${time}</small>
            </div>
            <button class="remove-btn" onclick="removeFromGroup(this)">×</button>
        `;
    }
    
    return div;
}

// 设置分组拖拽（事件委托版：文档级 dragstart/dragend/dragover 各一套，容器级处理高亮与放置）
function setupDragAndDropGroups() {
    const container = document.getElementById('groupsContainer');
    const poolImages = document.getElementById('poolImages');
    
    // 容器级事件委托：放置高亮与 drop 处理
    function handleDragEvents(e) {
        const target = e.target;
        const relatedTarget = e.relatedTarget;
        
        if (e.type === 'dragover') {
            if (target.classList.contains('group-images') || target.id === 'poolImages') {
                target.classList.add('drag-over');
            }
        } else if (e.type === 'dragleave') {
            if (target.classList.contains('group-images') || target.id === 'poolImages') {
                if (!target.contains(relatedTarget)) {
                    target.classList.remove('drag-over');
                }
            }
        } else if (e.type === 'drop') {
            e.preventDefault();
            
            const dropTarget = target.classList.contains('group-images') ? target : 
                             target.closest('.group-images') || 
                             (target.id === 'poolImages' ? target : null);
            
            if (!dropTarget) return;
            
            dropTarget.classList.remove('drag-over');
            
            const imageId = e.dataTransfer.getData('imageId');
            if (!imageId) return;
            
            const image = uploadedImages.find(img => img.id == imageId);
            if (!image) return;
            
            if (dropTarget.id === 'poolImages') {
                removeImageFromGroups(imageId);
                updateImagePool();
                updateGroups();
            } else if (dragSourceContainer === dropTarget) {
                // 同组内排序：DOM 顺序已在 dragover 中调整，只需同步数据模型
                updateGroupOrder(dropTarget);
            } else {
                const groupIndex = parseInt(dropTarget.dataset.groupIndex);
                addImageToGroup(image, groupIndex);
                updateGroups();
                updateImagePool();
            }
        }
    }
    
    // 绑定事件委托
    container.addEventListener('dragover', handleDragEvents);
    container.addEventListener('dragleave', handleDragEvents);
    container.addEventListener('drop', handleDragEvents);
    
    poolImages.addEventListener('dragover', handleDragEvents);
    poolImages.addEventListener('dragleave', handleDragEvents);
    poolImages.addEventListener('drop', handleDragEvents);
    
    // 文档级：允许放置 + 组内实时排序（只移动 DOM，数据模型在 drop/dragend 时同步）
    document.addEventListener('dragover', function(e) {
        e.preventDefault();
        
        const groupImages = e.target.closest('.group-images');
        if (groupImages && draggedElement) {
            const afterElement = getDragAfterElement(groupImages, e.clientX, e.clientY);
            const dragging = document.querySelector('.dragging');
            
            if (!dragging) return;
            
            if (afterElement == null) {
                groupImages.appendChild(dragging);
            } else {
                groupImages.insertBefore(dragging, afterElement);
            }
        }
    });
    
    // 文档级：统一处理图片池与分组内元素的拖拽开始
    document.addEventListener('dragstart', function(e) {
        const imgDiv = e.target.closest('.pool-image, .group-image');
        if (!imgDiv) return;
        
        draggedElement = imgDiv;
        dragSourceContainer = imgDiv.parentElement;
        imgDiv.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', imgDiv.outerHTML);
        e.dataTransfer.setData('imageId', imgDiv.dataset.imageId);
        imgDiv.style.cursor = 'grabbing';
    });
    
    // 文档级：统一收尾；未发生 drop（拖拽取消）时把最终 DOM 顺序同步回数据模型
    document.addEventListener('dragend', function(e) {
        const imgDiv = e.target.closest('.pool-image, .group-image');
        if (!imgDiv) return;
        
        imgDiv.classList.remove('dragging');
        imgDiv.style.cursor = '';
        
        const groupImages = imgDiv.closest('.group-images');
        if (groupImages && imgDiv.isConnected) {
            updateGroupOrder(groupImages);
        }
        
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
        draggedElement = null;
        dragSourceContainer = null;
    });
    
    // 触摸手势支持
    enableTouchSupport();
}

// 触摸手势支持（优化版：防误触 + 触觉反馈）
function enableTouchSupport() {
    let touchItem = null;
    let longPressTimer = null;
    let initialTouch = null;
    let touchThreshold = 10; // 移动阈值，防止误触
    
    // 拖拽跟手样式
    if (!document.querySelector('#touch-support-styles')) {
        const style = document.createElement('style');
        style.id = 'touch-support-styles';
        style.textContent = `
            .dragging {
                transition: none !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    // 阻止长按弹出系统菜单（安卓）；iOS 由 CSS -webkit-touch-callout 处理
    document.addEventListener('contextmenu', function(e) {
        if (e.target.closest('.pool-image, .group-image')) {
            e.preventDefault();
        }
    });
    
    // 触摸开始（不 preventDefault，保留页面滚动；移动超阈值会取消长按）
    document.addEventListener('touchstart', function(e) {
        const touch = e.touches[0];
        const target = e.target.closest('.pool-image, .group-image');
        
        if (target) {
            touchItem = target;
            initialTouch = { x: touch.clientX, y: touch.clientY };
            
            // 添加触觉反馈
            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
            
            // 长按触发拖拽（减少等待时间）
            longPressTimer = setTimeout(() => {
                if (touchItem) {
                    touchItem.classList.add('dragging');
                    
                    // 创建拖拽效果
                    const rect = touchItem.getBoundingClientRect();
                    const offsetX = touch.clientX - rect.left;
                    const offsetY = touch.clientY - rect.top;
                    
                    touchItem.dataset.touchOffsetX = offsetX;
                    touchItem.dataset.touchOffsetY = offsetY;
                    
                    // 增强触觉反馈
                    if (navigator.vibrate) {
                        navigator.vibrate(200);
                    }
                }
            }, 400);
        }
    }, { passive: false });
    
    // 触摸移动
    document.addEventListener('touchmove', function(e) {
        if (longPressTimer && initialTouch) {
            const touch = e.touches[0];
            const deltaX = Math.abs(touch.clientX - initialTouch.x);
            const deltaY = Math.abs(touch.clientY - initialTouch.y);
            
            // 如果移动超过阈值，取消长按
            if (deltaX > touchThreshold || deltaY > touchThreshold) {
                clearTimeout(longPressTimer);
                longPressTimer = null;
            }
        }
        
        if (touchItem && touchItem.classList.contains('dragging')) {
            e.preventDefault();
            
            const touch = e.touches[0];
            const offsetX = parseFloat(touchItem.dataset.touchOffsetX) || 0;
            const offsetY = parseFloat(touchItem.dataset.touchOffsetY) || 0;
            
            touchItem.style.position = 'fixed';
            touchItem.style.zIndex = '1000';
            touchItem.style.left = (touch.clientX - offsetX) + 'px';
            touchItem.style.top = (touch.clientY - offsetY) + 'px';
            touchItem.style.pointerEvents = 'none';
            touchItem.style.transform = 'rotate(3deg) scale(1.05)';
            touchItem.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';
            
            // 检测放置目标
            const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
            const groupImages = elementBelow?.closest('.group-images');
            const poolImages = elementBelow?.closest('#poolImages');
            
            document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            
            if (groupImages || poolImages) {
                (groupImages || poolImages).classList.add('drag-over');
            }
        }
    }, { passive: false });
    
    // 触摸结束
    document.addEventListener('touchend', function(e) {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
        
        if (touchItem) {
            if (touchItem.classList.contains('dragging')) {
                // 处理拖拽结束
                const touch = e.changedTouches[0];
                const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
                const groupImages = elementBelow?.closest('.group-images');
                const poolImages = elementBelow?.closest('#poolImages');
                
                // 重置样式
                touchItem.style.position = '';
                touchItem.style.zIndex = '';
                touchItem.style.left = '';
                touchItem.style.top = '';
                touchItem.style.pointerEvents = '';
                touchItem.style.transform = '';
                touchItem.style.boxShadow = '';
                touchItem.classList.remove('dragging');
                
                // 处理放置逻辑
                if (groupImages) {
                    const imageId = touchItem.dataset.imageId;
                    const image = uploadedImages.find(img => img.id == imageId);
                    if (image) {
                        const groupIndex = parseInt(groupImages.dataset.groupIndex);
                        addImageToGroup(image, groupIndex);
                        updateGroups();
                        updateImagePool();
                        
                        // 成功放置的触觉反馈
                        if (navigator.vibrate) {
                            navigator.vibrate([100, 50, 100]);
                        }
                    }
                } else if (poolImages) {
                    const imageId = touchItem.dataset.imageId;
                    removeImageFromGroups(imageId);
                    updateGroups();
                    updateImagePool();
                }
                
                document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
            }
            // 短按点击（删除按钮等）已交还浏览器原生 click 处理
            
            touchItem = null;
            initialTouch = null;
        }
    }, { passive: false });
    
    // 取消触摸
    document.addEventListener('touchcancel', function() {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
        
        if (touchItem) {
            touchItem.classList.remove('dragging');
            touchItem.style.position = '';
            touchItem.style.zIndex = '';
            touchItem.style.left = '';
            touchItem.style.top = '';
            touchItem.style.pointerEvents = '';
            touchItem.style.transform = '';
            touchItem.style.boxShadow = '';
            touchItem = null;
        }
        
        document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    }, { passive: false });
}

// 获取拖拽后的插入位置
function getDragAfterElement(container, x, y) {
    const draggableElements = [...container.querySelectorAll('.group-image:not(.dragging)')];
    
    return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
            return { offset: offset, element: child };
        } else {
            return closest;
        }
    }, { offset: Number.NEGATIVE_INFINITY }).element;
}

// 更新组内图片顺序
function updateGroupOrder(groupImages) {
    const groupIndex = parseInt(groupImages.dataset.groupIndex);
    if (isNaN(groupIndex) || !imageGroups[groupIndex]) return;
    
    const newOrder = [];
    const imageElements = groupImages.querySelectorAll('.group-image');
    
    imageElements.forEach(imgDiv => {
        const imageId = imgDiv.dataset.imageId;
        const image = imageGroups[groupIndex].find(img => img.id == imageId);
        if (image) {
            newOrder.push(image);
        }
    });
    
    imageGroups[groupIndex] = newOrder;
}

// 自动分组
function autoGroup() {
    const groupSize = parseInt(document.getElementById('groupSize').value);
    if (isNaN(groupSize) || groupSize <= 0) {
        alert('请输入有效的分组大小');
        return;
    }
    
    imageGroups = [];
    // 按拍摄时间排序（从早到晚）
    const images = [...uploadedImages].sort((a, b) => a.dateTime - b.dateTime);
    
    for (let i = 0; i < images.length; i += groupSize) {
        const group = images.slice(i, i + groupSize);
        imageGroups.push(group);
    }
    
    updateGroups();
    updateImagePool();
}

// 更新分组显示（优化版）
function updateGroups() {
    // 清理空分组，保证 DOM 的 data-group-index 与数据索引一致
    imageGroups = imageGroups.filter(group => group.length > 0);
    
    const container = document.getElementById('groupsContainer');
    const fragment = document.createDocumentFragment();
    
    imageGroups.forEach((group, index) => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'group-box';
        groupDiv.innerHTML = `
            <h4>第 ${index + 1} 组 (${group.length} 张图片)</h4>
            <div class="group-images" data-group-index="${index}"></div>
            <button onclick="clearGroup(${index})">清空分组</button>
        `;
        
        const imagesDiv = groupDiv.querySelector('.group-images');
        const imagesFragment = document.createDocumentFragment();
        
        group.forEach(image => {
            const imgDiv = createImageElement(image, 'group');
            imagesFragment.appendChild(imgDiv);
        });
        
        imagesDiv.appendChild(imagesFragment);
        fragment.appendChild(groupDiv);
    });
    
    container.innerHTML = '';
    container.appendChild(fragment);
    
    updateStitchButton();
}

// 添加图片到分组
function addImageToGroup(image, groupIndex) {
    // 确保groupIndex是有效的数字
    groupIndex = parseInt(groupIndex);
    if (isNaN(groupIndex) || groupIndex < 0) {
        groupIndex = 0;
    }
    
    // 如果groupIndex超出范围，创建新的分组
    while (imageGroups.length <= groupIndex) {
        imageGroups.push([]);
    }
    
    // 先按住目标组的引用再移除：若源组被搬空，后续 push 仍落在正确的组上
    const targetGroup = imageGroups[groupIndex];
    
    // 从其他分组或图片池中移除
    removeImageFromGroups(image.id);
    
    targetGroup.push(image);
}

// 从所有分组中移除图片（不清理空分组，由 updateGroups 统一清理，避免中途索引左移）
function removeImageFromGroups(imageId) {
    imageGroups.forEach(group => {
        const index = group.findIndex(img => img.id == imageId);
        if (index > -1) {
            group.splice(index, 1);
        }
    });
}

// 清空分组
function clearGroup(index) {
    imageGroups.splice(index, 1);
    updateGroups();
    updateImagePool();
}

// 从分组中移除图片
function removeFromGroup(button) {
    const imageDiv = button.parentElement;
    const imageId = imageDiv.dataset.imageId;
    removeImageFromGroups(imageId);
    updateGroups();
    updateImagePool();
}

// 移除图片
function removeImage(imageId) {
    const target = uploadedImages.find(img => img.id == imageId);
    if (target && target.src.startsWith('blob:')) {
        URL.revokeObjectURL(target.src);
    }
    uploadedImages = uploadedImages.filter(img => img.id != imageId);
    removeImageFromGroups(imageId);
    updateImagePool();
    updateGroups();
}

// 清空所有
function clearAll() {
    uploadedImages.forEach(img => {
        if (img.src.startsWith('blob:')) URL.revokeObjectURL(img.src);
    });
    uploadedImages = [];
    imageGroups = [];
    updateImagePool();
    updateGroups();
    document.getElementById('progressFill').style.width = '0%';
    document.getElementById('progressText').textContent = '准备就绪';
}

// 更新拼接按钮状态
function updateStitchButton() {
    const hasGroups = imageGroups.length > 0 && imageGroups.some(group => group.length > 1);
    document.getElementById('stitchBtn').disabled = !hasGroups;
}

// 开始拼接
async function startStitching() {
    if (isStitching) return;
    
    const quality = parseInt(document.getElementById('qualitySlider').value) / 100;
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    const stitchBtn = document.getElementById('stitchBtn');
    
    isStitching = true;
    stitchBtn.disabled = true;
    progressText.textContent = '开始处理...';
    
    try {
        let skippedGroups = 0;
        
        for (let i = 0; i < imageGroups.length; i++) {
            const group = imageGroups[i];
            if (group.length < 2) {
                skippedGroups++;
                continue;
            }
            
            progressText.textContent = `处理第 ${i + 1} 组，共 ${imageGroups.length} 组...`;
            
            const stitchedImage = await stitchImages(group, quality);
            await downloadImage(stitchedImage, `stitched_image_${i + 1}.jpg`);
            
            const progress = ((i + 1) / imageGroups.length) * 100;
            progressFill.style.width = progress + '%';
        }
        
        progressText.textContent = skippedGroups > 0
            ? `处理完成！（${skippedGroups} 个单图分组已跳过）`
            : '处理完成！';
        setTimeout(() => {
            progressFill.style.width = '0%';
            progressText.textContent = '准备就绪';
        }, 2000);
        
    } catch (error) {
        progressText.textContent = '处理失败: ' + error.message;
        console.error('Stitching error:', error);
    } finally {
        isStitching = false;
        updateStitchButton();
    }
}

// 拼接图片
async function stitchImages(images, quality) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // 加载所有图片
        const imageElements = [];
        let minWidth = Infinity;
        
        let loadedCount = 0;
        
        images.forEach((imageData, index) => {
            const img = new Image();
            img.onload = function() {
                minWidth = Math.min(minWidth, img.width);
                imageElements.push({ img, index, originalWidth: img.width, originalHeight: img.height });
                loadedCount++;
                
                if (loadedCount === images.length) {
                    // 所有图片加载完成
                    processStitching();
                }
            };
            img.onerror = reject;
            img.src = imageData.src;
        });
        
        function processStitching() {
            // 按原始顺序排序
            imageElements.sort((a, b) => a.index - b.index);
            
            // 计算指定输出宽度下的总高度
            const heightAt = (width) => imageElements.reduce((sum, { originalWidth, originalHeight }) =>
                sum + Math.max(1, Math.round(originalHeight * width / originalWidth)), 0);
            
            // 输出宽度：取最小原图宽（保证不放大），并钳制到 1080 以内
            let outputWidth = Math.min(minWidth, MAX_OUTPUT_WIDTH);
            
            // 总面积超限时等比缩小整条长图，规避移动端 canvas 尺寸上限
            if (outputWidth * heightAt(outputWidth) > MAX_CANVAS_AREA) {
                outputWidth = Math.max(1, Math.floor(
                    outputWidth * Math.sqrt(MAX_CANVAS_AREA / (outputWidth * heightAt(outputWidth)))
                ));
            }
            
            // 设置canvas尺寸
            canvas.width = outputWidth;
            canvas.height = heightAt(outputWidth);
            
            // 绘制白色背景
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // 拼接图片
            let yOffset = 0;
            imageElements.forEach(({ img, originalWidth, originalHeight }) => {
                const drawHeight = Math.max(1, Math.round(originalHeight * outputWidth / originalWidth));
                ctx.drawImage(img, 0, yOffset, outputWidth, drawHeight);
                yOffset += drawHeight;
            });
            
            // 转换为blob（quality 取值范围 0-1）
            canvas.toBlob(blob => {
                if (blob) {
                    resolve(URL.createObjectURL(blob));
                } else {
                    reject(new Error('Failed to create blob'));
                }
            }, 'image/jpeg', quality);
        }
    });
}

// 下载图片
function downloadImage(imageUrl, filename) {
    const a = document.createElement('a');
    a.href = imageUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    
    // 清理blob URL
    setTimeout(() => URL.revokeObjectURL(imageUrl), 1000);
}