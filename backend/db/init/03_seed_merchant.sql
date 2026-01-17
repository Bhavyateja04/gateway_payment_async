INSERT INTO merchants (id, email, api_key, api_secret, is_active)
VALUES (
  '550e8400-e29b-41d4-a716-446655440000',
  'test@example.com',
  'key_test_abc123',
  'secret_test_xyz789',
  true
)
ON CONFLICT DO NOTHING;
