// ================= Part 1: CONFIG, DOM, STATE & FILTER UI =================

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

// ================= ADVANCED TOOLS DOM =================
const eyedropperBtn = document.getElementById("eyedropper-btn");
const watermarkInput = document.getElementById("watermark-input");
const watermarkColor = document.getElementById("watermark-color");
const applyWatermarkBtn = document.getElementById("apply-watermark-btn");

// Advanced State Flags (Safely locked)
let eyedropperActive = false;
let watermarkPlacementActive = false;

// ================= MAIN CORE DOM =================
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

// ================= GLOBAL STATE =================
let sliders = {};
let originalImage = null;
let currentImage = null;
let flipH = false;
let flipV = false;
let originalFileName = "edited-image.png";

// ================= CREATE FILTER UI SLIDERS =================
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

// ================= REPAIRED APPLY FILTERS =================
function applyFilters() {
  if (!currentImage) return;

  const cssFilters = Object.keys(filters)
    .filter((k) => k !== "sharpness")
    .map((k) => {
      let key = k === "hueRotation" ? "hue-rotate" : k === "saturation" ? "saturate" : k;
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

  // FIX: Apply transform reflection states to parent container instead of breaking image element coordinates
  let transformStr = "";
  if (flipH) transformStr += " scaleX(-1)";
  if (flipV) transformStr += " scaleY(-1)";
  image.style.transform = transformStr.trim() || "none";
}

// ================= RESET SLIDERS DATA UI =================
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

// ================= MIRROR WORKSPACE TRIGGERS =================
if (mirrorHBtn) {
  mirrorHBtn.onclick = (e) => {
    if (!currentImage) return;
    e.preventDefault();
    flipH = !flipH;
    applyFilters();
  };
}

if (mirrorVBtn) {
  mirrorVBtn.onclick = (e) => {
    if (!currentImage) return;
    e.preventDefault();
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
      // FIX: Clear onload hook to prevent layout collision loops on future changes
      image.onload = null; 
    };
  };

  reader.readAsDataURL(file);
  fileInput.value = "";
});

// ================= REMOVE BACKGROUND (DIRECT VERSION) =================
removeBgBtn.onclick = async () => {
  if (!currentImage) return alert("Please upload an image first!");

  const originalText = removeBgBtn.innerText;
  removeBgBtn.innerText = "Processing...";
  removeBgBtn.disabled = true;

  try {
    // 1. Fetch your current canvas image and turn it into a binary blob
    const responseBlob = await fetch(currentImage);
    const blob = await responseBlob.blob();

    // 2. Pack it into a standard browser FormData object
    const formData = new FormData();
    formData.append("size", "auto");
    formData.append("image_file", blob, "canvas_source.png");

    // 3. Connect directly to the correct Remove.bg API engine URL
    const response = await fetch("https://remove.bg", {
      method: "POST",
      headers: {
        "X-Api-Key": "dg2rU4Qv6EZfLehqU6WB6XVr", // Your active API Key
      },
      body: formData, // The browser calculates headers and boundaries automatically
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || "API processing failure.");
    }

    // 4. Convert the incoming transparent PNG stream back to a workspace URL
    const transparentBlob = await response.blob();
    const base64Reader = new FileReader();
    base64Reader.readAsDataURL(transparentBlob);
    base64Reader.onloadend = function () {
      currentImage = base64Reader.result;
      image.src = currentImage;
      image.onload = () => {
        applyFilters();
        image.onload = null;
      };
    };

    alert("Background successfully removed!");

  } catch (err) {
    console.error(err);
    alert("Background Removal Failed: " + err.message);
  } finally {
    removeBgBtn.innerText = originalText;
    removeBgBtn.disabled = false;
  }
};

// ================= FIXED RESET IMAGE (WITH ACCIDENTAL CLICK CONFIRMATION) =================
resetImageBtn.onclick = (event) => {
  if (!originalImage) return;
  if (event) event.preventDefault();

  // SAFETY GUARD: Ask user for confirmation before wiping out their active adjustments
  const confirmReset = confirm("Are you sure you want to reset all edits? This will erase your text watermarks, crops, and filter settings.");
  
  // If the user clicks "Cancel", stop the function instantly and keep all edits safe!
  if (!confirmReset) {
    return; 
  }

  // If the user clicks "OK", proceed with the clean baseline reset
  currentImage = originalImage;
  image.src = currentImage;

  image.style.display = "block";
  text.style.display = "none";
  if (icon) icon.style.display = "none";

  flipH = false;
  flipV = false;
  resetSlidersUI();
  applyFilters();
  
  // Clean up any remaining crop rig overlays or toggles
  cropBox.style.display = "none";
  cropBtn.innerHTML = "Crop"; 
  
  // Clear out text placement tracking variables
  watermarkPlacementActive = false;
  if (applyWatermarkBtn) applyWatermarkBtn.innerText = "Add Text";
};

// ================= FIXED CROP INITIALIZATION (WITH TOGGLE CANCEL) =================
cropBtn.onclick = (e) => {
  if (!currentImage) return;
  if (e) e.preventDefault();

  // TOGGLE ACTION: If the box is already open, clicking "Cancel Crop" will shut it safely
  if (cropBox.style.display === "block") {
    cropBox.style.display = "none";
    cropBtn.innerHTML = "Crop"; // Revert text back to normal
    return;
  }

  // Otherwise, initialize the selection box frames cleanly
  cropBox.style.display = "block";
  cropBox.style.width = "150px";
  cropBox.style.height = "150px";
  cropBox.style.left = "10px";
  cropBox.style.top = "10px";

  // Shift text dynamically to inform the user they can back out safely
  cropBtn.innerHTML = "Cancel Crop";
};

// ================= CROP BOX MOUSE DRAG & RESIZE MECHANICS =================
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

// ================= HIGH-QUALITY SYNCHRONOUS CANVAS EXTRACTION ENGINE =================
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
  if (filters.sharpness.value > 0) {
    let amount = filters.sharpness.value / 25;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = imageData.data;
    const side = 3;
    const halfSide = 1;

    const k1 = -amount;
    const k2 = 1 + amount * 4;
    const weights = [0, k1, 0, k1, k2, k1, 0, k1, 0];

    const w = imageData.width;
    const h = imageData.height;
    const output = ctx.createImageData(w, h);
    const dst = output.data;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const dstOff = (y * w + x) * 4;
        let r = 0, g = 0, b = 0;

        for (let cy = 0; cy < side; cy++) {
          for (let cx = 0; cx < side; cx++) {
            const scy = Math.min(h - 1, Math.max(0, y + cy - halfSide));
            const scx = Math.min(w - 1, Math.max(0, x + cx - halfSide));
            const srcOff = (scy * w + scx) * 4;
            const wt = weights[cy * side + cx];
            r += pixels[srcOff] * wt;
            g += pixels[srcOff + 1] * wt;
            b += pixels[srcOff + 2] * wt;
          }
        }
        dst[dstOff] = Math.min(255, Math.max(0, r));
        dst[dstOff + 1] = Math.min(255, Math.max(0, g));
        dst[dstOff + 2] = Math.min(255, Math.max(0, b));
        dst[dstOff + 3] = pixels[dstOff + 3]; // Keep alpha opacity untouched
      }
    }
    ctx.putImageData(output, 0, 0);
  }

  return canvas;
}

// ================= FIXED SAFETY APPLY CROP =================
applyCropBtn.onclick = () => {
  if (!currentImage) return;

  // CRITICAL GUARD CLAUSE: If the crop box is hidden, stop the function immediately.
  // This completely prevents the image from disappearing if you click the button accidentally!
  if (cropBox.style.display === "none" || !cropBox.style.display) {
    return; 
  }

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
  cropBtn.innerHTML = "Crop"; // Resets the cancel toggle back to normal text
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

  // Append anchor to body tree so cross-browser downloads activate perfectly
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

// ================= CLEAN REAL-TIME COLOR EYEDROPPER =================
if (eyedropperBtn) {
  eyedropperBtn.onclick = async (event) => {
    if (!currentImage) return alert("Please upload an image first!");

    // Completely stops event looping to prevent system locking
    event.stopPropagation();
    event.preventDefault();

    if (!window.EyeDropper) {
      alert("Your browser does not support the native Eyedropper API. Try Chrome or Edge!");
      return;
    }

    const eyeDropper = new EyeDropper();
    const originalText = eyedropperBtn.innerHTML;
    
    eyedropperBtn.disabled = true;
    eyedropperBtn.style.borderColor = "var(--accent)";

    try {
      const result = await eyeDropper.open();
      const selectedHex = result.sRGBHex;

      // Auto-copy directly into system clipboard memory
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(selectedHex);
      }

      if (watermarkColor) watermarkColor.value = selectedHex;
      
      // Inline visual animation update completely replacing the glitchy system popup alert prompt
      eyedropperBtn.innerHTML = `<i class="ri-check-line" style="font-size:14px; color:#00ff00;"></i> Copied!`;
    } catch (e) {
      console.log("Eyedropper canceled safely.");
    } finally {
      setTimeout(() => {
        eyedropperBtn.innerHTML = originalText;
        eyedropperBtn.style.borderColor = "rgba(255, 255, 255, 0.08)";
        eyedropperBtn.disabled = false;
      }, 800);
    }
  };
}
// ================= CUSTOM IMAGE WATERMARKING / TEXT ADDITION =================
if (applyWatermarkBtn) {
  applyWatermarkBtn.onclick = (event) => {
    if (!currentImage) return alert("Please upload an image first!");
    if (!watermarkInput.value.trim()) return alert("Please type some text first!");

    event.stopPropagation();
    
    // Toggle alignment placement tracking state on
    watermarkPlacementActive = true;
    document.querySelector(".bottom").classList.add("watermark-placement-active");
    applyWatermarkBtn.innerText = "Click on Image...";
  };
}

// Track mouse position on image viewport bounds to bake text coordinates accurately
// Track mouse position on image viewport bounds to bake text coordinates accurately
image.addEventListener("click", (e) => {
  // CRITICAL GUARD: Drop out instantly if text mode wasn't explicitly started!
  if (!watermarkPlacementActive) return;

  const rect = image.getBoundingClientRect();
  let clickX = e.clientX - rect.left;
  let clickY = e.clientY - rect.top;

  // FIX: If Horizontal Mirror is active, mathematically flip the click X coordinate
  if (flipH) {
    clickX = rect.width - clickX;
  }

  // FIX: If Vertical Mirror is active, mathematically flip the click Y coordinate
  if (flipV) {
    clickY = rect.height - clickY;
  }

  // Map the calculated mirror-safe metrics back into absolute high-res natural pixel resolutions
  const naturalX = (clickX / rect.width) * image.naturalWidth;
  const naturalY = (clickY / rect.height) * image.naturalHeight;

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
    const fontSize = Math.max(20, Math.round(canvas.width * 0.035)); 
    ctx.font = `bold ${fontSize}px sans-serif`;
    ctx.fillStyle = watermarkColor.value;
    ctx.textBaseline = "middle";

    // Draw the string onto the image safely at the mirror-corrected coordinates
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
      image.onload = null; // Prevent loop collisions
    };
  };
});


// ================= INIT =================
// Only runs the calculation loops if an active file asset context is ready
applyFilters();

// ============================================================================
// ==================== ADVANCED FEATURE EXPANSION ADD-ON ====================
// ============================================================================

// 1. Core State Hook Initializations
const rotateBtn = document.getElementById("rotate-btn");
const cyberpunkBtn = document.getElementById("preset-cyberpunk");
const vintageBtn = document.getElementById("preset-vintage");
const noirBtn = document.getElementById("preset-noir");
const crimsonBtn = document.getElementById("preset-crimson");

let rotationAngle = 0; // Tracks master application orientation angles (0, 90, 180, 270)

// 2. Repaired Global Filters Multiplier Override (Wraps your existing applyFilters)
const originalApplyFilters = applyFilters;
applyFilters = function() {
  if (!currentImage) return;
  
  // Call your existing filter string assembly engine first
  originalApplyFilters();
  
  // Intercept and cleanly layer your rotation parameters over the mirror states
  let transformStr = "";
  if (flipH) transformStr += " scaleX(-1)";
  if (flipV) transformStr += " scaleY(-1)";
  if (rotationAngle !== 0) transformStr += ` rotate(${rotationAngle}deg)`;
  
  image.style.transform = transformStr.trim() || "none";
};

// 3. Reset Button State Hook Interceptor
if (resetImageBtn) {
  const originalResetClick = resetImageBtn.onclick;
  resetImageBtn.onclick = function(e) {
    rotationAngle = 0;
    if (rotateBtn) rotateBtn.disabled = false;
    originalResetClick(e);
  };
}

// 4. Incremental 90-Degree Geometric Rotation Engine Triggers
if (rotateBtn) {
  rotateBtn.onclick = (e) => {
    if (!currentImage) return alert("Please upload an image first!");
    if (e) e.preventDefault();
    
    // Cycle incrementally through degrees
    rotationAngle = (rotationAngle + 90) % 360;
    applyFilters();
  };
}

// 5. Aesthetic Preset Macro Automation Engines
function applyAestheticPreset(presetConfig) {
  if (!currentImage) return alert("Please upload an image first!");
  
  Object.keys(presetConfig).forEach(k => {
    if (filters[k] && sliders[k]) {
      filters[k].value = presetConfig[k];
      sliders[k].value = presetConfig[k];
      
      const valueText = sliders[k].parentElement.querySelector(".filter-value");
      if (valueText) valueText.innerText = presetConfig[k] + filters[k].unit;
    }
  });
  applyFilters();
}

if (cyberpunkBtn) cyberpunkBtn.onclick = (e) => { e.preventDefault(); applyAestheticPreset({ brightness: 110, contrast: 130, saturation: 180, hueRotation: 310, blur: 0, grayscale: 0, opacity: 100, invert: 0, sharpness: 10 }); };
if (vintageBtn) vintageBtn.onclick = (e) => { e.preventDefault(); applyAestheticPreset({ brightness: 95, contrast: 90, saturation: 70, hueRotation: 20, blur: 0, grayscale: 0, opacity: 100, invert: 0, sharpness: 0 }); };
if (noirBtn) noirBtn.onclick = (e) => { e.preventDefault(); applyAestheticPreset({ brightness: 100, contrast: 140, saturation: 0, hueRotation: 0, blur: 0, grayscale: 100, opacity: 100, invert: 0, sharpness: 20 }); };
if (crimsonBtn) crimsonBtn.onclick = (e) => { e.preventDefault(); applyAestheticPreset({ brightness: 90, contrast: 120, saturation: 140, hueRotation: 0, blur: 0, grayscale: 10, opacity: 100, invert: 0, sharpness: 15 }); };


