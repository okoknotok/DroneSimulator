import { useEffect, useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { isFirebaseConfigured } from './firebase'
import './App.css'

const starterProgram = `TAKEOFF
UP 2
FORWARD 4
RIGHT 3
TURN 90
FORWARD 2
LAND`

const clamp = (value, min, max) => Math.min(Math.max(value, min), max)

function parseProgram(source) {
  const commands = source
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith('#'))

  const position = { x: 0, y: 0.6, z: 0, yaw: 0 }
  const flightPath = [{ ...position, label: 'Start' }]
  const log = []

  commands.forEach((command, index) => {
    const [action, rawValue] = command.toUpperCase().split(/\s+/)
    const value = Number(rawValue ?? 1)

    switch (action) {
      case 'TAKEOFF':
        position.y = Math.max(position.y, 1.8)
        log.push(`${index + 1}. Takeoff`)
        break
      case 'LAND':
        position.y = 0.6
        log.push(`${index + 1}. Land`)
        break
      case 'UP':
        position.y = clamp(position.y + value, 0.6, 8)
        log.push(`${index + 1}. Up ${value}m`)
        break
      case 'DOWN':
        position.y = clamp(position.y - value, 0.6, 8)
        log.push(`${index + 1}. Down ${value}m`)
        break
      case 'FORWARD':
        position.z = clamp(position.z - value, -8, 8)
        log.push(`${index + 1}. Forward ${value}m`)
        break
      case 'BACK':
        position.z = clamp(position.z + value, -8, 8)
        log.push(`${index + 1}. Back ${value}m`)
        break
      case 'LEFT':
        position.x = clamp(position.x - value, -8, 8)
        log.push(`${index + 1}. Left ${value}m`)
        break
      case 'RIGHT':
        position.x = clamp(position.x + value, -8, 8)
        log.push(`${index + 1}. Right ${value}m`)
        break
      case 'TURN':
        position.yaw = (position.yaw + value) % 360
        log.push(`${index + 1}. Turn ${value}deg`)
        break
      default:
        log.push(`${index + 1}. Unknown command: ${command}`)
    }

    flightPath.push({ ...position, label: command })
  })

  return {
    commands,
    drone: position,
    flightPath,
    log,
  }
}

function DroneScene({ drone, flightPath }) {
  const mountRef = useRef(null)
  const droneRef = useRef(null)
  const pathRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x08111f)
    scene.fog = new THREE.Fog(0x08111f, 16, 38)

    const camera = new THREE.PerspectiveCamera(
      50,
      mount.clientWidth / mount.clientHeight,
      0.1,
      100,
    )
    camera.position.set(8, 7, 11)
    camera.lookAt(0, 1.5, 0)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio)
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.shadowMap.enabled = true
    mount.appendChild(renderer.domElement)

    const ambientLight = new THREE.HemisphereLight(0x9fc5ff, 0x102034, 1.4)
    scene.add(ambientLight)

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.6)
    keyLight.position.set(4, 8, 5)
    keyLight.castShadow = true
    scene.add(keyLight)

    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(20, 20),
      new THREE.MeshStandardMaterial({ color: 0x14243a, roughness: 0.9 }),
    )
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    scene.add(ground)

    const grid = new THREE.GridHelper(20, 20, 0x48b9ff, 0x244762)
    scene.add(grid)

    const droneGroup = new THREE.Group()
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.4, 0.35, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x38bdf8, metalness: 0.3, roughness: 0.35 }),
    )
    body.castShadow = true
    droneGroup.add(body)

    const armMaterial = new THREE.MeshStandardMaterial({ color: 0xe2e8f0 })
    const propellerMaterial = new THREE.MeshStandardMaterial({ color: 0x0f172a })
    const motorMaterial = new THREE.MeshStandardMaterial({ color: 0xf8fafc })
    const propellers = []

    const armA = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.08, 0.08), armMaterial)
    const armB = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 2.4), armMaterial)
    droneGroup.add(armA, armB)

    const motorPoints = [
      [-1.15, 0, -1.15],
      [1.15, 0, -1.15],
      [-1.15, 0, 1.15],
      [1.15, 0, 1.15],
    ]

    motorPoints.forEach(([x, y, z]) => {
      const motor = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.16, 24), motorMaterial)
      motor.position.set(x, y, z)
      motor.castShadow = true

      const propeller = new THREE.Mesh(
        new THREE.BoxGeometry(0.95, 0.035, 0.12),
        propellerMaterial,
      )
      propeller.position.set(x, y + 0.12, z)
      propeller.castShadow = true
      propellers.push(propeller)
      droneGroup.add(motor, propeller)
    })

    scene.add(droneGroup)
    droneRef.current = droneGroup

    const pathLine = new THREE.Line(
      new THREE.BufferGeometry(),
      new THREE.LineBasicMaterial({ color: 0xfacc15 }),
    )
    scene.add(pathLine)
    pathRef.current = pathLine

    let frameId
    const animate = () => {
      propellers.forEach((propeller, index) => {
        propeller.rotation.y += index % 2 === 0 ? 0.38 : -0.38
      })
      renderer.render(scene, camera)
      frameId = requestAnimationFrame(animate)
    }

    const handleResize = () => {
      camera.aspect = mount.clientWidth / mount.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(mount.clientWidth, mount.clientHeight)
    }

    window.addEventListener('resize', handleResize)
    animate()

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(frameId)
      renderer.dispose()
      mount.removeChild(renderer.domElement)
    }
  }, [])

  useEffect(() => {
    if (!droneRef.current || !pathRef.current) {
      return
    }

    droneRef.current.position.set(drone.x, drone.y, drone.z)
    droneRef.current.rotation.y = THREE.MathUtils.degToRad(drone.yaw)

    pathRef.current.geometry.dispose()
    pathRef.current.geometry = new THREE.BufferGeometry().setFromPoints(
      flightPath.map((point) => new THREE.Vector3(point.x, point.y, point.z)),
    )
  }, [drone, flightPath])

  return <div className="scene" ref={mountRef} aria-label="3D drone simulation scene" />
}

function App() {
  const [program, setProgram] = useState(starterProgram)
  const mission = useMemo(() => parseProgram(program), [program])

  const stats = [
    { label: 'X', value: `${mission.drone.x.toFixed(1)}m` },
    { label: 'Y', value: `${mission.drone.y.toFixed(1)}m` },
    { label: 'Z', value: `${mission.drone.z.toFixed(1)}m` },
    { label: 'Yaw', value: `${mission.drone.yaw.toFixed(0)}deg` },
  ]

  return (
    <main className="app-shell">
      <section className="hero-panel">
        <div>
          <p className="eyebrow">Drone Programming Lab</p>
          <h1>無人機編程模擬平台</h1>
          <p className="hero-copy">
            用文字指令控制 3D 無人機，之後可逐步加入拖拉式編程、任務關卡、
            Firebase 登入與排行榜。
          </p>
        </div>

        <div className="status-card">
          <span className={isFirebaseConfigured ? 'status-dot ready' : 'status-dot'} />
          Firebase {isFirebaseConfigured ? '已設定' : '待設定'}
        </div>
      </section>

      <section className="workspace">
        <div className="panel scene-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Simulator</p>
              <h2>3D 飛行場景</h2>
            </div>
            <span>{mission.commands.length} commands</span>
          </div>
          <DroneScene drone={mission.drone} flightPath={mission.flightPath} />
        </div>

        <div className="panel code-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Programming</p>
              <h2>任務指令</h2>
            </div>
            <button type="button" onClick={() => setProgram(starterProgram)}>
              重設
            </button>
          </div>
          <textarea
            value={program}
            onChange={(event) => setProgram(event.target.value)}
            spellCheck="false"
            aria-label="Drone programming commands"
          />
          <div className="command-help">
            可用指令：TAKEOFF、LAND、UP、DOWN、FORWARD、BACK、LEFT、RIGHT、TURN
          </div>
        </div>

        <aside className="panel telemetry-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Data</p>
              <h2>飛行數據</h2>
            </div>
          </div>

          <div className="stat-grid">
            {stats.map((stat) => (
              <div className="stat-card" key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
              </div>
            ))}
          </div>

          <div className="log-card">
            <h3>執行紀錄</h3>
            <ol>
              {mission.log.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ol>
          </div>

          <div className="roadmap-card">
            <h3>下一步可新增</h3>
            <p>登入、儲存任務、排行榜、老師後台、障礙物與碰撞判定。</p>
          </div>
        </aside>
      </section>
    </main>
  )
}

export default App
