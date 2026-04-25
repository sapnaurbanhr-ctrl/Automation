# Auth-Gated App Testing Playbook

## Step 1: Create Test User & Session
```
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Step 2: Test Backend API
```
curl -X GET "$BASE/api/auth/me" -H "Authorization: Bearer SESSION_TOKEN"
curl -X GET "$BASE/api/leads" -H "Authorization: Bearer SESSION_TOKEN"
curl -X POST "$BASE/api/leads" -H "Content-Type: application/json" -H "Authorization: Bearer SESSION_TOKEN" -d '{"lead_name":"Acme","company_name":"Acme Co","email":"a@b.com","phone":"123","source":"LinkedIn","deal_value":100,"status":"New"}'
```

## Step 3: Browser Testing
```
await page.context.add_cookies([{
    "name": "session_token",
    "value": "SESSION_TOKEN",
    "domain": "your-app.com",
    "path": "/",
    "httpOnly": True,
    "secure": True,
    "sameSite": "None"
}]);
```

## Success
- /api/auth/me returns user
- /api/leads CRUD works
- Dashboard loads without redirect
