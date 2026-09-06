-- Allow administrators to disable student accounts without deleting history.
ALTER TABLE "users" ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;
