-- Split security incidents (hacks, exploits, key compromises, theft) out of
-- the 'technical' bucket so the daily digest can render them under their own
-- section instead of crowding genuine technical/protocol news.
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_category_check;
ALTER TABLE events ADD CONSTRAINT events_category_check
  CHECK (category IN ('regulatory', 'partnership', 'product', 'funding', 'market', 'policy', 'technical', 'security', 'other'));
