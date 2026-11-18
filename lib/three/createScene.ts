import {
  ACESFilmicToneMapping,
  DirectionalLight,
  HemisphereLight,
  Mesh,
  PCFShadowMap,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  ShadowMaterial,
  SRGBColorSpace,
  WebGLRenderer,
} from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js'

export interface ViewerContext {
  scene: Scene
  camera: PerspectiveCamera
  renderer: WebGLRenderer
  controls: OrbitControls
  pmrem: PMREMGenerator
  ground: Mesh
}

export class WebGLUnavailableError extends Error {
  constructor(cause?: unknown) {
    super('WebGL is not available in this browser.')
    this.name = 'WebGLUnavailableError'
    this.cause = cause
  }
}

/**
 * Builds the studio scene: renderer, camera, environment lighting, shadow-catching
 * ground and orbit controls. Client-only — never call during SSR.
 */
export function createScene(container: HTMLElement): ViewerContext {
  let renderer: WebGLRenderer
  try {
    renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' })
  } catch (err) {
    throw new WebGLUnavailableError(err)
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = SRGBColorSpace
  renderer.toneMapping = ACESFilmicToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = PCFShadowMap
  renderer.setClearColor(0x000000, 0) // transparent — page gradient shows through

  const canvas = renderer.domElement
  canvas.style.display = 'block'
  canvas.style.width = '100%'
  canvas.style.height = '100%'
  canvas.style.outline = 'none'
  container.appendChild(canvas)

  const scene = new Scene()

  // Image-based lighting from a procedural studio room.
  const pmrem = new PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  scene.environment = pmrem.fromScene(room, 0.04).texture
  scene.environmentIntensity = 0.85
  room.dispose()

  const hemi = new HemisphereLight(0xffffff, 0xd9d4cc, 0.6)
  scene.add(hemi)

  const key = new DirectionalLight(0xffffff, 1.6)
  key.position.set(1.6, 3.2, 2.2)
  key.castShadow = true
  key.shadow.mapSize.set(2048, 2048)
  key.shadow.camera.near = 0.5
  key.shadow.camera.far = 8
  key.shadow.camera.left = -1.5
  key.shadow.camera.right = 1.5
  key.shadow.camera.top = 1.5
  key.shadow.camera.bottom = -1.5
  key.shadow.radius = 6
  key.shadow.bias = -0.0005
  scene.add(key)

  // Invisible floor that only receives a soft shadow.
  const ground = new Mesh(new PlaneGeometry(10, 10), new ShadowMaterial({ opacity: 0.12 }))
  ground.rotation.x = -Math.PI / 2
  ground.receiveShadow = true
  ground.name = 'VIEWER_GROUND'
  scene.add(ground)

  const camera = new PerspectiveCamera(35, 1, 0.01, 100)
  camera.position.set(1.9, 1.0, 2.4)

  const controls = new OrbitControls(camera, canvas)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.enablePan = false
  controls.minDistance = 1.2
  controls.maxDistance = 5
  controls.minPolarAngle = Math.PI * 0.15
  controls.maxPolarAngle = Math.PI * 0.49 // never go below the floor
  controls.autoRotateSpeed = 0.6
  controls.target.set(0, 0.5, 0)
  controls.update()

  return { scene, camera, renderer, controls, pmrem, ground }
}
