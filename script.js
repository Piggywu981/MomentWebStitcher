// 全局变量
let uploadedImages = [];
let imageGroups = [];
let draggedElement = null;

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
                const reader = new FileReader();
                reader.onload = function(e) {
                    const image = {
                        id: Date.now() + Math.random(),
                        name: file.name,
                        src: e.target.result,
                        file: file,
                        dateTime: null
                    };
                    
                    // 使用图片对象池避免重复创建
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
                                    dateTaken = file.lastModifiedDate || new Date(file.lastModified);
                                }
                                
                                image.dateTime = dateTaken;
                                resolve(image);
                            });
                        } catch (error) {
                            image.dateTime = file.lastModifiedDate || new Date(file.lastModified);
                            resolve(image);
                        }
                    };
                    img.onerror = function() {
                        image.dateTime = file.lastModifiedDate || new Date(file.lastModified);
                        resolve(image);
                    };
                    img.src = e.target.result;
                };
                reader.readAsDataURL(file);
            });
        });
        
        const batchImages = await Promise.all(loadPromises);
        processedCount += batchImages.length;
        
        // 分批更新UI，避免阻塞
        batchImages.sort((a, b) => a.dateTime - b.dateTime);
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

// 节流函数
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
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

// 创建图片元素
function createImageElement(image, type) {
    const div = document.createElement('div');
    div.className = type === 'pool' ? 'pool-image' : 'group-image';
    div.draggable = true;
    div.dataset.imageId = image.id;
    
    if (type === 'pool') {
        div.innerHTML = `
            <img src="${image.src}" alt="${image.name}" loading="lazy">
            <div class="image-info">
                <span>${image.name}</span>
                <small>${image.dateTime ? image.dateTime.toLocaleString() : '未知时间'}</small>
            </div>
            <button class="remove-btn" onclick="removeImage('${image.id}')">×</button>
        `;
    } else {
        div.innerHTML = `
            <img src="${image.src}" alt="${image.name}" loading="lazy">
            <div class="image-info">
                <span class="filename">${image.name}</span>
                <small>${image.dateTime ? image.dateTime.toLocaleString() : '未知时间'}</small>
            </div>
            <button class="remove-btn" onclick="removeFromGroup(this)">×</button>
        `;
    }
    
    // 拖拽事件
    div.addEventListener('dragstart', handleDragStart);
    div.addEventListener('dragend', handleDragEnd);
    
    return div;
}

// 拖拽事件处理
function handleDragStart(e) {
    draggedElement = e.target;
    e.target.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.innerHTML);
    e.dataTransfer.setData('imageId', e.target.dataset.imageId);
    
    // 立即设置鼠标样式
    e.target.style.cursor = 'grabbing';
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
    e.target.style.cursor = 'move';
    
    // 清除所有拖拽相关类
    document.querySelectorAll('.drag-over, .drag-active').forEach(el => {
        el.classList.remove('drag-over', 'drag-active');
    });
}

// 设置分组拖拽（事件委托优化版）
function setupDragAndDropGroups() {
    document.addEventListener('dragover', function(e) {
        e.preventDefault();
    });
    
    // 使用事件委托减少事件监听器数量
    const container = document.getElementById('groupsContainer');
    const poolImages = document.getElementById('poolImages');
    
    // 事件委托处理所有拖拽事件
    function handleDragEvents(e) {
        const target = e.target;
        const relatedTarget = e.relatedTarget;
        
        if (e.type === 'dragover') {
            e.preventDefault();
            if (target.classList.contains('group-images') || target.id === 'poolImages') {
                target.classList.add('drag-over');
            }
        } else if (e.type === 'dragleave') {
            if (target.classList.contains('group-images') || target.id === 'poolImages') {
                if (!target.contains(relatedTarget)) {
                    target.classList.remove('drag-over', 'drag-active');
                }
            }
        } else if (e.type === 'drop') {
            e.preventDefault();
            
            const dropTarget = target.classList.contains('group-images') ? target : 
                             target.closest('.group-images') || 
                             (target.id === 'poolImages' ? target : null);
            
            if (!dropTarget) return;
            
            dropTarget.classList.remove('drag-over', 'drag-active');
            
            const imageId = e.dataTransfer.getData('imageId');
            if (!imageId) return;
            
            const image = uploadedImages.find(img => img.id == imageId);
            if (!image) return;
            
            if (dropTarget.id === 'poolImages') {
                removeImageFromGroups(imageId);
                updateImagePool();
                updateGroups();
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
    
    // 启用组内排序功能
    enableGroupInternalSorting();
}

// 事件委托后，这个函数不再需要，移除以减少内存占用
// 拖拽事件处理现在由setupDragAndDropGroups中的事件委托统一管理

// 启用组内排序功能
function enableGroupInternalSorting() {
    // 组内排序的事件委托处理
    document.addEventListener('dragover', function(e) {
        const target = e.target;
        const groupImages = target.closest('.group-images');
        
        if (groupImages && draggedElement) {
            e.preventDefault();
            
            // 获取拖拽目标
            const afterElement = getDragAfterElement(groupImages, e.clientX, e.clientY);
            const dragging = document.querySelector('.dragging');
            
            if (afterElement == null) {
                groupImages.appendChild(dragging);
            } else {
                groupImages.insertBefore(dragging, afterElement);
            }
            
            // 更新数据模型
            updateGroupOrder(groupImages);
        }
    });
    
    // 为组内图片添加拖拽事件
    document.addEventListener('dragstart', function(e) {
        const imgDiv = e.target.closest('.group-image');
        if (imgDiv && imgDiv.parentElement.classList.contains('group-images')) {
            draggedElement = imgDiv;
            imgDiv.classList.add('dragging');
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/html', imgDiv.outerHTML);
            e.dataTransfer.setData('imageId', imgDiv.dataset.imageId);
            e.dataTransfer.setData('fromGroup', 'true');
        }
    });
    
    document.addEventListener('dragend', function(e) {
        const imgDiv = e.target.closest('.group-image');
        if (imgDiv) {
            imgDiv.classList.remove('dragging');
            draggedElement = null;
        }
    });
    
    // 触摸手势支持
    enableTouchSupport();
}

// 触摸手势支持（优化版：防误触 + 触觉反馈）
function enableTouchSupport() {
    let touchItem = null;
    let touchStartTime = 0;
    let longPressTimer = null;
    let initialTouch = null;
    let touchThreshold = 10; // 移动阈值，防止误触
    
    // 添加脉冲动画样式
    if (!document.querySelector('#touch-support-styles')) {
        const style = document.createElement('style');
        style.id = 'touch-support-styles';
        style.textContent = `
            @keyframes pulse {
                0% { opacity: 0.4; }
                50% { opacity: 0.8; }
                100% { opacity: 0.4; }
            }
            .dragging {
                transition: none !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    // 触摸开始
    document.addEventListener('touchstart', function(e) {
        const touch = e.touches[0];
        const target = e.target.closest('.pool-image, .group-image');
        
        if (target) {
            e.preventDefault();
            touchItem = target;
            touchStartTime = Date.now();
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
            const touchDuration = Date.now() - touchStartTime;
            
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
            } else if (touchDuration < 500) {
                // 短按 - 可能是点击删除按钮
                const rect = touchItem.getBoundingClientRect();
                const touch = e.changedTouches[0];
                
                // 检查是否在删除按钮上（扩大点击区域）
                const removeBtn = touchItem.querySelector('.remove-btn');
                if (removeBtn) {
                    const btnRect = removeBtn.getBoundingClientRect();
                    const expandedRect = {
                        left: btnRect.left - 10,
                        right: btnRect.right + 10,
                        top: btnRect.top - 10,
                        bottom: btnRect.bottom + 10
                    };
                    
                    if (touch.clientX >= expandedRect.left && touch.clientX <= expandedRect.right &&
                        touch.clientY >= expandedRect.top && touch.clientY <= expandedRect.bottom) {
                        removeBtn.click();
                        
                        // 删除操作的触觉反馈
                        if (navigator.vibrate) {
                            navigator.vibrate(100);
                        }
                    }
                }
            }
            
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
    if (groupSize <= 0) {
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
    
    // 从其他分组或图片池中移除
    removeImageFromGroups(image.id);
    
    // 确保目标分组存在
    if (!imageGroups[groupIndex]) {
        imageGroups[groupIndex] = [];
    }
    
    imageGroups[groupIndex].push(image);
}

// 从所有分组中移除图片
function removeImageFromGroups(imageId) {
    imageGroups.forEach(group => {
        const index = group.findIndex(img => img.id == imageId);
        if (index > -1) {
            group.splice(index, 1);
        }
    });
    
    // 移除空分组
    imageGroups = imageGroups.filter(group => group.length > 0);
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
    uploadedImages = uploadedImages.filter(img => img.id != imageId);
    removeImageFromGroups(imageId);
    updateImagePool();
    updateGroups();
}

// 清空所有
function clearAll() {
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
    const quality = parseInt(document.getElementById('qualitySlider').value) / 100;
    const progressFill = document.getElementById('progressFill');
    const progressText = document.getElementById('progressText');
    
    progressText.textContent = '开始处理...';
    
    try {
        for (let i = 0; i < imageGroups.length; i++) {
            const group = imageGroups[i];
            if (group.length < 2) continue;
            
            progressText.textContent = `处理第 ${i + 1} 组，共 ${imageGroups.length} 组...`;
            
            const stitchedImage = await stitchImages(group, quality);
            await downloadImage(stitchedImage, `stitched_image_${i + 1}.jpg`);
            
            const progress = ((i + 1) / imageGroups.length) * 100;
            progressFill.style.width = progress + '%';
        }
        
        progressText.textContent = '处理完成！';
        setTimeout(() => {
            progressFill.style.width = '0%';
            progressText.textContent = '准备就绪';
        }, 2000);
        
    } catch (error) {
        progressText.textContent = '处理失败: ' + error.message;
        console.error('Stitching error:', error);
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
        let totalHeight = 0;
        
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
            
            // 计算缩放后的尺寸
            const scaledImages = imageElements.map(({ img, originalWidth, originalHeight }) => {
                const scale = minWidth / originalWidth;
                const newHeight = Math.round(originalHeight * scale);
                totalHeight += newHeight;
                return { img, newHeight };
            });
            
            // 设置canvas尺寸
            canvas.width = minWidth;
            canvas.height = totalHeight;
            
            // 绘制白色背景
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // 拼接图片
            let yOffset = 0;
            scaledImages.forEach(({ img, newHeight }) => {
                const scale = minWidth / img.width;
                const scaledWidth = minWidth;
                const scaledHeight = newHeight;
                
                ctx.drawImage(img, 0, yOffset, scaledWidth, scaledHeight);
                yOffset += newHeight;
            });
            
            // 转换为blob
            canvas.toBlob(blob => {
                if (blob) {
                    resolve(URL.createObjectURL(blob));
                } else {
                    reject(new Error('Failed to create blob'));
                }
            }, 'image/jpeg', quality * 100);
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

// 预览功能
function updatePreview() {
    // 可以添加实时预览功能
    // 这里简化处理，实际可以显示第一张图片的预览
}