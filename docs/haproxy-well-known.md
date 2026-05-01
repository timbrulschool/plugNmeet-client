# Serving Static Files via HAProxy Inline Response

## The Problem

The server uses HAProxy as the entry point for all HTTPS traffic:

```
Client → HAProxy (443) → ft_plugnmeet (81) → plugnmeet-server (8080)
```

When Apple (or any client) requests `/.well-known/apple-app-site-association`, the request reaches plugnmeet-server which doesn't know about it and returns 404.

## The Solution

HAProxy can intercept a specific path and respond directly — no backend needed.

### Config location

```
/etc/haproxy/haproxy.cfg
```

### What was added to `frontend ft_plugnmeet`

```haproxy
# 1. Define a named condition matching the exact URL path
acl is_aasa path /.well-known/apple-app-site-association

# 2. Return a response immediately if the condition matches
http-request return status 200 content-type "application/json" \
    string "{\"applinks\":{\"details\":[{\"appIDs\":[\"T6WF4DAR2F.com.timbrul.app\"],\"components\":[{\"\/\":\"\/\*\"}]}]}}" \
    if is_aasa
```

### How it works

| Directive                         | What it does                                                       |
| --------------------------------- | ------------------------------------------------------------------ |
| `acl <name> path <value>`         | Creates a condition that is true when the URL path matches exactly |
| `http-request return`             | Sends a response immediately, skipping all backends                |
| `status 200`                      | HTTP status code                                                   |
| `content-type "application/json"` | Sets the Content-Type header                                       |
| `string "..."`                    | The response body (escape `"` inside as `\"`)                      |
| `if is_aasa`                      | Only applies when the ACL condition is true                        |

## Workflow for Making Changes

### 1. Backup first

```bash
cp /etc/haproxy/haproxy.cfg /etc/haproxy/haproxy.cfg.bak
```

### 2. Edit the config

```bash
nano /etc/haproxy/haproxy.cfg
```

### 3. Validate before reloading

```bash
haproxy -c -f /etc/haproxy/haproxy.cfg
```

This catches syntax errors without touching the live server.

### 4. Reload (zero downtime)

```bash
systemctl reload haproxy
```

`reload` does a graceful handoff — existing connections finish normally.

### 5. Rollback if needed

```bash
cp /etc/haproxy/haproxy.cfg.bak /etc/haproxy/haproxy.cfg
systemctl reload haproxy
```

## Verifying It Works

```bash
curl -s -w "\nHTTP %{http_code}\nContent-Type: %{content_type}" \
    https://lesson.timbrul.com/.well-known/apple-app-site-association
```

Expected output:

```json
{"applinks":{"details":[{"appIDs":["T6WF4DAR2F.com.timbrul.app"],"components":[{"/":"/*"}]}]}}

HTTP 200
Content-Type: application/json
```

## Source File

The JSON content is also kept in the repo at:

```
src/assets/.well-known/apple-app-site-association.json
```

If you update the appID or paths, update **both** the source file and the HAProxy config string.
