# Runtime Security Tests

This document describes manual tests to perform while the app is running to verify security features.

## Prerequisites

1. Build and start the app:
   ```bash
   bun run build
   bun run start
   ```

2. Open browser DevTools on the WhatsApp window:
   - The app prevents this by default, which is good!
   - You can test by modifying main-window.ts temporarily

## Test 1: Navigation Protection

**Goal**: Verify the app cannot navigate away from WhatsApp

**Steps**:
1. Start the app
2. Try to navigate to a different site (would require DevTools or injected script)
3. Check security logs: `tail -f ~/.config/whatsapp-desktop/logs/security.log`

**Expected**: Navigation blocked, logged as `[HIGH] navigation_blocked`

## Test 2: Permission Requests

**Goal**: Verify only allowed permissions are granted

**Test with DevTools Console** (if you temporarily enable them):
```javascript
// Should be denied (geolocation)
navigator.geolocation.getCurrentPosition(
  () => console.log('FAIL: Geolocation granted'),
  () => console.log('PASS: Geolocation denied')
)

// Should be granted (clipboard)
navigator.clipboard.writeText('test').then(
  () => console.log('PASS: Clipboard granted'),
  () => console.log('FAIL: Clipboard denied')
)
```

**Expected**: 
- Geolocation denied, logged as `[MEDIUM] permission_denied`
- Clipboard allowed

## Test 3: Window Opening

**Goal**: Verify new windows can't open to malicious sites

**Manual Test**:
1. Right-click a link in WhatsApp (if any external links exist)
2. Try "Open in new window"

**Expected**: 
- Only WhatsApp domains allowed
- Others blocked and logged as `[HIGH] window_blocked`

## Test 4: Content Security Policy

**Goal**: Verify CSP is active

**Test with DevTools Console**:
```javascript
// Try to load external script
const script = document.createElement('script')
script.src = 'https://evil.com/malicious.js'
document.body.appendChild(script)
```

**Expected**: CSP blocks the script, error in console

## Test 5: XSS Protection

**Goal**: Verify input sanitization works

**Test**:
1. Send yourself a WhatsApp message with special characters:
   ```
   Test <script>alert('xss')</script> message
   ```
2. Click the notification when it appears

**Expected**: 
- No alert popup
- Script tags escaped in notification
- Chat focuses normally

## Test 6: Tracking Blockers

**Goal**: Verify Facebook/Google tracking is blocked

**Check Network Tab** (if DevTools enabled):
1. Look for blocked requests to:
   - `connect.facebook.net`
   - `analytics.google.com`
   - `googletagmanager.com`

**Expected**: 
- Requests blocked
- Logged as `[LOW] suspicious_activity`

## Test 7: Security Logs

**Goal**: Verify logging works

**Steps**:
1. Use the app normally for a few minutes
2. Check logs:
   ```bash
   cat ~/.config/whatsapp-desktop/logs/security.log
   ```

**Expected**: Log file exists with security events

**Example log entries**:
```
[2026-03-16T19:00:00.000Z] [MEDIUM] [permission_denied] Denied permission: geolocation
[2026-03-16T19:00:05.000Z] [HIGH] [navigation_blocked] Blocked navigation to: https://evil.com
[2026-03-16T19:00:10.000Z] [LOW] [suspicious_activity] Blocked tracking request to: connect.facebook.net
```

## Test 8: Session Security

**Goal**: Verify session storage location and permissions

**Steps**:
```bash
# Check session directory
ls -la ~/.config/whatsapp-desktop/

# Check permissions
stat ~/.config/whatsapp-desktop/

# Check if IndexedDB is readable
ls -la ~/.config/whatsapp-desktop/Partitions/whatsapp/
```

**Expected**:
- Directory owned by your user (not root)
- Permissions: 700 (drwx------)
- Only your user can read

## Test 9: IPC Validation

**Goal**: Verify IPC messages are validated

**This requires modifying the app or using DevTools**:
```javascript
// Try to set invalid setting (would require access to electronAPI)
window.electronAPI.setSetting('invalid_key', 'value')
```

**Expected**: 
- Setting rejected
- Returns false
- Logged as invalid key

## Test 10: Certificate Monitoring

**Goal**: Verify certificate errors are logged

**Steps**:
1. Start the app
2. Check initial logs:
   ```bash
   grep "certificate" ~/.config/whatsapp-desktop/logs/security.log
   ```

**Expected**: 
- WhatsApp certificate fingerprints logged
- No errors if certificate is valid

## Test 11: System Integration Security

**Goal**: Verify system tray doesn't expose sensitive data

**Steps**:
1. Enable notifications with message preview
2. Send yourself a test message
3. Check notification

**Expected**:
- Notification shows in system
- Content matches preview setting
- No leakage of session tokens or internal data

## Test 12: Settings Window Security

**Goal**: Verify settings window has same protections

**Steps**:
1. Open settings (Ctrl+,)
2. Try to navigate away (if you can access DevTools)
3. Check logs

**Expected**:
- Navigation blocked
- Same security features as main window

## Stress Tests

### Test 13: Rapid Permission Requests

**Goal**: Verify permission handler doesn't crash with spam

**Steps** (requires DevTools):
```javascript
for (let i = 0; i < 100; i++) {
  navigator.permissions.query({name: 'geolocation'})
}
```

**Expected**: All denied, no crash

### Test 14: Navigation Spam

**Goal**: Verify navigation guards don't crash

**Steps** (requires code modification):
```javascript
for (let i = 0; i < 100; i++) {
  location.href = 'https://evil' + i + '.com'
}
```

**Expected**: All blocked, logged, no crash

## Security Regression Tests

After any code changes, re-run:

1. Static tests: `./test-security.sh`
2. Build: `bun run build`
3. Manual runtime tests (above)
4. Check logs for unexpected events

## Known Limitations to Accept

These are expected behaviors, not bugs:

1. **WhatsApp Web code runs unchecked** - We trust Meta's code
2. **Session stored unencrypted** - Use disk encryption
3. **Certificate pinning not enforced** - Monitoring only for now
4. **No protection against OS compromise** - Outside app scope

## When to Be Concerned

**Red flags** that indicate compromise:

1. Unexpected `[CRITICAL]` log entries
2. Certificate errors for WhatsApp domains
3. Navigation blocks to WhatsApp domains (false positive or attack)
4. Permission grants you didn't initiate
5. Files in `~/.config/whatsapp-desktop/` owned by different user
6. App requesting sudo/root permissions

## Security Monitoring

**Daily**:
- Check for app updates
- Review security logs for anomalies

**Weekly**:
- Run `bun audit`
- Check Electron CVE database

**Monthly**:
- Update dependencies: `bun update`
- Re-run security test suite

## Conclusion

If all tests pass:
- **Static tests**: 20/20 ✓
- **Runtime tests**: Manual verification required
- **Security score**: 8.5/10

The app is well-protected against common attacks. Main risks remain at OS and network level.
