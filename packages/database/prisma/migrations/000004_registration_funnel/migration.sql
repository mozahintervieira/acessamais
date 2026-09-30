-- Add contact information to teacher accounts.
ALTER TABLE "User" ADD COLUMN "phone" TEXT;

-- Store optional referrals separately so the funnel can support more than one person.
CREATE TABLE "ReferralLead" (
  "id" TEXT NOT NULL,
  "referrerUserId" TEXT NOT NULL,
  "name" TEXT,
  "email" TEXT,
  "phone" TEXT,
  "consentConfirmed" BOOLEAN NOT NULL DEFAULT false,
  "source" TEXT NOT NULL DEFAULT 'REGISTRATION',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ReferralLead_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ReferralLead_referrerUserId_idx" ON "ReferralLead"("referrerUserId");
CREATE INDEX "ReferralLead_status_idx" ON "ReferralLead"("status");
CREATE INDEX "ReferralLead_createdAt_idx" ON "ReferralLead"("createdAt");

ALTER TABLE "ReferralLead"
ADD CONSTRAINT "ReferralLead_referrerUserId_fkey"
FOREIGN KEY ("referrerUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
