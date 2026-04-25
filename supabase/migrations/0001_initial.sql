-- Yuán initial schema (Phase 1 — directly from Tech Design § Database Schema).
--
-- IMPORTANT: in the hackathon MVP we run an in-memory store (apps/web/src/lib/db/store.ts)
-- that mirrors this schema. This SQL file is kept as the source-of-truth for the SHAPE
-- of the data and as the migration that will run when we wire Supabase post-hackathon.
--
-- To apply against a Supabase project later:
--   supabase link --project-ref YOUR_REF
--   supabase db push
--
-- All tables get RLS enabled; policies are written below for the importer/supplier read paths.

-- ============================================================================
-- Tables
-- ============================================================================

CREATE TABLE IF NOT EXISTS organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clerk_org_id TEXT UNIQUE,                  -- nullable in hackathon (no Clerk yet)
    type TEXT CHECK (type IN ('importer', 'supplier', 'arbiter')) NOT NULL,
    country_code CHAR(2) NOT NULL,
    legal_name TEXT NOT NULL,
    cac_number TEXT,                           -- Nigerian importers
    business_license TEXT,                     -- Chinese suppliers
    kyb_status TEXT
        CHECK (kyb_status IN ('pending', 'approved', 'rejected', 'review'))
        DEFAULT 'pending',
    smart_account_address TEXT,                -- Pimlico (Phase 5+)
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_org_clerk ON organizations(clerk_org_id);
CREATE INDEX IF NOT EXISTS idx_org_type_status ON organizations(type, kyb_status);


CREATE TABLE IF NOT EXISTS kyb_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    provider TEXT,                             -- 'smile_id' | 'tianyancha' | 'comply_advantage'
    status TEXT,
    response_payload JSONB,
    risk_flags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_org_id UUID REFERENCES organizations(id),
    seller_org_id UUID REFERENCES organizations(id),
    status TEXT
        CHECK (status IN (
            'drafted', 'kyb_pending', 'quoted', 'awaiting_funding',
            'funded', 'in_transit', 'inspected', 'delivered',
            'settling', 'settled', 'disputed', 'refunded', 'cancelled'
        ))
        NOT NULL DEFAULT 'drafted',
    amount_ngn NUMERIC(20,2),
    amount_cny NUMERIC(20,2),
    amount_usdt NUMERIC(20,6),
    quote_breakdown JSONB,
    parsed_documents JSONB,
    escrow_address TEXT,
    escrow_chain TEXT DEFAULT 'bsc-testnet',
    sor_allocation JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tx_buyer ON transactions(buyer_org_id, status);
CREATE INDEX IF NOT EXISTS idx_tx_seller ON transactions(seller_org_id, status);
CREATE INDEX IF NOT EXISTS idx_tx_status_open
    ON transactions(status)
    WHERE status NOT IN ('settled', 'cancelled');


CREATE TABLE IF NOT EXISTS tranches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id) ON DELETE CASCADE,
    sequence INT,
    percentage NUMERIC(5,2),
    amount_usdt NUMERIC(20,6),
    condition_type TEXT,                       -- 'bl_signed' | 'inspection_certified' | 'delivery_acknowledged'
    condition_payload JSONB,
    status TEXT CHECK (status IN ('pending', 'attested', 'released', 'disputed', 'refunded')),
    deadline TIMESTAMPTZ,
    released_tx_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


CREATE TABLE IF NOT EXISTS audit_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id),
    actor_id UUID,
    actor_type TEXT,                           -- 'buyer' | 'seller' | 'arbiter' | 'system'
    event_type TEXT,
    payload JSONB,
    on_chain_tx_hash TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_tx ON audit_events(transaction_id, created_at DESC);


CREATE TABLE IF NOT EXISTS sor_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID REFERENCES transactions(id),
    source_id TEXT,
    allocated_ngn NUMERIC(20,2),
    predicted_slippage_bps NUMERIC(8,2),
    realized_slippage_bps NUMERIC(8,2),
    predicted_delay_seconds INT,
    realized_delay_seconds INT,
    features_at_decision JSONB,
    fallback_to_rulebased BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sor_source_time ON sor_executions(source_id, created_at DESC);


-- ============================================================================
-- Row Level Security (enabled now, policies wired when Clerk arrives)
-- ============================================================================

ALTER TABLE organizations    ENABLE ROW LEVEL SECURITY;
ALTER TABLE kyb_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE tranches         ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_events     ENABLE ROW LEVEL SECURITY;
ALTER TABLE sor_executions   ENABLE ROW LEVEL SECURITY;

-- Example policy (commented; activated post-hackathon when Clerk wires the JWT):
--
-- CREATE POLICY "Users see their org's transactions"
--     ON transactions FOR SELECT USING (
--         buyer_org_id  IN (SELECT id FROM organizations WHERE clerk_org_id = auth.jwt()->>'org_id')
--      OR seller_org_id IN (SELECT id FROM organizations WHERE clerk_org_id = auth.jwt()->>'org_id')
--     );
