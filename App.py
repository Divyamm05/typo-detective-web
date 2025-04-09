from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
import json
import tldextract
import asyncio
import aiohttp
import random
import datetime
import sys

if sys.platform.startswith('win'):
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())


app = Flask(__name__)
CORS(app)

CLOUDFLARE_DOH_URL = "https://cloudflare-dns.com/dns-query"
IP_API_URL = "http://ip-api.com/json/"

# In-memory cache and deduplication
ip_country_cache = {}
seen_domains = set()

# DNS over HTTPS query using Cloudflare
async def query_dns(session, domain, record_type):
    headers = {"accept": "application/dns-json"}
    params = {"name": domain, "type": record_type}
    try:
        async with session.get(CLOUDFLARE_DOH_URL, headers=headers, params=params) as response:
            if response.status != 200:
                return None
            data = await response.json(content_type=None)
            if "Answer" in data:
                records = [entry["data"] for entry in data["Answer"]]
                if record_type == "MX":
                    records = [mx.split(" ", 1)[1] if " " in mx else mx for mx in records]
                return records
    except Exception:
        return None
    return None

# IP → Country with in-memory cache
async def get_ip_country(ip, session):
    if ip in ip_country_cache:
        return ip_country_cache[ip]
    try:
        async with session.get(IP_API_URL + ip) as response:
            data = await response.json()
            country = data.get("country", "Unknown")
            ip_country_cache[ip] = country
            return country
    except Exception:
        return "Unknown"

def generate_variations(domain, max_variations=1000):
    extracted = tldextract.extract(domain)
    base_name = extracted.domain
    tld = extracted.suffix
    variations = set()

    # Omission
    for i in range(len(base_name)):
        variations.add((f"{base_name[:i] + base_name[i+1:]}.{tld}", "Omission"))

    # Replacement (expanded set)
    replacement_chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_"
    for i in range(len(base_name)):
        for char in replacement_chars:
            if base_name[i] != char:
                variations.add((f"{base_name[:i] + char + base_name[i+1:]}.{tld}", "Replacement"))

    # Addition (prefix/suffix)
    additions = ["login", "secure", "app", "store", "web", "site", "my", "online", "home", "cloud",
             "account", "dashboard", "portal", "checkout", "signin", "verify", "access", "system",
             "manage", "control", "update", "confirm", "security", "auth", "connect", "client"]
    for add in additions:
        # Prefix
        variations.add((f"{add}{base_name}.{tld}", "Addition"))
        # Suffix
        variations.add((f"{base_name}{add}.{tld}", "Addition"))

    # Insertion (expanded set)
    insertion_chars = "abcdefghijklmnopqrstuvwxyz0123456789"
    for i in range(len(base_name) + 1):
        for char in insertion_chars:
            variations.add((f"{base_name[:i] + char + base_name[i:]}.{tld}", "Insertion"))

    # Repetition
    for i in range(len(base_name)):
        variations.add((f"{base_name[:i+1] + base_name[i] + base_name[i+1:]}.{tld}", "Repetition"))

    # Transposition
    for i in range(len(base_name) - 1):
        swapped = list(base_name)
        swapped[i], swapped[i+1] = swapped[i+1], swapped[i]
        variations.add((f"{''.join(swapped)}.{tld}", "Transposition"))

        # Plural
    if not base_name.endswith("s"):
        variations.add((f"{base_name}s.{tld}", "Plural"))
        if base_name.endswith(("sh", "ch", "x", "z", "s")):
            variations.add((f"{base_name}es.{tld}", "Plural"))


    # Homoglyphs (expanded)
    homoglyph_map = {
    "o": "0ø", "l": "1|", "e": "3€", "a": "4@", "s": "5$", "t": "7+", 
    "b": "8ß", "g": "9", "i": "!|", "z": "2"
    }
    for i in range(len(base_name)):
        if base_name[i] in homoglyph_map:
            homoglyphed = base_name[:i] + homoglyph_map[base_name[i]] + base_name[i+1:]
            variations.add((f"{homoglyphed}.{tld}", "Homoglyph"))

    # Double repetition
    for i in range(len(base_name)):
        variations.add((f"{base_name[:i+1] + base_name[i]*2 + base_name[i+1:]}.{tld}", "Double-Repetition"))


    # Bitsquatting
    def flip_bit(c, bit):
        return chr(ord(c) ^ (1 << bit))

    for i in range(len(base_name)):
        for bit in range(8):
            flipped_char = flip_bit(base_name[i], bit)
            if flipped_char.isalnum():
                squatted = base_name[:i] + flipped_char + base_name[i+1:]
                variations.add((f"{squatted}.{tld}", "Bitsquatting"))

    # Hyphenation
    for i in range(1, len(base_name)):
        variations.add((f"{base_name[:i]}-{base_name[i:]}.{tld}", "Hyphenation"))

    # Vowel Swap
    vowels = "aeiou"
    for i in range(len(base_name)):
        if base_name[i] in vowels:
            for v in vowels:
                if v != base_name[i]:
                    variations.add((f"{base_name[:i] + v + base_name[i+1:]}.{tld}", "Vowel-Swap"))

    # Keyboard Proximity (expanded)
    keyboard_adj = {
        "a": "qwsz", "b": "vghn", "c": "xdfv", "d": "erfcxs", "e": "rdsw", "f": "rtgvcd", "g": "tyhbvf",
        "h": "yujnbg", "i": "uojk", "j": "uiklhn", "k": "ijolm", "l": "kop", "m": "njk", "n": "bhjm",
        "o": "ipkl", "p": "ol", "q": "wa", "r": "tfd", "s": "wedxz", "t": "ygfr", "u": "yihj",
        "v": "cfgb", "w": "qase", "x": "zsdc", "y": "tuhg", "z": "asx"
    }
    for i in range(len(base_name)):
        if base_name[i] in keyboard_adj:
            for adj in keyboard_adj[base_name[i]]:
                proximity = base_name[:i] + adj + base_name[i+1:]
                variations.add((f"{proximity}.{tld}", "Keyboard-Proximity"))

    # TLD Swap (more variants)
    tld_variations = ["com", "net", "org", "info", "biz", "co", "io", "ai", "app", "in", "xyz", "site", "tech", "dev", "me", "us", "store", "online"]
    for new_tld in tld_variations:
        if new_tld != tld:
            variations.add((f"{base_name}.{new_tld}", "TLD-Swap"))

    # Subdomains (expanded)
    subdomains = ["www", "mail", "secure", "admin", "cpanel", "ftp"]
    for sub in subdomains:
        variations.add((f"{sub}.{base_name}.{tld}", "Subdomain"))

    # Dictionary typo
    common_typos = {
        "google": ["goggle", "goolge", "gooogle"],
        "amazon": ["amason", "amazn", "amzon"],
        "facebook": ["facebok", "facbook", "faecbook"],
        "youtube": ["youtub", "yutube", "yooutube"]
    }
    if base_name in common_typos:
        for typo in common_typos[base_name]:
            variations.add((f"{typo}.{tld}", "Dictionary"))

    # Shuffle (more)
    for _ in range(120):
        shuffled = list(base_name)
        random.shuffle(shuffled)
        variations.add((f"{''.join(shuffled)}.{tld}", "Shuffle"))


    if max_variations and len(variations) > max_variations:
        return random.sample(list(variations), max_variations)

    # Deduplicate variations by domain only
    seen = set()
    unique_variations = []
    for domain, var_type in variations:
        if domain not in seen:
            seen.add(domain)
            unique_variations.append((domain, var_type))

    variations = unique_variations
    return list(variations)

# Async lookup
async def lookup_single_domain(session, domain, perm_type):
    # Directly try DNS queries (skip WHOIS for performance)
    ip_task = query_dns(session, domain, "A")
    ipv6_task = query_dns(session, domain, "AAAA")
    ns_task = query_dns(session, domain, "NS")
    mx_task = query_dns(session, domain, "MX")

    ip, ipv6, ns, mx = await asyncio.gather(ip_task, ipv6_task, ns_task, mx_task)

    # If no DNS records at all, consider it inactive/unregistered
    if not any([ip, ipv6, ns, mx]):
        return {
            "permutation": domain,
            "permutationType": perm_type,
            "error": "No DNS records"
        }

    country = await get_ip_country(ip[0], session) if ip else "Unknown"

    return {
        "permutation": domain,
        "permutationType": perm_type,
        "ip": ip[0] if ip else "-",
        "ipv6": ipv6[0] if ipv6 else "-",
        "country": country,
        "nameServer": ns[0] if ns else "-",
        "mailServer": mx[0] if mx else "-",
    }

# Streaming logic
def stream_dns_lookup(domain):
    seen_domains.clear()
    variations = generate_variations(domain)
    original = (domain, "Original")
    variations.append(original)

    non_original_variations = [v for v in variations if v != original]
    non_original_variations.sort(key=lambda x: (x[1], x[0]))
    variations = [original] + non_original_variations

    async def run_queries():
        total = len(variations)
        scanned = 0
        registered = 0
        registered_domains = set()

        yield f"meta: {json.dumps({'total': total})}\n\n"

        async with aiohttp.ClientSession() as session:
            batch_size = 30
            timeout_seconds = 3  # timeout per domain
            for i in range(0, total, batch_size):
                batch = variations[i:i + batch_size]
                batch_domains = [domain for domain, _ in batch]

                async def safe_lookup(domain, perm_type):
                    try:
                        return await asyncio.wait_for(lookup_single_domain(session, domain, perm_type), timeout=timeout_seconds)
                    except asyncio.TimeoutError:
                        return {"permutation": domain, "permutationType": perm_type, "error": "Timeout"}
                    except Exception as e:
                        return {"permutation": domain, "permutationType": perm_type, "error": str(e)}

                tasks = [safe_lookup(domain, perm_type) for domain, perm_type in batch]

                try:
                    results = await asyncio.gather(*tasks, return_exceptions=True)
                    for result in results:
                        if isinstance(result, Exception):
                            continue

                        domain_key = result["permutation"]

                        # Skip if domain is unregistered
                        if "error" in result and result["error"] in ["Not registered", "No DNS records"]:
                            scanned += 1
                            yield f"meta: {json.dumps({'attempted': scanned})}\n\n"
                            continue

                        if domain_key not in seen_domains:
                            seen_domains.add(domain_key)
                            scanned += 1

                            yield f"meta: {json.dumps({'attempted': scanned})}\n\n"

                            def is_valid_nameserver(ns):
                                if not ns or ns == "-":
                                    return False
                                ns_lower = ns.lower()
                                placeholder_ns_keywords = ["suspended", "parked", "default", "placeholder", "example"]
                                return not any(keyword in ns_lower for keyword in placeholder_ns_keywords)

                            is_registered = is_valid_nameserver(result.get("nameServer", ""))

                            if is_registered and domain_key not in registered_domains:
                                registered += 1
                                registered_domains.add(domain_key)

                            result["progress"] = f"Processed {scanned} of {total}"
                            yield f"data: {json.dumps(result)}\n\n"

                except Exception as e:
                    print(f"Error in batch {i//batch_size + 1}: {e}")
                    continue

        summary = {
            "done": True,
            "summary": f"Scanned {total} permutations. Found {registered} registered.",
            "registeredCount": registered,
            "totalCount": total
        }
        yield f"data: {json.dumps(summary)}\n\n"

    def sync_stream():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        async_gen = run_queries()
        try:
            while True:
                yield loop.run_until_complete(async_gen.__anext__())
        except StopAsyncIteration:
            pass
        finally:
            loop.close()

    return sync_stream()

# SSE endpoint
@app.route("/stream_dns_lookup")
def stream_dns():
    domain = request.args.get("domain")
    if not domain:
        return jsonify({"error": "Missing domain parameter"}), 400
    return Response(stream_with_context(stream_dns_lookup(domain)), mimetype="text/event-stream")

# REST fallback endpoint
@app.route("/dns_lookup", methods=["GET"])
async def dns_lookup():
    domain = request.args.get("domain")
    if not domain:
        return jsonify({"error": "Missing domain parameter"}), 400

    variations = generate_variations(domain)
    variations.insert(0, (domain, "Original"))

    results = []
    async with aiohttp.ClientSession() as session:
        for permuted_domain, perm_type in variations:
            ip_task = query_dns(session, permuted_domain, "A")
            ipv6_task = query_dns(session, permuted_domain, "AAAA")
            ns_task = query_dns(session, permuted_domain, "NS")
            mx_task = query_dns(session, permuted_domain, "MX")

            ip, ipv6, ns, mx = await asyncio.gather(ip_task, ipv6_task, ns_task, mx_task)
            country = await get_ip_country(ip[0], session) if ip else "Unknown"

            results.append({
                "permutation": permuted_domain,
                "permutationType": perm_type,
                "ip": ip[0] if ip else "-",
                "ipv6": ipv6[0] if ipv6 else "-",
                "country": country,
                "nameServer": ns[0] if ns else "-",
                "mailServer": mx[0] if mx else "-",
            })

    return jsonify(results)

if __name__ == "__main__":
    app.run(debug=True, port=5001)