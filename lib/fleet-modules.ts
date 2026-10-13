/**
 * Modules de l’application web (frontend2) — alignés sur routes/nav-config.ts et App.tsx.
 * Les chemins `path` correspondent aux routes React Router (sans domaine).
 */
export type FleetModuleGroupe =
  | 'pilotage'
  | 'parc'
  | 'exploitation'
  | 'atelier'
  | 'finances'
  | 'administration'

export type FleetModuleKind = 'menu' | 'detail'

export type FleetModule = {
  /** Chemin React Router ; `:idEngin` et `:idChantier` sont remplacés pour le lien (voir resolveFleetPath). */
  path: string
  label: string
  groupe: FleetModuleGroupe
  kind?: FleetModuleKind
  /** Petite description affichée sur la carte du carrousel */
  resume: string
  /** Précision au survol (carte active ou infobulle) */
  detail?: string
  /** Illustration (Unsplash ou assets locaux /images/…) */
  image: string
}

export const FLEET_GROUPE_LABEL: Record<FleetModuleGroupe, string> = {
  pilotage: 'Pilotage',
  parc: 'Parc',
  exploitation: 'Exploitation',
  atelier: 'Atelier',
  finances: 'Finances',
  administration: 'Administration',
}

const u = (id: string) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=70`

/** Identifiants de démo pour ouvrir les écrans avec paramètre (liste véhicules / chantiers). */
export function resolveFleetPath(path: string): string {
  const idEngin =
    process.env.NEXT_PUBLIC_DEMO_ID_ENGIN ??
    process.env.NEXT_PUBLIC_DEMO_ENGIN_ID ??
    '1'
  const idChantier =
    process.env.NEXT_PUBLIC_DEMO_ID_CHANTIER ??
    process.env.NEXT_PUBLIC_DEMO_CHANTIER_ID ??
    '1'
  return path.replace(':idEngin', idEngin).replace(':idChantier', idChantier)
}

/** URL de base de l’app web ParcAuto (Vite). Surchargeable via NEXT_PUBLIC_APP_URL. */
export function appModuleUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:5173').replace(/\/$/, '')
  const resolved = resolveFleetPath(path)
  if (resolved === '/') return base
  return `${base}${resolved.startsWith('/') ? resolved : `/${resolved}`}`
}

export const fleetModules: FleetModule[] = [
  {
    path: '/',
    label: 'Tableau de bord',
    groupe: 'pilotage',
    resume: 'Alertes, véhicules sensibles et chiffres du jour.',
    detail: 'Page d’accueil après connexion : synthèse opérationnelle du parc.',
    image: u('photo-1551288049-bebda4e38f71'),
  },
  {
    path: '/analytique',
    label: 'Analytique',
    groupe: 'pilotage',
    resume: 'Courbes et tendances sur l’activité du parc.',
    detail: 'Analyse dans le temps : consommation, usage et écarts.',
    image: u('photo-1460925895917-afdab827c52f'),
  },
  {
    path: '/performance',
    label: 'Performance',
    groupe: 'pilotage',
    resume: 'Utilisation réelle et coût au km ou à l’heure.',
    detail: 'KPI par type de véhicule et comparaison des seuils.',
    image: u('photo-1504384308090-c894fdcc538d'),
  },
  {
    path: '/couts',
    label: 'Coûts',
    groupe: 'pilotage',
    resume: 'TCO, budgets carburant et véhicules coûteux.',
    detail: 'Vision financière : rentabilité et postes de dépense.',
    image: u('photo-1579621970795-87facc2f976d'),
  },
  {
    path: '/fiabilite',
    label: 'Fiabilité et conformité',
    groupe: 'pilotage',
    resume: 'Pannes, immobilisations et dossiers sinistres.',
    detail: 'Suivi de la fiabilité et de la conformité réglementaire.',
    image: u('photo-1454165804606-c3d57bc86b40'),
  },
  {
    path: '/renouvellement',
    label: 'Renouvellement',
    groupe: 'pilotage',
    resume: 'Fin de vie, cessions et plan de remplacement.',
    detail: 'Anticipation des achats et sorties de parc chiffrées.',
    image: u('photo-1492144534655-ae79c964c9d7'),
  },
  {
    path: '/recommandations',
    label: 'Recommandations',
    groupe: 'pilotage',
    resume: 'Actions suggérées à partir des indicateurs.',
    detail: 'Propositions chiffrées issues des règles métier.',
    image: u('photo-1450101499163-c8848c66ca85'),
  },
  {
    path: '/rapports',
    label: 'Rapports',
    groupe: 'pilotage',
    resume: '19 rapports PDF ou Excel, diffusables par mail.',
    detail: 'Catalogue complet avec abonnements et exports.',
    image: u('photo-1543286386-713bdd548375'),
  },
  {
    path: '/messagerie',
    label: 'Messagerie',
    groupe: 'pilotage',
    resume: 'Fil de discussion rattaché au bon objet métier.',
    detail: 'Privé, équipe, véhicule, mission, chantier ou maintenance.',
    image: u('photo-1521737711867-e3b97375f902'),
  },
  {
    path: '/engins',
    label: 'Véhicules',
    groupe: 'parc',
    resume: 'Liste du parc : fiches, compteurs et photos.',
    detail: 'Heures moteur pour les engins, kilomètres pour le routier.',
    image: '/images/park-hero-4x4.png',
  },
  {
    path: '/engins/nouveau',
    label: 'Nouveau véhicule',
    groupe: 'parc',
    kind: 'detail',
    resume: 'Créer un engin ou un véhicule routier.',
    detail: 'Même écran que la fiche, en mode ajout.',
    image: u('photo-1493238798790-811952ad5478'),
  },
  {
    path: '/engins/:idEngin/fiche',
    label: 'Fiche véhicule',
    groupe: 'parc',
    kind: 'detail',
    resume: 'Technique, compteurs, documents et équipements.',
    detail: 'Édition complète de la fiche d’un véhicule existant.',
    image: '/images/park-hero-4x4.png',
  },
  {
    path: '/engins/:idEngin/rapport',
    label: 'Rapport véhicule',
    groupe: 'parc',
    kind: 'detail',
    resume: 'État synthétique vert, jaune ou rouge.',
    detail: 'Lecture seule : cartes thématiques par niveau d’alerte.',
    image: u('photo-1551836022-d5d88e9218df'),
  },
  {
    path: '/engins/:idEngin/historique',
    label: 'Historique véhicule',
    groupe: 'parc',
    kind: 'detail',
    resume: 'Chronologie détaillée par thème.',
    detail: 'Un onglet par carte du rapport, avec le détail des événements.',
    image: u('photo-1450101499163-c8848c66ca85'),
  },
  {
    path: '/types-engin',
    label: 'Types de véhicule',
    groupe: 'parc',
    resume: 'Référentiel : compteurs, docs exigés, seuils.',
    detail: 'Paramétrage par famille de matériel.',
    image: u('photo-1581092160562-40aa08e78837'),
  },
  {
    path: '/listes-fiche',
    label: 'Listes de la fiche',
    groupe: 'parc',
    resume: 'Listes et valeurs des champs fiche véhicule.',
    detail: 'Référentiels utilisés dans les formulaires du parc.',
    image: u('photo-1454165205744-gab046919fee'),
  },
  {
    path: '/documents',
    label: 'Documents',
    groupe: 'parc',
    resume: 'Assurance, visite technique, échéances.',
    detail: 'Pièces par véhicule avec surveillance des dates.',
    image: u('photo-1568667256549-094345857637'),
  },
  {
    path: '/conducteurs',
    label: 'Conducteurs',
    groupe: 'parc',
    resume: 'Permis, CACES et qualifications.',
    detail: 'Lien avec missions, affectations et score GPS.',
    image: u('photo-1529078155058-5d716f45d393'),
  },
  {
    path: '/zones',
    label: 'Zones géographiques',
    groupe: 'parc',
    resume: 'Périmètres carte : entrées, sorties, présence.',
    detail: 'Zones utilisées pour le calcul de présence sur chantier.',
    image: u('photo-1524661135-423995f22d0b'),
  },
  {
    path: '/missions',
    label: 'Missions',
    groupe: 'exploitation',
    resume: 'Départ contrôlé : docs, conducteur, suivi.',
    detail: 'Contrôles bloquants avant mise en route.',
    image: u('photo-1542282088-72c9c27ed0cd'),
  },
  {
    path: '/affectations',
    label: 'Affectations',
    groupe: 'exploitation',
    resume: 'Qui conduit quoi, et quand.',
    detail: 'Lien conducteur ↔ véhicule sur une période.',
    image: u('photo-1454165804606-c3d57bc86b40'),
  },
  {
    path: '/chantiers',
    label: 'Chantiers',
    groupe: 'exploitation',
    resume: 'Périodes, matériel prévu et présence GPS.',
    detail: 'Liste des chantiers actifs ou passés.',
    image: '/images/park-card-compacteur.webp',
  },
  {
    path: '/chantiers/nouveau',
    label: 'Nouveau chantier',
    groupe: 'exploitation',
    kind: 'detail',
    resume: 'Ouvrir un chantier et poser ses besoins.',
    detail: 'Dates, carte, besoins matériel et conducteurs.',
    image: u('photo-1504307651254-35680f356dfd'),
  },
  {
    path: '/chantiers/:idChantier/fiche',
    label: 'Fiche chantier',
    groupe: 'exploitation',
    kind: 'detail',
    resume: 'Carte, besoins, engins en glisser-déposer.',
    detail: 'Organisation du matériel sur le chantier.',
    image: u('photo-1541888946425-d81bb19240f5'),
  },
  {
    path: '/chantiers/:idChantier/plan',
    label: 'Plan chantier',
    groupe: 'exploitation',
    kind: 'detail',
    resume: 'Vue plan pour le suivi de terrain.',
    detail: 'Repères et organisation spatiale du chantier.',
    image: u('photo-1581094794329-c8112a89af12'),
  },
  {
    path: '/gps',
    label: 'GPS et trajets',
    groupe: 'exploitation',
    resume: 'Carte live, trajets et score de conduite.',
    detail: 'Positions boîtier et historique des déplacements.',
    image: '/images/park-hero-cinematic.png',
  },
  {
    path: '/carburant',
    label: 'Carburant',
    groupe: 'exploitation',
    resume: 'Pleins et écart réel / prévisionnel.',
    detail: 'Analyse de la cause probable de l’écart.',
    image: u('photo-1615906655593-ad0386982a0f'),
  },
  {
    path: '/incidents',
    label: 'Incidents',
    groupe: 'exploitation',
    resume: 'Déclarer et suivre un incident.',
    detail: 'Bureau ou terrain, lié au véhicule ou à la mission.',
    image: u('photo-1582719478250-c89cae4dc85b'),
  },
  {
    path: '/alertes',
    label: 'Alertes',
    groupe: 'exploitation',
    resume: 'Anomalies à traiter, avec escalade.',
    detail: 'Montée de niveau tant que l’alerte reste ouverte.',
    image: u('photo-1555949963-aa79dcee981c'),
  },
  {
    path: '/maintenance',
    label: 'Maintenance',
    groupe: 'atelier',
    resume: 'Échéancier, interventions, clôture qualité.',
    detail: 'Planification atelier et pièces consommées.',
    image: u('photo-1487754180451-c456f719a1fc'),
  },
  {
    path: '/garages-externes',
    label: 'Garages externes',
    groupe: 'atelier',
    resume: 'Partenaires atelier hors parc interne.',
    detail: 'Référentiel et suivi des passages externalisés.',
    image: u('photo-1486262715619-67b85e0b08d3'),
  },
  {
    path: '/fournisseurs',
    label: 'Fournisseurs',
    groupe: 'atelier',
    resume: 'Fournisseurs pièces et services.',
    detail: 'Contacts et historique pour l’entretien.',
    image: u('photo-1586528116311-ad8dd3c8310d'),
  },
  {
    path: '/locations-externes',
    label: 'Locations externes',
    groupe: 'finances',
    resume: 'Matériel loué à l’extérieur du parc.',
    detail: 'Contrats, durées et coûts associés.',
    image: u('photo-1449824913935-59a10b8d2000'),
  },
  {
    path: '/locations-entrantes',
    label: 'Locations entrantes',
    groupe: 'finances',
    resume: 'Véhicules du parc prêtés à un tiers.',
    detail: 'Suivi des mises à disposition clients ou partenaires.',
    image: u('photo-1449965408869-eaa3f722e42d'),
  },
  {
    path: '/prestataires-location',
    label: 'Prestataires de location',
    groupe: 'finances',
    resume: 'Loueurs et contacts location.',
    detail: 'Référentiel pour locations entrantes ou externes.',
    image: u('photo-1560518883-ce09059eeffa'),
  },
  {
    path: '/factures-proforma',
    label: 'Factures pro forma',
    groupe: 'finances',
    resume: 'Pro forma avant facturation définitive.',
    detail: 'Liées aux locations et prestations.',
    image: u('photo-1554224155-6726b3ff858f'),
  },
  {
    path: '/export-comptable',
    label: 'Export comptable',
    groupe: 'finances',
    resume: 'CSV vers la comptabilité.',
    detail: 'Factures, carburant et maintenance exportables.',
    image: u('photo-1554224154-26032fced132'),
  },
  {
    path: '/mise-en-service',
    label: 'Mise en service',
    groupe: 'administration',
    resume: 'Cinq étapes de démarrage du tenant.',
    detail: 'Check-list de paramétrage initial avec avancement.',
    image: u('photo-1522071820081-009f0129c71c'),
  },
  {
    path: '/utilisateurs',
    label: 'Utilisateurs',
    groupe: 'administration',
    resume: 'Comptes, rôles et droits.',
    detail: 'Neuf profils métier et administrateur.',
    image: u('photo-1522202176988-66273c2fd55f'),
  },
  {
    path: '/journal-audit',
    label: 'Journal d’audit',
    groupe: 'administration',
    resume: 'Trace des actions et connexions.',
    detail: 'Historique des opérations sensibles.',
    image: u('photo-1558494949-ef010cbdcc31'),
  },
  {
    path: '/suivi-logiciel',
    label: 'Suivi du logiciel',
    groupe: 'administration',
    resume: 'Adoption, qualité des données, connexions.',
    detail: 'Indicateurs d’usage de la plateforme.',
    image: u('photo-1516321318423-f06f85e504b3'),
  },
  {
    path: '/imports',
    label: 'Import Excel ou CSV',
    groupe: 'administration',
    resume: 'Charger des données en masse.',
    detail: 'Imports tableur vers le référentiel.',
    image: u('photo-1551288049-bebda4e38f71'),
  },
  {
    path: '/aide',
    label: 'Aide',
    groupe: 'administration',
    resume: 'Documentation et repères d’usage.',
    detail: 'Aide contextuelle de l’application web.',
    image: u('photo-1434030216411-0b793f4b4173'),
  },
  {
    path: '/parametres',
    label: 'Paramètres',
    groupe: 'administration',
    resume: 'Réglages généraux du tenant.',
    detail: 'Notifications, préférences et configuration.',
    image: u('photo-1517245386807-bb43f82c33c4'),
  },
  {
    path: '/connexion',
    label: 'Connexion',
    groupe: 'administration',
    kind: 'detail',
    resume: 'Authentification avant accès au parc.',
    detail: 'Écran de login, hors menu principal.',
    image: u('photo-1563986768609-322da13575f3'),
  },
  {
    path: '/acces-refuse',
    label: 'Accès refusé',
    groupe: 'administration',
    kind: 'detail',
    resume: 'Droit insuffisant pour cet écran.',
    detail: 'Affiché quand le rôle n’a pas accès à la route.',
    image: u('photo-1633265486064-086b219458ec'),
  },
]

export const FLEET_MODULE_COUNT = fleetModules.length
