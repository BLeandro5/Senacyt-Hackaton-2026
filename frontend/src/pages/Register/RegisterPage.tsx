import AegisBrand from '../../components/AegisBrand'
import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { readStored } from '../../data/visitStore'
import { registerUser, type CurrentUser } from '../../data/userApi'

const initial = { first_name: '', last_name: '', cedula: '', email: '', phone: '', password: '' }
export default function RegisterPage() {
  const navigate = useNavigate(); const current = readStored<CurrentUser | null>('demo-user', null)
  const [form, setForm] = useState(initial); const [error, setError] = useState(''); const [loading, setLoading] = useState(false); const [show, setShow] = useState(false)
  if (current?.name) return <Navigate to={current.role === 'supervisor' ? '/supervisor' : '/home'} replace />
  const change = (key: keyof typeof initial) => (event: React.ChangeEvent<HTMLInputElement>) => setForm(value => ({ ...value, [key]: event.target.value }))
  const submit = async (event: React.FormEvent) => { event.preventDefault(); if (loading) return
    if (Object.values(form).some(value => !value.trim()) || form.password.length < 3 || !/^\S+@\S+\.\S+$/.test(form.email)) { setError('Completa todos los campos; usa un correo válido y una contraseña de al menos 3 caracteres.'); return }
    setLoading(true); setError(''); try { const user = await registerUser(form); localStorage.setItem('demo-user', JSON.stringify(user)); navigate('/home') } catch (cause) { setError(cause instanceof Error ? cause.message : 'No se pudo crear la cuenta.') } finally { setLoading(false) }
  }
  return <main className="min-h-screen bg-slate-100 p-4 sm:p-8"><section className="mx-auto max-w-lg rounded-[28px] bg-white p-6 shadow-xl sm:p-10"><p className="text-sm font-semibold text-[#0B5ED7]"><AegisBrand /> · Field Intelligence</p><h1 className="mt-2 text-3xl font-semibold">Crea tu cuenta</h1><p className="mt-2 text-sm text-slate-500">Registra tu acceso de colaborador.</p><form onSubmit={submit} className="mt-7 grid gap-4 sm:grid-cols-2">{[['first_name','Nombre','text'],['last_name','Apellido','text'],['cedula','Cédula','text'],['email','Correo electrónico','email'],['phone','Celular','tel']].map(([key,label,type]) => <label key={key} className="text-sm font-medium">{label}<input required type={type} value={form[key as keyof typeof initial]} onChange={change(key as keyof typeof initial)} className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3" /></label>)}<label className="relative text-sm font-medium sm:col-span-2">Contraseña<input required minLength={3} type={show ? 'text' : 'password'} value={form.password} onChange={change('password')} placeholder="123" className="mt-2 h-12 w-full rounded-xl border border-slate-200 px-3 pr-12"/><button type="button" onClick={() => setShow(value => !value)} className="absolute bottom-3 right-3 text-slate-500" aria-label="Mostrar contraseña">{show ? <EyeOff size={18}/> : <Eye size={18}/>}</button><span className="mt-1 block text-xs font-normal text-slate-400">La contraseña puede tener desde 3 caracteres.</span></label>{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-600 sm:col-span-2">{error}</p>}<button disabled={loading} className="h-12 rounded-2xl bg-[#0B5ED7] font-semibold text-white disabled:opacity-60 sm:col-span-2">{loading ? 'Creando cuenta...' : 'Crear cuenta'}</button></form><p className="mt-6 text-center text-sm text-slate-500">¿Ya tengo acceso? <Link to="/login" className="font-semibold text-[#0B5ED7]">Iniciar sesión</Link></p></section></main>
}
