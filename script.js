// 全局变量
let uploadedImages = [];
let imageGroups = [];
let draggedElement = null;

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

// 处理图片上传
function handleImageUpload(files) {
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const image = {
                id: Date.now() + Math.random(),
                name: file.name,
                src: e.target.result,
                file: file
            };
            uploadedImages.push(image);
            updateImagePool();
        };
        reader.readAsDataURL(file);
    });
}

// 更新图片池显示
function updateImagePool() {
    const poolImages = document.getElementById('poolImages');
    poolImages.innerHTML = '';
    
    uploadedImages.forEach(image => {
        const div = createImageElement(image, 'pool');
        poolImages.appendChild(div);
    });
    
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
            <img src="${image.src}" alt="${image.name}">
            <button class="remove-btn" onclick="removeImage('${image.id}')">×</button>
        `;
    } else {
        div.innerHTML = `
            <img src="${image.src}" alt="${image.name}">
            <span class="filename">${image.name}</span>
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
}

function handleDragEnd(e) {
    e.target.classList.remove('dragging');
}

// 设置分组拖拽
function setupDragAndDropGroups() {
    document.addEventListener('dragover', function(e) {
        e.preventDefault();
    });
    
    document.addEventListener('drop', function(e) {
        e.preventDefault();
        const imageId = e.dataTransfer.getData('imageId');
        if (!imageId) return;
        
        const target = e.target.closest('.group-images, #poolImages');
        if (!target) return;
        
        const image = uploadedImages.find(img => img.id == imageId);
        if (!image) return;
        
        if (target.id === 'poolImages') {
            // 拖回图片池
            removeImageFromGroups(imageId);
            updateImagePool();
            updateGroups();
        } else {
            // 拖到分组
            const groupIndex = parseInt(target.dataset.groupIndex);
            addImageToGroup(image, groupIndex);
            updateGroups();
            updateImagePool();
        }
    });
}

// 自动分组
function autoGroup() {
    const groupSize = parseInt(document.getElementById('groupSize').value);
    if (groupSize <= 0) {
        alert('请输入有效的分组大小');
        return;
    }
    
    imageGroups = [];
    const images = [...uploadedImages];
    
    for (let i = 0; i < images.length; i += groupSize) {
        const group = images.slice(i, i + groupSize);
        imageGroups.push(group);
    }
    
    updateGroups();
    updateImagePool();
}

// 更新分组显示
function updateGroups() {
    const container = document.getElementById('groupsContainer');
    container.innerHTML = '';
    
    imageGroups.forEach((group, index) => {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'group-box';
        groupDiv.innerHTML = `
            <h4>第 ${index + 1} 组 (${group.length} 张图片)</h4>
            <div class="group-images" data-group-index="${index}"></div>
            <button onclick="clearGroup(${index})">清空分组</button>
        `;
        
        const imagesDiv = groupDiv.querySelector('.group-images');
        group.forEach(image => {
            const imgDiv = createImageElement(image, 'group');
            imagesDiv.appendChild(imgDiv);
        });
        
        container.appendChild(groupDiv);
    });
    
    updateStitchButton();
}

// 添加图片到分组
function addImageToGroup(image, groupIndex) {
    if (groupIndex >= imageGroups.length) {
        imageGroups.push([]);
    }
    
    // 从其他分组或图片池中移除
    removeImageFromGroups(image.id);
    
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