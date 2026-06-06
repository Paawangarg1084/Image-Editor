// ================= FILTER CONFIG =================
const filters = {
  brightness: { value: 100, min: 0, max: 200, unit: "%" },
  contrast: { value: 100, min: 0, max: 200, unit: "%" },
  saturation: { value: 100, min: 0, max: 200, unit: "%" },
  hueRotation: { value: 0, min: 0, max: 360, unit: "deg" },
  blur: { value: 0, min: 0, max: 20, unit: "px" },
  grayscale: { value: 0, min: 0, max: 100, unit: "%" },
  opacity: { value: 100, min: 0, max: 100, unit: "%" },
  invert: { value: 0, min: 0, max: 100, unit: "%" }
};

// ================= DOM =================
const removeBgBtn = document.getElementById("remove-bg-btn");

const container = document.getElementById("filters");
const image = document.getElementById("image");
const fileInput = document.getElementById("img-input");

const resetImageBtn = document.getElementById("reset-image-btn");
const cropBtn = document.getElementById("crop-btn");
const applyCropBtn = document.getElementById("apply-crop-btn");
const downloadBtn = document.getElementById("download-btn");

const text = document.querySelector(".p");
const icon = document.querySelector("i");
const cropBox = document.getElementById("crop-box");

// ================= STATE =================
let sliders = {};
let originalImage = null;
let currentImage = null;

// ================= CREATE FILTER UI =================
Object.keys(filters).forEach(name => {
  const f = filters[name];

  const div = document.createElement("div");
  div.classList.add("filter");

  const top = document.createElement("div");
  top.classList.add("filter-top");

  const label = document.createElement("span");
  label.innerText = name;

  const valueText = document.createElement("span");
  valueText.classList.add("filter-value");
  valueText.innerText = f.value + f.unit;

  top.append(label, valueText);

  const input = document.createElement("input");
  input.type = "range";
  input.min = f.min;
  input.max = f.max;
  input.value = f.value;

  input.oninput = () => {
    filters[name].value = input.value;
    valueText.innerText = input.value + f.unit;
    applyFilters();
  };

  div.append(top, input);
  container.appendChild(div);
  sliders[name] = input;
});

// ================= APPLY FILTERS =================
function applyFilters() {
  if (!currentImage) return;

  const str = Object.keys(filters).map(k => {
    let key =
      k === "hueRotation" ? "hue-rotate" :
      k === "saturation" ? "saturate" :
      k;

    return `${key}(${filters[k].value}${filters[k].unit})`;
  }).join(" ");

  image.style.filter = str;
}

// ================= IMAGE UPLOAD =================
fileInput.addEventListener("change", function () {
  const file = this.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = function (e) {
    originalImage = e.target.result;
    currentImage = e.target.result;

    image.src = currentImage;

    image.onload = () => {
      image.style.display = "block";
      text.style.display = "none";
      icon.style.display = "none";
      applyFilters();
    };
  };

  reader.readAsDataURL(file);
  fileInput.value = "";
});

// ================= RESET IMAGE (DELETE IMAGE) =================
resetImageBtn.onclick = () => {
  // remove image completely
  image.src = "";
  image.style.display = "none";

  // reset state
  originalImage = null;
  currentImage = null;

  // show placeholder again
  text.style.display = "block";
  icon.style.display = "block";

  // reset filters UI
  Object.keys(filters).forEach(k => {
    filters[k].value =
      (k === "brightness" || k === "contrast" || k === "saturation") ? 100 : 0;

    sliders[k].value = filters[k].value;

    const valueText = sliders[k].parentElement.querySelector(".filter-value");
    valueText.innerText = filters[k].value + filters[k].unit;
  });

  // hide crop box
  cropBox.style.display = "none";
};

// ================= CROP =================
cropBtn.onclick = () => {
  if (!currentImage) return;

  cropBox.style.display = "block";
  cropBox.style.width = "200px";
  cropBox.style.height = "150px";
  cropBox.style.left = "20px";
  cropBox.style.top = "20px";
};

// ================= DRAG =================
let isDragging = false;
let startX, startY, startL, startT;

cropBox.onmousedown = e => {
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;
  startL = cropBox.offsetLeft;
  startT = cropBox.offsetTop;
};

document.onmousemove = e => {
  if (!isDragging) return;

  cropBox.style.left = startL + (e.clientX - startX) + "px";
  cropBox.style.top = startT + (e.clientY - startY) + "px";
};

document.onmouseup = () => {
  isDragging = false;
};

// ================= APPLY CROP =================
applyCropBtn.onclick = () => {
  if (!currentImage) return;

  const imgRect = image.getBoundingClientRect();
  const cropRect = cropBox.getBoundingClientRect();

  const scaleX = image.naturalWidth / imgRect.width;
  const scaleY = image.naturalHeight / imgRect.height;

  const sx = (cropRect.left - imgRect.left) * scaleX;
  const sy = (cropRect.top - imgRect.top) * scaleY;
  const sw = cropRect.width * scaleX;
  const sh = cropRect.height * scaleY;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = sw;
  canvas.height = sh;

  ctx.filter = image.style.filter;
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);

  currentImage = canvas.toDataURL();
  image.src = currentImage;

  cropBox.style.display = "none";
};

// ================= DOWNLOAD =================
downloadBtn.onclick = () => {
  if (!currentImage) return;

  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;

  ctx.filter = image.style.filter;
  ctx.drawImage(image, 0, 0);

  const a = document.createElement("a");
  a.href = canvas.toDataURL();
  a.download = "image.png";
  a.click();
};

// ================= INIT =================
applyFilters();