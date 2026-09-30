'use client'

import { useEffect, useRef, useState } from 'react'
import type { LatLngTuple, Map as LeafletMap, Marker, Polyline } from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { Crosshair, Map as MapIcon, Pause, Play } from 'lucide-react'
import { loopRoute, shuttleRoute } from './live-map-routes'

// Simulation de suivi GPS pour la landing : fond OpenStreetMap, véhicules fictifs qui roulent sur de vrais itinéraires d'Antananarivo.
// Le temps simulé avance ACCEL fois plus vite que le temps réel ; la vitesse affichée reste une vitesse réaliste.
const ACCEL = 14
const START_MINUTES = 8 * 60 + 41 // 08:41

type Kind = 'car' | 'truck' | 'engin'
type Vehicle = { id: string, name: string, kind: Kind, type: string, mission: string, driver: string, counter: 'km' | 'h' }
const vehicles: Vehicle[] = [
  { id: 'LR-014', name: 'Land Rover Defender', kind: 'car', type: 'Véhicule routier', mission: 'Tournée des sites', driver: 'Permis B vérifié', counter: 'km' },
  { id: 'CB-07', name: 'Camion-benne', kind: 'truck', type: 'Véhicule routier', mission: 'Navette dépôt ⇄ chantier', driver: 'Permis C vérifié', counter: 'km' },
  { id: 'CH-03', name: 'Chargeuse sur chenilles', kind: 'engin', type: 'Engin de chantier', mission: 'Chantier Ankorondrano', driver: 'CACES vérifié', counter: 'h' },
  { id: 'CP-02', name: 'Compacteur', kind: 'engin', type: 'Engin de chantier', mission: 'Chantier Ankorondrano', driver: 'CACES vérifié', counter: 'h' },
]

type Zone = { name: string, center: LatLngTuple, radius: number }
const zones: Zone[] = [
  { name: 'Chantier Ankorondrano', center: shuttleRoute[shuttleRoute.length - 1], radius: 170 },
  { name: 'Dépôt Andraharo', center: shuttleRoute[0], radius: 140 },
]

type Live = { speed: number, status: string, zone: string, counter: number }
type LogEvent = { time: string, text: string }

// Géométrie : distances en mètres (approximation locale, suffisante à l'échelle d'une ville)
const M_PER_DEG = 111320
const offset = ([lat, lng]: LatLngTuple, north: number, east: number): LatLngTuple => [lat + north / M_PER_DEG, lng + east / (M_PER_DEG * Math.cos(lat * Math.PI / 180))]
const distance = (a: LatLngTuple, b: LatLngTuple) => Math.hypot((b[0] - a[0]) * M_PER_DEG, (b[1] - a[1]) * M_PER_DEG * Math.cos(a[0] * Math.PI / 180))
const bearing = (a: LatLngTuple, b: LatLngTuple) => Math.atan2((b[1] - a[1]) * Math.cos(a[0] * Math.PI / 180), b[0] - a[0]) * 180 / Math.PI
const zonePolygon = ({ center, radius }: Zone) => Array.from({ length: 9 }, (_, i) => { const a = i / 9 * Math.PI * 2, r = radius * (0.82 + 0.18 * Math.sin(i * 2.3)); return offset(center, Math.cos(a) * r, Math.sin(a) * r) })
// Une zone n'est quittée qu'à 60 m au-delà de sa limite : une route qui longe le périmètre ne fait pas clignoter entrées et sorties
const zoneAt = (p: LatLngTuple, current = 'Hors zone') => zones.find((zone) => distance(p, zone.center) < zone.radius + (zone.name === current ? 60 : 0))?.name ?? 'Hors zone'

// Un itinéraire préparé : distances cumulées et virage à chaque sommet, pour ralentir avant les intersections
const prepare = (points: LatLngTuple[]) => {
  const cum = [0]
  for (let i = 1; i < points.length; i++) cum.push(cum[i - 1] + distance(points[i - 1], points[i]))
  const turn = points.map((_, i) => {
    if (i === 0 || i === points.length - 1) return 0
    const d = Math.abs(bearing(points[i], points[i + 1]) - bearing(points[i - 1], points[i])) % 360
    return d > 180 ? 360 - d : d
  })
  return { points, cum, turn, length: cum[cum.length - 1] }
}
type Route = ReturnType<typeof prepare>
const locate = (route: Route, d: number) => {
  let lo = 0, hi = route.cum.length - 1
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if (route.cum[mid] <= d) lo = mid; else hi = mid }
  const a = route.points[lo], b = route.points[hi], t = (d - route.cum[lo]) / Math.max(1e-6, route.cum[hi] - route.cum[lo])
  return { index: lo, point: [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t] as LatLngTuple, heading: bearing(a, b) }
}
const turnAhead = (route: Route, index: number, d: number, reverse: boolean) => {
  let worst = 0
  if (!reverse) for (let j = index + 1; j < route.points.length && route.cum[j] < d + 45; j++) worst = Math.max(worst, route.turn[j])
  else for (let j = index; j > 0 && route.cum[j] > d - 45; j--) worst = Math.max(worst, route.turn[j])
  return worst
}
const trail = (route: Route, from: number, to: number) => {
  const start = locate(route, Math.max(0, from)), end = locate(route, Math.min(route.length, to))
  return [start.point, ...route.points.slice(start.index + 1, end.index + 1), end.point]
}

const clock = (simSeconds: number) => { const m = Math.floor(START_MINUTES + simSeconds / 60); return `${String(Math.floor(m / 60) % 24).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}` }
const carIcon = '<svg viewBox="0 0 24 40" width="15" height="25" aria-hidden="true"><rect x="2" y="2" width="20" height="36" rx="7" fill="#efb76b" stroke="#171613" stroke-width="2"/><rect x="5" y="9" width="14" height="7" rx="2" fill="#171613" opacity=".85"/><rect x="5.5" y="27" width="13" height="5" rx="2" fill="#171613" opacity=".6"/></svg>'
const truckIcon = '<svg viewBox="0 0 24 52" width="15" height="32" aria-hidden="true"><rect x="3" y="2" width="18" height="13" rx="4" fill="#f3efe7" stroke="#171613" stroke-width="2"/><rect x="6" y="5" width="12" height="4" rx="1.5" fill="#171613" opacity=".8"/><rect x="2" y="17" width="20" height="33" rx="2.5" fill="#efb76b" stroke="#171613" stroke-width="2"/><path d="M6 23h12M6 29h12M6 35h12M6 41h12" stroke="#171613" stroke-width="1.2" opacity=".45"/></svg>'
const markerHtml = (vehicle: Vehicle) => `<div class="map-vehicle is-${vehicle.kind}"><span class="map-vehicle-pulse"></span><span class="map-vehicle-body">${vehicle.kind === 'car' ? carIcon : vehicle.kind === 'truck' ? truckIcon : '<i></i>'}</span><span class="map-vehicle-tag">${vehicle.id}</span></div>`

const initialEvents: LogEvent[] = [
  { time: '08:41', text: 'LR-014 part en mission : documents du véhicule et permis vérifiés' },
  { time: '08:40', text: 'CH-03 et CP-02 présents sur Chantier Ankorondrano (calcul de la nuit)' },
]

export function LiveMap() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [selected, setSelected] = useState('LR-014')
  const [paused, setPaused] = useState(false)
  const [follow, setFollow] = useState(false)
  const [live, setLive] = useState<Record<string, Live>>({})
  const [events, setEvents] = useState<LogEvent[]>(initialEvents)
  const [time, setTime] = useState('08:41')
  const controls = useRef({ paused: false, follow: false, selected: 'LR-014', overview: () => {}, focus: () => {} })
  controls.current.paused = paused; controls.current.follow = follow; controls.current.selected = selected

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    let map: LeafletMap | undefined, frame = 0, disposed = false, visible = false, last = 0
    const cleanup: (() => void)[] = []
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced) setPaused(true)

    const start = async () => {
      const mod = await import('leaflet')
      const L = ('default' in mod ? mod.default : mod) as typeof import('leaflet')
      if (disposed) return
      const loop = prepare(loopRoute), shuttle = prepare(shuttleRoute)
      map = L.map(container, { scrollWheelZoom: false, zoomSnap: 0.25, zoomControl: false })
      L.control.zoom({ position: 'topright' }).addTo(map)
      map.attributionControl.setPrefix('<a href="https://leafletjs.com">Leaflet</a>')
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">contributeurs OpenStreetMap</a>' }).addTo(map)
      const overviewBounds = L.latLngBounds([...loopRoute, ...shuttleRoute])
      const overview = () => map?.fitBounds(overviewBounds, { paddingTopLeft: [40, 64], paddingBottomRight: [40, 48] })
      controls.current.overview = overview
      overview()

      zones.forEach((zone) => L.polygon(zonePolygon(zone), { className: 'map-zone', weight: 1.5, dashArray: '5 5' }).addTo(map!).bindTooltip(zone.name, { permanent: true, direction: 'center', className: 'map-zone-label' }))
      L.polyline(loopRoute, { className: 'map-route', weight: 3 }).addTo(map)
      L.polyline(shuttleRoute, { className: 'map-route', weight: 3 }).addTo(map)

      const markers: Record<string, Marker> = {}, trails: Record<string, Polyline> = {}
      vehicles.forEach((vehicle) => {
        markers[vehicle.id] = L.marker(zones[0].center, { icon: L.divIcon({ html: markerHtml(vehicle), className: 'map-vehicle-icon', iconSize: [0, 0] }), keyboard: false }).addTo(map!).on('click', () => setSelected(vehicle.id))
        if (vehicle.kind !== 'engin') trails[vehicle.id] = L.polyline([], { className: `map-trail is-${vehicle.kind}`, weight: 4 }).addTo(map!)
      })
      markers['CH-03'].setLatLng(offset(zones[0].center, 55, -60)); markers['CP-02'].setLatLng(offset(zones[0].center, -70, 45))
      controls.current.focus = () => map?.setView(markers[controls.current.selected].getLatLng(), 16)
      const rotate = (id: string, heading: number) => { const body = markers[id].getElement()?.querySelector<HTMLElement>('.map-vehicle-body'); if (body) body.style.transform = `rotate(${heading}deg)` }

      // État de la simulation
      let sim = 0, uiClock = 0
      const car = { d: 0, speed: 8, heading: 0, lapAlert: false, km: 0 } // vitesses en m/s
      const truck = { d: 0, dir: 1 as 1 | -1, speed: 0, heading: 0, pause: 0, zone: zoneAt(shuttle.points[0]), km: 0 }
      const hours = { 'CH-03': 1284.2, 'CP-02': 612.7 }
      const log = (text: string) => setEvents((list) => [{ time: clock(sim), text }, ...list].slice(0, 6))
      const kmh = (ms: number) => Math.round(ms * 3.6)

      const step = (dt: number) => {
        const simDt = dt * ACCEL
        sim += simDt; hours['CH-03'] += simDt / 3600

        // Voiture : boucle continue, ralentit avant les virages
        const c = locate(loop, car.d)
        const target = (26 + 30 * (1 - Math.min(1, turnAhead(loop, c.index, car.d, false) / 70))) / 3.6
        car.speed += (target - car.speed) * Math.min(1, dt * 1.6)
        car.d += car.speed * simDt; car.km += car.speed * simDt / 1000
        if (kmh(car.speed) > 53 && !car.lapAlert) { car.lapAlert = true; log(`LR-014 à ${kmh(car.speed)} km/h sur une voie limitée à 50 : événement ajouté au score de conduite`) }
        if (car.d >= loop.length) { car.d -= loop.length; car.lapAlert = false; log(`LR-014 a bouclé sa tournée des sites (${(loop.length / 1000).toFixed(1).replace('.', ',')} km)`) }

        // Camion : navette dépôt ⇄ chantier, avec chargement et déchargement
        if (truck.pause > 0) { truck.pause -= simDt; truck.speed = 0 }
        else {
          const t = locate(shuttle, truck.d)
          const tTarget = (20 + 22 * (1 - Math.min(1, turnAhead(shuttle, t.index, truck.d, truck.dir < 0) / 70))) / 3.6
          truck.speed += (tTarget - truck.speed) * Math.min(1, dt * 1.2)
          truck.d += truck.dir * truck.speed * simDt; truck.km += truck.speed * simDt / 1000
          if (truck.d >= shuttle.length || truck.d <= 0) {
            truck.d = Math.min(shuttle.length, Math.max(0, truck.d)); truck.pause = truck.dir > 0 ? 420 : 300
            log(truck.dir > 0 ? 'CB-07 décharge sur Chantier Ankorondrano' : 'CB-07 charge au Dépôt Andraharo')
            truck.dir = truck.dir > 0 ? -1 : 1
          }
        }
        const t = locate(shuttle, truck.d), zone = zoneAt(t.point, truck.zone)
        if (zone !== truck.zone) { log(zone === 'Hors zone' ? `CB-07 quitte ${truck.zone}` : `CB-07 entre dans ${zone}`); truck.zone = zone }

        // Affichage : positions à chaque image, cap lissé
        const cPos = locate(loop, car.d), turnBy = (from: number, to: number) => from + ((((to - from) % 360) + 540) % 360 - 180) * Math.min(1, dt * 6)
        car.heading = turnBy(car.heading, cPos.heading)
        truck.heading = turnBy(truck.heading, t.heading + (truck.dir < 0 && truck.pause <= 0 ? 180 : truck.dir > 0 && truck.pause > 0 ? 180 : 0))
        markers['LR-014'].setLatLng(cPos.point); rotate('LR-014', car.heading)
        markers['CB-07'].setLatLng(t.point); rotate('CB-07', truck.heading)

        // Traces, panneau et suivi de caméra : quelques fois par seconde suffisent
        uiClock += dt
        if (uiClock > 0.25) {
          uiClock = 0
          trails['LR-014'].setLatLngs(car.d > 700 ? trail(loop, car.d - 700, car.d) : [...trail(loop, loop.length - (700 - car.d), loop.length), ...trail(loop, 0, car.d)])
          trails['CB-07'].setLatLngs(truck.dir > 0 || truck.pause > 0 && truck.dir < 0 ? trail(shuttle, truck.d - 500, truck.d) : trail(shuttle, truck.d, truck.d + 500))
          setTime(clock(sim))
          setLive({
            'LR-014': { speed: kmh(car.speed), status: 'En mission', zone: zoneAt(cPos.point), counter: 48213 + car.km },
            'CB-07': { speed: kmh(truck.speed), status: truck.pause > 0 ? (truck.dir < 0 ? 'Déchargement' : 'Chargement') : 'En route', zone: truck.zone, counter: 91540 + truck.km },
            'CH-03': { speed: 0, status: 'Au travail', zone: 'Chantier Ankorondrano', counter: hours['CH-03'] },
            'CP-02': { speed: 0, status: 'À l’arrêt', zone: 'Chantier Ankorondrano', counter: hours['CP-02'] },
          })
          if (controls.current.follow) map?.panTo(markers[controls.current.selected].getLatLng(), { animate: true, duration: 0.25 })
        }
      }

      const tick = (now: number) => {
        const dt = last ? Math.min(0.1, (now - last) / 1000) : 0; last = now
        if (!controls.current.paused) step(dt)
        frame = visible && !disposed ? window.requestAnimationFrame(tick) : 0
      }
      step(0.01) // pose les véhicules avant le premier affichage, même en pause
      const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible && !frame) { last = 0; frame = window.requestAnimationFrame(tick) } })
      observer.observe(container)
      cleanup.push(() => observer.disconnect())
    }

    // La carte (et ses tuiles) ne se charge qu'à l'approche de la section
    const lazy = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { lazy.disconnect(); start() } }, { rootMargin: '600px' })
    lazy.observe(container)
    return () => { disposed = true; lazy.disconnect(); window.cancelAnimationFrame(frame); cleanup.forEach((fn) => fn()); map?.remove() }
  }, [])

  useEffect(() => { if (follow) controls.current.focus() }, [follow, selected])
  useEffect(() => { if (!follow) controls.current.overview() }, [follow])

  const vehicle = vehicles.find((v) => v.id === selected)!, info = live[selected]
  return (
    <div className="tracking-board">
      <div className="tracking-map-frame">
        <div className="tracking-map" ref={containerRef} role="region" aria-label="Carte de démonstration : véhicules simulés en temps réel à Antananarivo" />
        <span className="tracking-badge"><i /> Simulation · données fictives</span>
        <span className="tracking-clock">{time}</span>
      </div>
      <aside className="tracking-panel" aria-label="Véhicule suivi">
        <div className="tracking-chips" role="group" aria-label="Choisir un véhicule">
          {vehicles.map((v) => <button key={v.id} className={v.id === selected ? 'is-active' : ''} aria-pressed={v.id === selected} onClick={() => setSelected(v.id)}>{v.id}</button>)}
        </div>
        <div className="tracking-vehicle">
          <p className="tracking-type">{vehicle.type}</p>
          <h3>{vehicle.name}</h3>
          <dl>
            <div><dt>Vitesse</dt><dd>{info ? `${info.speed} km/h` : '—'}</dd></div>
            <div><dt>Statut</dt><dd>{info?.status ?? '—'}</dd></div>
            <div><dt>Zone</dt><dd>{info?.zone ?? '—'}</dd></div>
            <div><dt>{vehicle.counter === 'km' ? 'Compteur' : 'Heures moteur'}</dt><dd>{info ? `${info.counter.toLocaleString('fr-FR', { maximumFractionDigits: vehicle.counter === 'km' ? 0 : 1 })} ${vehicle.counter}` : '—'}</dd></div>
            <div><dt>Mission</dt><dd>{vehicle.mission}</dd></div>
            <div><dt>Conducteur</dt><dd>{vehicle.driver}</dd></div>
          </dl>
          <div className="tracking-actions">
            <button onClick={() => setPaused(!paused)}>{paused ? <Play size={13} /> : <Pause size={13} />}{paused ? 'Reprendre' : 'Pause'}</button>
            <button onClick={() => setFollow(!follow)} aria-pressed={follow}>{follow ? <MapIcon size={13} /> : <Crosshair size={13} />}{follow ? 'Vue d’ensemble' : 'Suivre'}</button>
          </div>
        </div>
        <div className="tracking-feed">
          <p className="tracking-type">Journal en direct</p>
          <ol aria-live="polite">{events.map((event, i) => <li key={`${event.time}-${event.text}-${i}`}><time>{event.time}</time><span>{event.text}</span></li>)}</ol>
        </div>
      </aside>
    </div>
  )
}
