const video = document.getElementById("video");
const videoUpload = document.getElementById("videoUpload");
const timeline = document.getElementById("timeline");
const ctx = timeline.getContext("2d");

let hapticSpans = [];
let isDragging = false;
let dragStartX = 0;
let dragEndX = 0;
let selectedSpanIndex = null;
let triggeredSpans = new Set();

const editorPanel = document.getElementById("editorPanel");
const editStart = document.getElementById("editStart");
const editDuration = document.getElementById("editDuration");
const saveSpan = document.getElementById("saveSpan");
const deleteSpan = document.getElementById("deleteSpan");
const exportBtn = document.getElementById("exportBtn");

videoUpload.addEventListener("change", function () {
  const file = this.files[0];
  if (file) {
    const url = URL.createObjectURL(file);
    video.src = url;
    video.load();
  }
});

function xToTime(x) {
  return (x / timeline.width) * video.duration;
}

function timeToX(time) {
  return (time / video.duration) * timeline.width;
}

function drawTimeline() {
  ctx.clearRect(0, 0, timeline.width, timeline.height);

  // base line
  ctx.fillStyle = "#ddd";
  ctx.fillRect(0, timeline.height / 2 - 5, timeline.width, 10);

  // spans
  hapticSpans.forEach((span, i) => {
    const x = timeToX(span.start);
    const width = timeToX(span.duration);
    ctx.fillStyle = i === selectedSpanIndex ? "#f50057" : "#9c27b0";
    ctx.fillRect(x, timeline.height / 2 - 15, width, 30);
  });

  // drag preview
  if (isDragging) {
    const startX = Math.min(dragStartX, dragEndX);
    const width = Math.abs(dragEndX - dragStartX);
    ctx.fillStyle = "rgba(156, 39, 176, 0.5)";
    ctx.fillRect(startX, timeline.height / 2 - 15, width, 30);
  }
}

timeline.addEventListener("mousedown", (e) => {
  if (!video.duration) return;
  isDragging = true;
  dragStartX = e.offsetX;
  dragEndX = e.offsetX;
  drawTimeline();
});

timeline.addEventListener("mousemove", (e) => {
  if (!isDragging) return;
  dragEndX = e.offsetX;
  drawTimeline();
});

timeline.addEventListener("mouseup", (e) => {
  if (!isDragging) return;
  dragEndX = e.offsetX;
  isDragging = false;

  const startX = Math.min(dragStartX, dragEndX);
  const endX = Math.max(dragStartX, dragEndX);
  const start = xToTime(startX);
  const end = xToTime(endX);
  const duration = end - start;

  if (duration > 0.1) {
    hapticSpans.push({ start, duration });
  }

  drawTimeline();
});

timeline.addEventListener("click", (e) => {
  if (!video.duration || isDragging) return;

  const clickX = e.offsetX;
  const clickTime = xToTime(clickX);

  selectedSpanIndex = hapticSpans.findIndex(span =>
    clickTime >= span.start && clickTime <= (span.start + span.duration)
  );

  if (selectedSpanIndex >= 0) {
    const selected = hapticSpans[selectedSpanIndex];
    editorPanel.style.display = "block";
    editStart.value = selected.start.toFixed(2);
    editDuration.value = selected.duration.toFixed(2);
  } else {
    editorPanel.style.display = "none";
    selectedSpanIndex = null;
  }
});

saveSpan.addEventListener("click", () => {
  if (selectedSpanIndex === null) return;
  const start = parseFloat(editStart.value);
  const duration = parseFloat(editDuration.value);
  if (duration > 0) {
    hapticSpans[selectedSpanIndex] = { start, duration };
    drawTimeline();
    editorPanel.style.display = "none";
    selectedSpanIndex = null;
  }
});

deleteSpan.addEventListener("click", () => {
  if (selectedSpanIndex === null) return;
  hapticSpans.splice(selectedSpanIndex, 1);
  drawTimeline();
  editorPanel.style.display = "none";
  selectedSpanIndex = null;
});

exportBtn.addEventListener("click", () => {
  const json = JSON.stringify(hapticSpans, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "haptics.json";
  a.click();
});

function checkAndTriggerHaptics(currentTime) {
  hapticSpans.forEach((span, index) => {
    const spanStart = span.start;
    const spanEnd = span.start + span.duration;

    if (currentTime >= spanStart && currentTime < spanEnd && !triggeredSpans.has(index)) {
      if (navigator.vibrate) {
        navigator.vibrate(span.duration * 1000); // convert to ms
        console.log(`Vibrating: ${span.duration}s at ${currentTime}s`);
      }
      triggeredSpans.add(index);
    }

    if (currentTime < spanStart && triggeredSpans.has(index)) {
      triggeredSpans.delete(index);
    }
  });
}

video.addEventListener("timeupdate", () => {
  drawTimeline();
  checkAndTriggerHaptics(video.currentTime);
});

video.addEventListener("loadedmetadata", drawTimeline);
