import base64, hashlib, hmac, json, sys, time
def b64(b): return base64.urlsafe_b64encode(b).rstrip(b'=').decode()
def jwt(sub, email, secret='thu-cuc-bo-chi-de-test-khong-dung-that-0123456789'):
    h = b64(json.dumps({'alg': 'HS256', 'typ': 'JWT'}).encode())
    p = b64(json.dumps({'sub': sub, 'email': email, 'role': 'authenticated', 'aud': 'authenticated', 'exp': int(time.time()) + 86400}).encode())
    s = b64(hmac.new(secret.encode(), f'{h}.{p}'.encode(), hashlib.sha256).digest())
    return f'{h}.{p}.{s}'
if __name__ == '__main__': print(jwt(sys.argv[1], sys.argv[2]))
