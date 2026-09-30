'use client'

import { useEffect, useRef, useState } from 'react'
import { BatteryFull, Bell, Camera, Check, CheckCheck, ChevronLeft, LoaderCircle, MapPin, Pause, Play, RotateCcw, Send, Signal, Truck } from 'lucide-react'

// Démo scénarisée pour la landing : une mission déclarée au bureau, reçue sur le téléphone du conducteur, puis le fil d'échanges rattaché à la mission.
// Tout l'affichage se déduit d'un seul temps t (en secondes) : le scénario se rejoue, se met en pause et se parcourt par étapes.
const T = { send: 8.4, sent: 8.8, notif: 9.4, open: 11, accept: 12.6, accepted: 12.95, chat: 13.4, loop: 31 }
const TYPE_SPEED = 32 // caractères par seconde dans les champs

type Person = 'hery' | 'tiana' | 'fara'
const people: Record<Person, { name: string, role: string, initials: string }> = {
  hery: { name: 'Hery A.', role: 'Responsable de parc', initials: 'HA' },
  tiana: { name: 'Tiana R.', role: 'Conducteur', initials: 'TR' },
  fara: { name: 'Fara M.', role: 'Chef de chantier', initials: 'FM' },
}

const fields = [
  { label: 'Véhicule', value: 'CB-07 · Camion-benne', at: .6 },
  { label: 'Conducteur', value: 'Tiana R. · Permis C', at: 1.6 },
  { label: 'Trajet', value: 'Dépôt Andraharo → Chantier Ankorondrano', at: 2.6 },
  { label: 'Départ', value: 'Aujourd’hui · 09:00', at: 4.1 },
  { label: 'Consigne', value: '12 m³ de remblai, déchargement en zone B', at: 5 },
]
const checks = [
  { text: 'Assurance et visite technique du CB-07 valides', at: 6.7 },
  { text: 'Permis C de Tiana R. valide', at: 7.2 },
  { text: 'CB-07 libre : aucun chantier ni autre mission sur le créneau', at: 7.7 },
]

// Messages : typing = début de la saisie (dans le champ de son auteur, ou « … écrit » chez les autres), at = envoi
type Message = { from?: Person, text: string, at: number, typing?: number, time: string, photo?: boolean }
const thread: Message[] = [
  { text: 'Mission M-2481 envoyée à Tiana R.', at: T.sent, time: '08:52' },
  { text: 'Mission acceptée par Tiana R.', at: T.accepted, time: '08:53' },
  { from: 'tiana', typing: 13.7, at: 15.1, text: 'Bien reçue. Je charge au dépôt et je pars à 9 h.', time: '08:53' },
  { from: 'fara', typing: 15.7, at: 17, text: 'Accès par le portail nord, la zone B est balisée.', time: '08:55' },
  { from: 'hery', typing: 17.6, at: 19.2, text: 'Une photo de la benne à l’arrivée pour l’état des lieux, merci.', time: '08:56' },
  { text: 'CB-07 a quitté Dépôt Andraharo', at: 20.6, time: '09:02' },
  { text: 'CB-07 est entré dans Chantier Ankorondrano', at: 22.4, time: '09:14' },
  { from: 'tiana', typing: 23.2, at: 24.6, photo: true, text: 'Benne à l’arrivée, rien à signaler.', time: '09:16' },
  { from: 'fara', typing: 25.2, at: 26.5, text: 'Reçu, déchargement validé. Merci !', time: '09:18' },
  { text: 'Mission M-2481 terminée', at: 27.5, time: '09:18' },
]

const statuses = [
  { id: 'brouillon', label: 'Brouillon', at: 0 }, { id: 'envoyee', label: 'Envoyée', at: T.sent }, { id: 'acceptee', label: 'Acceptée', at: T.accepted },
  { id: 'en-route', label: 'En route', at: 20.6 }, { id: 'sur-place', label: 'Sur place', at: 22.4 }, { id: 'terminee', label: 'Terminée', at: 27.5 },
]
const steps = [
  { label: 'Déclaration', text: 'Le responsable de parc remplit la mission', at: 0 },
  { label: 'Contrôles', text: 'Documents, permis et disponibilité vérifiés', at: 6.3 },
  { label: 'Réception', text: 'Le conducteur la reçoit et l’accepte', at: T.notif - .3 },
  { label: 'Échanges', text: 'Le fil de la mission réunit tout le monde', at: T.chat },
]
const REDUCED_T = 28.5 // état final, montré d'emblée quand les animations sont réduites
const FIELD_AT = 9 // sur mobile, un seul appareil à la fois : le navigateur jusqu'à l'envoi, puis le téléphone

const typed = (text: string, start: number, t: number, end?: number) => {
  if (t < start) return ''
  const share = end == null ? (t - start) * TYPE_SPEED / text.length : (t - start) / Math.max(.1, end - start - .25)
  return text.slice(0, Math.ceil(Math.min(1, share) * text.length))
}
const statusAt = (t: number) => statuses.filter((s) => t >= s.at).pop()!

function Thread({ t, viewer }: { t: number, viewer: Person }) {
  const shown = thread.filter((m) => t >= m.at)
  const writing = thread.find((m) => m.from && m.from !== viewer && m.typing != null && t >= m.typing && t < m.at)
  return (
    <div className="demo-thread">
      <div className="demo-thread-list">
        {shown.map((m) => m.from ? (
          <div key={m.at} className={`demo-msg ${m.from === viewer ? 'is-mine' : ''}`}>
            {m.from !== viewer && <span className="demo-avatar">{people[m.from].initials}</span>}
            <div className="demo-bubble">
              {m.from !== viewer && <b>{people[m.from].name} <i>{people[m.from].role}</i></b>}
              {m.photo && <span className="demo-photo"><img src="/images/park-camion-benne.webp" alt="" /><em><Camera size={11} /> État des lieux</em></span>}
              <p>{m.text}</p>
              <small>{m.time}{m.from === viewer && <CheckCheck size={11} />}</small>
            </div>
          </div>
        ) : (
          <div key={m.at} className="demo-event"><span>{m.time}</span>{m.text}</div>
        ))}
        {writing && <div className="demo-typing"><span className="demo-avatar">{people[writing.from!].initials}</span><span className="demo-dots"><i /><i /><i /></span>{people[writing.from!].name} écrit…</div>}
      </div>
    </div>
  )
}

function Composer({ t, viewer }: { t: number, viewer: Person }) {
  const draft = thread.find((m) => m.from === viewer && m.typing != null && t >= m.typing && t < m.at)
  return (
    <div className="demo-composer">
      {draft?.photo && <Camera size={13} className="demo-attach" />}
      <span className={draft ? 'is-typing' : ''}>{draft ? <em>{typed(draft.text, draft.typing!, t, draft.at)}<i className="demo-caret" /></em> : <em>Écrire dans le fil de la mission…</em>}</span>
      <i className={draft && t > draft.at - .35 ? 'is-pressed' : ''}><Send size={12} /></i>
    </div>
  )
}

export function MissionDemo() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [t, setT] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setPlaying(false); setT(REDUCED_T) }
    const root = rootRef.current
    if (!root) return
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { threshold: .3 })
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  // Le temps n'avance que si la démo est à l'écran et en lecture ; le scénario reboucle après une pause sur l'état final
  useEffect(() => {
    if (!playing || !visible) return
    let last = performance.now()
    const timer = window.setInterval(() => {
      const now = performance.now(), dt = Math.min(.2, (now - last) / 1000); last = now
      setT((current) => current + dt >= T.loop ? 0 : current + dt)
    }, 50)
    return () => window.clearInterval(timer)
  }, [playing, visible])

  const status = statusAt(t), sent = t >= T.sent, accepted = t >= T.accepted
  const stepIndex = steps.filter((s) => t >= s.at).length - 1
  const clock = thread.filter((m) => t >= m.at).pop()?.time ?? '08:52'
  const phoneScreen = t < T.open ? 'home' : t < T.chat ? 'mission' : 'chat'
  const activeField = fields.findIndex((f) => t >= f.at && t < f.at + f.value.length / TYPE_SPEED + .15)
  const seek = (at: number) => { setT(at); setPlaying(true) }

  return (
    <div className="mission-demo" ref={rootRef}>
      <div className="demo-controls">
        <ol className="demo-steps">
          {steps.map((step, i) => {
            const next = steps[i + 1]?.at ?? T.loop - 2, fill = Math.min(1, Math.max(0, (t - step.at) / (next - step.at)))
            return (
              <li key={step.label} className={i === stepIndex ? 'is-active' : i < stepIndex ? 'is-done' : ''}>
                <button onClick={() => seek(step.at)} aria-label={`Voir l’étape ${step.label}`}>
                  <span>0{i + 1}</span><strong>{step.label}</strong><small>{step.text}</small>
                  <i style={{ transform: `scaleX(${fill})` }} />
                </button>
              </li>
            )
          })}
        </ol>
        <div className="demo-buttons">
          <button onClick={() => setPlaying(!playing)} aria-label={playing ? 'Mettre la démo en pause' : 'Lire la démo'}>{playing ? <Pause size={14} /> : <Play size={14} />}</button>
          <button onClick={() => seek(0)} aria-label="Rejouer la démo depuis le début"><RotateCcw size={14} /></button>
        </div>
      </div>

      <p className="sr-only">Démonstration : Hery, responsable de parc, déclare la mission M-2481, le camion-benne CB-07 conduit par Tiana. Le système vérifie les documents du véhicule, le permis C et la disponibilité, puis envoie la mission. Tiana la reçoit sur l’application conducteur et l’accepte. Dans le fil de la mission, Tiana, Hery et Fara, chef de chantier, échangent ; le départ et l’arrivée sur le chantier s’ajoutent automatiquement depuis le GPS, avec une photo d’état des lieux.</p>

      <div className={`demo-stage ${t < FIELD_AT ? 'is-office' : 'is-field'}`} aria-hidden="true">
        <div className="demo-browser">
          <div className="demo-browser-bar"><span className="demo-dots-win"><i /><i /><i /></span><span className="demo-url">parcauto · Missions</span><span className="demo-user"><span className="demo-avatar">HA</span>Hery A. · Responsable de parc</span></div>
          <div className="demo-app">
            <div className="demo-form">
              <div className="demo-form-head"><p>Missions › <b>{sent ? 'M-2481' : 'Nouvelle mission'}</b></p><span className={`demo-status is-${status.id}`}>{status.label}</span></div>
              <div className="demo-fields">
                {fields.map((f, i) => {
                  const value = typed(f.value, f.at, t)
                  return <div key={f.label} className={`demo-field ${i === activeField ? 'is-active' : ''} ${value ? 'is-filled' : ''}`}><label>{f.label}</label><span>{value}{i === activeField && <i className="demo-caret" />}</span></div>
                })}
              </div>
              <ul className="demo-checks">
                {checks.map((c) => {
                  const state = t >= c.at ? 'is-ok' : t >= c.at - .45 ? 'is-running' : ''
                  return <li key={c.text} className={state}>{state === 'is-ok' ? <Check size={12} /> : state ? <LoaderCircle size={12} className="demo-spin" /> : <i />}{c.text}</li>
                })}
              </ul>
              <span className={`demo-send ${t >= T.send && t < T.sent ? 'is-pressed' : ''} ${sent ? 'is-sent' : ''} ${t >= checks[2].at ? 'is-ready' : ''}`}>{sent ? <><CheckCheck size={14} /> {accepted ? 'Acceptée par Tiana R. · 08:53' : 'Envoyée à Tiana R. · 08:52'}</> : <><Send size={13} /> Envoyer la mission</>}</span>
            </div>
            <div className="demo-side">
              <div className="demo-side-head"><b>Fil de la mission</b><span>{sent ? 'M-2481 · 3 participants' : '—'}</span></div>
              {sent ? <><Thread t={t} viewer="hery" /><Composer t={t} viewer="hery" /></> : <p className="demo-empty">Le fil s’ouvre à l’envoi de la mission. Conducteur, responsable et chef de chantier y échangent, attachés à la mission.</p>}
            </div>
          </div>
        </div>

        <div className="demo-phone">
          <div className="demo-phone-screen">
            <div className="demo-phone-status"><b>{clock}</b><span><Signal size={11} /><BatteryFull size={13} /></span></div>
            <div className={`demo-notif ${t >= T.notif && t < T.open ? 'is-shown' : ''}`}><span className="demo-notif-icon"><Bell size={13} /></span><div><b>Nouvelle mission · CB-07</b><p>Dépôt Andraharo → Chantier Ankorondrano · départ 09:00</p></div></div>

            <div className={`demo-screen ${phoneScreen === 'home' ? 'is-current' : ''}`}>
              <p className="demo-app-name">ParcAuto Conducteur</p>
              <h4>Bonjour Tiana</h4>
              <div className="demo-card"><Truck size={16} /><div><b>CB-07 · Camion-benne</b><p>91 544 km · documents à jour</p></div></div>
              <div className="demo-card is-muted"><div><b>Missions</b><p>{t >= T.notif ? '1 nouvelle mission' : 'Aucune mission en attente'}</p></div></div>
              <div className="demo-quick"><span>Déclarer un plein</span><span>Déclarer un incident</span></div>
            </div>

            <div className={`demo-screen ${phoneScreen === 'mission' ? 'is-current' : ''}`}>
              <p className="demo-app-name"><ChevronLeft size={13} /> Mission M-2481</p>
              <div className="demo-mission">
                <span className={`demo-status ${accepted ? 'is-acceptee' : 'is-envoyee'}`}>{accepted ? 'Acceptée' : 'Nouvelle'}</span>
                <h4>CB-07 · Camion-benne</h4>
                <p><MapPin size={12} /> Dépôt Andraharo → Chantier Ankorondrano</p>
                <dl><div><dt>Départ</dt><dd>Aujourd’hui, 09:00</dd></div><div><dt>Consigne</dt><dd>12 m³ de remblai, zone B</dd></div></dl>
                <p className="demo-mission-checks"><Check size={11} /> Documents du véhicule · <Check size={11} /> Permis C</p>
              </div>
              {accepted ? <span className="demo-accepted"><CheckCheck size={14} /> Mission acceptée</span> : <div className="demo-actions"><span>Refuser</span><span className={t >= T.accept ? 'is-pressed' : ''}>Accepter</span></div>}
            </div>

            <div className={`demo-screen demo-screen-chat ${phoneScreen === 'chat' ? 'is-current' : ''}`}>
              <p className="demo-app-name"><ChevronLeft size={13} /> Fil · M-2481 <span className={`demo-status is-${status.id}`}>{status.label}</span></p>
              <Thread t={t} viewer="tiana" />
              <Composer t={t} viewer="tiana" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
