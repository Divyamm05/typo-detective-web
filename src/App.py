from flask import Flask, request, jsonify
from flask_cors import CORS  
import requests
import tldextract
import asyncio
import aiohttp
import random

app = Flask(__name__)
CORS(app)

CLOUDFLARE_DOH_URL = "https://cloudflare-dns.com/dns-query"
IP_API_URL = "http://ip-api.com/json/"

async def query_dns(session, domain, record_type):
    """Asynchronous DNS lookup using Cloudflare DoH."""
    headers = {"accept": "application/dns-json"}
    params = {"name": domain, "type": record_type}

    try:
        async with session.get(CLOUDFLARE_DOH_URL, headers=headers, params=params) as response:
            if response.status != 200:
                return None  # Handle error responses

            data = await response.json(content_type=None)
            if "Answer" in data:
                records = [entry["data"] for entry in data["Answer"]]

                # ✅ If MX record, remove priority number (e.g., "10 smtp.google.com." → "smtp.google.com.")
                if record_type == "MX":
                    records = [mx.split(" ", 1)[1] if " " in mx else mx for mx in records]

                return records  # ✅ Return cleaned records
    except Exception as e:
        return None  # Return None if any exception occurs

    return None  # Return None if no records found


async def get_ip_country(ip):
    """Fetch country information for an IP address."""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(IP_API_URL + ip) as response:
                data = await response.json()
                return data.get("country", "Unknown")
    except Exception:
        return "Unknown"

def generate_variations(domain, limit=20):
    """Generate typo variations with multiple techniques."""
    extracted = tldextract.extract(domain)
    base_name = extracted.domain
    tld = extracted.suffix

    variations = set()

    # ✅ Omission (Remove one character)
    for i in range(len(base_name)):
        variations.add((f"{base_name[:i] + base_name[i+1:]}.{tld}", "Omission"))

    # ✅ Replacement (Replace with vowels)
    for i in range(len(base_name)):
        for char in "aeiou":
            if base_name[i] != char:
                variations.add((f"{base_name[:i] + char + base_name[i+1:]}.{tld}", "Replacement"))

    # ✅ Addition (Add 'x', 'y', 'z' in random positions)
    for i in range(len(base_name) + 1):
        for char in "xyz":
            variations.add((f"{base_name[:i] + char + base_name[i:]}.{tld}", "Addition"))

    # ✅ Bitsquatting (Flip a bit in ASCII representation)
    for i in range(len(base_name)):
        flipped_char = chr(ord(base_name[i]) ^ 1)  # Flip the least significant bit
        if flipped_char.isalnum():
            variations.add((f"{base_name[:i] + flipped_char + base_name[i+1:]}.{tld}", "Bitsquatting"))

    # ✅ Dictionary (Common misspellings)
    common_typos = {"google": "goggle", "amazon": "amason", "facebook": "facebok"}
    if base_name in common_typos:
        variations.add((f"{common_typos[base_name]}.{tld}", "Dictionary"))

    # ✅ Homoglyphs (Replace letters with similar-looking characters)
    homoglyphs = {"o": "0", "l": "1", "i": "!", "s": "$", "a": "@", "e": "3"}
    for i in range(len(base_name)):
        if base_name[i] in homoglyphs:
            variations.add((f"{base_name[:i] + homoglyphs[base_name[i]] + base_name[i+1:]}.{tld}", "Homoglyphs"))

    # ✅ Insertion (Insert random characters)
    for i in range(len(base_name) + 1):
        for char in "aeiou":
            variations.add((f"{base_name[:i] + char + base_name[i:]}.{tld}", "Insertion"))

    # ✅ Repetitions (Repeat a character)
    for i in range(len(base_name)):
        variations.add((f"{base_name[:i] + base_name[i] * 2 + base_name[i+1:]}.{tld}", "Repetitions"))

    # ✅ TLD Swap (Change .com to .net, .org, etc.)
    tld_variations = ["net", "org", "info", "co"]
    for new_tld in tld_variations:
        if new_tld != tld:
            variations.add((f"{base_name}.{new_tld}", "TLD-Swap"))

    # ✅ Transposition (Swap two adjacent characters)
    for i in range(len(base_name) - 1):
        swapped = list(base_name)
        swapped[i], swapped[i+1] = swapped[i+1], swapped[i]
        variations.add((f"{''.join(swapped)}.{tld}", "Transposition"))

    # ✅ Various (Random minor variations)
    if len(base_name) > 3:
        shuffled = list(base_name)
        random.shuffle(shuffled)
        variations.add((f"{''.join(shuffled)}.{tld}", "Various"))

    # ✅ Vowel Swap (Swap vowels)
    vowels = "aeiou"
    for i in range(len(base_name)):
        if base_name[i] in vowels:
            swap_vowel = random.choice([v for v in vowels if v != base_name[i]])
            variations.add((f"{base_name[:i] + swap_vowel + base_name[i+1:]}.{tld}", "Vowel Swap"))

    # ✅ Subdomain (Prepend common subdomains)
    subdomains = ["www", "mail", "shop", "secure"]
    for sub in subdomains:
        variations.add((f"{sub}.{base_name}.{tld}", "Subdomain"))

    return list(variations)[:limit]  # ✅ Limit the number of variations

async def stream_dns_lookup(domain):
    """Asynchronously fetch DNS records and stream results."""
    variations = generate_variations(domain, limit=20)

    async with aiohttp.ClientSession() as session:
        for permuted_domain, perm_type in variations:
            try:
                ip_task = query_dns(session, permuted_domain, "A")
                ipv6_task = query_dns(session, permuted_domain, "AAAA")
                ns_task = query_dns(session, permuted_domain, "NS")
                mx_task = query_dns(session, permuted_domain, "MX")

                ip, ipv6, ns, mx = await asyncio.gather(ip_task, ipv6_task, ns_task, mx_task)

                country = await get_ip_country(ip[0]) if ip else "Unknown"

                result = {
                    "permutation": permuted_domain,
                    "permutationType": perm_type,
                    "ip": ip[0] if ip else "-",  
                    "ipv6": ipv6[0] if ipv6 else "-",  
                    "country": country,  
                    "nameServer": ns[0] if ns else "-",  
                    "mailServer": mx[0] if mx else "-",  
                }

                yield f"data: {jsonify(result).get_data(as_text=True)}\n\n"  # ✅ Stream JSON result

            except Exception:
                continue  # Skip any failing queries

@app.route("/dns_lookup", methods=["GET"])
async def dns_lookup():
    domain = request.args.get("domain")
    if not domain:
        return jsonify({"error": "Missing domain parameter"}), 400

    variations = generate_variations(domain, limit=20)
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
                "ip": ip[0] if ip else "-",  # ✅ Only show the first IP
                "ipv6": ipv6[0] if ipv6 else "-",  # ✅ Only show the first IPv6
                "country": country,  # ✅ Add country lookup
                "nameServer": ns[0] if ns else "-",  # ✅ Only show the first NS
                "mailServer": mx[0] if mx else "-",  # ✅ Only show the first MX
            })

    return jsonify(results)

if __name__ == "__main__":
    app.run(debug=True, port=5001)