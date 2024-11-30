const uploadHistory = document.getElementById('upload-history');
const imageUpload = document.getElementById('imageUpload');
const pasteBtn = document.getElementById('paste-btn');
const loadingScreen = document.getElementById('loading-screen');
const contentWrapper = document.getElementById('content-wrapper');
const dropZone = document.getElementById('drop-zone');
const dropText = document.querySelector('.drop-text');

const maxFileSize = 10 * 1024 * 1024;

window.addEventListener('load', function () {
    const loadingScreen = document.getElementById('loading-screen');
    const content = document.getElementById('content');


    if (loadingScreen) {
        loadingScreen.style.display = 'none';
    }


    if (content) {
        content.style.display = 'block';
    }
});


document.addEventListener("DOMContentLoaded", () => {
    const storedUploads = getUploadsFromCookies();
    if (storedUploads.length > 0) {
        storedUploads.forEach((upload, index) => {
            addRecentUpload(index + 1, upload.url, upload.thumbnail, upload.time);
        });
    }
});


imageUpload.addEventListener('change', function () {
    if (imageUpload.files.length > 0) {
        dropZone.classList.add('bg-yellow-100', 'border-yellow-500');
        dropZone.classList.remove('bg-gray-200', 'border-gray-400');
    } else {
        dropZone.classList.remove('bg-yellow-100', 'border-yellow-500');
        dropZone.classList.add('bg-gray-200', 'border-gray-400');
    }
});

pasteBtn.addEventListener('click', () => {
    navigator.clipboard.read().then((items) => {
        for (let item of items) {
            if (item.types.includes('image/png') || item.types.includes('image/jpeg')) {
                item.getType('image/png').then((blob) => {
                    const file = new File([blob], 'pasted-image.png', { type: 'image/png' });
                    const dataTransfer = new DataTransfer();
                    dataTransfer.items.add(file);
                    imageUpload.files = dataTransfer.files;

                    document.getElementById('upload-form').dispatchEvent(new Event('submit'));
                });
            }
        }
    }).catch(err => {
        Swal.fire('Error', 'ไม่สามารถวางรูปจากคลิปบอร์ดได้', 'error');
    });
});

dropZone.addEventListener('dragenter', () => {
    dropZone.classList.add('bg-blue-100', 'border-blue-500', 'animate__pulse');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('bg-blue-100', 'border-blue-500', 'animate__pulse');
});

document.getElementById('upload-form').addEventListener('submit', function (e) {
    e.preventDefault();

    if (imageUpload.files.length === 0) {
        Swal.fire('Error', 'กรุณาเลือกไฟล์ที่จะอัปโหลด', 'error');
        return;
    }

    if (imageUpload.files[0].size > maxFileSize) {
        window.location.href = 'https://links.in.th/spd888';
        return;
    }

    const formData = new FormData(this);
    formData.append('image', imageUpload.files[0]);

    Swal.fire({
        title: 'กำลังอัปโหลด...',
        text: 'กรุณารอสักครู่',
        icon: 'info',
        showConfirmButton: false,
        allowOutsideClick: false,
        didOpen: () => {
            Swal.showLoading();
        }
    });

    fetch('upload.php', {
        method: 'POST',
        body: formData
    })
        .then(response => {
            if (response.status === 413) {
                window.location.href = 'https://links.in.th/spd888';
                throw new Error('ไฟล์ที่อัปโหลดมีขนาดใหญ่เกินไป');
            }
            return response.json();
        })
        .then(data => {
            if (data.redirect) {
                window.location.href = data.redirect;
            } else if (data.reload) {
                location.reload();
            } else if (data.success) {
                const fullUrl = data.url;
                const currentTime = new Date().toLocaleString();

                const storedUploads = getUploadsFromCookies();
                const newIndex = storedUploads.length + 1;
                addRecentUpload(newIndex, fullUrl, data.thumbnail, currentTime);
                saveUploadToCookies(fullUrl, data.thumbnail, currentTime);

                Swal.fire({
                    title: 'สำเร็จ!',
                    text: 'รูปภาพถูกอัปโหลดเรียบร้อยแล้ว',
                    icon: 'success',
                    didClose: () => {
                        dropZone.classList.remove('bg-blue-100', 'border-blue-500');
                        dropZone.classList.add('bg-green-100', 'border-green-500', 'animate__fadeIn');
                        dropText.innerHTML = `<i class="fas fa-check-circle fa-2x text-green-500 mb-2"></i>
                                          <p class="text-sm font-medium">ไฟล์ถูกอัปโหลดเรียบร้อยแล้ว!</p>`;
                    }
                });
            } else {
                Swal.fire('Error', data.message, 'error');
            }
        })
        .catch(error => {
            if (error.message !== 'ไฟล์ที่อัปโหลดมีขนาดใหญ่เกินไป') {
                Swal.fire('Error', 'เกิดข้อผิดพลาดขณะอัปโหลด', 'error');
            }
        });
});

function addRecentUpload(index, url, thumbnail, time) {
    uploadHistory.innerHTML = ''; 

    const uploadItem = document.createElement('div');
    uploadItem.classList.add('recent-upload-item', 'animate__animated', 'animate__fadeInUp', 'flex', 'space-x-4', 'bg-white', 'p-4', 'rounded-lg', 'shadow-md');

    const imgPreview = document.createElement('img');
    imgPreview.src = thumbnail;
    imgPreview.alt = 'Preview';
    imgPreview.classList.add('w-24', 'h-auto', 'rounded-lg');

    const uploadInfo = document.createElement('div');
    uploadInfo.classList.add('upload-info', 'text-gray-700', 'text-center', 'flex-grow');

    const indexLabel = document.createElement('span');
    indexLabel.textContent = `#${index}`;
    indexLabel.classList.add('text-sm', 'font-semibold');
    const timeLabel = document.createElement('span');
    timeLabel.textContent = `${time}`;
    timeLabel.classList.add('text-xs', 'text-gray-600');

    uploadInfo.appendChild(indexLabel);
    uploadInfo.appendChild(document.createElement('br'));
    uploadInfo.appendChild(timeLabel);

    const buttonContainer = document.createElement('div');
    buttonContainer.classList.add('flex', 'flex-col', 'space-y-2', 'ml-auto');

    const urlCopyBtn = document.createElement('button');
    urlCopyBtn.classList.add('btn', 'btn-success', 'btn-copy', 'text-white', 'p-2', 'rounded-lg', 'hover:bg-yellow-600');
    urlCopyBtn.innerHTML = `คัดลอก URL`;

    urlCopyBtn.addEventListener('click', function () {
        navigator.clipboard.writeText(url).then(function () {
            urlCopyBtn.classList.add('animate__animated', 'animate__bounceIn');
            urlCopyBtn.innerHTML = `คัดลอกเรียบร้อยแล้ว!`; 


            setTimeout(function () {
                urlCopyBtn.classList.remove('animate__animated', 'animate__bounceIn'); 
                urlCopyBtn.innerHTML = `คัดลอก URL`; 
            }, 2000);
        });
    });

    const previewBtn = document.createElement('button');
    previewBtn.classList.add('btn', 'btn-info', 'btn-preview', 'bg-blue-800', 'text-white', 'p-2', 'rounded-lg', 'hover:bg-blue-900');
    previewBtn.innerHTML = `ดูรูปภาพ`;

    previewBtn.addEventListener('click', function () {
        const modal = document.getElementById('image_modal');
        const modalImage = document.getElementById('modal_image');
        const uploadTime = document.getElementById('upload_time');

        modalImage.src = url; 
        uploadTime.innerHTML = `อัปโหลดเมื่อ: ${time}<br>ขอบคุณที่ใช้บริการของเรา`; 
        modal.showModal();
    });

    const closeModalBtn = document.getElementById('close_modal');
    closeModalBtn.addEventListener('click', function () {
        const modal = document.getElementById('image_modal');
        modal.close(); 
    });

    buttonContainer.appendChild(urlCopyBtn);
    buttonContainer.appendChild(previewBtn);

    uploadItem.appendChild(imgPreview);
    uploadItem.appendChild(uploadInfo);
    uploadItem.appendChild(buttonContainer);

    uploadHistory.prepend(uploadItem);
}

function saveUploadToCookies(url, thumbnail, time) {
    let uploads = getUploadsFromCookies();
    uploads.unshift({ url: url, thumbnail: thumbnail, time: time });
    if (uploads.length > 1) uploads.pop(); 

    document.cookie = "recentUploads=" + JSON.stringify(uploads) + "; path=/";
}

function getUploadsFromCookies() {
    const cookies = document.cookie.split('; ');
    const recentUploads = cookies.find(cookie => cookie.startsWith('recentUploads='));
    if (recentUploads) {
        return JSON.parse(recentUploads.split('=')[1]);
    }
    return [];
}
