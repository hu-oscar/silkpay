-- Enable Supabase Realtime on the tables the client subscribes to.
-- Run once in the Supabase SQL Editor.
--
-- Phase 2 needs `kyb_applications` + `organizations` for the live KYB wizard.
-- Phase 6 will need `transactions` + `tranches` for the dual-side dashboard.

ALTER PUBLICATION supabase_realtime
    ADD TABLE
        kyb_applications,
        organizations,
        transactions,
        tranches;
