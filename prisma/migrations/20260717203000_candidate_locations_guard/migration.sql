DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LocationType') THEN
    CREATE TYPE "LocationType" AS ENUM (
      'SHOPPING_MALL',
      'STREET_STORE',
      'UNIVERSITY',
      'HOTEL',
      'FOOD_COURT',
      'KIOSK',
      'CORNER',
      'CAFE',
      'MIXED_USE',
      'OTHER'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LocationStatus') THEN
    CREATE TYPE "LocationStatus" AS ENUM (
      'NEW_OPPORTUNITY',
      'UNDER_REVIEW',
      'REPORT_READY',
      'WAITING_FOR_INVESTOR',
      'IN_NEGOTIATION',
      'OFFER_SUBMITTED',
      'LEASING_PROCESS',
      'APPROVED',
      'REJECTED',
      'PASSIVE',
      'LEASED',
      'TRANSFERRED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ConceptSuitability') THEN
    CREATE TYPE "ConceptSuitability" AS ENUM (
      'CORNER',
      'SELF_CAFE',
      'CAFE',
      'KIOSK',
      'PREMIUM_CAFE',
      'HOTEL_KIOSK',
      'MULTIPLE',
      'NOT_EVALUATED'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SourceType') THEN
    CREATE TYPE "SourceType" AS ENUM (
      'INTERNAL',
      'REAL_ESTATE_AGENT',
      'MALL_MANAGEMENT',
      'FRANCHISEE',
      'ADVERTISEMENT',
      'TRANSFER_OPPORTUNITY',
      'OTHER'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'LocationDocumentType') THEN
    CREATE TYPE "LocationDocumentType" AS ENUM (
      'LOCATION_ANALYSIS_PDF',
      'LOCATION_ANALYSIS_JPEG',
      'LOCATION_PHOTO',
      'RENT_OFFER',
      'TRANSFER_OFFER',
      'ARCHITECTURAL_PLAN',
      'CONTRACT_DRAFT',
      'MALL_PRESENTATION',
      'TITLE_DEED',
      'OTHER'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MatchStatus') THEN
    CREATE TYPE "MatchStatus" AS ENUM (
      'SUGGESTED',
      'SENT_TO_LEAD',
      'INTERESTED',
      'WILL_REVIEW',
      'VISIT_PLANNED',
      'REQUESTED_OFFER',
      'SUITABLE_FOR_INVESTMENT',
      'REJECTED_BY_LEAD',
      'CLOSED'
    );
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "CandidateLocation" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "city" TEXT NOT NULL,
  "district" TEXT,
  "neighborhood" TEXT,
  "fullAddress" TEXT,
  "locationType" "LocationType" NOT NULL,
  "mallName" TEXT,
  "latitude" DOUBLE PRECISION,
  "longitude" DOUBLE PRECISION,
  "areaM2" DOUBLE PRECISION,
  "monthlyRent" DECIMAL(18,2),
  "turnoverRentRate" DOUBLE PRECISION,
  "transferFee" DECIMAL(18,2),
  "estimatedSetupCost" DECIMAL(18,2),
  "estimatedTotalInvestment" DECIMAL(18,2),
  "conceptSuitability" "ConceptSuitability" NOT NULL DEFAULT 'NOT_EVALUATED',
  "currentBusinessName" TEXT,
  "previousBrand" TEXT,
  "sourceType" "SourceType" NOT NULL DEFAULT 'INTERNAL',
  "sourceUrl" TEXT,
  "contactName" TEXT,
  "contactPhone" TEXT,
  "contactEmail" TEXT,
  "assignedUserId" TEXT,
  "status" "LocationStatus" NOT NULL DEFAULT 'NEW_OPPORTUNITY',
  "description" TEXT,
  "internalNotes" TEXT,
  "availableFrom" TIMESTAMP(3),
  "createdByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "CandidateLocation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "CandidateLocationDocument" (
  "id" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "documentType" "LocationDocumentType" NOT NULL,
  "fileName" TEXT NOT NULL,
  "originalFileName" TEXT NOT NULL,
  "filePath" TEXT NOT NULL,
  "fileUrl" TEXT,
  "mimeType" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "description" TEXT,
  "uploadedByUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "archivedAt" TIMESTAMP(3),
  CONSTRAINT "CandidateLocationDocument_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "LeadCandidateLocation" (
  "id" TEXT NOT NULL,
  "leadId" TEXT NOT NULL,
  "locationId" TEXT NOT NULL,
  "matchStatus" "MatchStatus" NOT NULL DEFAULT 'SUGGESTED',
  "assignedByUserId" TEXT,
  "presentedAt" TIMESTAMP(3),
  "nextFollowUpAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "LeadCandidateLocation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CandidateLocationDocument_fileName_key" ON "CandidateLocationDocument"("fileName");
CREATE UNIQUE INDEX IF NOT EXISTS "LeadCandidateLocation_leadId_locationId_key" ON "LeadCandidateLocation"("leadId", "locationId");
CREATE INDEX IF NOT EXISTS "CandidateLocation_city_district_idx" ON "CandidateLocation"("city", "district");
CREATE INDEX IF NOT EXISTS "CandidateLocation_locationType_idx" ON "CandidateLocation"("locationType");
CREATE INDEX IF NOT EXISTS "CandidateLocation_status_archivedAt_idx" ON "CandidateLocation"("status", "archivedAt");
CREATE INDEX IF NOT EXISTS "CandidateLocation_conceptSuitability_idx" ON "CandidateLocation"("conceptSuitability");
CREATE INDEX IF NOT EXISTS "CandidateLocation_assignedUserId_idx" ON "CandidateLocation"("assignedUserId");
CREATE INDEX IF NOT EXISTS "CandidateLocation_createdAt_idx" ON "CandidateLocation"("createdAt");
CREATE INDEX IF NOT EXISTS "CandidateLocationDocument_locationId_documentType_createdAt_idx" ON "CandidateLocationDocument"("locationId", "documentType", "createdAt");
CREATE INDEX IF NOT EXISTS "CandidateLocationDocument_archivedAt_idx" ON "CandidateLocationDocument"("archivedAt");
CREATE INDEX IF NOT EXISTS "LeadCandidateLocation_leadId_matchStatus_idx" ON "LeadCandidateLocation"("leadId", "matchStatus");
CREATE INDEX IF NOT EXISTS "LeadCandidateLocation_locationId_matchStatus_idx" ON "LeadCandidateLocation"("locationId", "matchStatus");
CREATE INDEX IF NOT EXISTS "LeadCandidateLocation_nextFollowUpAt_idx" ON "LeadCandidateLocation"("nextFollowUpAt");

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CandidateLocationDocument_locationId_fkey') THEN
    ALTER TABLE "CandidateLocationDocument" ADD CONSTRAINT "CandidateLocationDocument_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "CandidateLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LeadCandidateLocation_leadId_fkey') THEN
    ALTER TABLE "LeadCandidateLocation" ADD CONSTRAINT "LeadCandidateLocation_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'LeadCandidateLocation_locationId_fkey') THEN
    ALTER TABLE "LeadCandidateLocation" ADD CONSTRAINT "LeadCandidateLocation_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "CandidateLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;
