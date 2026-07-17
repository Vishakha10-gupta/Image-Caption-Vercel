const fileInput = document.getElementById('fileInput');
const detectBtn = document.getElementById('detectBtn');
const copyBtn = document.getElementById('copyBtn');
const downloadBtn = document.getElementById('downloadBtn');
const clearBtn = document.getElementById('clearBtn');
const dropzone = document.getElementById('dropzone');
const previewImage = document.getElementById('previewImage');
const overlayCanvas = document.getElementById('overlayCanvas');
const emptyState = document.getElementById('emptyState');
const imageMeta = document.getElementById('imageMeta');
const captionOutput = document.getElementById('captionOutput');
const objectList = document.getElementById('objectList');
const loadingState = document.getElementById('loadingState');
const modelStatus = document.getElementById('modelStatus');
const statusBadge = document.getElementById('statusBadge');

let model = null;
let currentImageUrl = null;
let currentFileName = '';
let currentDetections = [];
let currentCaption = '';

const PRIORITY_OBJECTS = ['person', 'dog', 'cat', 'bicycle', 'car', 'bus', 'chair', 'laptop', 'phone', 'bottle', 'tree', 'bird', 'horse', 'sheep', 'cow', 'elephant', 'bear', 'zebra', 'giraffe'];

async function loadModel() {
  if (model) {
    return model;
  }

  modelStatus.textContent = 'Loading model...';
  loadingState.classList.remove('hidden');
  statusBadge.textContent = 'Loading';

  try {
    model = await cocoSsd.load();
    modelStatus.textContent = 'Model ready';
    statusBadge.textContent = 'Ready';
    loadingState.classList.add('hidden');
    detectBtn.disabled = false;
    return model;
  } catch (error) {
    modelStatus.textContent = 'Model failed';
    statusBadge.textContent = 'Error';
    captionOutput.textContent = 'The model could not be loaded. Please refresh the page.';
    loadingState.classList.add('hidden');
    throw error;
  }
}

function generateCaption(detections) {
  if (!detections.length) {
    return 'An image with no clearly detected objects.';
  }

  const sorted = [...detections].sort((a, b) => b.score - a.score);
  const primary = sorted[0];
  const relevant = sorted.filter((item) => PRIORITY_OBJECTS.includes(item.className) || item.score > 0.4);
  const topObjects = relevant.slice(0, 4).map((item) => item.className);

  if (!topObjects.length) {
    return `A ${primary.className} is visible in the image.`;
  }

  const uniqueObjects = [...new Set(topObjects)];

  if (uniqueObjects.length === 1) {
    return `A ${uniqueObjects[0]} is visible in the image.`;
  }

  if (uniqueObjects.length === 2) {
    return `A ${uniqueObjects[0]} and a ${uniqueObjects[1]} are visible in the image.`;
  }

  if (uniqueObjects.length === 3) {
    return `A ${uniqueObjects[0]}, ${uniqueObjects[1]}, and ${uniqueObjects[2]} are visible in the image.`;
  }

  return `A ${uniqueObjects[0]}, ${uniqueObjects[1]}, ${uniqueObjects[2]}, and ${uniqueObjects[3]} are visible in the image.`;
}

function resetCanvas() {
  const context = overlayCanvas.getContext('2d');
  context.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
}

function drawBoxes(detections) {
  const context = overlayCanvas.getContext('2d');
  const width = previewImage.naturalWidth || previewImage.clientWidth;
  const height = previewImage.naturalHeight || previewImage.clientHeight;
  overlayCanvas.width = width;
  overlayCanvas.height = height;
  context.clearRect(0, 0, width, height);

  const scaleX = width / previewImage.naturalWidth;
  const scaleY = height / previewImage.naturalHeight;

  detections.forEach((item) => {
    const [x, y, boxWidth, boxHeight] = item.bbox;
    const rectX = x * scaleX;
    const rectY = y * scaleY;
    const rectWidth = boxWidth * scaleX;
    const rectHeight = boxHeight * scaleY;

    context.strokeStyle = item.score > 0.6 ? '#65d6ff' : '#ffe082';
    context.lineWidth = 3;
    context.strokeRect(rectX, rectY, rectWidth, rectHeight);

    context.fillStyle = 'rgba(7, 17, 32, 0.8)';
    const labelHeight = 24;
    context.fillRect(rectX, Math.max(rectY - labelHeight, 0), 120, labelHeight);
    context.fillStyle = '#ffffff';
    context.font = '14px Inter, sans-serif';
    context.fillText(`${item.className} ${(item.score * 100).toFixed(0)}%`, rectX + 8, Math.max(rectY - 7, 12));
  });
}

function renderDetections(detections) {
  objectList.innerHTML = '';
  if (!detections.length) {
    objectList.innerHTML = '<li>No objects detected.</li>';
    return;
  }

  detections.forEach((item) => {
    const li = document.createElement('li');
    li.innerHTML = `<strong>${item.className}</strong> · ${(item.score * 100).toFixed(1)}% confidence`;
    objectList.appendChild(li);
  });
}

function updateCaption(detections, caption = null) {
  currentDetections = detections;
  currentCaption = caption || generateCaption(detections);
  captionOutput.textContent = currentCaption;
  renderDetections(detections);
  copyBtn.disabled = false;
  downloadBtn.disabled = false;
}

async function analyzeImage(file) {
  loadingState.classList.remove('hidden');
  statusBadge.textContent = 'Analyzing';
  detectBtn.disabled = true;
  copyBtn.disabled = true;
  downloadBtn.disabled = true;

  try {
    const modelInstance = await loadModel();
    const imageElement = previewImage;
    const predictions = await modelInstance.detect(imageElement);
    const filtered = predictions.filter((item) => item.score >= 0.35);
    updateCaption(filtered);
    drawBoxes(filtered);
    statusBadge.textContent = 'Complete';
  } catch (error) {
    statusBadge.textContent = 'Error';
    captionOutput.textContent = 'Detection failed. Please try another image.';
    objectList.innerHTML = '<li>Unable to analyze the image.</li>';
    console.error(error);
  } finally {
    loadingState.classList.add('hidden');
    detectBtn.disabled = false;
  }
}

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
        resetCanvas();
        captionOutput.textContent = 'No caption yet.';
        objectList.innerHTML = '';
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

function clearImage() {
  fileInput.value = '';
  previewImage.removeAttribute('src');
  previewImage.classList.remove('visible');
  emptyState.style.display = 'flex';
  imageMeta.textContent = 'No image selected';
  captionOutput.textContent = 'No caption yet.';
  objectList.innerHTML = '';
  copyBtn.disabled = true;
  downloadBtn.disabled = true;
  detectBtn.disabled = true;
  currentDetections = [];
  currentCaption = '';
  currentFileName = '';
  currentImageUrl = null;
  modelStatus.textContent = model ? 'Model ready' : 'Model loading...';
  statusBadge.textContent = 'Ready';
}

function copyCaption() {
  if (!currentCaption) {
    return;
  }

  navigator.clipboard.writeText(currentCaption).then(() => {
    statusBadge.textContent = 'Copied';
    setTimeout(() => {
      statusBadge.textContent = currentDetections.length ? 'Complete' : 'Ready';
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

window.addEventListener('load', async () => {
  try {
    await loadModel();
  } catch (error) {
    console.error(error);
  }
});
