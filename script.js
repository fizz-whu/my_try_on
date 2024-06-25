import * as THREE from 'https://threejs.org/build/three.module.js';
import { GLTFLoader } from 'https://threejs.org/examples/jsm/loaders/GLTFLoader.js';
import * as facemesh from '@tensorflow-models/facemesh';

const video = document.getElementById('webcam');
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const loader = new GLTFLoader();
let glasses;

loader.load('models/glasses.glb', function (gltf) {
    glasses = gltf.scene;
    scene.add(glasses);
    glasses.visible = false;
}, undefined, function (error) {
    console.error(error);
});

camera.position.z = 5;

const facemeshModel = await facemesh.load();
video.addEventListener('loadeddata', () => {
    detectFace();
});

async function detectFace() {
    const predictions = await facemeshModel.estimateFaces(video);
    if (predictions.length > 0) {
        const keypoints = predictions[0].scaledMesh;
        const nose = keypoints[2];
        const leftEye = keypoints[33];
        const rightEye = keypoints[263];

        if (glasses) {
            glasses.position.set(nose[0], nose[1], nose[2]);
            glasses.scale.set(0.01, 0.01, 0.01);
            glasses.visible = true;
        }
    }
    requestAnimationFrame(detectFace);
}

function startWebcam() {
    navigator.mediaDevices.getUserMedia({ video: true }).then(stream => {
        video.srcObject = stream;
    }).catch(console.error);
}

startWebcam();

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
animate();