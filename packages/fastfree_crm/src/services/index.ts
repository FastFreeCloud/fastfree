// ============================================================
// FastFree CRM — Services barrel export
// ============================================================

export {
  getLeads,
  getLead,
  createLead,
  updateLead,
  deleteLead,
  convertLeadToOpportunity,
  submitLead,
  cancelLead,
} from "./lead.service";

export {
  getOpportunities,
  getOpportunity,
  createOpportunity,
  updateOpportunity,
  deleteOpportunity,
  submitOpportunity,
  cancelOpportunity,
} from "./opportunity.service";

export {
  getContacts,
  getContact,
  createContact,
  updateContact,
  deleteContact,
} from "./contact.service";

export {
  getAddresses,
  getAddress,
  createAddress,
  updateAddress,
  deleteAddress,
} from "./address.service";

export {
  getCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign,
  submitCampaign,
  cancelCampaign,
} from "./campaign.service";

export {
  getLeadSources,
  getLeadSource,
  createLeadSource,
  updateLeadSource,
  deleteLeadSource,
} from "./leadSource.service";

export {
  getLeadPipeline,
  getOpportunityPipeline,
  getLeadsBySource,
  getSalesPerformance,
  getCampaignROI,
} from "./crmDashboard.service";

export {
  getLeadReport,
  getOpportunityReport,
  getCampaignReport,
} from "./report.service";
