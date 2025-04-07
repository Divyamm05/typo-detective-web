from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS  
import json
import tldextract
import asyncio
import aiohttp
import random

app = Flask(__name__)
CORS(app)
seen_domains = set()


CLOUDFLARE_DOH_URL = "https://cloudflare-dns.com/dns-query"
IP_API_URL = "http://ip-api.com/json/"

async def query_dns(session, domain, record_type):
    """Asynchronous DNS lookup using Cloudflare DoH."""
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
    except Exception as e:
        return None  

    return None  


async def get_ip_country(ip):
    """Fetch country information for an IP address."""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(IP_API_URL + ip) as response:
                data = await response.json()
                return data.get("country", "Unknown")
    except Exception:
        return "Unknown"

def generate_variations(domain, max_variations=2000):
    extracted = tldextract.extract(domain)
    base_name = extracted.domain
    tld = extracted.suffix

    variations = set()

    # Omission (missing a character)
    for i in range(len(base_name)):
        variations.add((f"{base_name[:i] + base_name[i+1:]}.{tld}", "Omission"))

    # Replacement (vowel + common replacements)
    replacement_chars = "aeioubcdghmnrt"
    for i in range(len(base_name)):
        for char in replacement_chars:
            if base_name[i] != char:
                variations.add((f"{base_name[:i] + char + base_name[i+1:]}.{tld}", "Replacement"))

    # Insertion (common typos)
    insertion_chars = "aeiouxyz"
    for i in range(len(base_name) + 1):
        for char in insertion_chars:
            variations.add((f"{base_name[:i] + char + base_name[i:]}.{tld}", "Insertion"))

    # Repetition
    for i in range(len(base_name)):
        variations.add((f"{base_name[:i] + base_name[i]*2 + base_name[i+1:]}.{tld}", "Repetition"))

    # Transposition
    for i in range(len(base_name) - 1):
        swapped = list(base_name)
        swapped[i], swapped[i+1] = swapped[i+1], swapped[i]
        variations.add((f"{''.join(swapped)}.{tld}", "Transposition"))

    # Homoglyphs
    homoglyphs = {"o": "0ø", "l": "1|", "i": "1!|", "s": "$5", "a": "@4", "e": "3€", "c": "(", "b": "8"}
    for i in range(len(base_name)):
        if base_name[i] in homoglyphs:
            variations.add((f"{base_name[:i] + homoglyphs[base_name[i]] + base_name[i+1:]}.{tld}", "Homoglyphs"))

    # Bitsquatting (simple xor)
    for i in range(len(base_name)):
        flipped_char = chr(ord(base_name[i]) ^ 1)
        if flipped_char.isalnum():
            variations.add((f"{base_name[:i] + flipped_char + base_name[i+1:]}.{tld}", "Bitsquatting"))

    # TLD Swap
    tld_variations = ["net", "org", "info", "co", "com", "biz", "xyz"]
    for new_tld in tld_variations:
        if new_tld != tld:
            variations.add((f"{base_name}.{new_tld}", "TLD-Swap"))

    # Subdomains
    subdomains = ["www", "mail", "secure", "dev", "app"]
    for sub in subdomains:
        variations.add((f"{sub}.{base_name}.{tld}", "Subdomain"))

    # Keyboard Proximity Swap
    proximity = {
        "a": "qwsz", "s": "awedxz", "d": "serfcx", "f": "drtgcv", "g": "ftyhbv", "h": "gyujnb",
        "j": "huiknm", "k": "jiolm", "l": "kop", "q": "was", "w": "qase", "e": "wsdr", "r": "edft",
        "t": "rfgy", "y": "tghu", "u": "yhj", "i": "ujko", "o": "iklp", "z": "asx", "x": "zsdc",
        "c": "xdfv", "v": "cfgb", "b": "vghn", "n": "bhjm", "m": "njk"
    }

    for i in range(len(base_name)):
        if base_name[i] in proximity:
            for alt in proximity[base_name[i]]:
                variations.add((f"{base_name[:i] + alt + base_name[i+1:]}.{tld}", "Proximity"))

    # Double Character Swap
    for i in range(len(base_name)-2):
        double_swap = list(base_name)
        double_swap[i], double_swap[i+2] = double_swap[i+2], double_swap[i]
        variations.add((f"{''.join(double_swap)}.{tld}", "Double Swap"))

    # Shuffle (randomized, limited for performance)
    if len(base_name) > 3:
        for _ in range(30):
            shuffled = list(base_name)
            random.shuffle(shuffled)
            variations.add((f"{''.join(shuffled)}.{tld}", "Shuffle"))

    # Dictionary typo
    common_typos = {"google": "goggle", "amazon": "amason", "facebook": "facebok", "youtube": "youtub"}
    if base_name in common_typos:
        variations.add((f"{common_typos[base_name]}.{tld}", "Dictionary"))

    # Truncate to max if needed
    if max_variations and len(variations) > max_variations:
        return random.sample(list(variations), max_variations)

    return list(variations)

def stream_dns_lookup(domain):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)

    variations = generate_variations(domain)
    original = (domain, "Original")
    variations.append(original)

    # Sort
    non_original_variations = [v for v in variations if v != original]
    non_original_variations.sort(key=lambda x: (x[1], x[0]))
    variations = [original] + non_original_variations

    async def run_queries():
        total = len(variations)
        scanned = 0
        registered = 0

        yield f"meta: {json.dumps({'total': total})}\n\n"

        async with aiohttp.ClientSession() as session:
            batch_size = 50
            for i in range(0, total, batch_size):
                batch = variations[i:i + batch_size]
                tasks = [
                    lookup_single_domain(session, domain, perm_type)
                    for domain, perm_type in batch
                ]

                try:
                    results = await asyncio.gather(*tasks, return_exceptions=True)
                    for result in results:
                        if isinstance(result, Exception):
                            continue

                        domain_key = result["permutation"]
                        if domain_key not in seen_domains:
                            scanned += 1
                            seen_domains.add(domain_key)

                            if (
                                result["ip"] != "-" or
                                result["ipv6"] != "-" or
                                result["nameServer"] != "-" or
                                result["mailServer"] != "-"
                            ):
                                registered += 1

                            result["progress"] = f"Processed {scanned} of {total}"
                            yield f"data: {json.dumps(result)}\n\n"
                except Exception as e:
                    continue

        summary = {
            "done": True,
            "summary": f"Scanned {total} permutations. Found {registered} registered.",
            "registeredCount": registered,
            "totalCount": total
        }
        yield f"data: {json.dumps(summary)}\n\n"

    # Moved outside the generator for reuse
    async def lookup_single_domain(session, domain, perm_type):
        ip, ipv6, ns, mx = await asyncio.gather(
            query_dns(session, domain, "A"),
            query_dns(session, domain, "AAAA"),
            query_dns(session, domain, "NS"),
            query_dns(session, domain, "MX")
        )
        country = await get_ip_country(ip[0]) if ip else "Unknown"
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
    async_gen = run_queries()
    while True:
        try:
            event = loop.run_until_complete(async_gen.__anext__())
            yield event
        except StopAsyncIteration:
            break


@app.route("/stream_dns_lookup")
def stream_dns():
    domain = request.args.get("domain")
    if not domain:
        return jsonify({"error": "Missing domain parameter"}), 400

    return Response(stream_with_context(stream_dns_lookup(domain)), mimetype="text/event-stream")


@app.route("/dns_lookup", methods=["GET"])
async def dns_lookup():
    domain = request.args.get("domain")
    if not domain:
        return jsonify({"error": "Missing domain parameter"}), 400

    variations = generate_variations(domain)
    variations.insert(0, (domain, "Original"))

    async with aiohttp.ClientSession() as session:
        tasks = []
        for permuted_domain, perm_type in variations:
            tasks.append((
                permuted_domain,
                perm_type,
                query_dns(session, permuted_domain, "A"),
                query_dns(session, permuted_domain, "AAAA"),
                query_dns(session, permuted_domain, "NS"),
                query_dns(session, permuted_domain, "MX"),
            ))

        results = []
        for permuted_domain, perm_type, *queries in tasks:
            ip, ipv6, ns, mx = await asyncio.gather(*queries)
            country = await get_ip_country(ip[0]) if ip else "Unknown"

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