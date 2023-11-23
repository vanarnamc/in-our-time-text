// Copyright 2023 The MediaPipe Authors.
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//      http://www.apache.org/licenses/LICENSE-2.0
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
import vision from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";
const { FaceLandmarker, FilesetResolver, DrawingUtils } = vision;
const demosSection = document.getElementById("demos");
const imageBlendShapes = document.getElementById("image-blend-shapes");
const videoBlendShapes = document.getElementById("video-blend-shapes");
let faceLandmarker;
let runningMode = "IMAGE";
let eyeColor = '#FF3030'; // Initial color, will be updated based on background

let enableWebcamButton;
let webcamRunning = false;
let headlines = []; // Array to store fetched headlines
let currentHeadlineIndex = 0; // Index of the current headline
const videoWidth = 480;

// New variable to keep track of whether to show the facial diagram
let showFacialDiagram = true;

let synth;
let reverb;
let synthReady = false;


// Before we can use HandLandmarker class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment to
// get everything needed to run.
async function createFaceLandmarker() {
    const filesetResolver = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");
    faceLandmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
            modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task`,
            delegate: "GPU"
        },
        outputFaceBlendshapes: true,
        runningMode,
        numFaces: 1
    });
    demosSection.classList.remove("invisible");
}

fetchNYTimesHeadlines();
createFaceLandmarker();

// Function to toggle the display of the facial diagram
function toggleFacialDiagram() {
    const outputCanvas = document.getElementById("output_canvas");
    outputCanvas.style.display = outputCanvas.style.display === "none" ? "block" : "none";
    
    // Update the text content of the "showHideText" element
    const showHideText = document.getElementById("showHideText");
    showHideText.textContent = outputCanvas.style.display === "none" ? "Show Diagram" : "Hide Diagram";
}

// Add a click event listener to the "showHideText" element
const showHideText = document.getElementById("showHideText");
showHideText.addEventListener("click", () => {
    toggleFacialDiagram();
});

// Initialize the visibility of the facial diagram (optional)
// toggleFacialDiagram();





const imageContainers = document.getElementsByClassName("detectOnClick");
// Now let's go through all of these and add a click event listener.
for (let imageContainer of imageContainers) {
    // Add event listener to the child element whichis the img element.
    imageContainer.children[0].addEventListener("click", handleClick);
}
// When an image is clicked, let's detect it and display results!
async function handleClick(event) {
    if (!faceLandmarker) {
        console.log("Wait for faceLandmarker to load before clicking!");
        return;
    }
    if (runningMode === "VIDEO") {
        runningMode = "IMAGE";
        await faceLandmarker.setOptions({ runningMode });
    }
    // Remove all landmarks drawed before
    const allCanvas = event.target.parentNode.getElementsByClassName("canvas");
    for (var i = allCanvas.length - 1; i >= 0; i--) {
        const n = allCanvas[i];
        n.parentNode.removeChild(n);
    }
    // We can call faceLandmarker.detect as many times as we like with
    // different image data each time. This returns a promise
    // which we wait to complete and then call a function to
    // print out the results of the prediction.
    const faceLandmarkerResult = faceLandmarker.detect(event.target);
    const canvas = document.createElement("canvas");
    canvas.setAttribute("class", "canvas");
    canvas.setAttribute("width", event.target.naturalWidth + "px");
    canvas.setAttribute("height", event.target.naturalHeight + "px");
    canvas.style.left = "0px";
    canvas.style.top = "0px";
    canvas.style.width = `${event.target.width}px`;
    canvas.style.height = `${event.target.height}px`;
    event.target.parentNode.appendChild(canvas);
    const ctx = canvas.getContext("2d");
    const drawingUtils = new DrawingUtils(ctx);
    for (const landmarks of faceLandmarkerResult.faceLandmarks) {
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, { color: "#C0C0C070", lineWidth: 1 });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, { color: "#FF3030" });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW, { color: "#FF3030" });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, { color: "#30FF30" });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW, { color: "#30FF30" });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, { color: "#E0E0E0" });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LIPS, {
            color: "#E0E0E0"
        });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS, { color: "#FF3030" });
        drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS, { color: "#30FF30" });
    }
    drawBlendShapes(imageBlendShapes, faceLandmarkerResult.faceBlendshapes);
}

// Function to fetch New York Times headlines
async function fetchNYTimesHeadlines() {
    const apiKey = 'n7F1g2jSF17lzYqzPa7W8mqpbyVRKEql'; // Replace with your New York Times API key
    try {
        const response = await fetch(`https://api.nytimes.com/svc/topstories/v2/home.json?api-key=${apiKey}`);
        const data = await response.json();
        headlines = data.results.map(result => {
            console.log("Headline:", result.title);
            let imageUrl = null;
            if (result.multimedia && result.multimedia.length) {
                imageUrl = result.multimedia[0].url;
                console.log("Image URL:", imageUrl);
            } else {
                console.log("No image available for this headline.");
            }
            return { title: result.title, imageUrl: imageUrl };
        });
    } catch (error) {
        console.error('Error fetching headlines:', error);
    }
}
// Assuming headlines is an array of objects with 'title' and 'imageUrl'
function displayNextHeadline() {
    if (headlines.length === 0) {
        headlineElement.textContent = "No headlines available";
        return;
    }
    const headlineElement = document.getElementById("headline");
    const currentHeadline = headlines[currentHeadlineIndex];

    headlineElement.textContent = currentHeadline.title;

    // Log the image URL associated with the current headline
    if (currentHeadline.imageUrl) {
        console.log(`Image URL for '${currentHeadline.title}': ${currentHeadline.imageUrl}`);
    } else {
        console.log(`No image available for '${currentHeadline.title}'.`);
    }

    currentHeadlineIndex = (currentHeadlineIndex + 1) % headlines.length;
}


/********************************************************************
// Face detection and landmark detection on webcam
********************************************************************/
const video = document.getElementById("webcam");
const canvasElement = document.getElementById("output_canvas");
const canvasCtx = canvasElement.getContext("2d");
// Check if webcam access is supported.
function hasGetUserMedia() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
}


function enableCam() {
    if (!faceLandmarker) {
      console.log("Wait! faceLandmarker not loaded yet.");
      return;
    }
  
    // Check and resume the Tone.js audio context
    if (Tone.context.state !== 'running') {
      Tone.context.resume().then(() => {
        console.log('Audio context running');
        initializeSynthAndEffects();
      }).catch(error => {
        console.error('Error resuming audio context:', error);
      });
    } else {
      // Initialize the synth if the context is already running
      initializeSynthAndEffects();
    }
  
    // getUserMedia parameters with facingMode
    const constraints = {
      video: {
        facingMode: "user" // Prefers the front-facing camera on mobile devices
      }
    };
  
    // Activate the webcam stream
    navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
      const video = document.getElementById('webcam');
      video.srcObject = stream;
      video.addEventListener('loadeddata', predictWebcam);
  
      // Hide the welcome screen and show the main content
      document.getElementById('welcomeScreen').classList.add('hidden');
      document.getElementById('mainContent').classList.remove('hidden');
    }).catch((error) => {
      console.error('Error accessing the webcam:', error);
    });
  }
  


  document.addEventListener('DOMContentLoaded', () => {
    const welcomeText = document.getElementById('welcomeText');
  
    if (welcomeText) {
      welcomeText.addEventListener('click', enableCam);
    }
  });



let lastVideoTime = -1;
let results = undefined;
const drawingUtils = new DrawingUtils(canvasCtx);

async function predictWebcam() {
    const radio = video.videoHeight / video.videoWidth;
    video.style.width = videoWidth + "px";
    video.style.height = videoWidth * radio + "px";
    canvasElement.style.width = videoWidth + "px";
    canvasElement.style.height = videoWidth * radio + "px";
    canvasElement.width = video.videoWidth;
    canvasElement.height = video.videoHeight;

    // Ensure the runningMode is set to "VIDEO"
    if (runningMode === "IMAGE") {
        runningMode = "VIDEO";
        await faceLandmarker.setOptions({ runningMode: runningMode });
    }

    let startTimeMs = performance.now();
    if (lastVideoTime !== video.currentTime) {
        lastVideoTime = video.currentTime;
        results = await faceLandmarker.detectForVideo(video, startTimeMs);
    }

    if (results && results.faceLandmarks) {
        // Save the current state of the canvas context
        canvasCtx.save();

        // Flip the canvas horizontally
        canvasCtx.scale(-1, 1);
        canvasCtx.translate(-canvasElement.width, 0);

        // Draw the facial landmarks here
        for (const landmarks of results.faceLandmarks) {
            drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_TESSELATION, { color: "#C0C0C070", lineWidth: 1 });
            drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, { color: eyeColor });
            drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, { color: eyeColor });
            drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYEBROW, { color: "#FF3030" });
            drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_EYEBROW, { color: "#30FF30" });
            drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_FACE_OVAL, { color: "#E0E0E0" });
            drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LIPS, { color: "#E0E0E0" });
            drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_RIGHT_IRIS, { color: eyeColor });
            drawingUtils.drawConnectors(landmarks, FaceLandmarker.FACE_LANDMARKS_LEFT_IRIS, {color: eyeColor });
        }

        // Restore the original state
        canvasCtx.restore();
    }
    drawBlendShapes(videoBlendShapes, results.faceBlendshapes);

    // Continuously request the next frame
    window.requestAnimationFrame(predictWebcam);
}




let lastBlinkTime = 0;
const blinkDebounceTime = 200; // 1 second debounce time
let isBackgroundBlack = true; // initial background color state

function toggleBackgroundColor() {
    const body = document.body;
    if (isBackgroundBlack) {
        body.style.backgroundColor = 'white';
        headline.style.color = 'black';
        eyeColor = 'black';
    } else {
        body.style.backgroundColor = 'black';
        headline.style.color = 'white';
        eyeColor = 'white';
    }
    isBackgroundBlack = !isBackgroundBlack;
}

function drawBlendShapes(el, blendShapes) {
    if (!blendShapes.length) {
        return;
    }

    blendShapes[0].categories.forEach((shape) => {
        const currentTime = Date.now();
        if ((shape.categoryName === 'eyeBlinkLeft' || shape.categoryName === 'eyeBlinkRight') && shape.score > 0.6) {
            if (currentTime - lastBlinkTime > blinkDebounceTime) {
                console.log(`Eye Blink Detected: ${shape.categoryName} - Score: ${shape.score}`);

                // Play a random frequency on eye blink
                playRandomFrequency();

                toggleBackgroundColor();
                displayNextHeadline();
                lastBlinkTime = currentTime;
            }
        }
    });

    // Remove the part that updates the HTML with the list items
    el.innerHTML = ''; // This line clears the list
}


function initializeSynthAndEffects() {
    if (Tone.context.state !== 'running') {
      console.error('Audio context is not running');
      return;
    }
  
    synth = new Tone.Synth({
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.005, decay: 0.1, sustain: 0.3, release: 1 }
    });
  
    reverb = new Tone.Reverb({
      decay: 5,
      wet: 0.75
    });
  
    synth.chain(reverb, Tone.Destination);
    synthReady = true;
    console.log('Synthesizer and reverb initialized');
  }

  function playRandomFrequency() {
    if (!synthReady) {
      console.warn('Synthesizer is not ready.');
      return;
    }
  
    const randomFreq = Math.random() * (18000 - 20) + 800; // Random frequency between 20 Hz and 20,000 Hz
    synth.triggerAttackRelease(randomFreq, "8n");
    console.log(`Playing frequency: ${randomFreq.toFixed(2)} Hz`);
  }