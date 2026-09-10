import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import type { Hospital } from '../data/hospitalOverview'
import { panamaBoundary } from '../data/panamaBoundary'

export default function HospitalMap({ hospitals }: { hospitals: Hospital[] }) {
  const container = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!container.current) return
    const map = L.map(container.current, { scrollWheelZoom: false }).setView([8.6, -80], 7)
    L.control.scale({ imperial: false }).addTo(map)
    const country = L.geoJSON(panamaBoundary, {
      interactive: false,
      style: {
        color: '#4f86c6',
        weight: 2,
        fillColor: '#b9dcff',
        fillOpacity: 0.9,
      },
    }).addTo(map)
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
    const countryBounds = country.getBounds()
    if (countryBounds.isValid()) {
      map.fitBounds(countryBounds, { padding: [35, 35], maxZoom: 8 })
    } else if (positions.length) {
      map.fitBounds(L.latLngBounds(positions), { padding: [35, 35], maxZoom: 13 })
    }
    const observer = new ResizeObserver(() => map.invalidateSize())
    observer.observe(container.current)
    return () => { observer.disconnect(); map.remove() }
  }, [hospitals])
  return <div className="hospital-map-frame">
    <p className="px-5 py-3 text-sm">Base geográfica de Panamá incluida localmente. Funciona sin red; algunas coordenadas corresponden al centro de la ciudad. Los puntos agrupados permiten seleccionar cada hospital.</p>
    <div ref={container} className="hospital-map" aria-label="Mapa geográfico de hospitales" />
  </div>
}
