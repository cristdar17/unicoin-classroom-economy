-- =============================================
-- Enable Supabase Realtime for wallets and transactions
-- Run this in Supabase SQL Editor
-- =============================================

-- Enable realtime for wallets table
ALTER PUBLICATION supabase_realtime ADD TABLE wallets;

-- Enable realtime for transactions table
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;

-- Enable realtime for purchase_requests table (for teacher notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE purchase_requests;

-- Enable realtime for transfer_requests table (for teacher notifications)
ALTER PUBLICATION supabase_realtime ADD TABLE transfer_requests;

-- Enable realtime for classrooms (for treasury updates)
ALTER PUBLICATION supabase_realtime ADD TABLE classrooms;
