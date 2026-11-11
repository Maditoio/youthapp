export class AppError extends Error {
  constructor(public code: string) {
    super(code);
    this.name = "AppError";
  }
}

export function assert(condition: unknown, code: string): asserts condition {
  if (!condition) throw new AppError(code);
}

export const errorCopy: Record<string, { fr: string; en: string }> = {
  INVALID_CREDENTIALS: {
    fr: "E-mail ou mot de passe incorrect.",
    en: "Incorrect email or password.",
  },
  RATE_LIMITED: {
    fr: "Trop de tentatives. Réessayez dans quelques minutes.",
    en: "Too many attempts. Try again in a few minutes.",
  },
  EMAIL_TAKEN: {
    fr: "Un compte existe déjà avec cet e-mail.",
    en: "An account already exists with this email.",
  },
  WEAK_PASSWORD: {
    fr: "Le mot de passe doit contenir au moins 10 caractères.",
    en: "Password must be at least 10 characters.",
  },
  INVALID_PHONE: {
    fr: "Indiquez un numéro au format international, par exemple +243812345678.",
    en: "Enter a phone number in international format, for example +243812345678.",
  },
  INVALID_EMAIL: {
    fr: "Adresse e-mail invalide.",
    en: "Invalid email address.",
  },
  TERMS_REQUIRED: {
    fr: "Acceptez les conditions et la notice de confidentialité.",
    en: "Accept the terms and privacy notice.",
  },
  INVALID_CODE: {
    fr: "Code incorrect ou expiré.",
    en: "Incorrect or expired code.",
  },
  MFA_REQUIRED: {
    fr: "La vérification en deux étapes est requise.",
    en: "Two-step verification is required.",
  },
  STEP_UP_FAILED: {
    fr: "Confirmation du mot de passe refusée.",
    en: "Password confirmation failed.",
  },
  EMAIL_UNVERIFIED: {
    fr: "Vérifiez votre e-mail avant de souscrire.",
    en: "Verify your email before subscribing.",
  },
  PROFILE_INCOMPLETE: {
    fr: "Le pays de résidence, l'e-mail et le téléphone sont requis avant d'investir.",
    en: "Country of residence, email and phone are required before investing.",
  },
  DATE_OF_BIRTH_REQUIRED: {
    fr: "La date de naissance est requise. Seules les personnes de 18 à 35 ans peuvent rejoindre et acheter des actions.",
    en: "Date of birth is required. Only people aged 18 to 35 can join and buy shares.",
  },
  DATE_OF_BIRTH_INVALID: {
    fr: "Indiquez une date de naissance réelle.",
    en: "Enter a real date of birth.",
  },
  AGE_TOO_YOUNG: {
    fr: "Il faut avoir au moins 18 ans pour rejoindre et acheter des actions.",
    en: "You must be at least 18 to join and buy shares.",
  },
  AGE_TOO_OLD: {
    fr: "L'achat d'actions est ouvert de 18 ans jusqu'à 35 ans inclus.",
    en: "Buying shares is open from age 18 through age 35.",
  },
  KYC_REQUIRED: {
    fr: "La vérification d'identité doit être approuvée avant d'investir.",
    en: "Identity verification must be approved before investing.",
  },
  OFFERING_UNAVAILABLE: {
    fr: "Cette offre n'accepte pas de souscriptions.",
    en: "This offering is not accepting subscriptions.",
  },
  JURISDICTION_BLOCKED: {
    fr: "Votre pays de résidence n'est pas éligible à cette offre de démonstration.",
    en: "Your country of residence is not eligible for this demo offering.",
  },
  AMOUNT_INVALID: {
    fr: "Montant invalide.",
    en: "Invalid amount.",
  },
  AMOUNT_BELOW_MIN: {
    fr: "Le montant est inférieur au minimum de souscription.",
    en: "Amount is below the minimum subscription.",
  },
  AMOUNT_ABOVE_MAX: {
    fr: "Le montant dépasse le maximum autorisé.",
    en: "Amount exceeds the maximum allowed.",
  },
  NOT_WHOLE_SHARES: {
    fr: "Le montant doit être un multiple exact du prix d'émission. Le reste n'est pas écarté.",
    en: "Amount must be an exact multiple of the issue price. A remainder is not discarded.",
  },
  SHARE_LIMIT: {
    fr: "La quantité dépasse les actions encore disponibles ou votre plafond.",
    en: "Quantity exceeds shares still available or your cap.",
  },
  DOCUMENTS_REQUIRED: {
    fr: "Consultez et acceptez chaque document de l'offre.",
    en: "Review and accept every offering document.",
  },
  RISK_ACK_REQUIRED: {
    fr: "Confirmez les avertissements de risque.",
    en: "Confirm the risk warnings.",
  },
  NOT_FOUND: { fr: "Élément introuvable.", en: "Item not found." },
  FORBIDDEN: { fr: "Action non autorisée.", en: "You cannot do that." },
  INVALID_STATE: {
    fr: "Cette action n'est pas permise dans l'état actuel.",
    en: "This action is not allowed in the current state.",
  },
  STATUS_REQUIRED: {
    fr: "Choisissez un statut cible avec l'un des boutons, puis confirmez.",
    en: "Choose a target status with one of the buttons, then confirm.",
  },
  MAKER_CHECKER: {
    fr: "Règle maker-checker : un autre membre du personnel doit approuver cette action. Vous ne pouvez pas valider ce que vous avez créé.",
    en: "Maker-checker rule: another staff user must approve this action. You cannot approve what you created.",
  },
  DUPLICATE_EVENT: {
    fr: "Cet événement de paiement a déjà été traité.",
    en: "This payment event was already processed.",
  },
  ALLOCATION_NOT_100: {
    fr: "Une nomination active doit totaliser exactement 100 %.",
    en: "An active nomination must total exactly 100%.",
  },
  KIN_FIELDS: {
    fr: "Chaque proche doit avoir un nom, un lien, un genre, un e-mail et un téléphone.",
    en: "Each contact needs a name, relationship, gender, email and phone.",
  },
  GENDER_REQUIRED: {
    fr: "Choisissez un genre.",
    en: "Choose a gender.",
  },
  COUNTRY_INVALID: {
    fr: "Choisissez un pays dans la liste autorisée.",
    en: "Choose a country from the permitted list.",
  },
  INDUSTRY_INVALID: {
    fr: "Choisissez un secteur dans la liste.",
    en: "Choose an industry from the list.",
  },
  ISSUER_REQUIRED: {
    fr: "Créez d'abord un émetteur, puis choisissez-le dans la liste.",
    en: "Create an issuer first, then choose it from the list.",
  },
  DOCUMENT_MISMATCH: {
    fr: "Ce document n'est pas accepté pour le pays de résidence. Il part en revue manuelle.",
    en: "This document is not accepted for the country of residence. It is queued for manual review.",
  },
  ACCOUNT_LINK_REQUIRED: {
    fr: "Ce courriel a déjà un mot de passe. Connectez-vous puis liez Google depuis le profil.",
    en: "This email already has a password. Sign in, then link Google from the profile.",
  },
  NO_TRANSFER: {
    fr: "Un signalement de décès ne transfère pas d'actions.",
    en: "A death report does not transfer shares.",
  },
};
