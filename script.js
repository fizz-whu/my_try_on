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
}, undefined, function (error) {
    console.error(error);
});

camera.position.z = 2;

let facemeshModel;
(async () => {
    facemeshModel = await facemesh.load();
    startWebcam();
})();

video.addEventListener('loadeddata', () => {
    detectFace();
});

async function detectFace() {
    if (facemeshModel) {
        const predictions = await facemeshModel.estimateFaces({input: video});
        if (predictions.length > 0) {
            const keypoints = predictions[0].scaledMesh;
            const nose = keypoints[6];
            const leftEye = keypoints[33];
            const rightEye = keypoints[263];
            const faceWidth = distanceBetweenPoints(leftEye, rightEye);

            if (glasses) {
                const nose3D = projectTo3D(nose);
                const leftEye3D = projectTo3D(leftEye);
                const rightEye3D = projectTo3D(rightEye);

                const avgX = (leftEye3D.x + rightEye3D.x) / 2;
                const avgY = (leftEye3D.y + rightEye3D.y) / 2;

                glasses.position.set(avgX, avgY, nose3D.z - 0.2);
                glasses.scale.set(faceWidth / 100, faceWidth / 100, faceWidth / 100);
                glasses.visible = true;

                const dX = rightEye3D.x - leftEye3D.x;
                const dY = rightEye3D.y - leftEye3D.y;
                const rotation = Math.atan2(dY, dX);
                glasses.rotation.set(0, 0, rotation);
            }
        } else {
            if (glasses) {
                glasses.visible = false;
            }
        }
    }
    requestAnimationFrame(detectFace);
}

function startWebcam() {
    navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
        video.srcObject = stream;
    }).catch(console.error);
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
