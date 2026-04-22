import * as THREE from 'three';
import { Chunk, CHUNK_SIZE, CHUNK_HEIGHT } from '../engine/Chunk';
import { BlockRegistry } from '../blocks/BlockRegistry';
import { getBlockRenderBounds } from '../blocks/blockGeometry';
import { DropEntity } from '../entities/DropEntity';

const boxGeometry = new THREE.BoxGeometry(1, 1, 1);

// Reusable temp objects
const tempMatrix = new THREE.Matrix4();
const tempColor = new THREE.Color();
const tempPosition = new THREE.Vector3();
const tempScale = new THREE.Vector3();
const tempQuaternion = new THREE.Quaternion();

export class ChunkMesh {
  public mesh: THREE.InstancedMesh;
  private dirty = true;
  private chunk: Chunk;

  constructor(chunk: Chunk) {
    this.chunk = chunk;
    // Max instances = chunk volume
    const maxInstances = CHUNK_SIZE * CHUNK_HEIGHT * CHUNK_SIZE;
    this.mesh = new THREE.InstancedMesh(boxGeometry, new THREE.MeshLambertMaterial(), maxInstances);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.count = 0;
    // Position the mesh at chunk world position
    this.mesh.position.set(chunk.cx * CHUNK_SIZE, 0, chunk.cz * CHUNK_SIZE);
  }

  markDirty() {
    this.dirty = true;
  }

  rebuild() {
    if (!this.dirty) return;
    this.dirty = false;

    let instanceIndex = 0;

    for (let x = 0; x < CHUNK_SIZE; x++) {
      for (let y = 0; y < CHUNK_HEIGHT; y++) {
        for (let z = 0; z < CHUNK_SIZE; z++) {
          const blockId = this.chunk.getBlock(x, y, z);
          if (blockId === 0) continue; // air

          // Face culling: only render if at least one face is exposed to non-opaque
          const hasExposedFace =
            !this.chunk.isOpaque(x - 1, y, z) ||
            !this.chunk.isOpaque(x + 1, y, z) ||
            !this.chunk.isOpaque(x, y - 1, z) ||
            !this.chunk.isOpaque(x, y + 1, z) ||
            !this.chunk.isOpaque(x, y, z - 1) ||
            !this.chunk.isOpaque(x, y, z + 1);

          if (!hasExposedFace) continue;

          const def = BlockRegistry.getById(blockId);
          const bounds = getBlockRenderBounds(def);
          const centerX = x + (bounds.minX + bounds.maxX) / 2;
          const centerY = y + (bounds.minY + bounds.maxY) / 2;
          const centerZ = z + (bounds.minZ + bounds.maxZ) / 2;
          const scaleX = bounds.maxX - bounds.minX;
          const scaleY = bounds.maxY - bounds.minY;
          const scaleZ = bounds.maxZ - bounds.minZ;

          tempPosition.set(centerX, centerY, centerZ);
          tempScale.set(scaleX, scaleY, scaleZ);
          tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
          this.mesh.setMatrixAt(instanceIndex, tempMatrix);
          tempColor.setHex(def.color);
          // Make transparent blocks slightly see-through
          if (def.transparent) {
            tempColor.r *= 0.85;
            tempColor.g *= 0.85;
            tempColor.b *= 0.85;
          }
          this.mesh.setColorAt(instanceIndex, tempColor);

          instanceIndex++;
        }
      }
    }

    this.mesh.count = instanceIndex;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) {
      this.mesh.instanceColor.needsUpdate = true;
    }
  }
}

export class VoxelRenderer {
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;
  private chunkMeshes = new Map<string, ChunkMesh>();
  private sunLight: THREE.DirectionalLight;
  public dropEntities: DropEntity[] = [];
  private readonly handleResize = () => this.onResize();

  constructor(container: HTMLElement) {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87CEEB);

    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    // Camera must be added to scene for child objects (like arm mesh) to render
    this.scene.add(this.camera);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(this.renderer.domElement);

    // Lighting
    const ambient = new THREE.AmbientLight(0x666666);
    this.scene.add(ambient);

    this.sunLight = new THREE.DirectionalLight(0xffffff, 1.0);
    this.sunLight.position.set(100, 200, 100);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 500;
    const d = 100;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.scene.add(this.sunLight);

    window.addEventListener('resize', this.handleResize);
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  addChunkMesh(chunk: Chunk) {
    const key = `${chunk.cx},${chunk.cz}`;
    const existing = this.chunkMeshes.get(key);
    if (existing) {
      this.scene.remove(existing.mesh);
      existing.mesh.dispose();
    }
    const cm = new ChunkMesh(chunk);
    cm.rebuild();
    this.chunkMeshes.set(key, cm);
    this.scene.add(cm.mesh);
  }

  removeChunkMesh(cx: number, cz: number) {
    const key = `${cx},${cz}`;
    const cm = this.chunkMeshes.get(key);
    if (cm) {
      this.scene.remove(cm.mesh);
      cm.mesh.dispose();
      this.chunkMeshes.delete(key);
    }
  }

  rebuildChunkMesh(chunk: Chunk) {
    const key = `${chunk.cx},${chunk.cz}`;
    const cm = this.chunkMeshes.get(key);
    if (cm) {
      cm.markDirty();
      cm.rebuild();
    }
  }

  addDropEntity(entity: DropEntity) {
    this.dropEntities.push(entity);
    this.scene.add(entity.mesh);
  }

  removeDropEntity(entity: DropEntity) {
    const idx = this.dropEntities.indexOf(entity);
    if (idx >= 0) {
      this.dropEntities.splice(idx, 1);
      this.scene.remove(entity.mesh);
      entity.dispose();
    }
  }

  updateLighting(sunAngle: number, lightLevel: number, skyColor: { r: number; g: number; b: number }) {
    // Update sun position
    const sunX = Math.cos(sunAngle) * 200;
    const sunY = Math.sin(sunAngle) * 200;
    this.sunLight.position.set(sunX, sunY, 50);
    this.sunLight.intensity = Math.max(0, Math.sin(sunAngle)) * 1.2;

    // Update ambient light
    const ambient = this.scene.children.find(c => c instanceof THREE.AmbientLight) as THREE.AmbientLight;
    if (ambient) {
      ambient.intensity = 0.2 + lightLevel * 0.4;
      ambient.color.setRGB(skyColor.r * 0.6, skyColor.g * 0.6, skyColor.b * 0.7);
    }

    // Update sky color
    this.scene.background = new THREE.Color(skyColor.r, skyColor.g, skyColor.b);
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }

  dispose() {
    this.renderer.dispose();
    window.removeEventListener('resize', this.handleResize);
  }
}
