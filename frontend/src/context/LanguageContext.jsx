import { createContext, useContext, useEffect, useMemo, useState } from 'react';

const LanguageContext = createContext(null);

export const LANGUAGES = {
  en: { label: 'English', code: 'en' },
  rw: { label: 'Kinyarwanda', code: 'rw' },
  fr: { label: 'Français', code: 'fr' },
  sw: { label: 'Kiswahili', code: 'sw' },
};

const translations = {
  en: {
    language: 'Language', report: 'Report', myIncidents: 'My incidents', incidents: 'Incidents',
    myAssignments: 'My assignments', admin: 'Admin', notifications: 'Notifications',
    markAllRead: 'Mark all read', noNotifications: 'No notifications yet.', logout: 'Logout',
    login: 'Login', register: 'Register', pageNotFound: 'Page not found',
    welcome: 'Welcome', loggedInAs: 'You are logged in as', manageIncidents: 'Manage incidents',
    openAdmin: 'Open admin panel', reportEmergency: 'Report an emergency',
    checkingServer: 'Checking the server...', serverConnected: 'Frontend is connected to the backend',
    cannotReachServer: 'Cannot reach the backend. Is it running on',
    email: 'Email', password: 'Password', hide: 'Hide', show: 'Show',
    pleaseWait: 'Please wait...', cannotReach: 'Cannot reach the server',
    newCitizen: 'New citizen?', createAccount: 'Create an account',
    createCitizenAccount: 'Create a citizen account', fullName: 'Full name', phone: 'Phone',
    address: 'Address', confirmPassword: 'Confirm password', passwordsDoNotMatch: 'Passwords do not match',
    haveAccount: 'Already have an account?', emergencyType: 'Type of emergency',
    location: 'Location (village, street, landmark)', useGps: 'Use my GPS location',
    gpsUnsupported: 'Your browser does not support GPS', gettingLocation: 'Getting your location...',
    gpsCaptured: 'GPS location captured', gpsFailed: 'Could not get your location. Please type it below.',
    describe: 'Describe what is happening', sendReport: 'Send emergency report', sending: 'Sending...',
    loading: 'Loading...', locationLabel: 'Location', description: 'Description',
    reported: 'Reported', responder: 'Responder', hideHistory: 'Hide history', showHistory: 'Show history',
    noIncidents: 'You have not reported any emergency yet.',
    fire: 'Fire', medical: 'Medical', accident: 'Accident', crime: 'Crime',
    naturalDisaster: 'Natural Disaster', other: 'Other',
    reportedStatus: 'Reported', verifiedStatus: 'Verified', rejectedStatus: 'Rejected',
    assignedStatus: 'Assigned', inProgressStatus: 'In Progress', pendingStatus: 'Pending',
    completedStatus: 'Completed', closedStatus: 'Closed',
  },
  rw: {
    language: 'Ururimi', report: 'Tanga ikibazo', myIncidents: 'Ibyo natangaje', incidents: 'Ibigumbye',
    myAssignments: 'Ibyo nshinzwe', admin: 'Umuyobozi', notifications: 'Imenyesha',
    markAllRead: 'Byose bisomwe', noNotifications: 'Nta menyesha urasoma.', logout: 'Sohoka',
    login: 'Injira', register: 'Iyandikishe', pageNotFound: 'Urubuga ntiruboneka',
    welcome: 'Murakaza neza', loggedInAs: 'Winjiye nka', manageIncidents: 'Cunga ibibazo',
    openAdmin: 'Fungura ubuyobozi', reportEmergency: 'Tanga ibyihutirwa',
    checkingServer: 'Tugenzureje seriveri...', serverConnected: 'Porogaramu ihujwe na seriveri',
    cannotReachServer: 'Ntushobora kugera kuri seriveri. Ese irakora kuri',
    email: 'Imeri', password: 'Ijambobanga', hide: 'Hisha', show: 'Erekana',
    pleaseWait: 'Tegereza...', cannotReach: 'Ntushobora kugera kuri seriveri',
    newCitizen: 'Uri umuturage mushya?', createAccount: 'Fungura konti',
    createCitizenAccount: 'Fungura konti y’umuturage', fullName: 'Amazina yose', phone: 'Telefoni',
    address: 'Aderesi', confirmPassword: 'Emeza ijambobanga', passwordsDoNotMatch: 'Amagambo banga ntahura',
    haveAccount: 'Ufite konti?', emergencyType: 'Ubwoko bw’ihungabana',
    location: 'Ahantu (umudugudu, umuhanda, ikimenyetso)', useGps: 'Koresha GPS y’icyo gikoresho',
    gpsUnsupported: 'Mucukuzanyi yawe ntishyigikira GPS', gettingLocation: 'Turashakisha aho uri...',
    gpsCaptured: 'Aho uri bwafashwe na GPS', gpsFailed: 'Ntushoboye kubona aho uri. Andika ahantu hepfo.',
    describe: 'Sobanura ibibera', sendReport: 'Ohereza raporo y’ihungabana', sending: 'Birimo koherezwa...',
    loading: 'Birimo gutangwa...', locationLabel: 'Ahantu', description: 'Ibisobanuro',
    reported: 'Byatanzwe', responder: 'Umufasha', hideHistory: 'Hisha amateka', showHistory: 'Erekana amateka',
    noIncidents: 'Nta ihungabana watanze.',
    fire: 'Umuriro', medical: 'Ubuvuzi', accident: 'Impanuka', crime: 'Ubujura/Ubuteme',
    naturalDisaster: 'Icatikiriya/cy’amafu', other: 'Ibindi',
    reportedStatus: 'Byatanzwe', verifiedStatus: 'Byemejwe', rejectedStatus: 'Byanze',
    assignedStatus: 'Byahawe umufasha', inProgressStatus: 'Biracyakorwa', pendingStatus: 'Bitegereje',
    completedStatus: 'Byarangiye', closedStatus: 'Byafunzwe',
  },
  fr: {
    language: 'Langue', report: 'Signaler', myIncidents: 'Mes incidents', incidents: 'Incidents',
    myAssignments: 'Mes missions', admin: 'Administration', notifications: 'Notifications',
    markAllRead: 'Tout marquer comme lu', noNotifications: 'Aucune notification.', logout: 'Déconnexion',
    login: 'Connexion', register: 'Inscription', pageNotFound: 'Page introuvable',
    welcome: 'Bienvenue', loggedInAs: 'Vous êtes connecté en tant que', manageIncidents: 'Gérer les incidents',
    openAdmin: 'Ouvrir l’administration', reportEmergency: 'Signaler une urgence',
    checkingServer: 'Vérification du serveur...', serverConnected: 'Le frontend est connecté au backend',
    cannotReachServer: 'Impossible de joindre le backend. Est-il lancé sur',
    email: 'Adresse e-mail', password: 'Mot de passe', hide: 'Masquer', show: 'Afficher',
    pleaseWait: 'Veuillez patienter...', cannotReach: 'Impossible de joindre le serveur',
    newCitizen: 'Nouveau citoyen ?', createAccount: 'Créer un compte',
    createCitizenAccount: 'Créer un compte citoyen', fullName: 'Nom complet', phone: 'Téléphone',
    address: 'Adresse', confirmPassword: 'Confirmer le mot de passe', passwordsDoNotMatch: 'Les mots de passe ne correspondent pas',
    haveAccount: 'Vous avez déjà un compte ?', emergencyType: 'Type d’urgence',
    location: 'Lieu (village, rue, repère)', useGps: 'Utiliser ma position GPS',
    gpsUnsupported: 'Votre navigateur ne prend pas en charge le GPS', gettingLocation: 'Recherche de votre position...',
    gpsCaptured: 'Position GPS obtenue', gpsFailed: 'Position indisponible. Veuillez la saisir ci-dessous.',
    describe: 'Décrivez ce qui se passe', sendReport: 'Envoyer le signalement', sending: 'Envoi...',
    loading: 'Chargement...', locationLabel: 'Lieu', description: 'Description',
    reported: 'Signalé', responder: 'Intervenant', hideHistory: 'Masquer l’historique', showHistory: 'Afficher l’historique',
    noIncidents: 'Vous n’avez signalé aucune urgence.',
    fire: 'Incendie', medical: 'Médical', accident: 'Accident', crime: 'Crime',
    naturalDisaster: 'Catastrophe naturelle', other: 'Autre',
    reportedStatus: 'Signalé', verifiedStatus: 'Vérifié', rejectedStatus: 'Rejeté',
    assignedStatus: 'Assigné', inProgressStatus: 'En cours', pendingStatus: 'En attente',
    completedStatus: 'Terminé', closedStatus: 'Clos',
  },
  sw: {
    language: 'Lugha', report: 'Ripoti', myIncidents: 'Matukio yangu', incidents: 'Matukio',
    myAssignments: 'Nahitaji zangu', admin: 'Usimamizi', notifications: 'Arifa',
    markAllRead: 'Weka zote zimesomwa', noNotifications: 'Hakuna arifa bado.', logout: 'Ondoka',
    login: 'Ingia', register: 'Jisajili', pageNotFound: 'Ukumbi haupatikani',
    welcome: 'Karibu', loggedInAs: 'Umeingia kama', manageIncidents: 'Simamia matukio',
    openAdmin: 'Fungua usimamizi', reportEmergency: 'Ripoti dharura',
    checkingServer: 'Inakagua seva...', serverConnected: 'Frontendi imeunganishwa na backend',
    cannotReachServer: 'Seva haipatikani. Je, inaendesha kwenye',
    email: 'Barua pepe', password: 'Nenosiri', hide: 'Ficha', show: 'Onyesha',
    pleaseWait: 'Subiri...', cannotReach: 'Seva haipatikani',
    newCitizen: 'Raia mpya?', createAccount: 'Fungua akaunti',
    createCitizenAccount: 'Fungua akaunti ya raia', fullName: 'Jina kamili', phone: 'Simu',
    address: 'Anwani', confirmPassword: 'Thibitisha nenosiri', passwordsDoNotMatch: 'Nenosiri halilingani',
    haveAccount: 'Tayari una akaunti?', emergencyType: 'Aina ya dharura',
    location: 'Mahali (kijiji, barabara, alama)', useGps: 'Tumia GPS',
    gpsUnsupported: 'Kivinjari chako hakitumii GPS', gettingLocation: 'Inatafuta mahali pako...',
    gpsCaptured: 'Mahali pamepatikana kwa GPS', gpsFailed: 'Mahali hapakupatikana. Tafadhali liandike hapa chini.',
    describe: 'Eleza kinachoendelea', sendReport: 'Tuma ripoti ya dharura', sending: 'Inatuma...',
    loading: 'Inapakia...', locationLabel: 'Mahali', description: 'Maelezo',
    reported: 'Imeripotiwa', responder: 'Msaidizi', hideHistory: 'Ficha historia', showHistory: 'Onyesha historia',
    noIncidents: 'Bado hujaripoti dharura.',
    fire: 'Moto', medical: 'Huduma ya afya', accident: 'Ajali', crime: 'Uhalifu',
    naturalDisaster: 'Maafa ya asili', other: 'Nyingine',
    reportedStatus: 'Imeripotiwa', verifiedStatus: 'Imethibitishwa', rejectedStatus: 'Imekataliwa',
    assignedStatus: 'Imewezwa', inProgressStatus: 'Inaendelea', pendingStatus: 'Inasubiri',
    completedStatus: 'Imekamilika', closedStatus: 'Imefungwa',
  },
};

export function LanguageProvider({ children }) {
  const [language, setLanguageState] = useState(() =>
    localStorage.getItem('rercs-language') || 'en'
  );

  useEffect(() => {
    document.documentElement.lang = language;
    localStorage.setItem('rercs-language', language);
  }, [language]);

  const setLanguage = (nextLanguage) => {
    if (LANGUAGES[nextLanguage]) setLanguageState(nextLanguage);
  };

  const value = useMemo(() => ({
    language,
    setLanguage,
    t: (key) => translations[language]?.[key] || translations.en[key] || key,
  }), [language]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider');
  return context;
}
