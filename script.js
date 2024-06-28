const video = document.getElementById('webcam');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const loader = new THREE.GLTFLoader();
let glasses;

loader.load('models/glasses.glb', function (gltf) {
    glasses = gltf.scene;
    scene.add(glasses);
    glasses.visible = false;
    console.log("Glasses model loaded");
}, undefined, function (error) {
    console.error(error);
});

camera.position.z = 2;

const facemeshModel = new FaceMesh({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
});

facemeshModel.setOptions({
    maxNumFaces: 1,
    refineLandmarks: true,
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
});

facemeshModel.onResults(onResults);

async function startWebcam() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        console.log("Webcam started");
    } catch (error) {
        console.error("Error starting webcam:", error);
    }
}

video.addEventListener('loadeddata', async () => {
    console.log("Video loaded");
    await detectFace();
});

async function detectFace() {
    if (facemeshModel) {
        console.log("Detecting face...");
        await facemeshModel.send({ image: video });
        requestAnimationFrame(detectFace);
    }
}

function onResults(results) {
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        console.log("Face landmarks detected");
        const keypoints = results.multiFaceLandmarks[0];
        console.log("Keypoints:", keypoints);

        const nose = keypoints[6];
        const leftEye = keypoints[33];
        const rightEye = keypoints[263];
        console.log("Nose:", nose);
        console.log("Left Eye:", leftEye);
        console.log("Right Eye:", rightEye);

        const faceWidth = distanceBetweenPoints(leftEye, rightEye);
        console.log("Face Width:", faceWidth);

        if (glasses) {
            const nose3D = projectTo3D(nose);
            const leftEye3D = projectTo3D(leftEye);
            const rightEye3D = projectTo3D(rightEye);

            console.log("Nose 3D:", nose3D);
            console.log("Left Eye 3D:", leftEye3D);
            console.log("Right Eye 3D:", rightEye3D);

            const avgX = (leftEye3D.x + rightEye3D.x) / 2;
            const avgY = (leftEye3D.y + rightEye3D.y) / 2;

            glasses.position.set(avgX, avgY, nose3D.z - 0.2);
            glasses.scale.set(faceWidth / 100, faceWidth / 100, faceWidth / 100);
            glasses.visible = true;
            console.log("Glasses position:", glasses.position);
            console.log("Glasses scale:", glasses.scale);

            const dX = rightEye3D.x - leftEye3D.x;
            const dY = rightEye3D.y - leftEye3D.y;
            const rotation = Math.atan2(dY, dX);
            glasses.rotation.set(0, 0, rotation);
            console.log("Glasses rotation:", glasses.rotation);
        }
    } else {
        if (glasses) {
            glasses.visible = false;
        }
    }
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();

function projectTo3D(point) {
    const x = (point[0] / video.videoWidth) * 2 - 1;
    const y = -(point[1] / video.videoHeight) * 2 + 1;
    const z = 0;

    const vector = new THREE.Vector3(x, y, z);
    vector.unproject(camera);

    return vector;
}

function distanceBetweenPoints(point1, point2) {
    const dx = point1[0] - point2[0];
    const dy = point1[1] - point2[1];
    return Math.sqrt(dx * dx + dy * dy);
}

startWebcam();
