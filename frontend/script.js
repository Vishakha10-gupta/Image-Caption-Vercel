const fileInput = document.getElementById('fileInput');
const detectBtn = document.getElementById('detectBtn');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const clearBtn = document.getElementById('clearBtn');
const dropzone = document.getElementById('dropzone');
const previewImage = document.getElementById('previewImage');
const emptyState = document.getElementById('emptyState');
const imageMeta = document.getElementById('imageMeta');
const captionOutput = document.getElementById('captionOutput');
const loadingState = document.getElementById('loadingState');
const modelStatus = document.getElementById('modelStatus');
const statusBadge = document.getElementById('statusBadge');

let currentImageUrl = null;
let currentFileName = '';
let currentCaption = '';

// Backend API URL - configure this for your deployment
const BACKEND_API_URL = import.meta.env?.VITE_BACKEND_API_URL || 'http://localhost:8000';

function setPreview(file) {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      previewImage.onload = () => {
        previewImage.classList.add('visible');
        emptyState.style.display = 'none';
        imageMeta.textContent = `${file.name} · ${(file.size / 1024).toFixed(1)} KB`;
        currentImageUrl = event.target.result;
        currentFileName = file.name;
        captionOutput.textContent = 'No caption yet.';
        copyBtn.disabled = true;
        downloadBtn.disabled = true;
        detectBtn.disabled = false;
        resolve();
      };
      previewImage.src = event.target.result;
    };
    reader.readAsDataURL(file);
  });
}

async function requestBackendCaption(imageBase64) {
  try {
    const response = await fetch(`${BACKEND_API_URL}/api/caption`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: imageBase64.split(',')[1], // Remove data URL prefix
        name: currentFileName || 'image.jpg'
      })
    });

    if (!response.ok) {
      throw new Error('Backend request failed');
    }

    const data = await response.json();
    return data.caption;
  } catch (error) {
    console.error(error);
    throw error;
  }
}

async function analyzeImage(file) {
  loadingState.classList.remove('hidden');
  statusBadge.textContent = 'Analyzing';
  detectBtn.disabled = true;
  copyBtn.disabled = true;
  downloadBtn.disabled = true;

  try {
    const caption = await requestBackendCaption(currentImageUrl);
    currentCaption = caption;
    captionOutput.textContent = caption;
    copyBtn.disabled = false;
    downloadBtn.disabled = false;
    statusBadge.textContent = 'Complete';
  } catch (error) {
    statusBadge.textContent = 'Error';
    captionOutput.textContent = 'Failed to generate caption. Please check if the backend is running.';
    console.error(error);
  } finally {
    loadingState.classList.add('hidden');
    detectBtn.disabled = false;
  }
}

function clearImage() {
  fileInput.value = '';
  previewImage.removeAttribute('src');
  previewImage.classList.remove('visible');
  emptyState.style.display = 'flex';
  imageMeta.textContent = 'No image selected';
  captionOutput.textContent = 'No caption yet.';
  copyBtn.disabled = true;
  downloadBtn.disabled = true;
  detectBtn.disabled = true;
  currentCaption = '';
  currentFileName = '';
  currentImageUrl = null;
  modelStatus.textContent = 'Backend ready';
  statusBadge.textContent = 'Ready';
}

function copyCaption() {
  if (!currentCaption) {
    return;
  }

  navigator.clipboard.writeText(currentCaption).then(() => {
    statusBadge.textContent = 'Copied';
    setTimeout(() => {
      statusBadge.textContent = currentCaption ? 'Complete' : 'Ready';
    }, 1200);
  });
}

function downloadCaption() {
  if (!currentCaption) {
    return;
  }

  const blob = new Blob([currentCaption], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${currentFileName || 'caption'}.txt`;
  link.click();
  URL.revokeObjectURL(url);
}

fileInput.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }
  await setPreview(file);
});

detectBtn.addEventListener('click', async () => {
  const file = fileInput.files?.[0];
  if (!file) {
    captionOutput.textContent = 'Please choose an image first.';
    return;
  }
  await analyzeImage(file);
});

copyBtn.addEventListener('click', copyCaption);
downloadBtn.addEventListener('click', downloadCaption);
clearBtn.addEventListener('click', clearImage);

['dragenter', 'dragover'].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.add('drag-over');
  });
});

['dragleave', 'drop'].forEach((eventName) => {
  dropzone.addEventListener(eventName, (event) => {
    event.preventDefault();
    dropzone.classList.remove('drag-over');
  });
});

dropzone.addEventListener('drop', async (event) => {
  const file = event.dataTransfer?.files?.[0];
  if (file && file.type.startsWith('image/')) {
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInput.files = dataTransfer.files;
    await setPreview(file);
  }
});

window.addEventListener('load', () => {
  modelStatus.textContent = 'Backend ready';
});
