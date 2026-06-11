"""Standardize Flow's Table guest name capitalization: P'Nickname Firstname Lastname."""
import os
import re

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# Order matters: longer / more specific patterns first.
REPLACEMENTS = [
    ("p' mi tiwa shintadapong", "P'Mi Tiwa Shintadapong"),
    ("p'mi tiwa shintadapong", "P'Mi Tiwa Shintadapong"),
    ("p' mi tiwa", "P'Mi Tiwa Shintadapong"),
    ("P' Mi Tiwa Shintadapong", "P'Mi Tiwa Shintadapong"),
    ("P' Mi Tiwa", "P'Mi Tiwa Shintadapong"),
    ("P’ Mi Tiwa Shintadapong", "P'Mi Tiwa Shintadapong"),
    ("P’ Mi Tiwa", "P'Mi Tiwa Shintadapong"),
    ("p'jekky suthon singhasitthangkul", "P'Jekky Suthon Singhasitthangkul"),
    ("p'jekky suthon", "P'Jekky Suthon Singhasitthangkul"),
    ("p'jacky suthon singhasitthangkul", "P'Jekky Suthon Singhasitthangkul"),
    ("p'jacky suthon", "P'Jekky Suthon Singhasitthangkul"),
    ("p'jacky", "P'Jekky"),
    ("p'jom pawin", "P'Jom Pawin"),
    ("p'mari", "P'Mari"),
    ("p'meth", "P'Meth"),
    ("p'boy", "P'Boy"),
    ("p'golf", "P'Golf"),
    ("p'mac", "P'Mac"),
    ("p'un,", "P'Un,"),
    ("p'un ", "P'Un "),
    ("p'ball", "P'Ball"),
    ("p'em ", "P'Em "),
    ("p'pat", "P'Pat"),
    ("Jacky Suthon Singhasitthangkul", "P'Jekky Suthon Singhasitthangkul"),
    ("Tiwa Shintadapong (P'Mi)", "P'Mi Tiwa Shintadapong"),
    ("Suthon Singhasitthangkul (P'Jacky)", "P'Jekky Suthon Singhasitthangkul"),
    ("Pawoot Pom Ponpipat (P'Pom)", "P'Pom Pawoot Pom Ponpipat"),
    ("Jing Chanapan (Shark Jing)", "Shark Jing Jing Chanapan"),
    ("Supachai Parchariyanon (Kid)", "Kid Supachai Parchariyanon"),
    ("Toy Kasidit (P'Toy)", "P'Toy Toy Kasidit"),
    ("Tre Pramoj (P'Tre)", "P'Tre Tre Pramoj"),
    ("Nithi Satchatippavarn (P'Mek)", "P'Mek Nithi Satchatippavarn"),
    ("Punyawe Chantarakajorn (P'Pek)", "P'Pek Punyawe Chantarakajorn"),
    ("Benz Vorapat (Shark Benz)", "Shark Benz Benz Vorapat"),
    ('alternateName": "P\'Jacky"', 'alternateName": "P\'Jekky"'),
    ("P'Jacky", "P'Jekky"),
    ("P'Jekky Suthon,", "P'Jekky Suthon Singhasitthangkul,"),
    ("P'Jekky Suthon.", "P'Jekky Suthon Singhasitthangkul."),
    ("P'Jekky Suthon and", "P'Jekky Suthon Singhasitthangkul and"),
    ("P'Jekky Suthon Singhasitthangkul Singhasitthangkul", "P'Jekky Suthon Singhasitthangkul"),
]

HTML_FILES = [
    "index.html",
    "about.html",
    "guests.html",
    "archive.html",
    "reels.html",
    "home.html",
]


def fix_text(text):
    for old, new in REPLACEMENTS:
        text = re.sub(re.escape(old), new, text, flags=re.IGNORECASE)
    return text


def main():
    for name in HTML_FILES:
        path = os.path.join(BASE, name)
        if not os.path.exists(path):
            continue
        with open(path, "r", encoding="utf-8") as f:
            original = f.read()
        updated = fix_text(original)
        if updated != original:
            with open(path, "w", encoding="utf-8") as f:
                f.write(updated)
            print(f"Updated {name}")
        else:
            print(f"No changes {name}")


if __name__ == "__main__":
    main()
