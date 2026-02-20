import { useEffect, useState } from "react";

type Lang = "english" | "french";

const translations: Record<Lang, Record<string, string>> = {
  english: {
    getStarted: "Start searching",
    pleaseFillAll: "Please fill in all required fields",
    pleaseEnterName: "Please enter your name",
    roleMismatch: "This account is registered as {registered}. Please login as {registered}.",
    welcomeNew: "Welcome to HomeLink!",
    welcomeBack: "Welcome back!",
    authFailed: "Authentication failed",
    signUp: "Sign Up",
    login: "Login",
    createAccount: "Create your account to get started",
    loginToContinue: "Login to continue",
    fullName: "Full Name",
    namePlaceholder: "John Doe",
    email: "Email",
    emailPlaceholder: "your@email.com",
    password: "Password",
    passwordPlaceholder: "••••••••",
    phone: "Call Number",
    phonePlaceholder: "+1 (555) 000-0000",
    whatsapp: "WhatsApp Number",
    whatsappPlaceholder: "+1 (555) 000-0000",
    continueAs: "Continue as",
    tenant: "Tenant",
    landlord: "Landlord",
    pleaseWait: "Please wait...",
    continue: "Continue",
    alreadyHaveAccount: "Already have an account?",
    dontHaveAccount: "Don't have an account?",
  learnMore: "Learn More",
  home: "Home",
    myListings: "My Listings",
    addListing: "Add Listing",
    adminPanel: "Admin Panel",
    settings: "Settings",
    logout: "Logout",
    darkMode: "Dark Mode",
    language: "Language",
    appLanguage: "App Language",
    trusted: "Trusted by thousands of renters and landlords across the city",
    editProfile: "Edit Profile",
    loading: "Loading...",
  sendMessage: "Send Message",
    backToListings: "Back to listings",
    save: "Save",
    saved: "Saved",
    callLandlord: "Call Landlord",
    landlordContactUnavailable: "Landlord contact not available",
    removedFromSaved: "Removed from saved",
  emailAlreadyRegistered: "This email is already registered. Try logging in.",
    aboutProperty: "About this property",
    locationLabel: "Location",
    features: "Features",
    landlordLabel: "Landlord",
    propertyOwner: "Property Owner",
    bed: "Bed",
    bath: "Bath",
  },
  french: {
    getStarted: "Commencer la recherche",
    pleaseFillAll: "Veuillez remplir tous les champs requis",
    pleaseEnterName: "Veuillez entrer votre nom",
    roleMismatch: "Ce compte est enregistré en tant que {registered}. Veuillez vous connecter en tant que {registered}.",
    welcomeNew: "Bienvenue sur HomeLink!",
    welcomeBack: "Bon retour!",
    authFailed: "Échec de l'authentification",
    signUp: "S'inscrire",
    login: "Connexion",
    createAccount: "Créez votre compte pour commencer",
    loginToContinue: "Connectez-vous pour continuer",
    fullName: "Nom complet",
    namePlaceholder: "Jean Dupont",
    email: "E-mail",
    emailPlaceholder: "votre@email.com",
    password: "Mot de passe",
    passwordPlaceholder: "••••••••",
    phone: "Numéro de téléphone",
    phonePlaceholder: "+33 1 23 45 67 89",
    whatsapp: "Numéro WhatsApp",
    whatsappPlaceholder: "+33 1 23 45 67 89",
    continueAs: "Continuer en tant que",
    tenant: "Locataire",
    landlord: "Propriétaire",
    pleaseWait: "Veuillez patienter...",
    continue: "Continuer",
    alreadyHaveAccount: "Vous avez déjà un compte?",
    dontHaveAccount: "Vous n'avez pas de compte?",
  learnMore: "En savoir plus",
  home: "Accueil",
    myListings: "Mes annonces",
    addListing: "Ajouter une annonce",
    adminPanel: "Panneau d'administration",
    settings: "Paramètres",
    logout: "Se déconnecter",
    darkMode: "Mode sombre",
    language: "Langue",
    appLanguage: "Langue de l'application",
    trusted: "Approuvé par des milliers de locataires et propriétaires dans la ville",
    editProfile: "Modifier le profil",
    loading: "Chargement...",
  sendMessage: "Envoyer un message",
    backToListings: "Retour aux annonces",
    save: "Enregistrer",
    saved: "Enregistré",
    callLandlord: "Appeler le propriétaire",
    landlordContactUnavailable: "Contact du propriétaire non disponible",
    removedFromSaved: "Retiré des favoris",
  emailAlreadyRegistered: "Cet e-mail est déjà enregistré. Essayez de vous connecter.",
    aboutProperty: "À propos de cette propriété",
    locationLabel: "Emplacement",
    features: "Caractéristiques",
    landlordLabel: "Propriétaire",
    propertyOwner: "Propriétaire de la propriété",
    bed: "Chambre",
    bath: "Salle de bain",
  },
};

let current: Lang = (localStorage.getItem("homelink-language") as Lang) || "english";

export function t(key: string) {
  return translations[current]?.[key] ?? translations.english[key] ?? key;
}

export function setLanguage(lang: Lang) {
  current = lang;
  localStorage.setItem("homelink-language", lang);
  // simple event so components can reactively update if they listen
  window.dispatchEvent(new CustomEvent("homelink-language-changed", { detail: lang }));
}

export function getLanguage() {
  return current;
}

// React hook to get reactive translations inside components
export function useTranslation() {
  const [lang, setLang] = useState<Lang>(current);

  useEffect(() => {
    const handler = (e: any) => setLang(e.detail || e);
    window.addEventListener("homelink-language-changed", handler as EventListener);
    return () => window.removeEventListener("homelink-language-changed", handler as EventListener);
  }, []);

  const localT = (key: string) => (translations as Record<string, Record<string, string>>)[lang as string]?.[key] ?? translations.english[key] ?? key;
  return { t: localT, lang, setLanguage };
}

export type { Lang };
