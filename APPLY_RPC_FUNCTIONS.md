# Apply WebAuthn RPC Functions

## Step 1: Run this SQL in Supabase Dashboard

Go to [Supabase Dashboard SQL Editor](https://supabase.com/dashboard/project/yoxsewbpoqxscsutqlcb/sql) and run the contents of:

`/Users/mitchellthompson/Desktop/pulse-ticket-launch/create_webauthn_rpc_functions.sql`

Copy and paste that entire SQL file into the SQL Editor and click "Run".

## Step 2: Deploy Updated Functions

After the SQL is applied, I'll deploy the updated WebAuthn functions that use RPC calls instead of direct table access.

This will fix the schema prefix issue that's causing the "relation does not exist" error.