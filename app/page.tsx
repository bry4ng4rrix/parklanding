'use client'

import { Fragment, useEffect, useRef, useState, type CSSProperties, type PointerEvent, type KeyboardEvent } from 'react'
import { ArrowDownRight, ArrowRight, Check, Menu, X } from 'lucide-react'
import { LiveMap } from '@/components/live-map'
import { MissionDemo } from '@/components/mission-demo'

const heroImage = '/images/park-hero-tractor.webp'
// Tracteur à lame détouré (avec son ombre au sol), posé sur le fond de la vue éclatée ; son moyeu avant, remis à plat, tourne à part
const heroScene = { machine: heroImage, hub: '/images/park-hero-tractor-hub.png' }
const heroHeadline = [{ text: 'Votre flotte.', em: false }, { text: 'en mouvement.', em: true }]
// Avant du tracteur, mesuré sur son calque (fractions de sa largeur/hauteur) : pour 40 tranches horizontales, abscisse du premier pixel de l'engin (null : rien à cette hauteur)
const machineFront = [null, .536, .435, .325, .312, .309, .304, .273, .273, .273, .274, .278, .256, .19, .179, .182, .186, .191, .197, .155, .116, .09, .04, .033, .036, .043, .047, .047, .043, .04, .029, .016, .016, .088, .114, .171, .422, .528, null, null]
const machineArm = .4 // arrière de la lame : les mots déjà derrière ne sont pas poussés
const bladeHeap = { x: .2, floor: .8, gap: [.05, .06], rows: [8, 7, 5, 3, 1], scale: .28 } // tas de lettres poussées contre la lame : centre, sol, écarts, lettres par rangée (de bas en haut) et taille finale
const heapSlot = (rank: number) => {
  let row = 0, first = 0
  while (rank >= first + (bladeHeap.rows[row] ?? 1)) { first += bladeHeap.rows[row] ?? 1; row++ }
  const count = bladeHeap.rows[row] ?? 1
  return { x: bladeHeap.x + (rank - first - (count - 1) / 2) * bladeHeap.gap[0], y: bladeHeap.floor - row * bladeHeap.gap[1] }
}
const machineTravel = 1.15 + .04 // recul du bord gauche de .hero-machine à --drive = 1 (translation de 115% + agrandissement de 8% autour de son centre)

// Contenu tiré de PRESENTATION.md
const pilotage = [
  { number: '01', title: 'Coût complet (TCO)', text: 'Par véhicule et par type : amortissement, loyer, charges annuelles au prorata, carburant, entretien.', icon: '◎' },
  { number: '02', title: 'Taux d’utilisation', text: 'Les véhicules sous-utilisés ressortent, avec des seuils réglés par type : un camion-benne n’est pas une voiture de service.', icon: '↗' },
  { number: '03', title: 'Fiabilité', text: 'Pannes, immobilisation, respect des échéances, contrôles qualité à la clôture des maintenances.', icon: '◌' },
  { number: '04', title: 'Score de conduite', text: 'Mensuel, par conducteur, à partir des événements remontés par les boîtiers GPS.', icon: '◐' },
  { number: '05', title: 'Budget carburant', text: 'Le réel comparé au prévisionnel, avec la cause probable de l’écart.', icon: '◧' },
  { number: '06', title: 'Renouvellement', text: 'Fin de vie, cessions, plan de remplacement chiffré.', icon: '↻' },
  { number: '07', title: 'Prévisions', text: 'Les dépenses projetées sur douze mois.', icon: '⟶' },
  { number: '08', title: 'Sinistres', text: 'Dossier assureur, responsabilité, reste à charge.', icon: '△' },
]

const fleetCards = [
  { type: 'Engins de chantier', title: 'Mesurés en heures moteur', meta: 'Consommation et coût d’usage à l’heure', position: 'fleet-card-one', image: '/images/park-card-compacteur.webp' },
  { type: 'Véhicules routiers', title: 'Suivis au kilomètre', meta: 'Fiche technique, compteurs, documents, photos', position: 'fleet-card-two', image: '/images/park-hero-4x4.png' },
  { type: 'Missions', title: 'Un départ sous contrôle', meta: 'Affectations, pleins, incidents', position: 'fleet-card-three', image: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=900&q=70' },
  { type: 'Carburant', title: 'Réel contre prévisionnel', meta: 'La cause probable de chaque écart', position: 'fleet-card-four', image: 'https://images.unsplash.com/photo-1615906655593-ad0386982a0f?auto=format&fit=crop&w=900&q=70' },
  { type: 'Maintenance', title: 'Un échéancier tenu', meta: 'Contrôle qualité à la clôture', position: 'fleet-card-five', image: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=900&q=70' },
  { type: 'GPS', title: 'La conduite notée', meta: 'Score mensuel par conducteur', position: 'fleet-card-six', image: '/images/park-hero-cinematic.png' },
]

const dashboardImage = 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=85'
const appsImage = '/images/park-hero-cinematic.png'

// Vue éclatée du camion-benne : calques public/images/park-camion-*.webp découpés dans une scène de 1116×608, dans l'ordre d'empilement.
// box : position et taille en % de la scène ; move : déplacement une fois détachée (en % de la largeur du camion) et rotation ;
// start : moment du défilement (0 → 1) où la pièce se détache ; label : ancre de l'étiquette en % de la pièce et côté du texte
const explodePieces = [
  { id: 'chassis', name: 'Châssis', data: 'Fiche technique · documents', box: [9.498, 30.592, 53.584, 61.842], move: [4, 2, 0], start: .64, label: [99, 52, 'right'] },
  { id: 'essieux', name: 'Essieux arrière', data: 'Pièces · atelier', box: [49.462, 59.211, 44.086, 29.605], move: [8, 15, 2], start: .56, label: [70, 100, 'bottom'] },
  { id: 'reservoir', name: 'Réservoir', data: 'Carburant · réel et prévu', box: [45.161, 60.855, 16.039, 16.941], move: [-2, 8, 0], start: .48, label: [50, 100, 'bottom'] },
  { id: 'benne', name: 'Benne', data: 'Chantier · période datée', box: [28.136, 1.974, 70.968, 58.717], move: [10, -16, -5], start: .04, label: [55, 6, 'top'] },
  { id: 'trainavant', name: 'Train avant', data: 'Maintenance · échéancier', box: [6.272, 59.211, 30.914, 33.553], move: [4, 14, -8], start: .4, label: [62, 100, 'bottom'] },
  { id: 'parechocs', name: 'Pare-chocs', data: 'Sinistres · reste à charge', box: [0.717, 58.224, 20.699, 16.283], move: [-12, 10, 0], start: .31, label: [40, 100, 'bottom'] },
  { id: 'capot', name: 'Capot moteur', data: 'Kilomètres · coût d’usage', box: [1.971, 28.783, 33.781, 32.401], move: [-17, -4, -4], start: .22, label: [42, 8, 'top'] },
  { id: 'cabine', name: 'Cabine', data: 'Conducteur · permis vérifié', box: [19.713, 12.664, 29.839, 47.368], move: [-8, -14, -2], start: .13, label: [50, 3, 'top'] },
] as const
const explodeShadow = { src: '/images/park-camion-ombre.webp', box: [0, 73.026, 100, 26.974] }
const explodeSpan = .16 // part du défilement pendant laquelle une pièce se détache
const chantierSteps = [
  { title: 'Une période datée', text: 'Un chantier réunit des véhicules et des conducteurs. Un engin peut en servir plusieurs à des dates disjointes, jamais un chantier et une mission en même temps.' },
  { title: 'Une présence calculée chaque nuit', text: 'À partir des positions GPS, sans que personne ait à la saisir. L’écart entre le matériel prévu et le matériel réellement présent devient visible de lui-même.' },
  { title: 'Un état des lieux, photos comprises', text: 'À la montée et à la descente du matériel : une dégradation s’impute au bon chantier au lieu d’être découverte au retour, sans savoir d’où elle vient.' },
]
const chantierStepAt = (progress: number) => progress < .34 ? 0 : progress < .62 ? 1 : 2

const conformite = [
  'Contrôle bloquant au départ de chaque mission',
  'Documents exigés réglés par type de véhicule — une liste vide retombe sur assurance et visite technique',
  'Surveillance de la fatigue au volant',
  'Journal des connexions',
]
const echanges = [
  'Conversations privées, canaux d’équipe et fils rattachés à un véhicule, une mission, un chantier ou une maintenance',
  'Des alertes qui montent d’un niveau tant qu’elles ne sont pas traitées',
  'Les alertes critiques transmises à vos autres outils',
]

const apps = [
  { name: 'Web', audience: 'Bureau, direction, atelier', text: 'L’interface complète, pour tout le parc.' },
  { name: 'Mobile conducteur', audience: 'Conducteurs', text: 'Son véhicule, ses missions, la déclaration de plein et d’incident depuis le terrain.' },
  { name: 'Mobile atelier', audience: 'Mécaniciens', text: 'Maintenances, pièces, photos avant, pendant et après l’intervention.' },
]
const appSafeguards = [
  { title: 'Un accès volé est coupé', text: 'Chaque téléphone a son propre accès, renouvelé en permanence. Si quelqu’un réutilise un ancien accès, l’application le détecte et déconnecte l’appareil.' },
  { title: 'Réseau instable, aucun doublon', text: 'En zone mal couverte, on peut renvoyer une déclaration sans risque : une maintenance n’est jamais créée deux fois, les pièces ne sont jamais comptées en double.' },
]

const roles = [
  { name: 'DG', scope: 'Tout' },
  { name: 'Responsable de parc', scope: 'Tout le métier' },
  { name: 'Assistant de parc', scope: 'Prépare, ne valide pas' },
  { name: 'Chef de maintenance', scope: 'Toute l’activité maintenance' },
  { name: 'Assistant de maintenance', scope: 'Planifie, validation du chef' },
  { name: 'Chef de chantier', scope: 'Ses chantiers : demandes de matériel, journal' },
  { name: 'Conducteur', scope: 'Son véhicule, ses missions, ses saisies' },
  { name: 'Comptable', scope: 'Lecture, export comptable' },
  { name: 'Administrateur', scope: 'Comptes et paramètres ; lecture seule sur le métier' },
]

const trackingFeatures = [
  { title: 'Positions en direct', text: 'Chaque déplacement s’affiche dès qu’il est reçu, sans recharger : vitesse, cap, mission en cours et conducteur.' },
  { title: 'Zones de chantier', text: 'Le périmètre de chaque chantier est tracé sur la carte. Entrées et sorties sont repérées, et la présence du matériel est calculée chaque nuit.' },
  { title: 'Plan ou satellite', text: 'Fond de plan ou imagerie satellite, avec des étiquettes de lieux qu’on masque quand elles gênent la lecture d’une zone.' },
  { title: 'Conduite et alertes', text: 'Les événements des boîtiers GPS alimentent le score de conduite mensuel ; une alerte non traitée monte d’un niveau.' },
]

export default function Page() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeCard, setActiveCard] = useState(6)
  const [isWrapping, setIsWrapping] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const dragStart = useRef(0)
  const dragMoved = useRef(false)
  const heroRef = useRef<HTMLElement>(null)
  const chantiersRef = useRef<HTMLElement>(null)

  const goToCard = (direction: 1 | -1) => setActiveCard((current) => Math.min(12, Math.max(6, current + direction)))
  const handlePointerDown = (event: PointerEvent<HTMLDivElement>) => { dragStart.current = event.clientX; dragMoved.current = false; setIsDragging(true); event.currentTarget.setPointerCapture(event.pointerId) }
  const handlePointerMove = (event: PointerEvent<HTMLDivElement>) => { if (!isDragging) return; const offset = event.clientX - dragStart.current; if (Math.abs(offset) > 5) dragMoved.current = true; setDragOffset(offset) }
  const handlePointerUp = () => { if (!isDragging) return; if (Math.abs(dragOffset) > 70) goToCard(dragOffset < 0 ? 1 : -1); setIsDragging(false); setDragOffset(0); window.setTimeout(() => { dragMoved.current = false }, 0) }
  const handleCarouselKeyDown = (event: KeyboardEvent<HTMLDivElement>) => { if (event.key === 'ArrowRight') { event.preventDefault(); goToCard(1) }; if (event.key === 'ArrowLeft') { event.preventDefault(); goToCard(-1) } }

  useEffect(() => {
    if (activeCard === 12) {
      const wrap = window.setTimeout(() => { setIsWrapping(true); setActiveCard(6); window.requestAnimationFrame(() => setIsWrapping(false)) }, 850)
      return () => window.clearTimeout(wrap)
    }
  }, [activeCard])

  useEffect(() => {
    if (isDragging) return
    const autoRotate = window.setInterval(() => goToCard(1), 4200)
    return () => window.clearInterval(autoRotate)
  }, [isDragging])

  useEffect(() => {
    const elements = document.querySelectorAll<HTMLElement>('.reveal-on-scroll')
    const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
      if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target) }
    }), { threshold: 0.16 })
    elements.forEach((element) => observer.observe(element))
    return () => observer.disconnect()
  }, [])

  // Le tracteur avance vers la gauche à mesure que le hero défile : --drive (0 → 1) pilote sa position et la rotation du moyeu, --dust la poussière.
  // Il pousse au passage les lettres du titre qu'il rencontre : chaque lettre part quand l'avant de l'engin l'atteint, s'entasse contre la lame et avance avec lui.
  useEffect(() => {
    const hero = heroRef.current
    const machine = hero?.querySelector<HTMLElement>('.hero-machine')
    if (!hero || !machine || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const words = [...hero.querySelectorAll<HTMLElement>('.hero-word')]
    type Letter = { el: HTMLElement, x: number, y: number, contact: number, slotX: number, slotY: number, spin: number, lift: number }
    let letters: Letter[] = [], rest = { left: 0, top: 0, width: 0, height: 0 }
    let frame = 0, current = 0, target = 0, visible = true, disposed = false
    const random = (seed: number) => { const s = Math.sin(seed * 12.9898) * 43758.5453; return s - Math.floor(s) }
    const inHero = (el: HTMLElement) => { let x = 0, y = 0, node: HTMLElement | null = el; while (node && node !== hero) { x += node.offsetLeft; y += node.offsetTop; node = node.offsetParent as HTMLElement | null } return { x, y } }
    const machineBox = () => { const m = machine.getBoundingClientRect(), h = hero.getBoundingClientRect(); return { left: m.left - h.left, top: m.top - h.top, width: m.width, height: m.height } }

    const measure = () => {
      machine.style.transform = 'none'; rest = machineBox(); machine.style.transform = ''
      const arm = rest.left + machineArm * rest.width
      letters.forEach(({ el }) => { el.style.transform = ''; el.style.opacity = ''; el.style.pointerEvents = '' })
      letters = words.flatMap((word) => {
        const origin = inHero(word)
        const front = machineFront[Math.floor((origin.y + word.offsetHeight / 2 - rest.top) / rest.height * machineFront.length)]
        if (front == null || origin.x + word.offsetWidth / 2 > arm) return [] // hors du chemin de l'engin ou déjà derrière la lame : le mot reste en place
        const edge = rest.left + front * rest.width
        return [...word.children].map((child, i) => {
          const el = child as HTMLElement, { x, y } = inHero(el), right = x + el.offsetWidth, seed = origin.x + origin.y + i
          // distance que l'engin doit parcourir avant de toucher la lettre : par son avant si elle est devant lui, sinon par l'arrière de la lame
          const contact = right <= edge ? edge - right : Math.max(0, arm - right)
          return { el, x: x + el.offsetWidth / 2, y: y + el.offsetHeight / 2, contact, slotX: (random(seed) - .5) * .008, slotY: (random(seed + 7) - .5) * .008, spin: (random(seed + 3) - .5) * 60, lift: 40 + random(seed + 5) * 60 }
        })
      })
      // les premières lettres poussées tombent au pied de la lame, les suivantes s'empilent par-dessus
      const pickupOrder = [...letters].sort((a, b) => a.contact - b.contact)
      pickupOrder.forEach((letter, rank) => { const slot = heapSlot(rank); letter.slotX += slot.x; letter.slotY += slot.y })
    }

    // Place les lettres poussées ; renvoie true tant que la lame en pousse (elles doivent suivre la dérive lente de l'image)
    const place = () => {
      const live = machineBox(), moved = current * machineTravel * rest.width
      let carrying = false
      letters.forEach((letter) => {
        const p = Math.min(1, Math.max(0, (moved - letter.contact) / 140))
        if (p === 0) { letter.el.style.transform = ''; letter.el.style.opacity = ''; letter.el.style.pointerEvents = ''; return }
        carrying = true
        const e = p < .5 ? 4 * p ** 3 : 1 - (2 - 2 * p) ** 3 / 2
        const dx = live.left + letter.slotX * live.width - letter.x, dy = live.top + letter.slotY * live.height - letter.y
        letter.el.style.transform = `translate3d(${dx * e}px, ${dy * e - letter.lift * Math.sin(Math.PI * e)}px, 0) rotate(${letter.spin * e}deg) scale(${1 - (1 - bladeHeap.scale) * e})`
        letter.el.style.opacity = String(1 - .15 * e)
        letter.el.style.pointerEvents = 'none' // une lettre qui passe au-dessus des boutons ne doit pas bloquer le clic
      })
      return carrying
    }

    const tick = () => {
      const delta = target - current
      current = Math.abs(delta) < 0.0005 ? target : current + delta * 0.12
      hero.style.setProperty('--drive', current.toFixed(4))
      hero.style.setProperty('--dust', current === target ? '0' : Math.min(1, Math.abs(delta) * 12).toFixed(3))
      const carrying = place()
      frame = current !== target || (carrying && visible) ? window.requestAnimationFrame(tick) : 0
    }
    const wake = () => { if (!frame) frame = window.requestAnimationFrame(tick) }
    const handleScroll = () => { target = Math.min(1, Math.max(0, window.scrollY / (hero.offsetHeight * 0.8))); wake() }
    const handleResize = () => { measure(); handleScroll() }
    const observer = new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) wake() })
    handleResize()
    document.fonts.ready.then(() => { if (!disposed) handleResize() })
    observer.observe(hero)
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize)
    return () => { disposed = true; window.cancelAnimationFrame(frame); observer.disconnect(); window.removeEventListener('scroll', handleScroll); window.removeEventListener('resize', handleResize) }
  }, [])

  // Vue éclatée : pendant que la section reste épinglée, --explode (0 → 1) suit le défilement et chaque pièce se détache à son tour (--e, 0 → 1).
  // L'étape de texte active et le compteur de pièces suivent la même progression.
  useEffect(() => {
    const section = chantiersRef.current
    if (!section) return
    const pieces = [...section.querySelectorAll<HTMLElement>('.explode-piece')]
    const steps = [...section.querySelectorAll<HTMLElement>('.explode-steps li')]
    const counter = section.querySelector<HTMLElement>('.explode-counter b')
    const starts = pieces.map((piece) => Number(piece.dataset.start))
    const labels = [...section.querySelectorAll<HTMLElement>('.explode-label')] // même ordre que les pièces
    const sticky = section.querySelector<HTMLElement>('.explode-sticky')
    const opposite: Record<string, string> = { left: 'right', right: 'left', top: 'bottom', bottom: 'top' }
    const render = (progress: number) => {
      section.style.setProperty('--explode', progress.toFixed(4))
      let detached = 0
      pieces.forEach((piece, i) => {
        const p = Math.min(1, Math.max(0, (progress - starts[i]) / explodeSpan)), e = p < .5 ? 4 * p ** 3 : 1 - (2 - 2 * p) ** 3 / 2
        piece.style.setProperty('--e', e.toFixed(4)); labels[i]?.style.setProperty('--e', e.toFixed(4))
        piece.classList.toggle('is-detached', e > .02)
        if (e > .5) detached++
      })
      const step = chantierStepAt(progress)
      steps.forEach((li, i) => li.classList.toggle('is-active', i === step))
      if (counter) counter.textContent = String(detached).padStart(2, '0')
    }
    // Une étiquette qui sortirait de l'écran une fois l'engin éclaté passe de l'autre côté de sa pièce (mesuré à l'état éclaté, puis l'état courant est rétabli)
    const placeLabels = (progress: number) => {
      if (!sticky) return
      labels.forEach((label) => label.style.setProperty('--e', '1'))
      const bounds = sticky.getBoundingClientRect()
      labels.forEach((label) => {
        const side = label.dataset.side ?? 'right'
        label.classList.remove('is-left', 'is-right', 'is-top', 'is-bottom'); label.classList.add(`is-${side}`)
        const box = label.getBoundingClientRect()
        const out = side === 'right' ? box.right > bounds.right - 8 : side === 'left' ? box.left < bounds.left + 8 : side === 'top' ? box.top < bounds.top + 8 : box.bottom > bounds.bottom - 8
        if (out) { label.classList.remove(`is-${side}`); label.classList.add(`is-${opposite[side]}`) }
      })
      render(progress)
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { placeLabels(1); steps.forEach((li) => li.classList.add('is-active')); return }

    let frame = 0, current = 0, target = 0
    const tick = () => {
      const delta = target - current
      current = Math.abs(delta) < 0.0005 ? target : current + delta * 0.14
      render(current)
      frame = current !== target ? window.requestAnimationFrame(tick) : 0
    }
    const handleScroll = () => {
      const box = section.getBoundingClientRect(), run = box.height - window.innerHeight
      target = run > 0 ? Math.min(1, Math.max(0, -box.top / run)) : 1
      if (!frame) frame = window.requestAnimationFrame(tick)
    }
    const handleResize = () => { placeLabels(current); handleScroll() }
    handleResize()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize)
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener('scroll', handleScroll); window.removeEventListener('resize', handleResize) }
  }, [])

  return (
    <main className="park-page">
      <section className="hero" id="accueil" ref={heroRef}>
        <div className="hero-image" aria-hidden="true">
          <div className="hero-scene">
            <div className="hero-machine" style={{ backgroundImage: `url(${heroScene.machine})` }}>
              <span className="hero-dust" />
              <span className="hero-wheel hero-wheel-hub" style={{ backgroundImage: `url(${heroScene.hub})` }} />
            </div>
          </div>
        </div>
        <div className="hero-shade" aria-hidden="true" />
        <div className="grain" aria-hidden="true" />

        <header className="site-header">
          <a className="brand" href="#accueil" aria-label="ParcAuto accueil">
            <span className="brand-mark">P</span>
            <span className="brand-name">PARCAUTO<span>GESTION DE PARC</span></span>
          </a>
          <nav className="desktop-nav" aria-label="Navigation principale">
            <a href="#parc">Parc</a>
            <a href="#chantiers">Chantiers</a>
            <a href="#carte">Carte</a>
            <a href="#missions">Missions</a>
            <a href="#pilotage">Pilotage</a>
            <a href="#applications">Applications</a>
          </nav>
          <a className="header-cta" href="#contact">Demander une démo <ArrowRight size={14} /></a>
          <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={menuOpen}>
            {menuOpen ? <X size={18} strokeWidth={1.5} /> : <Menu size={19} strokeWidth={1.5} />}
          </button>
        </header>

        {menuOpen && <nav className="mobile-menu" aria-label="Navigation mobile">
          <a href="#parc" onClick={() => setMenuOpen(false)}>Parc <ArrowRight size={14} /></a>
          <a href="#chantiers" onClick={() => setMenuOpen(false)}>Chantiers <ArrowRight size={14} /></a>
          <a href="#carte" onClick={() => setMenuOpen(false)}>Carte <ArrowRight size={14} /></a>
          <a href="#missions" onClick={() => setMenuOpen(false)}>Missions <ArrowRight size={14} /></a>
          <a href="#pilotage" onClick={() => setMenuOpen(false)}>Pilotage <ArrowRight size={14} /></a>
          <a href="#applications" onClick={() => setMenuOpen(false)}>Applications <ArrowRight size={14} /></a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>Demander une démo <ArrowRight size={14} /></a>
        </nav>}

        <div className="hero-annotations" aria-label="Le système en chiffres">
          <span className="annotation annotation-left"><b>H · KM</b><i /> Heures moteur et kilomètres</span>
          <span className="annotation annotation-right"><b>GPS</b><i /> Présence calculée chaque nuit</span>
          <span className="annotation annotation-bottom-left"><b>19</b><i /> Rapports PDF et Excel</span>
          <span className="annotation annotation-bottom-right"><b>9</b><i /> Rôles, droits centralisés</span>
        </div>

        <div className="hero-content">
          <p className="eyebrow"><span className="eyebrow-line" /> 01 / 10 <span className="eyebrow-label">Gestion de parc roulant</span></p>
          <h1>
            <span className="sr-only">{heroHeadline.map((line) => line.text).join(' ')}</span>
            {heroHeadline.map(({ text, em }) => {
              const Line = em ? 'em' : 'span'
              return <Line className="hero-line" aria-hidden="true" key={text}>{text.split(' ').map((word, w) => <Fragment key={word}>{w > 0 && ' '}<span className="hero-word">{[...word].map((letter, l) => <span className="hero-letter" key={l}>{letter}</span>)}</span></Fragment>)}</Line>
            })}
          </h1>
          <p className="hero-copy">Véhicules routiers et engins de chantier, leurs conducteurs, leurs missions, leurs coûts et les chantiers où ils travaillent : un seul système pour tout le parc.</p>
          <div className="hero-actions">
            <a className="primary-button" href="#parc">Découvrir le parc <ArrowRight size={15} /></a>
            <a className="text-link" href="#chantiers">Voir les chantiers <ArrowDownRight size={16} /></a>
          </div>
        </div>

        <div className="hero-footer">
          <div className="scroll-cue"><span className="scroll-line" /> Faire défiler pour explorer</div>
          <div className="hero-meta"><span>WEB · CONDUCTEUR · ATELIER</span><span>CARTE EN TEMPS RÉEL</span></div>
          <div className="side-number">01</div>
        </div>
      </section>

      <section className="fleet-section reveal-on-scroll" id="parc" aria-labelledby="fleet-title">
        <div className="fleet-section-heading">
          <div><p className="section-kicker"><span>02 / 10</span><span className="kicker-line" /><span>Le parc et son exploitation</span></p><h2 id="fleet-title">Une vision<br /><em>en profondeur.</em></h2></div>
          <p>Chaque véhicule porte sa fiche technique, ses compteurs, ses documents et ses photos. Autour de lui : missions, affectations, pleins, maintenances, incidents, documents à échéance et équipements de bord.</p>
        </div>
        <div className="fleet-stage">
          <div className={`fleet-track ${isDragging ? 'is-dragging' : ''} ${isWrapping ? 'is-wrapping' : ''}`} role="region" aria-label="Carousel des modules de flotte" tabIndex={0} onKeyDown={handleCarouselKeyDown} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} style={{ '--active-card': activeCard, '--drag-offset': `${dragOffset}px` } as CSSProperties}>
            {[...fleetCards, ...fleetCards, ...fleetCards].map((card, index) => {
              const offset = index - activeCard
              const normalizedOffset = offset > 3 ? offset - 6 : offset < -3 ? offset + 6 : offset
              return <button key={`${card.type}-${index}`} className={`fleet-card ${card.position} ${normalizedOffset === 0 ? 'is-active' : ''} ${normalizedOffset === -1 ? 'is-prev' : ''} ${normalizedOffset === 1 ? 'is-next' : ''} ${normalizedOffset === -2 ? 'is-far-prev' : ''} ${normalizedOffset === 2 ? 'is-far-next' : ''} ${Math.abs(normalizedOffset) > 2 ? 'is-hidden' : ''}`} style={{ '--card-image': `url(${card.image})`, '--drag-x': normalizedOffset === 0 ? `${dragOffset}px` : '0px' } as CSSProperties} onClick={() => { if (!dragMoved.current) setActiveCard(index) }} aria-label={`Voir ${card.title}`}>
                <span className="fleet-card-index">{String((index % fleetCards.length) + 1).padStart(2, '0')}</span><span className="fleet-card-type">{card.type}</span><strong>{card.title}</strong><small>{card.meta}</small><span className="fleet-card-arrow">↗</span>
              </button>
            })}
          </div>
          <div className="fleet-controls"><span className="carousel-loop-status" aria-live="polite"><i /> Défilement automatique</span><button onClick={() => goToCard(-1)} aria-label="Module précédent">←</button><span>Faire défiler pour explorer <b>{String((activeCard % fleetCards.length) + 1).padStart(2, '0')} / 06</b></span><button onClick={() => goToCard(1)} aria-label="Module suivant">→</button></div>
        </div>
      </section>

      <section className="intro-section reveal-on-scroll" id="plateforme">
        <div className="section-kicker"><span>03 / 10</span><span className="kicker-line" /><span>Une vision claire du terrain</span></div>
        <div className="intro-grid">
          <h2>La route avance.<br /><em>Votre vision aussi.</em></h2>
          <div className="intro-copy"><p>ParcAuto gère le parc roulant de bout en bout. Les engins de chantier se mesurent en heures moteur, les véhicules routiers en kilomètres : une distinction qui traverse tout le système, du calcul de consommation au coût d&apos;usage.</p><a className="dark-link" href="#chantiers">Voir les chantiers <ArrowRight size={16} /></a></div>
        </div>
        <div className="stats-row"><div><strong>19</strong><span>types de rapports</span></div><div><strong>9</strong><span>rôles aux droits définis</span></div><div><strong>3</strong><span>applications clientes</span></div></div>
      </section>

      <section className="explode-section" id="chantiers" ref={chantiersRef} aria-labelledby="chantiers-title">
        <div className="explode-sticky">
          <div className="explode-copy">
            <p className="section-kicker"><span>04 / 10</span><span className="kicker-line" /><span>Les chantiers</span></p>
            <h2 id="chantiers-title">Chaque engin,<br /><em>pièce par pièce.</em></h2>
            <p className="explode-lead">Un chantier réunit des véhicules et des conducteurs sur une période datée. Le suivi de terrain s&apos;appuie sur ce que le GPS sait déjà.</p>
            <ol className="explode-steps">{chantierSteps.map((step, i) => <li key={step.title} className={i === 0 ? 'is-active' : ''}><span>0{i + 1}</span><div><strong>{step.title}</strong><p>{step.text}</p></div></li>)}</ol>
          </div>
          <div className="explode-stage">
            <div className="explode-frame" aria-hidden="true"><i /><i /><i /><i /></div>
            <figure className="explode-machine">
              <img className="explode-shadow" src={explodeShadow.src} alt="" style={{ left: `${explodeShadow.box[0]}%`, top: `${explodeShadow.box[1]}%`, width: `${explodeShadow.box[2]}%`, height: `${explodeShadow.box[3]}%` }} />
              {explodePieces.map(({ id, box, move, start }) => (
                <div key={id} className={`explode-piece explode-piece-${id}`} data-start={start} style={{ left: `${box[0]}%`, top: `${box[1]}%`, width: `${box[2]}%`, height: `${box[3]}%`, '--dx': move[0], '--dy': move[1], '--r': move[2] } as CSSProperties}>
                  <img src={`/images/park-camion-${id}.webp`} alt="" draggable={false} />
                </div>
              ))}
              {/* Étiquettes dans un calque à part, au-dessus de toutes les pièces : elles suivent le même déplacement que leur pièce */}
              {explodePieces.map(({ id, name, data, box, move, label }) => (
                <span key={id} className={`explode-label is-${label[2]}`} data-side={label[2]} aria-hidden="true" style={{ left: `${box[0] + label[0] / 100 * box[2]}%`, top: `${box[1] + label[1] / 100 * box[3]}%`, '--dx': move[0], '--dy': move[1] } as CSSProperties}><i /><span><b>{name}</b>{data}</span></span>
              ))}
              <figcaption className="sr-only">Camion-benne en vue éclatée : {explodePieces.map((piece) => `${piece.name} (${piece.data})`).join(', ')}.</figcaption>
            </figure>
            <div className="explode-meta" aria-hidden="true"><span className="explode-counter">Pièces détachées <b>00</b> / 0{explodePieces.length}</span><span className="explode-progress"><i /></span><span>Vue éclatée · camion-benne</span></div>
          </div>
        </div>
      </section>

      <section className="tracking-section reveal-on-scroll" id="carte">
        <div className="fleet-section-heading">
          <div><p className="section-kicker"><span>05 / 10</span><span className="kicker-line" /><span>Suivi en temps réel</span></p><h2>Tout le parc,<br /><em>en direct sur la carte.</em></h2></div>
          <p>Les boîtiers GPS remontent la position de chaque véhicule et de chaque engin. La carte se met à jour d&apos;elle-même, et chacun n&apos;y voit que les véhicules qui le concernent.</p>
        </div>
        <LiveMap />
        <div className="tracking-features">{trackingFeatures.map((item) => <article key={item.title}><h3>{item.title}</h3><p>{item.text}</p></article>)}</div>
      </section>

      <section className="features-section reveal-on-scroll" id="pilotage">
        <div className="section-heading"><div><p className="eyebrow dark"><span className="eyebrow-line" /> 06 / 10 · Le pilotage</p><h2>Des chiffres,<br /><em>pas des impressions.</em></h2></div><p>La partie qui répond aux questions de direction. Dix-neuf types de rapports, exportables en PDF et en Excel, diffusés automatiquement par courriel sur abonnement.</p></div>
        <div className="feature-grid feature-grid-wide">{pilotage.map((feature) => <article className="feature-card" key={feature.number}><div className="feature-top"><span>{feature.number}</span><span className="feature-icon">{feature.icon}</span></div><h3>{feature.title}</h3><p>{feature.text}</p><a href="#contact" aria-label={`En savoir plus sur ${feature.title}`}><ArrowRight size={16} /></a></article>)}</div>
        <div className="report-strip"><strong>19</strong><span>types de rapports</span><span>PDF</span><span>Excel</span><span>Diffusion par courriel sur abonnement</span></div>
      </section>

      <section className="rules-section reveal-on-scroll" id="conformite">
        <div className="section-kicker"><span>07 / 10</span><span className="kicker-line" /><span>Conformité et échanges</span></div>
        <h2>Rien ne démarre<br /><em>hors des règles.</em></h2>
        <div className="rules-grid">
          <article>
            <p className="rules-label">La conformité</p>
            <p className="rules-lead">Une mission ne démarre pas si le véhicule n&apos;a pas ses documents valides ou si le conducteur n&apos;a pas la qualification correspondante : permis pour un véhicule routier, CACES pour un engin de chantier.</p>
            <ul>{conformite.map((item) => <li key={item}><Check size={14} strokeWidth={1.6} />{item}</li>)}</ul>
          </article>
          <article>
            <p className="rules-label">Les échanges</p>
            <p className="rules-lead">Une messagerie interne garde chaque échange attaché à l&apos;objet dont il parle.</p>
            <ul>{echanges.map((item) => <li key={item}><Check size={14} strokeWidth={1.6} />{item}</li>)}</ul>
            <div className="escalation" aria-label="Une alerte non traitée monte d'un niveau"><span>Alerte</span><i /><span>Niveau 2</span><i /><span>Niveau 3</span><i /><span>Vos outils</span></div>
          </article>
        </div>
      </section>

      <section className="mission-section reveal-on-scroll" id="missions">
        <div className="section-heading"><div><p className="eyebrow dark"><span className="eyebrow-line" /> 08 / 10 · Une mission, de bout en bout</p><h2>Déclarée au bureau,<br /><em>reçue sur le terrain.</em></h2></div><p>Le responsable de parc déclare la mission, les contrôles bloquants passent, le conducteur la reçoit sur son téléphone. Ensuite, tout le monde échange dans le fil de la mission.</p></div>
        <MissionDemo />
      </section>

      <section className="apps-section reveal-on-scroll" id="applications">
        <div className="apps-image" style={{ backgroundImage: `url(${appsImage})` }} aria-hidden="true"><span>Déclaration de plein et d&apos;incident depuis le terrain</span></div>
        <div className="apps-content">
          <p className="section-kicker"><span>09 / 10</span><span className="kicker-line" /><span>Les applications clientes</span></p>
          <h2>Trois applications,<br /><em>un seul parc.</em></h2>
          <div className="apps-list">{apps.map((app, i) => <article key={app.name}><span>0{i + 1}</span><div><h3>{app.name}</h3><small>{app.audience}</small></div><p>{app.text}</p></article>)}</div>
          <div className="apps-safeguards">{appSafeguards.map((item) => <div key={item.title}><strong>{item.title}</strong><p>{item.text}</p></div>)}</div>
        </div>
      </section>

      <section className="roles-section reveal-on-scroll" id="roles">
        <div className="section-heading"><div><p className="eyebrow dark"><span className="eyebrow-line" /> 10 / 10 · Qui voit quoi</p><h2>Neuf rôles,<br /><em>un seul arbitre.</em></h2></div><p>Chacun voit ce qui le concerne, rien de plus, y compris sur la carte et les écrans en temps réel.</p></div>
        <div className="roles-grid">{roles.map((role, i) => <div key={role.name}><span>{String(i + 1).padStart(2, '0')}</span><strong>{role.name}</strong><p>{role.scope}</p></div>)}</div>
      </section>

      <section className="platform-section reveal-on-scroll" id="apropos">
        <div className="platform-image" style={{ backgroundImage: `url(${dashboardImage})` }} aria-hidden="true" />
        <div className="platform-overlay" />
        <div className="platform-content"><p className="eyebrow"><span className="eyebrow-line" /> L&apos;intelligence en mouvement</p><h2>Vos opérations,<br /><em>en perspective.</em></h2><p>Du premier départ à la cession du véhicule, ParcAuto donne au conducteur, à l&apos;atelier et à la direction la bonne information au bon moment.</p><a className="primary-button" href="#contact">Demander une démo <ArrowRight size={15} /></a></div>
      </section>

      <footer className="site-footer reveal-on-scroll" id="contact"><div className="footer-brand"><span className="brand-mark dark-mark">P</span><span className="brand-name dark-brand">PARCAUTO<span>GESTION DE PARC</span></span></div><p>Le parc roulant, en mouvement.</p><a className="footer-link" href="mailto:bonjour@parkautomobile.fr">bonjour@parkautomobile.fr <ArrowRight size={14} /></a><span className="copyright">© 2026 ParcAuto</span></footer>
    </main>
  )
}

export { heroImage }

// Les images fournies montrent un parc d'engins de chantier dans une carrière; l'image de référence évoque une automobile premium dans un désert. La première image est utilisée ici comme fond de hero pour relier l'outil au terrain.
