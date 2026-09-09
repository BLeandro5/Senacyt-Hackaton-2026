import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck, User } from 'lucide-react'

import { users } from '../../data/users'

function LoginPage() {
  const navigate = useNavigate()

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const user = users.find(
      (item) =>
        item.username === username.trim() &&
        item.password === password
    )

    if (!user) {
      setError('Usuario o contraseña incorrectos.')
      return
    }

    setError('')

    try {
      localStorage.setItem('demo-user', JSON.stringify({ id: user.id, username: user.username, name: user.name, role: user.role }))
    } catch { setError('No se pudo guardar la sesión. Permite el almacenamiento del navegador e intenta de nuevo.'); return }

    navigate('/home')
  }

  return (
  <main className="min-h-screen bg-white md:bg-slate-100 md:p-6">
    <div className="mx-auto min-h-screen max-w-[1380px] overflow-hidden bg-white md:min-h-[calc(100vh-48px)] md:rounded-[28px] md:shadow-xl">

      <div className="grid min-h-screen md:min-h-[calc(100vh-48px)] lg:grid-cols-[1.05fr_0.95fr]">

        {/* Panel visual desktop */}
        <section className="relative hidden overflow-hidden bg-[#0B5ED7] lg:flex">

          <div className="absolute -right-24 -top-20 h-[500px] w-[500px] rounded-full border border-white/10" />

          <div className="absolute -bottom-40 -left-24 h-[500px] w-[500px] rounded-full bg-white/5" />

          <div className="relative z-10 flex h-full flex-col justify-between p-14 text-white">

            <div>
              <div className="text-3xl font-bold tracking-tight">
                PHILIPS
              </div>

              <p className="mt-1 text-sm text-blue-100">
                Installed Base Intelligence
              </p>
            </div>

            <div className="max-w-xl">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.28em] text-blue-200">
                Field Intelligence
              </p>

              <h1 className="text-5xl font-semibold leading-[1.05] tracking-tight">
                Convierte observaciones en información confiable.
              </h1>

              <p className="mt-6 max-w-lg text-lg leading-8 text-blue-100">
                Captura lo que ves durante cada visita y transforma esa
                información en una base instalada viva de cada hospital.
              </p>
            </div>

            <div className="flex items-center gap-3 text-sm text-blue-100">
              <ShieldCheck size={19} />
              Preparado para trabajar incluso sin conexión
            </div>

          </div>
        </section>

        {/* Login */}
        <section className="flex min-h-screen items-center justify-center bg-white px-6 py-8 sm:px-10 md:min-h-[calc(100vh-48px)] lg:px-16">

          <div className="w-full max-w-[440px]">

            {/* Marca mobile */}
            <div className="mb-10 lg:hidden">
              <div className="text-2xl font-bold tracking-tight text-[#0756c9]">
                PHILIPS
              </div>

              <p className="mt-1 text-sm text-slate-500">
                Installed Base Intelligence
              </p>
            </div>

            {/* Contexto */}
            <div className="mb-8">
              <div className="mb-4 inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0768da]">
                Field Intelligence
              </div>

              <p className="text-sm font-medium text-[#0756c9]">
                Bienvenido
              </p>

              <h2 className="mt-2 text-4xl font-semibold tracking-tight text-slate-950">
                Inicia sesión
              </h2>

              <p className="mt-3 max-w-md text-[15px] leading-6 text-slate-500">
                Accede a tus visitas y continúa capturando información en campo.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="space-y-5"
            >

              {/* Usuario */}
              <div>
                <label
                  htmlFor="username"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Usuario
                </label>

                <div className="relative">
                  <User
                    size={20}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="username" autoComplete="username" required
                    value={username}
                    onChange={(event) =>
                      setUsername(event.target.value)
                    }
                    placeholder="Ingresa tu usuario"
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1674ea] focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              {/* Contraseña */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-700"
                >
                  Contraseña
                </label>

                <div className="relative">
                  <LockKeyhole
                    size={20}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                  />

                  <input
                    id="password" autoComplete="current-password" required
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="Ingresa tu contraseña"
                    className="h-14 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-12 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#1674ea] focus:ring-4 focus:ring-blue-100"
                  />

                  <button
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    type="button"
                    onClick={() =>
                      setShowPassword((current) => !current)
                    }
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-slate-700"
                  >
                    {showPassword ? (
                      <EyeOff size={20} />
                    ) : (
                      <Eye size={20} />
                    )}
                  </button>
                </div>
              </div>

              {/* Error */}
              {error && (
                <div role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* CTA */}
              <button
                type="submit"
                className="group mt-1 flex h-14 w-full items-center justify-center gap-3 rounded-2xl bg-[#0B5ED7] font-medium text-white shadow-lg shadow-blue-600/15 transition hover:bg-[#075ec9] active:scale-[0.99]"
              >
                Iniciar sesión

                <ArrowRight
                  size={20}
                  className="transition-transform group-hover:translate-x-1"
                />
              </button>

            </form>

            {/* Seguridad */}
            <div className="mt-8 rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-4">

              <div className="flex items-start gap-3">
                <div className="rounded-xl bg-blue-50 p-2 text-[#0768da]">
                  <ShieldCheck size={20} />
                </div>

                <div>
                  <p className="text-sm font-medium text-slate-700">
                    Acceso de demostración
                  </p>

                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Prototipo para colaboradores de campo.
                  </p>
                </div>
              </div>

            </div>

          </div>
        </section>

      </div>
    </div>
  </main>
)
}

export default LoginPage
