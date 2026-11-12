import { errorCopy } from "./errors";

/** Success copy shown as an in-app toast after a server action redirects with `?notice=CODE`. */
export const noticeCopy: Record<string, { fr: string; en: string }> = {
  SAVED: { fr: "Enregistré.", en: "Saved." },
  ACCOUNT_CREATED: { fr: "Compte créé. Vérifiez votre e-mail.", en: "Account created. Verify your email." },
  CODE_RESENT: { fr: "Nouveau code envoyé.", en: "New code sent." },
  EMAIL_VERIFIED: { fr: "E-mail vérifié.", en: "Email verified." },
  ONBOARDING_DONE: { fr: "Inscription terminée.", en: "Onboarding complete." },
  PROFILE_SAVED: { fr: "Profil enregistré.", en: "Profile saved." },
  KYC_SUBMITTED: { fr: "Dossier d'identité soumis.", en: "Identity file submitted." },
  NOMINATION_SAVED: { fr: "Nomination enregistrée.", en: "Nomination saved." },
  KIN_SAVED: { fr: "Proche enregistré.", en: "Contact saved." },
  KIN_REMOVED: { fr: "Proche retiré.", en: "Contact removed." },
  DEATH_REPORTED: { fr: "Dossier de succession ouvert.", en: "Estate case opened." },
  SUBSCRIPTION_CREATED: { fr: "Souscription créée.", en: "Subscription created." },
  SUBSCRIPTION_CANCELLED: { fr: "Souscription annulée.", en: "Subscription cancelled." },
  PAYMENT_RECORDED: { fr: "Paiement de test (bac à sable) enregistré.", en: "Sandbox test payment recorded." },
  VOTE_CAST: { fr: "Vote enregistré.", en: "Vote recorded." },
  TICKET_SENT: { fr: "Message envoyé.", en: "Message sent." },
  REPLY_SENT: { fr: "Réponse envoyée.", en: "Reply sent." },
  NOTIFICATION_READ: { fr: "Notification marquée comme lue.", en: "Notification marked as read." },
  KYC_APPROVED: { fr: "Identité approuvée.", en: "Identity approved." },
  KYC_REJECTED: { fr: "Identité refusée.", en: "Identity rejected." },
  KYC_INFO_REQUESTED: { fr: "Documents supplémentaires demandés.", en: "Additional documents requested." },
  KYC_SUSPENDED: { fr: "Dossier suspendu.", en: "Case suspended." },
  OFFERING_TRANSITIONED: { fr: "Statut de l'offre mis à jour.", en: "Offering status updated." },
  ISSUER_CREATED: { fr: "Émetteur créé.", en: "Issuer created." },
  PROJECT_CREATED: { fr: "Projet créé en brouillon.", en: "Draft project created." },
  PROJECT_CONTENT_SAVED: { fr: "Contenu du projet enregistré.", en: "Project content saved." },
  OFFERING_TERMS_SAVED: { fr: "Termes de l'offre enregistrés.", en: "Offering terms saved." },
  DOCUMENT_SAVED: { fr: "Document enregistré.", en: "Document saved." },
  ALLOTMENT_PREPARED: { fr: "Lot d'allotissement préparé.", en: "Allotment batch prepared." },
  ALLOTMENT_APPROVED: { fr: "Émission approuvée et inscrite au registre.", en: "Issuance approved and recorded in the register." },
  PAYMENT_SETTLED: { fr: "Paiement marqué réglé.", en: "Payment marked settled." },
  REFUND_REQUESTED: { fr: "Remboursement demandé.", en: "Refund requested." },
  REFUND_APPROVED: { fr: "Remboursement approuvé.", en: "Refund approved." },
  UPDATE_PUBLISHED: { fr: "Actualité publiée.", en: "Update published." },
  UPDATE_SUBMITTED: { fr: "Actualité soumise pour revue.", en: "Update submitted for review." },
  PROFIT_PROPOSED: { fr: "Distribution proposée.", en: "Distribution proposed." },
  DIVIDEND_PROPOSED: { fr: "Dividende proposé.", en: "Dividend proposed." },
  DIVIDEND_APPROVED: { fr: "Dividende approuvé.", en: "Dividend approved." },
  DIVIDEND_PAID: { fr: "Paiement de dividende enregistré.", en: "Dividend payment recorded." },
  INHERITANCE_UPDATED: { fr: "État du dossier mis à jour.", en: "Case state updated." },
  INHERITANCE_APPROVED: { fr: "Approbation enregistrée.", en: "Approval recorded." },
  INHERITANCE_TRANSFERRED: { fr: "Transfert inscrit au registre.", en: "Transfer recorded in the register." },
  STAFF_CREATED: {
    fr: "Membre du personnel ajouté. Le code est affiché une seule fois ci-dessous.",
    en: "Staff member added. The code is shown once below.",
  },
  STAFF_CODE_ROTATED: {
    fr: "Code renouvelé. Le nouveau code est affiché une seule fois ci-dessous.",
    en: "Code rotated. The new code is shown once below.",
  },
  DEMO_RESET: { fr: "Démonstration réinitialisée.", en: "Demonstration reset." },
};

const fallbackError = {
  fr: "Une erreur est survenue. Réessayez.",
  en: "Something went wrong. Try again.",
};

export function noticeMessage(code: string, locale: "fr" | "en"): string {
  return noticeCopy[code]?.[locale] ?? noticeCopy.SAVED[locale];
}

export function errorMessage(code: string, locale: "fr" | "en"): string {
  return errorCopy[code]?.[locale] ?? fallbackError[locale];
}

function withParam(path: string, key: string, code: string): string {
  const [base, hash] = path.split("#");
  const separator = base.includes("?") ? "&" : "?";
  return `${base}${separator}${key}=${encodeURIComponent(code)}${hash ? `#${hash}` : ""}`;
}

/** Redirect target that raises a success toast once on arrival. */
export function withNotice(path: string, code: string): string {
  return withParam(path, "notice", code);
}

/** Redirect target that raises an error toast (and any inline `?error=` copy) on arrival. */
export function withError(path: string, code: string): string {
  return withParam(path, "error", code);
}
