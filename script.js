// ================= FILTER CONFIG =================
const DEFAULT_FILTERS = {
  brightness: 100,
  contrast: 100,
  saturation: 100,
  hueRotation: 0,
  blur: 0,
  grayscale: 0,
  opacity: 100,
  invert: 0,
  sharpness: 0,
};

const filters = {
  brightness: { value: 100, min: 0, max: 200, unit: "%" },
  contrast: { value: 100, min: 0, max: 200, unit: "%" },
  saturation: { value: 100, min: 0, max: 200, unit: "%" },
  hueRotation: { value: 0, min: 0, max: 360, unit: "deg" },
  blur: { value: 0, min: 0, max: 20, unit: "px" },
  grayscale: { value: 0, min: 0, max: 100, unit: "%" },
  opacity: { value: 100, min: 0, max: 100, unit: "%" },
  invert: { value: 0, min: 0, max: 100, unit: "%" },
  sharpness: { value: 0, min: 0, max: 100, unit: "%" },
};
// eyedropper and watermark tool
const eyedropperBtn = document.getElementById("eyedropper-btn");
const watermarkInput = document.getElementById("watermark-input");
const watermarkColor = document.getElementById("watermark-color");
const applyWatermarkBtn = document.getElementById("apply-watermark-btn");

// Advanced State Flags
let eyedropperActive = false;
let watermarkPlacementActive = false;


// ================= DOM =================
const removeBgBtn = document.getElementById("remove-bg-btn");
const container = document.getElementById("filters");
const image = document.getElementById("image");
const fileInput = document.getElementById("img-input");

const resetImageBtn = document.getElementById("reset-image-btn");
const cropBtn = document.getElementById("crop-btn");
const applyCropBtn = document.getElementById("apply-crop-btn");
const downloadBtn = document.getElementById("download-btn");

const mirrorHBtn = document.getElementById("mirror-h-btn");
const mirrorVBtn = document.getElementById("mirror-v-btn");

const text = document.querySelector(".p");
const icon = document.querySelector("i.ri-image-fill");
const cropBox = document.getElementById("crop-box");

// ================= STATE =================
let sliders = {};
let originalImage = null;
let currentImage = null;
let flipH = false;
let flipV = false;
let originalFileName = "edited-image.png";

// ================= CREATE FILTER UI =================
Object.keys(filters).forEach((name) => {
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

  const cssFilters = Object.keys(filters)
    .filter((k) => k !== "sharpness")
    .map((k) => {
      let key =
        k === "hueRotation"
          ? "hue-rotate"
          : k === "saturation"
            ? "saturate"
            : k;
      return `${key}(${filters[k].value}${filters[k].unit})`;
    })
    .join(" ");

  const matrixElement = document.getElementById("sharpen-matrix");
  let svgSharpFilterStr = "";

  if (matrixElement) {
    let amount = filters.sharpness.value / 25;
    if (amount > 0) {
      const k1 = -amount;
      const k2 = 1 + amount * 4;
      const matrixString = `0 ${k1} 0 ${k1} ${k2} ${k1} 0 ${k1} 0`;
      matrixElement.setAttribute("kernelMatrix", matrixString);
      svgSharpFilterStr = `url(#svg-sharpen)`;
    } else {
      matrixElement.setAttribute("kernelMatrix", "0 0 0 0 1 0 0 0 0");
    }
  }

  image.style.filter = `${cssFilters} ${svgSharpFilterStr}`.trim();

  let transformStr = "";
  if (flipH) transformStr += " scaleX(-1)";
  if (flipV) transformStr += " scaleY(-1)";
  image.style.transform = transformStr.trim() || "none";
}

function resetSlidersUI() {
  Object.keys(filters).forEach((k) => {
    filters[k].value = DEFAULT_FILTERS[k];
    if (sliders[k]) {
      sliders[k].value = DEFAULT_FILTERS[k];
      const valueText = sliders[k].parentElement.querySelector(".filter-value");
      if (valueText) valueText.innerText = DEFAULT_FILTERS[k] + filters[k].unit;
    }
  });
}

// ================= MIRROR TRIGGERS =================
if (mirrorHBtn) {
  mirrorHBtn.onclick = () => {
    if (!currentImage) return;
    flipH = !flipH;
    applyFilters();
  };
}

if (mirrorVBtn) {
  mirrorVBtn.onclick = () => {
    if (!currentImage) return;
    flipV = !flipV;
    applyFilters();
  };
}

// ================= IMAGE UPLOAD =================
fileInput.addEventListener("change", function () {
  const file = this.files[0];
  if (!file) return;

  originalFileName = file.name.replace(/\.[^/.]+$/, "") + "_edited.png";
  const reader = new FileReader();

  reader.onload = function (e) {
    originalImage = e.target.result;
    currentImage = e.target.result;
    image.src = currentImage;

    image.onload = () => {
      image.style.display = "block";
      text.style.display = "none";
      if (icon) icon.style.display = "none";
      flipH = false;
      flipV = false;
      resetSlidersUI();
      applyFilters();
    };
  };

  reader.readAsDataURL(file);
  fileInput.value = "";
});

// ================= BACKEND LINK: REMOVE BACKGROUND =================
removeBgBtn.onclick = async () => {
  if (!currentImage) return alert("Please upload an image first!");

  // Update button UI state to show loading spinner/text
  const originalText = removeBgBtn.innerText;
  removeBgBtn.innerText = "Processing...";
  removeBgBtn.disabled = true;

  try {
    // 1. Convert base64 workspace context back into a raw data Blob layout
    const responseBlob = await fetch(currentImage);
    const blob = await responseBlob.blob();

    // 2. Wrap blob inside standard multi-part payload package
    const formData = new FormData();
    formData.append("image", blob, "canvas_source.png");

    // 3. Connect to your active running Node.js localhost backend framework
    const backendResponse = await fetch("http://localhost:3000/remove-bg", {
      method: "POST",
      body: formData,
    });

    if (!backendResponse.ok)
      throw new Error("Failed to process background extraction.");

    // 4. Transform streaming buffer output directly into clear client image asset url
    const transparentBlob = await backendResponse.blob();
    const cleanImgDataUrl = URL.createObjectURL(transparentBlob);

    // 5. Commit mutations onto working application states
    currentImage = cleanImgDataUrl;
    image.src = currentImage;

    image.onload = () => {
      applyFilters();
      image.onload = null;
    };
  } catch (err) {
    console.error(err);
    alert(
      "Error removing background. Ensure your Express server is running on port 3000.",
    );
  } finally {
    removeBgBtn.innerText = originalText;
    removeBgBtn.disabled = false;
  }
};

// ================= FIXED RESET IMAGE =================
resetImageBtn.onclick = () => {
  if (!originalImage) return;

  currentImage = originalImage;
  image.src = currentImage;

  image.style.display = "block";
  text.style.display = "none";
  if (icon) icon.style.display = "none";

  flipH = false;
  flipV = false;
  resetSlidersUI();
  applyFilters();
  cropBox.style.display = "none";
};

// ================= CROP INITIALIZATION =================
cropBtn.onclick = () => {
  if (!currentImage) return;

  cropBox.style.display = "block";
  cropBox.style.width = "150px";
  cropBox.style.height = "150px";
  cropBox.style.left = "10px";
  cropBox.style.top = "10px";
};

let isDragging = false;
let isResizing = false;
let activeHandle = null;
let startX, startY, startL, startT, startW, startH;

cropBox.addEventListener("mousedown", (e) => {
  if (e.target.classList.contains("resize")) return;
  isDragging = true;
  startX = e.clientX;
  startY = e.clientY;
  startL = cropBox.offsetLeft;
  startT = cropBox.offsetTop;
  e.preventDefault();
});

document.querySelectorAll(".resize").forEach((handle) => {
  handle.addEventListener("mousedown", (e) => {
    isResizing = true;
    activeHandle = e.target;
    startX = e.clientX;
    startY = e.clientY;
    startW = cropBox.offsetWidth;
    startH = cropBox.offsetHeight;
    startL = cropBox.offsetLeft;
    startT = cropBox.offsetTop;
    e.stopPropagation();
    e.preventDefault();
  });
});

document.addEventListener("mousemove", (e) => {
  if (isDragging) {
    cropBox.style.left = startL + (e.clientX - startX) + "px";
    cropBox.style.top = startT + (e.clientY - startY) + "px";
  }

  if (isResizing && activeHandle) {
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (activeHandle.classList.contains("handle-br")) {
      cropBox.style.width = Math.max(30, startW + dx) + "px";
      cropBox.style.height = Math.max(30, startH + dy) + "px";
    } else if (activeHandle.classList.contains("handle-tl")) {
      const newWidth = startW - dx;
      const newHeight = startH - dy;

      if (newWidth > 30) {
        cropBox.style.width = newWidth + "px";
        cropBox.style.left = startL + dx + "px";
      }
      if (newHeight > 30) {
        cropBox.style.height = newHeight + "px";
        cropBox.style.top = startT + dy + "px";
      }
    }
  }
});

document.addEventListener("mouseup", () => {
  isDragging = false;
  isResizing = false;
  activeHandle = null;
});

// ================= ASYNCHRONOUS HIGH-QUALITY PROCESSING ENGINE =================
function generateProcessedCanvas(cropRect = null) {
  return new Promise((resolve) => {
    const imgElement = new Image();
    imgElement.crossOrigin = "anonymous";
    imgElement.src = currentImage;

    imgElement.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      const naturalW = imgElement.naturalWidth;
      const naturalH = imgElement.naturalHeight;

      let sw = naturalW;
      let sh = naturalH;
      let sx = 0;
      let sy = 0;
      if (cropRect) {
        const imgRect = image.getBoundingClientRect();
        const scaleX = naturalW / imgRect.width;
        const scaleY = naturalH / imgRect.height;

        let leftDiff = cropRect.left - imgRect.left;
        if (flipH) leftDiff = imgRect.right - cropRect.right;

        let topDiff = cropRect.top - imgRect.top;
        if (flipV) topDiff = imgRect.bottom - cropRect.bottom;

        sx = leftDiff * scaleX;
        sy = topDiff * scaleY;
        sw = cropRect.width * scaleX;
        sh = cropRect.height * scaleY;
      }

      canvas.width = sw;
      canvas.height = sh;

      ctx.save();

      if (flipH) {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }
      if (flipV) {
        ctx.translate(0, canvas.height);
        ctx.scale(1, -1);
      }

      // CRITICAL HIGH-QUALITY FIX: Direct injection of filter matrix layout state into raw context
      ctx.filter = image.style.filter;

      if (cropRect) {
        ctx.drawImage(imgElement, sx, sy, sw, sh, 0, 0, sw, sh);
      } else {
        ctx.drawImage(imgElement, 0, 0, sw, sh);
      }

      ctx.restore();
      resolve(canvas);
    };
  });
}

// ================= APPLY CROP =================
applyCropBtn.onclick = async () => {
  if (!currentImage) return;

  const cropRect = cropBox.getBoundingClientRect();
  const canvas = await generateProcessedCanvas(cropRect);

  currentImage = canvas.toDataURL("image/png", 1.0); // 1.0 enforces full, uncompressed color quality
  image.src = currentImage;

  image.onload = () => {
    flipH = false;
    flipV = false;
    resetSlidersUI();
    applyFilters();
    image.onload = null;
  };

  cropBox.style.display = "none";
};
// ================= HIGH-QUALITY PROCESSING ENGINE =================
function generateProcessedCanvas(cropRect = null) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  // Read dimensions directly from the loaded screen image
  const naturalW = image.naturalWidth;
  const naturalH = image.naturalHeight;

  let sw = naturalW;
  let sh = naturalH;
  let sx = 0;
  let sy = 0;

  if (cropRect) {
    const imgRect = image.getBoundingClientRect();
    const scaleX = naturalW / imgRect.width;
    const scaleY = naturalH / imgRect.height;

    let leftDiff = cropRect.left - imgRect.left;
    if (flipH) leftDiff = imgRect.right - cropRect.right;

    let topDiff = cropRect.top - imgRect.top;
    if (flipV) topDiff = imgRect.bottom - cropRect.bottom;

    sx = leftDiff * scaleX;
    sy = topDiff * scaleY;
    sw = cropRect.width * scaleX;
    sh = cropRect.height * scaleY;
  }

  canvas.width = sw;
  canvas.height = sh;

  ctx.save();
  
  if (flipH) {
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
  }
  if (flipV) {
    ctx.translate(0, canvas.height);
    ctx.scale(1, -1);
  }

  // FIX: Extract only standard CSS filters for canvas context to prevent url(#id) download breaking
  const standardCssFilters = Object.keys(filters)
    .filter((k) => k !== "sharpness")
    .map((k) => {
      let key = k === "hueRotation" ? "hue-rotate" : k === "saturation" ? "saturate" : k;
      return `${key}(${filters[k].value}${filters[k].unit})`;
    })
    .join(" ");

  ctx.filter = standardCssFilters;
  
  // Draw the image onto the canvas grid coordinate space cleanly
  if (cropRect) {
    ctx.drawImage(image, sx, sy, sw, sh, 0, 0, sw, sh);
  } else {
    ctx.drawImage(image, 0, 0, sw, sh);
  }
  
  ctx.restore();

  // MANUAL PIXEL SHARPNESS BAKING ENGINE FOR DOWNLOAD FLOWS
  // This simulates the SVG convolve matrix directly in pure JavaScript on canvas pixel data array
  if (filters.sharpness.value > 0) {
    let amount = filters.sharpness.value / 25;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const side = Math.round(Math.sqrt(9));
    const halfSide = Math.floor(side / 2);
    
    const k1 = -amount;
    const k2 = 1 + amount * 4;
    const weights = [0, k1, 0, k1, k2, k1, 0, k1, 0];
    
    const w = imageData.width;
    const h = imageData.height;
    const output = ctx.createImageData(w, h);
    const dst = output.data;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const sy = y;
        const sx = x;
        const dstOff = (y * w + x) * 4;
        let r = 0, g = 0, b = 0;
        
        for (let cy = 0; cy < side; cy++) {
          for (let cx = 0; cx < side; cx++) {
            const scy = Math.min(h - 1, Math.max(0, sy + cy - halfSide));
            const scx = Math.min(w - 1, Math.max(0, sx + cx - halfSide));
            const srcOff = (scy * w + scx) * 4;
            const wt = weights[cy * side + cx];
            r += pixels[srcOff] * wt;
            g += pixels[srcOff + 1] * wt;
            b += pixels[srcOff + 2] * wt;
          }
        }
        dst[dstOff] = r;
        dst[dstOff + 1] = g;
        dst[dstOff + 2] = b;
        dst[dstOff + 3] = pixels[dstOff + 3]; // Keep alpha opacity untouched
      }
    }
    ctx.putImageData(output, 0, 0);
  }

  return canvas;
}

// ================= APPLY CROP =================
applyCropBtn.onclick = () => {
  if (!currentImage) return;

  const cropRect = cropBox.getBoundingClientRect();
  const canvas = generateProcessedCanvas(cropRect);

  // Read data instantly from the created canvas layout
  currentImage = canvas.toDataURL("image/png"); 
  image.src = currentImage;

  image.onload = () => {
    flipH = false;
    flipV = false;
    resetSlidersUI();
    applyFilters();
    image.onload = null; 
  };

  cropBox.style.display = "none";
};

// ================= HIGH-QUALITY DOWNLOAD SYSTEM =================
downloadBtn.onclick = () => {
  if (!currentImage) return;

  // Build the final high-res canvas object synchronously
  const canvas = generateProcessedCanvas(null);

  // Output standard full data URL strings
  const dataUrl = canvas.toDataURL("image/png");

  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = originalFileName;
  
  // FIX: Append anchor to body tree so cross-browser downloads activate perfectly
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

// ================= REAL-TIME COLOR EYEDROPPER =================
if (eyedropperBtn) {
  eyedropperBtn.onclick = async () => {
    if (!currentImage) return alert("Please upload an image first!");
    
    // Check if browser natively supports EyeDropper API (Chrome, Edge, Opera)
    if (!window.EyeDropper) {
      alert("Your browser does not support the native Eyedropper API. Try Chrome or Edge!");
      return;
    }

    const eyeDropper = new EyeDropper();
    eyedropperBtn.style.borderColor = "var(--accent)";
    
    try {
      // Opens the native desktop system magnifying glass picker loop
      const result = await eyeDropper.open();
      
      // Flash the selected hex color into our UI accent palette variables dynamically!
      alert(`Color Selected: ${result.sRGBHex}`);
      
      // Optional: Set the color picker input value to the selected color
      if (watermarkColor) watermarkColor.value = result.sRGBHex;
      
    } catch (e) {
      console.log("Eyedropper canceled or failed.");
    } finally {
      eyedropperBtn.style.borderColor = "rgba(255, 255, 255, 0.08)";
    }
  };
}

// ================= CUSTOM IMAGE WATERMARKING / TEXT ADDITION =================
if (applyWatermarkBtn) {
  applyWatermarkBtn.onclick = () => {
    if (!currentImage) return alert("Please upload an image first!");
    if (!watermarkInput.value.trim()) return alert("Please type some text first!");
    
    // Toggle alignment placement tracking state on
    watermarkPlacementActive = true;
    document.querySelector(".bottom").classList.add("watermark-placement-active");
    applyWatermarkBtn.innerText = "Click on Image...";
  };
}

// Track mouse position on image viewport bounds to bake text coordinates accurately
image.onclick = (e) => {
  if (!watermarkPlacementActive) return;

  const rect = image.getBoundingClientRect();
  
  // Calculate relative percentage coordinates inside render boundaries
  const clickX = e.clientX - rect.left;
  const clickY = e.clientY - rect.top;

  // Map viewport pointer metrics back into absolute high-res natural pixel resolutions
  const naturalX = (clickX / rect.width) * image.naturalWidth;
  const naturalY = (clickY / rect.height) * image.naturalHeight;

  // Render text straight into your uncompressed local base64 source tracking engine
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  
  const renderImg = new Image();
  renderImg.src = currentImage;

  renderImg.onload = () => {
    canvas.width = renderImg.naturalWidth;
    canvas.height = renderImg.naturalHeight;
    
    // Copy active image structure back onto processing surface
    ctx.drawImage(renderImg, 0, 0);
    
    // Configure text typography layout properties matching image scaling size dynamically
    const fontSize = Math.max(20, Math.round(canvas.width * 0.035)); // Scaled text sizing matching resolution
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = watermarkColor.value;
    ctx.textBaseline = "middle";
    
    // Draw string onto image
    ctx.fillText(watermarkInput.value, naturalX, naturalY);
    
    // Commit output data strings back to master state definitions safely
    currentImage = canvas.toDataURL("image/png");
    image.src = currentImage;
    
    // Clear tracking flags out gracefully
    watermarkPlacementActive = false;
    document.querySelector(".bottom").classList.remove("watermark-placement-active");
    applyWatermarkBtn.innerText = "Add Text";
    watermarkInput.value = ""; // Empty string for fresh text iterations
    
    image.onload = () => {
      applyFilters();
      image.onload = null;
    };
  };
};

// ================= INIT =================
applyFilters();
