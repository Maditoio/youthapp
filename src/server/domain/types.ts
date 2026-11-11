import type { Gender } from "@/lib/choices";

export const DEMO_NOW = "2026-11-10T12:00:00.000Z";
export const STORE_VERSION = 4;

export type { Gender };

export type Locale = "fr" | "en";

export type Role =
  | "investor"
  | "support_agent"
  | "kyc_officer"
  | "project_analyst"
  | "offering_approver"
  | "finance_officer"
  | "platform_admin"
  | "issuer_manager"
  | "auditor";

export type KycStatus =
  | "NOT_STARTED"
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "UNDER_REVIEW"
  | "ADDITIONAL_INFORMATION_REQUIRED"
  | "APPROVED"
  | "REJECTED"
  | "EXPIRED"
  | "SUSPENDED";

export type OfferingStatus =
  | "DRAFT"
  | "INTERNAL_REVIEW"
  | "LEGAL_REVIEW"
  | "APPROVED"
  | "SCHEDULED"
  | "OPEN"
  | "PAUSED"
  | "CLOSED"
  | "ALLOTMENT_PENDING"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED_TO_REACH_MINIMUM";

export type SubscriptionStatus =
  | "PENDING_PAYMENT"
  | "PAID_AWAITING_CLOSING"
  | "ALLOTTED"
  | "CANCELLED"
  | "REFUNDED"
  | "EXPIRED";

export type InheritanceStatus =
  | "REPORTED"
  | "EVIDENCE_REQUESTED"
  | "UNDER_LEGAL_REVIEW"
  | "APPROVAL_PENDING"
  | "APPROVED"
  | "REJECTED"
  | "REGISTER_UPDATE_PENDING"
  | "COMPLETED"
  | "SUSPENDED"
  | "DISPUTED";

export interface User {
  id: string;
  email: string;
  phone: string | null;
  passwordHash: string | null;
  preferredLanguage: Locale;
  accountStatus: "ACTIVE" | "SUSPENDED";
  emailVerifiedAt: string | null;
  countryOfResidence: string | null;
  /** Demographic only. Never used to allow or refuse investment, KYC or ownership. */
  gender: Gender | null;
  legalFirstName: string;
  legalLastName: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthIdentity {
  id: string;
  userId: string;
  provider: "password" | "google" | "clerk";
  providerSubject: string;
  verifiedEmailAt: string | null;
  linkedAt: string;
}

export interface EmailVerification {
  id: string;
  userId: string;
  email: string;
  codeHash: string;
  status: "PENDING" | "VERIFIED" | "EXPIRED";
  expiresAt: string;
  verifiedAt: string | null;
  createdAt: string;
}

export interface InvestorProfile {
  id: string;
  userId: string;
  investorNumber: string;
  legalFirstName: string;
  legalMiddleName: string;
  legalLastName: string;
  dateOfBirth: string | null;
  countryOfResidence: string | null;
  gender: Gender | null;
  nationality: string | null;
  addressLine: string | null;
  city: string | null;
  taxResidency: string | null;
  taxId: string | null;
  sourceOfFunds: string | null;
  pepStatus: "UNKNOWN" | "NO" | "YES";
  onboardingStatus: KycStatus;
  payoutLabel: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KycCase {
  id: string;
  investorProfileId: string;
  status: KycStatus;
  riskReviewStatus: "NOT_STARTED" | "CLEAR" | "ESCALATED";
  submittedAt: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  reasonCode: string | null;
  reviewNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface KycDocument {
  id: string;
  kycCaseId: string;
  issuingCountryCode: string;
  documentType: string;
  documentNumber: string;
  expiryDate: string | null;
  manualReviewRequired: boolean;
  verificationStatus: "PENDING" | "APPROVED" | "REJECTED";
  storageKey: string;
  mimeType: string;
  checksum: string;
  reviewedBy: string | null;
  reviewedAt: string | null;
  rejectionReasonCode: string | null;
  uploadedAt: string;
}

export interface StaffProfile {
  id: string;
  userId: string;
  staffNumber: string;
  status: "ACTIVE" | "SUSPENDED";
  /** SHA-256 hash used for MFA / step-up verification. */
  mfaCodeHash: string;
  /**
   * Plaintext confirmation code for admin visibility (Personnel page).
   * Demo/bootstrap only — verification always uses mfaCodeHash.
   */
  mfaCodeDisplay: string;
  createdAt: string;
}

export interface UserRole {
  id: string;
  userId: string;
  role: Role;
  scopeType: "PLATFORM" | "ISSUER";
  scopeId: string | null;
  assignedBy: string | null;
  createdAt: string;
}

export interface Issuer {
  id: string;
  legalName: string;
  tradingName: string;
  registrationNumber: string;
  jurisdiction: string;
  legalForm: string;
  registeredAddress: string;
  industry: string;
  companyStatus: "ACTIVE" | "DRAFT";
  website: string;
  createdAt: string;
  updatedAt: string;
}

export interface IssuerRepresentative {
  id: string;
  issuerId: string;
  userId: string;
  position: string;
  authorityStatus: "ACTIVE";
  createdAt: string;
}

export interface ProceedsLine {
  labelFr: string;
  labelEn: string;
  amountMinor: number;
}

export interface TeamMember {
  name: string;
  roleFr: string;
  roleEn: string;
  experienceFr: string;
  experienceEn: string;
}

export interface Project {
  id: string;
  issuerId: string;
  slug: string;
  titleFr: string;
  titleEn: string;
  shortFr: string;
  shortEn: string;
  fullFr: string;
  fullEn: string;
  marketFr: string;
  marketEn: string;
  industry: string;
  locationName: string;
  status: "DRAFT" | "PUBLISHED";
  /** START opens a new company. FINANCE funds a company that already exists. */
  financingPurpose: "START" | "FINANCE";
  createdBy: string;
  useOfProceeds: ProceedsLine[];
  team: TeamMember[];
  risksFr: string[];
  risksEn: string[];
  assumptionsFr: string;
  assumptionsEn: string;
  projectionsFr: string;
  projectionsEn: string;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectUpdate {
  id: string;
  projectId: string;
  titleFr: string;
  titleEn: string;
  bodyFr: string;
  bodyEn: string;
  visibility: "INVESTORS" | "PUBLIC";
  approvalStatus: "SUBMITTED" | "APPROVED" | "REJECTED";
  submittedBy: string;
  approvedBy: string | null;
  publishedAt: string | null;
  createdAt: string;
}

export interface CapRow {
  holderFr: string;
  holderEn: string;
  shares: number;
}

export interface Offering {
  id: string;
  projectId: string;
  issuerId: string;
  nameFr: string;
  nameEn: string;
  status: OfferingStatus;
  currencyCode: string;
  minimumRaiseMinor: number;
  maximumRaiseMinor: number;
  minimumSubscriptionMinor: number;
  maximumSubscriptionMinor: number;
  opensAt: string;
  closesAt: string;
  termsVersion: string;
  createdBy: string;
  approvedBy: string | null;
  publishedAt: string | null;
  feeMinor: number;
  preMoneyValuationMinor: number | null;
  permittedCountries: string[];
  dividendPolicyFr: string;
  dividendPolicyEn: string;
  transferRestrictionsFr: string;
  transferRestrictionsEn: string;
  conditionsFr: string;
  conditionsEn: string;
  refundFr: string;
  refundEn: string;
  existingCap: CapRow[];
  createdAt: string;
  updatedAt: string;
}

export interface ShareClass {
  id: string;
  issuerId: string;
  className: string;
  classCode: string;
  currencyCode: string;
  votingRightsFr: string;
  votingRightsEn: string;
  dividendRightsFr: string;
  dividendRightsEn: string;
  transferRestrictionsFr: string;
  transferRestrictionsEn: string;
  createdAt: string;
}

export interface OfferingShareTerms {
  id: string;
  offeringId: string;
  shareClassId: string;
  issuePriceMinor: number;
  sharesOffered: number;
  maximumSharesPerInvestor: number;
  minimumSharesPerInvestor: number;
  fractionalSharesAllowed: boolean;
  shareQuantityPrecision: number;
  createdAt: string;
}

export interface OfferingDocument {
  id: string;
  offeringId: string;
  documentType: string;
  version: string;
  titleFr: string;
  titleEn: string;
  bodyFr: string;
  bodyEn: string;
  checksum: string;
  visibility: "PUBLIC" | "INVESTOR" | "RESTRICTED";
  publishedAt: string | null;
  createdAt: string;
}

export interface Subscription {
  id: string;
  investorProfileId: string;
  offeringId: string;
  shareClassId: string;
  reference: string;
  currencyCode: string;
  amountMinor: number;
  shareQuantity: number;
  issuePriceMinor: number;
  feeMinor: number;
  totalMinor: number;
  status: SubscriptionStatus;
  termsVersion: string;
  acceptedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface SubscriptionAcceptance {
  id: string;
  subscriptionId: string;
  documentId: string;
  documentVersion: string;
  acceptedAt: string;
  evidenceHash: string;
  acceptanceMethod: "ELECTRONIC_CLICK";
}

export interface PaymentTransaction {
  id: string;
  subscriptionId: string;
  provider: "sandbox";
  providerTransactionId: string;
  providerEventId: string;
  currencyCode: string;
  amountMinor: number;
  status: "CONFIRMED" | "SETTLED" | "FAILED" | "REFUNDED";
  initiatedAt: string;
  confirmedAt: string | null;
  settledAt: string | null;
  createdAt: string;
}

export interface Refund {
  id: string;
  paymentTransactionId: string;
  amountMinor: number;
  currencyCode: string;
  reasonCode: string;
  status: "REQUESTED" | "APPROVED" | "REJECTED" | "COMPLETED";
  requestedBy: string;
  approvedBy: string | null;
  createdAt: string;
  completedAt: string | null;
}

export interface CompanyFinancing {
  id: string;
  issuerId: string;
  projectId: string;
  offeringId: string;
  allotmentBatchId: string;
  subscriptionId: string;
  purpose: "START" | "FINANCE";
  amountMinor: number;
  currencyCode: string;
  releasedAt: string;
  releasedBy: string;
}

export interface LedgerAccount {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: "ASSET" | "LIABILITY";
  currencyCode: string;
  ownerType: "ESCROW" | "PLATFORM_OPERATING" | "ISSUER_SETTLEMENT" | "COMPANY_FINANCING";
  ownerId: string | null;
  status: "ACTIVE";
}

export interface LedgerTransaction {
  id: string;
  reference: string;
  transactionType: string;
  sourceType: string;
  sourceId: string;
  status: "POSTED";
  effectiveAt: string;
  createdAt: string;
  createdBy: string | null;
}

export interface LedgerEntry {
  id: string;
  ledgerTransactionId: string;
  ledgerAccountId: string;
  debitMinor: number;
  creditMinor: number;
  currencyCode: string;
  createdAt: string;
}

export interface AllotmentBatch {
  id: string;
  issuerId: string;
  offeringId: string;
  status: "PREPARED" | "APPROVED" | "REJECTED";
  preparedBy: string;
  approvedBy: string | null;
  approvedAt: string | null;
  registerEvidenceReference: string | null;
  subscriptionIds: string[];
  createdAt: string;
}

export interface ShareIssuance {
  id: string;
  issuerId: string;
  shareClassId: string;
  offeringId: string;
  allotmentBatchId: string;
  investorProfileId: string;
  subscriptionId: string;
  shareQuantity: number;
  issuePriceMinor: number;
  currencyCode: string;
  allotmentDate: string;
  registerReference: string;
  status: "ISSUED" | "CANCELLED";
  createdAt: string;
}

export interface ShareholdingEvent {
  id: string;
  issuerId: string;
  shareClassId: string;
  investorProfileId: string;
  eventType: "ISSUANCE" | "TRANSFER_OUT" | "TRANSFER_IN" | "CANCELLATION";
  shareQuantityDelta: number;
  relatedIssuanceId: string | null;
  relatedTransferId: string | null;
  effectiveAt: string;
  recordedAt: string;
  recordedBy: string;
  evidenceDocumentId: string | null;
}

/** Digital shareholder certificate tied to an issued holding (share issuance), not a payment. */
export interface ShareCertificate {
  id: string;
  certificateNumber: string;
  shareIssuanceId: string;
  investorProfileId: string;
  issuerId: string;
  shareClassId: string;
  offeringId: string;
  projectId: string;
  shareQuantity: number;
  issuePriceMinor: number;
  currencyCode: string;
  allotmentDate: string;
  registerReference: string;
  offeringReference: string;
  /** HMAC over canonical certificate fields — never print the signing secret. */
  signature: string;
  status: "ACTIVE" | "REVOKED";
  createdAt: string;
}

export interface DividendDeclaration {
  id: string;
  issuerId: string;
  shareClassId: string;
  currencyCode: string;
  perShareMinor: number;
  recordDate: string;
  paymentDate: string;
  status: "PROPOSED" | "APPROVED" | "PAID" | "REJECTED";
  withholdingBps: number;
  preparedBy: string;
  approvedBy: string | null;
  createdAt: string;
}

export interface DividendEntitlement {
  id: string;
  declarationId: string;
  investorProfileId: string;
  eligibleShareQuantity: number;
  grossAmountMinor: number;
  withholdingTaxMinor: number;
  netAmountMinor: number;
  calculationVersion: string;
  createdAt: string;
}

export interface DividendPayment {
  id: string;
  entitlementId: string;
  provider: "sandbox";
  providerReference: string;
  amountMinor: number;
  currencyCode: string;
  status: "PENDING" | "PAID" | "FAILED";
  paidAt: string | null;
  createdAt: string;
}

export interface Resolution {
  id: string;
  issuerId: string;
  titleFr: string;
  titleEn: string;
  descriptionFr: string;
  descriptionEn: string;
  resolutionTextFr: string;
  resolutionTextEn: string;
  recordDate: string;
  opensAt: string;
  closesAt: string;
  status: "OPEN" | "CLOSED";
  quorumFr: string;
  quorumEn: string;
  createdAt: string;
}

export interface ResolutionEligibility {
  id: string;
  resolutionId: string;
  investorProfileId: string;
  eligibleVotes: number;
  shareClassId: string;
}

export interface ShareholderVote {
  id: string;
  resolutionId: string;
  investorProfileId: string;
  voteChoice: "FOR" | "AGAINST" | "ABSTAIN";
  votesCast: number;
  submittedAt: string;
}

export interface NextOfKin {
  id: string;
  investorProfileId: string;
  fullName: string;
  relationship: string;
  gender: Gender | null;
  email: string;
  phone: string;
  createdAt: string;
  updatedAt: string;
}

export interface NominationSet {
  id: string;
  investorProfileId: string;
  scopeType: "ALL_HOLDINGS_WISHES";
  scopeId: string | null;
  version: number;
  status: "DRAFT" | "ACTIVE" | "SUPERSEDED";
  totalBps: number;
  acknowledgement: boolean;
  activatedAt: string | null;
  createdAt: string;
}

export interface Allocation {
  id: string;
  nominationSetId: string;
  fullName: string;
  relationship: string;
  gender: Gender | null;
  email: string;
  phone: string;
  allocationBps: number;
  createdAt: string;
}

export interface InheritanceCase {
  id: string;
  deceasedInvestorProfileId: string;
  reportedBy: string;
  status: InheritanceStatus;
  jurisdiction: string;
  assignedReviewerId: string | null;
  approvedBy: string | null;
  secondApprovedBy: string | null;
  legalEvidenceReference: string | null;
  notes: string | null;
  openedAt: string;
  closedAt: string | null;
  /** Always false until a separate, dual-approved register event is recorded. */
  registerUpdated: boolean;
}

export interface Notification {
  id: string;
  userId: string;
  channel: "IN_APP";
  templateKey: string;
  titleFr: string;
  titleEn: string;
  bodyFr: string;
  bodyEn: string;
  status: "UNREAD" | "READ";
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string | null;
  category: string;
  subject: string;
  status: "OPEN" | "PENDING" | "CLOSED";
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string | null;
  message: string;
  internal: boolean;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  actorUserId: string | null;
  action: string;
  resourceType: string;
  resourceId: string;
  reason: string | null;
  createdAt: string;
}

export interface Article {
  id: string;
  slug: string;
  titleFr: string;
  titleEn: string;
  bodyFr: string;
  bodyEn: string;
}

export interface Faq {
  id: string;
  questionFr: string;
  questionEn: string;
  answerFr: string;
  answerEn: string;
}

export interface IdentityPolicy {
  countryCode: string;
  acceptedDocumentTypes: string[];
  policyVersion: string;
  enabled: boolean;
}

export interface LoginAttempt {
  email: string;
  at: string;
  success: boolean;
}

export interface Database {
  version: number;
  clock: string;
  users: User[];
  authIdentities: AuthIdentity[];
  emailVerifications: EmailVerification[];
  investorProfiles: InvestorProfile[];
  kycCases: KycCase[];
  kycDocuments: KycDocument[];
  staffProfiles: StaffProfile[];
  userRoles: UserRole[];
  issuers: Issuer[];
  issuerRepresentatives: IssuerRepresentative[];
  projects: Project[];
  projectUpdates: ProjectUpdate[];
  offerings: Offering[];
  shareClasses: ShareClass[];
  offeringShareTerms: OfferingShareTerms[];
  offeringDocuments: OfferingDocument[];
  subscriptions: Subscription[];
  subscriptionAcceptances: SubscriptionAcceptance[];
  payments: PaymentTransaction[];
  refunds: Refund[];
  companyFinancings: CompanyFinancing[];
  ledgerAccounts: LedgerAccount[];
  ledgerTransactions: LedgerTransaction[];
  ledgerEntries: LedgerEntry[];
  allotmentBatches: AllotmentBatch[];
  shareIssuances: ShareIssuance[];
  shareholdingEvents: ShareholdingEvent[];
  shareCertificates: ShareCertificate[];
  dividendDeclarations: DividendDeclaration[];
  dividendEntitlements: DividendEntitlement[];
  dividendPayments: DividendPayment[];
  resolutions: Resolution[];
  resolutionEligibility: ResolutionEligibility[];
  votes: ShareholderVote[];
  nextOfKin: NextOfKin[];
  nominationSets: NominationSet[];
  allocations: Allocation[];
  inheritanceCases: InheritanceCase[];
  notifications: Notification[];
  supportTickets: SupportTicket[];
  supportMessages: SupportMessage[];
  auditLogs: AuditLog[];
  articles: Article[];
  faqs: Faq[];
  identityPolicies: IdentityPolicy[];
  loginAttempts: LoginAttempt[];
}
