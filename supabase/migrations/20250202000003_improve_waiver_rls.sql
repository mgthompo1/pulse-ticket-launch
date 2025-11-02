-- Improve waiver_signatures INSERT policy for better security
-- The previous policy allowed anyone to insert, which could be exploited
-- This policy ensures only authenticated users (staff checking in guests) can create signatures

-- Drop the overly permissive policy
DROP POLICY IF EXISTS "Anyone can create waiver signatures" ON waiver_signatures;

-- Create a more secure policy that requires authentication
-- This is safe because waiver signing happens in TicketFloLIVE which requires staff login
CREATE POLICY "Authenticated users can create waiver signatures"
    ON waiver_signatures
    FOR INSERT
    WITH CHECK (
        -- User must be authenticated
        auth.uid() IS NOT NULL
        AND
        -- The organization must be one the user has access to (owner or member)
        organization_id IN (
            SELECT organization_id
            FROM organization_users
            WHERE user_id = auth.uid()

            UNION

            SELECT id
            FROM organizations
            WHERE user_id = auth.uid()
        )
    );

-- Add a policy to allow attendees to view their own waiver signatures
-- This would be useful for a future feature where attendees can access their waivers
CREATE POLICY "Anyone can view waiver signatures for their tickets"
    ON waiver_signatures
    FOR SELECT
    USING (
        -- Either the user is an org member/owner (covered by existing policy)
        -- OR this is for future use: allow viewing based on email match
        signer_email = auth.email()
    );

-- Add index for better performance on email lookups
CREATE INDEX IF NOT EXISTS idx_waiver_signatures_signer_email ON waiver_signatures(signer_email);
