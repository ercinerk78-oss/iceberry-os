export type CandidateInteractionView = {
  id: string;
  interactionType: string;
  title: string;
  description: string;
  interactionDate: string;
  nextAction: string;
  reminderAt: string;
};

export type CandidateTaskView = {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  priority: string;
  status: string;
  assignedUserId: string;
  completedAt: string;
  createdAt: string;
};

export type CandidateDocumentView = {
  id: string;
  fileName: string;
  originalFileName: string;
  filePath: string;
  mimeType: string;
  fileSize: number;
  documentType: string;
  version: string;
  description: string;
  uploadedBy: string;
  uploadedAt: string;
  customerShared: boolean;
  customerSharedAt: string;
  archivedAt: string;
  createdAt: string;
  updatedAt: string;
};

export type Candidate = {
  id: string;
  fullName: string;
  phone: string;
  whatsapp: string;
  email: string;
  city: string;
  district: string;
  country: string;
  investmentBudget: string;
  currency: string;
  interestedConcept: string;
  source: string;
  status: string;
  temperature: string;
  generalNotes: string;
  nextFollowUpAt: string;
  lastContactAt: string;
  lostReason: string;
  createdAt: string;
  assignedUserId: string;
  interactions: CandidateInteractionView[];
  tasks: CandidateTaskView[];
  documents: CandidateDocumentView[];
};
