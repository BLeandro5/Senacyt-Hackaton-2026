import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Hospital } from '../data/hospitalOverview'

export default function HospitalMap({ hospitals }: { hospitals: Hospital[] }) {
  const container = useRef<HTMLDivElement>(null)
  const [tileError, setTileError] = useState(false)
  useEffect(() => {
    if (!container.current) return
    const map = L.map(container.current, { scrollWheelZoom: false }).setView([8.6, -80], 7)
    const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19, attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map)
    tiles.on('tileerror', () => setTileError(true))
    tiles.on('tileload', () => setTileError(false))
    const groups = new Map<string, Hospital[]>()
    for (const hospital of hospitals) {
      const { latitude: lat, longitude: lon } = hospital
      if (lat == null || lon == null || !Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) continue
      const key = `${lat},${lon}`
      groups.set(key, [...(groups.get(key) || []), hospital])
    }
    const positions: L.LatLngTuple[] = []
    for (const group of groups.values()) {
      const first = group[0]
      const position: L.LatLngTuple = [first.latitude!, first.longitude!]
      positions.push(position)
      const content = document.createElement('div')
      content.className = 'hospital-map-popup'
      for (const hospital of group) {
        const section = document.createElement('section')
        const title = document.createElement('strong')
        title.textContent = hospital.name
        const location = document.createElement('p')
        location.textContent = [hospital.country, hospital.province, hospital.city].filter(Boolean).join(' · ')
        section.append(title, location)
        for (const [label, href] of [
          ['Ver observaciones y equipos', `/hospitals/${encodeURIComponent(hospital.id)}`],
          ['Nueva observación', `/visits/new?hospital=${encodeURIComponent(hospital.id)}`],
        ]) {
          const link = document.createElement('a')
          link.textContent = label
          link.href = href
          section.append(link)
        }
        content.append(section)
      }
      L.marker(position, {
        icon: L.divIcon({ className: 'hospital-map-marker', html: `<span>${group.length > 1 ? group.length : '●'}</span>`, iconSize: [32, 32], iconAnchor: [16, 16] }),
        title: group.map(h => h.name).join(', '),
      }).addTo(map).bindPopup(content, { maxWidth: 320, maxHeight: 260 })
    }
    if (positions.length) map.fitBounds(L.latLngBounds(positions), { padding: [35, 35], maxZoom: 13 })
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(container.current)
    return () => { observer.disconnect(); map.remove() }
  }, [hospitals])
  return <div className="hospital-map-frame">
    <p className="px-5 py-3 text-sm">Coordenadas del catálogo; algunas corresponden al centro de la ciudad. Los puntos agrupados permiten seleccionar cada hospital.</p>
    {tileError && <p role="status" className="px-5 py-3 text-sm">No se pudo cargar la cartografía. Comprueba Internet; puedes seguir usando la lista de hospitales.</p>}
    <div ref={container} className="hospital-map" aria-label="Mapa geográfico de hospitales" />
  </div>
}
