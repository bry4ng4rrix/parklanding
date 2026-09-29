'use client'

import { useEffect, useRef, useState, type CSSProperties, type PointerEvent, type KeyboardEvent } from 'react'
import { ArrowDownRight, ArrowRight, Check, Menu, X } from 'lucide-react'

const heroImage = '/images/park-hero-4x4.png'
// heroImage découpé en calques : la route seule, le 4x4 détouré (avec son ombre) et ses jantes remises à plat pour pouvoir tourner
const heroScene = { road: '/images/park-hero-4x4-road.jpg', car: '/images/park-hero-4x4-car.png', frontRim: '/images/park-hero-4x4-rim-front.png', rearRim: '/images/park-hero-4x4-rim-rear.png' }

const features = [
  { number: '01', title: 'Suivi en temps réel', text: 'Visualisez chaque engin, son itinéraire et son statut depuis une seule interface.', icon: '◎' },
  { number: '02', title: 'Missions maîtrisées', text: 'Planifiez, assignez et suivez vos opérations sur le terrain sans friction.', icon: '↗' },
  { number: '03', title: 'Données de flotte', text: 'Carburant, entretien, kilométrage : chaque détail reste sous contrôle.', icon: '◌' },
]

const fleetCards = [
  { type: 'Engins lourds', title: 'Puissance suivie', meta: '12 engins actifs', position: 'fleet-card-one', image: 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=900&q=70' },
  { type: 'Véhicules terrain', title: 'Chaque trajet compte', meta: '08 itinéraires en cours', position: 'fleet-card-two', image: 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=900&q=70' },
  { type: 'Missions', title: 'Opérations fluides', meta: '24 missions aujourd’hui', position: 'fleet-card-three', image: 'https://images.unsplash.com/photo-1542282088-72c9c27ed0cd?auto=format&fit=crop&w=900&q=70' },
  { type: 'Carburant', title: 'Consommation maîtrisée', meta: '92% de précision', position: 'fleet-card-four', image: 'https://images.unsplash.com/photo-1615906655593-ad0386982a0f?auto=format&fit=crop&w=900&q=70' },
  { type: 'Maintenance', title: 'Toujours prêts', meta: '03 alertes préventives', position: 'fleet-card-five', image: 'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=900&q=70' },
  { type: 'GPS', title: 'Une vision globale', meta: '100% des actifs localisés', position: 'fleet-card-six', image: 'https://images.unsplash.com/photo-1525609004556-c46c7dcf0f5b?auto=format&fit=crop&w=900&q=70' },
]

const dashboardImage = 'https://images.unsplash.com/photo-1517048676732-d65bc937f952?auto=format&fit=crop&w=1200&q=85'

export default function Page() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeCard, setActiveCard] = useState(6)
  const [isWrapping, setIsWrapping] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState(0)
  const dragStart = useRef(0)
  const dragMoved = useRef(false)
  const heroRef = useRef<HTMLElement>(null)

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

  // Le 4x4 roule vers la gauche à mesure que le hero défile : --drive (0 → 1) pilote la position et la rotation des roues, --dust la poussière selon la vitesse
  useEffect(() => {
    const hero = heroRef.current
    if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    let frame = 0, current = 0, target = 0
    const tick = () => {
      const delta = target - current
      current = Math.abs(delta) < 0.0005 ? target : current + delta * 0.12
      hero.style.setProperty('--drive', current.toFixed(4))
      hero.style.setProperty('--dust', current === target ? '0' : Math.min(1, Math.abs(delta) * 12).toFixed(3))
      frame = current === target ? 0 : window.requestAnimationFrame(tick)
    }
    const handleScroll = () => { target = Math.min(1, Math.max(0, window.scrollY / (hero.offsetHeight * 0.8))); if (!frame) frame = window.requestAnimationFrame(tick) }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleScroll)
    return () => { window.cancelAnimationFrame(frame); window.removeEventListener('scroll', handleScroll); window.removeEventListener('resize', handleScroll) }
  }, [])

  return (
    <main className="park-page">
      <section className="hero" id="accueil" ref={heroRef}>
        <div className="hero-image" aria-hidden="true">
          <div className="hero-scene" style={{ backgroundImage: `url(${heroScene.road})` }}>
            <div className="hero-car" style={{ backgroundImage: `url(${heroScene.car})` }}>
              <span className="hero-dust" />
              <span className="hero-rim hero-rim-front" style={{ backgroundImage: `url(${heroScene.frontRim})` }} />
              <span className="hero-rim hero-rim-rear" style={{ backgroundImage: `url(${heroScene.rearRim})` }} />
            </div>
          </div>
        </div>
        <div className="hero-shade" aria-hidden="true" />
        <div className="grain" aria-hidden="true" />

        <header className="site-header">
          <a className="brand" href="#accueil" aria-label="Park Automobile accueil">
            <span className="brand-mark">P</span>
            <span className="brand-name">PARK<span>AUTOMOBILE</span></span>
          </a>
          <nav className="desktop-nav" aria-label="Navigation principale">
            <a href="#plateforme">Plateforme</a>
            <a href="#fonctionnalites">Fonctionnalités</a>
            <a href="#apropos">À propos</a>
          </nav>
          <a className="header-cta" href="#contact">Demander une démo <ArrowRight size={14} /></a>
          <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Fermer le menu' : 'Ouvrir le menu'} aria-expanded={menuOpen}>
            {menuOpen ? <X size={18} strokeWidth={1.5} /> : <Menu size={19} strokeWidth={1.5} />}
          </button>
        </header>

        {menuOpen && <nav className="mobile-menu" aria-label="Navigation mobile">
          <a href="#plateforme" onClick={() => setMenuOpen(false)}>Plateforme <ArrowRight size={14} /></a>
          <a href="#fonctionnalites" onClick={() => setMenuOpen(false)}>Fonctionnalités <ArrowRight size={14} /></a>
          <a href="#apropos" onClick={() => setMenuOpen(false)}>À propos <ArrowRight size={14} /></a>
          <a href="#contact" onClick={() => setMenuOpen(false)}>Demander une démo <ArrowRight size={14} /></a>
        </nav>}

        <div className="hero-annotations" aria-label="Données en direct">
          <span className="annotation annotation-left"><b>4X4</b><i /> Prêt pour le terrain</span>
          <span className="annotation annotation-right"><b>LIVE</b><i /> Position synchronisée</span>
          <span className="annotation annotation-bottom-left"><b>24/7</b><i /> Pilotage continu</span>
          <span className="annotation annotation-bottom-right"><b>98%</b><i /> Visibilité opérationnelle</span>
        </div>

        <div className="hero-content">
          <p className="eyebrow"><span className="eyebrow-line" /> 01 / 03 <span className="eyebrow-label">Le pilotage, autrement</span></p>
          <h1>Votre flotte.<br /><em>en mouvement.</em></h1>
          <p className="hero-copy">Un espace unique pour suivre vos véhicules, coordonner vos équipes et garder chaque opération sous contrôle.</p>
          <div className="hero-actions">
            <a className="primary-button" href="#parc">Découvrir la flotte <ArrowRight size={15} /></a>
            <a className="text-link" href="#plateforme">Voir la plateforme <ArrowDownRight size={16} /></a>
          </div>
        </div>

        <div className="hero-footer">
          <div className="scroll-cue"><span className="scroll-line" /> Faire défiler pour explorer</div>
          <div className="hero-meta"><span>OS DE PILOTAGE · 2025</span><span>FR · EN · 24/7</span></div>
          <div className="side-number">01</div>
        </div>
      </section>

      <section className="fleet-section reveal-on-scroll" id="parc" aria-labelledby="fleet-title">
        <div className="fleet-section-heading">
          <div><p className="section-kicker"><span>02 / 06</span><span className="kicker-line" /><span>Le parc en mouvement</span></p><h2 id="fleet-title">Une vision<br /><em>en profondeur.</em></h2></div>
          <p>Faites défiler les modules pour explorer chaque dimension de votre flotte, du terrain jusqu&apos;à la donnée.</p>
        </div>
        <div className="fleet-stage">
          <div className={`fleet-track ${isDragging ? 'is-dragging' : ''} ${isWrapping ? 'is-wrapping' : ''}`} role="region" aria-label="Carousel des modules de flotte" tabIndex={0} onKeyDown={handleCarouselKeyDown} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} style={{ '--active-card': activeCard, '--drag-offset': `${dragOffset}px` } as CSSProperties}>
            {[...fleetCards, ...fleetCards, ...fleetCards].map((card, index) => {
              const offset = index - activeCard
              const normalizedOffset = offset > 3 ? offset - 6 : offset < -3 ? offset + 6 : offset
              return <button key={`${card.type}-${index}`} className={`fleet-card ${card.position} ${normalizedOffset === 0 ? 'is-active' : ''} ${normalizedOffset === -1 ? 'is-prev' : ''} ${normalizedOffset === 1 ? 'is-next' : ''} ${normalizedOffset === -2 ? 'is-far-prev' : ''} ${normalizedOffset === 2 ? 'is-far-next' : ''} ${Math.abs(normalizedOffset) > 2 ? 'is-hidden' : ''}`} style={{ '--card-image': `url(${card.image})`, '--drag-x': normalizedOffset === 0 ? `${dragOffset}px` : '0px' } as CSSProperties} onClick={() => { if (!dragMoved.current) setActiveCard(index) }} aria-label={`Voir ${card.title}`}>
                <span className="fleet-card-index">0{index + 1}</span><span className="fleet-card-type">{card.type}</span><strong>{card.title}</strong><small>{card.meta}</small><span className="fleet-card-arrow">↗</span>
              </button>
            })}
          </div>
          <div className="fleet-controls"><span className="carousel-loop-status" aria-live="polite"><i /> Défilement automatique</span><button onClick={() => goToCard(-1)} aria-label="Module précédent">←</button><span>Faire défiler pour explorer <b>{String((activeCard % fleetCards.length) + 1).padStart(2, '0')} / 06</b></span><button onClick={() => goToCard(1)} aria-label="Module suivant">→</button></div>
        </div>
      </section>

      <section className="intro-section reveal-on-scroll" id="plateforme">
        <div className="section-kicker"><span>02 / 03</span><span className="kicker-line" /><span>Une vision claire du terrain</span></div>
        <div className="intro-grid">
          <h2>La route avance.<br /><em>Votre vision aussi.</em></h2>
          <div className="intro-copy"><p>Park Automobile transforme les données de vos véhicules en décisions simples. Une plateforme pensée pour les entreprises qui ne peuvent pas se permettre de perdre le fil.</p><a className="dark-link" href="#fonctionnalites">Explorer la plateforme <ArrowRight size={16} /></a></div>
        </div>
        <div className="stats-row"><div><strong>360°</strong><span>visibilité opérationnelle</span></div><div><strong>24/7</strong><span>suivi de vos équipements</span></div><div><strong>1</strong><span>espace pour toute la flotte</span></div></div>
      </section>

      <section className="features-section reveal-on-scroll" id="fonctionnalites">
        <div className="section-heading"><div><p className="eyebrow dark"><span className="eyebrow-line" /> 03 / 03</p><h2>Tout ce qui<br /><em>fait avancer.</em></h2></div><p>Des outils essentiels, réunis dans une expérience fluide pour garder une longueur d&apos;avance sur chaque opération.</p></div>
        <div className="feature-grid">{features.map((feature) => <article className="feature-card" key={feature.number}><div className="feature-top"><span>{feature.number}</span><span className="feature-icon">{feature.icon}</span></div><h3>{feature.title}</h3><p>{feature.text}</p><a href="#contact" aria-label={`En savoir plus sur ${feature.title}`}><ArrowRight size={16} /></a></article>)}</div>
      </section>

      <section className="platform-section reveal-on-scroll" id="apropos">
        <div className="platform-image" style={{ backgroundImage: `url(${dashboardImage})` }} aria-hidden="true" />
        <div className="platform-overlay" />
        <div className="platform-content"><p className="eyebrow"><span className="eyebrow-line" /> L&apos;intelligence en mouvement</p><h2>Vos opérations,<br /><em>en perspective.</em></h2><p>Du premier départ au dernier kilomètre, Park vous donne les bonnes informations au bon moment.</p><a className="primary-button" href="#contact">Parler à un expert <ArrowRight size={15} /></a></div>
      </section>

      <footer className="site-footer reveal-on-scroll" id="contact"><div className="footer-brand"><span className="brand-mark dark-mark">P</span><span className="brand-name dark-brand">PARK<span>AUTOMOBILE</span></span></div><p>Le parc automobile, en mouvement.</p><a className="footer-link" href="mailto:bonjour@parkautomobile.fr">bonjour@parkautomobile.fr <ArrowRight size={14} /></a><span className="copyright">© 2024 Park Automobile</span></footer>
    </main>
  )
}

export { heroImage }

// Les images fournies montrent un parc d'engins de chantier dans une carrière; l'image de référence évoque une automobile premium dans un désert. La première image est utilisée ici comme fond de hero pour relier l'outil au terrain.
