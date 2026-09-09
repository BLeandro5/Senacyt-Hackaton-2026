import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Activity,
  ChevronRight,
  ClipboardList,
  Cloud,
  CloudOff,
  LogOut,
  Monitor,
  Plus,
  ScanLine,
  Sparkles,
  UserRound,
} from 'lucide-react'

function HomePage() {
  const navigate = useNavigate()

  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined'
      ? navigator.onLine
      : true
  )

  const storedUser = localStorage.getItem('demo-user')

  const user = storedUser
    ? JSON.parse(storedUser)
    : {
        name: 'Ana Rodríguez',
        role: 'field',
      }

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  const recentVisits = [
    {
      id: 1,
      hospital: 'Hospital Santo Tomás',
      area: 'Radiología',
      date: 'Hoy · 15:20',
      equipment: 3,
    },
    {
      id: 2,
      hospital: 'Hospital Nacional',
      area: 'Imagenología',
      date: 'Ayer · 10:42',
      equipment: 2,
    },
  ]

  const firstName =
    user.name?.split(' ')[0] || 'Usuario'

  const handleLogout = () => {
    localStorage.removeItem('demo-user')
    navigate('/login')
  }

  return (
    <main className="min-h-screen bg-[#F3F5F9] md:p-5">

      <div className="mx-auto min-h-screen max-w-[1180px] bg-white md:min-h-[calc(100vh-40px)] md:rounded-[28px] md:border md:border-[#E6EAF0] md:shadow-sm">

        {/* HEADER */}
        <header className="flex items-center justify-between px-6 pb-4 pt-6 sm:px-8 md:px-10 md:pb-3 md:pt-8">

          {/* Marca */}
          <div>
            <p className="text-xl font-bold tracking-tight text-[#0B5ED7]">
              PHILIPS
            </p>

            <p className="mt-0.5 text-xs text-[#8490A0]">
              Installed Base Intelligence
            </p>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-3">

            {/* Estado online */}
            <div
              className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium ${
                isOnline
                  ? 'bg-[#E8F7F1] text-[#157A5A]'
                  : 'bg-[#FFF4E1] text-[#A66C16]'
              }`}
            >
              {isOnline ? (
                <Cloud size={15} />
              ) : (
                <CloudOff size={15} />
              )}

              <span className="hidden sm:inline">
                {isOnline
                  ? 'En línea'
                  : 'Sin conexión'}
              </span>
            </div>

            {/* Usuario desktop */}
            <div className="hidden items-center gap-3 border-l border-[#E6EAF0] pl-4 md:flex">

              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#EAF2FF] text-[#0B5ED7]">
                <UserRound size={17} />
              </div>

              <div className="leading-tight">
                <p className="text-sm font-medium text-[#172033]">
                  {user.name}
                </p>

                <p className="mt-0.5 text-xs text-[#8490A0]">
                  Colaborador de campo
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="ml-1 flex h-9 w-9 items-center justify-center rounded-full text-[#94A0AF] transition hover:bg-[#F2F4F8] hover:text-[#172033]"
                title="Cerrar sesión"
              >
                <LogOut size={17} />
              </button>

            </div>

            {/* Logout mobile */}
            <button
              onClick={handleLogout}
              className="flex h-9 w-9 items-center justify-center rounded-full text-[#94A0AF] transition hover:bg-[#F2F4F8] hover:text-[#172033] md:hidden"
              title="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>

          </div>

        </header>

        {/* CONTENIDO */}
        <div className="px-6 pb-28 sm:px-8 md:px-10 md:pb-10">

          {/* Bienvenida */}
          <section className="pt-4 md:pt-3">

            <p className="text-sm font-medium text-[#0B5ED7]">
              Buen día
            </p>

            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#172033] sm:text-4xl">
              Hola, {firstName}
            </h1>

            <p className="mt-2 text-[15px] leading-6 text-[#6F7A8A]">
              ¿Listo para tu próxima visita?
            </p>

          </section>

          {/* CTA NUEVA VISITA */}
          <section className="mt-7">

            <button
              onClick={() =>
                navigate('/visits/new')
              }
              className="group relative w-full overflow-hidden rounded-[24px] px-6 py-6 text-left text-white shadow-lg shadow-[#1D3F96]/20 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl md:px-7 md:py-5"
              style={{
                background:
                  'linear-gradient(115deg, #4A0982 0%, #351D8E 24%, #19379D 50%, #0455A8 73%, #208E94 100%)',
              }}
            >

              {/* Iconografía decorativa */}
              <div className="pointer-events-none absolute inset-y-0 right-[90px] hidden items-center gap-8 sm:flex lg:right-[120px] lg:gap-12">

                {/* Scan */}
                <div className="flex h-[72px] w-[72px] items-center justify-center rounded-full border border-white/[0.07] text-white/[0.13] lg:h-[86px] lg:w-[86px]">
                  <ScanLine
                    className="h-10 w-10 lg:h-12 lg:w-12"
                    strokeWidth={1.25}
                  />
                </div>

                {/* Monitor */}
                <div className="flex h-[66px] w-[66px] items-center justify-center text-white/[0.11] lg:h-[78px] lg:w-[78px]">
                  <Monitor
                    className="h-10 w-10 lg:h-12 lg:w-12"
                    strokeWidth={1.25}
                  />
                </div>

                {/* Señal */}
                <div className="hidden h-[60px] w-[60px] items-center justify-center text-white/[0.09] lg:flex">
                  <Activity
                    className="h-10 w-10"
                    strokeWidth={1.2}
                  />
                </div>

              </div>

              {/* Elementos de fondo */}
              <div className="pointer-events-none absolute -right-20 -top-24 h-60 w-60 rounded-full border border-white/[0.10]" />

              <div className="pointer-events-none absolute -right-5 -top-6 h-32 w-32 rounded-full bg-white/[0.04]" />

              <div className="pointer-events-none absolute right-[32%] top-[-70px] hidden h-40 w-40 rounded-full border border-white/[0.05] lg:block" />

              {/* Contenido */}
              <div className="relative z-10 flex items-center justify-between gap-5">

                <div className="min-w-0">

                  {/* Fila superior */}
                  <div className="mb-4 flex items-center gap-3 md:mb-3">

                    <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/15 md:h-10 md:w-10">
                      <Plus size={23} />
                    </div>

                    <div className="hidden items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs text-white/90 sm:flex">

                      <Sparkles size={14} />

                      Captura inteligente

                    </div>

                  </div>

                  <h2 className="text-xl font-semibold">
                    Nueva visita
                  </h2>

                  <p className="mt-1 max-w-[300px] text-sm leading-6 text-white/80 md:max-w-[360px]">
                    Selecciona un hospital y registra
                    lo que observas.
                  </p>

                </div>

                {/* Arrow */}
                <div className="relative z-20 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/10 transition duration-200 group-hover:translate-x-1 group-hover:bg-white/15">
                  <ChevronRight size={22} />
                </div>

              </div>

            </button>

          </section>

          {/* PARTE INFERIOR */}
          <div className="mt-9 grid gap-8 lg:grid-cols-[1.6fr_0.8fr]">

            {/* VISITAS RECIENTES */}
            <section>

              <div className="mb-4 flex items-end justify-between gap-4">

                <div>

                  <h2 className="text-base font-semibold text-[#172033]">
                    Visitas recientes
                  </h2>

                  <p className="mt-1 text-sm text-[#8A96A6]">
                    Tu actividad más reciente
                  </p>

                </div>

                <button
                  onClick={() =>
                    navigate('/visits')
                  }
                  className="shrink-0 text-sm font-medium text-[#0B5ED7] transition hover:text-[#19379D]"
                >
                  Ver todas
                </button>

              </div>

              {/* Lista */}
              <div className="overflow-hidden rounded-2xl border border-[#E5EAF0] bg-white">

                {recentVisits.map(
                  (visit, index) => (
                    <button
                      key={visit.id}
                      className={`flex w-full items-center gap-4 px-4 py-4 text-left transition hover:bg-[#F8F9FC] ${
                        index !==
                        recentVisits.length - 1
                          ? 'border-b border-[#E9EDF2]'
                          : ''
                      }`}
                    >

                      {/* Icono visita */}
                      <div
                        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-white"
                        style={{
                          background:
                            'linear-gradient(135deg, #351D8E 0%, #0455A8 100%)',
                        }}
                      >
                        <ClipboardList size={20} />
                      </div>

                      {/* Datos */}
                      <div className="min-w-0 flex-1">

                        <p className="truncate text-sm font-semibold text-[#172033]">
                          {visit.hospital}
                        </p>

                        <p className="mt-1 truncate text-xs text-[#8A96A6]">
                          {visit.area} ·{' '}
                          {visit.date}
                        </p>

                      </div>

                      {/* Cantidad */}
                      <div className="flex items-center gap-3">

                        <div className="hidden text-right sm:block">

                          <p className="text-sm font-medium text-[#415065]">
                            {visit.equipment}
                          </p>

                          <p className="text-[11px] text-[#9AA5B4]">
                            equipos
                          </p>

                        </div>

                        <ChevronRight
                          size={18}
                          className="text-[#B7C0CC]"
                        />

                      </div>

                    </button>
                  )
                )}

              </div>

            </section>

            {/* SINCRONIZACIÓN */}
            <section>

              <div className="mb-4">

                <h2 className="text-base font-semibold text-[#172033]">
                  Sincronización
                </h2>

                <p className="mt-1 text-sm text-[#8A96A6]">
                  Estado de tus registros
                </p>

              </div>

              <div className="rounded-2xl border border-[#E5EAF0] bg-[#F7F9FC] p-5">

                <div className="flex items-start gap-3">

                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                      isOnline
                        ? 'bg-[#E8F7F1] text-[#159B72]'
                        : 'bg-[#FFF4E1] text-[#D49A31]'
                    }`}
                  >
                    {isOnline ? (
                      <Cloud size={20} />
                    ) : (
                      <CloudOff size={20} />
                    )}
                  </div>

                  <div>

                    <p className="text-sm font-semibold text-[#172033]">
                      {isOnline
                        ? 'Todo sincronizado'
                        : 'Trabajando sin conexión'}
                    </p>

                    <p className="mt-1 text-sm leading-6 text-[#8A96A6]">
                      {isOnline
                        ? 'No tienes registros pendientes.'
                        : 'Tus visitas se guardarán localmente.'}
                    </p>

                  </div>

                </div>

              </div>

            </section>

          </div>

          {/* Nota inferior */}
          <div className="mt-8 hidden items-center gap-2 text-xs text-[#64589D] md:flex">

            <Sparkles size={14} />

            Captura estructurada y asistencia
            inteligente durante tus visitas

          </div>

        </div>

        {/* NAVEGACIÓN MOBILE */}
        <nav className="fixed bottom-0 left-0 right-0 z-20 border-t border-[#E5EAF0] bg-white/95 px-6 pb-[max(12px,env(safe-area-inset-bottom))] pt-3 backdrop-blur md:hidden">

          <div className="mx-auto flex max-w-md items-center justify-around">

            {/* Inicio */}
            <button className="flex min-w-[72px] flex-col items-center gap-1 text-[#0B5ED7]">

              <UserRound size={21} />

              <span className="text-[11px] font-medium">
                Inicio
              </span>

            </button>

            {/* Nueva visita */}
            <button
              onClick={() =>
                navigate('/visits/new')
              }
              className="-mt-7 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-lg shadow-[#19379D]/25 transition active:scale-95"
              style={{
                background:
                  'linear-gradient(135deg, #4A0982 0%, #19379D 50%, #208E94 100%)',
              }}
              aria-label="Nueva visita"
            >
              <Plus size={26} />
            </button>

            {/* Mis visitas */}
            <button
              onClick={() =>
                navigate('/visits')
              }
              className="flex min-w-[72px] flex-col items-center gap-1 text-[#8A96A6]"
            >

              <ClipboardList size={21} />

              <span className="text-[11px] font-medium">
                Mis visitas
              </span>

            </button>

          </div>

        </nav>

      </div>

    </main>
  )
}

export default HomePage