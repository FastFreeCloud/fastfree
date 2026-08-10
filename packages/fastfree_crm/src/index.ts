// ============================================================
// FastFree CRM — Main Entry Point
// ============================================================

// Initialization
export { initFastFreeCrm } from "./init";

// Store
export { useCrmStore } from "./stores/useCrmStore";

// Screens
export { registerCrmScreens } from "./screens";

// Services — Lead
export {
  getLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  convertLeadToOpportunity,
  submitLead,
  cancelLead,
} from "./services";

// Services — Opportunity
export {
  getOpportunities,
  getOpportunity,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  submitOpportunity,
  cancelOpportunity,
} from "./services";

// Services — Contact
export {
  getContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
} from "./services";

// Services — Address
export {
  getAddresses,
  getAddress,
  createAddress,
  updateAddress,
  deleteAddress,
} from "./services";

// Services — Campaign
export {
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  submitCampaign,
  cancelCampaign,
} from "./services";

// Services — Lead Source
export {
  getLeadSources,
  getLeadSource,
  createLeadSource,
  updateLeadSource,
  deleteLeadSource,
} from "./services";

// Services — Dashboard
export {
  getLeadPipeline,
  getOpportunityPipeline,
  getLeadsBySource,
  getSalesPerformance,
  getCampaignROI,
} from "./services";

// Services — Report
export {
  getLeadReport,
  getOpportunityReport,
  getCampaignReport,
} from "./services";

// Types
export type {
  LeadStatus,
  LeadType,
  LeadSource,
  Lead,
  OpportunityStatus,
  OpportunityStage,
  Opportunity,
  ContactType,
  Contact,
  Address,
  CampaignType,
  CampaignStatus,
  Campaign,
  LeadSourceParams,
  CrmSummary,
  ApiResponse,
} from "./types";
