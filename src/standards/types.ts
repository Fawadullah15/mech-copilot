export type VerificationStatus = 'verified' | 'draft' | 'unverified';

export type StandardOrganization = 'ISO' | 'ASME' | 'DIN' | 'AGMA' | 'ASTM';

export type PublicationStatus = 'active' | 'withdrawn' | 'historical' | 'unknown';

export interface EngineeringStandardRecord {
  id: string;
  code: string;
  title: string;
  organization: StandardOrganization;
  edition: string;
  status: PublicationStatus;
  scope: string;
  supportedCalculations: string[];
  verificationStatus: VerificationStatus;
  references: string[];
  assumptions: string[];
  limitations: string[];
}

export interface StandardFilterOptions {
  searchQuery?: string;
  organization?: StandardOrganization | 'ALL';
  verificationStatus?: VerificationStatus | 'ALL';
  status?: PublicationStatus | 'ALL';
}
