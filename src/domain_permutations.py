import itertools
import random

HOMOGLYPHS = {
    "a": ["@", "4"],
    "b": ["8"],
    "e": ["3"],
    "i": ["1", "l", "!"],
    "l": ["1", "i"],
    "o": ["0"],
    "s": ["5", "$"],
    "g": ["9", "q"],
    "t": ["+", "7"],
    "z": ["2"],
    "c": ["("]
}

KEYBOARD_ADJACENT = {
    "a": ["s", "q", "z"],
    "b": ["v", "g", "h", "n"],
    "c": ["x", "d", "f", "v"],
    "d": ["s", "e", "r", "f", "c", "x"],
    "e": ["w", "s", "d", "r"],
    "f": ["d", "r", "t", "g", "v", "c"],
    "g": ["f", "t", "y", "h", "b", "v"],
    "h": ["g", "y", "u", "j", "n", "b"],
    "i": ["u", "j", "k", "o"],
    "j": ["h", "u", "i", "k", "m", "n"],
    "k": ["j", "i", "o", "l", "m"],
    "l": ["k", "o", "p"],
    "m": ["n", "j", "k"],
    "n": ["b", "h", "j", "m"],
    "o": ["i", "k", "l", "p"],
    "p": ["o", "l"],
    "q": ["w", "a"],
    "r": ["e", "d", "f", "t"],
    "s": ["a", "w", "e", "d", "x", "z"],
    "t": ["r", "f", "g", "y"],
    "u": ["y", "h", "j", "i"],
    "v": ["c", "f", "g", "b"],
    "w": ["q", "a", "s", "e"],
    "x": ["z", "s", "d", "c"],
    "y": ["t", "g", "h", "u"],
    "z": ["a", "s", "x"],
}

COMMON_TLDS = ["com", "net", "org", "io", "co", "xyz", "info"]

def omit_chars(domain):
    return [{"domain-name": domain[:i] + domain[i+1:], "fuzzer": "omission"} 
            for i in range(len(domain))]

def replace_chars(domain):
    results = []
    for i, char in enumerate(domain):
        if char in KEYBOARD_ADJACENT:
            for replacement in KEYBOARD_ADJACENT[char]:
                results.append({
                    "domain-name": domain[:i] + replacement + domain[i+1:], 
                    "fuzzer": "replacement"
                })
    return results

def insert_chars(domain):
    results = []
    for i in range(len(domain)):
        for c in "abcdefghijklmnopqrstuvwxyz":
            results.append({
                "domain-name": domain[:i] + c + domain[i:], 
                "fuzzer": "insertion"
            })
    return results

def repeat_chars(domain):
    return [{"domain-name": domain[:i] + domain[i] + domain[i:] , "fuzzer": "repetition"} 
            for i in range(len(domain))]

def transpose_chars(domain):
    results = []
    for i in range(len(domain)-1):
        if domain[i] != domain[i+1]:
            swapped = list(domain)
            swapped[i], swapped[i+1] = swapped[i+1], swapped[i]
            results.append({
                "domain-name": ''.join(swapped),
                "fuzzer": "transposition"
            })
    return results

def homoglyphs(domain):
    results = []
    for i, c in enumerate(domain):
        if c in HOMOGLYPHS:
            for g in HOMOGLYPHS[c]:
                results.append({
                    "domain-name": domain[:i] + g + domain[i+1:], 
                    "fuzzer": "homoglyph"
                })
    return results

def double_swap(domain):
    results = []
    for i in range(len(domain)-2):
        swapped = list(domain)
        swapped[i], swapped[i+2] = swapped[i+2], swapped[i]
        results.append({
            "domain-name": ''.join(swapped),
            "fuzzer": "double-swap"
        })
    return results

def shuffle(domain):
    shuffled = list(domain)
    random.shuffle(shuffled)
    return [{"domain-name": ''.join(shuffled), "fuzzer": "shuffle"}]

def tld_swap(domain):
    if '.' not in domain:
        return []
    name, tld = domain.rsplit(".", 1)
    return [{"domain-name": f"{name}.{new_tld}", "fuzzer": "tld-swap"} 
            for new_tld in COMMON_TLDS if new_tld != tld]

def subdomain(domain):
    return [{"domain-name": f"mail.{domain}", "fuzzer": "subdomain"},
            {"domain-name": f"login.{domain}", "fuzzer": "subdomain"},
            {"domain-name": f"admin.{domain}", "fuzzer": "subdomain"}]

def get_permutations(domain, fuzzers=None):
    fuzzers = fuzzers or [
        omit_chars,
        replace_chars,
        insert_chars,
        repeat_chars,
        transpose_chars,
        homoglyphs,
        double_swap,
        shuffle,
        tld_swap,
        subdomain
    ]

    seen = set()
    permutations = []
    
    for fuzzer in fuzzers:
        try:
            for item in fuzzer(domain):
                perm = item["domain-name"]
                if perm not in seen and perm != domain:
                    permutations.append(item)
                    seen.add(perm)
        except Exception as e:
            print(f"Error in fuzzer {fuzzer.__name__}: {e}")

    return permutations
